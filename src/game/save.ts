import { TECHNIQUE_BY_ID, type Technique } from "./content";
import { SAVE_KEY as KEY } from "./environment";
import {normalizeMoves,type Move} from './movement';

export interface Settings {
  movement?: 'swipe'|'buttons';
  sound: boolean;
  haptics: boolean;
  reduceMotion: boolean;
}

export interface SaveData {
  unlockedMoves?: Move[];
  version: number;
  createdAt: string;
  playerName: string;
  level: number;
  xp: number;
  totalXp: number;
  learned: string[];
  equippedActive: string | null;
  chapterIndex: number;
  completedChapters: number[];
  journal: number[];
  bestDistance: number;
  bestEndless: number;
  runs: number;
  wins: number;
  settings: Settings;
  lastPlayed: string;
}


export function newSave(): SaveData {
  return {
    version: 1,
    unlockedMoves: ['jump'],
    createdAt: new Date().toISOString(),
    playerName: "Wanderer",
    level: 1,
    xp: 0,
    totalXp: 0,
    learned: [],
    equippedActive: null,
    chapterIndex: 0,
    completedChapters: [],
    journal: [],
    bestDistance: 0,
    bestEndless: 0,
    runs: 0,
    wins: 0,
    settings: { sound: true, haptics: true, reduceMotion: false },
    lastPlayed: new Date().toISOString(),
  };
}

export function normalizeSave(parsed: Partial<SaveData>): SaveData {
  const base = newSave();
  const merged: SaveData = {
    ...base,
    ...parsed,
    unlockedMoves: normalizeMoves(parsed.unlockedMoves),
    settings: { ...base.settings, ...(parsed.settings ?? {}) },
    learned: Array.isArray(parsed.learned)
      ? parsed.learned.filter((id) => Boolean(TECHNIQUE_BY_ID[id]))
      : [],
    completedChapters: Array.isArray(parsed.completedChapters)
      ? parsed.completedChapters
      : [],
    journal: Array.isArray(parsed.journal) ? parsed.journal : [],
  };
  if (!merged.equippedActive) {
    const firstActive = merged.learned.find(
      (id) => TECHNIQUE_BY_ID[id]?.type === "active",
    );
    merged.equippedActive = firstActive ?? null;
  }
  return merged;
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return newSave();
    return normalizeSave(JSON.parse(raw) as Partial<SaveData>);
  } catch {
    return newSave();
  }
}

export function persist(save: SaveData) {
  save.lastPlayed = new Date().toISOString();
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    /* storage unavailable */
  }
}

export function xpForLevel(level: number): number {
  return Math.round(38 + level * 26 + Math.pow(level, 1.35) * 8);
}

export interface DerivedStats {
  maxHp: number;
  focusRegen: number;
  xpBonus: number;
  damageReduce: number;
  startShield: number;
  enemySlow: number;
  magnet: number;
  pulseRadius: number;
}

export function deriveStats(save: SaveData): DerivedStats {
  const stats: DerivedStats = {
    maxHp: 100,
    focusRegen: 12,
    xpBonus: 0,
    damageReduce: 0,
    startShield: 0,
    enemySlow: 0,
    magnet: 0,
    pulseRadius: 0,
  };
  stats.maxHp += save.completedChapters.length * 8;
  for (const id of save.learned) {
    const t = TECHNIQUE_BY_ID[id];
    if (!t || t.effect.mode !== "passive") continue;
    const e = t.effect;
    switch (e.stat) {
      case "maxHp":
        stats.maxHp += e.value;
        break;
      case "focusRegen":
        stats.focusRegen += e.value;
        break;
      case "xpBonus":
        stats.xpBonus += e.value;
        break;
      case "damageReduce":
        stats.damageReduce += e.value;
        break;
      case "startShield":
        stats.startShield = Math.max(stats.startShield, e.value);
        break;
      case "enemySlow":
        stats.enemySlow += e.value;
        break;
      case "magnet":
        stats.magnet += e.value;
        break;
      case "pulseRadius":
        stats.pulseRadius += e.value;
        break;
    }
  }
  stats.damageReduce = Math.min(0.5, stats.damageReduce);
  return stats;
}

export function activeTechnique(save: SaveData): Technique | null {
  if (!save.equippedActive) return null;
  return TECHNIQUE_BY_ID[save.equippedActive] ?? null;
}

export function grantXp(
  save: SaveData,
  amount: number,
): { levels: number; remaining: number } {
  let levels = 0;
  save.xp += amount;
  save.totalXp += amount;
  while (save.xp >= xpForLevel(save.level)) {
    save.xp -= xpForLevel(save.level);
    save.level += 1;
    levels += 1;
  }
  return { levels, remaining: save.xp };
}

export function isChapterUnlocked(save: SaveData, index: number): boolean {
  if (index === 0) return true;
  return save.completedChapters.includes(index - 1);
}
