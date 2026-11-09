/** All distances are in the SVG's 360 × 350 world, independent of device pixels. */
export type Point = { x: number; y: number };
export type Circle = Point & { radius: number };
export type Leg = { name: string; hint: string; anchor: Point; destination: Point; obstacles: Circle[]; startAngle: number };
export const WORLD = { width: 360, height: 350 };
export const COURIER_RADIUS = 5;
export const ORBIT_RADIUS = 36;
export const CAPTURE_RADIUS = 35;
export const ORBIT_SPEED = 0.9;
export const FLIGHT_SPEED = 215;
export const TAU = Math.PI * 2;

export const LEGS: readonly Leg[] = [
  { name: 'First light', hint: 'Your path leaves sideways. Watch the dotted line.', anchor: { x: 88, y: 246 }, destination: { x: 266, y: 102 }, obstacles: [], startAngle: 0.3 },
  { name: 'Across the blue', hint: 'Wait for the path to touch the glowing ring.', anchor: { x: 275, y: 235 }, destination: { x: 86, y: 91 }, obstacles: [], startAngle: 1.4 },
  { name: 'A little detour', hint: 'The dark moon blocks a path, but not every path.', anchor: { x: 80, y: 254 }, destination: { x: 273, y: 88 }, obstacles: [{ x: 213, y: 231, radius: 23 }], startAngle: 2.8 },
  { name: 'Northern passage', hint: 'Take your time. Another opening is always coming.', anchor: { x: 96, y: 96 }, destination: { x: 264, y: 258 }, obstacles: [{ x: 119, y: 234, radius: 25 }], startAngle: 4.1 },
  { name: 'Homeward arc', hint: 'Look for the amber path through the quiet.', anchor: { x: 273, y: 99 }, destination: { x: 85, y: 255 }, obstacles: [{ x: 245, y: 247, radius: 24 }], startAngle: 5.1 },
  { name: 'One last borrowing', hint: 'One clear tangent. One final delivery.', anchor: { x: 78, y: 178 }, destination: { x: 283, y: 173 }, obstacles: [{ x: 177, y: 75, radius: 24 }, { x: 169, y: 283, radius: 27 }], startAngle: 0.8 },
];

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
export function advanceFlight(leg: Leg, from: Point, direction: Point, seconds: number): FlightResult {
  const to = { x: from.x + direction.x * FLIGHT_SPEED * seconds, y: from.y + direction.y * FLIGHT_SPEED * seconds };
  let fraction = 1;
  let outcome: FlightResult['outcome'] = 'flying';
  const consider = (t: number | null, kind: FlightResult['outcome']) => {
    if (t !== null && t >= 0 && t <= fraction) { fraction = t; outcome = kind; }
  };
  consider(segmentCircleTime(from, to, { ...leg.destination, radius: CAPTURE_RADIUS + COURIER_RADIUS }), 'captured');
  for (const obstacle of leg.obstacles) {
    consider(segmentCircleTime(from, to, { ...obstacle, radius: obstacle.radius + COURIER_RADIUS }), 'collision');
  }
  const dx = to.x - from.x, dy = to.y - from.y;
  if (to.x < COURIER_RADIUS && dx < 0) consider((COURIER_RADIUS - from.x) / dx, 'escaped');
  if (to.x > WORLD.width - COURIER_RADIUS && dx > 0) consider((WORLD.width - COURIER_RADIUS - from.x) / dx, 'escaped');
  if (to.y < COURIER_RADIUS && dy < 0) consider((COURIER_RADIUS - from.y) / dy, 'escaped');
  if (to.y > WORLD.height - COURIER_RADIUS && dy > 0) consider((WORLD.height - COURIER_RADIUS - from.y) / dy, 'escaped');
  return { point: { x: from.x + dx * fraction, y: from.y + dy * fraction }, outcome, fraction };
}

export function predictLaunch(leg: Leg, angle: number): FlightResult {
  return advanceFlight(leg, orbitPoint(leg.anchor, angle), tangent(angle), 10);
}

/** Sampling is for authoring/tests only; play uses exact swept intersections. */
export function measureLaunchWindows(leg: Leg, samples = 7200): { totalSeconds: number; widestSeconds: number } {
  const hits = Array.from({ length: samples }, (_, i) => predictLaunch(leg, i * TAU / samples).outcome === 'captured');
  let longest = 0, run = 0;
  for (let i = 0; i < samples * 2; i++) {
    run = hits[i % samples] ? Math.min(run + 1, samples) : 0;
    longest = Math.max(longest, run);
  }
  return { totalSeconds: hits.filter(Boolean).length * TAU / samples / ORBIT_SPEED, widestSeconds: longest * TAU / samples / ORBIT_SPEED };
}
