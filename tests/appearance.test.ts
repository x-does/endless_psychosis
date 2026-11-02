import assert from "node:assert/strict";
import { test } from "node:test";
import { AppearanceState } from "../src/game/appearance.ts";

test("different choices layer without normalizing or erasing residue", () => {
  const a = new AppearanceState();
  a.apply("bottle"); a.apply("numb"); a.apply("ground");
  assert.equal(a.bone, .5);
  assert.ok(Math.abs(a.echo - .5) < .001);
  assert.equal(a.radiance, .35);
  assert.equal(a.form, "echo"); // Retains the prior dominant form above the .45 exit floor.
});
test("dominant forms use hysteresis and recover toward human", () => {
  const a = new AppearanceState();
  a.apply("connect"); a.apply("connect");
  assert.equal(a.form, "radiance");
  a.tick(30); assert.equal(a.form, "radiance");
  a.tick(20); assert.equal(a.form, "mixed");
  a.tick(100); assert.equal(a.form, "human");
});
test("damage residue is capped per rolling window and never removes radiance", () => {
  const a = new AppearanceState(); a.apply("ground");
  for (let i=0;i<20;i++) a.stumble();
  assert.equal(a.echo, .1); assert.equal(a.radiance, .35);
  a.tick(12); a.stumble();
  assert.ok(a.echo > 0 && a.echo < .05);
});
test("axes clamp independently and a new run starts clean", () => {
  const a = new AppearanceState(); a.add(3, 3, 3);
  assert.deepEqual([a.radiance, a.echo, a.bone], [1,1,1]);
  assert.equal(a.form, "mixed");
  assert.equal(new AppearanceState().form, "human");
});
