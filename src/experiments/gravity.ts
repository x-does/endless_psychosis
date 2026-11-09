/** All distances are in the SVG's 360 × 350 world, independent of device pixels. */
export type Point = { x: number; y: number };
export type Circle = Point & { radius: number };
export type Chamber = { name: string; anchor: Point; destination: Point; phantoms: Point[]; obstacles: Circle[]; startAngle: number };
export const WORLD = { width: 360, height: 350 };
export const BODY_RADIUS = 5;
export const ORBIT_RADIUS = 36;
export const CAPTURE_RADIUS = 40;
export const ORBIT_SPEED = 0.45;
export const FLIGHT_SPEED = 215;
export const TAU = Math.PI * 2;

export const CHAMBERS: readonly Chamber[] = [
  { name: 'Parallax wound', anchor: { x: 88, y: 246 }, destination: { x: 266, y: 102 }, phantoms: [{ x: 105, y: 92 }], obstacles: [], startAngle: .3 },
  { name: 'The second witness', anchor: { x: 275, y: 235 }, destination: { x: 86, y: 91 }, phantoms: [{ x: 93, y: 250 }], obstacles: [], startAngle: 1.4 },
  { name: 'Occluded mass', anchor: { x: 80, y: 254 }, destination: { x: 273, y: 88 }, phantoms: [{ x: 100, y: 85 }], obstacles: [{ x: 213, y: 231, radius: 23 }], startAngle: 2.8 },
  { name: 'Inverted instrument', anchor: { x: 96, y: 96 }, destination: { x: 264, y: 258 }, phantoms: [{ x: 260, y: 90 }], obstacles: [{ x: 119, y: 234, radius: 25 }], startAngle: 4.1 },
  { name: 'Unregistered body', anchor: { x: 273, y: 99 }, destination: { x: 85, y: 255 }, phantoms: [{ x: 92, y: 90 }], obstacles: [{ x: 245, y: 247, radius: 24 }], startAngle: 5.1 },
  { name: 'No outer edge', anchor: { x: 78, y: 178 }, destination: { x: 283, y: 173 }, phantoms: [{ x: 245, y: 66 }], obstacles: [{ x: 177, y: 75, radius: 24 }, { x: 169, y: 283, radius: 27 }], startAngle: .8 },
];

/** Endless sequencing of authored, validated geometry; never increases speed or density. */
export function chamberAt(depth: number): Chamber {
  const base = CHAMBERS[depth % CHAMBERS.length];
  const turn = Math.floor(depth / CHAMBERS.length) % 2 === 1;
  const map = (p: Point): Point => turn ? { x: WORLD.width - p.x, y: WORLD.height - p.y } : { ...p };
  return { ...base, anchor: map(base.anchor), destination: map(base.destination), phantoms: base.phantoms.map(map), obstacles: base.obstacles.map(p => ({ ...map(p), radius: p.radius })), startAngle: base.startAngle + (turn ? Math.PI : 0) };
}

export function orbitPoint(anchor: Point, angle: number): Point {
  return { x: anchor.x + Math.cos(angle) * ORBIT_RADIUS, y: anchor.y + Math.sin(angle) * ORBIT_RADIUS };
}
export function tangent(angle: number): Point {
  return { x: -Math.sin(angle), y: Math.cos(angle) };
}

/** Earliest segment/circle intersection, including a start already inside. */
export function segmentCircleTime(from: Point, to: Point, circle: Circle): number | null {
  const dx = to.x - from.x, dy = to.y - from.y;
  const ox = from.x - circle.x, oy = from.y - circle.y;
  const c = ox * ox + oy * oy - circle.radius * circle.radius;
  if (c <= 0) return 0;
  const a = dx * dx + dy * dy;
  if (a === 0) return null;
  const b = 2 * (ox * dx + oy * dy);
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;
  const t = (-b - Math.sqrt(discriminant)) / (2 * a);
  return t >= 0 && t <= 1 ? t : null;
}

export type FlightResult = { point: Point; outcome: 'flying' | 'captured' | 'collision' | 'escaped'; fraction: number };
/** Sweep the entire movement, resolving the FIRST event (never endpoint-only). */
export function advanceFlight(leg: Chamber, from: Point, direction: Point, seconds: number): FlightResult {
  const to = { x: from.x + direction.x * FLIGHT_SPEED * seconds, y: from.y + direction.y * FLIGHT_SPEED * seconds };
  let fraction = 1;
  let outcome: FlightResult['outcome'] = 'flying';
  const consider = (t: number | null, kind: FlightResult['outcome']) => {
    if (t !== null && t >= 0 && t <= fraction) { fraction = t; outcome = kind; }
  };
  consider(segmentCircleTime(from, to, { ...leg.destination, radius: CAPTURE_RADIUS + BODY_RADIUS }), 'captured');
  for (const obstacle of leg.obstacles) {
    consider(segmentCircleTime(from, to, { ...obstacle, radius: obstacle.radius + BODY_RADIUS }), 'collision');
  }
  const dx = to.x - from.x, dy = to.y - from.y;
  if (to.x < BODY_RADIUS && dx < 0) consider((BODY_RADIUS - from.x) / dx, 'escaped');
  if (to.x > WORLD.width - BODY_RADIUS && dx > 0) consider((WORLD.width - BODY_RADIUS - from.x) / dx, 'escaped');
  if (to.y < BODY_RADIUS && dy < 0) consider((BODY_RADIUS - from.y) / dy, 'escaped');
  if (to.y > WORLD.height - BODY_RADIUS && dy > 0) consider((WORLD.height - BODY_RADIUS - from.y) / dy, 'escaped');
  return { point: { x: from.x + dx * fraction, y: from.y + dy * fraction }, outcome, fraction };
}

