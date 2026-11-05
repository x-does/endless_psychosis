import { test } from "node:test";
import assert from "node:assert/strict";
import { Run } from "../src/rebirth/model";
import { PILOTS } from "../src/rebirth/content";

const idle = { x: 0, y: 0 };
function damage(run: Run, amount = 10) {
  run.invincible = 0;
  run.shots.push({ ...run.player, vx: 0, vy: 0, life: 1, damage: amount, hostile: true, hit: [] });
  run.step(0.01, idle);
}
function clear(run: Run) {
  run.waveTime = 26;
  run.enemies = [];
  run.step(0.01, idle);
}
function kill(run: Run, count = 1) {
  run.enemies = Array.from({ length: count }, (_, i) => ({
    id: 100 + i, x: 100, y: 100, hp: 0, maxHp: 24,
    radius: 12, kind: "hunter" as const, timer: 100, flash: 0,
  }));
  run.step(0.01, idle);
}

test("every pilot may choose either trait from encounter events; simulation freezes and duplicate choices do nothing", () => {
  for (const pilot of PILOTS) for (const choice of ["sane", "insane"] as const) {
    const r = new Run(pilot.id);
    for (let i = 0; i < 3; i++) damage(r);
    assert.equal(r.strain, 100);
    assert.equal(r.status, "awakening");
    assert.match(r.awakeningReason, /Overload.*damaged/);
    const before = { time: r.time, player: { ...r.player }, hp: r.hp, cd: r.skillCd };
    r.step(0.04, { x: 1, y: 1 });
    assert.equal(r.skill(), false);
    assert.equal(r.dash(), false);
    assert.equal(r.chooseMindset("invalid" as never), false);
    assert.deepEqual({ time: r.time, player: r.player, hp: r.hp, cd: r.skillCd }, before);
    assert.equal(r.chooseMindset(choice), true);
    assert.equal(r.mindset, choice);
    assert.equal(r.status, "playing");
    assert.ok(r.invincible >= 1.5);
    assert.equal(r.chooseMindset(choice === "sane" ? "insane" : "sane"), false);
    damage(r);
    assert.equal(r.status, "playing", "only one awakening per encounter");
  }
});

test("clearing signals brings clarity and encounter survival guarantees a choice without damage farming", () => {
  const r = new Run("rook");
  kill(r, 17);
  assert.equal(r.strain, 0);
  assert.equal(r.status, "awakening");
  assert.match(r.awakeningReason, /Clarity.*cleared/);
  const quiet = new Run("io");
  clear(quiet);
  assert.equal(quiet.status, "awakening");
  assert.match(quiet.awakeningReason, /Encounter survived/);
  assert.equal(quiet.hp, quiet.maxHp);
  assert.equal(quiet.score, 250);
  quiet.chooseMindset("insane");
  assert.equal(quiet.status, "draft");
  quiet.choose("power");
  assert.equal(quiet.wave, 1);
  assert.equal(quiet.strain, 50);
  assert.equal(quiet.attuned, false);
  assert.equal(quiet.mindset, "insane", "trait persists until retuning");
  assert.equal(new Run("io").mindset, null, "a new run resets the trait");
});

test("traits change real weapon damage, attack cadence, received damage and skill cooldown for all pilots", () => {
  for (const p of PILOTS) for (const choice of ["sane", "insane"] as const) {
    const r = new Run(p.id);
    clear(r);
    r.chooseMindset(choice);
    r.choose("tempo");
    r.upgrades.power = 1;
    r.upgrades.skill = 1;
    assert.equal(r.damage, p.damage * 1.25 * (choice === "insane" ? 1.35 : 1));
    r.skill();
    assert.equal(r.skillCd, p.skillTime * 0.8 * (choice === "sane" ? 0.8 : 1));
    const hp = r.hp;
    damage(r, 10);
    assert.ok(Math.abs(r.hp - (hp - (choice === "sane" ? 8 : 12))) < 0.00001);
    r.enemies = [{ id: 999, x: r.player.x + 100, y: r.player.y, hp: 100000, maxHp: 100000, radius: 15, kind: "gunner", timer: 100, flash: 0 }];
    let firedAt = -1;
    let secondAt = -1;
    for (let i = 0; i < 300; i++) {
      r.step(0.005, idle);
      const shotCount = r.shots.filter(s => !s.hostile).length;
      if (shotCount > 0) {
        if (firedAt < 0) firedAt = r.time;
        else { secondAt = r.time; break; }
      }
      // Clear each projectile to measure emissions independently of hits/expiry.
      r.shots = [];
    }
    assert.ok(Math.abs(secondAt - firedAt - p.interval * 0.82 * (choice === "insane" ? 0.9 : 1)) < 0.006);
  }
});

