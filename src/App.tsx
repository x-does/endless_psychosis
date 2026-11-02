import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CHAPTERS,
  CONTENT_NOTE,
  KIND_ICON,
  KIND_LABEL,
  SUPPORT_RESOURCES,
  TECHNIQUES,
  TECHNIQUE_BY_ID,
  type Chapter,
  type Technique,
} from "./game/content";
import {
  GameEngine,
  type RunResult,
  type RunSnapshot,
} from "./game/engine";
import {
  activeTechnique,
  deriveStats,
  isChapterUnlocked,
  loadSave,
  newSave,
  persist,
  type SaveData,
} from "./game/save";
import {
  cloudFetch,
  cloudPush,
  getSyncCode,
  setSyncCode,
  type CloudState,
} from "./game/cloud";

type Screen = "title" | "map" | "game" | "journal" | "support" | "settings";
type RunConfig = { chapterIndex: number; mode: "chapter" | "endless" };
type Toast = { id: number; text: string; tone: "good" | "bad" | "info" };
type LevelUpState = { choices: Technique[]; level: number };
type CompleteState = { result: RunResult; keystone: Technique; chapter: Chapter };

const SAVE_KEY = "endless.save.v1";

function applyRunToSave(
  prev: SaveData,
  result: RunResult,
  opts?: {
    won?: boolean;
    chapterIndex?: number;
    keystoneId?: string;
    chapterNumber?: number;
  },
): SaveData {
  const next: SaveData = {
    ...prev,
    learned: [...prev.learned],
    completedChapters: [...prev.completedChapters],
    journal: [...prev.journal],
  };
  next.runs += 1;
  next.totalXp += result.xpEarned;
  next.level = result.level;
  next.xp = result.xp;
  next.bestDistance = Math.max(next.bestDistance, result.distance);
  if (result.mode === "endless") {
    next.bestEndless = Math.max(next.bestEndless, result.distance);
  }
  for (const id of result.learned) {
    if (!next.learned.includes(id)) next.learned.push(id);
  }
  if (opts?.won && opts.chapterIndex != null) {
    if (!next.completedChapters.includes(opts.chapterIndex)) {
      next.completedChapters.push(opts.chapterIndex);
    }
    next.chapterIndex = Math.max(next.chapterIndex, opts.chapterIndex + 1);
    next.wins += 1;
    if (opts.keystoneId && !next.learned.includes(opts.keystoneId)) {
      next.learned.push(opts.keystoneId);
    }
    if (
      opts.chapterNumber &&
      !next.journal.includes(opts.chapterNumber)
    ) {
      next.journal.push(opts.chapterNumber);
    }
  }
  if (!next.equippedActive) {
    const first = next.learned.find(
      (id) => TECHNIQUE_BY_ID[id]?.type === "active",
    );
    next.equippedActive = first ?? null;
  }
  next.lastPlayed = new Date().toISOString();
  return next;
}

function maskCode(code: string): string {
  if (code.length <= 4) return code;
  const visible = code.slice(-4);
  const mask = "*".repeat(code.length - 4);
  return mask + visible;
}

function effectText(t: Technique): string {
  const e = t.effect;
  if (e.mode === "active") {
    switch (e.action) {
      case "heal":
        return `Restores ${e.power} resolve and steadies your breath.`;
      case "clear":
        return "Clears nearby shadows and incoming attacks.";
      case "slow":
        return `Softens time for ${e.duration}s — everything moves slower.`;
      case "shield":
        return `A ${e.duration}s shield that absorbs damage.`;
      case "focus":
        return `Restores ${e.power} focus instantly.`;
      case "dash":
        return "A brief invincible dash that damages what it touches.";
      case "purge":
        return "Removes every incoming attack and grants a moment of shield.";
      case "rain":
        return `Rains calm on every foe and the boss.`;
    }
  }
  switch (e.stat) {
    case "maxHp":
      return `+${e.value} maximum resolve.`;
    case "focusRegen":
      return `+${e.value} focus regenerated per second.`;
    case "xpBonus":
      return `+${Math.round(e.value * 100)}% XP from every spark and foe.`;
    case "damageReduce":
      return `-${Math.round(e.value * 100)}% damage taken.`;
    case "startShield":
      return `Begin every run with a ${e.value}s shield.`;
    case "enemySlow":
      return `Shadows move ${Math.round(e.value * 100)}% slower.`;
    case "magnet":
      return "Pickups are drawn to you from further away.";
    case "pulseRadius":
      return `+${e.value} pulse radius.`;
  }
}

function isBreathing(t: Technique) {
  return t.kind === "breathing";
}

const BREATH_PATTERNS: Record<string, { steps: number[]; labels: string[] }> = {
  "box-breathing": { steps: [4, 4, 4, 4], labels: ["Inhale", "Hold", "Exhale", "Hold"] },
  "4-7-8-breath": { steps: [4, 7, 8], labels: ["Inhale", "Hold", "Exhale"] },
  "physiological-sigh": { steps: [2, 1, 6], labels: ["Inhale", "Sip", "Exhale"] },
  "three-minute-space": { steps: [4, 2, 6], labels: ["Inhale", "Hold", "Exhale"] },
};

function breathPattern(t: Technique) {
  return BREATH_PATTERNS[t.id] ?? { steps: [4, 2, 6], labels: ["Inhale", "Hold", "Exhale"] };
}

