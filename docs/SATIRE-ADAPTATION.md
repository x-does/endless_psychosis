# The Road to Absolute Nonsense

Status: **first dev slice implemented**; full catalog and ending system remain planned. Extends Fracture & Recovery in PR #3. Numbers below are initial playtest targets, not claims about real substances or treatment.

### Current slice

Enable locally with `VITE_SATIRE=1 npm run dev`; the Hostinger `/dev` builder supplies this flag automatically. Normal production builds leave encounters disabled. Implemented four pickups, three encounter templates, run-local behavior axes/history and checkpoint escalation, .75s speed ramps capped at 1.15×, reduced-motion steady-speed substitution, explicit effect timers and no-effect-replacement guards. Encounters begin after 45 active seconds and recur no sooner than 40s later when the effect slot and coping cooldown are clear. Use Endless to reach all three scenes. The current seed-free slice uses stable tie-breaking; seeded variety, the other six pickups, complete route endings and dedicated satirical enemy art are follow-ups.

## Direction

Start as a serious, grounded survival story. Let repeated choices turn it into increasingly surreal adult satire about work, pleasure, addiction, wellness, certainty and the business of being happy. The protagonist is vulnerable throughout; the world becomes ridiculous without their suffering becoming the joke.

Both substance-themed and contemplative routes can lead to an experience of enlightenment. Neither route guarantees truth, virtue, recovery or victory. Some revelations are useful, some self-serving, some impossible to explain. The same luminous form can be tender, detached or authoritarian depending on behavior.

Drug/alcohol references are fictional combat shorthand. No dosing, procurement, realistic ingestion sequence or incendiary construction is depicted. The alcohol-associated fire attack is a stylized impossible comet, not a crafting recipe or simulation.

## 1. Serious opening, earned absurdity

Use three authored stages, triggered only at safe encounter boundaries:

1. **Credible:** first 45 active seconds. Rain, streetlights, ordinary pressure, restrained narration. No immediate barrage of drug jokes.
2. **Contradictory:** after 45s, if any behavioral axis reaches 30. Public announcements contradict signs; optional self-help starts demanding compliance; the pub offers a loyalty card for forgetting.
3. **Absurd:** after 120s, if one axis reaches 65 or two reach 45. The skyline becomes a productivity cathedral, happiness tribunal or ministry of revelation. Stages do not regress during a run.

Chapter runs are currently short. Do not force the 120s threshold into chapter one: use a three-encounter vertical slice across a short sequence, or Endless for a complete escalation test. Serious/abstinent runs retain authored encounters and a complete ending even when they never unlock maximal absurdity. Wackiness is not a completion reward reserved for substance use.

## 2. Behavior, not morality

Add run-local **Drive, Distance, Certainty**, each 0–100, decaying .20 per active second. They select scenery, dialogue and encounters, not damage or moral rank. Display a compact path description in the pause journal, not three more combat bars.

- **Drive:** speed, output, force and optimization.
- **Distance:** insulation, altered perspective and withdrawal.
- **Certainty:** ritual, rigid explanations and institutional approval.

Keep the existing independent Radiance/Echo/Bone appearance mix. No behavior axis maps exclusively to a substance or body form. Log event counts separately from decaying weights so endings can reflect choices actually made, rather than whichever effect happened last.

| Existing coping | Drive | Distance | Certainty |
| --- | ---: | ---: | ---: |
| Ground | 0 | −8 | +6 |
| Compassion | −6 | −4 | −6 |
| Connect | 0 | −8 | −4 |
| Bottle | 0 | +12 | +4 |
| Push | +14 | 0 | +4 |
| Tune | −4 | +14 | 0 |

## 3. Pickup catalog

Explicit acceptance at paused encounters; never auto-collect substance choices. Every shortcut shows benefit, immediate cost, benefit duration and aftermath duration. Existing free recovery options remain available. One active effect/debt slot: an occupied slot never silently replaces an effect or cancels its cost.