test("repairs, skills and boss arrivals shift strain; immunity blocks damage and strain together", () => {
  const r = new Run("io");
  r.skill();
  assert.equal(r.strain, 42);
  r.pickups.push({ ...r.player, kind: "repair", life: 5 });
  r.step(0.01, idle);
  assert.equal(r.strain, 30);
  r.dash();
  const hp = r.hp;
  r.shots.push({ ...r.player, vx: 0, vy: 0, life: 1, damage: 24, hostile: true, hit: [] });
  r.step(0.01, idle);
  assert.equal(r.hp, hp);
  assert.equal(r.strain, 30);
  r.wave = 1;
  r.waveTime = 25;
  r.step(0.01, idle);
  assert.equal(r.strain, 55);
});

test("lethal damage and the final clear take precedence over awakening", () => {
  const r = new Run("vesper");
  r.strain = 90;
  r.hp = 1;
  damage(r);
  assert.equal(r.status, "dead");
  assert.equal(r.chooseMindset("sane"), false);
  const final = new Run("rook");
  final.wave = 5;
  final.waveTime = 25;
  final.step(0.01, idle);
  final.strain = 3;
  final.boss!.hp = 0;
  final.step(0.01, idle);
  assert.equal(final.status, "won");
});

test("a threshold event is remembered even when another event changes strain in the same frame", () => {
  const r = new Run("rook");
  r.strain = 85;
  r.invincible = 0;
  r.enemies = [{ id: 100, ...r.player, hp: 0, maxHp: 24, radius: 12, kind: "hunter", timer: 100, flash: 0 }];
  r.shots.push({ ...r.player, vx: 0, vy: 0, life: 1, damage: 1, hostile: true, hit: [] });
  r.step(0.01, idle);
  assert.ok(r.strain < 100);
  assert.equal(r.status, "awakening");
  assert.match(r.awakeningReason, /Overload/);
});

test("dashing after retuning preserves all remaining resume protection", () => {
  const r = new Run("rook");
  for (let i = 0; i < 3; i++) damage(r);
  r.chooseMindset("sane");
  assert.equal(r.dash(), true);
  r.step(0.04, idle);
  assert.ok(r.invincible > 1.4);
  const hp = r.hp;
  // Hit throughout the protected window without manually changing immunity.
  for (let i = 0; i < 140; i++) {
    r.shots.push({ ...r.player, vx: 0, vy: 0, life: 1, damage: 10, hostile: true, hit: [] });
    r.step(0.01, idle);
  }
  assert.equal(r.hp, hp);
  for (let i = 0; i < 10; i++) r.step(0.01, idle);
  r.shots.push({ ...r.player, vx: 0, vy: 0, life: 1, damage: 10, hostile: true, hit: [] });
  r.step(0.01, idle);
  assert.equal(r.hp, hp - 8);
});

test("cross-encounter retuning replaces modifiers and preserves an active cooldown", () => {
  const r = new Run("rook");
  clear(r);
  r.chooseMindset("sane");
  r.choose("reach");
  r.skill();
  const baseDamage = r.pilot.damage;
  for (const choice of ["insane", "sane"] as const) {
    for (let i = 0; i < 3; i++) damage(r, 1);
    assert.equal(r.status, "awakening");
    const cd = r.skillCd;
    r.chooseMindset(choice);
    assert.equal(r.skillCd, cd);
    assert.equal(r.damage, baseDamage * (choice === "insane" ? 1.35 : 1));
    r.waveTime = 26;
    r.step(0.01, idle);
    if (r.boss) { r.boss.hp = 0; r.step(0.01, idle); }
    assert.equal(r.status, "draft");
    r.choose("reach");
    assert.equal(r.mindset, choice);
  }
});

test("Insane damage is delivered by projectiles and Io satellites", () => {
  for (const pilot of PILOTS) {
    const r = new Run(pilot.id);
    clear(r);
    r.chooseMindset("insane");
    r.choose("reach");
    r.enemies = [{ id: 999, x: r.player.x + 90, y: r.player.y, hp: 10000, maxHp: 10000, radius: 15, kind: "gunner", timer: 100, flash: 0 }];
    for (let i = 0; i < 55; i++) r.step(0.01, idle);
    assert.ok(r.enemies[0].hp < 10000);
    const shots = r.shots.filter(s => !s.hostile);
    // An emitted projectile carries the actual trait multiplier, even for Io.
    assert.ok(shots.length > 0 || r.enemies[0].hp <= 10000 - r.damage);
    for (const shot of shots) assert.equal(shot.damage, r.damage);
    if (pilot.id === "io") {
      r.shots = [];
      r.enemies[0].x = r.player.x + Math.cos((r.time + 0.001) * 2.5) * 78;
      r.enemies[0].y = r.player.y + Math.sin((r.time + 0.001) * 2.5) * 78;
      const before = r.enemies[0].hp;
      r.step(0.001, idle);
      assert.ok(Math.abs(before - r.enemies[0].hp - r.damage * 3 * 0.001) < 0.000001);
    }
  }
});
