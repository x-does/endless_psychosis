export type TechniqueKind = "breathing" | "mantra" | "stretch" | "mental" | "grounding";

export type ActiveAction =
  | "heal"
  | "clear"
  | "slow"
  | "shield"
  | "focus"
  | "dash"
  | "purge"
  | "rain";

export type PassiveStat =
  | "maxHp"
  | "focusRegen"
  | "xpBonus"
  | "damageReduce"
  | "startShield"
  | "enemySlow"
  | "magnet"
  | "pulseRadius";

export type TechniqueEffect =
  | { mode: "active"; action: ActiveAction; power: number; duration: number }
  | { mode: "passive"; stat: PassiveStat; value: number };

export interface Technique {
  id: string;
  name: string;
  kind: TechniqueKind;
  type: "active" | "passive";
  tagline: string;
  instruction: string[];
  why: string;
  effect: TechniqueEffect;
  icon: string;
  color: string;
  keystoneChapter?: number;
}

export interface BossDef {
  id: string;
  name: string;
  title: string;
  hp: number;
  color: string;
  accent: string;
  taunts: string[];
  pattern: "fog" | "spiral" | "judge" | "ashes" | "night";
}

export interface Chapter {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  theme: string;
  sky: [string, string, string];
  ground: string;
  accent: string;
  targetMeters: number;
  difficulty: number;
  intro: string;
  outro: string;
  journal: string;
  keystoneId: string;
  boss: BossDef;
}