export default function App() {
  const [save, setSave] = useState<SaveData>(() => loadSave());
  const saveRef = useRef(save);
  saveRef.current = save;

  const [screen, setScreen] = useState<Screen>("title");
  const [backTo, setBackTo] = useState<Screen>("title");
  const [run, setRun] = useState<RunConfig | null>(null);
  const [gameKey, setGameKey] = useState(0);
  const [snapshot, setSnapshot] = useState<RunSnapshot | null>(null);
  const [introOpen, setIntroOpen] = useState(true);
  const [paused, setPaused] = useState(false);
  const [levelUp, setLevelUp] = useState<LevelUpState | null>(null);
  const [complete, setComplete] = useState<CompleteState | null>(null);
  const [dead, setDead] = useState<RunResult | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [bossBanner, setBossBanner] = useState<{ name: string; title: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [cloudState, setCloudState] = useState<CloudState>("idle");
  const [syncCode, setSyncCodeState] = useState(() => getSyncCode());
  const hydratedRef = useRef(false);
  const [selectedTech, setSelectedTech] = useState<Technique | null>(null);
  const [practiceTech, setPracticeTech] = useState<Technique | null>(null);
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);

  const engineRef = useRef<GameEngine | null>(null);
  const restartRef = useRef(false);

  const chapter = run ? CHAPTERS[run.chapterIndex] ?? CHAPTERS[0] : CHAPTERS[0];
  const learned = useMemo(
    () => save.learned.map((id) => TECHNIQUE_BY_ID[id]).filter(Boolean),
    [save.learned],
  );
  const equipped = save.equippedActive ? TECHNIQUE_BY_ID[save.equippedActive] : null;

  const showToast = useCallback(
    (text: string, tone: Toast["tone"] = "info") =>
      setToast({ id: Date.now(), text, tone }),
    [],
  );

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const remote = await cloudFetch();
        if (!alive) return;
        if (
          remote &&
          new Date(remote.lastPlayed).getTime() >
            new Date(saveRef.current.lastPlayed).getTime()
        ) {
          setSave(remote);
          persist(remote);
          saveRef.current = remote;
          showToast("Cloud save restored.", "good");
        }
        setCloudState("synced");
      } catch {
        if (alive) setCloudState("offline");
      } finally {
        if (alive) hydratedRef.current = true;
      }
    })();
    return () => {
      alive = false;
    };
  }, [showToast]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    const timer = window.setTimeout(async () => {
      setCloudState("syncing");
      try {
        const ok = await cloudPush(save);
        setCloudState(ok ? "synced" : "offline");
      } catch {
        setCloudState("offline");
      }
    }, 900);
    return () => window.clearTimeout(timer);
  }, [save]);

  useEffect(() => {
    engineRef.current?.setSound(save.settings.sound);
  }, [save.settings.sound]);

  useEffect(() => {
    if (screen !== "game" || !run || !canvasEl) return;
    const currentChapter = CHAPTERS[run.chapterIndex] ?? CHAPTERS[0];
    const s = saveRef.current;
    const engine = new GameEngine(
      {
        canvas: canvasEl,
        chapter: currentChapter,
        chapterIndex: run.chapterIndex,
        mode: run.mode,
        stats: deriveStats(s),
        known: s.learned,
        active: activeTechnique(s),
        level: s.level,
        xp: s.xp,
        sound: s.settings.sound,
        haptics: s.settings.haptics,
        reduceMotion: s.settings.reduceMotion,
      },
      {
        onSnapshot: (snap) => setSnapshot(snap),
        onLevelUp: (choices, level) => setLevelUp({ choices, level }),
        onComplete: (result) => {
          setSave((prev) => {
            const next = applyRunToSave(prev, result, {
              won: true,
              chapterIndex: run.chapterIndex,
              keystoneId: currentChapter.keystoneId,
              chapterNumber: currentChapter.number,
            });
            persist(next);
            saveRef.current = next;
            return next;
          });
          setComplete({
            result,
            keystone: TECHNIQUE_BY_ID[currentChapter.keystoneId],
            chapter: currentChapter,
          });
          engine.setPaused(true);
        },
        onDead: (result) => {
          setSave((prev) => {
            const next = applyRunToSave(prev, result);
            persist(next);
            saveRef.current = next;
            return next;
          });
          if (result.quit) {
            if (restartRef.current) {
              restartRef.current = false;
              setDead(null);
              setComplete(null);
              setLevelUp(null);
              setPaused(false);
              setIntroOpen(false);
              setSnapshot(null);
              setBossBanner(null);
              setGameKey((k) => k + 1);
            } else {
              setRun(null);
              setScreen("map");
              showToast("Progress saved. The road is still there.", "info");
            }
          } else {
            setDead(result);
            engine.setPaused(true);
          }
        },
        onToast: (text, tone) => showToast(text, tone ?? "info"),
        onBossStart: (boss) => {
          setBossBanner({ name: boss.name, title: boss.title });
          window.setTimeout(() => setBossBanner(null), 2800);
        },
        onPauseRequest: () => {
          setPaused(true);
          engine.setPaused(true);
        },
      },
    );
    engineRef.current = engine;
    if (import.meta.env.DEV) {
      (window as unknown as { __endless?: GameEngine }).__endless = engine;
    }
    engine.setPaused(true);
    const ro = new ResizeObserver(() => engine.resize());
    ro.observe(canvasEl);
    return () => {
      ro.disconnect();
      engine.destroy();
      if (engineRef.current === engine) engineRef.current = null;
    };
  }, [screen, run, canvasEl, gameKey, showToast]);

  const startChapter = (chapterIndex: number, mode: "chapter" | "endless" = "chapter") => {
    setRun({ chapterIndex, mode });
    setIntroOpen(true);
    setSnapshot(null);
    setLevelUp(null);
    setComplete(null);
    setDead(null);
    setPaused(false);
    setBossBanner(null);
    setGameKey((k) => k + 1);
    setScreen("game");
  };

  const openMenu = (target: Screen) => {
    setBackTo(screen);
    setScreen(target);
  };

  const beginRun = () => {
    engineRef.current?.unlockAudio();
    setIntroOpen(false);
    engineRef.current?.setPaused(false);
  };

  const openPause = () => {
    if (introOpen || levelUp || complete || dead) return;
    setPaused(true);
    engineRef.current?.setPaused(true);
  };

  const resumeRun = () => {
    setPaused(false);
    engineRef.current?.setPaused(false);
  };

  const restartRun = () => {
    restartRef.current = true;
    setPaused(false);
    engineRef.current?.finish(true);
  };

  const quitRun = () => {
    setPaused(false);
    engineRef.current?.finish(true);
  };

  const chooseLevel = (id: string) => {
    engineRef.current?.chooseLevelUp(id);
    setLevelUp(null);
  };

  const syncNow = async () => {
    setCloudState("syncing");
    try {
      const ok = await cloudPush(saveRef.current);
      setCloudState(ok ? "synced" : "offline");
      showToast(
        ok ? "Cloud save synced." : "Cloud save is unavailable right now.",
        ok ? "good" : "bad",
      );
    } catch {
      setCloudState("offline");
      showToast("Cloud save is unavailable right now.", "bad");
    }
  };

  const restoreFromCode = async () => {
    const code = window.prompt("Enter your sync code");
    if (!code) return;
    if (!setSyncCode(code)) {
      showToast("That sync code does not look right.", "bad");
      return;
    }
    setSyncCodeState(code.trim().toLowerCase());
    setCloudState("syncing");
    try {
      const remote = await cloudFetch();
      if (!remote) {
        showToast("No cloud save found for that code.", "bad");
        setCloudState("offline");
        return;
      }
      setSave(remote);
      persist(remote);
      saveRef.current = remote;
      setCloudState("synced");
      showToast("Cloud save restored.", "good");
    } catch {
      setCloudState("offline");
      showToast("Cloud save is unavailable right now.", "bad");
    }
  };

  const copySyncCode = async () => {
    try {
      await navigator.clipboard.writeText(syncCode);
      showToast("Sync code copied.", "good");
    } catch {
      showToast("Copy failed. Select the code manually.", "info");
    }
  };

  const resetProgress = () => {
    const current = saveRef.current;
    const next: SaveData = {
      ...newSave(),
      settings: current.settings,
      playerName: current.playerName,
    };
    persist(next);
    saveRef.current = next;
    setSave(next);
    setConfirmReset(false);
    setRun(null);
    setScreen("map");
    showToast("A new journey begins.", "good");
  };

  const updateSettings = (patch: Partial<SaveData["settings"]>) => {
    setSave((prev) => {
      const next = { ...prev, settings: { ...prev.settings, ...patch } };
      persist(next);
      saveRef.current = next;
      return next;
    });
  };

  const updateName = (name: string) => {
    setSave((prev) => {
      const next = { ...prev, playerName: name.slice(0, 20) };
      persist(next);
      saveRef.current = next;
      return next;
    });
  };

  const equip = (id: string) => {
    setSave((prev) => {
      const next = { ...prev, equippedActive: id };
      persist(next);
      saveRef.current = next;
      return next;
    });
    showToast("Technique equipped.", "good");
  };

  const endlessIndex = Math.max(
    0,
    Math.min(save.completedChapters.length - 1, CHAPTERS.length - 1),
  );

  if (screen === "game" && run) {
    return (
      <GameScreen
        canvasRef={setCanvasEl}
        snapshot={snapshot}
        run={run}
        chapter={chapter}
        save={save}
        introOpen={introOpen}
        paused={paused}
        levelUp={levelUp}
        complete={complete}
        dead={dead}
        bossBanner={bossBanner}
        toast={toast}
        onBegin={beginRun}
        onPause={openPause}
        onResume={resumeRun}
        onRestart={restartRun}
        onQuit={quitRun}
        onChoose={chooseLevel}
        onCompleteMap={() => {
          setComplete(null);
          setRun(null);
          setScreen("map");
        }}
        onCompleteNext={() => {
          const next = complete ? complete.chapter.number : CHAPTERS.length;
          setComplete(null);
          if (next < CHAPTERS.length) startChapter(next);
          else {
            setRun(null);
            setScreen("map");
          }
        }}
        onCompleteReplay={() => {
          const idx = complete ? complete.chapter.number - 1 : 0;
          setComplete(null);
          startChapter(idx);
        }}
        onDeadRetry={() => {
          const idx = dead?.chapterIndex ?? run.chapterIndex;
          const mode = dead?.mode ?? run.mode;
          setDead(null);
          startChapter(idx, mode);
        }}
        onDeadMap={() => {
          setDead(null);
          setRun(null);
          setScreen("map");
        }}
        onJump={() => engineRef.current?.jump()}
        onSlideStart={() => engineRef.current?.slideStart()}
        onSlideEnd={() => engineRef.current?.slideEnd()}
        onPulse={() => engineRef.current?.pulse()}
        onActive={() => engineRef.current?.useActive()}
        onOpenJournal={() => {
          setBackTo("game");
          setScreen("journal");
        }}
      />
    );
  }

  return (
    <div className="app">
      {screen === "title" && (
        <TitleScreen
          save={save}
          onContinue={() => setScreen("map")}
          onNew={() => {
            if (save.runs === 0) resetProgress();
            else setConfirmReset(true);
          }}
          onJournal={() => openMenu("journal")}
          onSupport={() => openMenu("support")}
          onSettings={() => openMenu("settings")}
        />
      )}

      {screen === "map" && (
        <MapScreen
          save={save}
          onStart={startChapter}
          onEndless={() => startChapter(endlessIndex, "endless")}
          onJournal={() => openMenu("journal")}
          onSupport={() => openMenu("support")}
          onSettings={() => openMenu("settings")}
          onHome={() => setScreen("title")}
        />
      )}

      {screen === "journal" && (
        <JournalScreen
          save={save}
          learned={learned}
          equipped={equipped}
          onBack={() => setScreen(backTo === "game" ? "map" : backTo)}
          onSelect={setSelectedTech}
          onEquip={equip}
        />
      )}

      {screen === "support" && (
        <SupportScreen onBack={() => setScreen(backTo)} />
      )}

      {screen === "settings" && (
        <SettingsScreen
          save={save}
          cloudState={cloudState}
          syncCode={syncCode}
          onBack={() => setScreen(backTo)}
          onUpdate={updateSettings}
          onName={updateName}
          onReset={() => setConfirmReset(true)}
          onSync={syncNow}
          onRestore={restoreFromCode}
          onCopyCode={copySyncCode}
        />
      )}

      {toast && <ToastView toast={toast} />}

      {confirmReset && (
        <Modal onClose={() => setConfirmReset(false)}>
          <div className="modal-card narrow">
            <div className="eyebrow">Start over</div>
            <h2>Begin a new journey?</h2>
            <p className="muted">
              This clears your level, techniques, chapter progress, and best
              distance. Your settings stay. There is no wrong time to start
              again.
            </p>
            <div className="modal-actions">
              <button className="btn ghost" onClick={() => setConfirmReset(false)}>
                Keep my journey
              </button>
              <button className="btn danger" onClick={resetProgress}>
                Start fresh
              </button>
            </div>
          </div>
        </Modal>
      )}

      {selectedTech && (
        <TechniqueDetail
          technique={selectedTech}
          equipped={equipped?.id === selectedTech.id}
          onClose={() => setSelectedTech(null)}
          onEquip={() => equip(selectedTech.id)}
          onPractice={() => {
            setPracticeTech(selectedTech);
            setSelectedTech(null);
          }}
        />
      )}

      {practiceTech && (
        <PracticeOverlay
          technique={practiceTech}
          onClose={() => setPracticeTech(null)}
        />
      )}
    </div>
  );
}