| Pickup / satirical target | Benefit | Cost | Appearance and behavior |
| --- | --- | --- | --- |
| **White-Line Express** — stimulant / hustle shortcut | +15% road speed and double pulse damage for 5s | +12 strain; then 7s half focus regeneration | White spinal chevrons; Bone +.25, Radiance +.10; Drive +18 |
| **Last Orders** — alcohol / outsourced courage | 30% damage reduction and a Cinder Comet pulse for 6s; comet deals 4 boss / 2 ordinary damage | +12 strain; pulses cost 27 throughout the 6s benefit | Amber shell, skeletal bottle-shaped halo; Echo +.20, Bone +.10; Distance +14 |
| **LSD: Revelation Edition** — purchased cosmic certainty | Hostile projectiles 30% slower for 5s | +10 strain; then 7s pulses cost 27 | Geometric third-eye halo, contradictory captions; Echo +.30, Radiance +.10; Distance +12, Certainty +10 |
| **Meditation Subscription** — monetized serenity | Clear hostile shots; +20 focus | Voluntarily commit to 3s without pulses; jump/slide remain available | Mint concentric geometry; Radiance +.25; Certainty +12 |
| **Happy-Life Checklist** — compulsory positivity | +16 HP | Half focus regeneration for 6s | Golden checkmarks harden into brackets; Radiance +.20, Bone +.10; Drive +8, Certainty +10 |
| **Enlightenment Certificate** — credentialed transcendence | Next 3 pulses deal double damage, usable within 6s | Each empowered pulse costs 27; unused charges expire | Pearl official seal and bureaucratic choir; Radiance +.25, Echo +.15; Certainty +18 |
| **Productivity Halo** — optimization without limits | Double focus regeneration for 5s | +10 strain; then zero regeneration for 5s | Clock-shaped bone crown; Bone +.25; Drive +16, Certainty +6 |
| **Community Soup** — accepting ordinary help | +12 HP and −10 strain | Pulses deal half damage for 4s | Warm linked lights; Radiance +.20; Drive −6, Distance −8 |
| **Unanswered Question** — surrendering certainty | Shorten an eligible remaining aftermath by 3s, once per effect | Spend 20 focus; disabled below 20 | Broken seal; Echo +.15, Bone −.10; Certainty −15 |
| **Ordinary Water** — refusing the sales pitch | −8 strain | Opportunity cost: no offensive boost from this encounter | Quiet ripple; Radiance +.08; Drive −4, Distance −4 |

Unanswered Question is an explicit capped exception to the debt rule, never a silent replacement or full cleanse loop. It does not occupy a second active slot and cannot be repeatedly purchased for the same effect. All other definitions use the normal slot.

“Snort a line” is expressed through the White-Line Express pickup's adult-coded name, icon and immediate fictional effect, without a realistic use animation. The requested alcohol/Molotov combination becomes Last Orders/Cinder Comet: numbing plus a stylized fire projectile, without a bottle-construction sequence.

## 4. Helpful practices can become ruthless systems

Do not secretly turn basic breathing, connection or recovery harmful. Instead make the **escalated branch a separate, clearly chosen extreme**:

- Grounding → Meditation Subscription → **Compulsory Serenity**: a radiant bell clears enemy shots and strikes enemies; afterward its silence prevents pulses briefly. The joke is forcing everyone else to be calm.
- Healthy ambition → Productivity Halo → **The Perfect Employee**: a skeletal clock saint who can optimize an enemy out of existence, then cannot regenerate focus during its audit.
- Connection → Community Soup → **The Perfect Community**: a warm sanctuary becomes coercive when its happiness rules matter more than its people. An ordinary friend always offers an exit.
- Revelation → Enlightenment Certificate → **Certified Absolute Truth**: a laser-straight light mote passes judgment on the stage's absurd bureaucracy, then must carry the cost of its certainty.

These are authored combat fantasies, not statements that meditation or care causes violence. The player explicitly accepts the extreme. Healthy non-coercive alternatives remain viable.

## 5. Three encounter chains

### A. The commute becomes a productivity cathedral

An ordinary late bus becomes an express lane selling urgency. White-Line Express or Productivity Halo raises Drive through different routes. At the next checkpoint, deadlines become literal paper creatures and a manager with a clock halo demands “sustainable maximum output.” The player can buy speed, set a boundary, or leave. The boss is **The Quarterly You**: a performance review wearing the protagonist's face.

### B. Last orders at the happiness bar

A pub promises temporary distance. Last Orders changes the pulse to an impossible fire-comet; its higher focus cost is visible before acceptance. Repeated Distance choices turn the bar into **The Ministry of Not Feeling It**, with padded bureaucrats and receipts for forgotten evenings. Ordinary Water and a friend outside remain meaningful choices. No intoxication blur, inverted controls, realistic fire persistence, or crafting.

### C. The revelation queue