export function predictLaunch(leg: Chamber, angle: number): FlightResult {
  return advanceFlight(leg, orbitPoint(leg.anchor, angle), tangent(angle), 10);
}

/** Sampling is for authoring/tests only; play uses exact swept intersections. */
export function measureLaunchWindows(leg: Chamber, samples = 7200): { totalSeconds: number; widestSeconds: number } {
  const hits = Array.from({ length: samples }, (_, i) => predictLaunch(leg, i * TAU / samples).outcome === 'captured');
  let longest = 0, run = 0;
  for (let i = 0; i < samples * 2; i++) {
    run = hits[i % samples] ? Math.min(run + 1, samples) : 0;
    longest = Math.max(longest, run);
  }
  return { totalSeconds: hits.filter(Boolean).length * TAU / samples / ORBIT_SPEED, widestSeconds: longest * TAU / samples / ORBIT_SPEED };
}

export const HOLD_SECONDS = .25;
export const REVEAL_MAX = 1.2;
export type Session = {
  phase: 'intro' | 'orbit' | 'flight' | 'ended'; depth: number; score: number; tethers: number;
  angle: number; orbitElapsed: number; point: Point; direction: Point; launchFrom: Point;
  ghost: { from: Point; to: Point; imprint: Point } | null;
  paused: boolean; held: number | null; reveal: number; message: string;
  failure: { from: Point; to: Point; reason: string } | null;
};
export function freshSession(start = false): Session {
  const c = chamberAt(0), point = orbitPoint(c.anchor, c.startAngle);
  return { phase: start ? 'orbit' : 'intro', depth: 0, score: 0, tethers: 3, angle: c.startAngle, orbitElapsed: 0, point, direction: { x: 0, y: 0 }, launchFrom: point, ghost: null, paused: false, held: null, reveal: REVEAL_MAX, message: 'Two attached notches hold mass. The broken ring holds nothing.', failure: null };
}
export function press(s: Session): Session {
  return s.phase === 'orbit' && !s.paused && s.held === null ? { ...s, held: 0 } : s;
}
export function release(s: Session): Session {
  if (s.held === null) return s;
  if (s.paused || s.phase !== 'orbit' || s.held >= HOLD_SECONDS) return { ...s, held: null };
  return { ...s, held: null, phase: 'flight', launchFrom: s.point, direction: tangent(s.angle), message: 'No correction. What you believed is now a trajectory.' };
}
export function fail(s: Session, reason: string): Session {
  const c = chamberAt(s.depth), tethers = s.tethers - 1;
  const failure = { from: s.phase === 'flight' ? s.launchFrom : c.anchor, to: s.point, reason };
  return { ...s, tethers, phase: tethers ? 'orbit' : 'ended', angle: c.startAngle, orbitElapsed: 0,
    point: tethers ? orbitPoint(c.anchor, c.startAngle) : s.point, held: null, failure,
    message: `${reason} One tether severed.${tethers ? ' Same chamber. Phase reset.' : ' No tethers remain.'}` };
}
/** Pure simulation. Reveal freezes both orbit and its collapse clock, including partial frames. */
export function stepSession(s: Session, seconds: number): Session {
  if (s.paused || s.phase === 'intro' || s.phase === 'ended' || seconds <= 0) return s;
  const c = chamberAt(s.depth);
  if (s.phase === 'flight') {
    const result = advanceFlight(c, s.point, s.direction, seconds);
    if (result.outcome === 'captured') {
      const next = chamberAt(s.depth + 1);
      return { ...s, depth: s.depth + 1, score: s.score + 1, phase: 'orbit', angle: next.startAngle,
        orbitElapsed: 0, point: orbitPoint(next.anchor, next.startAngle), held: null,
        reveal: Math.min(REVEAL_MAX, s.reveal + .6), failure: null,
        ghost: { from: s.launchFrom, to: result.point, imprint: c.destination }, message: 'Capture recorded once. The previous certainty remains as an afterimage.' };
    }
    const next = { ...s, point: result.point };
    return result.outcome === 'flying' ? next : fail(next, result.outcome === 'collision' ? 'Debris intercepted the body.' : 'The trajectory left the instrument. Phantom rings cannot catch you.');
  }
  const held = s.held === null ? null : s.held + seconds;
  const revealTime = held === null ? 0 : Math.min(s.reveal, Math.max(0, held - Math.max(HOLD_SECONDS, s.held ?? 0)));
  const active = seconds - revealTime;
  const angle = s.angle + ORBIT_SPEED * active;
  const next = { ...s, held, reveal: Math.max(0, s.reveal - revealTime), angle, orbitElapsed: s.orbitElapsed + active, point: orbitPoint(c.anchor, angle) };
  return next.orbitElapsed >= 2 * TAU / ORBIT_SPEED ? fail(next, 'Two revolutions without capture. Orbit collapsed.') : next;
}
