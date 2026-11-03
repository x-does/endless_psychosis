import { test } from "node:test";
import assert from "node:assert/strict";
import { reflectionFor } from "../src/game/reflection.ts";

test("quiet runs receive a complete reflection without purchasing an effect", () => {
  for (const history of [[], ["water"], ["water", "water"]] as const) assert.equal(reflectionFor(history).title, "Ordinary Morning");
});
test("mixed history takes precedence over revelation and repeated certainty", () => {
  assert.equal(reflectionFor(["revelation", "subscription", "certificate", "certificate"]).title, "The Shape of a Way Through");
});
test("certainty needs both types and three purchases", () => {
  assert.equal(reflectionFor(["subscription", "certificate"]).title, "A Window, Not an Answer");
  assert.equal(reflectionFor(["subscription", "certificate", "certificate"]).title, "Certified Infinite");
  assert.equal(reflectionFor(["certificate", "certificate", "certificate"]).title, "The Road Beyond the Receipt");
});
test("subjective insight is available through either route", () => {
  assert.equal(reflectionFor(["revelation"]).title, "A Window, Not an Answer");
  assert.equal(reflectionFor(["subscription"]).title, "A Window, Not an Answer");
});
test("urgency reflection requires repetition and strict count dominance", () => {
  assert.equal(reflectionFor(["express", "express"]).title, "A Deadline Is Not a Destination");
  assert.equal(reflectionFor(["express", "express", "orders", "orders"]).title, "The Road Beyond the Receipt");
});
