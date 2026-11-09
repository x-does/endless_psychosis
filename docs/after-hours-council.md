# After Hours: council concept study

## Brief

Replace the arena-first direction with three independently playable, portrait-first browser prototypes. Test different core pleasures before choosing a longer-term mobile game. Research and rankings are design judgments, not market validation.

## Research map and selection

| Candidate | Core interaction | Portfolio decision |
| --- | --- | --- |
| Night Orchard | Plant seeds, choose directional moonlight, resolve growth | Selected: deliberate spatial planning |
| Borrowed Gravity | Time a tangent launch between orbital anchors | Selected: one-button skill |
| Midnight Switchboard | Assign waiting callers to three reusable cords | Selected: scheduling under pressure |
| Low Tide Archive | Dig for salvage and return before the tide | Strong reserve |
| Echo Steps | Escape a grid while an echo repeats earlier moves | Strong reserve |
| Glassfall | Drag-release shard launches and ricochets | Reserve; higher physics/aiming scope |
| Foldwater | Rearrange channel panels | Needs puzzle curation |
| Lost Property Bureau | Pack objects with adjacency rules | More placement/UI complexity |
| Midnight Exchange | Draft strange objects into an adjacency market | More explanation/balance complexity |
| Weather Thief | Catch weather and decide when to bank | Weaker differentiation |
| Foldhouse | Fold an architectural puzzle | Larger spatial-explanation burden |
| Nightline | Draw passenger routes between shifting islands | Denser phone interface |

Both primary selection members independently ranked the selected trio first, second, and third. The advisory member supported the portfolio with trajectory, shadow-preview, and pressure-tuning recommendations. Some advisory claims about existing accessibility coverage and cloud-save compatibility were unsupported and were not adopted.

## Reference precedents

- [Hoplite](https://www.magmafortress.com/p/hoplite.html): compact tactical maps.
- [Downwell](https://downwellgame.com/): bounded vertical action across desktop/mobile.
- [Mini Metro](https://dinopoloclub.com/games/mini-metro/): constrained drawing and resource allocation.
- [Super Hexagon](https://superhexagon.com/): minimal action vocabulary across platforms.
- [Gorogoa](https://www.annapurnainteractive.com/en/games/gorogoa): spatial rearrangement as the mechanic.
- [Overboard!](https://www.inklestudios.com/overboard/): replay from consistent systemic consequences.
- [Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events): unified web input.
- [Capacitor](https://capacitorjs.com/docs): possible future native packaging, not included in this release.

## Final scope choices

- Orchard uses two always-available plants, 12 turns, two-step maturation, explicit two-cell tree shadows, and exact previews.
- Gravity uses six authored crossings and unlimited retries at the current anchor, emphasizing learnable timing rather than lives.
- Switchboard uses a two-minute authored schedule, reusable cords, fixed caller slots, paired taps, and no early game-over. Missed callers affect the final rating. Wrong matches give feedback without a penalty.
- New routes are `/games/night-orchard`, `/games/borrowed-gravity`, and `/games/midnight-switchboard`. `/` is the collection and `/original` retains the previous game. Production cloud-save tables are not changed.

## What these prototypes validate

1. Can a first-time Orchard player deliberately create shaded growth?
2. Can a Gravity player understand a miss and improve the next launch?
3. Does Switchboard prompt scheduling choices rather than indiscriminate matching?

Native builds, market demand, retention, and real-device usability remain separate validation work.
