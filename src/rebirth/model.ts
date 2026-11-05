import { MINDSETS, PILOTS, type MindsetId, type PilotId, type UpgradeId } from "./content";
export const WIDTH = 1100,
  HEIGHT = 760;
export type Vec = { x: number; y: number };
export type Enemy = Vec & {
  id: number;
  hp: number;
  maxHp: number;
  radius: number;
  kind: "hunter" | "gunner" | "brute" | "boss";
  timer: number;
  flash: number;
  arrival?: number;
};
export type Shot = Vec & {
  vx: number;
  vy: number;
  life: number;
  damage: number;
  hostile: boolean;
  hit: number[];
};
export type Warning = Vec & { radius: number; time: number; max: number };
export type Particle = Vec & {
  vx: number;
  vy: number;
  life: number;
  color: string;
};
const length = (v: Vec) => Math.hypot(v.x, v.y);
const distance = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
export class Run {
  pilot;
  player = { x: WIDTH / 2, y: HEIGHT / 2 };
  direction = { x: 0, y: -1 };
  hp: number;
  maxHp: number;
  time = 0;
  waveTime = 0;
  wave = 0;
  kills = 0;
  score = 0;
  status: "playing" | "awakening" | "draft" | "won" | "dead" = "playing";
  mindset: MindsetId | null = null;
  strain = 50;
  strainEvent = "A new encounter begins at 50 strain.";
  awakeningReason = "";
  attuned = false;
  private afterAwakening: "playing" | "draft" = "playing";
  private thresholdReason = "";
  get trait() {
    return MINDSETS.find((m) => m.id === this.mindset);
  }
  private shiftStrain(amount: number, reason: string) {
    this.strain = Math.max(0, Math.min(100, this.strain + amount));
    this.strainEvent = reason;
    if (!this.attuned && !this.thresholdReason && (this.strain === 0 || this.strain === 100))
      this.thresholdReason = `${this.strain === 0 ? "Clarity" : "Overload"} reached. ${reason}`;
  }
  private awaken(next: "playing" | "draft", reason: string) {
    this.afterAwakening = next;
    this.awakeningReason = reason;
    this.status = "awakening";
  }
  chooseMindset(id: MindsetId) {
    if (this.status !== "awakening" || !MINDSETS.some((m) => m.id === id)) return false;
    this.mindset = id;
    this.attuned = true;
    this.thresholdReason = "";
    // Retuning changes future cooldowns, never refreshes an active one.
    this.invincible = Math.max(this.invincible, 1.5);
    this.status = this.afterAwakening;
    return true;
  }
  enemies: Enemy[] = [];
  shots: Shot[] = [];
  warnings: Warning[] = [];
  particles: Particle[] = [];
  pickups: (Vec & {
    kind: "repair" | "barrier" | "overdrive";
    life: number;
  })[] = [];
  barrier = 0;
  overdrive = 0;
  upgrades: Partial<Record<UpgradeId, number>> = {};
  dashCd = 0;
  skillCd = 0;
  invincible = 1.5;
  dashTime = 0;
  slow = 0;
  pulse = 0;
  private fire = 0.2;
  private spawn = 1;
  private nextId = 1;
  private bossSpawned = false;
  constructor(
    id: PilotId,
    public random = Math.random,
  ) {
    this.pilot = PILOTS.find((p) => p.id === id)!;
    this.hp = this.maxHp = this.pilot.hp;
  }
  count(id: UpgradeId) {
    return this.upgrades[id] ?? 0;
  }
  get damage() {
    return this.pilot.damage * (1 + 0.25 * this.count("power")) * (this.trait?.damage ?? 1);
  }
  get range() {
    return this.pilot.range * (1 + 0.25 * this.count("reach"));
  }
  get boss() {
    return this.enemies.find((e) => e.kind === "boss");
  }
  get district() {
    return Math.floor(this.wave / 2);
  }
  dash() {
    if (this.status !== "playing" || this.dashCd > 0) return false;
    this.dashTime = 0.19;
    this.invincible = Math.max(this.invincible, 0.32);
    this.dashCd = 3 * Math.pow(0.85, this.count("stride"));
    this.burst(this.player, this.pilot.color, 12);
    return true;
  }
  skill() {
    if (this.status !== "playing" || this.skillCd > 0) return false;
    this.skillCd = this.pilot.skillTime * Math.pow(0.8, this.count("skill")) * (this.trait?.cooldown ?? 1);
    this.shiftStrain(-8, "Signature skill used · −8 strain");
    this.pulse = 1;
    const power = 1 + 0.25 * this.count("power");
    if (this.pilot.id === "io") {
      this.slow = 5;
      this.hp = Math.min(this.maxHp, this.hp + 18);
    } else {
      for (const e of this.enemies)
        if (this.pilot.id === "rook" || distance(e, this.player) < 260)
          this.hit(e, (this.pilot.id === "rook" ? 100 : 85) * power);
    }
    if (this.pilot.id === "rook")
      this.shots = this.shots.filter((s) => !s.hostile);
    this.burst(this.player, this.pilot.color, 28);
    this.cleanDead();
    return true;
  }
  choose(id: UpgradeId) {
    if (this.status !== "draft") return;
    this.upgrades[id] = this.count(id) + 1;
    if (id === "vital") {
      this.maxHp += 25;
      this.hp = Math.min(this.maxHp, this.hp + 35);
    }
    this.wave++;
    this.strain = 50;
    this.strainEvent = "A new encounter begins at 50 strain.";
    this.attuned = false;
    this.thresholdReason = "";
    this.waveTime = 0;
    this.bossSpawned = false;
    this.spawn = 1.2;
    this.fire = 0.3;
    this.invincible = 1.5;
    this.status = "playing";
  }
  private hit(enemy: Enemy, damage: number) {
    enemy.hp -= damage;
    enemy.flash = 0.1;
  }
  private hurt(damage: number) {
    if (this.invincible > 0 || this.barrier > 0) return;
    this.hp = Math.max(0, this.hp - damage * (this.trait?.incoming ?? 1));
    this.shiftStrain(20, "Integrity damaged · +20 strain");
    this.invincible = 0.75;
    this.burst(this.player, "#ff6e87", 10);
    if (this.hp <= 0) this.status = "dead";
  }
  private burst(at: Vec, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const a = this.random() * Math.PI * 2,
        s = 30 + this.random() * 120;
      this.particles.push({
        ...at,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0.3 + this.random() * 0.4,
        color,
      });
    }
    this.particles = this.particles.slice(-220);
  }
  private cleanDead() {
    this.enemies = this.enemies.filter((e) => {
      if (e.hp > 0) return true;
      this.kills++;
      this.shiftStrain(e.kind === "boss" ? -20 : -3,
        e.kind === "boss" ? "Anomaly defeated · −20 strain" : "Signal cleared · −3 strain");
      if (this.kills % 9 === 0)
        this.pickups.push({
          x: e.x,
          y: e.y,
          kind:
            this.kills % 27 === 0
              ? "overdrive"
              : this.kills % 18 === 0
                ? "barrier"
                : "repair",
          life: 14,
        });
      this.score += e.kind === "boss" ? 1000 : 50;
      this.hp = Math.min(this.maxHp, this.hp + this.count("leech") * 2);
      this.burst(e, this.pilot.color, e.kind === "boss" ? 40 : 8);
      return false;
    });
  }
  private addEnemy(kind: Enemy["kind"]) {
    const edge = Math.floor(this.random() * 4),
      n = this.random();
    const x =
        edge === 0 ? 28 : edge === 1 ? WIDTH - 28 : 50 + n * (WIDTH - 100),
      y = edge === 2 ? 28 : edge === 3 ? HEIGHT - 28 : 50 + n * (HEIGHT - 100);
    const hp =
      kind === "boss"
        ? 650 + this.district * 300
        : kind === "brute"
          ? 100 + this.wave * 12
          : kind === "gunner"
            ? 35 + this.wave * 6
            : 24 + this.wave * 5;
    this.enemies.push({
      id: this.nextId++,
      x,
      y,
      hp,
      maxHp: hp,
      radius:
        kind === "boss"
          ? 36
          : kind === "brute"
            ? 22
            : kind === "gunner"
              ? 15
              : 12,
      kind,
      timer: kind === "boss" ? 1.8 : 2,
      flash: 0,
      arrival: 0.8,
    });
  }
  private shoot(
    from: Vec,
    to: Vec,
    damage: number,
    hostile = false,
    angleOffset = 0,
  ) {
    const angle = Math.atan2(to.y - from.y, to.x - from.x) + angleOffset,
      speed = hostile ? 175 : 540;
    this.shots.push({
      ...from,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      damage,
      hostile,
      life: hostile ? 7 : 1.2 * (1 + 0.25 * this.count("reach")),
      hit: [],
    });
  }
  step(dt: number, input: Vec) {
    if (this.status !== "playing") return;
    dt = Math.max(0, Math.min(dt, 0.04));
    this.time += dt;
    this.waveTime += dt;
    this.barrier = Math.max(0, this.barrier - dt);
    this.overdrive = Math.max(0, this.overdrive - dt);
    this.dashCd = Math.max(0, this.dashCd - dt);
    this.skillCd = Math.max(0, this.skillCd - dt);
    this.invincible = Math.max(0, this.invincible - dt);
    this.slow = Math.max(0, this.slow - dt);
    this.pulse = Math.max(0, this.pulse - dt * 1.7);
    const mag = length(input);
    if (mag > 0.05) {
      this.direction = {
        x: input.x / Math.max(1, mag),
        y: input.y / Math.max(1, mag),
      };
    }
    const velocity =
      this.dashTime > 0
        ? this.direction
        : mag > 0.05
          ? { x: input.x / Math.max(1, mag), y: input.y / Math.max(1, mag) }
          : { x: 0, y: 0 };
    const speed =
      this.pilot.speed *
      (1 + 0.12 * this.count("stride")) *
      (this.dashTime > 0 ? 4.3 : 1);
    this.player.x = Math.max(
      24,
      Math.min(WIDTH - 24, this.player.x + velocity.x * speed * dt),
    );
    this.player.y = Math.max(
      24,
      Math.min(HEIGHT - 24, this.player.y + velocity.y * speed * dt),
    );
    this.dashTime = Math.max(0, this.dashTime - dt);
    this.spawn -= dt;
    if (this.spawn <= 0 && this.waveTime < 25 && this.enemies.length < 55) {
      this.addEnemy(
        this.waveTime > 8 && this.random() < 0.25
          ? "gunner"
          : this.wave > 1 && this.random() < 0.25
            ? "brute"
            : "hunter",
      );
      this.spawn = Math.max(0.3, 0.95 - this.wave * 0.1);
    }
    if (this.wave % 2 === 1 && this.waveTime >= 25 && !this.bossSpawned) {
      this.bossSpawned = true;
      this.addEnemy("boss");
      this.shiftStrain(25, "Anomaly arrived · +25 strain");
      this.shots = this.shots.filter((s) => !s.hostile);
    }
    this.fire -= dt;
    if (this.fire <= 0) {
      const target = this.enemies
        .filter(
          (e) => (e.arrival ?? 0) <= 0 && distance(e, this.player) < this.range,
        )
        .sort((a, b) => distance(a, this.player) - distance(b, this.player))[0];
      if (target) {
        const count =
          1 + this.count("echo") + (this.pilot.id === "vesper" ? 1 : 0);
        for (let i = 0; i < Math.min(count, 8); i++)
          this.shoot(
            this.player,
            target,
            this.damage,
            false,
            i === 0 ? 0 : Math.ceil(i / 2) * 0.13 * (i % 2 ? 1 : -1),
          );
        this.fire =
          this.pilot.interval *
          Math.pow(0.82, this.count("tempo")) *
          (this.trait?.interval ?? 1) *
          (this.overdrive > 0 ? 0.5 : 1);
      }
    }
    for (const e of this.enemies) {
      if ((e.arrival ?? 0) > 0) {
        e.arrival = Math.max(0, e.arrival! - dt);
        continue;
      }
      e.flash = Math.max(0, e.flash - dt);
      const d = distance(e, this.player) || 1,
        factor = this.slow > 0 ? 0.35 : 1;
      const speed =
        (e.kind === "boss"
          ? 38
          : e.kind === "brute"
            ? 48
            : e.kind === "gunner"
              ? 55
              : 90 + this.wave * 6) * factor;
      if (e.kind !== "gunner" || d > 330) {
        e.x += ((this.player.x - e.x) / d) * speed * dt;
        e.y += ((this.player.y - e.y) / d) * speed * dt;
      }
      if (d < e.radius + 13) this.hurt(e.kind === "boss" ? 24 : 14);
      if (this.hp <= 0) return;
      e.timer -= dt * factor;
      if (e.timer <= 0) {
        if (e.kind === "gunner") {
          this.shoot(e, this.player, 12, true);
          e.timer = 3;
        }
        if (e.kind === "boss") {
          if (this.district === 0) {
            for (let i = 0; i < 3; i++)
              this.warnings.push({
                x: this.player.x + (i - 1) * 95,
                y: this.player.y,
                radius: 58,
                time: 1.25,
                max: 1.25,
              });
          }
          if (this.district === 1) {
            for (let i = 0; i < 10; i++)
              this.shoot(
                e,
                {
                  x: e.x + Math.cos((i * Math.PI) / 5 + this.time),
                  y: e.y + Math.sin((i * Math.PI) / 5 + this.time),
                },
                15,
                true,
              );
            this.warnings.push({
              ...this.player,
              radius: 68,
              time: 1.4,
              max: 1.4,
            });
          }
          if (this.district === 2) {
            for (let i = 0; i < 12; i++)
              this.shoot(
                e,
                {
                  x: e.x + Math.cos((i * Math.PI) / 6),
                  y: e.y + Math.sin((i * Math.PI) / 6),
                },
                15,
                true,
              );
            for (let i = 0; i < 3; i++)
              this.warnings.push({
                x: this.player.x + (i - 1) * 100,
                y: this.player.y,
                radius: 65,
                time: 1.3,
                max: 1.3,
              });
          }
          e.timer = e.hp < e.maxHp * 0.5 ? 1.6 : 2.6;
        }
      }
      if (this.pilot.id === "io") {
        const count = Math.min(8, 3 + this.count("echo"));
        for (let i = 0; i < count; i++) {
          const a = this.time * 2.5 + (i * Math.PI * 2) / count;
          const orb = {
            x: this.player.x + Math.cos(a) * 78,
            y: this.player.y + Math.sin(a) * 78,
          };
          if (distance(orb, e) < e.radius + 12)
            this.hit(e, this.damage * 3 * dt);
        }
      }
    }
    for (const w of this.warnings) {
      w.time -= dt;
      if (w.time <= 0) {
        if (distance(w, this.player) < w.radius + 10) this.hurt(24);
        if (this.hp <= 0) return;
        this.burst(w, "#ff6e87", 14);
      }
    }
    this.warnings = this.warnings.filter((w) => w.time > 0);
    for (const s of this.shots) {
      const factor = s.hostile && this.slow > 0 ? 0.35 : 1;
      s.x += s.vx * dt * factor;
      s.y += s.vy * dt * factor;
      s.life -= dt;
      if (s.hostile) {
        if (distance(s, this.player) < 17) {
          this.hurt(s.damage);
          if (this.hp <= 0) return;
          s.life = 0;
        }
      } else
        for (const e of this.enemies)
          if (!s.hit.includes(e.id) && distance(s, e) < e.radius + 6) {
            this.hit(e, s.damage);
            s.hit.push(e.id);
            if (this.pilot.id !== "rook") s.life = 0;
            break;
          }
    }
    this.shots = this.shots
      .filter(
        (s) =>
          s.life > 0 &&
          s.x > -40 &&
          s.x < WIDTH + 40 &&
          s.y > -40 &&
          s.y < HEIGHT + 40,
      )
      .slice(-450);
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    this.cleanDead();
    for (const p of this.pickups) {
      p.life -= dt;
      if (distance(p, this.player) < 32) {
        p.life = 0;
        if (p.kind === "repair") {
          this.hp = Math.min(this.maxHp, this.hp + 22);
          this.shiftStrain(-12, "Repair collected · −12 strain");
        }
        else if (p.kind === "barrier") this.barrier = 3;
        else this.overdrive = 5;
        this.burst(p, this.pilot.color, 12);
      }
    }
    this.pickups = this.pickups.filter((p) => p.life > 0);
    if (
      this.status === "playing" &&
      this.waveTime >= 25 &&
      this.enemies.length === 0 &&
      (this.wave % 2 === 0 || this.bossSpawned)
    ) {
      this.status = this.wave === 5 ? "won" : "draft";
      this.shots = [];
      this.warnings = [];
      this.hp = Math.min(this.maxHp, this.hp + 12);
      this.score += 250;
      if (this.status === "draft" && !this.attuned)
        this.awaken("draft", "Encounter survived. The quiet gives you a choice.");
    } else if (!this.attuned && this.thresholdReason) {
      this.awaken("playing", this.thresholdReason);
    }
  }
}
