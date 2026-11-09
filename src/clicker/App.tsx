import { useEffect, useRef, useState } from 'react';
import Character from './Character';
import { UPGRADES, buyUpgrade, canRebirth, loadGame, rebirth, serializeGame, settleGame, stage, stats, tap, upgradeCost, type GameState } from './model';
import './styles.css';
import './character.css';

const SAVE_KEY = 'endless.clicker.v1';
const headlines = ['Your screen-time report has requested a wellness day.', 'Breaking: local person experiences an unmonetized thought.', 'AI assistant hires AI assistant. Both report burnout.', 'Rent is up. Vibes remain unregulated.', 'Your fridge has updated its privacy policy.', 'Congratulations! You have been promoted to a bigger inbox.'];
const formats = [new Intl.NumberFormat('en', { maximumFractionDigits: 1 }), new Intl.NumberFormat('en', { maximumFractionDigits: 0 }), new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 0 })];
const fmt = (n: number) => formats[n >= 10000 ? 2 : n < 10 ? 0 : 1].format(n);

function RebirthDialog({ onConfirm, onClose }: { onConfirm: () => void; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const element = dialog.current!; element.showModal(); return () => element.close(); }, []);
  return <dialog ref={dialog} className="ep-modal" aria-labelledby="loop-title" onCancel={onClose}><h2 id="loop-title">Another day, another you.</h2><p>Reset your focus, upgrades and clarity for a permanent echo bonus. Your lifetime record stays with you.</p><button className="ep-primary" autoFocus onClick={onConfirm}>Let go & begin again</button><button className="ep-secondary" onClick={onClose}>Stay in this loop</button></dialog>;
}

