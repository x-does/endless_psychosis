export interface BonusBat { id: number; reward: "xp" | "heal"; remaining: number; }
export class BonusState {
  bat: BonusBat | null = null;
  private countdown = 20;
  private uid = 0;
  tick(dt: number, running: boolean) {
    if (!running) { this.bat = null; this.countdown = 20; return; }
    if (this.bat) { this.bat.remaining -= dt; if (this.bat.remaining <= 0) this.bat = null; }
    this.countdown -= dt;
    if (this.countdown <= 0 && !this.bat) {
      this.bat = { id: ++this.uid, reward: this.uid % 2 ? "xp" : "heal", remaining: 5 };
      this.countdown = 20;
    }
  }
  claim(id: number) {
    if (!this.bat || this.bat.id !== id) return null;
    const reward = this.bat.reward;
    this.bat = null; return reward;
  }
}
