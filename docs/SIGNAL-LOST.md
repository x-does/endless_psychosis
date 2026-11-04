# Psychosis / Signal Lost

## Original game analysis

The previous game is a side-scrolling runner across five chapters with an endless mode. Distance advances the chapter and eventually starts its boss. Jump buffering, crouching, and positional dashes give obstacle timing some forgiveness. Movement unlocks progressively: jump, crouch at 40m, backward dash at 100m, forward dash at 180m, then a held alternate skill after evolution. Forward/back share a 1.6-second cooldown and do not confer immunity.

Pulse spends regenerating Focus to launch an expanding area attack and a projectile. Equipped active techniques heal, shield, slow, clear, dash, restore Focus, or attack the arena; permanent passives increase survival, collection, and attack radius. Skill and Pulse share a timer in the original implementation. Coping choices add strain, short-term benefits, delayed drawbacks, and appearance changes. An optional satire system adds another layer of temporary effects. Golden bats offer separate tap rewards. Chapters unlock techniques, permanent stats, journals, and further chapters; cloud saves use the existing production database.

The original's strengths are its atmosphere, compassionate voice, and changing character appearance. Its weakness is attention overload: obstacle timing, firing, Focus, cooldowns, strain, appearance, temporary effects, delayed costs, modal choices, and tap rewards all compete. The remake retains atmosphere and persistence after failure while concentrating decisions into movement, dash timing, one skill, and build choices. Mental illness is not represented as an enemy that can be conquered through game performance.

## Council and decisions

The requested three-provider council could not be formed. The catalog exposed two enabled providers. GPT Sol returned a design analysis; the advertised Claude Opus connection failed with “Requested entity was not found.” No substitute model or consensus is claimed.

Adopted: a standalone simulation/input/render/content boundary, continuous normalized movement, auto targeting, independent cooldowns, invulnerable dash, telegraphed danger, three immediate playstyles, between-wave drafts, proximity rewards, and a separate save namespace. Deferred: a much larger upgrade pool, additional enemy roles, cosmetics, cloud sync for the new game, and elaborate boss beams. Those would obscure the first complete combat loop and need playtesting first.

The visual language is a quiet dark transit network, acid-green signal, peach/violet pilot accents, thin diagrams, angular masked characters, large condensed headings, and a compact monospace HUD. Characters and environments are drawn procedurally; no borrowed character assets. Hostile attacks are pink, distinct in shape from friendly bolts; marked circles fill before impact. Arrival markers provide 0.8 seconds of warning, and boss windup rings announce attacks. Reduced motion removes particles and decorative rotation; functional danger timing stays visible.

## Playable remake

- Vesper: fast, low integrity, rapid paired short-range bolts; Afterimage damages a nearby cluster.
- Rook: slow, armored, long-range piercing bolts; Dead Frequency clears hostile projectiles and attacks the entire arena.
- Io: medium movement and integrity, homing fire plus orbiting satellites; Event Horizon slows threats and repairs integrity.
- WASD/arrows move; Space dashes; E uses the skill; Escape pauses. Touch movement supports simultaneous skill/dash pointers. Auto attack requires no aiming or firing input.
- Six encounters, grouped in three districts. Ordinary enemies spawn for 25 seconds, then must be cleared. Encounters 2, 4, and 6 spawn bosses after that interval. Bosses must be defeated; there is no forced timeout win. Actual duration depends on build and skill, typically several minutes.
- Ferryman stamps adjacent floor zones. Choir adds radial volleys and marked impact zones. Aerial combines denser volleys and triple stamps. Bosses accelerate below half integrity.
- Three enemy roles: pursuing hunters, ranged gunners, durable brutes.
- Five drafts of three upgrades, selected from eight stacking effects. Multishot adds Io satellites; pierce, range, movement, damage, fire rate, recovery, integrity, and skill cooldown offer different builds.
- Every ninth defeat drops a rotating repair/barrier/overdrive reward. Move within 32 units to collect. Repair restores 22, barrier blocks damage for 3 seconds, and overdrive doubles attack speed for 5 seconds. Rewards expire after 14 seconds.
- Clearing encounters restores 12 integrity. Death records score and allows immediate retry; victory requires defeating the final boss. Runs cannot be resumed after reload.

## Implementation plan and completion

1. Analyze the old runtime, progression, movement, and save boundary; consult the available council.
2. Build independent typed content and deterministic testable simulation.
3. Add procedural characters, arena, projectiles, warnings, drops, and boss rendering.
4. Build pilot selection, HUD, pause, draft, results, settings, and touch movement.
5. Validate movement/cooldowns, warning immunity, draft freezing, all six transitions, pickups, loss/win behavior, record persistence, and save isolation.
6. Run repository tests, typechecking, production build, code review; address findings, commit on main, push and check live assets separately.

## Save compatibility

Only `psychosis.signal-lost.v1` is written by the remake. It contains records and sound/motion preferences. Legacy local keys, sync codes, the `endless_saves` table, server schemas, and old staging saves remain untouched. The legacy runtime remains in source for preservation but is not mounted, so none of its autosave or cloud effects run. New records are device-local. Storage failure does not prevent play and is shown to the player.

## Council code review

Rounds: 2

| Delegate | Round 1 | Round 2 |
| --- | --- | --- |
| GPT Sol | 7/10 | 9/10 |
| Claude Opus | no score — connection failed | unavailable |
| Gemini Pro | unavailable | unavailable |

Round 1 found multishot aim loss with even projectile counts, native Space activation blocked by gameplay controls, and healing after lethal damage in the same simulation frame. All were fixed with regressions. Round 2: satisfied with the initial game's ship criteria, no blocking findings. The reviewer independently reran 56 tests, typecheck, and production app/server build. Three-provider council satisfaction cannot be claimed because only GPT Sol completed reviews.

Automated browser validation covered desktop launch, keyboard movement and abilities, pause/resume, help, native Space activation, preference persistence, preservation of legacy local keys, and a 390px mobile viewport with real touch input/cancellation. No page errors. A simple automated movement bot completed all six encounters as Rook; Vesper and Io require further human balance testing. This verifies reachability rather than equivalent difficulty.
