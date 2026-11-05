import { useEffect, useRef, useState, type CSSProperties } from "react";
import { DISTRICTS, MINDSETS, PILOTS, UPGRADES, draft, type PilotId } from "./content";
import { Run, WIDTH, HEIGHT, type Vec } from "./model";
import { draw, pilotArt } from "./render";
import { readRecords, writeRecords } from "./storage";
import { tone } from "./sound";
import "./style.css";
function Portrait({ id, large = false }: { id: PilotId; large?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, 320, 320);
    const p = PILOTS.find((p) => p.id === id)!;
    const g = ctx.createRadialGradient(160, 160, 5, 160, 160, 150);
    g.addColorStop(0, p.color + "20");
    g.addColorStop(1, p.color + "00");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 320, 320);
    ctx.strokeStyle = p.color + "20";
    for (const r of [65, 105, 140]) {
      ctx.beginPath();
      ctx.arc(160, 160, r, 0, 7);
      ctx.stroke();
    }
    pilotArt(ctx, id, 160, 160, large ? 155 : 115, p.color);
  }, [id, large]);
  return <canvas ref={ref} width={320} height={320} aria-hidden="true" />;
}
const clock = (time: number) =>
  `${Math.floor(time / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(time % 60)
    .toString()
    .padStart(2, "0")}`;