// ------------------------------------------------------------------ title

function TitleScreen({
  save,
  onContinue,
  onNew,
  onJournal,
  onSupport,
  onSettings,
}: {
  save: SaveData;
  onContinue: () => void;
  onNew: () => void;
  onJournal: () => void;
  onSupport: () => void;
  onSettings: () => void;
}) {
  return (
    <div className="screen menu-screen title-screen">
      <div className="title-orbs" aria-hidden="true">
        <span className="orb orb-a" />
        <span className="orb orb-b" />
        <span className="orb orb-c" />
      </div>
      <div className="title-content">
        <div className="eyebrow">A gentle endless runner</div>
        <h1 className="game-title">ENDLESS</h1>
        <div className="game-subtitle">The Long Way Home</div>
        <p className="title-copy">
          Outrun the fog. Settle the spiral. Learn a new way to carry your mind
          — one chapter, one breath at a time.
        </p>

        {save.runs > 0 && (
          <div className="title-stats">
            <div>
              <strong>{save.level}</strong>
              <span>level</span>
            </div>
            <div>
              <strong>{save.learned.length}</strong>
              <span>techniques</span>
            </div>
            <div>
              <strong>{save.bestDistance}m</strong>
              <span>best run</span>
            </div>
          </div>
        )}

        <div className="title-actions">
          {save.runs > 0 ? (
            <button className="btn primary big" onClick={onContinue}>
              Continue journey
            </button>
          ) : (
            <button className="btn primary big" onClick={onNew}>
              Begin
            </button>
          )}
          {save.runs > 0 && (
            <button className="btn ghost big" onClick={onNew}>
              New journey
            </button>
          )}
        </div>

        <div className="title-links">
          <button className="link-btn" onClick={onJournal}>
            Journal
          </button>
          <span className="dot" />
          <button className="link-btn" onClick={onSupport}>
            Support
          </button>
          <span className="dot" />
          <button className="link-btn" onClick={onSettings}>
            Settings
          </button>
        </div>
      </div>
      <footer className="title-footer">
        <span>Built with care. Not a substitute for professional care.</span>
      </footer>
    </div>
  );
}