export const CHAPTERS: Chapter[] = [
  {
    id: "fog",
    number: 1,
    title: "The Morning Fog",
    subtitle: "Depression",
    theme: "Getting out of bed is the first boss fight.",
    sky: ["#0b1026", "#1d2b4a", "#3d5a6c"],
    ground: "#16202e",
    accent: "#7dd3c0",
    targetMeters: 620,
    difficulty: 1,
    intro:
      "The fog rolled in months ago. It did not announce itself. One morning the alarm was too loud, the light too sharp, and every small thing felt like a mountain. You are running anyway — not because the fog is gone, but because movement is a kind of answer.",
    outro:
      "The fog thins, not because you fought it, but because you kept moving through it. You learn that a low morning does not mean a low life. You pocket a breath you can return to.",
    journal:
      "Depression lies by making everything feel permanent. The truth is that mood moves, even when it moves slowly. Start with the smallest next step, not the whole staircase.",
    keystoneId: "box-breathing",
    boss: {
      id: "hollow",
      name: "The Hollow",
      title: "The weight that whispers 'why bother'",
      hp: 46,
      color: "#40566b",
      accent: "#9fb8c8",
      pattern: "fog",
      taunts: [
        "Why bother?",
        "You'll only fall behind.",
        "Rest is for people who earned it.",
        "Nothing changes.",
      ],
    },
  },
  {
    id: "spiral",
    number: 2,
    title: "The Spiral Staircase",
    subtitle: "Anxiety & Panic",
    theme: "The mind runs faster than the body can follow.",
    sky: ["#140b2e", "#2c1b56", "#5b3d8a"],
    ground: "#1a1330",
    accent: "#b79cff",
    targetMeters: 760,
    difficulty: 2,
    intro:
      "The staircase climbs in a circle. Every step is a what-if. Your heart outruns your feet. The spiral says that if you stop worrying for one second, something terrible will slip past you. You are here to learn that vigilance is not the same as safety.",
    outro:
      "At the top of the spiral there is no disaster — only a window, and air, and the sound of your own breathing slowing down. You did not solve every what-if. You came back to the present anyway.",
    journal:
      "Anxiety is a smoke alarm with no fire. It is not a prophecy. Grounding works by giving your nervous system real, ordinary evidence: five things you can see, four you can touch, three you can hear.",
    keystoneId: "grounding-54321",
    boss: {
      id: "spiral",
      name: "The Spiral",
      title: "The loop that promises it is protecting you",
      hp: 58,
      color: "#4b2f7a",
      accent: "#c4a7ff",
      pattern: "spiral",
      taunts: [
        "What if it all goes wrong?",
        "Check again.",
        "You forgot something.",
        "Your heart is too fast.",
      ],
    },
  },
  {
    id: "judge",
    number: 3,
    title: "The Courtroom",
    subtitle: "The Inner Critic",
    theme: "The harshest voice in the room is your own.",
    sky: ["#1c0d18", "#3d1626", "#7a2f3e"],
    ground: "#22101a",
    accent: "#ffb4a2",
    targetMeters: 900,
    difficulty: 3,
    intro:
      "The courtroom has no windows. The judge wears your face. Every mistake is entered into evidence, every success dismissed as luck. You have been sentenced to 'not enough.' Today you are going to cross-examine the voice.",
    outro:
      "The gavel falls and nothing happens. The judge was never a judge — just a frightened part of you trying to keep you small and safe. You can thank it and walk out anyway.",
    journal:
      "You are not your thoughts. Naming the critic ('that's the comparison story again') creates a little distance, and distance is where choice lives. Speak to yourself as you would to a friend in the same situation.",
    keystoneId: "name-it-to-tame-it",
    boss: {
      id: "judge",
      name: "The Judge",
      title: "The voice that keeps the receipts",
      hp: 70,
      color: "#5c1f2c",
      accent: "#ffc2b4",
      pattern: "judge",
      taunts: [
        "Everyone else figured it out.",
        "You should be further along.",
        "That was embarrassing.",
        "Try harder. Or don't.",
      ],
    },
  },
  {
    id: "ashes",
    number: 4,
    title: "The Burnout Wastes",
    subtitle: "Burnout & Exhaustion",
    theme: "You cannot pour from an empty cup.",
    sky: ["#1b1206", "#3f2a0e", "#8a5a1f"],
    ground: "#241a0c",
    accent: "#ffd28a",
    targetMeters: 1040,
    difficulty: 4,
    intro:
      "Everything here is running on fumes. The Wastes are what happens when rest becomes a reward you never earn. Your body has been sending invoices for months. This chapter is not about pushing harder. It is about learning to stop before the crash.",
    outro:
      "You do not defeat the Wastes by outworking them. You sit down. You drink water. You let one thing be unfinished. The ground beneath you holds, and the sky is still there.",
    journal:
      "Burnout is not a character flaw or a lack of grit. It is a signal that demands rest, boundaries, and help. Rest is a maintenance requirement, not a prize.",
    keystoneId: "two-minute-reset",
    boss: {
      id: "ashes",
      name: "The Ashes",
      title: "The fire that forgot it needs fuel",
      hp: 84,
      color: "#6b4410",
      accent: "#ffd28a",
      pattern: "ashes",
      taunts: [
        "Just push through.",
        "Sleep when it's done.",
        "You're falling behind.",
        "One more task. Then rest.",
      ],
    },
  },
  {
    id: "night",
    number: 5,
    title: "The Long Night",
    subtitle: "Grief, Insomnia & the Unknown",
    theme: "Some nights cannot be fixed. They can be companioned.",
    sky: ["#050716", "#0d1430", "#1f2d57"],
    ground: "#080c1a",
    accent: "#a8c6ff",
    targetMeters: 1180,
    difficulty: 5,
    intro:
      "The Long Night is not a monster you can outrun. It is the hours when the house is quiet and the questions are loud. Here you do not have to be brave. You only have to keep a small light moving until morning.",
    outro:
      "Morning comes the way it always does: slowly, then all at once. You did not win the night. You stayed with yourself through it, which is a different and harder kind of victory.",
    journal:
      "You do not have to earn care by being in crisis. Reach out before the night is darkest. If you are in danger, contact local emergency services or a crisis line — reaching out is a skill, and you can practice it.",
    keystoneId: "loving-kindness",
    boss: {
      id: "night",
      name: "The Long Night",
      title: "The dark that asks you to stay",
      hp: 100,
      color: "#101a3a",
      accent: "#a8c6ff",
      pattern: "night",
      taunts: [
        "No one is awake.",
        "It will always feel like this.",
        "You are alone in this.",
        "Just stay here with me.",
      ],
    },
  },
];

