export const ARENA_KEY = "psychosis.signal-lost.v1";
export interface Records {
  runs: number;
  wins: number;
  best: number;
  reduced: boolean;
  sound: boolean;
}
export function readRecords(): Records {
  const base = {
    runs: 0,
    wins: 0,
    best: 0,
    reduced:
      typeof matchMedia !== "undefined" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches,
    sound: false,
  };
  try {
    const s = JSON.parse(localStorage.getItem(ARENA_KEY) || "{}");
    for (const key of ["runs", "wins", "best"] as const)
      if (Number.isFinite(s[key]) && s[key] >= 0) base[key] = s[key];
    if (typeof s.reduced === "boolean") base.reduced = s.reduced;
    if (typeof s.sound === "boolean") base.sound = s.sound;
  } catch {}
  return base;
}
export function writeRecords(records: Records) {
  try {
    localStorage.setItem(ARENA_KEY, JSON.stringify(records));
    return true;
  } catch {
    return false;
  }
}