// ------------------------------------------------------------------ map

function MapScreen({
  save,
  onStart,
  onEndless,
  onJournal,
  onSupport,
  onSettings,
  onHome,
}: {
  save: SaveData;
  onStart: (i: number, mode?: "chapter" | "endless") => void;
  onEndless: () => void;
  onJournal: () => void;
  onSupport: () => void;
  onSettings: () => void;
  onHome: () => void;
}) {
  const allDone = save.completedChapters.length >= CHAPTERS.length;
  return (
    <div className="screen menu-screen map-screen">
      <header className="menu-header">
        <button className="icon-btn" onClick={onHome} aria-label="Home">
          ←
        </button>
        <div>
          <div className="eyebrow">The journey</div>
          <h1 className="menu-title">The Long Way Home</h1>
        </div>
        <button className="icon-btn" onClick={onSettings} aria-label="Settings">
          ⚙
        </button>
      </header>

      <div className="map-summary">
        <div className="summary-pill">
          <span className="pill-label">Level</span>
          <strong>{save.level}</strong>
        </div>
        <div className="summary-pill">
          <span className="pill-label">Techniques</span>
          <strong>{save.learned.length}</strong>
        </div>
        <div className="summary-pill">
          <span className="pill-label">Best</span>
          <strong>{save.bestDistance}m</strong>
        </div>
      </div>

      <div className="chapter-list">
        {CHAPTERS.map((c, i) => {
          const completed = save.completedChapters.includes(i);
          const unlocked = isChapterUnlocked(save, i);
          const current = !completed && unlocked;
          const keystone = TECHNIQUE_BY_ID[c.keystoneId];
          return (
            <button
              key={c.id}
              className={`chapter-card ${completed ? "completed" : ""} ${
                current ? "current" : ""
              } ${!unlocked ? "locked" : ""}`}
              style={
                {
                  "--chapter-accent": c.accent,
                  "--chapter-sky": c.sky[1],
                } as React.CSSProperties
              }
              disabled={!unlocked}
              onClick={() => onStart(i)}
            >
              <div className="chapter-number">
                {completed ? "✓" : unlocked ? String(c.number).padStart(2, "0") : "🔒"}
              </div>
              <div className="chapter-body">
                <div className="chapter-kicker">
                  Chapter {c.number} · {c.subtitle}
                </div>
                <div className="chapter-title">{c.title}</div>
                <div className="chapter-theme">{c.theme}</div>
                <div className="chapter-meta">
                  <span>{c.targetMeters}m</span>
                  <span className="difficulty">
                    {"◆".repeat(c.difficulty)}
                    <em>{"◇".repeat(5 - c.difficulty)}</em>
                  </span>
                  <span className="keystone-chip">
                    {KIND_ICON[keystone.kind]} {keystone.name}
                  </span>
                </div>
              </div>
              <div className="chapter-arrow">{unlocked ? "→" : ""}</div>
            </button>
          );
        })}
      </div>

      <button className={`endless-card ${allDone ? "open" : ""}`} onClick={onEndless}>
        <div className="endless-glow" />
        <div className="eyebrow">Endless mode</div>
        <div className="endless-title">The Open Road</div>
        <p>
          No finish line. A new boss every stretch of road. How far can you
          carry your light?
        </p>
        <div className="endless-best">Best: {save.bestEndless}m</div>
      </button>

      <nav className="bottom-nav">
        <button className="nav-btn" onClick={onJournal}>
          <span>❋</span> Journal
        </button>
        <button className="nav-btn" onClick={onSupport}>
          <span>♥</span> Support
        </button>
        <button className="nav-btn" onClick={onSettings}>
          <span>⚙</span> Settings
        </button>
      </nav>
    </div>
  );
}

// ------------------------------------------------------------------ journal

