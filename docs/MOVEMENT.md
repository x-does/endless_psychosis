# Discovering movement

## One-handed phone controls

Coarse-pointer phones default to right-side swipes. Up jumps; down crouches for one active second; left/right use the discovered positional dashes. Up cancels crouching. Gestures start below the HUD and above the bottom-right Pulse/Skill buttons, within the right 70% of the play area. Combat and bonus taps never start a movement gesture. Settings → Movement buttons restores pads; fine-pointer desktop browsers keep pads even in narrow windows.

Swipes recognize once on release after at least 28 CSS pixels, within 700ms, with a dominant axis at least 1.25 times the other. Taps and ambiguous diagonals do nothing. Cancellation is pointer-owner-aware; blur, modal opening and changed swipe bounds discard pending input. No movement is queued for undiscovered actions. Reduced motion uses the same static directional hint.

New and existing saves without `unlockedMoves` begin with Jump. Discover Crouch after 40m, Back dash after 100m, Forward dash after 180m. Held skills become eligible after chapter one is completed or level three is reached, after earlier movement discoveries.

Unlocks are acknowledged one at a time at grounded, hazard-free checkpoints, saved immediately, and survive retries. New spawns wait while a discovery is pending. Acknowledgement gives two seconds of recovery protection. Before Crouch, the ordinary spawner uses jumpable rocks instead of enemies or overhead branches.

Movement occupies the bottom-left cluster. Combat occupies a separate right column. Dashes move up to 65 scaled pixels over .18 seconds and retain the new horizontal position; the full hitbox stays within 12–48% of screen width. They share a 1.6-second cooldown, preserve vertical velocity and grant no immunity. Swept collisions include enemies, obstacles and hostile shots.

Skill activates on release. Before evolution every release uses the normal skill. After evolution, holding at least 450ms arms an alternate; the label shows its effect. Cancellation, blur and pause discard the press. Both modes share the existing 14-second cooldown. Keyboard Skill uses K/E or Space/Enter on the focused Skill button.

Held alternates: healing → 30 focus; focus → 12 HP; shield/dash → remove hostile shots; slowing → 3-second shield; clearing → 30 focus; purging → 3 seconds of .70 threat speed; rain → 12 HP. Coping costs are never erased.

## Fleet review

Elite selected progression/layout and inspected the 320px screenshot. Its first source review blocked dash sweep damage/projectile gaps, full-body bounds, discovery focus management and focused keyboard input. All four were corrected and targeted regression tests added. Elite re-fetched the revised source and approved main publication. Mi independently reviewed source discovery, hold rules and save compatibility; its review did not execute the full suite or inspect screenshots. HP ran 41 tests plus typecheck/build and checked browser layout, discovery acknowledgement/focus, bounded dash and held healing-skill focus alternate. No physical-device multitouch acceptance is claimed.