export const TECHNIQUES: Technique[] = [
  {
    id: "box-breathing",
    name: "Box Breathing",
    kind: "breathing",
    type: "active",
    tagline: "Four counts in, hold, out, hold. The oldest reset button.",
    instruction: [
      "Sit or stand comfortably. Breathe out fully.",
      "Inhale through the nose for 4 counts.",
      "Hold gently for 4 counts.",
      "Exhale through the mouth for 4 counts.",
      "Hold empty for 4 counts. Repeat 4 times.",
    ],
    why: "A longer, rhythmic exhale signals safety to the nervous system and can lower a racing heart.",
    effect: { mode: "active", action: "heal", power: 42, duration: 3 },
    icon: "◻",
    color: "#7dd3c0",
    keystoneChapter: 1,
  },
  {
    id: "grounding-54321",
    name: "5-4-3-2-1 Grounding",
    kind: "grounding",
    type: "active",
    tagline: "Come back to the room you are actually in.",
    instruction: [
      "Name 5 things you can see.",
      "Name 4 things you can physically feel.",
      "Name 3 things you can hear.",
      "Name 2 things you can smell.",
      "Name 1 thing you can taste.",
    ],
    why: "Orienting your senses gives the brain concrete evidence that you are here and safe right now.",
    effect: { mode: "active", action: "clear", power: 4, duration: 2 },
    icon: "✋",
    color: "#b79cff",
    keystoneChapter: 2,
  },
  {
    id: "name-it-to-tame-it",
    name: "Name It to Tame It",
    kind: "mental",
    type: "passive",
    tagline: "Label the story before it labels you.",
    instruction: [
      "When a thought spikes, name the pattern out loud: 'This is the comparison story.'",
      "Rate the feeling 0-10.",
      "Ask: is this a fact or a forecast?",
      "Choose one small action you can actually take.",
    ],
    why: "Affect labeling reduces amygdala reactivity. Naming a feeling gives you a little space between it and your next move.",
    effect: { mode: "passive", stat: "damageReduce", value: 0.12 },
    icon: "🏷",
    color: "#ffb4a2",
    keystoneChapter: 3,
  },
  {
    id: "two-minute-reset",
    name: "Two-Minute Reset",
    kind: "stretch",
    type: "active",
    tagline: "Rest is a maintenance requirement, not a prize.",
    instruction: [
      "Stop what you are doing for two minutes.",
      "Roll your shoulders back five times.",
      "Stand, stretch your arms overhead, and yawn deliberately.",
      "Drink a glass of water before you continue.",
    ],
    why: "Micro-breaks reduce accumulated tension and restore attention. You do not need to earn rest.",
    effect: { mode: "active", action: "focus", power: 60, duration: 2 },
    icon: "⏸",
    color: "#ffd28a",
    keystoneChapter: 4,
  },
  {
    id: "loving-kindness",
    name: "Loving-Kindness",
    kind: "mantra",
    type: "active",
    tagline: "May I be safe. May I be well. May I be at ease.",
    instruction: [
      "Place a hand on your chest.",
      "Repeat silently: 'May I be safe. May I be well. May I be at ease.'",
      "Picture someone you love. Offer them the same words.",
      "Finally, offer them to someone difficult — and to the world.",
    ],
    why: "Self-compassion is associated with lower anxiety and greater resilience. Warmth is a skill you can rehearse.",
    effect: { mode: "active", action: "heal", power: 55, duration: 5 },
    icon: "♥",
    color: "#a8c6ff",
    keystoneChapter: 5,
  },
  {
    id: "physiological-sigh",
    name: "Physiological Sigh",
    kind: "breathing",
    type: "active",
    tagline: "Two inhales, one long exhale. A calming breath pattern.",
    instruction: [
      "Inhale through the nose until your lungs are about 80% full.",
      "Add one more short sniff of air.",
      "Exhale slowly and completely through the mouth.",
      "Repeat two or three times.",
    ],
    why: "The double inhale reinflates tiny air sacs, and the long exhale offloads carbon dioxide — often in one or two breaths.",
    effect: { mode: "active", action: "heal", power: 24, duration: 1.5 },
    icon: "≈",
    color: "#8ee6d2",
  },
  {
    id: "4-7-8-breath",
    name: "4-7-8 Breath",
    kind: "breathing",
    type: "active",
    tagline: "A longer exhale for a louder mind.",
    instruction: [
      "Exhale completely.",
      "Inhale through the nose for 4 counts.",
      "Hold for 7 counts.",
      "Exhale for 8 counts. Repeat four cycles.",
    ],
    why: "Extending the exhale activates the parasympathetic 'rest and digest' branch of the nervous system.",
    effect: { mode: "active", action: "slow", power: 0.45, duration: 5 },
    icon: "◐",
    color: "#79c7ff",
  },
  {
    id: "body-scan",
    name: "Body Scan",
    kind: "grounding",
    type: "passive",
    tagline: "Notice the body you are already in.",
    instruction: [
      "Close your eyes if comfortable.",
      "Move attention slowly from feet to head.",
      "Notice sensation without trying to change it.",
      "If the mind wanders, gently return to the last place you noticed.",
    ],
    why: "Interoceptive awareness helps you catch stress earlier, before it becomes a crisis.",
    effect: { mode: "passive", stat: "focusRegen", value: 3 },
    icon: "◎",
    color: "#9ad7c4",
  },
  {
    id: "progressive-muscle",
    name: "Progressive Muscle Relaxation",
    kind: "stretch",
    type: "passive",
    tagline: "Tense, then release. Teach the body the difference.",
    instruction: [
      "Curl your toes and tense your calves for 5 seconds.",
      "Release and notice the contrast for 10 seconds.",
      "Move upward: thighs, stomach, hands, shoulders, face.",
      "Finish with three slow breaths.",
    ],
    why: "Deliberate tension-and-release trains the body to recognize and let go of held stress.",
    effect: { mode: "passive", stat: "maxHp", value: 20 },
    icon: "⋔",
    color: "#ffc7a1",
  },
  {
    id: "shoulder-roll",
    name: "Shoulder Roll",
    kind: "stretch",
    type: "active",
    tagline: "Where you carry the day.",
    instruction: [
      "Sit or stand tall.",
      "Roll both shoulders forward five times, slowly.",
      "Roll them backward five times.",
      "Let the arms hang and take one deep breath.",
    ],
    why: "Shoulders and neck store tension; gentle movement restores circulation and reduces the physical feel of stress.",
    effect: { mode: "active", action: "focus", power: 45, duration: 1 },
    icon: "↻",
    color: "#ffd9a8",
  },
  {
    id: "cold-water-reset",
    name: "Cold Water Reset",
    kind: "grounding",
    type: "active",
    tagline: "A splash of 'I am awake and here.'",
    instruction: [
      "Splash cold water on your face or hold something cold to your wrists.",
      "Stay with the sensation for 30 seconds.",
      "Breathe out slowly.",
      "Name one thing you can do next.",
    ],
    why: "Cold exposure can rapidly shift arousal and interrupt a spiral. It is a circuit breaker, not a cure.",
    effect: { mode: "active", action: "purge", power: 1, duration: 1 },
    icon: "❄",
    color: "#a6e3ff",
  },
  {
    id: "this-too-shall-pass",
    name: "This Too Shall Pass",
    kind: "mantra",
    type: "passive",
    tagline: "A sentence to hold when the feeling says forever.",
    instruction: [
      "Choose a phrase you can believe: 'This is a wave, not the ocean.'",
      "Repeat it when you notice the feeling peak.",
      "Place a hand where you feel it most.",
      "Breathe once, slowly, before your next action.",
    ],
    why: "A rehearsed phrase can interrupt rumination and remind you that states are temporary.",
    effect: { mode: "passive", stat: "startShield", value: 6 },
    icon: "❞",
    color: "#c9b8ff",
  },
  {
    id: "self-compassion-break",
    name: "Self-Compassion Break",
    kind: "mantra",
    type: "active",
    tagline: "Treat yourself like someone you are responsible for helping.",
    instruction: [
      "Say: 'This is a moment of suffering.'",
      "Say: 'Suffering is part of being human.'",
      "Say: 'May I be kind to myself in this moment.'",
      "Do one small kind thing for future-you.",
    ],
    why: "Self-compassion lowers shame and rumination more reliably than self-criticism does.",
    effect: { mode: "active", action: "heal", power: 38, duration: 2 },
    icon: "☕",
    color: "#ffb4c8",
  },
  {
    id: "opposite-action",
    name: "Opposite Action",
    kind: "mental",
    type: "active",
    tagline: "When the feeling says hide, move toward the light.",
    instruction: [
      "Name the urge: withdraw, snap, avoid, numb.",
      "Ask: is the urge helping or hurting?",
      "Do the gentle opposite in a small way.",
      "Notice what happens after, without judging it.",
    ],
    why: "Behavioral activation works: action can change emotion, not only the other way around.",
    effect: { mode: "active", action: "dash", power: 2, duration: 1.2 },
    icon: "→",
    color: "#ffcf7a",
  },
  {
    id: "gratitude-stack",
    name: "Gratitude Stack",
    kind: "mental",
    type: "passive",
    tagline: "Three small true things.",
    instruction: [
      "At the end of the day, name three specific good things.",
      "Make them small and real: sunlight, a text, clean sheets.",
      "Say why each one happened.",
      "Repeat tomorrow — specificity beats intensity.",
    ],
    why: "Regular gratitude practice can shift attention bias toward what is going well without denying what is hard.",
    effect: { mode: "passive", stat: "xpBonus", value: 0.2 },
    icon: "✦",
    color: "#ffe08a",
  },
  {
    id: "one-thing-at-a-time",
    name: "One Thing at a Time",
    kind: "mental",
    type: "passive",
    tagline: "Multitasking is just anxiety with extra steps.",
    instruction: [
      "Write down everything on your mind.",
      "Circle the one thing that matters most today.",
      "Close the other tabs — literally and mentally.",
      "Work in a 25-minute block, then rest for 5.",
    ],
    why: "Task-switching drains attention and increases stress; single-tasking restores a sense of control.",
    effect: { mode: "passive", stat: "focusRegen", value: 4 },
    icon: "1",
    color: "#9fe0a8",
  },
  {
    id: "digital-sunset",
    name: "Digital Sunset",
    kind: "grounding",
    type: "active",
    tagline: "Give the day an ending.",
    instruction: [
      "Choose a time tonight to put screens away.",
      "Dim the lights and do one analog thing.",
      "Write one sentence about the day.",
      "Let tomorrow wait until tomorrow.",
    ],
    why: "A predictable wind-down supports sleep, and sleep is a foundation for mood regulation.",
    effect: { mode: "active", action: "slow", power: 0.5, duration: 6 },
    icon: "☾",
    color: "#b7a6ff",
  },
  {
    id: "rain",
    name: "RAIN",
    kind: "mental",
    type: "active",
    tagline: "Recognize, Allow, Investigate, Nurture.",
    instruction: [
      "Recognize what is here: 'This is anxiety.'",
      "Allow it to exist without fighting it.",
      "Investigate gently: where is it in my body?",
      "Nurture yourself with a kind response.",
    ],
    why: "Mindful RAIN practice reduces reactivity by replacing suppression with curiosity and care.",
    effect: { mode: "active", action: "rain", power: 10, duration: 3 },
    icon: "☂",
    color: "#8fd3ff",
  },
  {
    id: "feet-on-the-floor",
    name: "Feet on the Floor",
    kind: "grounding",
    type: "passive",
    tagline: "The floor is still holding you.",
    instruction: [
      "Press both feet flat on the ground.",
      "Notice the pressure and temperature.",
      "Push down gently for 5 seconds, then relax.",
      "Take one slow breath and look around the room.",
    ],
    why: "Grounding through physical pressure interrupts dissociation and brings attention back to the present.",
    effect: { mode: "passive", stat: "damageReduce", value: 0.1 },
    icon: "⌊",
    color: "#a8e6cf",
  },
  {
    id: "micro-walk",
    name: "Micro-Walk",
    kind: "stretch",
    type: "active",
    tagline: "Motion changes emotion.",
    instruction: [
      "Stand up and walk for two minutes.",
      "Go outside if you can.",
      "Let your arms swing and your gaze soften.",
      "Come back and name one thing that shifted.",
    ],
    why: "Even brief movement improves mood and reduces rumination, especially outdoors.",
    effect: { mode: "active", action: "dash", power: 3, duration: 1.6 },
    icon: "⇢",
    color: "#ffd28a",
  },
  {
    id: "three-minute-space",
    name: "Three-Minute Breathing Space",
    kind: "breathing",
    type: "active",
    tagline: "A doorway, not a destination.",
    instruction: [
      "Minute 1: notice thoughts, feelings, and sensations.",
      "Minute 2: gather attention on the breath.",
      "Minute 3: widen attention to the whole body.",
      "Carry on with your day, a little more here.",
    ],
    why: "Short formal practices are easier to sustain and still measurably reduce stress.",
    effect: { mode: "active", action: "focus", power: 55, duration: 2 },
    icon: "◌",
    color: "#9ad7ff",
  },
  {
    id: "courage-practice",
    name: "Courage Practice",
    kind: "mental",
    type: "passive",
    tagline: "Courage is a muscle, not a mood.",
    instruction: [
      "Write down one thing you have been avoiding.",
      "Break off the smallest possible first step.",
      "Do that step within 24 hours.",
      "Record what actually happened, not what you feared.",
    ],
    why: "Repeated approach behavior weakens avoidance and builds evidence that you can cope.",
    effect: { mode: "passive", stat: "pulseRadius", value: 22 },
    icon: "⚑",
    color: "#ffb4a2",
  },
  {
    id: "rest-is-productive",
    name: "Rest Is Productive",
    kind: "stretch",
    type: "passive",
    tagline: "Recovery is part of the work.",
    instruction: [
      "Schedule one non-negotiable rest block this week.",
      "Make it boring on purpose: no productivity.",
      "Protect it like a meeting with someone important.",
      "Notice guilt without obeying it.",
    ],
    why: "Rest is when the body repairs and the brain consolidates learning. Chronic deprivation erodes mood and judgment.",
    effect: { mode: "passive", stat: "maxHp", value: 30 },
    icon: "☁",
    color: "#c9d6ff",
  },
  {
    id: "window-of-tolerance",
    name: "Window of Tolerance",
    kind: "mental",
    type: "passive",
    tagline: "Learn your edges before you hit them.",
    instruction: [
      "Notice signs of hyperarousal: racing, clenching, panic.",
      "Notice signs of hypoarousal: numb, flat, foggy.",
      "Build a short list of things that bring you back to center.",
      "Use the list early, not only at the breaking point.",
    ],
    why: "Recognizing your arousal state helps you choose regulation strategies before you are overwhelmed.",
    effect: { mode: "passive", stat: "damageReduce", value: 0.08 },
    icon: "▤",
    color: "#b8e0ff",
  },
  {
    id: "spark-magnet",
    name: "Notice the Good",
    kind: "mental",
    type: "passive",
    tagline: "What you practice noticing grows.",
    instruction: [
      "Set three gentle reminders through the day.",
      "When one fires, find one pleasant detail nearby.",
      "Stay with it for ten seconds.",
      "No forcing — noticing is enough.",
    ],
    why: "Attention training can counter the negativity bias that depression and anxiety amplify.",
    effect: { mode: "passive", stat: "magnet", value: 1 },
    icon: "✧",
    color: "#ffe9a8",
  },
];