function JournalScreen({
  save,
  learned,
  equipped,
  onBack,
  onSelect,
  onEquip,
}: {
  save: SaveData;
  learned: Technique[];
  equipped: Technique | null;
  onBack: () => void;
  onSelect: (t: Technique) => void;
  onEquip: (id: string) => void;
}) {
  return (
    <div className="screen menu-screen journal-screen">
      <header className="menu-header">
        <button className="icon-btn" onClick={onBack} aria-label="Back">
          ←
        </button>
        <div>
          <div className="eyebrow">Your toolkit</div>
          <h1 className="menu-title">Journal</h1>
        </div>
        <div className="journal-count">
          {learned.length}/{TECHNIQUES.length}
        </div>
      </header>

      {equipped && (
        <div className="equipped-banner">
          <div className="eyebrow">Equipped technique</div>
          <div className="equipped-row">
            <span className="tech-icon" style={{ color: equipped.color }}>
              {equipped.icon}
            </span>
            <div>
              <strong>{equipped.name}</strong>
              <div className="muted small">{equipped.tagline}</div>
            </div>
            <button className="btn tiny ghost" onClick={() => onSelect(equipped)}>
              View
            </button>
          </div>
        </div>
      )}

      {learned.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">❋</div>
          <h2>Nothing here yet</h2>
          <p className="muted">
            Complete a chapter or level up to learn your first technique. Every
            run teaches you something worth keeping.
          </p>
        </div>
      ) : (
        <>
          <div className="section-label">Learned techniques</div>
          <div className="tech-grid">
            {learned.map((t) => {
              const isActive = t.type === "active";
              const isEquipped = equipped?.id === t.id;
              return (
                <button
                  key={t.id}
                  className={`tech-card ${isEquipped ? "is-equipped" : ""}`}
                  style={{ "--tech-color": t.color } as React.CSSProperties}
                  onClick={() => onSelect(t)}
                >
                  <div className="tech-card-top">
                    <span className="tech-icon">{t.icon}</span>
                    <span className="kind-badge">{KIND_LABEL[t.kind]}</span>
                  </div>
                  <div className="tech-name">{t.name}</div>
                  <div className="tech-tagline">{t.tagline}</div>
                  <div className="tech-type">
                    {isActive ? "Active" : "Passive"}
                    {isEquipped ? " · Equipped" : ""}
                  </div>
                  <div className="tech-actions">
                    {isActive && (
                      <button
                        className={`btn tiny ${isEquipped ? "ghost" : "secondary"}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          isEquipped ? onSelect(t) : onEquip(t.id);
                        }}
                      >
                        {isEquipped ? "Equipped" : "Equip"}
                      </button>
                    )}
                    <button
                      className="btn tiny ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(t);
                      }}
                    >
                      Practise
                    </button>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      <div className="journal-note">
        <div className="eyebrow">A note on practice</div>
        <p>
          Knowing a technique is not the same as practicing it. Open any card to
          read the steps, then try it for a minute. Small repetitions beat
          perfect intentions.
        </p>
      </div>

      <div className="journal-footer">
        <span>{save.wins} chapters completed</span>
        <span>{save.journal.length} journal entries</span>
      </div>
    </div>
  );
}

function TechniqueDetail({
  technique,
  equipped,
  onClose,
  onEquip,
  onPractice,
}: {
  technique: Technique;
  equipped: boolean;
  onClose: () => void;
  onEquip: () => void;
  onPractice: () => void;
}) {
  return (
    <Modal onClose={onClose}>
      <div
        className="modal-card tech-detail"
        style={{ "--tech-color": technique.color } as React.CSSProperties}
      >
        <div className="tech-detail-head">
          <span className="tech-icon big">{technique.icon}</span>
          <div>
            <div className="eyebrow">
              {KIND_LABEL[technique.kind]} ·{" "}
              {technique.type === "active" ? "Active" : "Passive"}
            </div>
            <h2>{technique.name}</h2>
            <p className="muted">{technique.tagline}</p>
          </div>
        </div>

        <div className="effect-pill">{effectText(technique)}</div>

        <div className="section-label">How to practice</div>
        <ol className="steps">
          {technique.instruction.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>

        <div className="why-box">
          <div className="eyebrow">Why it helps</div>
          <p>{technique.why}</p>
        </div>

        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>
            Close
          </button>
          <button className="btn secondary" onClick={onPractice}>
            Practice now
          </button>
          {technique.type === "active" && (
            <button
              className="btn primary"
              onClick={() => {
                onEquip();
                onClose();
              }}
              disabled={equipped}
            >
              {equipped ? "Equipped" : "Equip"}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------------ practice

function PracticeOverlay({
  technique,
  onClose,
}: {
  technique: Technique;
  onClose: () => void;
}) {
  const breathing = isBreathing(technique);
  const pattern = breathPattern(technique);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(true);
  const [checked, setChecked] = useState<boolean[]>(
    technique.instruction.map(() => false),
  );

  useEffect(() => {
    if (!breathing || !running) return;
    const id = window.setInterval(() => setElapsed((e) => e + 0.1), 100);
    return () => window.clearInterval(id);
  }, [breathing, running]);

  const total = pattern.steps.reduce((a, b) => a + b, 0);
  const cyclePos = elapsed % total;
  let acc = 0;
  let phaseIndex = 0;
  for (let i = 0; i < pattern.steps.length; i++) {
    if (cyclePos < acc + pattern.steps[i]) {
      phaseIndex = i;
      break;
    }
    acc += pattern.steps[i];
  }
  const phaseLen = pattern.steps[phaseIndex];
  const phaseProgress = (cyclePos - acc) / phaseLen;
  const phaseLabel = pattern.labels[phaseIndex] ?? "Breathe";
  const remaining = Math.max(0, Math.ceil(phaseLen - (cyclePos - acc)));

  let scale = 1;
  if (phaseLabel === "Inhale" || phaseLabel === "Sip") scale = 0.55 + 0.45 * phaseProgress;
  else if (phaseLabel === "Exhale") scale = 1 - 0.45 * phaseProgress;
  else scale = phaseIndex === 0 ? 0.55 : 1;
  if (phaseIndex === pattern.steps.length - 1 && pattern.labels[phaseIndex] === "Hold") {
    scale = 0.55;
  }

  const cycles = Math.floor(elapsed / total);

  return (
    <Modal onClose={onClose}>
      <div
        className="modal-card practice-card"
        style={{ "--tech-color": technique.color } as React.CSSProperties}
      >
        <div className="eyebrow">
          {KIND_LABEL[technique.kind]} · {technique.name}
        </div>
        {breathing ? (
          <>
            <h2 className="practice-title">Breathe with the circle</h2>
            <div className="breath-stage">
              <div className="breath-ring" />
              <div
                className="breath-circle"
                style={{ transform: `scale(${scale.toFixed(3)})` }}
              >
                <span className="breath-phase">{phaseLabel}</span>
                <span className="breath-count">{remaining}</span>
              </div>
            </div>
            <div className="practice-meta">
              <span>{cycles} cycles</span>
              <button className="btn tiny ghost" onClick={() => setRunning((r) => !r)}>
                {running ? "Pause" : "Resume"}
              </button>
            </div>
          </>
        ) : (
          <h2 className="practice-title">Take your time</h2>
        )}

        <ol className="steps practice-steps">
          {technique.instruction.map((step, i) => (
            <li key={i} className={checked[i] ? "done" : ""}>
              <button
                className="check"
                onClick={() =>
                  setChecked((prev) => prev.map((v, idx) => (idx === i ? !v : v)))
                }
                aria-label="Mark step done"
              >
                {checked[i] ? "✓" : ""}
              </button>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        <div className="practice-why">{technique.why}</div>

        <div className="modal-actions">
          <button className="btn primary" onClick={onClose}>
            I practiced this
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------------ support

function SupportScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="screen menu-screen support-screen">
      <header className="menu-header">
        <button className="icon-btn" onClick={onBack} aria-label="Back">
          ←
        </button>
        <div>
          <div className="eyebrow">You do not have to carry it alone</div>
          <h1 className="menu-title">Support</h1>
        </div>
        <div />
      </header>

      <div className="support-card">
        <h2>A gentle but important note</h2>
        <p>{CONTENT_NOTE}</p>
      </div>

      <div className="section-label">Crisis & support lines</div>
      <div className="resource-list">
        {SUPPORT_RESOURCES.map((r) => (
          <div className="resource" key={r.name}>
            <div>
              <div className="resource-region">{r.region}</div>
              <div className="resource-name">{r.name}</div>
              <div className="muted small">{r.contact}</div>
            </div>
            {r.url && (
              <a
                className="btn tiny secondary"
                href={r.url}
                target="_blank"
                rel="noreferrer"
              >
                Open
              </a>
            )}
          </div>
        ))}
      </div>

      <div className="support-card soft">
        <h3>If you are in immediate danger</h3>
        <p>
          Please contact your local emergency number right now. If you can, tell
          one person nearby that you need help staying safe. You are allowed to
          ask for help before you have a perfect way to explain it.
        </p>
      </div>

      <div className="support-card soft">
        <h3>Small things that help</h3>
        <ul className="plain-list">
          <li>Name one thing you can see, hear, and feel right now.</li>
          <li>Put both feet on the floor and breathe out longer than you breathe in.</li>
          <li>Text one person: “Hey, I’m having a hard night. Can you stay with me a minute?”</li>
          <li>Drink water. Eat something small. Lower the lights.</li>
          <li>You do not have to solve the whole night. Just the next ten minutes.</li>
        </ul>
      </div>

      <div className="journal-note">
        <p>
          Endless is a game about practicing skills, not a diagnosis or a
          treatment plan. A licensed professional can help you build a plan that
          fits your actual life.
        </p>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ settings

function SettingsScreen({
  save,
  cloudState,
  syncCode,
  onBack,
  onUpdate,
  onName,
  onReset,
  onSync,
  onRestore,
  onCopyCode,
}: {
  save: SaveData;
  cloudState: CloudState;
  syncCode: string;
  onBack: () => void;
  onUpdate: (patch: Partial<SaveData["settings"]>) => void;
  onName: (name: string) => void;
  onReset: () => void;
  onSync: () => void;
  onRestore: () => void;
  onCopyCode: () => void;
}) {
  return (
    <div className="screen menu-screen settings-screen">
      <header className="menu-header">
        <button className="icon-btn" onClick={onBack} aria-label="Back">
          ←
        </button>
        <div>
          <div className="eyebrow">Make it yours</div>
          <h1 className="menu-title">Settings</h1>
        </div>
        <div />
      </header>

      <div className="settings-group">
        <label className="field-label" htmlFor="name">
          Name
        </label>
        <input
          id="name"
          className="text-input"
          value={save.playerName}
          maxLength={20}
          onChange={(e) => onName(e.target.value)}
        />
      </div>

      <div className="settings-group">
        <Toggle
          label="Sound"
          hint="Gentle tones and feedback"
          checked={save.settings.sound}
          onChange={(v) => onUpdate({ sound: v })}
        />
        <Toggle
          label="Haptics"
          hint="Short vibrations on supported devices"
          checked={save.settings.haptics}
          onChange={(v) => onUpdate({ haptics: v })}
        />
        <Toggle
          label="Reduce motion"
          hint="Turns off screen shake"
          checked={save.settings.reduceMotion}
          onChange={(v) => onUpdate({ reduceMotion: v })}
        />
      </div>

      <div className="settings-group">
        <div className="eyebrow">Cloud save</div>
        <p className="muted small">
          {cloudState === "synced"
            ? "Progress is backed up to the cloud."
            : cloudState === "syncing"
              ? "Syncing progress..."
              : cloudState === "offline"
                ? "Cloud is offline. Progress stays on this device and will sync when it returns."
                : "Cloud save is ready."}
        </p>
        <div className="sync-code-row">
          <code>{maskCode(syncCode)}</code>
          <button className="btn ghost tiny" onClick={onCopyCode}>
            Copy
          </button>
        </div>
        <p className="muted small">
          Keep this code private. Enter it on another device to carry your
          journey with you.
        </p>
        <div className="modal-actions wrap">
          <button className="btn secondary" onClick={onSync}>
            Sync now
          </button>
          <button className="btn ghost" onClick={onRestore}>
            Use another code
          </button>
        </div>
      </div>

      <div className="settings-group">
        <div className="eyebrow">Progress</div>
        <div className="settings-stat-row">
          <span>Level {save.level}</span>
          <span>{save.learned.length} techniques</span>
          <span>{save.runs} runs</span>
        </div>
        <button className="btn danger ghost wide" onClick={onReset}>
          Reset progress
        </button>
      </div>

      <div className="settings-about">
        <div className="eyebrow">About</div>
        <p>
          Endless v0.1 · A mobile-first endless-runner RPG about practicing
          healthy coping skills. Your progress is saved on this device.
        </p>
        <p className="muted small">
          Built with care for anyone who has ever needed a reason to keep moving.
        </p>
      </div>
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      className={`toggle-row ${checked ? "on" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <div>
        <div className="toggle-label">{label}</div>
        <div className="muted small">{hint}</div>
      </div>
      <span className="switch">
        <span className="knob" />
      </span>
    </button>
  );
}

// ------------------------------------------------------------------ game

function GameScreen({
  canvasRef,
  snapshot,
  run,
  chapter,
  save,
  introOpen,
  paused,
  levelUp,
  complete,
  dead,
  bossBanner,
  toast,
  onBegin,
  onPause,
  onResume,
  onRestart,
  onQuit,
  onChoose,
  onCompleteMap,
  onCompleteNext,
  onCompleteReplay,
  onDeadRetry,
  onDeadMap,
  onJump,
  onSlideStart,
  onSlideEnd,
  onPulse,
  onActive,
  onOpenJournal,
}: {
  canvasRef: (el: HTMLCanvasElement | null) => void;
  snapshot: RunSnapshot | null;
  run: RunConfig;
  chapter: Chapter;
  save: SaveData;
  introOpen: boolean;
  paused: boolean;
  levelUp: LevelUpState | null;
  complete: CompleteState | null;
  dead: RunResult | null;
  bossBanner: { name: string; title: string } | null;
  toast: Toast | null;
  onBegin: () => void;
  onPause: () => void;
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
  onChoose: (id: string) => void;
  onCompleteMap: () => void;
  onCompleteNext: () => void;
  onCompleteReplay: () => void;
  onDeadRetry: () => void;
  onDeadMap: () => void;
  onJump: () => void;
  onSlideStart: () => void;
  onSlideEnd: () => void;
  onPulse: () => void;
  onActive: () => void;
  onOpenJournal: () => void;
}) {
  const hpPct = snapshot ? (snapshot.hp / snapshot.maxHp) * 100 : 100;
  const focusPct = snapshot ? (snapshot.focus / snapshot.maxFocus) * 100 : 100;
  const xpPct = snapshot ? (snapshot.xp / snapshot.xpToNext) * 100 : 0;
  const progress = snapshot
    ? Math.min(100, (snapshot.distance / Math.max(1, snapshot.target)) * 100)
    : 0;
  const cooldownLeft = snapshot ? Math.ceil(snapshot.activeCooldown) : 0;
  const activeReady = snapshot ? snapshot.activeCooldown <= 0 : false;

  return (
    <div className="game-screen">
      <canvas ref={canvasRef} className="game-canvas" />

      <div className="hud">
        <div className="hud-top">
          <button className="hud-btn" onClick={onPause} aria-label="Pause">
            ❚❚
          </button>
          <div className="hud-chapter">
            <div className="hud-kicker">
              {run.mode === "chapter"
                ? `Chapter ${chapter.number} · ${chapter.subtitle}`
                : "The Open Road"}
            </div>
            <div className="hud-title">
              {run.mode === "chapter" ? chapter.title : "Endless"}
            </div>
          </div>
          <div className="hud-level">
            <span>LV</span>
            <strong>{snapshot?.level ?? save.level}</strong>
          </div>
        </div>

        <div className="progress-row">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
            <div className="progress-runner" style={{ left: `${progress}%` }} />
          </div>
          <div className="progress-label">
            {snapshot?.distance ?? 0}m
            <span>
              {run.mode === "chapter"
                ? ` / ${snapshot?.target ?? chapter.targetMeters}m`
                : " / open road"}
            </span>
          </div>
        </div>

        <div className="bars">
          <div className="bar-row">
            <span className="bar-label">HP</span>
            <span className="bar-icon">♥</span>
            <div className="bar-track">
              <div
                className={`bar-fill resolve ${hpPct < 30 ? "low" : ""}`}
                style={{ width: `${hpPct}%` }}
              />
            </div>
            <span className="bar-value">
              {snapshot?.hp ?? 100}
            </span>
          </div>
          <div className="bar-row">
            <span className="bar-label">Focus</span>
            <span className="bar-icon focus">◉</span>
            <div className="bar-track">
              <div className="bar-fill focus" style={{ width: `${focusPct}%` }} />
            </div>
            <span className="bar-value">{snapshot?.focus ?? 100}</span>
          </div>
          <div className="bar-row xp">
            <span className="bar-label">XP</span>
            <span className="bar-icon xp">✦</span>
            <div className="bar-track">
              <div className="bar-fill xp" style={{ width: `${xpPct}%` }} />
            </div>
            <span className="bar-value">
              {snapshot?.xp ?? 0}/{snapshot?.xpToNext ?? 50}
            </span>
          </div>
        </div>

        {snapshot?.boss && (
          <div className="boss-bar">
            <div className="boss-name">
              <span>{snapshot.boss.name}</span>
              <em>{snapshot.boss.title}</em>
            </div>
            <div className="boss-track">
              <div
                className="boss-fill"
                style={{
                  width: `${(snapshot.boss.hp / snapshot.boss.maxHp) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {snapshot && snapshot.combo > 1 && (
          <div className="combo-badge">×{snapshot.combo} flow</div>
        )}

        {snapshot && snapshot.shield > 0 && (
          <div className="shield-badge">◈ shield {Math.ceil(snapshot.shield)}s</div>
        )}
      </div>

      {bossBanner && (
        <div className="boss-banner">
          <div className="eyebrow">A challenge approaches</div>
          <div className="boss-banner-name">{bossBanner.name}</div>
          <div className="boss-banner-title">{bossBanner.title}</div>
        </div>
      )}

      {!introOpen && !paused && !levelUp && !complete && !dead && (
        <div className="controls">
          <button
            className="ctrl ctrl-slide"
            onPointerDown={(e) => {
              e.preventDefault();
              onSlideStart();
            }}
            onPointerUp={onSlideEnd}
            onPointerLeave={onSlideEnd}
            onPointerCancel={onSlideEnd}
          >
            <span className="ctrl-key">↓</span>
            <span className="ctrl-label">Slide</span>
            <span className="ctrl-hint">S / ↓</span>
          </button>
          <button className="ctrl ctrl-tech" onPointerDown={(e) => { e.preventDefault(); onActive(); }}>
            <span className="ctrl-key" style={{ color: snapshot?.activeName ? chapter.accent : undefined }}>
              {cooldownLeft > 0 ? cooldownLeft : "✧"}
            </span>
            <span className="ctrl-label">Technique</span>
            <span className="ctrl-hint">
              {snapshot?.activeName ? snapshot.activeName.split(" ")[0] : "Journal"}
            </span>
          </button>
          <button className="ctrl ctrl-pulse" onPointerDown={(e) => { e.preventDefault(); onPulse(); }}>
            <span className="ctrl-key">◉</span>
            <span className="ctrl-label">Pulse</span>
            <span className="ctrl-hint">J / F</span>
          </button>
          <button className="ctrl ctrl-jump" onPointerDown={(e) => { e.preventDefault(); onJump(); }}>
            <span className="ctrl-key">↑</span>
            <span className="ctrl-label">Jump</span>
            <span className="ctrl-hint">Space / W</span>
          </button>
        </div>
      )}

      {introOpen && (
        <div className="overlay intro-overlay">
          <div
            className="intro-card"
            style={{ "--chapter-accent": chapter.accent } as React.CSSProperties}
          >
            <div className="eyebrow">
              {run.mode === "chapter"
                ? `Chapter ${chapter.number} · ${chapter.subtitle}`
                : "Endless mode"}
            </div>
            <h2 className="intro-title">
              {run.mode === "chapter" ? chapter.title : "The Open Road"}
            </h2>
            <p className="intro-text">
              {run.mode === "chapter"
                ? chapter.intro
                : "No finish line. The road keeps going, and so do you. Each stretch brings new shadows, new bosses, and new chances to practice what you have learned."}
            </p>
            {run.mode === "chapter" && (
              <div className="intro-keystone">
                <span className="eyebrow">Chapter reward</span>
                <div className="intro-keystone-row">
                  <span
                    className="tech-icon"
                    style={{ color: TECHNIQUE_BY_ID[chapter.keystoneId].color }}
                  >
                    {TECHNIQUE_BY_ID[chapter.keystoneId].icon}
                  </span>
                  <div>
                    <strong>{TECHNIQUE_BY_ID[chapter.keystoneId].name}</strong>
                    <div className="muted small">
                      {TECHNIQUE_BY_ID[chapter.keystoneId].tagline}
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="intro-controls">
              <div>TAP <span className="ctrl-key">↑</span> jump</div>
              <div>TAP <span className="ctrl-key">↓</span> slide</div>
              <div>TAP <span className="ctrl-key">◉</span> pulse</div>
              <div>TAP technique</div>
            </div>
            <p className="intro-note">{CONTENT_NOTE}</p>
            <button className="btn primary big wide" onClick={onBegin}>
              Begin
            </button>
          </div>
        </div>
      )}

      {paused && !levelUp && !complete && !dead && (
        <div className="overlay">
          <div className="modal-card narrow">
            <div className="eyebrow">Paused</div>
            <h2>A breath in the middle</h2>
            <p className="muted">
              Progress is saved when you leave. You can always come back.
            </p>
            <div className="pause-actions">
              <button className="btn primary" onClick={onResume}>
                Resume
              </button>
              <button className="btn secondary" onClick={onOpenJournal}>
                Journal
              </button>
              <button className="btn ghost" onClick={onRestart}>
                Restart run
              </button>
              <button className="btn ghost" onClick={onQuit}>
                Quit to map
              </button>
            </div>
          </div>
        </div>
      )}

      {levelUp && (
        <div className="overlay level-overlay">
          <div className="level-card">
            <div className="eyebrow">Level {levelUp.level}</div>
            <h2>You learned something</h2>
            <p className="muted">
              Choose a technique. Passives stay with you. Actives can be used
              during a run.
            </p>
            <div className="level-choices">
              {levelUp.choices.map((t) => (
                <button
                  key={t.id}
                  className="level-choice"
                  style={{ "--tech-color": t.color } as React.CSSProperties}
                  onClick={() => onChoose(t.id)}
                >
                  <div className="level-choice-head">
                    <span className="tech-icon big">{t.icon}</span>
                    <span className="kind-badge">{KIND_LABEL[t.kind]}</span>
                  </div>
                  <div className="level-choice-name">{t.name}</div>
                  <div className="level-choice-tagline">{t.tagline}</div>
                  <div className="level-choice-effect">{effectText(t)}</div>
                  <div className="level-choice-type">
                    {t.type === "active" ? "Active · equips now" : "Passive · always on"}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {complete && (
        <div className="overlay complete-overlay">
          <div className="complete-card">
            <div className="complete-glow" />
            <div className="eyebrow">Chapter complete</div>
            <h2>{complete.chapter.title}</h2>
            <p className="complete-outro">{complete.chapter.outro}</p>

            <div className="keystone-card" style={{ "--tech-color": complete.keystone.color } as React.CSSProperties}>
              <div className="eyebrow">Keystone technique learned</div>
              <div className="keystone-head">
                <span className="tech-icon big">{complete.keystone.icon}</span>
                <div>
                  <h3>{complete.keystone.name}</h3>
                  <div className="muted small">{complete.keystone.tagline}</div>
                </div>
              </div>
              <ol className="steps compact">
                {complete.keystone.instruction.slice(0, 3).map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </div>

            <div className="run-stats">
              <div><strong>{complete.result.distance}m</strong><span>distance</span></div>
              <div><strong>{complete.result.enemiesDefeated}</strong><span>shadows settled</span></div>
              <div><strong>{complete.result.xpEarned}</strong><span>XP earned</span></div>
              <div><strong>{complete.result.level}</strong><span>level</span></div>
            </div>

            <div className="modal-actions wrap">
              <button className="btn ghost" onClick={onCompleteMap}>
                Back to map
              </button>
              <button className="btn secondary" onClick={onCompleteReplay}>
                Run again
              </button>
              <button className="btn primary" onClick={onCompleteNext}>
                {complete.chapter.number < CHAPTERS.length ? "Next chapter" : "The Open Road"}
              </button>
            </div>
          </div>
        </div>
      )}

      {dead && (
        <div className="overlay dead-overlay">
          <div className="modal-card narrow dead-card">
            <div className="eyebrow">The run ends here</div>
            <h2>You are still here.</h2>
            <p className="muted">
              A run ending is not a life ending. You collected {dead.xpEarned} XP
              and practiced {dead.techniquesUsed} technique
              {dead.techniquesUsed === 1 ? "" : "s"}. The road will be here when
              you are ready.
            </p>
            <div className="run-stats small-stats">
              <div><strong>{dead.distance}m</strong><span>distance</span></div>
              <div><strong>{dead.enemiesDefeated}</strong><span>settled</span></div>
              <div><strong>{dead.level}</strong><span>level</span></div>
            </div>
            <div className="dead-tip">
              <div className="eyebrow">A small thing for right now</div>
              <p>
                Unclench your jaw. Drop your shoulders. Take one breath out
                slower than the last one in. That counts.
              </p>
            </div>
            <div className="modal-actions">
              <button className="btn ghost" onClick={onDeadMap}>
                Back to map
              </button>
              <button className="btn primary" onClick={onDeadRetry}>
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <ToastView toast={toast} />}
    </div>
  );
}

// ------------------------------------------------------------------ shared

function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-inner" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function ToastView({ toast }: { toast: Toast }) {
  return (
    <div className={`toast ${toast.tone}`} key={toast.id}>
      {toast.text}
    </div>
  );
}
