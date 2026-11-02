import assert from "node:assert/strict";
import { test } from "node:test";
import { COPING, CopingState } from "../src/game/coping.ts";

test("three recent hits trigger a choice, and old hits leave the window", () => {
  const state = new CopingState();
  assert.equal(state.stumble(), false);
  state.tick(13);
  assert.equal(state.stumble(), false);
  assert.equal(state.stumble(), false);
  assert.equal(state.stumble(), true);
  assert.equal(state.offer(), true);
  assert.equal(state.offer(), false);
});

test("decline adds no penalty, clears streak and honors the offer cooldown", () => {
  const state = new CopingState();
  const before = state.strain;
  state.offer();
  state.choose(null);
  assert.equal(state.strain, before);
  assert.deepEqual(state.hits, []);
  assert.equal(state.canOffer(), false);
  state.tick(24);
  assert.equal(state.canOffer(), true);
});

test("every shortcut has a benefit, explicit cost, and finite non-stacking debt", () => {
  for (const id of ["bottle", "push", "numb"] as const) {
    const state = new CopingState();
    state.offer();
    state.choose(id);
    assert.equal(state.boosting, true);
    assert.ok(state.strain > 18);
    assert.ok(COPING[id].cost.length > 20);
    assert.equal(state.offer(), false);
    state.tick(COPING[id].seconds);
    assert.equal(state.aftermath, true);
    if (id === "bottle") assert.equal(state.regenFactor, 0);
    if (id === "push") assert.equal(state.regenFactor, 0.5);
    if (id === "numb") assert.equal(state.pulseCost, 27);
    state.tick(COPING[id].afterSeconds);
    assert.equal(state.effect, null);
    assert.equal(state.regenFactor, 1);
    assert.equal(state.pulseCost, 18);
  }
});

test("pulse boost expires exactly at the benefit boundary", () => {
  const state = new CopingState();
  state.offer(); state.choose("push");
  assert.equal(state.damageMultiplier, 2);
  state.tick(5);
  assert.equal(state.damageMultiplier, 1);
});

test("healthy recovery works without a focus resource and strain stays bounded", () => {
  const state = new CopingState();
  for (let i = 0; i < 20; i++) state.stumble();
  assert.equal(state.strain, 100);
  state.offer(); state.choose("ground");
  assert.equal(state.strain, 76);
  state.recover(1000);
  assert.equal(state.strain, 0);
});

test("invalid repeat choices cannot replace an effect or erase a drawback", () => {
  const state = new CopingState();
  state.offer(); state.choose("bottle");
  assert.equal(state.choose("ground"), false);
  assert.equal(state.effect, "bottle");
  assert.equal(state.remaining, 12);
});
