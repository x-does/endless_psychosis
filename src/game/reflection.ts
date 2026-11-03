import type { SatireId } from "./satire";

export interface Reflection { title: string; text: string; }
const REFLECTIONS = {
  ordinary: { title: "Ordinary Morning", text: "No revelation arrived with a receipt. There was water, or simply another step. The morning makes no promises." },
  mixed: { title: "The Shape of a Way Through", text: "You reached for distance, and for something that brought you closer. Neither explains the whole journey. Both happened." },
  certified: { title: "Certified Infinite", text: "Your certificate has no expiry date. Neither do the questions beneath it. Somewhere, a clerk is preparing your renewal." },
  window: { title: "A Window, Not an Answer", text: "For a moment, everything seemed connected. The feeling was real; its explanation remains unfinished." },
  deadline: { title: "A Deadline Is Not a Destination", text: "You answered urgency with more urgency. The clock applauded. It still could not tell you where you wanted to go." },
  receipt: { title: "The Road Beyond the Receipt", text: "The offers named what they could sell you. They could not name everything you carried." },
} satisfies Record<string, Reflection>;

/** A narrative observation, never a morality score or reward. First match wins. */
export function reflectionFor(history: readonly SatireId[]): Reflection {
  const count = (id: SatireId) => history.filter(item => item === id).length;
  if (history.every(id => id === "water")) return REFLECTIONS.ordinary;
  const shortcut = history.some(id => id === "express" || id === "orders" || id === "revelation");
  const restorative = history.some(id => id === "subscription" || id === "water");
  if (shortcut && restorative) return REFLECTIONS.mixed;
  if (count("certificate") && count("subscription") && count("certificate") + count("subscription") >= 3) return REFLECTIONS.certified;
  if (count("revelation") || count("subscription")) return REFLECTIONS.window;
  if (count("express") >= 2 && count("express") > count("orders") + count("certificate")) return REFLECTIONS.deadline;
  return REFLECTIONS.receipt;
}
