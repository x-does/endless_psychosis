/** Pure clicker simulation. Seconds are simulation time; save timestamps are milliseconds. */
export type GameState = {
  version: 1;
  clarity: number;
  focus: number;
  lifetimeFocus: number;
  taps: number;
  loop: number;
  echoes: number;
  upgrades: Record<string, number>;
  lastSaved: number;
};

export type Upgrade = {
  id: string; name: string; icon: string; tagline: string; benefit: string;
  costText: string; baseCost: number; focusPerSecond: number; tapBonus: number;
  clarityPerSecond: number; appearance: string;
};

export const UPGRADES: readonly Upgrade[] = [
  { id: 'doomscroll', name: 'Premium Doomscroll', icon: '📱', tagline: 'The apocalypse now has a subscription tier.', benefit: '+0.6 focus/s, +0.2 per tap', costText: '−0.025 clarity/s. Your feed becomes your weather.', baseCost: 12, focusPerSecond: 0.6, tapBonus: 0.2, clarityPerSecond: -0.025, appearance: 'A phone halo of unread alerts.' },
  { id: 'breathwork', name: 'Unmonetized Breathing', icon: '🌬️', tagline: 'Air: the last freemium service.', benefit: '+0.9 focus/s, +0.045 clarity/s', costText: '+0.15 tap drag. Slower hands, quieter tabs.', baseCost: 45, focusPerSecond: 0.9, tapBonus: -0.15, clarityPerSecond: 0.045, appearance: 'A soft ring of breath.' },
  { id: 'ai-intern', name: 'AI Life Intern', icon: '🤖', tagline: 'Automate your purpose. Review the hallucinations.', benefit: '+2.8 focus/s', costText: '+0.3 tap drag, −0.04 clarity/s. Thinking is now a vendor dependency.', baseCost: 140, focusPerSecond: 2.8, tapBonus: -0.3, clarityPerSecond: -0.04, appearance: 'A tiny assistant orbiting your doubts.' },
  { id: 'rage-bait', name: 'Rage-Bait Side Hustle', icon: '🔥', tagline: 'Every argument is a networking opportunity.', benefit: '+1.8 per tap, +3 focus/s', costText: '−0.09 clarity/s. Engagement eats your inner monologue.', baseCost: 350, focusPerSecond: 3, tapBonus: 1.8, clarityPerSecond: -0.09, appearance: 'Neon sparks and comment bubbles.' },
  { id: 'touch-grass', name: 'Touch Grass Membership', icon: '🌱', tagline: 'Outside, now billed annually.', benefit: '+7 focus/s, +0.12 clarity/s', costText: '+0.8 tap drag. The lawn has terrible Wi-Fi.', baseCost: 950, focusPerSecond: 7, tapBonus: -0.8, clarityPerSecond: 0.12, appearance: 'Grass grows around your orbit.' },
  { id: 'sleep', name: 'Eight-Hour Rebellion', icon: '🌙', tagline: 'Disrupt the economy by lying down.', benefit: '+18 focus/s, +0.2 clarity/s', costText: '+2 tap drag. You miss several urgent non-events.', baseCost: 2600, focusPerSecond: 18, tapBonus: -2, clarityPerSecond: 0.2, appearance: 'A crescent moon accompanies your cape.' },
  { id: 'personal-brand', name: 'Personal Brand Emergency', icon: '📣', tagline: 'You are the product and the unpaid social team.', benefit: '+7 per tap, +30 focus/s', costText: '−0.35 clarity/s. Every feeling needs a launch strategy.', baseCost: 7200, focusPerSecond: 30, tapBonus: 7, clarityPerSecond: -0.35, appearance: 'A holographic verified badge.' },
  { id: 'silent-retreat', name: 'Silent Retreat in Airplane Mode', icon: '🧘', tagline: 'No signal. Suspiciously strong connection.', benefit: '+85 focus/s, +0.55 clarity/s', costText: '+5 tap drag. Your hot takes cool off.', baseCost: 19000, focusPerSecond: 85, tapBonus: -5, clarityPerSecond: 0.55, appearance: 'A lotus joins your orbit.' },
  { id: 'quantum-calendar', name: 'Quantum Calendar', icon: '🌀', tagline: 'Be late to every meeting simultaneously.', benefit: '+160 focus/s, +15 per tap', costText: '−0.8 clarity/s. Tomorrow has filed a complaint.', baseCost: 52000, focusPerSecond: 160, tapBonus: 15, clarityPerSecond: -0.8, appearance: 'Clocks dissolve into violet ribbons.' },
  { id: 'enough', name: 'The Radical Concept of Enough', icon: '☀️', tagline: 'Your final KPI is being here.', benefit: '+450 focus/s, +1 clarity/s', costText: '+12 tap drag. Hustle culture unfollows you.', baseCost: 145000, focusPerSecond: 450, tapBonus: -12, clarityPerSecond: 1, appearance: 'A warm sun joins your orbit.' },
];

