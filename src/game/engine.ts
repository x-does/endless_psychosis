import {
  CHAPTERS,
  ENEMY_DEFS,
  TECHNIQUE_BY_ID,
  techniquesForLevel,
  type BossDef,
  type Chapter,
  type EnemyDef,
  type Technique,
} from "./content";
import { haptic, Sfx } from "./audio";
import { xpForLevel, type DerivedStats } from "./save";
import { COPING, CopingState, SCENARIOS, strainState, type CopingId, type CopingOffer } from "./coping";
import { AppearanceState, type Form } from "./appearance";
import { drawAppearance } from "./drawAppearance";
import { SATIRE_ENABLED, SATIRE_ITEMS, SatireState, type SatireOffer, type SatireId } from "./satire";

export type Phase = "run" | "boss" | "complete" | "dead";

export interface BossSnapshot {
  name: string;
  title: string;
  hp: number;
  maxHp: number;
}

export interface RunSnapshot {
  phase: Phase;
  mode: "chapter" | "endless";
  hp: number;
  maxHp: number;
  focus: number;
  maxFocus: number;
  distance: number;
  target: number;
  level: number;
  xp: number;
  xpToNext: number;
  boss: BossSnapshot | null;
  shield: number;
  activeCooldown: number;
  activeMax: number;
  activeName: string | null;
  combo: number;
  enemiesDefeated: number;
  sparks: number;
  time: number;
  strain: number;
  mentalState: string;
  coping: { id: CopingId; remaining: number; aftermath: boolean } | null;
  appearance: { radiance: number; echo: number; bone: number; form: Form };
  satire: { stage: number; effect: SatireId | null; remaining: number; aftermath: boolean; charges:number } | null;
}

export interface RunResult {
  won: boolean;
  quit: boolean;
  distance: number;
  xpEarned: number;
  level: number;
  xp: number;
  learned: string[];
  enemiesDefeated: number;
  sparks: number;
  techniquesUsed: number;
  time: number;
  mode: "chapter" | "endless";
  chapterIndex: number;
}

export interface EngineCallbacks {
  onSnapshot: (s: RunSnapshot) => void;
  onLevelUp: (choices: Technique[], level: number) => void;
  onComplete: (result: RunResult) => void;
  onDead: (result: RunResult) => void;
  onToast: (text: string, tone?: "good" | "bad" | "info") => void;
  onBossStart: (boss: BossSnapshot) => void;
  onPauseRequest: () => void;
  onCopingOffer: (offer: CopingOffer) => void;
  onSatireOffer: (offer: SatireOffer) => void;
}

export interface EngineOptions {
  canvas: HTMLCanvasElement;
  chapter: Chapter;
  chapterIndex: number;
  mode: "chapter" | "endless";
  stats: DerivedStats;
  known: string[];
  active: Technique | null;
  level: number;
  xp: number;
  sound: boolean;
  haptics: boolean;
  reduceMotion: boolean;
}

interface PlayerState {
  x: number;
  y: number;
  vy: number;
  w: number;
  h: number;
  onGround: boolean;
  sliding: boolean;
  slideTimer: number;
  runCycle: number;
  coyote: number;
  jumpBuffer: number;
}

interface Enemy {
  uid: number;
  def: EnemyDef;
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  baseY: number;
  t: number;
  phase: number;
  fireTimer: number;
  hitFlash: number;
  dead: boolean;
  vy: number;
  diving: boolean;
}

type ObstacleKind = "rock" | "branch" | "puddle";

interface Obstacle {
  uid: number;
  kind: ObstacleKind;
  x: number;
  y: number;
  w: number;
  h: number;
  hitFlash: number;
}

type PickupKind = "spark" | "breath" | "heart" | "shield";

interface Pickup {
  uid: number;
  kind: PickupKind;
  x: number;
  y: number;
  baseY: number;
  r: number;
  t: number;
  taken: boolean;
}

interface Projectile {
  uid: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
  damage: number;
  bossDamage?: number;
  kind: "aimed" | "radial" | "ground" | "calm";
  t: number;
}

interface Wave {
  uid: number;
  x: number;
  y: number;
  r: number;
  maxR: number;
  life: number;
  maxLife: number;
  damage: number;
  bossDamage?: number;
  color: string;
  hit: Set<number>;
  hitBoss: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  shape: "circle" | "spark" | "square";
  gravity: number;
  rot: number;
}

interface Popup {
  x: number;
  y: number;
  text: string;
  life: number;
  maxLife: number;
  color: string;
  vy: number;
  size: number;
}

