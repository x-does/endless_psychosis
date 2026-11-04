import { test } from "node:test";
import assert from "node:assert/strict";
import { Run, WIDTH } from "../src/rebirth/model";
import { PILOTS, draft } from "../src/rebirth/content";
const step = (run: Run, seconds: number, input = { x: 0, y: 0 }) => {
  for (let i = 0; i < seconds * 100; i++) run.step(0.01, input);
};
test("arena diagonal movement is normalized and the boundary contains a dash", () => {
  const a = new Run("vesper"),
    b = new Run("vesper");
  const start = { ...a.player };
  step(a, 0.3, { x: 1, y: 0 });
  step(b, 0.3, { x: 1, y: 1 });
  assert.ok(
    Math.abs(
      Math.hypot(a.player.x - start.x, a.player.y - start.y) -
        Math.hypot(b.player.x - start.x, b.player.y - start.y),
    ) < 0.001,
  );
  a.player.x = WIDTH - 25;
  a.dash();
  step(a, 0.2, { x: 1, y: 0 });
  assert.equal(a.player.x, WIDTH - 24);
  assert.ok(a.dashCd > 0);
  assert.equal(a.dash(), false);
});
test("skills, movement, and firing have independent cooldowns for each pilot", () => {
  for (const p of PILOTS) {
    const r = new Run(p.id);
    assert.equal(r.skill(), true);
    assert.equal(r.skill(), false);
    assert.equal(r.dash(), true);
    assert.ok(r.skillCd > 0);
    assert.ok(r.dashCd > 0);
  }
});
test("draft freezes simulation and applies an upgrade exactly once", () => {
  const r = new Run("rook");
  r.status = "draft";
  const before = r.hp;
  r.step(0.04, { x: 1, y: 1 });
  assert.equal(r.time, 0);
  assert.equal(r.skill(), false);
  r.choose("vital");
  assert.equal(r.maxHp, 165);
  assert.equal(r.hp, before + 25);
  assert.equal(r.wave, 1);
  r.choose("power");
  assert.equal(r.count("power"), 0);
});
test("all six encounters require clearing enemies, bosses gate their waves, and final boss ends the run", () => {
  const r = new Run("rook", () => 0.5);
  for (let wave = 0; wave < 6; wave++) {
    r.waveTime = 25;
    r.enemies = [];
    r.step(0.01, { x: 0, y: 0 });
    if (wave % 2 === 1) {
      assert.equal(r.status, "playing");
      assert.ok(r.boss);
      r.boss!.hp = 0;
      r.step(0.01, { x: 0, y: 0 });
    }
    assert.equal(r.status, wave === 5 ? "won" : "draft");
    if (wave < 5) r.choose("power");
  }
  const end = r.time;
  r.step(0.04, { x: 1, y: 1 });
  assert.equal(r.time, end);
});
test("dash immunity prevents marked-floor damage; expired warnings do not hit twice", () => {
  const r = new Run("vesper");
  r.invincible = 0;
  r.warnings = [{ ...r.player, radius: 200, time: 0.001, max: 1 }];
  r.dash();
  const hp = r.hp;
  r.step(0.01, { x: 0, y: 0 });
  assert.equal(r.hp, hp);
  assert.equal(r.warnings.length, 0);
  r.invincible = 0;
  r.warnings = [{ ...r.player, radius: 200, time: 0.001, max: 1 }];
  r.step(0.01, { x: 0, y: 0 });
  assert.equal(r.hp, hp - 24);
  r.step(0.01, { x: 0, y: 0 });
  assert.equal(r.hp, hp - 24);
});
test("recovery pickups are collected by proximity, barriers block damage, and overdrive expires", () => {
  const r = new Run("io");
  r.hp -= 30;
  r.pickups = [{ ...r.player, kind: "repair", life: 5 }];
  r.step(0.01, { x: 0, y: 0 });
  assert.equal(r.hp, r.maxHp - 8);
  assert.equal(r.pickups.length, 0);
  r.pickups = [{ ...r.player, kind: "barrier", life: 5 }];
  r.step(0.01, { x: 0, y: 0 });
  assert.equal(r.barrier, 3);
  r.invincible = 0;
  r.warnings = [{ ...r.player, radius: 100, time: 0.001, max: 1 }];
  const hp = r.hp;
  r.step(0.01, { x: 0, y: 0 });
  assert.equal(r.hp, hp);
  r.overdrive = 0.02;
  step(r, 0.03);
  assert.equal(r.overdrive, 0);
});
test("draft offers three distinct upgrades", () => {
  assert.equal(new Set(draft(() => 0.5).map((x) => x.id)).size, 3);
});
test("lethal damage ends simulation and cannot be undone by input", () => {
  const r = new Run("rook");
  r.hp = 10;
  r.invincible = 0;
  r.warnings = [{ ...r.player, radius: 200, time: 0.001, max: 1 }];
  r.step(0.01, { x: 0, y: 0 });
  assert.equal(r.status, "dead");
  assert.equal(r.hp, 0);
  const before = { ...r.player };
  assert.equal(r.skill(), false);
  assert.equal(r.dash(), false);
  step(r, 1, { x: 1, y: 0 });
  assert.deepEqual(r.player, before);
});
test("even multishot retains an aimed central bolt against a stationary ranged target", () => {
  for (const stacks of [0, 1, 2, 3]) {
    const r = new Run("rook");
    r.upgrades.echo = stacks;
    r.enemies = [
      {
        id: 100,
        x: r.player.x + 330,
        y: r.player.y,
        hp: 1000,
        maxHp: 1000,
        radius: 15,
        kind: "gunner",
        timer: 100,
        flash: 0,
      },
    ];
    step(r, 1.5);
    assert.ok(
      r.enemies.find((e) => e.id === 100)!.hp < 1000,
      `Echo stack ${stacks} must hit the target`,
    );
  }
});
test("lethal damage resolves before kills, lifesteal, or same-frame repair", () => {
  const r = new Run("rook");
  r.hp = 1;
  r.invincible = 0;
  r.upgrades.leech = 1;
  r.enemies = [
    {
      id: 100,
      ...r.player,
      hp: 1,
      maxHp: 1,
      radius: 15,
      kind: "hunter",
      timer: 10,
      flash: 0,
    },
  ];
  r.shots = [
    { ...r.player, vx: 0, vy: 0, life: 1, damage: 50, hostile: false, hit: [] },
  ];
  r.pickups = [{ ...r.player, kind: "repair", life: 5 }];
  r.step(0.01, { x: 0, y: 0 });
  assert.equal(r.status, "dead");
  assert.equal(r.hp, 0);
  assert.equal(r.kills, 0);
});