export default function ArenaApp() {
  const [pilot, setPilot] = useState<PilotId>("vesper"),
    [run, setRun] = useState<Run | null>(null),
    [paused, setPaused] = useState(false),
    [records, setRecords] = useState(readRecords),
    [storageError, setStorageError] = useState(false),
    [help, setHelp] = useState(false),
    [, tick] = useState(0);
  const canvas = useRef<HTMLCanvasElement>(null),
    keys = useRef(new Set<string>()),
    stick = useRef<Vec>({ x: 0, y: 0 }),
    pauseRef = useRef(false),
    settings = useRef(records),
    recorded = useRef(false),
    stickPointer = useRef<number | null>(null),
    [knob, setKnob] = useState<Vec>({ x: 0, y: 0 });
  const chosen = PILOTS.find((p) => p.id === pilot)!;
  settings.current = records;
  function save(next: typeof records) {
    setRecords(next);
    setStorageError(!writeRecords(next));
  }
  function clearInput() {
    keys.current.clear();
    stick.current = { x: 0, y: 0 };
    stickPointer.current = null;
    setKnob({ x: 0, y: 0 });
  }
  function pause(value: boolean) {
    pauseRef.current = value;
    setPaused(value);
    clearInput();
  }
  function start() {
    clearInput();
    recorded.current = false;
    pause(false);
    setRun(new Run(pilot));
  }
  function act(action: "dash" | "skill") {
    if (!run || pauseRef.current) return;
    if (run[action]()) tone(action, settings.current.sound);
    tick((n) => n + 1);
  }
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (!run) return;
      const k = e.key.toLowerCase();
      if (k === "escape" && !e.repeat && run.status === "playing") {
        e.preventDefault();
        pause(!pauseRef.current);
        return;
      }
      // Menus retain native keyboard activation; gameplay never consumes their Space.
      if (
        pauseRef.current ||
        run.status !== "playing" ||
        (e.target as HTMLElement)?.closest(
          'button, a, input, textarea, select, [contenteditable="true"]',
        )
      )
        return;
      if (
        [
          " ",
          "arrowup",
          "arrowdown",
          "arrowleft",
          "arrowright",
          "w",
          "a",
          "s",
          "d",
          "e",
        ].includes(k)
      )
        e.preventDefault();
      keys.current.add(k);
      if (!e.repeat && k === " ") act("dash");
      if (!e.repeat && k === "e") act("skill");
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    const blur = () => {
      if (run?.status === "playing") pause(true);
      else clearInput();
    };
    const hidden = () => {
      if (document.hidden) blur();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [run]);
  useEffect(() => {
    if (!run) return;
    let frame = 0,
      last = 0,
      lastUi = 0,
      lastHp = run.hp;
    function loop(now: number) {
      const dt = last ? Math.min((now - last) / 1000, 0.04) : 0;
      last = now;
      if (!pauseRef.current) {
        const k = keys.current;
        run!.step(dt, {
          x:
            stick.current.x +
            Number(k.has("d") || k.has("arrowright")) -
            Number(k.has("a") || k.has("arrowleft")),
          y:
            stick.current.y +
            Number(k.has("s") || k.has("arrowdown")) -
            Number(k.has("w") || k.has("arrowup")),
        });
      }
      if (run!.hp < lastHp) tone("hit", settings.current.sound);
      lastHp = run!.hp;
      const ctx = canvas.current?.getContext("2d");
      if (ctx) draw(ctx, run!, settings.current.reduced);
      if (
        (run!.status === "dead" || run!.status === "won") &&
        !recorded.current
      ) {
        recorded.current = true;
        const next = {
          ...settings.current,
          runs: settings.current.runs + 1,
          wins: settings.current.wins + Number(run!.status === "won"),
          best: Math.max(settings.current.best, run!.score),
        };
        save(next);
        clearInput();
      }
      if (now - lastUi > 80) {
        tick((n) => n + 1);
        lastUi = now;
      }
      frame = requestAnimationFrame(loop);
    }
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [run]);
  const status = run?.status;
  useEffect(() => {
    if (!help && !paused && (!status || status === "playing")) return;
    const trap = (e: KeyboardEvent) => {
      const modal = document.querySelector<HTMLElement>('[role="dialog"]');
      if (!modal) return;
      if (e.key === "Escape" && help) {
        setHelp(false);
        return;
      }
      if (e.key !== "Tab") return;
      const items = Array.from(
        modal.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"),
      );
      const first = items[0],
        last = items[items.length - 1];
      if (!first) return;
      if (
        e.shiftKey &&
        (document.activeElement === first ||
          !modal.contains(document.activeElement))
      ) {
        e.preventDefault();
        last.focus();
      } else if (
        !e.shiftKey &&
        (document.activeElement === last ||
          !modal.contains(document.activeElement))
      ) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => document.removeEventListener("keydown", trap);
  }, [help, paused, status]);
  const [offers, setOffers] = useState(() => draft());
  useEffect(() => {
    if (status === "draft") {
      setOffers(draft());
    }
    if (status !== "playing" || paused) clearInput();
    if ((status && status !== "playing") || paused)
      document.querySelector<HTMLButtonElement>(".dialog button")?.focus();
    else if (status === "playing") canvas.current?.focus();
  }, [status, paused]);
  function joystick(e: React.PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2,
      y = e.clientY - rect.top - rect.height / 2,
      mag = Math.hypot(x, y),
      scale = Math.min(1, 40 / Math.max(1, mag));
    stick.current = { x: (x * scale) / 40, y: (y * scale) / 40 };
    setKnob({ x: x * scale, y: y * scale });
  }
  const theme = {
    "--accent": run ? run.pilot.color : chosen.color,
  } as CSSProperties;
  return (
    <div className="signal-app" style={theme}>
      <header className="topbar">
        <button
          className="wordmark"
          onClick={() => {
            if (run?.status === "playing") {
              pause(true);
              return;
            }
            setRun(null);
          }}
        >
          P<span>↯</span> / PSYCHOSIS <small>SIGNAL LOST</small>
        </button>
        <div className="top-actions">
          <span className="connection">
            <i /> LOCAL SIGNAL
          </span>
          <button
            aria-label={records.sound ? "Mute sound" : "Enable sound"}
            onClick={() => {
              const next = { ...records, sound: !records.sound };
              save(next);
              tone("upgrade", next.sound);
            }}
          >
            {records.sound ? "SOUND ON" : "SOUND OFF"}
          </button>
          <button
            aria-pressed={records.reduced}
            onClick={() => save({ ...records, reduced: !records.reduced })}
          >
            MOTION {records.reduced ? "LOW" : "FULL"}
          </button>
          {run && (
            <button
              onClick={() => pause(!paused)}
              disabled={status !== "playing"}
            >
              Ⅱ <span>PAUSE</span>
            </button>
          )}
        </div>
      </header>
      {!run ? (
        <main className="hangar">
          <div className="intro">
            <div className="eyebrow">
              <span className="tiny-cross">✳</span> AN INDEPENDENT SIGNAL FROM
              THE OTHER SIDE
            </div>
            <h1>
              The world went quiet.
              <br />
              <em>You didn’t.</em>
            </h1>
            <p>
              Three strangers. One impossible frequency.
              <br />
              Find your way through a city that won’t let go.
            </p>
            <div className="intro-bottom">
              <span>ARENA SURVIVAL</span>
              <b> / </b>
              <span>THREE DISTRICTS</span>
              <b> / </b>
              <span>ONE MORE TRY</span>
            </div>
          </div>
          <section className="pilot-select" aria-label="Character selection">
            <div className="section-heading">
              <span>01 — CHOOSE YOUR SIGNAL</span>
              <small>ALL PILOTS AVAILABLE</small>
            </div>
            <div className="pilot-grid">
              {PILOTS.map((p, i) => (
                <button
                  key={p.id}
                  className={`pilot-card ${pilot === p.id ? "selected" : ""}`}
                  style={{ "--pilot": p.color } as CSSProperties}
                  onClick={() => setPilot(p.id)}
                  aria-pressed={pilot === p.id}
                >
                  <div className="card-top">
                    <span>0{i + 1}</span>
                    <span>{pilot === p.id ? "● SELECTED" : "↗"}</span>
                  </div>
                  <Portrait id={p.id} />
                  <div className="pilot-info">
                    <small>{p.role}</small>
                    <h2>{p.name}</h2>
                    <p>{p.description}</p>
                    <div className="stat-bars">
                      <span>
                        PACE{" "}
                        <b>
                          {p.speed > 220
                            ? "▰▰▰"
                            : p.speed > 190
                              ? "▰▰▱"
                              : "▰▱▱"}
                        </b>
                      </span>
                      <span>
                        ARMOR{" "}
                        <b>{p.hp > 130 ? "▰▰▰" : p.hp > 100 ? "▰▰▱" : "▰▱▱"}</b>
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
          <section className="launch-strip">
            <div>
              <small>
                {chosen.role} / {chosen.skill.toUpperCase()}
              </small>
              <p>{chosen.detail}</p>
            </div>
            <button className="primary launch" onClick={start}>
              ENTER THE STATIC <span>↗</span>
            </button>
          </section>
          <div className="hangar-footer">
            <button onClick={() => setHelp(true)}>
              HOW TO SURVIVE <span>↗</span>
            </button>
            <span>
              BEST {records.best.toLocaleString()} <b>·</b> RUNS {records.runs}{" "}
              <b>·</b> ESCAPES {records.wins}
            </span>
            <span>NO TWO SIGNALS ALIKE.</span>
          </div>
          <section className="district-strip" aria-label="Districts">
            {DISTRICTS.map((d, i) => (
              <div key={d.name}>
                <span>0{i + 1} /</span>
                <div>
                  <small>{d.label.split(" / ")[1]}</small>
                  <p>{d.name}</p>
                </div>
                <span>↗</span>
              </div>
            ))}
          </section>
        </main>
      ) : (
        <main className="game-layout">
          <div className="run-heading">
            <div>
              <span className="eyebrow">{DISTRICTS[run.district].label}</span>
              <h1>{DISTRICTS[run.district].name}</h1>
            </div>
            <div className="run-meta">
              <span>
                ENCOUNTER <b>{run.wave + 1}/6</b>
              </span>
              <span>
                TIME <b>{clock(run.time)}</b>
              </span>
              <span>
                SCORE <b>{run.score.toLocaleString()}</b>
              </span>
            </div>
          </div>
          <div className="arena-wrap">
            <canvas
              ref={canvas}
              tabIndex={0}
              onPointerDown={(e) => e.currentTarget.focus()}
              width={WIDTH}
              height={HEIGHT}
              aria-label="Arena. Move with WASD or arrow keys; Space to dash; E for signature skill."
            />
            <div className="arena-label">
              {run.boss
                ? "⚠ ANOMALY DETECTED"
                : run.waveTime < 4
                  ? "KEEP MOVING. YOUR WEAPON FINDS ITS TARGET."
                  : run.waveTime >= 25
                    ? "CLEAR THE REMAINING SIGNALS"
                    : "SURVIVE THE TRANSMISSION"}
            </div>
            {run.boss && (
              <div className="boss-hud">
                <span>
                  {DISTRICTS[run.district].boss}{" "}
                  {run.boss.hp < run.boss.maxHp * 0.5 ? " / OVERLOAD" : ""}
                </span>
                <div>
                  <i
                    style={{
                      width: `${(run.boss.hp / run.boss.maxHp) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}
            {(paused || status !== "playing") && (
              <div className="overlay">
                <section
                  className="dialog"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="dialog-title"
                >
                  <span className="eyebrow">
                    {paused
                      ? "TRANSMISSION HELD"
                      : status === "awakening"
                        ? "SIGNAL CROSSROADS / SIMULATION PAUSED"
                      : status === "draft"
                        ? "SIGNAL ACQUIRED"
                        : status === "won"
                          ? "YOU FOUND THE OTHER SIDE"
                          : "THE SIGNAL IS STILL THERE"}
                  </span>
                  <h2 id="dialog-title">
                    {paused
                      ? "Take a breath."
                      : status === "awakening"
                        ? "Choose your state of mind."
                      : status === "draft"
                        ? "Change your frequency."
                        : status === "won"
                          ? "Silence, at last."
                          : "Lost. Not gone."}
                  </h2>
                  <p>
                    {paused
                      ? "The city can wait."
                      : status === "awakening"
                        ? `${run.awakeningReason} Both paths are yours. Your choice replaces your current trait and lasts until you retune; it never stacks.`
                      : status === "draft"
                        ? "Choose one upgrade. Restore 12 integrity between encounters."
                        : `${run.kills} signals cleared · ${clock(run.time)} survived · ${run.score.toLocaleString()} points`}
                  </p>
                  {status === "awakening" && !paused ? (
                    <div className="upgrade-grid mindset-grid">
                      {MINDSETS.map((m) => (
                        <button key={m.id}
                          style={{ "--accent": m.color } as CSSProperties}
                          onClick={() => {
                            if (run.chooseMindset(m.id)) tone("upgrade", records.sound);
                            clearInput();
                            tick((n) => n + 1);
                          }}>
                          <span>{m.glyph}</span>
                          <small>{m.title.toUpperCase()}{run.mindset === m.id ? " / CURRENT" : ""}</small>
                          <h3>{m.name} powerup</h3>
                          <p>{m.description}</p>
                          <p className="trait-tradeoff">{m.tradeoff}</p>
                          <b>CHOOSE {m.name.toUpperCase()} ↗</b>
                        </button>
                      ))}
                    </div>
                  ) : status === "draft" && !paused ? (
                    <div className="upgrade-grid">
                      {offers.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => {
                            run.choose(u.id);
                            tone("upgrade", records.sound);
                            clearInput();
                            tick((n) => n + 1);
                          }}
                        >
                          <span>{u.glyph}</span>
                          <small>
                            {u.tag}{" "}
                            {run.count(u.id) > 0
                              ? `/ STACK ${run.count(u.id) + 1}`
                              : ""}
                          </small>
                          <h3>{u.name}</h3>
                          <p>{u.description}</p>
                          <b>TAKE UPGRADE ↗</b>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="dialog-actions">
                      {paused ? (
                        <button
                          className="primary"
                          onClick={() => pause(false)}
                        >
                          BACK TO THE SIGNAL ↗
                        </button>
                      ) : (
                        <button className="primary" onClick={start}>
                          TRY ANOTHER FREQUENCY ↗
                        </button>
                      )}
                      <button
                        onClick={() => {
                          pause(false);
                          setRun(null);
                        }}
                      >
                        RETURN TO PILOTS
                      </button>
                    </div>
                  )}
                  {(status === "dead" || status === "won") && !paused && (
                    <div className="build-list">
                      {run.trait && <span>{run.trait.name} / {run.trait.title}</span>}
                      {UPGRADES.filter((u) => run.count(u.id) > 0).map((u) => (
                        <span key={u.id}>
                          {u.name} ×{run.count(u.id)}
                        </span>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>
          <div className="combat-dock">
            <div className="integrity">
              <span>
                {run.pilot.name.toUpperCase()} <small>INTEGRITY</small>
                <b>
                  {Math.ceil(run.hp)} / {run.maxHp}
                </b>
              </span>
              <div className="health-track">
                <i style={{ width: `${(run.hp / run.maxHp) * 100}%` }} />
              </div>
              <small>
                {run.barrier > 0
                  ? `BARRIER ${run.barrier.toFixed(1)}s · `
                  : run.overdrive > 0
                    ? `OVERDRIVE ${run.overdrive.toFixed(1)}s · `
                    : ""}
                {run.kills} CLEARED ·{" "}
                {run.waveTime < 25
                  ? `${Math.ceil(25 - run.waveTime)}s TO NEXT PHASE`
                  : "FINISH THE ENCOUNTER"}
              </small>
            </div>
            <div className="move-hint">
              <kbd>W A S D</kbd>
              <span>MOVE / AUTO-AIM</span>
            </div>
            <div className="ability-buttons">
              <button
                onPointerDown={(e) => {
                  e.preventDefault();
                  act("dash");
                }}
                onClick={(e) => {
                  if (e.detail === 0) act("dash");
                }}
                disabled={paused || status !== "playing" || run.dashCd > 0}
              >
                <kbd>SPACE</kbd>
                <strong>
                  {run.dashCd > 0 ? `${run.dashCd.toFixed(1)}s` : "DASH ↗"}
                </strong>
              </button>
              <button
                onPointerDown={(e) => {
                  e.preventDefault();
                  act("skill");
                }}
                onClick={(e) => {
                  if (e.detail === 0) act("skill");
                }}
                disabled={paused || status !== "playing" || run.skillCd > 0}
              >
                <kbd>E</kbd>
                <strong>
                  {run.skillCd > 0
                    ? `${run.skillCd.toFixed(1)}s`
                    : run.pilot.skill.toUpperCase()}
                </strong>
              </button>
            </div>
          </div>
          <div className="touch-row">
            <div
              className="joystick"
              role="group"
              aria-label="Touch movement pad"
              onPointerDown={(e) => {
                if (
                  stickPointer.current !== null ||
                  paused ||
                  status !== "playing"
                )
                  return;
                stickPointer.current = e.pointerId;
                e.currentTarget.setPointerCapture(e.pointerId);
                joystick(e);
              }}
              onPointerMove={(e) => {
                if (stickPointer.current === e.pointerId) joystick(e);
              }}
              onPointerUp={(e) => {
                if (stickPointer.current === e.pointerId) {
                  clearInput();
                }
              }}
              onPointerCancel={clearInput}
              onLostPointerCapture={clearInput}
            >
              <span
                style={{ transform: `translate(${knob.x}px,${knob.y}px)` }}
              />
            </div>
            <p>
              Drag to move
              <br />
              Weapons fire automatically
            </p>
          </div>
          <section className="mindset-hud" aria-label="State of mind">
            <div>
              <strong style={{ color: run.trait?.color }}>{run.trait ? `${run.trait.name.toUpperCase()} / ${run.trait.title}` : "UNATTUNED / YOUR CHOICE IS AHEAD"}</strong>
              <span>{run.trait ? `${run.trait.description} ${run.trait.tradeoff}` : "All pilots can choose Sane or Insane. Neither path is forced."}</span>
            </div>
            <div className="strain-readout">
              <label htmlFor="signal-strain">SIGNAL STRAIN <b>{run.strain}/100</b></label>
              <meter id="signal-strain" min={0} max={100} value={run.strain}>{run.strain}</meter>
              <small>{run.attuned ? "RETUNE AVAILABLE NEXT ENCOUNTER" : "CHOOSE AT 0 / 100 OR ENCOUNTER CLEAR"}</small>
              <span>{run.strainEvent}</span>
            </div>
          </section>
        </main>
      )}
      {help && (
        <div className="overlay help-overlay">
          <section
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-title"
          >
            <span className="eyebrow">FIELD NOTES / 001</span>
            <h2 id="help-title">Keep your own frequency.</h2>
            <p>
              Survive six encounters. Defeat the Ferryman, the Choir, and the
              Aerial. Draft upgrades between encounters to build your playstyle.
            </p>
            <div className="help-grid">
              <p>
                <b>01 / MOVE</b>WASD, arrow keys, or the touch pad. Your weapon
                automatically targets nearby enemies.
              </p>
              <p>
                <b>02 / EVADE</b>Space or Dash. Brief invulnerability.
                Three-second recovery. Move away from marked circles before they
                fill.
              </p>
              <p>
                <b>03 / BREAK THROUGH</b>E or your skill button. Each pilot has
                a unique ability with its own cooldown.
              </p>
              <p>
                <b>04 / CHOOSE YOUR MINDSET</b>Damage (+20) and boss arrivals (+25)
                raise signal strain. Kills (−3; bosses −20), repairs (−12), and skills (−8)
                lower it. At 0 or 100, or after clearing an encounter, time stops:
                choose Sane protection or Insane weapon power with increased damage taken.
                Retune once per encounter. Traits replace each other and reset for a new run.
              </p>
            </div>
            <p className="muted">
              A fictional city, not a simulation of mental illness. Progress is
              saved on this device. Leaving a run ends it; your records remain.
              Your previous Endless saves are preserved.
            </p>
            <button
              className="primary"
              autoFocus
              onClick={() => setHelp(false)}
            >
              I’M READY ↗
            </button>
          </section>
        </div>
      )}
      {storageError && (
        <div className="storage-warning" role="status">
          Device storage is unavailable. This session remains playable, but
          records may not persist.
        </div>
      )}
      <footer className="site-footer">
        <span>PSYCHOSIS / SIGNAL LOST</span>
        <span>A LITTLE FURTHER INTO THE UNKNOWN.</span>
        <span>REBUILT FROM THE STATIC — V2.0</span>
      </footer>
    </div>
  );
}
