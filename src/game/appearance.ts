import type { CopingId } from "./coping";

export type Form = "human" | "mixed" | "radiance" | "echo" | "bone";
export const APPEARANCE_MIX: Record<CopingId, readonly [number, number, number]> = {
  ground: [.35, -.15, 0], compassion: [.3, 0, -.2], connect: [.4, -.15, -.15],
  bottle: [0, .1, .5], push: [.1, 0, .45], numb: [0, .55, 0],
};
const bounded = (v: number) => Math.max(0, Math.min(1, v));

/** Cosmetic memory only. Independent axes never normalize or change physics. */
export class AppearanceState {
  radiance = 0;
  echo = 0;
  bone = 0;
  form: Form = "human";
  cue: { color: string; remaining: number } | null = null;
  private time = 0;
  private damageTimes: number[] = [];

  add(radiance = 0, echo = 0, bone = 0) {
    this.radiance = bounded(this.radiance + radiance);
    this.echo = bounded(this.echo + echo);
    this.bone = bounded(this.bone + bone);
    this.resolveForm();
  }
  apply(id: CopingId) { this.add(...APPEARANCE_MIX[id]); }
  signal(color: string) { this.cue = { color, remaining: 1.2 }; }
  project(delta: readonly [number, number, number]) {
    const next = new AppearanceState();
    next.radiance=this.radiance; next.echo=this.echo; next.bone=this.bone; next.form=this.form;
    next.add(...delta); return next;
  }
  tick(dt: number) {
    this.time += dt;
    if (this.cue) { this.cue.remaining = Math.max(0,this.cue.remaining-dt); if (!this.cue.remaining) this.cue=null; }
    this.add(-.008 * dt, -.008 * dt, -.008 * dt);
  }
  stumble() {
    this.damageTimes = this.damageTimes.filter(t => this.time - t < 12);
    if (this.damageTimes.length >= 4) return;
    this.damageTimes.push(this.time);
    this.add(0, .025, 0);
  }
  private resolveForm() {
    const values = { radiance: this.radiance, echo: this.echo, bone: this.bone };
    const sorted = (Object.keys(values) as (keyof typeof values)[]).sort((a, b) => values[b] - values[a]);
    const [lead, second] = sorted;
    if (values[lead] >= .6 && values[lead] - values[second] >= .15) this.form = lead;
    else if (this.form === "radiance" || this.form === "echo" || this.form === "bone") {
      if (values[this.form] < .45 || (lead !== this.form && values[lead] - values[this.form] >= .15)) this.form = "mixed";
    } else this.form = values[lead] >= .15 ? "mixed" : "human";
  }
}