export const TECHNIQUE_BY_ID: Record<string, Technique> = Object.fromEntries(
  TECHNIQUES.map((t) => [t.id, t]),
);

export function techniquesForLevel(chapterIndex: number, learned: string[]): Technique[] {
  const pool = TECHNIQUES.filter(
    (t) => !t.keystoneChapter && !learned.includes(t.id),
  );
  const chapterBias = TECHNIQUES.filter(
    (t) => t.keystoneChapter && t.keystoneChapter <= chapterIndex,
  ).map((t) => t.id);
  const weighted = [...pool].sort((a, b) => {
    const aw = chapterBias.includes(a.id) ? 0 : 1;
    const bw = chapterBias.includes(b.id) ? 0 : 1;
    return aw - bw;
  });
  const picked: Technique[] = [];
  const bag = [...weighted];
  while (picked.length < 3 && bag.length) {
    const i = Math.floor(Math.random() * bag.length);
    picked.push(bag.splice(i, 1)[0]);
  }
  return picked;
}

export const KIND_LABEL: Record<TechniqueKind, string> = {
  breathing: "Breathing",
  mantra: "Mantra",
  stretch: "Movement",
  mental: "Mental",
  grounding: "Grounding",
};

export const KIND_ICON: Record<TechniqueKind, string> = {
  breathing: "◯",
  mantra: "❞",
  stretch: "⇡",
  mental: "✦",
  grounding: "⌂",
};