interface Boss {
  def: BossDef;
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  t: number;
  attackTimer: number;
  entering: boolean;
  dead: boolean;
  hitFlash: number;
  targetX: number;
  baseY: number;
  minionTimer: number;
  lastAttack: number;
}

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const TAU = Math.PI * 2;

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cb: EngineCallbacks;
  private opts: EngineOptions;
  private sfx: Sfx;
  private coping = new CopingState();
  private appearance = new AppearanceState();
  private satire = new SatireState();
  private nextSatire = 45;
  private offeredChoices: CopingOffer | null = null;
  private scenarioShown = false;
  private atmosphereBeat = 0;
  private rescueTimer = 0;

  W = 800;
  H = 600;
  private dpr = 1;
  private scale = 1;
  private groundY = 480;
  private lastGroundY = 480;

  phase: Phase = "run";
  private paused = false;
  private disposed = false;
  private raf = 0;
  private lastTime = 0;
  private elapsed = 0;
  private snapshotTimer = 0;
  private phaseTimer = 0;
  private resultSent = false;

  private chapter: Chapter;
  private chapterIndex: number;
  private mode: "chapter" | "endless";
  private target: number;
  private bossThreshold: number;
  private distance = 0;
  private runSpeed = 360;
  private scroll = 0;

  private player: PlayerState;
  private hp = 100;
  private maxHp = 100;
  private focus = 100;
  private maxFocus = 100;
  private level = 1;
  private xp = 0;
  private xpToNext = 50;
  private totalXpEarned = 0;
  private stats: DerivedStats;
  private known: Set<string>;
  private learnedRun: string[] = [];
  private active: Technique | null;
  private activeCooldown = 0;
  private readonly activeMax = 14;

  private shieldTimer = 0;
  private invulnTimer = 0;
  private slowTimer = 0;
  private dashTimer = 0;
  private shake = 0;
  private flash = 0;
  private combo = 0;
  private comboTimer = 0;

  private uid = 1;
  private enemies: Enemy[] = [];
  private obstacles: Obstacle[] = [];
  private pickups: Pickup[] = [];
  private projectiles: Projectile[] = [];
  private waves: Wave[] = [];
  private particles: Particle[] = [];
  private popups: Popup[] = [];
  private boss: Boss | null = null;

  private spawnTimer = 1.4;
  private bossResumeTimer = 0;
  private enemiesDefeated = 0;
  private sparksCollected = 0;
  private techniquesUsed = 0;

  private pendingLevels = 0;
  private levelPaused = false;

  private stars: { x: number; y: number; s: number; sp: number; tw: number }[] = [];
  private keys = new Set<string>();

  private readonly onKeyDown = (e: KeyboardEvent) => {
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
      e.preventDefault();
    }
    if (e.repeat) return;
    this.keys.add(e.code);
    switch (e.code) {
      case "Space":
      case "ArrowUp":
      case "KeyW":
        this.jump();
        break;
      case "ArrowDown":
      case "KeyS":
        this.slideStart();
        break;
      case "KeyJ":
      case "KeyF":
        this.pulse();
        break;
      case "KeyK":
      case "KeyE":
        this.useActive();
        break;
      case "KeyP":
      case "Escape":
        if (!this.coping.offered && !this.satire.offered) this.cb.onPauseRequest();
        break;
    }
  };

  private readonly onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
    if (["ArrowDown", "KeyS"].includes(e.code)) this.slideEnd();
  };

  constructor(opts: EngineOptions, cb: EngineCallbacks) {
    this.opts = opts;
    this.cb = cb;
    this.canvas = opts.canvas;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D not supported");
    this.ctx = ctx;
    this.chapter = opts.chapter;
    this.chapterIndex = opts.chapterIndex;
    this.mode = opts.mode;
    this.target = opts.chapter.targetMeters;
    this.bossThreshold = opts.mode === "endless" ? 700 : opts.chapter.targetMeters;
    this.stats = { ...opts.stats };
    this.known = new Set(opts.known);
    this.active = opts.active;
    this.level = opts.level;
    this.xp = opts.xp;
    this.xpToNext = xpForLevel(this.level);
    this.sfx = new Sfx(opts.sound);
    this.sfx.unlock();

    this.resize();
    this.player = {
      x: this.W * 0.22,
      y: this.groundY,
      vy: 0,
      w: 32 * this.scale,
      h: 54 * this.scale,
      onGround: true,
      sliding: false,
      slideTimer: 0,
      runCycle: 0,
      coyote: 0.1,
      jumpBuffer: 0,
    };
    this.maxHp = this.stats.maxHp;
    this.hp = this.maxHp;
    this.maxFocus = 100;
    this.focus = this.maxFocus;
    if (this.stats.startShield > 0) this.shieldTimer = this.stats.startShield;

    for (let i = 0; i < 70; i++) {
      this.stars.push({
        x: Math.random(),
        y: Math.random() * 0.62,
        s: rand(0.6, 2.1),
        sp: rand(0.1, 0.7),
        tw: rand(0, TAU),
      });
    }

    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    this.startLoop();
    this.emitSnapshot();
    if (this.mode === "endless") {
      this.cb.onToast("The Open Road. How far can you go?", "info");
    }
  }

  setSound(v: boolean) {
    this.sfx.setEnabled(v);
  }

  unlockAudio() {
    this.sfx.unlock();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const W = Math.max(280, rect.width || this.canvas.clientWidth || 800);
    const H = Math.max(240, rect.height || this.canvas.clientHeight || 600);
    this.W = W;
    this.H = H;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(W * this.dpr);
    this.canvas.height = Math.round(H * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.scale = clamp(Math.min(H / 720, W / 560), 0.55, 1.5);
    this.lastGroundY = this.groundY;
    this.groundY = H * 0.8;
    const dy = this.groundY - this.lastGroundY;
    if (dy && this.player) {
      this.player.y += dy;
      this.player.x = W * 0.22;
      this.player.w = 32 * this.scale;
      this.player.h = 54 * this.scale;
      for (const e of this.enemies) {
        e.y += dy;
        e.baseY += dy;
      }
      for (const o of this.obstacles) o.y += dy;
      for (const p of this.pickups) {
        p.y += dy;
        p.baseY += dy;
      }
      if (this.boss) {
        this.boss.y += dy;
        this.boss.baseY += dy;
      }
    }
  }

  private startLoop() {
    this.lastTime = performance.now();
    const tick = (now: number) => {
      if (this.disposed) return;
      const dt = Math.min(0.034, (now - this.lastTime) / 1000);
      this.lastTime = now;
      if (!this.paused) this.update(dt);
      this.render();
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  setPaused(v: boolean) {
    this.paused = v;
    if (!v) this.lastTime = performance.now();
  }

  isPaused() {
    return this.paused;
  }

  destroy() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.sfx.destroy();
  }

  private get slowFactor() {
    return this.slowTimer > 0 || (this.coping.effect === "numb" && this.coping.boosting) ? 0.55 : 1;
  }

  chooseCoping(id: CopingId | null) {
    const offer = this.offeredChoices;
    if (!offer || (id && id !== offer.healthy && id !== offer.shortcut)) return;
    if (!this.coping.choose(id)) return;
    this.offeredChoices = null;
    if (id) {
      if (SATIRE_ENABLED) this.satire.coping(id);
      this.appearance.apply(id);
      this.appearance.signal(COPING[id].color);
      const def = COPING[id];
      if (id === "ground") {
        this.focus = Math.min(this.maxFocus, this.focus + 20);
        this.projectiles = this.projectiles.filter(p => p.kind === "calm");
      }
      if (id === "compassion") this.hp = Math.min(this.maxHp, this.hp + 16);
      this.sfx.coping(def.kind === "shortcut");
      this.cb.onToast(`${def.name}: ${def.cue}`, def.kind === "healthy" ? "good" : "info");
    }
    this.setPaused(false);
    this.emitSnapshot();
  }

  private offerCoping(stumble = false) {
    if (this.satire.effect || this.satire.offered || this.levelPaused || this.phase === "dead" || this.phase === "complete" || !this.coping.offer()) return false;
    const index = this.chapterIndex < 2 ? 0 : this.chapterIndex < 4 ? 1 : 2;
    const scenario = SCENARIOS[index];
    this.offeredChoices = stumble ? { ...scenario, title: "Three stumbles. A moment to choose.", story: "The shadows press closer. Relief is within reach, but not every kind of relief helps you recover. Read what each choice gives—and what it takes." } : scenario;
    this.setPaused(true);
    this.sfx.coping(false);
    this.cb.onCopingOffer(this.offeredChoices);
    this.emitSnapshot();
    return true;
  }

  chooseSatire(id: SatireId | null) {
    if (this.coping.effect || !this.satire.choose(id)) return;
    if (id === "express" || id === "orders") {
      this.coping.strain = Math.min(100,this.coping.strain+12);
      this.appearance.add(id === "express" ? .1 : 0,id === "orders" ? .2 : 0,id === "express" ? .25 : .1);
    }
    if (id === "subscription") {
      this.focus = Math.min(this.maxFocus,this.focus+20);
      this.projectiles = this.projectiles.filter(p=>p.kind==="calm");
      this.appearance.add(.25);
    }
    if (id === "water") { this.coping.recover(8); this.appearance.add(.08); }
    if (id === 'revelation'){this.coping.strain=Math.min(100,this.coping.strain+10);this.appearance.add(.1,.3);}
    if (id === 'certificate')this.appearance.add(.25,.15);
    if (id) { this.appearance.signal(SATIRE_ITEMS[id].color); this.sfx.coping(id === "express" || id === "orders"); this.cb.onToast(SATIRE_ITEMS[id].name,"info"); }
    this.setPaused(false); this.emitSnapshot();
  }

  private playerRect() {
    const h = this.player.sliding ? 30 * this.scale : 54 * this.scale;
    return {
      x: this.player.x - this.player.w / 2,
      y: this.player.y - h,
      w: this.player.w,
      h,
    };
  }

  jump() {
    if (this.paused || this.phase === "dead" || this.phase === "complete") return;
    if (this.player.onGround || this.player.coyote > 0) {
      this.player.vy = -930 * this.scale;
      this.player.onGround = false;
      this.player.coyote = 0;
      this.player.jumpBuffer = 0;
      this.sfx.jump();
      haptic(this.opts.haptics, 12);
      this.dust(this.player.x, this.groundY, 6);
    } else {
      this.player.jumpBuffer = 0.14;
    }
  }

  slideStart() {
    if (this.paused || this.phase === "dead" || this.phase === "complete") return;
    if (this.player.onGround) {
      this.player.sliding = true;
      this.player.slideTimer = 0.6;
      this.sfx.slide();
      this.dust(this.player.x, this.groundY, 8);
    } else {
      this.player.vy += 620 * this.scale;
    }
  }

  slideEnd() {
    this.player.sliding = false;
    this.player.slideTimer = 0;
  }

  pulse() {
    if (this.paused || this.phase === "dead" || this.phase === "complete") return;
    if (this.activeCooldown > 0) return;
    if (this.satire.effect === "subscription") { this.cb.onToast("A moment of silence: jump and slide remain available.","info"); return; }
    const cost = Math.max(this.satire.pulseCost,this.coping.pulseCost);
    const power = Math.max(this.satire.pulsePower,this.coping.damageMultiplier);
    if (this.focus < cost) {
      this.cb.onToast("Not enough focus. Breathe.", "bad");
      return;
    }
    this.focus -= cost;
    this.activeCooldown = 0.42;
    const rect = this.playerRect();
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    this.waves.push({
      uid: this.uid++,
      x: cx,
      y: cy,
      r: 10 * this.scale,
      maxR: (132 + this.stats.pulseRadius) * this.scale,
      life: 0.38,
      maxLife: 0.38,
      damage: this.satire.effect === "orders" ? 2 : power,
      bossDamage: this.satire.effect === "orders" ? 4 : undefined,
      color: this.satire.effect === "orders" ? "#ffb077" : this.chapter.accent,
      hit: new Set(),
      hitBoss: false,
    });
    this.sfx.pulse();
    haptic(this.opts.haptics, 8);
    let beamVy = 0;
    if (this.boss && !this.boss.dead) {
      const dx = this.boss.x + this.boss.w / 2 - cx;
      const dy = this.boss.y + this.boss.h / 2 - cy;
      if (dx > 40) beamVy = (780 * this.scale * dy) / dx;
    }
    this.projectiles.push({
      uid: this.uid++,
      x: cx,
      y: cy,
      vx: 780 * this.scale,
      vy: beamVy,
      r: 13 * this.scale,
      color: this.satire.effect === "orders" ? "#ffb077" : this.chapter.accent,
      damage: this.satire.effect === "orders" ? 2 : power,
      bossDamage: this.satire.effect === "orders" ? 4 : undefined,
      kind: "calm",
      t: 0,
    });
    this.satire.firedPulse();
  }

  useActive() {
    if (this.paused || this.phase === "dead" || this.phase === "complete") return;
    if (!this.active) {
      this.cb.onToast("No technique equipped. Visit the Journal.", "info");
      return;
    }
    if (this.activeCooldown > 0) return;
    const tech = this.active;
    this.activeCooldown = this.activeMax;
    this.techniquesUsed++;
    this.appearance.add(.06);
    this.appearance.signal(this.active?.color ?? "#a3ead5");
    this.coping.recover(10);
    this.coping.hits = [];
    this.sfx.technique();
    haptic(this.opts.haptics, [15, 30, 15]);
    this.applyActiveEffect(tech);
    this.popup(
      this.player.x,
      this.player.y - 90 * this.scale,
      tech.name,
      tech.color,
      1.2,
      16 * this.scale,
    );
  }

  private applyActiveEffect(t: Technique) {
    if (t.effect.mode !== "active") return;
    const { action, power, duration } = t.effect;
    const rect = this.playerRect();
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    switch (action) {
      case "heal": {
        const amount = Math.round(power);
        this.hp = Math.min(this.maxHp, this.hp + amount);
        this.ringBurst(cx, cy, t.color, 20);
        this.popup(cx, cy - 40, `+${amount}`, "#8ef0c0", 1, 18 * this.scale);
        this.sfx.heal();
        break;
      }
      case "focus": {
        this.focus = Math.min(this.maxFocus, this.focus + power);
        this.ringBurst(cx, cy, t.color, 16);
        this.popup(cx, cy - 40, `+${Math.round(power)} focus`, "#8ecbff", 1, 14 * this.scale);
        break;
      }
      case "shield": {
        this.shieldTimer = Math.max(this.shieldTimer, duration);
        this.ringBurst(cx, cy, t.color, 18);
        break;
      }
      case "slow": {
        this.slowTimer = Math.max(this.slowTimer, duration);
        this.popup(cx, cy - 50, "Time softens", t.color, 1.2, 15 * this.scale);
        break;
      }
      case "clear": {
        for (const e of this.enemies) {
          if (!e.dead) this.damageEnemy(e, Math.max(1, Math.round(power)));
        }
        this.projectiles = [];
        this.waves.push({
          uid: this.uid++,
          x: cx,
          y: cy,
          r: 20 * this.scale,
          maxR: Math.max(this.W, this.H) * 0.75,
          life: 0.55,
          maxLife: 0.55,
          damage: 0,
          color: t.color,
          hit: new Set(),
          hitBoss: true,
        });
        this.ringBurst(cx, cy, t.color, 40);
        this.sfx.win();
        break;
      }
      case "purge": {
        for (const p of this.projectiles) {
          this.burst(p.x, p.y, p.color, 6);
        }
        this.projectiles = [];
        this.shieldTimer = Math.max(this.shieldTimer, 1.2);
        this.ringBurst(cx, cy, t.color, 24);
        break;
      }
      case "dash": {
        this.dashTimer = duration;
        this.invulnTimer = Math.max(this.invulnTimer, duration);
        this.ringBurst(cx, cy, t.color, 20);
        break;
      }
      case "rain": {
        for (const e of this.enemies) {
          if (!e.dead) this.damageEnemy(e, power);
        }
        if (this.boss && !this.boss.dead && !this.boss.entering) {
          this.damageBoss(power);
        }
        for (let i = 0; i < 14; i++) {
          const x = rand(0, this.W);
          this.particles.push({
            x,
            y: -20,
            vx: rand(-20, 20),
            vy: rand(120, 260),
            life: rand(0.5, 1.1),
            maxLife: 1.1,
            size: rand(2, 5),
            color: t.color,
            shape: "circle",
            gravity: 0,
            rot: 0,
          });
        }
        this.flash = 0.25;
        break;
      }
    }
  }

  private addXp(amount: number) {
    if (amount <= 0) return;
    const gain = Math.round(amount * (1 + this.stats.xpBonus));
    this.totalXpEarned += gain;
    this.xp += gain;
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level += 1;
      this.xpToNext = xpForLevel(this.level);
      this.pendingLevels += 1;
      this.sfx.levelUp();
      this.popup(
        this.player.x,
        this.player.y - 120 * this.scale,
        `Level ${this.level}`,
        "#ffe08a",
        1.6,
        20 * this.scale,
      );
    }
    if (this.pendingLevels > 0 && !this.levelPaused) this.showLevelUp();
    this.emitSnapshot();
  }

  private showLevelUp() {
    const choices = techniquesForLevel(
      this.chapterIndex,
      Array.from(this.known),
    );
    if (choices.length === 0) {
      this.pendingLevels = 0;
      this.hp = Math.min(this.maxHp, this.hp + 20);
      this.cb.onToast("Your toolkit is full. A small heal instead.", "good");
      return;
    }
    this.levelPaused = true;
    this.paused = true;
    this.cb.onLevelUp(choices, this.level);
  }

  chooseLevelUp(id: string) {
    const t = TECHNIQUE_BY_ID[id];
    if (!t) return;
    this.known.add(id);
    this.learnedRun.push(id);
    if (t.type === "active") {
      this.active = t;
      this.activeCooldown = 0;
    } else if (t.effect.mode === "passive") {
      const e = t.effect;
      switch (e.stat) {
        case "maxHp":
          this.maxHp += e.value;
          this.hp += e.value;
          break;
        case "focusRegen":
          this.stats.focusRegen += e.value;
          break;
        case "xpBonus":
          this.stats.xpBonus += e.value;
          break;
        case "damageReduce":
          this.stats.damageReduce = Math.min(0.5, this.stats.damageReduce + e.value);
          break;
        case "startShield":
          this.shieldTimer = Math.max(this.shieldTimer, e.value);
          break;
        case "enemySlow":
          this.stats.enemySlow += e.value;
          break;
        case "magnet":
          this.stats.magnet += e.value;
          break;
        case "pulseRadius":
          this.stats.pulseRadius += e.value;
          break;
      }
    }
    this.pendingLevels -= 1;
    this.emitSnapshot();
    if (this.pendingLevels > 0) {
      this.showLevelUp();
    } else {
      this.levelPaused = false;
      this.paused = false;
      this.lastTime = performance.now();
      this.emitSnapshot();
    }
  }

  finish(quit = true) {
    if (this.resultSent) return;
    this.resultSent = true;
    this.cb.onDead(this.makeResult(false, quit));
  }

  private makeResult(won: boolean, quit = false): RunResult {
    return {
      won,
      quit,
      distance: Math.floor(this.distance),
      xpEarned: Math.round(this.totalXpEarned),
      level: this.level,
      xp: this.xp,
      learned: [...this.learnedRun],
      enemiesDefeated: this.enemiesDefeated,
      sparks: this.sparksCollected,
      techniquesUsed: this.techniquesUsed,
      time: Math.round(this.elapsed),
      mode: this.mode,
      chapterIndex: this.chapterIndex,
    };
  }

  private update(dt: number) {
    this.elapsed += dt;
    this.snapshotTimer -= dt;
    if (this.snapshotTimer <= 0) {
      this.snapshotTimer = 0.1;
      this.emitSnapshot();
    }

    this.shake = Math.max(0, this.shake - dt * 42);
    this.flash = Math.max(0, this.flash - dt * 2.4);
    this.activeCooldown = Math.max(0, this.activeCooldown - dt);
    this.shieldTimer = Math.max(0, this.shieldTimer - dt);
    this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    this.slowTimer = Math.max(0, this.slowTimer - dt);
    this.dashTimer = Math.max(0, this.dashTimer - dt);
    this.comboTimer = Math.max(0, this.comboTimer - dt);
    if (this.comboTimer <= 0) this.combo = 0;

    if (this.phase === "dead" || this.phase === "complete") {
      this.phaseTimer -= dt;
      this.updateParticles(dt);
      this.updatePopups(dt);
      if (this.phaseTimer <= 0) {
        if (this.phase === "complete") {
          if (!this.resultSent) {
            this.resultSent = true;
            this.cb.onComplete(this.makeResult(true));
          }
        } else if (!this.resultSent) {
          this.resultSent = true;
          this.cb.onDead(this.makeResult(false));
        }
      }
      return;
    }

    const wasAftermath = this.coping.aftermath;
    const previousEffect = this.coping.effect;
    this.coping.tick(dt);
    if (SATIRE_ENABLED) this.satire.tick(dt,this.opts.reduceMotion);
    this.appearance.tick(dt);
    if (SATIRE_ENABLED && this.phase === "run" && this.elapsed >= this.nextSatire && !this.levelPaused && this.coping.canOffer() && !this.satire.effect) {
      this.nextSatire = this.elapsed + 40;
      this.setPaused(true); this.cb.onSatireOffer(this.satire.checkpoint()); this.emitSnapshot(); return;
    }
    if (this.coping.aftermath && !wasAftermath) {
      this.sfx.rebound();
      this.cb.onToast(`${this.coping.def?.name}: after-effect. ${this.coping.def?.cost}`, "info");
    } else if (previousEffect && !this.coping.effect) {
      this.sfx.heal();
      this.cb.onToast("The effect passes. The next step is yours.", "good");
    }
    this.atmosphereBeat -= dt;
    if (this.atmosphereBeat <= 0) {
      this.atmosphereBeat = 2.8 - this.coping.strain / 65;
      this.sfx.atmosphere(this.coping.strain, this.coping.def?.kind === "shortcut");
    }
    if (!this.scenarioShown && this.distance >= this.target * 0.24 && this.phase === "run" && this.coping.canOffer()) {
      this.scenarioShown = this.offerCoping();
      if (this.paused) return;
    }
    this.rescueTimer -= dt;
    if (this.coping.strain >= 75 && this.rescueTimer <= 0 && this.phase === "run") {
      this.rescueTimer = 7;
      const baseY = this.groundY - 30 * this.scale;
      this.pickups.push({ uid: this.uid++, kind: "breath", x: this.W + 30, y: baseY, baseY, r: 12 * this.scale, t: 0, taken: false });
    }
    if (this.coping.effect === "ground" && this.coping.boosting) this.projectiles = this.projectiles.filter(p => p.kind === "calm");

    this.runSpeed =
      (330 + this.chapter.difficulty * 16 + Math.min(this.elapsed * 1.6, 130)) *
      this.scale *
      (this.phase === "boss" ? 0.3 : 1) *
      this.slowFactor * this.satire.speed;

    if (this.phase === "run") {
      this.distance += (this.runSpeed * dt) / 16;
      if (this.mode === "chapter" && this.distance >= this.target) {
        this.startBoss();
      } else if (this.mode === "endless" && this.distance >= this.bossThreshold) {
        this.startEndlessBoss();
      }
      this.spawnTimer -= dt * (this.slowFactor < 1 ? 0.7 : 1);
      if (this.spawnTimer <= 0) {
        this.spawn();
        const diff = this.difficultyNow();
        const gap = clamp(1.3 - diff * 0.09 - this.elapsed * 0.003, 0.48, 1.3);
        this.spawnTimer = gap * rand(0.82, 1.22) * this.satire.speed;
      }
    }

    if (this.bossResumeTimer > 0) {
      this.bossResumeTimer -= dt;
      if (this.bossResumeTimer <= 0) this.resumeAfterEndlessBoss();
    }

    if (this.phase === "boss" && this.boss) this.updateBoss(dt);

    this.scroll += this.runSpeed * dt;
    this.updatePlayer(dt);
    this.updateEnemies(dt);
    if (this.paused) return;
    this.updateObstacles(dt);
    if (this.paused) return;
    this.updatePickups(dt);
    this.updateProjectiles(dt);
    if (this.paused) return;
    this.updateWaves(dt);
    this.updateParticles(dt);
    this.updatePopups(dt);

    if (this.dashTimer > 0) {
      const rect = this.playerRect();
      const cx = rect.x + rect.w / 2;
      const cy = rect.y + rect.h / 2;
      if (Math.random() < 0.7) {
        this.waves.push({
          uid: this.uid++,
          x: cx,
          y: cy,
          r: 8 * this.scale,
          maxR: 90 * this.scale,
          life: 0.3,
          maxLife: 0.3,
          damage: 1,
          color: this.active?.color ?? "#ffd28a",
          hit: new Set(),
          hitBoss: false,
        });
      }
    }

    this.focus = Math.min(
      this.maxFocus,
      this.focus + this.stats.focusRegen * this.coping.regenFactor * (this.satire.effect === "express" && this.satire.aftermath ? .5 : 1) * dt,
    );

    this.hp = Math.min(this.maxHp, this.hp);
    if (this.hp <= 0) this.die();
  }

  private difficultyNow() {
    return (
      this.chapter.difficulty +
      this.elapsed * 0.012 +
      (this.mode === "endless" ? this.distance / 900 : 0)
    );
  }

  private updatePlayer(dt: number) {
    const p = this.player;
    p.runCycle += dt * 9 * (this.runSpeed / (330 * this.scale));
    if (p.sliding) {
      p.slideTimer -= dt;
      if (p.slideTimer <= 0) p.sliding = false;
    }
    p.vy += 2500 * this.scale * dt;
    p.y += p.vy * dt;
    if (p.y >= this.groundY) {
      if (!p.onGround) this.dust(p.x, this.groundY, 5);
      p.y = this.groundY;
      p.vy = 0;
      p.onGround = true;
      p.coyote = 0.09;
    } else {
      p.onGround = false;
      p.coyote = Math.max(0, p.coyote - dt);
    }
    if (p.jumpBuffer > 0) {
      p.jumpBuffer -= dt;
      if (p.onGround) {
        p.jumpBuffer = 0;
        this.jump();
      }
    }
    p.x = this.W * 0.22;
    if (Math.random() < 0.35) {
      this.particles.push({
        x: p.x - p.w * 0.5 + rand(-6, 6),
        y: p.y - rand(8, 40) * this.scale,
        vx: rand(-70, -20),
        vy: rand(-20, 20),
        life: rand(0.25, 0.6),
        maxLife: 0.6,
        size: rand(1, 3) * this.scale,
        color: this.chapter.accent,
        shape: "circle",
        gravity: 0,
        rot: 0,
      });
    }
  }

  private updateEnemies(dt: number) {
    const rect = this.playerRect();
    const slow = this.slowFactor * (1 - this.stats.enemySlow);
    for (const e of this.enemies) {
      if (e.dead) continue;
      e.t += dt;
      e.hitFlash = Math.max(0, e.hitFlash - dt * 4);
      const speedMul = {
        wisp: 0.55,
        hound: 0.95,
        bat: 0.8,
        critic: 0.35,
        blob: 0.3,
        spiral: 0.35,
      }[e.def.kind];
      e.x -= this.runSpeed * speedMul * slow * dt;

      switch (e.def.kind) {
        case "wisp":
          e.y = e.baseY + Math.sin(e.t * 2.2 + e.phase) * 16 * this.scale;
          break;
        case "bat":
          e.y = e.baseY + Math.sin(e.t * 3 + e.phase) * 12 * this.scale;
          if (e.x < this.W * 0.78 && !e.diving) e.diving = true;
          if (e.diving) {
            e.vy += 900 * this.scale * dt;
            e.y += e.vy * dt;
            if (e.y + e.h > this.groundY) {
              e.y = this.groundY - e.h;
              e.vy = 0;
            }
          }
          break;
        case "hound":
          e.y = this.groundY - e.h + Math.sin(e.t * 12) * 2 * this.scale;
          break;
        case "critic":
          if (e.x > this.W * 0.74) {
            e.x -= this.runSpeed * 0.55 * slow * dt;
          }
          e.y = e.baseY + Math.sin(e.t * 1.4) * 8 * this.scale;
          e.fireTimer -= dt;
          if (e.fireTimer <= 0 && e.x < this.W * 0.86) {
            e.fireTimer = rand(2.1, 3.2);
            this.fireAtPlayer(e.x, e.y + e.h * 0.4, 250 * this.scale, e.def.accent);
          }
          break;
        case "blob":
          e.y = this.groundY - e.h + Math.abs(Math.sin(e.t * 3)) * -4 * this.scale;
          break;
        case "spiral":
          e.y = e.baseY + Math.sin(e.t * 1.8) * 10 * this.scale;
          e.fireTimer -= dt;
          if (e.fireTimer <= 0 && e.x < this.W * 0.88) {
            e.fireTimer = rand(2.4, 3.4);
            this.fireRadial(e.x, e.y + e.h / 2, 5, 150 * this.scale, e.def.accent);
          }
          break;
      }

      if (e.x + e.w < -80) e.dead = true;

      if (
        !e.dead &&
        e.x < rect.x + rect.w &&
        e.x + e.w > rect.x &&
        e.y < rect.y + rect.h &&
        e.y + e.h > rect.y
      ) {
        this.hurt(24);
        this.damageEnemy(e, 99);
      }
    }
    this.enemies = this.enemies.filter((e) => !e.dead);
  }

  private updateObstacles(dt: number) {
    const rect = this.playerRect();
    for (const o of this.obstacles) {
      o.x -= this.runSpeed * dt;
      o.hitFlash = Math.max(0, o.hitFlash - dt * 4);
      if (
        o.x < rect.x + rect.w &&
        o.x + o.w > rect.x &&
        o.y < rect.y + rect.h &&
        o.y + o.h > rect.y
      ) {
        this.hurt(22);
        o.hitFlash = 1;
      }
    }
    this.obstacles = this.obstacles.filter((o) => o.x + o.w > -100);
  }

  private updatePickups(dt: number) {
    const rect = this.playerRect();
    const magnet = 26 + this.stats.magnet * 40;
    for (const p of this.pickups) {
      if (p.taken) continue;
      p.t += dt;
      p.x -= this.runSpeed * dt;
      p.y = p.baseY + Math.sin(p.t * 2.4 + p.x * 0.01) * 8 * this.scale;
      const cx = p.x;
      const cy = p.y;
      const pr = p.r + magnet;
      const near =
        cx > rect.x - pr &&
        cx < rect.x + rect.w + pr &&
        cy > rect.y - pr &&
        cy < rect.y + rect.h + pr;
      if (near) {
        const dx = rect.x + rect.w / 2 - cx;
        const dy = rect.y + rect.h / 2 - cy;
        const d = Math.hypot(dx, dy) || 1;
        if (d < p.r + 46 * this.scale) {
          p.x += (dx / d) * 320 * dt;
          p.y += (dy / d) * 320 * dt;
        }
        if (d < p.r + 22 * this.scale) {
          p.taken = true;
          this.collect(p);
        }
      }
      if (p.x < -60) p.taken = true;
    }
    this.pickups = this.pickups.filter((p) => !p.taken);
  }

  private collect(p: Pickup) {
    this.appearance.signal(({spark:'#ffe08a',breath:'#8ecbff',heart:'#ff9db0',shield:'#9fe0ff'})[p.kind]);
    this.sfx.pickup();
    switch (p.kind) {
      case "spark": {
        const xp = Math.round(7 * (1 + this.combo * 0.03));
        this.sparksCollected++;
        this.combo++;
        this.comboTimer = 3;
        this.addXp(xp);
        this.burst(p.x, p.y, "#ffe08a", 6);
        break;
      }
      case "breath":
        this.appearance.add(.04, -.03);
        this.coping.recover(12);
        this.coping.hits = [];
        this.focus = Math.min(this.maxFocus, this.focus + 34);
        this.burst(p.x, p.y, "#8ecbff", 8);
        this.popup(p.x, p.y - 10, "+34 focus", "#8ecbff", 0.9, 13 * this.scale);
        break;
      case "heart":
        this.appearance.add(.04, 0, -.03);
        this.coping.recover(10);
        this.coping.hits = [];
        this.hp = Math.min(this.maxHp, this.hp + 18);
        this.burst(p.x, p.y, "#ff9db0", 8);
        this.popup(p.x, p.y - 10, "+18", "#ff9db0", 0.9, 14 * this.scale);
        this.sfx.heal();
        break;
      case "shield":
        this.appearance.add(0, 0, .03);
        this.coping.recover(8);
        this.shieldTimer = Math.max(this.shieldTimer, 6);
        this.burst(p.x, p.y, "#9fe0ff", 10);
        this.popup(p.x, p.y - 10, "Shielded", "#9fe0ff", 0.9, 13 * this.scale);
        break;
    }
    this.emitSnapshot();
  }

  private updateProjectiles(dt: number) {
    const rect = this.playerRect();
    const slow = this.slowFactor;
    for (const p of this.projectiles) {
      p.t += dt;
      const projectileSpeed = p.kind === "calm" ? 1 : slow * this.satire.projectileFactor;
      p.x += p.vx * projectileSpeed * dt;
      p.y += p.vy * projectileSpeed * dt;
      if (p.kind === "calm") {
        let hit = false;
        if (this.boss && !this.boss.dead && !this.boss.entering) {
          const b = this.boss;
          if (
            p.x + p.r >= b.x &&
            p.x - p.r <= b.x + b.w &&
            p.y + p.r >= b.y &&
            p.y - p.r <= b.y + b.h
          ) {
            this.damageBoss(p.bossDamage ?? 3 * p.damage);
            this.burst(p.x, p.y, p.color, 10);
            hit = true;
          }
        }
        if (!hit) {
          for (const e of this.enemies) {
            if (e.dead) continue;
            if (
              p.x + p.r >= e.x &&
              p.x - p.r <= e.x + e.w &&
              p.y + p.r >= e.y &&
              p.y - p.r <= e.y + e.h
            ) {
              this.damageEnemy(e, p.damage);
              this.burst(p.x, p.y, p.color, 6);
              hit = true;
              break;
            }
          }
        }
        if (hit) p.x = -9999;
        if (p.x > this.W + 120) p.x = -9999;
        continue;
      }
      if (p.kind === "aimed") p.vy += 160 * this.scale * dt;
      const cx = clamp(p.x, rect.x, rect.x + rect.w);
      const cy = clamp(p.y, rect.y, rect.y + rect.h);
      if (Math.hypot(p.x - cx, p.y - cy) < p.r) {
        this.hurt(p.damage);
        p.x = -9999;
      }
      if (p.x < -100 || p.x > this.W + 200 || p.y > this.H + 100) p.x = -9999;
    }
    this.projectiles = this.projectiles.filter((p) => p.x > -9000);
  }

  private updateWaves(dt: number) {
    const slow = this.slowFactor;
    for (const w of this.waves) {
      w.life -= dt;
      const t = 1 - Math.max(0, w.life) / w.maxLife;
      w.r = w.maxR * (1 - Math.pow(1 - t, 3));
      if (w.damage > 0) {
        for (const e of this.enemies) {
          if (e.dead || w.hit.has(e.uid)) continue;
          const ex = e.x + e.w / 2;
          const ey = e.y + e.h / 2;
          if (Math.hypot(ex - w.x, ey - w.y) <= w.r + Math.max(e.w, e.h) / 2) {
            w.hit.add(e.uid);
            this.damageEnemy(e, w.damage);
          }
        }
        if (this.boss && !this.boss.dead && !w.hitBoss) {
          const bx = this.boss.x + this.boss.w / 2;
          const by = this.boss.y + this.boss.h / 2;
          if (Math.hypot(bx - w.x, by - w.y) <= w.r + this.boss.w * 0.5) {
            w.hitBoss = true;
            this.damageBoss(w.bossDamage ?? w.damage * 3);
          }
        }
      }
      for (const p of this.projectiles) {
        if (p.kind === "calm") continue;
        if (Math.hypot(p.x - w.x, p.y - w.y) < w.r + p.r) {
          this.burst(p.x, p.y, p.color, 4);
          p.x = -9999;
        }
      }
    }
    this.projectiles = this.projectiles.filter((p) => p.x > -9000);
    this.waves = this.waves.filter((w) => w.life > 0);
    void slow;
  }

  private updateParticles(dt: number) {
    for (const p of this.particles) {
      p.life -= dt;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += dt * 4;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  private updatePopups(dt: number) {
    for (const p of this.popups) {
      p.life -= dt;
      p.y += p.vy * dt;
    }
    this.popups = this.popups.filter((p) => p.life > 0);
  }

  private spawn() {
    const diff = this.difficultyNow();
    const roll = Math.random();
    if (roll < 0.42) {
      const kinds: ObstacleKind[] = ["rock"];
      if (this.chapter.difficulty >= 2) kinds.push("branch");
      if (this.chapter.difficulty >= 3) kinds.push("puddle");
      this.spawnObstacle(pick(kinds));
    } else if (roll < 0.8) {
      this.spawnEnemy(this.pickEnemy());
    } else {
      this.spawnPickup();
    }
    void diff;
  }

  private spawnObstacle(kind: ObstacleKind) {
    const s = this.scale;
    const x = this.W + 60 * s;
    if (kind === "rock") {
      const w = rand(44, 62) * s;
      const h = rand(46, 62) * s;
      this.obstacles.push({
        uid: this.uid++,
        kind,
        x,
        y: this.groundY - h,
        w,
        h,
        hitFlash: 0,
      });
    } else if (kind === "branch") {
      const w = rand(60, 84) * s;
      const h = 30 * s;
      this.obstacles.push({
        uid: this.uid++,
        kind,
        x,
        y: this.groundY - 76 * s,
        w,
        h,
        hitFlash: 0,
      });
    } else {
      const w = rand(56, 78) * s;
      const h = 16 * s;
      this.obstacles.push({
        uid: this.uid++,
        kind,
        x,
        y: this.groundY - h,
        w,
        h,
        hitFlash: 0,
      });
    }
  }

  private pickEnemy(): EnemyDef {
    const d = this.chapter.difficulty;
    let pool: string[];
    if (this.mode === "endless") {
      pool = ["worry", "hound", "bat", "critic", "blob", "spiral"];
    } else if (d <= 1) pool = ["worry", "worry", "hound"];
    else if (d === 2) pool = ["worry", "bat", "bat", "spiral"];
    else if (d === 3) pool = ["critic", "worry", "bat", "spiral"];
    else if (d === 4) pool = ["blob", "hound", "critic", "worry"];
    else pool = ["worry", "hound", "bat", "critic", "blob", "spiral"];
    return ENEMY_DEFS[pick(pool)];
  }

  private spawnEnemy(def: EnemyDef, x?: number) {
    const s = this.scale;
    const w = def.size[0] * s;
    const h = def.size[1] * s;
    let baseY = this.groundY - h;
    if (def.kind === "wisp") baseY = this.groundY - 120 * s;
    if (def.kind === "bat") baseY = this.groundY - 175 * s;
    if (def.kind === "critic") baseY = this.groundY - 150 * s;
    if (def.kind === "spiral") baseY = this.groundY - 140 * s;
    this.enemies.push({
      uid: this.uid++,
      def,
      x: x ?? this.W + 60 * s,
      y: baseY,
      w,
      h,
      hp: def.hp,
      baseY,
      t: rand(0, 10),
      phase: rand(0, TAU),
      fireTimer: rand(1.2, 2.6),
      hitFlash: 0,
      dead: false,
      vy: 0,
      diving: false,
    });
  }

  private spawnPickup() {
    const s = this.scale;
    const roll = Math.random();
    let kind: PickupKind = "spark";
    if (roll > 0.94) kind = "shield";
    else if (roll > 0.84) kind = "heart";
    else if (roll > 0.66) kind = "breath";
    const baseY = this.groundY - rand(80, 170) * s;
    this.pickups.push({
      uid: this.uid++,
      kind,
      x: this.W + 50 * s,
      y: baseY,
      baseY,
      r: 12 * s,
      t: rand(0, 10),
      taken: false,
    });
  }

  private startBoss() {
    this.phase = "boss";
    this.spawnTimer = 999;
    this.enemies = [];
    this.obstacles = [];
    this.projectiles = [];
    this.pickups = [];
    const def = this.chapter.boss;
    this.spawnBoss(def, def.hp);
  }

  private startEndlessBoss() {
    this.phase = "boss";
    this.spawnTimer = 999;
    this.enemies = [];
    this.obstacles = [];
    this.projectiles = [];
    this.pickups = [];
    const def = CHAPTERS[Math.floor(Math.random() * CHAPTERS.length)].boss;
    const hp = Math.round(def.hp * (1 + this.distance / 2400));
    this.spawnBoss(def, hp);
  }

  private spawnBoss(def: BossDef, hp: number) {
    const s = this.scale;
    const w = 150 * s;
    const h = 170 * s;
    this.boss = {
      def,
      x: this.W + w,
      y: this.groundY - h - 70 * s,
      w,
      h,
      hp,
      maxHp: hp,
      t: 0,
      attackTimer: 2,
      entering: true,
      dead: false,
      hitFlash: 0,
      targetX: this.W * 0.76,
      baseY: this.groundY - h - 70 * s,
      minionTimer: 4,
      lastAttack: 0,
    };
    this.sfx.boss();
    this.flash = 0.3;
    this.cb.onBossStart({
      name: def.name,
      title: def.title,
      hp,
      maxHp: hp,
    });
    this.emitSnapshot();
  }

  private updateBoss(dt: number) {
    const b = this.boss;
    if (!b) return;
    b.t += dt;
    b.hitFlash = Math.max(0, b.hitFlash - dt * 4);
    if (b.entering) {
      b.x += (b.targetX - b.x) * Math.min(1, dt * 2.6);
      if (Math.abs(b.x - b.targetX) < 3) {
        b.entering = false;
        b.attackTimer = 1.1;
      }
      return;
    }
    if (b.dead) {
      b.y += 40 * dt;
      return;
    }
    b.y = b.baseY + Math.sin(b.t * 1.5) * 14 * this.scale;
    b.attackTimer -= dt * this.slowFactor;
    if (b.attackTimer <= 0) {
      this.bossAttack(b);
      const speed = b.def.pattern === "spiral" ? 1.7 : 2.0;
      b.attackTimer = rand(speed * 0.8, speed * 1.25);
      if (Math.random() < 0.4) {
        this.popup(
          b.x + b.w * 0.5,
          b.y - 10,
          pick(b.def.taunts),
          b.def.accent,
          2,
          13 * this.scale,
        );
      }
    }
    b.minionTimer -= dt;
    if (b.minionTimer <= 0) {
      b.minionTimer = rand(5, 8);
      if (["fog", "ashes", "night"].includes(b.def.pattern)) {
        this.spawnEnemy(ENEMY_DEFS[b.def.pattern === "fog" ? "hound" : "blob"], b.x);
      }
    }
    const rect = this.playerRect();
    if (
      b.x < rect.x + rect.w &&
      b.x + b.w > rect.x &&
      b.y < rect.y + rect.h &&
      b.y + b.h > rect.y
    ) {
      this.hurt(30);
    }
  }

  private bossAttack(b: Boss) {
    const cx = b.x + b.w * 0.5;
    const cy = b.y + b.h * 0.42;
    const color = b.def.accent;
    const s = this.scale;
    const aimed = (spread = 0, count = 1, speed = 300) => {
      const rect = this.playerRect();
      const tx = rect.x + rect.w / 2;
      const ty = rect.y + rect.h / 2;
      const base = Math.atan2(ty - cy, tx - cx);
      for (let i = 0; i < count; i++) {
        const a = base + (i - (count - 1) / 2) * spread;
        this.projectiles.push({
          uid: this.uid++,
          x: cx,
          y: cy,
          vx: Math.cos(a) * speed * s,
          vy: Math.sin(a) * speed * s,
          r: 9 * s,
          color,
          damage: 18,
          kind: "aimed",
          t: 0,
        });
      }
    };
    const radial = (count: number, speed = 190) => {
      for (let i = 0; i < count; i++) {
        const a = (i / count) * TAU + b.t;
        this.projectiles.push({
          uid: this.uid++,
          x: cx,
          y: cy,
          vx: Math.cos(a) * speed * s,
          vy: Math.sin(a) * speed * s,
          r: 8 * s,
          color,
          damage: 16,
          kind: "radial",
          t: 0,
        });
      }
    };
    const groundWave = () => {
      this.projectiles.push({
        uid: this.uid++,
        x: cx,
        y: this.groundY - 16 * s,
        vx: -360 * s,
        vy: 0,
        r: 20 * s,
        color,
        damage: 22,
        kind: "ground",
        t: 0,
      });
    };
    switch (b.def.pattern) {
      case "fog":
        aimed(0.18, 3, 250);
        if (Math.random() < 0.5) groundWave();
        break;
      case "spiral":
        radial(10, 175);
        if (Math.random() < 0.4) aimed(0.14, 2, 300);
        break;
      case "judge":
        groundWave();
        if (Math.random() < 0.6) aimed(0.1, 2, 330);
        break;
      case "ashes":
        groundWave();
        if (Math.random() < 0.5) {
          groundWave();
          this.projectiles[this.projectiles.length - 1].x += 100 * s;
        }
        if (Math.random() < 0.35) aimed(0.2, 3, 220);
        break;
      case "night": {
        const r = Math.random();
        if (r < 0.34) radial(12, 165);
        else if (r < 0.67) {
          groundWave();
          aimed(0.12, 3, 300);
        } else {
          aimed(0.25, 5, 240);
        }
        break;
      }
    }
    this.sfx.boss();
  }

  private fireAtPlayer(x: number, y: number, speed: number, color: string) {
    const rect = this.playerRect();
    const tx = rect.x + rect.w / 2;
    const ty = rect.y + rect.h / 2;
    const a = Math.atan2(ty - y, tx - x);
    this.projectiles.push({
      uid: this.uid++,
      x,
      y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      r: 8 * this.scale,
      color,
      damage: 16,
      kind: "aimed",
      t: 0,
    });
  }

  private fireRadial(x: number, y: number, count: number, speed: number, color: string) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * TAU + Math.random() * 0.3;
      this.projectiles.push({
        uid: this.uid++,
        x,
        y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        r: 7 * this.scale,
        color,
        damage: 14,
        kind: "radial",
        t: 0,
      });
    }
  }

  private damageEnemy(e: Enemy, amount: number) {
    if (e.dead) return;
    e.hp -= amount;
    e.hitFlash = 1;
    if (e.hp > 0) {
      this.burst(e.x + e.w / 2, e.y + e.h / 2, e.def.accent, 4);
      return;
    }
    e.dead = true;
    this.enemiesDefeated++;
    this.combo++;
    this.comboTimer = 3;
    const gain = e.def.xp * (1 + this.combo * 0.04);
    this.addXp(gain);
    this.burst(e.x + e.w / 2, e.y + e.h / 2, e.def.accent, 14);
    this.popup(
      e.x + e.w / 2,
      e.y,
      `+${Math.round(gain)}`,
      e.def.accent,
      0.9,
      14 * this.scale,
    );
    this.sfx.spark();
    haptic(this.opts.haptics, 10);
    if (e.def.kind === "blob") {
      for (let i = 0; i < 2; i++) {
        this.spawnEnemy(ENEMY_DEFS.worry, e.x + i * 20);
      }
    }
    if (Math.random() < 0.55) {
      this.pickups.push({
        uid: this.uid++,
        kind: "spark",
        x: e.x + e.w / 2,
        y: e.y + e.h / 2,
        baseY: e.y + e.h / 2,
        r: 10 * this.scale,
        t: 0,
        taken: false,
      });
    }
  }

  private damageBoss(amount: number) {
    const b = this.boss;
    if (!b || b.dead) return;
    b.hp -= amount;
    b.hitFlash = 1;
    this.shake = Math.max(this.shake, 5);
    this.burst(
      b.x + rand(0.2, 0.8) * b.w,
      b.y + rand(0.2, 0.8) * b.h,
      b.def.accent,
      5,
    );
    if (b.hp <= 0) {
      this.appearance.add(.1, -.05);
      this.coping.recover(25);
      this.coping.hits = [];
      b.hp = 0;
      b.dead = true;
      this.burst(b.x + b.w / 2, b.y + b.h / 2, b.def.accent, 70);
      this.burst(b.x + b.w / 2, b.y + b.h / 2, "#ffffff", 30);
      this.shake = 22;
      this.flash = 0.5;
      this.addXp(this.mode === "chapter" ? 90 : 70);
      this.sfx.win();
      haptic(this.opts.haptics, [40, 60, 40, 60, 80]);
      this.projectiles = [];
      if (this.mode === "chapter") {
        this.phase = "complete";
        this.phaseTimer = 1.5;
      } else {
        this.bossResumeTimer = 1.5;
        this.cb.onToast("The road opens again.", "good");
      }
    }
    this.emitSnapshot();
  }

  private resumeAfterEndlessBoss() {
    this.boss = null;
    this.phase = "run";
    this.bossThreshold += 900;
    this.spawnTimer = 1.2;
    this.emitSnapshot();
  }

  private hurt(amount: number) {
    if (
      this.paused ||
      this.phase === "dead" ||
      this.phase === "complete" ||
      this.invulnTimer > 0 ||
      this.shieldTimer > 0
      || ((this.coping.effect === "connect" || this.coping.effect === "bottle") && this.coping.boosting)
    )
      return;
    const protection = this.coping.effect === "compassion" && this.coping.boosting ? 0.8 : 1;
    const dmg = Math.max(1, Math.round(amount * (1 - this.stats.damageReduce) * protection * (this.satire.effect === "orders" ? .7 : 1)));
    this.hp -= dmg;
    this.appearance.stumble();
    this.invulnTimer = 1.15;
    this.shake = 16;
    this.flash = 0.32;
    this.combo = 0;
    this.sfx.hit();
    haptic(this.opts.haptics, [30, 30, 60]);
    this.popup(
      this.player.x,
      this.player.y - 80 * this.scale,
      `-${dmg}`,
      "#ff8a9a",
      1,
      18 * this.scale,
    );
    this.burst(this.player.x, this.player.y - 26 * this.scale, "#ff8a9a", 12);
    if (this.hp <= 0) this.die();
    else if (this.coping.stumble()) this.offerCoping(true);
    this.emitSnapshot();
  }

  private die() {
    if (this.phase === "dead" || this.phase === "complete") return;
    this.phase = "dead";
    this.phaseTimer = 1.4;
    this.hp = 0;
    this.sfx.lose();
    haptic(this.opts.haptics, [60, 40, 120]);
    this.shake = 24;
    this.burst(this.player.x, this.player.y - 26 * this.scale, this.chapter.accent, 50);
    this.emitSnapshot();
  }

  private emitSnapshot() {
    this.cb.onSnapshot({
      phase: this.phase,
      mode: this.mode,
      hp: Math.max(0, Math.round(this.hp)),
      maxHp: Math.round(this.maxHp),
      focus: Math.round(this.focus),
      maxFocus: this.maxFocus,
      distance: Math.floor(this.distance),
      target:
        this.mode === "chapter"
          ? Math.round(this.target)
          : Math.round(this.bossThreshold),
      level: this.level,
      xp: Math.round(this.xp),
      xpToNext: Math.round(this.xpToNext),
      boss: this.boss
        ? {
            name: this.boss.def.name,
            title: this.boss.def.title,
            hp: Math.max(0, Math.round(this.boss.hp)),
            maxHp: this.boss.maxHp,
          }
        : null,
      shield: this.shieldTimer,
      activeCooldown: this.activeCooldown,
      activeMax: this.activeMax,
      activeName: this.active?.name ?? null,
      combo: this.combo,
      enemiesDefeated: this.enemiesDefeated,
      sparks: this.sparksCollected,
      time: Math.round(this.elapsed),
      strain: Math.round(this.coping.strain),
      mentalState: strainState(this.coping.strain),
      coping: this.coping.effect ? { id: this.coping.effect, remaining: this.coping.remaining, aftermath: this.coping.aftermath } : null,
      appearance: { radiance: this.appearance.radiance, echo: this.appearance.echo, bone: this.appearance.bone, form: this.appearance.form },
      satire: SATIRE_ENABLED ? { stage:this.satire.stage, effect:this.satire.effect, remaining:this.satire.remaining, aftermath:this.satire.aftermath,charges:this.satire.charges } : null,
    });
  }

  private dust(x: number, y: number, n: number) {
    for (let i = 0; i < n; i++) {
      this.particles.push({
        x: x + rand(-12, 12),
        y: y - rand(0, 6),
        vx: rand(-90, 40),
        vy: rand(-90, -10),
        life: rand(0.25, 0.6),
        maxLife: 0.6,
        size: rand(1.5, 3.5) * this.scale,
        color: "#b9c7d6",
        shape: "circle",
        gravity: 220,
        rot: 0,
      });
    }
  }

  private burst(x: number, y: number, color: string, n: number) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU);
      const sp = rand(40, 260) * this.scale;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: rand(0.3, 0.9),
        maxLife: 0.9,
        size: rand(1.5, 4.5) * this.scale,
        color,
        shape: Math.random() < 0.4 ? "spark" : "circle",
        gravity: 120,
        rot: rand(0, TAU),
      });
    }
  }

  private ringBurst(x: number, y: number, color: string, n: number) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * 180 * this.scale,
        vy: Math.sin(a) * 180 * this.scale,
        life: 0.7,
        maxLife: 0.7,
        size: rand(2, 5) * this.scale,
        color,
        shape: "spark",
        gravity: 0,
        rot: a,
      });
    }
  }

  private popup(
    x: number,
    y: number,
    text: string,
    color: string,
    life: number,
    size: number,
  ) {
    this.popups.push({ x, y, text, life, maxLife: life, color, vy: -38, size });
  }

  // ---------------------------------------------------------------- rendering

  private render() {
    const ctx = this.ctx;
    const { W, H } = this;
    ctx.save();
    ctx.clearRect(0, 0, W, H);
    if (this.shake > 0.5 && !this.opts.reduceMotion) {
      ctx.translate(rand(-this.shake, this.shake), rand(-this.shake, this.shake));
    }
    this.drawBackground(ctx);
    this.drawGround(ctx);
    for (const p of this.pickups) this.drawPickup(ctx, p);
    for (const o of this.obstacles) this.drawObstacle(ctx, o);
    for (const e of this.enemies) this.drawEnemy(ctx, e);
    if (this.boss) this.drawBoss(ctx, this.boss);
    for (const p of this.projectiles) this.drawProjectile(ctx, p);
    for (const w of this.waves) this.drawWave(ctx, w);
    if (this.phase !== "dead") this.drawPlayer(ctx);
    for (const p of this.particles) this.drawParticle(ctx, p);
    for (const p of this.popups) this.drawPopup(ctx, p);
    ctx.restore();

    if (this.flash > 0 && !this.opts.reduceMotion) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.5, this.flash);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    this.drawVignette(ctx);
  }

  private drawBackground(ctx: CanvasRenderingContext2D) {
    const { W, H } = this;
    const a = "#080d16", b = "#171b2b", c = this.coping.strain > 55 ? "#493047" : "#303044";
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, a);
    g.addColorStop(0.55, b);
    g.addColorStop(1, c);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    const def = this.coping.def;
    const strain = this.coping.strain / 100;
    const tint = def?.color ?? (strain > 0.65 ? "#873e73" : "#415774");
    ctx.save();
    ctx.globalAlpha = def ? 0.15 : 0.05 + strain * 0.14;
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, W, this.groundY);
    // Fractures stay in the distant sky, never across the playable lane.
    ctx.strokeStyle = def?.color ?? "#b59abf";
    ctx.globalAlpha = 0.08 + strain * 0.2;
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const x = W * (i < 3 ? 0.04 + i * 0.065 : 0.82 + (i - 3) * 0.06);
      const drift = this.opts.reduceMotion ? 0 : Math.sin(this.elapsed * 0.3 + i) * strain * 12;
      ctx.beginPath();
      ctx.moveTo(x + drift, 0);
      ctx.lineTo(x - 18, H * 0.12);
      ctx.lineTo(x + 12 + drift, H * (0.18 + strain * 0.12));
      ctx.stroke();
    }
    ctx.restore();

    for (const s of this.stars.slice(0, 32)) {
      const x = ((s.x * W - this.scroll * s.sp * 0.04) % W + W) % W;
      const y = s.y * H;
      const tw = 0.5 + 0.5 * Math.sin(this.elapsed * 1.5 + s.tw);
      ctx.globalAlpha = 0.12 + tw * 0.25;
      ctx.fillStyle = "#eaf2ff";
      ctx.beginPath();
      ctx.arc(x, y, s.s, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    const mx = W * 0.78;
    const my = H * 0.2;
    const glow = ctx.createRadialGradient(mx, my, 0, mx, my, 130 * this.scale);
    glow.addColorStop(0, "rgba(255,255,255,0.18)");
    glow.addColorStop(0.25, "rgba(200,220,255,0.06)");
    glow.addColorStop(1, "rgba(200,220,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(mx - 140 * this.scale, my - 140 * this.scale, 280 * this.scale, 280 * this.scale);
    ctx.fillStyle = "#f2f6ff";
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.arc(mx, my, 30 * this.scale, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;

    // An inhabited absence: silhouettes stay behind the collision corridor.
    ctx.fillStyle = "#10131f";
    for (let i = 0; i < 12; i++) {
      const x = ((i * W / 8 - this.scroll * 0.035) % (W + 100) + W + 100) % (W + 100) - 50;
      const top = H * (0.46 + (i % 4) * 0.035);
      ctx.fillRect(x, top, 32 + (i % 3) * 16, this.groundY - top);
    }
    ctx.strokeStyle = "#10131b";
    ctx.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      const x = ((i * W / 4 - this.scroll * 0.09) % (W + 100) + W + 100) % (W + 100) - 50;
      ctx.beginPath(); ctx.moveTo(x, this.groundY); ctx.lineTo(x - 5, H * .49);
      ctx.moveTo(x - 5, H * .57); ctx.lineTo(x - 25, H * .52);
      ctx.moveTo(x - 4, H * .61); ctx.lineTo(x + 19, H * .55); ctx.stroke();
    }

    const layers = [
      { amp: 34, base: 90, speed: 0.06, color: this.chapter.ground, alpha: 0.55 },
      { amp: 52, base: 55, speed: 0.11, color: "#0a0f1c", alpha: 0.45 },
      { amp: 70, base: 24, speed: 0.2, color: "#05080f", alpha: 0.4 },
    ];
    layers.forEach((l, li) => {
      ctx.beginPath();
      ctx.moveTo(0, this.groundY);
      for (let x = 0; x <= W + 20; x += 18) {
        const y =
          this.groundY -
          (l.base + li * 12) * this.scale +
          Math.sin((x + this.scroll * l.speed) / (110 + li * 40)) * l.amp * this.scale +
          Math.sin((x + this.scroll * l.speed * 1.7) / (57 + li * 20)) * l.amp * 0.4 * this.scale;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, this.groundY);
      ctx.closePath();
      ctx.globalAlpha = l.alpha;
      ctx.fillStyle = l.color;
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    const wx = W * .78, wy = H * .57;
    const windowGlow = ctx.createRadialGradient(wx, wy, 1, wx, wy, 45 * this.scale);
    windowGlow.addColorStop(0, "#e6ad6244"); windowGlow.addColorStop(1, "#e6ad6200");
    ctx.fillStyle = windowGlow; ctx.fillRect(wx - 50, wy - 50, 100, 100);
    ctx.fillStyle = "#d7a76b"; ctx.fillRect(wx, wy, 5 * this.scale, 9 * this.scale);
    if (SATIRE_ENABLED && this.satire.stage > 0) {
      ctx.save(); ctx.fillStyle = "#171621"; ctx.strokeStyle = "#a890a0";
      ctx.fillRect(W * .43, H * .39, W * .48, 28 * this.scale);
      ctx.font = `${Math.max(9,11*this.scale)}px monospace`; ctx.fillStyle = "#d7c3b3";
      ctx.fillText(this.satire.stage === 2 ? "REVELATIONS: TAKE A NUMBER" : "INNER PEACE: PAYMENT OVERDUE", W*.45,H*.39+18*this.scale);
      ctx.restore();
    }
  }

  private drawGround(ctx: CanvasRenderingContext2D) {
    const { W, H } = this;
    const g = ctx.createLinearGradient(0, this.groundY, 0, H);
    g.addColorStop(0, this.chapter.ground);
    g.addColorStop(1, "#05070d");
    ctx.fillStyle = g;
    ctx.fillRect(0, this.groundY, W, H - this.groundY);

    ctx.strokeStyle = this.chapter.accent;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, this.groundY);
    ctx.lineTo(W, this.groundY);
    ctx.stroke();
    ctx.globalAlpha = 1;

    const gap = 64 * this.scale;
    const off = this.scroll % gap;
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 1;
    for (let x = -off; x < W; x += gap) {
      ctx.beginPath();
      ctx.moveTo(x, this.groundY + 10);
      ctx.lineTo(x - 26, this.groundY + 46 * this.scale);
      ctx.stroke();
    }
  }

  private drawPlayer(ctx: CanvasRenderingContext2D) {
    const p = this.player;
    const s = this.scale;
    const h = p.sliding ? 30 * s : 54 * s;
    const x = p.x;
    const feet = p.y;
    const bodyTop = feet - h;
    const blink = this.invulnTimer > 0 && Math.floor(this.invulnTimer * 14) % 2 === 0;
    const accent = this.coping.def?.color ?? (this.coping.strain >= 65 ? "#efadc8" : this.chapter.accent);

    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(x, this.groundY + 2, 24 * s, 6 * s, 0, 0, TAU);
    ctx.fill();
    ctx.restore();

    const glow = ctx.createRadialGradient(x, bodyTop + h / 2, 0, x, bodyTop + h / 2, 70 * s);
    glow.addColorStop(0, "rgba(180,240,255,0.16)");
    glow.addColorStop(1, "rgba(180,240,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(x - 80 * s, bodyTop - 30 * s, 160 * s, h + 70 * s);

    if (blink) ctx.globalAlpha = 0.4;

    const presence = Math.max(this.appearance.radiance, this.appearance.echo, this.appearance.bone);
    ctx.save();
    ctx.globalAlpha *= 1 - Math.min(.65, presence * .72);

    ctx.save();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3 * s;
    ctx.lineCap = "round";
    ctx.globalAlpha *= 0.85;
    const stride = Math.sin(p.runCycle) * (p.onGround ? 13 : 5) * s;
    ctx.beginPath();
    if (p.sliding) {
      ctx.moveTo(x - 4 * s, feet - 8 * s);
      ctx.lineTo(x - 26 * s, feet - 3 * s);
      ctx.moveTo(x - 2 * s, feet - 8 * s);
      ctx.lineTo(x + 18 * s, feet - 2 * s);
    } else {
      ctx.moveTo(x, feet - 18 * s);
      ctx.lineTo(x + stride, feet);
      ctx.moveTo(x, feet - 18 * s);
      ctx.lineTo(x - stride, feet);
    }
    ctx.stroke();
    ctx.restore();

    ctx.save();
    const bodyGrad = ctx.createLinearGradient(x, bodyTop, x, feet);
    bodyGrad.addColorStop(0, "#eafcff");
    bodyGrad.addColorStop(0.45, accent);
    bodyGrad.addColorStop(1, "#16324a");
    ctx.fillStyle = bodyGrad;
    roundRect(ctx, x - 15 * s, bodyTop + 8 * s, 29 * s, h - 12 * s, 8 * s);
    ctx.fill();

    ctx.fillStyle = "#f4ffff";
    ctx.beginPath();
    ctx.arc(x + 2 * s, bodyTop + 11 * s, 11 * s, 0, TAU);
    ctx.fill();

    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(x + 5 * s, bodyTop + 10 * s, 4 * s, 0, TAU);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(x - 10 * s, bodyTop + 26 * s);
    ctx.bezierCurveTo(
      x - 40 * s,
      bodyTop + 20 * s + Math.sin(p.runCycle * 1.3) * 8 * s,
      x - 60 * s,
      bodyTop + 40 * s,
      x - 86 * s,
      bodyTop + 22 * s + Math.sin(p.runCycle * 1.1) * 10 * s,
    );
    ctx.stroke();
    ctx.restore();

    ctx.restore();
    drawAppearance(ctx, this.appearance, x, feet, h, s, p.runCycle, this.opts.reduceMotion,
      this.coping.effect, this.coping.aftermath,
      this.satire.effect ? { id:this.satire.effect, aftermath:this.satire.aftermath,remaining:this.satire.remaining,charges:this.satire.charges } : this.appearance.cue?.color === '#a4d9f0' ? {id:'water',aftermath:false,remaining:this.appearance.cue.remaining} : null);

    if (this.shieldTimer > 0) {
      ctx.save();
      ctx.strokeStyle = "#9fe0ff";
      ctx.globalAlpha = 0.5 + 0.2 * Math.sin(this.elapsed * 8);
      ctx.lineWidth = 2.5 * s;
      ctx.beginPath();
      ctx.arc(x, bodyTop + h / 2, 46 * s, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }

    if (this.dashTimer > 0) {
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = this.active?.color ?? accent;
      for (let i = 1; i <= 3; i++) {
        roundRect(ctx, x - 13 * s - i * 18 * s, bodyTop + 8 * s, 26 * s, h - 12 * s, 12 * s);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  private drawObstacle(ctx: CanvasRenderingContext2D, o: Obstacle) {
    const s = this.scale;
    ctx.save();
    if (o.hitFlash > 0) {
      ctx.globalAlpha = 0.5 + 0.5 * o.hitFlash;
    }
    if (o.kind === "rock") {
      ctx.fillStyle = "#2a3648";
      ctx.strokeStyle = "#4a5d74";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(o.x, o.y + o.h);
      ctx.lineTo(o.x + o.w * 0.12, o.y + o.h * 0.25);
      ctx.lineTo(o.x + o.w * 0.45, o.y);
      ctx.lineTo(o.x + o.w * 0.8, o.y + o.h * 0.18);
      ctx.lineTo(o.x + o.w, o.y + o.h);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.beginPath();
      ctx.moveTo(o.x + o.w * 0.3, o.y + o.h * 0.4);
      ctx.lineTo(o.x + o.w * 0.55, o.y + o.h * 0.7);
      ctx.stroke();
    } else if (o.kind === "branch") {
      ctx.fillStyle = "#20304a";
      ctx.strokeStyle = "#587091";
      ctx.lineWidth = 2;
      roundRect(ctx, o.x, o.y, o.w, o.h, 8 * s);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.beginPath();
      ctx.moveTo(o.x + 8 * s, o.y + o.h / 2);
      ctx.lineTo(o.x + o.w - 8 * s, o.y + o.h / 2);
      ctx.stroke();
      ctx.fillStyle = "#587091";
      for (let i = 0; i < 3; i++) {
        const bx = o.x + 10 * s + i * (o.w - 20 * s) / 2;
        ctx.beginPath();
        ctx.moveTo(bx, o.y + o.h);
        ctx.lineTo(bx - 4 * s, o.y + o.h + 14 * s);
        ctx.lineTo(bx + 6 * s, o.y + o.h);
        ctx.fill();
      }
    } else {
      const g = ctx.createLinearGradient(0, o.y, 0, o.y + o.h);
      g.addColorStop(0, "rgba(90,70,140,0.8)");
      g.addColorStop(1, "rgba(30,20,60,0.9)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(o.x + o.w / 2, o.y + o.h / 2, o.w / 2, o.h / 2, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "rgba(180,160,255,0.4)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(o.x + o.w / 2, o.y + o.h / 2, o.w / 3, o.h / 3, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy) {
    const s = this.scale;
    const cx = e.x + e.w / 2;
    const cy = e.y + e.h / 2;
    ctx.save();
    ctx.globalAlpha = 0.9;
    if (e.hitFlash > 0) {
      ctx.shadowColor = "#fff";
      ctx.shadowBlur = 18;
    }
    const body = e.hitFlash > 0.5 ? "#ffffff" : e.def.color;
    const accent = e.def.accent;

    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(cx, this.groundY + 2, e.w * 0.45, 5 * s, 0, 0, TAU);
    ctx.fill();

    switch (e.def.kind) {
      case "wisp": {
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.moveTo(cx, e.y);
        ctx.bezierCurveTo(e.x + e.w, e.y + e.h * 0.2, e.x + e.w, e.y + e.h, cx, e.y + e.h);
        ctx.bezierCurveTo(e.x, e.y + e.h, e.x, e.y + e.h * 0.2, cx, e.y);
        ctx.fill();
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(cx - 7 * s, cy - 2 * s, 2.6 * s, 0, TAU);
        ctx.arc(cx + 7 * s, cy - 2 * s, 2.6 * s, 0, TAU);
        ctx.fill();
        break;
      }
      case "hound": {
        ctx.fillStyle = body;
        roundRect(ctx, e.x, e.y + e.h * 0.25, e.w, e.h * 0.6, 10 * s);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(e.x + e.w * 0.82, e.y + e.h * 0.35, e.h * 0.34, 0, TAU);
        ctx.fill();
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(e.x + e.w * 0.9, e.y + e.h * 0.3, 3 * s, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = body;
        ctx.lineWidth = 4 * s;
        for (let i = 0; i < 3; i++) {
          const lx = e.x + 10 * s + i * e.w * 0.28;
          ctx.beginPath();
          ctx.moveTo(lx, e.y + e.h * 0.8);
          ctx.lineTo(lx + Math.sin(e.t * 10 + i) * 5 * s, e.y + e.h);
          ctx.stroke();
        }
        break;
      }
      case "bat": {
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.ellipse(cx, cy, e.w * 0.3, e.h * 0.45, 0, 0, TAU);
        ctx.fill();
        const flap = Math.sin(e.t * 14) * 0.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.quadraticCurveTo(e.x - 10 * s, cy - 20 * s * flap, e.x, cy + 10 * s);
        ctx.quadraticCurveTo(cx - 10 * s, cy + 6 * s, cx, cy);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.quadraticCurveTo(e.x + e.w + 10 * s, cy - 20 * s * flap, e.x + e.w, cy + 10 * s);
        ctx.quadraticCurveTo(cx + 10 * s, cy + 6 * s, cx, cy);
        ctx.fill();
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(cx - 5 * s, cy - 2 * s, 2.4 * s, 0, TAU);
        ctx.arc(cx + 5 * s, cy - 2 * s, 2.4 * s, 0, TAU);
        ctx.fill();
        break;
      }
      case "critic": {
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.moveTo(cx, e.y);
        ctx.lineTo(e.x + e.w, e.y + e.h);
        ctx.lineTo(e.x, e.y + e.h);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx, e.y + 12 * s, 12 * s, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = accent;
        ctx.lineWidth = 3 * s;
        ctx.beginPath();
        ctx.moveTo(cx, e.y + 30 * s);
        ctx.lineTo(cx - 22 * s, e.y + 44 * s);
        ctx.stroke();
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(cx - 4 * s, e.y + 10 * s, 2.6 * s, 0, TAU);
        ctx.arc(cx + 4 * s, e.y + 10 * s, 2.6 * s, 0, TAU);
        ctx.fill();
        break;
      }
      case "blob": {
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.moveTo(e.x, e.y + e.h);
        ctx.bezierCurveTo(e.x - 8 * s, e.y + e.h * 0.3, e.x + e.w * 0.2, e.y, cx, e.y + 4 * s);
        ctx.bezierCurveTo(e.x + e.w * 0.8, e.y, e.x + e.w + 8 * s, e.y + e.h * 0.3, e.x + e.w, e.y + e.h);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(cx - 12 * s, cy, 4 * s, 0, TAU);
        ctx.arc(cx + 12 * s, cy, 4 * s, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = accent;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(cx, cy + 12 * s, 8 * s, 0, Math.PI);
        ctx.stroke();
        break;
      }
      case "spiral": {
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.arc(cx, cy, e.w * 0.46, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = accent;
        ctx.lineWidth = 2.5 * s;
        ctx.beginPath();
        for (let i = 0; i < 46; i++) {
          const a = i * 0.32 + e.t * 2;
          const r = (i / 46) * e.w * 0.42;
          const x = cx + Math.cos(a) * r;
          const y = cy + Math.sin(a) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        break;
      }
    }
    if (e.def.hp > 1) {
      const pips = e.def.hp;
      for (let i = 0; i < pips; i++) {
        ctx.fillStyle = i < e.hp ? accent : "rgba(255,255,255,0.15)";
        ctx.beginPath();
        ctx.arc(e.x + (i + 0.5) * (e.w / pips), e.y - 8 * s, 2.4 * s, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  private drawBoss(ctx: CanvasRenderingContext2D, b: Boss) {
    const s = this.scale;
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const accent = b.def.accent;
    ctx.save();
    const aura = ctx.createRadialGradient(cx, cy, 0, cx, cy, b.w * 0.95);
    aura.addColorStop(0, `${accent}33`);
    aura.addColorStop(1, `${accent}00`);
    ctx.fillStyle = aura;
    ctx.fillRect(b.x - b.w, b.y - b.h * 0.4, b.w * 3, b.h * 2);
    if (b.hitFlash > 0) {
      ctx.shadowColor = "#fff";
      ctx.shadowBlur = 30;
    }
    ctx.fillStyle = b.hitFlash > 0.5 ? "#ffffff" : b.def.color;
    ctx.beginPath();
    ctx.moveTo(cx, b.y);
    ctx.bezierCurveTo(b.x + b.w * 1.05, b.y + b.h * 0.15, b.x + b.w * 1.1, b.y + b.h * 0.9, cx, b.y + b.h);
    ctx.bezierCurveTo(b.x - b.w * 0.1, b.y + b.h * 0.9, b.x - b.w * 0.05, b.y + b.h * 0.15, cx, b.y);
    ctx.fill();

    ctx.fillStyle = accent;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 22;
    const eyeY = b.y + b.h * 0.32;
    ctx.beginPath();
    ctx.ellipse(cx - 26 * s, eyeY, 9 * s, 13 * s, -0.2, 0, TAU);
    ctx.ellipse(cx + 26 * s, eyeY, 9 * s, 13 * s, 0.2, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;

    if (b.def.pattern === "spiral") {
      ctx.strokeStyle = accent;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 2;
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.arc(cx, cy, b.w * (0.5 + k * 0.16), b.t * (0.5 + k * 0.2), b.t * (0.5 + k * 0.2) + 2.2);
        ctx.stroke();
      }
    } else if (b.def.pattern === "judge") {
      ctx.strokeStyle = accent;
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = 4 * s;
      ctx.beginPath();
      ctx.moveTo(cx - 34 * s, b.y + b.h * 0.72);
      ctx.lineTo(cx + 34 * s, b.y + b.h * 0.72);
      ctx.stroke();
    } else if (b.def.pattern === "ashes") {
      for (let i = 0; i < 6; i++) {
        const a = b.t * 1.2 + (i / 6) * TAU;
        ctx.fillStyle = accent;
        ctx.globalAlpha = 0.3 + 0.2 * Math.sin(b.t * 3 + i);
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * b.w * 0.5, cy + Math.sin(a) * b.h * 0.3, 4 * s, 0, TAU);
        ctx.fill();
      }
    } else if (b.def.pattern === "night") {
      ctx.fillStyle = accent;
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU + b.t * 0.2;
        const r = b.w * (0.55 + 0.1 * Math.sin(b.t + i));
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.6, 2 * s, 0, TAU);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  private drawProjectile(ctx: CanvasRenderingContext2D, p: Projectile) {
    if (p.kind === "calm") {
      ctx.save();
      const trail = 54 * this.scale;
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.atan2(p.vy, p.vx));
      const grad = ctx.createLinearGradient(-trail, 0, p.r, 0);
      grad.addColorStop(0, `${p.color}00`);
      grad.addColorStop(0.7, p.color);
      grad.addColorStop(1, "#ffffff");
      ctx.strokeStyle = grad;
      ctx.lineCap = "round";
      ctx.lineWidth = 6 * this.scale;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.moveTo(-trail, 0);
      ctx.lineTo(0, 0);
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(0, 0, p.r * 0.5, 0, TAU);
      ctx.fill();
      ctx.restore();
      return;
    }
    ctx.save();
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.3, p.color);
    g.addColorStop(1, `${p.color}00`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * 3, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * 0.5, 0, TAU);
    ctx.fill();
    if (p.kind === "ground") {
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 1.6, Math.PI, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawWave(ctx: CanvasRenderingContext2D, w: Wave) {
    const a = Math.max(0, w.life / w.maxLife);
    ctx.save();
    ctx.globalAlpha = a * 0.8;
    ctx.strokeStyle = w.color;
    ctx.lineWidth = 3 * this.scale * a + 0.5;
    ctx.beginPath();
    ctx.arc(w.x, w.y, w.r, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = a * 0.18;
    ctx.fillStyle = w.color;
    ctx.beginPath();
    ctx.arc(w.x, w.y, w.r, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  private drawPickup(ctx: CanvasRenderingContext2D, p: Pickup) {
    const s = this.scale;
    const pulse = this.opts.reduceMotion ? 1 : 1 + Math.sin(p.t * 4) * 0.08;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(pulse, pulse);
    const colors: Record<PickupKind, string> = {
      spark: "#ffe08a",
      breath: "#8ecbff",
      heart: "#ff9db0",
      shield: "#9fe0ff",
    };
    const color = colors[p.kind];
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, p.r * 2.6);
    glow.addColorStop(0, `${color}88`);
    glow.addColorStop(1, `${color}00`);
    ctx.fillStyle = glow;
    ctx.fillRect(-p.r * 3, -p.r * 3, p.r * 6, p.r * 6);
    ctx.fillStyle = color;
    if (p.kind === "spark") {
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        const r = i % 2 === 0 ? p.r : p.r * 0.4;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    } else if (p.kind === "breath") {
      ctx.beginPath();
      ctx.arc(0, 0, p.r, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "#0b1026";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, p.r * 0.55, 0.4, Math.PI * 1.6);
      ctx.stroke();
    } else if (p.kind === "heart") {
      ctx.beginPath();
      ctx.moveTo(0, p.r * 0.7);
      ctx.bezierCurveTo(-p.r * 1.3, -p.r * 0.2, -p.r * 0.5, -p.r, 0, -p.r * 0.35);
      ctx.bezierCurveTo(p.r * 0.5, -p.r, p.r * 1.3, -p.r * 0.2, 0, p.r * 0.7);
      ctx.fill();
    } else {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU - Math.PI / 2;
        const x = Math.cos(a) * p.r;
        const y = Math.sin(a) * p.r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#0b1026";
      ctx.beginPath();
      ctx.arc(0, 0, p.r * 0.35, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    void s;
  }

  private drawParticle(ctx: CanvasRenderingContext2D, p: Particle) {
    const a = Math.max(0, p.life / p.maxLife);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    if (p.shape === "spark") {
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillRect(-p.size * 0.5, -p.size * 2, p.size, p.size * 4);
    } else if (p.shape === "square") {
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawPopup(ctx: CanvasRenderingContext2D, p: Popup) {
    const a = Math.max(0, p.life / p.maxLife);
    ctx.save();
    ctx.globalAlpha = Math.min(1, a * 1.6);
    ctx.font = `600 ${p.size}px "Space Grotesk", system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillText(p.text, p.x + 1, p.y + 1);
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, p.x, p.y);
    ctx.restore();
  }

  private drawVignette(ctx: CanvasRenderingContext2D) {
    const { W, H } = this;
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.78);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.45)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
}
