import { useCallback, useEffect, useRef, useState } from 'react';
import { CAPTURE_RADIUS, HOLD_SECONDS, ORBIT_RADIUS, ORBIT_SPEED, REVEAL_MAX, TAU, chamberAt, freshSession, press, release, stepSession, tangent, type Point, type Session } from './gravity';
import './gravity.css';

function Anchor({ point, real, revealed }: { point: Point; real: boolean; revealed: boolean }) {
  return <g transform={`translate(${point.x} ${point.y})`} className={`gravity-anchor${revealed ? ' is-revealed' : ''}`}>
    {real ? <><circle r={CAPTURE_RADIUS}/><path d={`M -12 ${-CAPTURE_RADIUS} v 9 M 12 ${-CAPTURE_RADIUS} v 9`}/><circle r="12" className="gravity-anchor-core"/></>
      : <><circle cx="4" cy="-3" r={CAPTURE_RADIUS} strokeDasharray="185 67" transform="rotate(28)"/><path d={`M 0 ${-CAPTURE_RADIUS - 3} v 10`}/><circle cx="4" cy="-3" r="12" strokeDasharray="25 50"/></>}
  </g>;
}

export default function Gravity() {
  const [session, setSession] = useState<Session>(() => freshSession());
  const current = useRef(session);
  const clock = useRef<number | null>(null);
  const pointer = useRef<number | null>(null);
  const lastRelease = useRef(-Infinity);
  const update = useCallback((next: Session) => { current.current = next; setSession(next); }, []);
  // Events and animation share one clock: a release cannot race the hold threshold.
  const synchronize = useCallback(() => {
    const now = performance.now();
    const next = stepSession(current.current, clock.current === null ? 0 : (now - clock.current) / 1000);
    clock.current = now;
    return next;
  }, []);
  const down = useCallback(() => update(press(synchronize())), [synchronize, update]);
  const up = useCallback(() => { lastRelease.current = performance.now(); update(release(synchronize())); }, [synchronize, update]);
  const pause = useCallback(() => {
    const s = synchronize();
    update({ ...s, held: null, paused: !s.paused });
  }, [synchronize, update]);

  useEffect(() => {
    let frame = 0;
    const tick = () => { update(synchronize()); frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick);
    const onDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.code !== 'Enter') return;
      if ((e.target as HTMLElement)?.closest('input, textarea, select, a, button:not([data-gravity-launch])')) return;
      if (e.altKey || e.metaKey || e.ctrlKey) return;
      e.preventDefault();
      if (!e.repeat) down();
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.code !== 'Enter') return;
      if (current.current.held !== null) { e.preventDefault(); up(); }
    };
    const suspend = () => {
      const s = synchronize();
      if (s.phase === 'orbit' || s.phase === 'flight') update({ ...s, paused: true, held: null });
    };
    const visibility = () => { if (document.hidden) suspend(); };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', suspend);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', suspend);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [down, up, synchronize, update]);

  const chamber = chamberAt(session.depth);
  const orbiting = session.phase === 'orbit';
  const revealing = session.held !== null && session.held >= HOLD_SECONDS && session.reveal > 0;
  const direction = tangent(session.angle);
  const overlay = session.phase === 'intro' || session.phase === 'ended' || session.paused;
  const start = () => { clock.current = performance.now(); update(freshSession(true)); };

  return <section className="gravity" aria-label="Endless Psychosis: False Orbit">
    <header className="gravity-heading"><div><p className="gravity-eyebrow">ENDLESS PSYCHOSIS</p><h1>FALSE ORBIT</h1></div>
      {session.phase !== 'intro' && session.phase !== 'ended' && <button className="gravity-pause" onClick={pause}>{session.paused ? 'Resume' : 'Pause'}</button>}
    </header>
    <div className="gravity-score"><span>DEPTH <strong>{String(session.depth + 1).padStart(3, '0')}</strong></span><span>CAPTURES <strong>{session.score}</strong></span><span>TETHERS <strong>{session.tethers}/3</strong></span></div>
    <div className={`gravity-field${revealing ? ' is-revealing' : ''}`}>
      <svg viewBox="0 0 360 350" role="img" aria-label={`Chamber ${session.depth + 1}, ${chamber.name}. Real anchor: two attached notches. Phantom: one notch and broken offset ring. Dashed path is the previous capture, not a target.`}>
        <defs><pattern id="false-orbit-scratches" width="37" height="43" patternUnits="userSpaceOnUse"><path d="M2 8h11 M30 29h5 M19 39h2" stroke="currentColor" strokeWidth=".5"/></pattern></defs>
        <rect width="360" height="350" fill="url(#false-orbit-scratches)" opacity=".2"/>
        <path d="M180 0v350 M0 175h360" className="gravity-grid"/>
        <text x="13" y="21" className="gravity-map-label">MASS REGISTER / {String(session.depth + 1).padStart(3, '0')}</text>
        <text x="13" y="337" className="gravity-map-label">{revealing ? 'EXPOSURE / CLOCK ARRESTED' : 'OBSERVATION IS NOT EVIDENCE'}</text>
        {session.ghost && <g className="gravity-ghost"><line x1={session.ghost.from.x} y1={session.ghost.from.y} x2={session.ghost.to.x} y2={session.ghost.to.y}/><circle cx={session.ghost.imprint.x} cy={session.ghost.imprint.y} r="31" strokeDasharray="4 9"/><text x={session.ghost.from.x} y={session.ghost.from.y - 12}>PREVIOUS / NOT MASS</text></g>}
        {chamber.phantoms.map((point, i) => <Anchor key={i} point={point} real={false} revealed={revealing}/>)}
        <Anchor point={chamber.destination} real revealed={revealing}/>
        {chamber.obstacles.map((body, i) => <g key={i} className="gravity-debris"><circle cx={body.x} cy={body.y} r={body.radius}/><path d={`M${body.x - 8} ${body.y - 8}l16 16 m0 -16l-16 16`}/></g>)}
        <circle cx={chamber.anchor.x} cy={chamber.anchor.y} r={ORBIT_RADIUS} className="gravity-orbit"/>
        <circle cx={chamber.anchor.x} cy={chamber.anchor.y} r="14" className="gravity-source"/>
        <path d={`M${chamber.anchor.x - 20} ${chamber.anchor.y}h40 M${chamber.anchor.x} ${chamber.anchor.y - 20}v40`} className="gravity-grid"/>
        {orbiting && <line className="gravity-path" x1={session.point.x} y1={session.point.y} x2={session.point.x + direction.x * 120} y2={session.point.y + direction.y * 120}/>}
        {session.phase === 'ended' && session.failure && <line className="gravity-failure" x1={session.failure.from.x} y1={session.failure.from.y} x2={session.failure.to.x} y2={session.failure.to.y}/>}
        <circle cx={session.point.x} cy={session.point.y} r="5" className="gravity-body"/>
      </svg>
      {overlay && <div className="gravity-overlay"><div className="gravity-panel">
        <p className="gravity-eyebrow">{session.paused ? 'INSTRUMENT SUSPENDED' : session.phase === 'ended' ? 'FINAL OBSERVATION' : 'THERE IS NO FINAL CHAMBER'}</p>
        <h2>{session.paused ? 'Nothing moves.' : session.phase === 'ended' ? 'The tether was real.' : 'Do not trust the circle.'}</h2>
        {session.paused ? <p>Orbit, flight, exposure and collapse clock are frozen. Resume manually.</p> : session.phase === 'ended' ? <><p>{session.failure?.reason}</p>
          <svg className="gravity-snapshot" viewBox="0 0 360 350" role="img" aria-label="Final chamber snapshot. Amber dashed line shows the failed trajectory; double notches identify the real anchor.">
            {chamber.phantoms.map((point, i) => <Anchor key={i} point={point} real={false} revealed={false}/>)}
            <Anchor point={chamber.destination} real revealed={false}/>
            {chamber.obstacles.map((body, i) => <circle key={i} className="gravity-debris" cx={body.x} cy={body.y} r={body.radius}/>)}
            <circle className="gravity-orbit" cx={chamber.anchor.x} cy={chamber.anchor.y} r={ORBIT_RADIUS}/>
            {session.failure && <line className="gravity-failure" x1={session.failure.from.x} y1={session.failure.from.y} x2={session.failure.to.x} y2={session.failure.to.y}/>}
            <circle className="gravity-body" cx={session.point.x} cy={session.point.y} r="5"/>
          </svg><p>Depth {session.depth + 1} · {session.score} captures. Dashed amber: final path. All three tethers severed.</p></> : <>
          <p>Orbit is automatic. <b>Tap and release to launch.</b> Hold ¼ second to reveal: orbit and clock freeze. Release a hold without launching.</p>
          <p><b>Real: two attached notches.</b> Phantom: one notch, broken offset ring. Fly through phantoms; they never catch you. Dashed afterimages are old paths.</p>
          <p>Debris, escape or two revolutions cost a tether. Three tethers. Captures restore exposure. Depth never ends.</p>
        </>}
        <button className="gravity-primary" onClick={session.paused ? pause : start}>{session.paused ? 'Resume observation' : session.phase === 'ended' ? 'Retry / new observation' : 'Enter the instrument'}</button>
      </div></div>}
    </div>
    <div className="gravity-route"><span>{chamber.name}</span><span>{Math.max(0, (2 * TAU / ORBIT_SPEED - session.orbitElapsed)).toFixed(1)}s to collapse</span></div>
    <div className="gravity-exposure"><label htmlFor="gravity-exposure">EXPOSURE {session.reveal.toFixed(1)}s / 1.2s</label><meter id="gravity-exposure" min="0" max={REVEAL_MAX} value={session.reveal}/></div>
    <p className="gravity-message" role="status">{session.message}</p>
    <button data-gravity-launch className="gravity-launch" disabled={!orbiting || session.paused}
      onPointerDown={event => { if (event.button === 0 && pointer.current === null) { event.preventDefault(); pointer.current = event.pointerId; event.currentTarget.setPointerCapture(event.pointerId); down(); } }}
      onPointerUp={event => { if (event.pointerId === pointer.current) { event.preventDefault(); pointer.current = null; up(); } }}
      onPointerCancel={event => { if (pointer.current === event.pointerId) { pointer.current = null; update({ ...synchronize(), held: null }); } }}
      onLostPointerCapture={event => { if (pointer.current === event.pointerId) { pointer.current = null; update({ ...synchronize(), held: null }); } }}
      onContextMenu={event => event.preventDefault()}
      onClick={event => { if (event.detail === 0 && current.current.held === null && performance.now() - lastRelease.current > 100) update(release(press(synchronize()))); }}>
      <span>{session.phase === 'flight' ? 'TRAJECTORY COMMITTED' : revealing ? 'REVEAL / CLOCK FROZEN' : session.held !== null && session.held >= HOLD_SECONDS ? 'EXPOSURE EXHAUSTED' : 'TAP TO LAUNCH / HOLD TO REVEAL'}</span>
      <small>Release a short press to launch · hold release never launches · Space / Enter</small>
    </button>
    <p className="gravity-legend">Ⅱ attached = real · broken / offset = phantom · × = debris</p>
  </section>;
}
