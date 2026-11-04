let context: AudioContext | undefined;
export function tone(
  kind: "dash" | "skill" | "hit" | "upgrade",
  enabled: boolean,
) {
  if (!enabled) return;
  try {
    context ??= new AudioContext();
    void context.resume().catch(() => {});
    const oscillator = context.createOscillator(),
      gain = context.createGain();
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.type = kind === "hit" ? "triangle" : "sine";
    const now = context.currentTime;
    oscillator.frequency.setValueAtTime(
      kind === "dash"
        ? 440
        : kind === "skill"
          ? 220
          : kind === "upgrade"
            ? 660
            : 100,
      now,
    );
    oscillator.frequency.exponentialRampToValueAtTime(
      kind === "upgrade" ? 990 : 60,
      now + 0.16,
    );
    gain.gain.setValueAtTime(0.045, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    oscillator.start();
    oscillator.stop(now + 0.21);
  } catch {}
}
