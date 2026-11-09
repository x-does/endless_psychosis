import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { advanceFlight, CAPTURE_RADIUS, LEGS, ORBIT_RADIUS, ORBIT_SPEED, orbitPoint, predictLaunch, tangent, TAU, type Point } from './gravity';
import './gravity.css';

type Session = {
  phase: 'intro' | 'orbit' | 'flight' | 'delivery' | 'complete';
  leg: number; angle: number; point: Point; direction: Point;
  deliveries: number; misses: number; paused: boolean; message: string; wait: number;
};
const fresh = (): Session => ({ phase: 'intro', leg: 0, angle: LEGS[0].startAngle, point: orbitPoint(LEGS[0].anchor, LEGS[0].startAngle), direction: { x: 0, y: 0 }, deliveries: 0, misses: 0, paused: false, message: 'Six small deliveries across a very big blue.', wait: 0 });

export default function Gravity() {
  const [session, setSession] = useState<Session>(fresh);
  const current = useRef(session);
  const [practice, setPractice] = useState(false);
  const glowId = useId().replace(/:/g, '');
  const update = useCallback((next: Session) => { current.current = next; setSession(next); }, []);
  const start = () => update({ ...fresh(), phase: 'orbit', message: 'Watch the dotted tangent. Launch when it reaches the destination.' });
  const launch = useCallback(() => {
    const s = current.current;
    if (s.phase !== 'orbit' || s.paused) return;
    update({ ...s, phase: 'flight', point: orbitPoint(LEGS[s.leg].anchor, s.angle), direction: tangent(s.angle), message: 'Special delivery, on its way…' });
  }, [update]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, a, button:not([data-gravity-launch])')) return;
      if (current.current.phase === 'orbit' && !current.current.paused) { event.preventDefault(); launch(); }
    };
    const onVisibility = () => {
      const s = current.current;
      if (document.hidden && s.phase !== 'intro' && s.phase !== 'complete') update({ ...s, paused: true, message: 'Paused while you were away. Resume when you’re ready.' });
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onVisibility);
    return () => { window.removeEventListener('keydown', onKey); document.removeEventListener('visibilitychange', onVisibility); };
  }, [launch, update]);

  useEffect(() => {
    let frame = 0;
    let previous = 0;
    const tick = (now: number) => {
      const dt = previous ? (now - previous) / 1000 : 0;
      previous = now;
      const s = current.current;
      if (!s.paused && s.phase === 'orbit') {
        const angle = (s.angle + ORBIT_SPEED * dt) % TAU;
        update({ ...s, angle, point: orbitPoint(LEGS[s.leg].anchor, angle) });
      } else if (!s.paused && s.phase === 'flight') {
        const result = advanceFlight(LEGS[s.leg], s.point, s.direction, dt);
        if (result.outcome === 'captured') {
          const deliveries = s.deliveries + 1;
          update({ ...s, point: result.point, deliveries, phase: deliveries === LEGS.length ? 'complete' : 'delivery', wait: 1.1, message: deliveries === LEGS.length ? 'Every little parcel found its planet.' : `Delivery ${deliveries} landed. A new orbit is waiting.` });
        } else if (result.outcome !== 'flying') {
          update({ ...s, phase: 'orbit', point: orbitPoint(LEGS[s.leg].anchor, s.angle), misses: s.misses + 1, message: result.outcome === 'collision' ? 'A moon got in the way. Back to your anchor — try again.' : 'A little wide. Back to your anchor — try again.' });
        } else update({ ...s, point: result.point });
      } else if (!s.paused && s.phase === 'delivery') {
        const wait = s.wait - dt;
        if (wait <= 0) {
          const leg = s.leg + 1;
          update({ ...s, leg, phase: 'orbit', angle: LEGS[leg].startAngle, point: orbitPoint(LEGS[leg].anchor, LEGS[leg].startAngle), message: LEGS[leg].hint });
        } else update({ ...s, wait });
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [update]);

  const leg = LEGS[session.leg];
  const prediction = predictLaunch(leg, session.angle);
  const ready = prediction.outcome === 'captured';
  const orbiting = session.phase === 'orbit';
  const from = orbitPoint(leg.anchor, session.angle);
  const direction = tangent(session.angle);
  const previewEnd = practice ? prediction.point : { x: from.x + direction.x * 82, y: from.y + direction.y * 82 };
  const overlay = session.phase === 'intro' || session.phase === 'complete' || session.paused;

  return <section className="gravity" aria-label="Borrowed Gravity game">
    <header className="gravity-heading"><div><p className="gravity-eyebrow">A tiny orbital delivery service</p><h1>Borrowed Gravity<span aria-hidden="true">✳</span></h1></div>
      {session.phase !== 'intro' && session.phase !== 'complete' && <button className="gravity-pause" onClick={() => update({ ...current.current, paused: !current.current.paused })}>{session.paused ? 'Resume' : 'Pause'}</button>}
    </header>
    <div className="gravity-score" aria-label={`${session.deliveries} of 6 deliveries, ${session.misses} misses`}>
      <span><strong>{String(session.deliveries).padStart(2, '0')}</strong> / 06 delivered</span><span><strong>{session.misses}</strong> {session.misses === 1 ? 'miss' : 'misses'}</span>
    </div>
    <div className="gravity-field">
      <svg viewBox="0 0 360 350" role="img" aria-label={`Route ${session.leg + 1}: ${leg.name}. Amber courier orbits the paper planet; deliver to the glowing ring.`}>
        <defs><radialGradient id={glowId}><stop offset="0" stopColor="#f9e7ac" stopOpacity=".3"/><stop offset="1" stopColor="#f9e7ac" stopOpacity="0"/></radialGradient></defs>
        {Array.from({ length: 25 }, (_, i) => <circle key={i} cx={15 + (i * 83) % 332} cy={15 + (i * 67) % 322} r={i % 3 === 0 ? 1.3 : 0.7} fill="#e7e3cc" opacity={i % 3 === 0 ? 0.5 : 0.25}/>)}
        <text x="18" y="25" className="gravity-map-label">SECTOR 0{session.leg + 1}</text>
        <circle cx={leg.destination.x} cy={leg.destination.y} r="58" fill={`url(#${glowId})`}/>
        <circle className={ready && orbiting ? 'gravity-capture gravity-capture-ready' : 'gravity-capture'} cx={leg.destination.x} cy={leg.destination.y} r={CAPTURE_RADIUS + 5}/>
        <circle cx={leg.destination.x} cy={leg.destination.y} r="24" fill="#f1e9d4"/>
        <path d={`M ${leg.destination.x - 7} ${leg.destination.y} h 14 m -7 -7 v 14`} stroke="#2945a6" strokeWidth="2"/>
        <text x={leg.destination.x} y={leg.destination.y + 55} textAnchor="middle" className="gravity-map-label">DELIVER HERE</text>
        {leg.obstacles.map((moon, i) => <g key={i}><circle cx={moon.x} cy={moon.y} r={moon.radius} fill="#152a75" stroke="#7b8dc2" strokeWidth="1.5"/><circle cx={moon.x - 6} cy={moon.y - 5} r="5" fill="#243d8b"/><circle cx={moon.x + 8} cy={moon.y + 7} r="3" fill="#243d8b"/></g>)}
        <circle cx={leg.anchor.x} cy={leg.anchor.y} r={ORBIT_RADIUS} className="gravity-orbit"/>
        <circle cx={leg.anchor.x} cy={leg.anchor.y} r="23" fill="#ece3cc"/>
        <ellipse cx={leg.anchor.x} cy={leg.anchor.y} rx="29" ry="8" fill="none" stroke="#bcbba8" strokeWidth="2" transform={`rotate(-28 ${leg.anchor.x} ${leg.anchor.y})`}/>
        {orbiting && <g className={ready ? 'gravity-path gravity-path-ready' : 'gravity-path'}><line x1={from.x} y1={from.y} x2={previewEnd.x} y2={previewEnd.y}/><circle cx={previewEnd.x} cy={previewEnd.y} r="2"/></g>}
        <circle cx={session.point.x} cy={session.point.y} r="10" fill="#ffc466" opacity=".14"/>
        <circle cx={session.point.x} cy={session.point.y} r="5" fill="#ffc466" stroke="#fff2d4" strokeWidth="1.5"/>
        {session.phase === 'delivery' && <text x="180" y="176" textAnchor="middle" className="gravity-delivered">DELIVERED ✓</text>}
      </svg>
      {overlay && <div className="gravity-overlay"><div className="gravity-panel">
        <p className="gravity-eyebrow">{session.paused ? 'Take a breath' : session.phase === 'complete' ? 'All parcels accounted for' : 'Borrow an orbit. Find your moment.'}</p>
        <h2>{session.paused ? 'Orbit on hold.' : session.phase === 'complete' ? 'Beautifully delivered.' : 'Let go at just the right time.'}</h2>
        <p>{session.paused ? 'Your courier is exactly where you left it.' : session.phase === 'complete' ? `Six planets reached, with ${session.misses} ${session.misses === 1 ? 'miss' : 'misses'} along the way. Every retry was part of the journey.` : 'You orbit automatically. Tap Launch when the dotted path points into the glowing destination. You fly straight from there.'}</p>
        {session.phase === 'intro' && <p className="gravity-panel-note">Six routes · unlimited retries · no rush<br/>Avoid dark moons. Misses return to your last anchor.</p>}
        <button className="gravity-primary" onClick={session.paused ? () => update({ ...current.current, paused: false, message: 'Back in orbit. Take your time.' }) : start}>{session.paused ? 'Resume orbit' : session.phase === 'complete' ? 'Deliver again ↗' : 'Start the route ↗'}</button>
      </div></div>}
    </div>
    <div className="gravity-route"><span>0{session.leg + 1} / 06</span><strong>{leg.name}</strong><div aria-hidden="true">{LEGS.map((_, i) => <i key={i} className={i < session.deliveries ? 'is-done' : i === session.leg ? 'is-current' : ''}/>)}</div></div>
    <p className="gravity-message" role="status" aria-live="polite">{session.message}</p>
    <div className="gravity-controls">
      <button data-gravity-launch className={`gravity-launch${ready && orbiting ? ' is-ready' : ''}`} disabled={!orbiting || session.paused} onPointerDown={event => { if (event.button === 0) { event.preventDefault(); launch(); } }} onClick={event => { if (event.detail === 0) launch(); }}>
        <span>{session.phase === 'flight' ? 'In flight…' : session.phase === 'delivery' ? 'Parcel delivered ✓' : 'Launch courier ↗'}</span><small>{ready && orbiting ? 'Clear path to destination' : 'Tap or press Space'}</small>
      </button>
      <label className="gravity-practice"><input type="checkbox" checked={practice} onChange={event => setPractice(event.target.checked)}/> Show full practice path</label>
    </div>
  </section>;
}
