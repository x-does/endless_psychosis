import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceFlight, LEGS, measureLaunchWindows, orbitPoint, predictLaunch, segmentCircleTime, tangent, TAU, type Leg } from '../src/experiments/gravity';

test('all six authored routes have a generous, unobstructed launch window', () => {
  assert.equal(LEGS.length, 6);
  for (const leg of LEGS) {
    const window = measureLaunchWindows(leg);
    assert.ok(window.widestSeconds >= 0.34, `${leg.name}: ${window.widestSeconds.toFixed(3)}s is too narrow`);
    assert.ok(window.totalSeconds < 1.2, 'Timing should still matter');
  }
});

test('successful trajectories capture identically in one long frame or many short frames', () => {
  for (const leg of LEGS) {
    const angles = Array.from({ length: 1440 }, (_, i) => i * TAU / 1440).filter(a => predictLaunch(leg, a).outcome === 'captured');
    assert.ok(angles.length > 0);
    const angle = angles[Math.floor(angles.length / 2)];
    const direction = tangent(angle);
    const big = advanceFlight(leg, orbitPoint(leg.anchor, angle), direction, 10);
    let small = advanceFlight(leg, orbitPoint(leg.anchor, angle), direction, 1 / 120);
    for (let i = 0; i < 1200 && small.outcome === 'flying'; i++) small = advanceFlight(leg, small.point, direction, 1 / 120);
    assert.equal(small.outcome, 'captured');
    assert.ok(Math.hypot(big.point.x - small.point.x, big.point.y - small.point.y) < 1e-8);
  }
});

test('swept collision catches a small moon skipped by the endpoint and resolves before capture', () => {
  const leg: Leg = { name: 'test', hint: '', anchor: { x: 20, y: 170 }, destination: { x: 270, y: 170 }, obstacles: [{ x: 150, y: 170, radius: 10 }], startAngle: 0 };
  const result = advanceFlight(leg, { x: 50, y: 170 }, { x: 1, y: 0 }, 2);
  assert.equal(result.outcome, 'collision');
  assert.equal(result.point.x, 135);
  let stepped = advanceFlight(leg, { x: 50, y: 170 }, { x: 1, y: 0 }, 1 / 60);
  for (let i = 0; i < 120 && stepped.outcome === 'flying'; i++) stepped = advanceFlight(leg, stepped.point, { x: 1, y: 0 }, 1 / 60);
  assert.equal(stepped.outcome, 'collision');
  assert.ok(Math.abs(stepped.point.x - result.point.x) < 1e-8);
  assert.equal(advanceFlight({ ...leg, obstacles: [] }, { x: 50, y: 170 }, { x: 1, y: 0 }, 2).outcome, 'captured');
  assert.equal(advanceFlight(leg, { x: 50, y: 30 }, { x: 1, y: 0 }, 2).outcome, 'escaped');
});

test('a captured parcel wins before a later collision or world exit', () => {
  const leg: Leg = { name: 'ordered events', hint: '', anchor: { x: 50, y: 170 }, destination: { x: 160, y: 170 }, obstacles: [{ x: 280, y: 170, radius: 15 }], startAngle: 0 };
  const result = advanceFlight(leg, { x: 50, y: 170 }, { x: 1, y: 0 }, 10);
  assert.equal(result.outcome, 'captured');
  assert.equal(result.point.x, 120);
});

test('circle geometry handles tangency, stationary points, and starts within capture', () => {
  const circle = { x: 10, y: 10, radius: 5 };
  assert.equal(segmentCircleTime({ x: 0, y: 5 }, { x: 20, y: 5 }, circle), 0.5);
  assert.equal(segmentCircleTime({ x: 0, y: 0 }, { x: 0, y: 0 }, circle), null);
  assert.equal(segmentCircleTime({ x: 10, y: 10 }, { x: 10, y: 10 }, circle), 0);
});