export interface EnemyDef {
  id: string;
  name: string;
  hp: number;
  xp: number;
  speed: number;
  color: string;
  accent: string;
  size: [number, number];
  kind: "wisp" | "hound" | "bat" | "critic" | "blob" | "spiral";
}

export const ENEMY_DEFS: Record<string, EnemyDef> = {
  worry: {
    id: "worry",
    name: "Worry Wisp",
    hp: 1,
    xp: 9,
    speed: 0.92,
    color: "#5d4b8a",
    accent: "#c9b8ff",
    size: [44, 44],
    kind: "wisp",
  },
  hound: {
    id: "hound",
    name: "Fog Hound",
    hp: 2,
    xp: 14,
    speed: 1.18,
    color: "#3c5566",
    accent: "#9fc4d4",
    size: [62, 42],
    kind: "hound",
  },
  bat: {
    id: "bat",
    name: "Rumor Bat",
    hp: 1,
    xp: 12,
    speed: 1.05,
    color: "#4a3a6e",
    accent: "#d3c1ff",
    size: [40, 30],
    kind: "bat",
  },
  critic: {
    id: "critic",
    name: "Inner Critic",
    hp: 3,
    xp: 22,
    speed: 0.62,
    color: "#6e2b3a",
    accent: "#ffc2b4",
    size: [52, 62],
    kind: "critic",
  },
  blob: {
    id: "blob",
    name: "Burnout Blob",
    hp: 4,
    xp: 20,
    speed: 0.48,
    color: "#6b4410",
    accent: "#ffd28a",
    size: [76, 62],
    kind: "blob",
  },
  spiral: {
    id: "spiral",
    name: "Panic Spiral",
    hp: 3,
    xp: 24,
    speed: 0.7,
    color: "#4b2f7a",
    accent: "#c4a7ff",
    size: [54, 54],
    kind: "spiral",
  },
};

export interface JournalEntry {
  chapter: number;
  title: string;
  body: string;
}

export const SUPPORT_RESOURCES = [
  {
    region: "United States",
    name: "988 Suicide & Crisis Lifeline",
    contact: "Call or text 988",
    url: "https://988lifeline.org",
  },
  {
    region: "United Kingdom",
    name: "Samaritans",
    contact: "Call 116 123",
    url: "https://www.samaritans.org",
  },
  {
    region: "Europe (EU)",
    name: "EU Emotional Support Helpline",
    contact: "116 123",
    url: "https://findahelpline.com",
  },
  {
    region: "Worldwide",
    name: "Find a Helpline",
    contact: "findahelpline.com",
    url: "https://findahelpline.com",
  },
  {
    region: "Emergency",
    name: "Local emergency services",
    contact: "Call your local emergency number",
    url: "",
  },
];

export const CONTENT_NOTE =
  "Endless is a game, not medical advice or a substitute for professional care. It touches on anxiety, depression, burnout, and grief. If you are in crisis or thinking about harming yourself, please contact local emergency services or a crisis line. Reaching out is a skill, and you can practice it.";