const MAX_FOCUS = 1e15;
const MAX_COUNT = 1e6;
const MAX_LEVEL = 250;
const MAX_TIME = 8.64e15;
const OFFLINE_SECONDS = 4 * 60 * 60;
const REBIRTH_FOCUS = 140000;
const clamp = (n: number, low: number, high: number) => Math.min(high, Math.max(low, n));
function bounded(value: unknown, fallback: number, max: number, integer = false): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  const n = clamp(value, 0, max);
  return integer ? Math.floor(n) : n;
}
const timestamp = (now: number) => bounded(now, 0, MAX_TIME);

export function createGame(now = Date.now()): GameState {
  return { version: 1, clarity: 16, focus: 0, lifetimeFocus: 0, taps: 0, loop: 0, echoes: 0, upgrades: {}, lastSaved: timestamp(now) };
}

function normalize(raw: Partial<GameState>, now: number): GameState {
  const upgrades: Record<string, number> = {};
  if (raw.upgrades && typeof raw.upgrades === 'object' && !Array.isArray(raw.upgrades)) {
    for (const u of UPGRADES) {
      const level = bounded(raw.upgrades[u.id], 0, MAX_LEVEL, true);
      if (level) upgrades[u.id] = level;
    }
  }
  const focus = bounded(raw.focus, 0, MAX_FOCUS);
  return {
    version: 1, clarity: bounded(raw.clarity, 16, 100), focus,
    lifetimeFocus: Math.max(focus, bounded(raw.lifetimeFocus, focus, MAX_FOCUS)),
    taps: bounded(raw.taps, 0, MAX_COUNT, true), loop: bounded(raw.loop, 0, MAX_COUNT, true),
    echoes: bounded(raw.echoes, 0, MAX_COUNT, true), upgrades,
    lastSaved: bounded(raw.lastSaved, timestamp(now), MAX_TIME),
  };
}

function baseStats(state: GameState) {
  let perTap = 1, tapDrag = 0, perSecond = 0.2, clarityPerSecond = 0.012;
  for (const u of UPGRADES) {
    const n = bounded(state.upgrades[u.id], 0, MAX_LEVEL, true);
    perTap += n * Math.max(0, u.tapBonus);
    tapDrag += n * Math.max(0, -u.tapBonus);
    perSecond += n * u.focusPerSecond;
    clarityPerSecond += n * u.clarityPerSecond;
  }
  const echoMultiplier = 1 + bounded(state.echoes, 0, MAX_COUNT, true) * 0.25;
  return { perTap: perTap / (1 + tapDrag) * echoMultiplier, perSecond: Math.max(0.1, perSecond) * echoMultiplier, clarityPerSecond };
}

/** Productive chaos: up to 3× taps. Sustainable calm: up to 2× passive income. */
export function stats(state: GameState): { perTap: number; perSecond: number; clarityPerSecond: number } {
  const base = baseStats(state);
  const clarity = bounded(state.clarity, 16, 100);
  return { perTap: base.perTap * (3 - clarity / 50), perSecond: base.perSecond * (1 + clarity / 100), clarityPerSecond: base.clarityPerSecond };
}

export function upgradeCost(state: GameState, id: string): number {
  const u = UPGRADES.find(u => u.id === id);
  if (!u) return Infinity;
  const level = bounded(state.upgrades[id], 0, MAX_LEVEL, true);
  if (level >= MAX_LEVEL) return Infinity;
  // Costs beyond the currency cap remain unavailable, never overflow to a cheap price.
  return Math.ceil(u.baseCost * 1.18 ** level);
}

