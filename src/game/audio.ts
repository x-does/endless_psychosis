type Ctx = AudioContext;

export class Sfx {
  private ctx: Ctx | null = null;
  enabled: boolean;

  constructor(enabled: boolean) {
    this.enabled = enabled;
  }

  private ensure(): Ctx | null {
    if (!this.enabled) return null;
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  unlock() {
    this.ensure();
  }

  setEnabled(v: boolean) {
    this.enabled = v;
    if (!v && this.ctx) void this.ctx.suspend();
    if (v) this.ensure();
  }

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType,
    gain: number,
    slideTo?: number,
    delay = 0,
  ) {
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  private noise(dur: number, gain: number, freq: number) {
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = freq;
    filter.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(filter).connect(g).connect(ctx.destination);
    src.start(t0);
  }

  jump() {
    this.tone(320, 0.16, "sine", 0.06, 520);
  }
  slide() {
    this.noise(0.22, 0.05, 900);
  }
  pulse() {
    this.tone(180, 0.24, "sine", 0.05, 80);
    this.noise(0.12, 0.03, 1600);
  }
  hit() {
    this.tone(90, 0.24, "sawtooth", 0.07, 45);
    this.noise(0.16, 0.06, 240);
  }
  pickup() {
    this.tone(720, 0.12, "triangle", 0.05, 980);
  }
  spark() {
    this.tone(880, 0.08, "sine", 0.03, 1180);
  }
  heal() {
    this.tone(420, 0.35, "sine", 0.05, 640);
    this.tone(520, 0.35, "sine", 0.035, 780, 0.05);
  }
  levelUp() {
    [523, 659, 784, 1046].forEach((f, i) =>
      this.tone(f, 0.5, "sine", 0.05, f * 1.01, i * 0.09),
    );
  }
  technique() {
    this.tone(392, 0.5, "sine", 0.05, 523);
    this.tone(587, 0.6, "sine", 0.035, 784, 0.08);
  }
  boss() {
    this.tone(70, 0.9, "sawtooth", 0.05, 50);
    this.tone(105, 0.9, "sine", 0.04, 70, 0.1);
  }
  win() {
    [523, 659, 784, 1046, 1318].forEach((f, i) =>
      this.tone(f, 0.7, "triangle", 0.05, f, i * 0.12),
    );
  }
  lose() {
    [330, 262, 196, 147].forEach((f, i) =>
      this.tone(f, 0.6, "sine", 0.05, f * 0.98, i * 0.14),
    );
  }
  click() {
    this.tone(540, 0.05, "square", 0.025);
  }
}

export function haptic(enabled: boolean, pattern: number | number[]) {
  if (!enabled) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* noop */
  }
}
