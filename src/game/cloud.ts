import { normalizeSave, type SaveData } from "./save";

import { BASE_PATH, CODE_KEY } from "./environment";
const API = `${BASE_PATH}api/save`;

export type CloudState = "idle" | "syncing" | "synced" | "offline" | "error";

export function newSyncCode(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function getSyncCode(): string {
  try {
    const existing = localStorage.getItem(CODE_KEY);
    if (existing && /^[a-f0-9]{16,64}$/i.test(existing)) return existing;
    const code = newSyncCode();
    localStorage.setItem(CODE_KEY, code);
    return code;
  } catch {
    return newSyncCode();
  }
}

export function setSyncCode(code: string): boolean {
  const clean = code.trim().toLowerCase();
  if (!/^[a-f0-9]{16,64}$/.test(clean)) return false;
  try {
    localStorage.setItem(CODE_KEY, clean);
    return true;
  } catch {
    return false;
  }
}

export async function cloudFetch(): Promise<SaveData | null> {
  const response = await fetch(API, {
    headers: { Authorization: `Bearer ${getSyncCode()}` },
    cache: "no-store",
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`cloud fetch failed: ${response.status}`);
  }
  const body = (await response.json()) as { save?: Partial<SaveData> };
  return body.save ? normalizeSave(body.save) : null;
}

export async function cloudPush(save: SaveData): Promise<boolean> {
  const response = await fetch(API, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${getSyncCode()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ save }),
  });
  return response.ok;
}
