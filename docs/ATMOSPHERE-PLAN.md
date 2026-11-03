# Fracture & Recovery — implementation plan

## Goal

A tense psychological survival runner: the road feels less trustworthy as strain rises, but the player's inputs and hazard silhouettes remain trustworthy. The protagonist is a person trying to survive, not a diagnosis or a monster. Temporary shortcuts are tempting, costly, and recoverable; skills and experience survive setbacks.

Next adaptation: [The Road to Absolute Nonsense](SATIRE-ADAPTATION.md), a council-informed plan for serious-to-surreal adult satire. That expansion is planned, not implemented.

## Fleet process

- Mi council: inspect existing engine and propose numerical coping/recovery rules, scenarios and acceptance criteria.
- Elite council: connection requested; independent atmosphere/UX and balance decisions when available.
- HP: integrate recommendations, run mechanical checks, send implementation to fleet for review, fix findings before a PR to dev.
- No production promotion without owner's release approval.

## Implementation sequence

1. A deterministic run-local strain/effect state machine, separate from permanent save data.
2. Three healthy coping choices and three costly shortcuts; every shortcut shows benefit, immediate cost and timed after-effect before selection. No focus gate on the recovery option.
3. Three recent unshielded stumbles pause for a coping choice. Always offer recovery, shortcut and continue. A cooldown prevents repeated interruptions; no automatic harmful selection.
4. Scripted decision checkpoints in existing chapters give first-run players real scenarios without needing to deliberately take damage.
5. HUD strain/state/effect timer, readable effect descriptions and a pause field guide; keep touch controls accessible.
6. Low-frequency background unease, changing horizon/character glow, state-specific sound motifs; no jump scares, strobe, inverted controls or hidden hazards. Sound off and reduced-motion remain effective.
7. Focused simulation tests for trigger windows, cooldowns, costs, expiries, pause behavior, recovery and boss pulse scaling. Build both base paths; fleet reviews the implementation.

## Release boundaries

Feature branch `feature/fracture-and-recovery` targets `dev`. The original production build and database remain untouched. This feature does not migrate saved progress or copy production saves into staging.

## Implemented balance (Mi consultation, HP integration)

One visible Strain meter (0–100), +12 per unshielded hit. After four safe seconds it recovers 1.5/s unless a shortcut remains active. Breath/heart/shield pickups and techniques lower strain; boss victory lowers it by 25. High strain adds reachable breath pickups, never hidden damage or altered controls.

| Choice | Immediate benefit | Explicit cost |
| --- | --- | --- |
| Name the Present | +20 focus, clear hostile shots for 4s, −24 strain | None; free at zero focus |
| A Kinder Voice | +16 HP, 20% damage reduction for 6s, −16 strain | None; free at zero focus |
| Reach for a Voice | 6s protection, −20 strain | None; free at zero focus |
| Bottle It Up | 6s protection | +14 strain, no focus regeneration for 12s total |
| Push Through | 5s double pulse damage | +18 strain, then 7s half focus regeneration |
| Tune Out | 4s slowed road/threats | +16 strain, then 8s pulses cost 27 rather than 18 |

Choices never stack or replace outstanding drawbacks. Three unshielded hits in 12 active seconds can trigger an offer; all offers have a 24-second cooldown. One story checkpoint appears around 24% of the run. Fog/Spiral use the alarm scenario; Courtroom/Burnout use the mistake scenario; Long Night uses the lit-window scenario. Continue clears the stumble window without added penalty. Pausing freezes all clocks.

Mi's refined response also suggested hidden high-strain penalties, speed/invulnerability boosts, and multiple meters. Those were omitted: explicit costs, one meter, and no automatic HP drain or speed-changing crash keep the integrated design legible and recoverable. Elite's connection remains pending, so no Elite verdict is claimed.
