import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceFlight, CHAMBERS, chamberAt, freshSession, HOLD_SECONDS, measureLaunchWindows, ORBIT_SPEED, orbitPoint, predictLaunch, press, REVEAL_MAX, release, segmentCircleTime, stepSession, tangent, TAU, type Chamber } from '../src/experiments/gravity';

test('every authored chamber and rotated variant has a real contiguous window of at least .7 seconds', () => {
  for (let depth = 0; depth < CHAMBERS.length * 2; depth++) {
    const c = chamberAt(depth), window = measureLaunchWindows(c);
    assert.ok(window.widestSeconds >= .7, `${depth} ${c.name}: ${window.widestSeconds}s`);
    assert.ok(c.phantoms.length <= 2 && c.obstacles.length <= 2);
  }
});

test('real captures use the same earliest sweep in one long frame or many short frames', () => {
  for (const c of CHAMBERS) {
    const angle = Array.from({ length: 1440 }, (_, i) => i * TAU / 1440).find(a => predictLaunch(c, a).outcome === 'captured');
    assert.notEqual(angle, undefined);
    const from = orbitPoint(c.anchor, angle!), direction = tangent(angle!);
    const big = advanceFlight(c, from, direction, 10);
    let small = advanceFlight(c, from, direction, 1 / 120);
    for (let i = 0; i < 1200 && small.outcome === 'flying'; i++) small = advanceFlight(c, small.point, direction, 1 / 120);
    assert.equal(small.outcome, 'captured');
    assert.ok(Math.hypot(big.point.x - small.point.x, big.point.y - small.point.y) < 1e-8);
  }
});

const corridor: Chamber = { name: 'ordered sweep', anchor: { x: 30, y: 170 }, destination: { x: 270, y: 170 }, phantoms: [{ x: 130, y: 170 }], obstacles: [], startAngle: 0 };
test('phantom crossings have no event, do not change direction, and can precede a real capture', () => {
  const pass = advanceFlight(corridor, { x: 50, y: 170 }, { x: 1, y: 0 }, .5);
  assert.equal(pass.outcome, 'flying');
  assert.equal(pass.point.x, 157.5);
  assert.deepEqual(pass, advanceFlight({ ...corridor, phantoms: [] }, { x: 50, y: 170 }, { x: 1, y: 0 }, .5));
  assert.equal(advanceFlight(corridor, pass.point, { x: 1, y: 0 }, 2).outcome, 'captured');
});

test('sweep resolves debris before a later capture, and a capture before later debris or bounds', () => {
  const from = { x: 50, y: 170 }, direction = { x: 1, y: 0 };
  const collision = advanceFlight({ ...corridor, obstacles: [{ x: 150, y: 170, radius: 10 }] }, from, direction, 2);
  assert.equal(collision.outcome, 'collision');
  assert.equal(collision.point.x, 135);
  const capture = advanceFlight({ ...corridor, destination: { x: 160, y: 170 }, obstacles: [{ x: 280, y: 170, radius: 15 }] }, from, direction, 10);
  assert.equal(capture.outcome, 'captured');
  assert.equal(capture.point.x, 115);
  assert.equal(advanceFlight(corridor, { x: 50, y: 30 }, direction, 2).outcome, 'escaped');
});

test('short release launches, hold freezes the clock, is bounded by fuel and never launches on release', () => {
  const start = freshSession(true);
  assert.equal(release(stepSession(press(start), HOLD_SECONDS - .001)).phase, 'flight');
  const held = stepSession(press(start), HOLD_SECONDS + .7);
  assert.ok(Math.abs(held.orbitElapsed - HOLD_SECONDS) < 1e-9);
  assert.ok(Math.abs(held.reveal - (REVEAL_MAX - .7)) < 1e-9);
  assert.equal(release(held).phase, 'orbit');
  const empty = stepSession(held, 2);
  assert.equal(empty.reveal, 0);
  assert.ok(Math.abs(empty.orbitElapsed - (HOLD_SECONDS + 1.5)) < 1e-9);
  assert.equal(release(empty).phase, 'orbit');
  let sliced = press(start);
  for (let i = 0; i < 295; i++) sliced = stepSession(sliced, .01);
  assert.ok(Math.abs(empty.angle - sliced.angle) < 1e-9);
  assert.equal(release(stepSession(press({ ...start, reveal: 0 }), 1)).phase, 'orbit');
});

test('failure loses one tether, retains depth and ghost, and resets the same known phase; zero ends', () => {
  let s = { ...freshSession(true), depth: 9, score: 9, ghost: { from: { x: 1, y: 2 }, to: { x: 3, y: 4 }, imprint: { x: 5, y: 6 } } };
  for (const left of [2, 1, 0]) {
    s = stepSession(s, 2 * TAU / ORBIT_SPEED + .01) as typeof s;
    assert.equal(s.tethers, left);
    assert.equal(s.depth, 9);
    assert.equal(s.score, 9);
    assert.ok(s.ghost);
    assert.match(s.failure!.reason, /Two revolutions/);
    if (left) {
      assert.equal(s.angle, chamberAt(9).startAngle);
      assert.deepEqual(s.point, orbitPoint(chamberAt(9).anchor, chamberAt(9).startAngle));
      assert.equal(s.orbitElapsed, 0);
    }
  }
  assert.equal(s.phase, 'ended');
  assert.deepEqual(stepSession(s, 100), s);
});

test('capture increments once, restores limited exposure and preserves the actual successful path endlessly', () => {
  const depth = 10001, c = chamberAt(depth);
  const angle = Array.from({ length: 7200 }, (_, i) => i * TAU / 7200).find(a => predictLaunch(c, a).outcome === 'captured')!;
  const start = { ...freshSession(true), depth, score: depth, angle, point: orbitPoint(c.anchor, angle), reveal: 1 };
  const launched = release(press(start));
  const captured = stepSession(launched, 10);
  assert.equal(captured.depth, depth + 1);
  assert.equal(captured.score, depth + 1);
  assert.equal(captured.reveal, REVEAL_MAX);
  assert.deepEqual(captured.ghost?.from, launched.point);
  assert.deepEqual(captured.ghost?.imprint, c.destination);
  assert.equal(stepSession(captured, .1).score, depth + 1);
  const escaped = stepSession({ ...freshSession(true), phase: 'flight', point: { x: 350, y: 320 }, direction: { x: 1, y: 0 } }, 2);
  assert.equal(escaped.tethers, 2);
  assert.equal(escaped.depth, 0);
  assert.equal(escaped.angle, chamberAt(0).startAngle);
});

test('pause freezes flight, held input, exposure and collapse clock', () => {
  for (const phase of ['orbit', 'flight'] as const) {
    const s = { ...press(freshSession(true)), phase, paused: true };
    assert.deepEqual(stepSession(s, 100), s);
    assert.equal(release(s).phase, phase);
  }
});

test('circle geometry handles tangency, stationary points, and starts inside', () => {
  const circle = { x: 10, y: 10, radius: 5 };
  assert.equal(segmentCircleTime({ x: 0, y: 5 }, { x: 20, y: 5 }, circle), .5);
  assert.equal(segmentCircleTime({ x: 0, y: 0 }, { x: 0, y: 0 }, circle), null);
  assert.equal(segmentCircleTime({ x: 10, y: 10 }, { x: 10, y: 10 }, circle), 0);
});