export default function App() {
  const [initial] = useState(() => { try { return loadGame(localStorage.getItem(SAVE_KEY)); } catch { return loadGame(null); } });
  const [game, setGame] = useState(initial.state);
  const current = useRef(game);
  const owner = useRef(false);
  const persistent = useRef(false);
  const [active, setActive] = useState(false);
  function update(transform: (state: GameState) => GameState) {
    if (!owner.current) return;
    const next = transform(settleGame(current.current));
    current.current = next;
    setGame(next);
  }
  const [tab, setTab] = useState<'upgrades' | 'journal' | 'settings'>('upgrades');
  const [pulse, setPulse] = useState(0);
  const [notice, setNotice] = useState(initial.offlineFocus > 0 ? `While you were offline: +${fmt(initial.offlineFocus)} focus. Even your existential crisis works remotely.` : 'Tap your character. Collect focus. Become slightly less online.');
  const [storageOk, setStorageOk] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [confirmRebirth, setConfirmRebirth] = useState(false);
  const [headline, setHeadline] = useState(0);
  const live = stats(game);
  const phase = stage(game.clarity);
  const bought = Object.values(game.upgrades).reduce((a, b) => a + b, 0);
  function save() {
    if (!owner.current || !persistent.current) return;
    try {
      const settled = settleGame(current.current);
      current.current = settled;
      localStorage.setItem(SAVE_KEY, serializeGame(settled, settled.lastSaved));
      setStorageOk(true);
    } catch { setStorageOk(false); }
  }
  useEffect(() => {
    let release: (() => void) | undefined;
    let disposed = false;
    const acquire = () => {
      if (disposed) return;
      try { const loaded = loadGame(localStorage.getItem(SAVE_KEY)); current.current = loaded.state; setGame(loaded.state); } catch { /* Device storage may be disabled. */ }
      owner.current = true; setActive(true);
    };
    if (navigator.locks) {
      void navigator.locks.request('endless.clicker.writer', { ifAvailable: true }, async lock => {
        if (!lock || disposed) return;
        persistent.current = true;
        acquire();
        save();
        await new Promise<void>(resolve => { release = resolve; });
      }).catch(() => { if (!disposed) { persistent.current = false; acquire(); setStorageOk(false); } });
    } else acquire();
    const changed = (event: StorageEvent) => { if (event.key === SAVE_KEY && owner.current) { owner.current = false; setActive(false); } };
    window.addEventListener('storage', changed);
    return () => { disposed = true; save(); owner.current = false; persistent.current = false; release?.(); window.removeEventListener('storage', changed); };
  }, []);
  useEffect(() => {
    const timer = window.setInterval(() => { if (!document.hidden) update(g => g); }, 250);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const timer = window.setInterval(save, 3000);
    const hidden = () => { if (document.hidden) save(); };
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('pagehide', save);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', hidden); window.removeEventListener('pagehide', save); save(); };
  }, []);
  useEffect(() => { const timer = window.setInterval(() => { if (!document.hidden && owner.current) setHeadline(h => (h + 1) % headlines.length); }, 15000); return () => clearInterval(timer); }, []);
  function buy(id: string) {
    if (!owner.current) return;
    const item = UPGRADES.find(u => u.id === id)!;
    if (current.current.focus < upgradeCost(current.current, id)) return;
    update(g => buyUpgrade(g, id));
    setNotice(`${item.name} acquired. ${item.appearance}`);
  }
  return <div className={`ep-app ${reducedMotion ? 'ep-still' : ''}`}>
    <header className="ep-header"><a className="ep-brand" href="/" aria-label="Endless Psychosis home"><span className="ep-logo">e<span>p</span><i /></span><span>ENDLESS<span>PSYCHOSIS</span></span></a><div className="ep-status"><i /> EXISTING, MOSTLY <span>v.2026</span></div></header>
    <main>
      {active && !persistent.current && <p className="ep-session" role="status">Session-only mode: this browser cannot safely coordinate saves between tabs. Play in a current browser over HTTPS to enable persistent progress. Existing saves are preserved.</p>}
      {!active && <p className="ep-session" role="status">This session is paused. Close the other game tab, then reload here to continue safely.</p>}
      <div className="ep-intro"><div><p className="ep-eyebrow">A LITTLE CHAOS. A LITTLE CLARITY.</p><h1>It's all in your <em>head.</em></h1><p>A tiny incremental game about being a person. In this economy.</p></div><span className="ep-loop">↻ <b>LOOP {game.loop + 1}</b><span>{game.echoes} echoes carried</span></span></div>
      <section className="ep-stats" aria-label="Your resources"><div className="ep-focus"><span className="ep-stat-label">✳ FOCUS</span><strong>{fmt(game.focus)}</strong><span>The one currency you can't buy. Yet.</span></div><div><span className="ep-stat-label">PER TAP</span><strong>+{fmt(live.perTap)}</strong><span>manual coping</span></div><div><span className="ep-stat-label">PER SECOND</span><strong>+{fmt(live.perSecond)}</strong><span>automated existence</span></div></section>
      <div className="ep-layout"><section className="ep-being" aria-label="Your character">
        <div className="ep-panel-top"><span><i /> SUBJECT: YOU</span><span>DAY 001 → ∞</span></div>
        <div className="ep-stage"><span className="ep-pill">{phase.name}</span><p>{phase.description}</p></div>
        <button className="ep-tap" disabled={!active} onClick={() => { update(tap); setPulse(p => p + 1); }} aria-label={`Gather ${fmt(live.perTap)} focus. Tap your character.`}><Character clarity={game.clarity} upgrades={game.upgrades} pulse={pulse} reducedMotion={reducedMotion} /><span className="ep-tap-prompt">TAP TO GET IT TOGETHER <span>+{fmt(live.perTap)} ✳</span></span></button>
        <div className="ep-clarity"><div><span>YOUR STATE OF MIND</span><b>{Math.round(game.clarity)}% clarity</b></div><div className="ep-meter" role="progressbar" aria-label="Clarity" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(game.clarity)}><i style={{ width: `${game.clarity}%` }} /></div><div><span>◌ BEAUTIFUL CHAOS</span><span>INNER PEACE ☼</span></div><p>{live.clarityPerSecond >= 0 ? '↗' : '↘'} {Math.abs(live.clarityPerSecond).toFixed(2)} clarity / sec · Both ends have their perks.</p></div>
        <div className="ep-notice" role="status">✦ <span>{notice}</span></div>
      </section><section className="ep-workbench" aria-label="Your choices">
        <nav className="ep-tabs" aria-label="Game panels">{(['upgrades', 'journal', 'settings'] as const).map(t => <button key={t} onClick={() => setTab(t)} aria-current={tab === t ? 'page' : undefined}>{t === 'upgrades' ? '↗ Life upgrades' : t === 'journal' ? '≋ Field notes' : '⚙ Settings'}{t === 'upgrades' && <span>{bought}</span>}</button>)}</nav>
        {tab === 'upgrades' && <><div className="ep-section-heading"><div><h2>Better living. Side effects included.</h2><p>Every fix is a new problem with better branding.</p></div><span>✳ FOCUS</span></div><p className="ep-fine">Tap income = base ÷ (1 + total tap drag), then clarity and echo bonuses apply. All rates below are per level, before bonuses.</p><div className="ep-upgrades">{UPGRADES.map((u, index) => { const cost = upgradeCost(game, u.id); const owned = game.upgrades[u.id] || 0; return <article className={`ep-upgrade ${game.focus >= cost ? 'ep-affordable' : ''}`} key={u.id}><span className={`ep-upgrade-icon ep-color-${index % 4}`} aria-hidden="true">{u.icon}</span><div className="ep-upgrade-copy"><div><h3>{u.name}</h3><span>LV {owned}</span></div><p>{u.tagline}</p><div className="ep-tradeoff"><span>{u.benefit}</span><span>{u.costText}</span></div><small>◈ {u.appearance}</small></div><button onClick={() => buy(u.id)} disabled={!active || game.focus < cost} aria-label={`Buy ${u.name}, ${fmt(cost)} focus`}><span>✳ {Number.isFinite(cost) ? fmt(cost) : 'MAX'}</span><small>{!Number.isFinite(cost) ? 'MAX LEVEL' : game.focus >= cost ? 'UPGRADE ↗' : 'SAVE UP'}</small></button></article>; })}</div><p className="ep-shop-foot">NO MICROTRANSACTIONS. ONLY MACRO EXISTENTIAL QUESTIONS.</p></>}
        {tab === 'journal' && <div className="ep-notes"><p className="ep-eyebrow">NOTES FROM THE HUMAN EXPERIMENT</p><h2>You are a work in progress.</h2><p>Tap yourself to collect focus. Buy questionable life improvements to earn it automatically. Each one changes your appearance and pulls your clarity in a different direction.</p><p>Chaos boosts your taps. Clarity makes your passive income more effective. There is no perfect build, only a slightly more interesting Tuesday.</p><div className="ep-records"><span>Total focus earned <b>{fmt(game.lifetimeFocus)}</b></span><span>Intentional taps <b>{fmt(game.taps)}</b></span><span>Questionable decisions <b>{bought}</b></span><span>Echoes <b>{game.echoes} · +{game.echoes * 25}% income</b></span></div><h3>Let go. Start again.</h3><p>Earn {fmt(Math.min(1e15, 140000 * 3 ** game.loop))} lifetime focus to start a new loop. At the currency limit, fill your wallet instead. Your focus, upgrades and clarity reset; each echo adds 25% to income.</p><button className="ep-primary" disabled={!canRebirth(game)} onClick={() => setConfirmRebirth(true)}>↻ {canRebirth(game) ? 'Begin a new loop' : 'Keep growing to unlock a new loop'}</button><p className="ep-fine">A fictional satire of digital life. Enlightenment is not a productivity metric. The app insists otherwise.</p></div>}
        {tab === 'settings' && <div className="ep-notes"><p className="ep-eyebrow">YOUR TERMS & CONDITIONS</p><h2>A little less stimulation.</h2><label className="ep-setting"><span><b>Reduced motion</b><small>Keep the existential dread stationary.</small></span><input type="checkbox" checked={reducedMotion} onChange={e => setReducedMotion(e.target.checked)} /></label><div className="ep-save-status"><b>{!active ? 'Session paused' : storageOk ? '✓ Saved on this device' : 'Session-only progress'}</b><p>{!active ? 'Another tab owns this save. Close it and reload this page to continue.' : storageOk ? 'Progress saves every 3 seconds. Offline earnings cover up to 4 hours. This clicker uses a separate save from previous games.' : !persistent.current ? 'Safe save coordination is unavailable in this browser. No stored saves are overwritten. Keep this page open, or use a current browser over HTTPS.' : 'Device storage is unavailable. Keep this page open to retain the current session.'}</p></div><h3>The fine print, for once.</h3><p>No accounts. No ads. No paid shortcuts. Your attention is already expensive enough.</p><p>Keep using the same browser to continue your game. Existing production cloud saves remain preserved.</p></div>}
      </section></div>
      <aside className="ep-ticker"><span>THE DAILY SPIRAL</span><p>{headlines[headline]}</p><b>2026 © REALITY™</b></aside><footer className="ep-footer"><span>ENDLESS PSYCHOSIS</span><p>Find your balance. Lose it. Find a slightly different one.</p><span>MADE FOR YOUR THUMBS & YOUR THOUGHTS</span></footer>
    </main>
    {confirmRebirth && <RebirthDialog onClose={() => setConfirmRebirth(false)} onConfirm={() => { update(rebirth); setConfirmRebirth(false); setNotice('New loop. Same universe. A little more perspective.'); }} />}
  </div>;
}
