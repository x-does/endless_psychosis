export type CopingId = "ground" | "compassion" | "connect" | "bottle" | "push" | "numb";
export interface CopingDef {
  id: CopingId;
  name: string;
  kind: "healthy" | "shortcut";
  seconds: number;
  afterSeconds: number;
  strain: number;
  benefit: string;
  cost: string;
  cue: string;
  color: string;
  icon: string;
}

export const COPING: Record<CopingId, CopingDef> = {
  ground: { id: "ground", name: "Name the Present", kind: "healthy", seconds: 4, afterSeconds: 0, strain: -24,
    benefit: "+20 focus; clear hostile projectiles for 4s; −24 strain.", cost: "No focus cost. No after-effect.",
    cue: "Feel the ground. Name one thing you can see.", color: "#7de3cd", icon: "◎" },
  compassion: { id: "compassion", name: "A Kinder Voice", kind: "healthy", seconds: 6, afterSeconds: 0, strain: -16,
    benefit: "+16 health; 20% less incoming damage for 6s; −16 strain.", cost: "No focus cost. No after-effect.",
    cue: "A mistake is an event. It is not your identity.", color: "#ffd296", icon: "♡" },
  connect: { id: "connect", name: "Reach for a Voice", kind: "healthy", seconds: 6, afterSeconds: 0, strain: -20,
    benefit: "Block incoming damage for 6s; −20 strain.", cost: "No focus cost. No after-effect.",
    cue: "You do not have to carry this stretch alone.", color: "#9bdcff", icon: "◈" },
  bottle: { id: "bottle", name: "Bottle It Up", kind: "shortcut", seconds: 6, afterSeconds: 6, strain: 14,
    benefit: "Block incoming damage for 6s.", cost: "+14 strain. No focus regeneration for 12s total (6s after the shield ends).",
    cue: "Nothing gets in. Nothing gets replenished.", color: "#bfafdb", icon: "▣" },
  push: { id: "push", name: "Push Through", kind: "shortcut", seconds: 5, afterSeconds: 7, strain: 18,
    benefit: "Double pulse damage for 5s.", cost: "+18 strain. Then focus regenerates at half speed for 7s.",
    cue: "For a moment, force feels like an answer. Then comes the exhaustion.", color: "#ffa36e", icon: "ϟ" },
  numb: { id: "numb", name: "Tune Out", kind: "shortcut", seconds: 4, afterSeconds: 8, strain: 16,
    benefit: "Threats and the road move 45% slower for 4s.", cost: "+16 strain. Then pulses cost 27 focus instead of 18 for 8s.",
    cue: "The distance feels safe. Reconnecting will take more focus.", color: "#a8baff", icon: "◐" },
};

export const HEALTHY: CopingId[] = ["ground", "compassion", "connect"];
export const SHORTCUTS: CopingId[] = ["bottle", "push", "numb"];
export const strainState = (strain: number) => strain < 30 ? "Anchored" : strain < 65 ? "On edge" : "Fractured";
export function effectPhaseSeconds(id: CopingId, remaining: number, aftermath: boolean) {
  return Math.ceil(Math.max(0, remaining - (aftermath ? 0 : COPING[id].afterSeconds)));
}

/** All clocks use active simulation time, never wall time. Pausing freezes debt too. */
export class CopingState {
  strain = 18;
  time = 0;
  hits: number[] = [];
  nextOffer = 0;
  effect: CopingId | null = null;
  remaining = 0;
  offered = false;
  private calmTime = 0;

  get def() { return this.effect ? COPING[this.effect] : null; }
  get boosting() { return !!this.def && this.remaining > this.def.afterSeconds; }
  get aftermath() { return !!this.def && !this.boosting; }
  get damageMultiplier() { return this.effect === "push" && this.boosting ? 2 : 1; }
  get pulseCost() { return this.effect === "numb" && this.aftermath ? 27 : 18; }
  get regenFactor() {
    if (this.effect === "bottle") return 0;
    if (this.effect === "push" && this.aftermath) return 0.5;
    return 1;
  }
  tick(dt: number) {
    this.time += dt;
    this.calmTime += dt;
    this.hits = this.hits.filter(t => this.time - t <= 12);
    this.remaining = Math.max(0, this.remaining - dt);
    if (!this.remaining) this.effect = null;
    if (this.calmTime > 4 && this.def?.kind !== "shortcut") this.recover(dt * 1.5);
  }
  recover(amount: number) { this.strain = Math.max(0, this.strain - amount); }
  stumble(): boolean {
    this.calmTime = 0;
    this.strain = Math.min(100, this.strain + 12);
    this.hits = [...this.hits.filter(t => this.time - t <= 12), this.time];
    return this.hits.length >= 3 && this.canOffer();
  }
  canOffer() { return !this.offered && !this.effect && this.time >= this.nextOffer; }
  offer() {
    if (!this.canOffer()) return false;
    this.offered = true;
    this.nextOffer = this.time + 24;
    return true;
  }
  choose(id: CopingId | null) {
    if (!this.offered) return false;
    this.offered = false;
    this.hits = [];
    if (id) {
      const def = COPING[id];
      this.effect = id;
      this.remaining = def.seconds + def.afterSeconds;
      this.strain = Math.max(0, Math.min(100, this.strain + def.strain));
    }
    return true;
  }
}

export interface CopingOffer {
  title: string;
  story: string;
  healthy: CopingId;
  shortcut: CopingId;
}

export const SCENARIOS: CopingOffer[] = [
  { title: "The alarm behind the fog", story: "The alarm has stopped, but its echo keeps running. The road narrows around a thought: shut everything out and nothing can touch you. Or name something real and come back to this step.", healthy: "ground", shortcut: "bottle" },
  { title: "Evidence of a mistake", story: "A foot catches. Somewhere in the dark, a gavel falls. The voice demands that you hit harder, prove more, never stumble again. Another voice is quieter: you are allowed to learn without becoming your own punishment.", healthy: "compassion", shortcut: "push" },
  { title: "One light still answers", story: "The night offers distance from everything, even yourself. Ahead, a window is lit. You could tune the world out for a few seconds. Or reach toward the voice on the other side of the dark.", healthy: "connect", shortcut: "numb" },
];
