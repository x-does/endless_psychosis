import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  UPGRADES, createGame, stats, tap, advance, upgradeCost, buyUpgrade,
  canRebirth, rebirth, loadGame, serializeGame, stage,
} from '../src/clicker/model';

const close = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) <= 1e-8 * Math.max(1, Math.abs(expected)), `${actual} ≠ ${expected}`);

test('a fresh game earns focus through taps and passive time without mutating its input', () => {
  const state = createGame(1234);
  const snapshot = structuredClone(state);
  assert.equal(state.clarity, 16);
  assert.equal(state.version, 1);
  assert.deepEqual(state.upgrades, {});
  const tapped = tap(state);
  close(tapped.focus, 2.68);
  assert.equal(tapped.lifetimeFocus, tapped.focus);
  assert.equal(tapped.taps, 1);
  const later = advance(state, 10);
  close(later.clarity, 16.12);
  close(later.focus, 0.2 * 10 * (1 + 16.06 / 100));
  assert.equal(later.lastSaved, 1234, 'simulation time does not change the wall-clock save timestamp');
  assert.deepEqual(state, snapshot);
});

test('chaos rewards active tapping while calm rewards passive income', () => {
  const state = { ...createGame(0), upgrades: { doomscroll: 2 }, echoes: 2 };
  const chaos = { ...state, clarity: 0 };
  const calm = { ...state, clarity: 100 };
  close(stats(chaos).perTap, stats(calm).perTap * 3);
  close(stats(calm).perSecond, stats(chaos).perSecond * 2);
  assert.ok(tap(chaos).focus > tap(calm).focus);
  assert.ok(advance(calm, 60).focus > advance(chaos, 60).focus);
});

test('catalog has stable unique IDs and every purchase has an economic/clarity tradeoff', () => {
  assert.ok(UPGRADES.length >= 8);
  assert.equal(new Set(UPGRADES.map(u => u.id)).size, UPGRADES.length);
  assert.ok(UPGRADES.some(u => u.clarityPerSecond > 0));
  assert.ok(UPGRADES.some(u => u.clarityPerSecond < 0));
  for (const u of UPGRADES) {
    for (const key of ['id', 'name', 'icon', 'tagline', 'benefit', 'costText', 'appearance'] as const) assert.ok(u[key].length > 0);
    const before = { ...createGame(0), focus: 1e6, lifetimeFocus: 1e6 };
    const after = buyUpgrade(before, u.id);
    assert.equal(after.focus, before.focus - u.baseCost);
    assert.equal(after.lifetimeFocus, before.lifetimeFocus, 'spending never erases progress');
    assert.equal(after.upgrades[u.id], 1);
    assert.equal(before.upgrades[u.id], undefined);
    assert.ok(stats(after).perSecond > stats(before).perSecond);
    if (u.clarityPerSecond > 0) {
      assert.ok(stats(after).perTap < stats(before).perTap, `${u.id} trades tap power for calm`);
      assert.ok(advance(after, 60).clarity > advance(before, 60).clarity);
    } else {
      assert.ok(advance(after, 60).clarity < advance(before, 60).clarity, `${u.id} trades calm for output`);
    }
    assert.equal(upgradeCost(after, u.id), Math.ceil(u.baseCost * 1.18));
  }
  const poor = createGame(0);
  assert.equal(buyUpgrade(poor, UPGRADES[0].id), poor);
  assert.equal(buyUpgrade(poor, '__proto__'), poor);
  assert.equal(upgradeCost(poor, 'missing'), Infinity);
  const capped = { ...poor, focus: 1e15, upgrades: { doomscroll: 250 } };
  assert.equal(buyUpgrade(capped, 'doomscroll'), capped);
});

test('time integration is independent of frame size even when clarity hits a boundary', () => {
  for (const upgrades of [{ 'silent-retreat': 2 }, { 'rage-bait': 4 }, {}]) {
    const start = { ...createGame(0), upgrades };
    const batch = advance(start, 3600);
    let stepped = start;
    for (let i = 0; i < 3600; i++) stepped = advance(stepped, 1);
    close(batch.focus, stepped.focus);
    close(batch.lifetimeFocus, stepped.lifetimeFocus);
    close(batch.clarity, stepped.clarity);
    assert.ok(batch.clarity >= 0 && batch.clarity <= 100);
  }
  const exhausted = { ...createGame(0), upgrades: { enough: 250 } };
  assert.ok(stats(exhausted).perTap > 0, 'tradeoffs cannot make tapping consume currency');
  for (const seconds of [0, -1, NaN, Infinity]) assert.equal(advance(exhausted, seconds), exhausted);
});