function earn(state: GameState, amount: number): GameState {
  return { ...state, focus: Math.min(MAX_FOCUS, state.focus + amount), lifetimeFocus: Math.min(MAX_FOCUS, state.lifetimeFocus + amount) };
}

export function tap(state: GameState): GameState {
  return { ...earn(state, stats(state).perTap), taps: Math.min(MAX_COUNT, state.taps + 1) };
}

/** Integrates clarity's income effect exactly, including time spent at either boundary. */
export function advance(state: GameState, seconds: number): GameState {
  if (!Number.isFinite(seconds) || seconds <= 0) return state;
  const dt = Math.min(seconds, OFFLINE_SECONDS);
  const base = baseStats(state);
  const initial = bounded(state.clarity, 16, 100);
  const rate = base.clarityPerSecond;
  const movingTime = rate === 0 ? dt : Math.min(dt, Math.max(0, (rate > 0 ? 100 - initial : -initial) / rate));
  const clarity = clamp(initial + rate * movingTime, 0, 100);
  const clarityIntegral = (initial + clarity) * movingTime / 2 + clarity * (dt - movingTime);
  return { ...earn(state, base.perSecond * (dt + clarityIntegral / 100)), clarity };
}

export function buyUpgrade(state: GameState, id: string): GameState {
  const cost = upgradeCost(state, id);
  if (state.focus < cost || !Number.isFinite(cost)) return state;
  return { ...state, focus: state.focus - cost, upgrades: { ...state.upgrades, [id]: (state.upgrades[id] ?? 0) + 1 } };
}

/** Lifetime milestones triple each loop. At numeric saturation, a full wallet funds each new loop. */
export function canRebirth(state: GameState): boolean {
  const target = Math.min(MAX_FOCUS, REBIRTH_FOCUS * 3 ** state.loop);
  return (target === MAX_FOCUS ? state.focus : state.lifetimeFocus) >= target;
}

export function rebirth(state: GameState): GameState {
  if (!canRebirth(state)) return state;
  return { ...createGame(state.lastSaved), lifetimeFocus: state.lifetimeFocus, loop: Math.min(MAX_COUNT, state.loop + 1), echoes: Math.min(MAX_COUNT, state.echoes + 1) };
}

export function serializeGame(state: GameState, now = Date.now()): string {
  return JSON.stringify({ ...normalize(state, now), lastSaved: timestamp(now) });
}

/** Settle wall time before every input/save so suspension callback order cannot lose income. */
export function settleGame(state: GameState, now = Date.now()): GameState {
  const through = Math.max(state.lastSaved, timestamp(now));
  return { ...advance(state, (through - state.lastSaved) / 1000), lastSaved: through };
}

export function loadGame(raw: string | null, now = Date.now()): { state: GameState; offlineFocus: number } {
  const current = timestamp(now);
  try {
    if (!raw) return { state: createGame(current), offlineFocus: 0 };
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || (parsed as GameState).version !== 1) {
      return { state: createGame(current), offlineFocus: 0 };
    }
    const saved = normalize(parsed as Partial<GameState>, current);
    const elapsed = clamp((current - saved.lastSaved) / 1000, 0, OFFLINE_SECONDS);
    const state = advance(saved, elapsed);
    return { state: { ...state, lastSaved: current }, offlineFocus: state.focus - saved.focus };
  } catch {
    return { state: createGame(current), offlineFocus: 0 };
  }
}

export function stage(clarity: number): { name: string; description: string } {
  const c = bounded(clarity, 16, 100);
  if (c < 20) return { name: 'Notification Vortex', description: 'Every ping is a prophecy. Productive chaos makes your taps powerful.' };
  if (c < 40) return { name: 'Algorithmic Awakening', description: 'You notice the feed noticing you. A thought escapes the scroll.' };
  if (c < 60) return { name: 'The Awkward Present', description: 'Between the hot take and the deep breath, there is a little room.' };
  if (c < 80) return { name: 'Quiet Rebellion', description: 'Your worth stops refreshing. Sustainable calm grows passive focus.' };
  return { name: 'Ordinary Enlightenment', description: 'The world is still absurd. You can sit with it, and the focus keeps flowing.' };
}
