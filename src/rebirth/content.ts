export type PilotId = "vesper" | "rook" | "io";
export const PILOTS = [
  {
    id: "vesper" as const,
    name: "Vesper",
    role: "THE RUNNER",
    color: "#b9f279",
    hp: 90,
    speed: 225,
    damage: 16,
    interval: 0.48,
    range: 240,
    skill: "Afterimage",
    description: "Get close. Leave a mark.",
    detail:
      "Rapid twin blades seek nearby targets. Afterimage cuts through every enemy within 260 units.",
    shape: "blade",
    skillTime: 9,
  },
  {
    id: "rook" as const,
    name: "Rook",
    role: "THE BREAKER",
    color: "#ffaf79",
    hp: 140,
    speed: 170,
    damage: 38,
    interval: 0.95,
    range: 570,
    skill: "Dead frequency",
    description: "One shot. A little silence.",
    detail:
      "Heavy long-range bolts pierce targets. Dead frequency clears hostile shots and deals 100 damage across the arena.",
    shape: "diamond",
    skillTime: 12,
  },
  {
    id: "io" as const,
    name: "Io",
    role: "THE WEAVER",
    color: "#b9a0ff",
    hp: 110,
    speed: 195,
    damage: 12,
    interval: 0.7,
    range: 390,
    skill: "Event horizon",
    description: "Make the world orbit you.",
    detail:
      "Three satellites damage nearby enemies. Event horizon slows threats for 5 seconds and restores 18 integrity.",
    shape: "orbit",
    skillTime: 11,
  },
];
export type Pilot = (typeof PILOTS)[number];
export const DISTRICTS = [
  {
    name: "The Undercurrent",
    label: "01 / FLOODED TRANSIT",
    color: "#b9f279",
    boss: "The Ferryman",
    subtitle: "Everything that sinks comes back.",
  },
  {
    name: "Glass Cathedral",
    label: "02 / BROKEN TRANSMISSION",
    color: "#b9a0ff",
    boss: "The Choir",
    subtitle: "A thousand voices. None of them yours.",
  },
  {
    name: "The Last Broadcast",
    label: "03 / POINT OF NO RETURN",
    color: "#ffaf79",
    boss: "The Aerial",
    subtitle: "Find the silence behind the signal.",
  },
];
export const UPGRADES = [
  {
    id: "power",
    name: "Hot signal",
    tag: "DAMAGE",
    description: "+25% weapon and skill damage.",
    glyph: "↗",
  },
  {
    id: "tempo",
    name: "Double time",
    tag: "FIRE RATE",
    description: "Attack 18% faster. Keep the pressure on.",
    glyph: "»",
  },
  {
    id: "stride",
    name: "Ghost soles",
    tag: "MOVEMENT",
    description: "+12% movement speed; dash recovers 15% faster.",
    glyph: "⌁",
  },
  {
    id: "vital",
    name: "Second heart",
    tag: "INTEGRITY",
    description: "+25 maximum integrity. Restore 35 integrity.",
    glyph: "✚",
  },
  {
    id: "echo",
    name: "Echo chamber",
    tag: "MULTISHOT",
    description: "+1 projectile per attack. Io gains an orbiting satellite.",
    glyph: "◎",
  },
  {
    id: "leech",
    name: "Borrowed light",
    tag: "SUSTAIN",
    description: "Every defeated enemy restores 2 integrity.",
    glyph: "◇",
  },
  {
    id: "reach",
    name: "Long wave",
    tag: "RANGE",
    description: "+25% targeting range and projectile lifetime.",
    glyph: "⤴",
  },
  {
    id: "skill",
    name: "Feedback loop",
    tag: "ABILITY",
    description: "Signature skill recovers 20% faster.",
    glyph: "⟳",
  },
] as const;
export type UpgradeId = (typeof UPGRADES)[number]["id"];
export function draft(random = Math.random) {
  return [...UPGRADES]
    .map((value) => ({ value, sort: random() }))
    .sort((a, b) => a.sort - b.sort)
    .slice(0, 3)
    .map((v) => v.value);
}