LSD-themed visions, meditation rituals, or mixed choices can all reveal the same cosmic waiting room. A clerk certifies mutually incompatible truths. High Certainty turns the room into a tribunal; low Certainty lets the protagonist admit “I don't know.” The ending is a conversation with the clerk, not a medical verdict or superior loot tier.

Sample lines: “Your inner peace subscription has expired.” / “This revelation requires two forms of ID.” / “Congratulations. You have optimized the joy out of it.” / “The universe has read your complaint and marked it resolved.”

## 6. Enlightenment and endings

Treat revelation as an interpretation, not a win meter. Use the encounter seed, event history and final choices to select ending fragments. No substance-only secret ending or permanent power advantage.

- **A Window, Not an Answer:** insight is useful even without certainty.
- **The Certified Infinite:** the player has acquired a magnificent explanation that cannot hold ordinary life.
- **The Shape of a Way Through:** contradictory choices remain part of the same person.
- **An Ordinary Morning:** quiet recovery/abstinence route, fully authored rather than a lesser ending.

Appearance can remain luminous, ghostlike, skeletal or mixed in every ending. Do not equate bright with healed or skeletal with failed.

## 7. Fairness and presentation

- Speed bonus ramps in/out over .75s, capped at 1.15× normal; adjust spawn scheduling to preserve minimum reaction time. No abrupt crash-speed penalty. An accessibility preference substitutes pulse power for acceleration.
- No invisible hazards, fake safe paths, obstacle blur or input inversion. Surrealism belongs in background, narration, enemy art and telegraphed patterns.
- Psychedelic geometry is static with reduced motion; no strobe. Menus remain stable. Audio-off removes every motif; effects never depend on hearing alone.
- Keep the fixed collision envelope and layer-based character renderer. Active signatures must distinguish purchased certainty from calm radiance even when both are bright.
- Adult thematic notice names substance use, addiction and psychological distress. Satirical narrator text is visually distinct from factual coping/support material; existing support remains accessible.

## 8. Implementation sequence

1. **Data and simulation:** `satire.ts` definitions and `PathState` with seed, behavior axes, event history and safe-checkpoint transitions. Tests before engine wiring.
2. **One vertical slice:** three encounters with Drive/Distance/Certainty branches and four initial effects: White-Line Express, Last Orders, Meditation Subscription, Ordinary Water. Behind a dev-only feature flag.
3. **Fairness pass:** speed ramps, reaction windows, damage/focus math, aftermath phase labels and the capped Question exception. Replay abstinent, substance-heavy, ritual-heavy and mixed routes using fixed seeds.
4. **Full catalog:** add LSD/revelation, happiness, community and productivity variants once the first slice is fun and readable.
5. **Fleet screenshot/audio review:** serious opening, contradictory midpoint, absurd endpoint; show mobile combat, each active/aftermath form and both routes to revelation. Compare like-for-like screenshots and short motion clips.
6. **Release:** feature PR to dev, staging playtest, then an owner-approved dev→main promotion. Existing saves must load unchanged. Never record permanent real-world-style substance history or copy production saves into staging.

## 9. Acceptance criteria

- Every offered effect's numbers, duration and cost match simulation; pause freezes every clock.
- No forced substance selection, no hidden buff/debt replacement, no infinite debt-cleansing loop.
- All four route profiles can finish; recovery does not require focus or substances.
- Serious opening is guaranteed; escalation follows behavior at safe checkpoints, not random costume swaps.
- Both substance and contemplative routes reach revelation scenes; no claim that drug abuse reliably creates enlightenment.
- At maximum speed, every generated hazard retains the agreed minimum reaction window.
- Physics and collision cues remain honest in every character form; reduced-motion/audio-off routes remain complete.
- Satire is specific to systems, monetization and contradictions, while characters with addiction/distress retain agency and humanity.

## Council synthesis

Elite selected the behavior-driven satire-of-certainty structure, the initial catalog and a vertical-slice rollout. Mi contributed escalating hustle, wellness and mixed-pilgrimage chains. HP rejected Mi's invisible obstacles, combat blur, flashing tells, forced maximum visual axes and abrupt +30%/−20% speed swing: they contradict existing fairness and mixing rules. Adopted Elite's gentler speed cap and authored threshold model. Refined Unanswered Question into a capped partial debt reduction to preserve meaningful consequences. These are design decisions for implementation, not claims of completed runtime work.