test('saves round-trip with timestamps and offline time is capped at exactly four hours', () => {
  const saved = { ...createGame(1000), upgrades: { 'ai-intern': 3 }, focus: 100, lifetimeFocus: 200 };
  const raw = serializeGame(saved, 1000);
  assert.deepEqual(loadGame(raw, 1000), { state: saved, offlineFocus: 0 });
  const fourHours = advance(saved, 14400);
  const result = loadGame(raw, 1000 + 24 * 60 * 60 * 1000);
  close(result.state.focus, fourHours.focus);
  close(result.state.lifetimeFocus, fourHours.lifetimeFocus);
  close(result.offlineFocus, fourHours.focus - saved.focus);
  assert.equal(result.state.clarity, fourHours.clarity);
  assert.equal(result.state.lastSaved, 86401000);
  assert.equal(loadGame(serializeGame(result.state, result.state.lastSaved), result.state.lastSaved).offlineFocus, 0);
  assert.equal(loadGame(raw, 0).offlineFocus, 0, 'clock rollback cannot create negative earnings');
  assert.equal(saved.lastSaved, 1000, 'serialization is pure');
});

test('corrupted and unrecognized saves fall back safely; fields are bounded without coercion', () => {
  for (const raw of [null, '', '{', 'null', '[]', '42', '"text"', '{"version":2}']) {
    assert.deepEqual(loadGame(raw, 77), { state: createGame(77), offlineFocus: 0 });
  }
  const { state, offlineFocus } = loadGame('{"version":1,"clarity":999,"focus":-12,"lifetimeFocus":1e999,"taps":2.9,"loop":-1,"echoes":"9","upgrades":{"doomscroll":9999,"breathwork":-4,"sleep":"20","unknown":8,"__proto__":9},"lastSaved":1e999}', 88);
  assert.equal(state.clarity, 100);
  assert.equal(state.focus, 0);
  assert.equal(state.lifetimeFocus, 0);
  assert.equal(state.taps, 2);
  assert.equal(state.loop, 0);
  assert.equal(state.echoes, 0);
  assert.equal(state.lastSaved, 88);
  assert.equal(offlineFocus, 0);
  assert.deepEqual(state.upgrades, { doomscroll: 250 });
  const huge = loadGame(JSON.stringify({ ...createGame(0), focus: 1e100, lifetimeFocus: 0, echoes: 1e100, loop: 1e100, taps: 1e100, upgrades: [] }), 0).state;
  assert.equal(huge.focus, 1e15);
  assert.equal(huge.lifetimeFocus, 1e15);
  assert.equal(huge.echoes, 1e6);
  assert.equal(huge.loop, 1e6);
  assert.equal(huge.taps, 1e6);
  assert.deepEqual(huge.upgrades, {});
  const full = loadGame(serializeGame({ ...huge, upgrades: { enough: 250 } }, 0), 1e12);
  assert.equal(full.offlineFocus, 0, 'reported offline earnings respect the currency cap');
  assert.ok(Number.isFinite(full.state.lifetimeFocus));
});

test('one tap/second with affordable reinvestment unlocks first rebirth in about fifteen minutes', () => {
  let state = createGame(0);
  let seconds = 0;
  for (; seconds < 1200 && !canRebirth(state); seconds++) {
    state = tap(advance(state, 1));
    // Prefer a higher tier when affordable, otherwise build up lower tiers.
    for (const u of [...UPGRADES].reverse()) if (state.focus >= upgradeCost(state, u.id)) state = buyUpgrade(state, u.id);
  }
  assert.ok(seconds >= 720 && seconds <= 1080, `first loop took ${seconds}s`);
  assert.ok(canRebirth(state));
  assert.ok(state.focus < 140000, 'spent focus still counts toward the lifetime milestone');
  const snapshot = structuredClone(state);
  const next = rebirth(state);
  assert.equal(next.loop, 1);
  assert.equal(next.echoes, 1);
  assert.equal(next.lifetimeFocus, state.lifetimeFocus);
  assert.equal(next.focus, 0);
  assert.equal(next.taps, 0);
  assert.equal(next.clarity, 16);
  assert.deepEqual(next.upgrades, {});
  close(stats(next).perTap, stats(createGame(0)).perTap * 1.25);
  close(stats(next).perSecond, stats(createGame(0)).perSecond * 1.25);
  assert.equal(canRebirth(next), false, 'cannot repeatedly rebirth using the same milestone');
  assert.equal(rebirth(next), next);
  assert.equal(canRebirth({ ...next, lifetimeFocus: 419999 }), false);
  assert.equal(canRebirth({ ...next, lifetimeFocus: 420000 }), true);
  assert.deepEqual(state, snapshot);
});

test('stages describe the whole clarity journey with safe boundary handling', () => {
  assert.equal(stage(-1).name, stage(0).name);
  assert.equal(stage(101).name, stage(100).name);
  assert.equal(stage(NaN).name, stage(16).name);
  const stages = [0, 20, 40, 60, 80].map(c => stage(c));
  assert.equal(new Set(stages.map(s => s.name)).size, 5);
  for (const s of stages) assert.ok(s.description.length > 20);
});

test('numeric saturation still permits future loops without free rebirths or overflowing counters', () => {
  const full = { ...createGame(0), focus: 1e15, lifetimeFocus: 1e15, loop: 1e6, echoes: 1e6 };
  assert.ok(canRebirth(full));
  const reset = rebirth(full);
  assert.equal(reset.focus, 0);
  assert.equal(reset.loop, 1e6);
  assert.equal(reset.echoes, 1e6);
  assert.equal(canRebirth(reset), false);
  assert.ok(canRebirth({ ...reset, focus: 1e15 }));
});
