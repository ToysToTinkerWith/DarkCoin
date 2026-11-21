> Retired September 28, 2026: champion second attacks have been removed from gameplay and previews. This document records historical authoring work only. Original attacks remain unchanged.

# Arena weapon combos

Two left-button presses within 340 ms queue a two-action combo. The first press starts the existing attack immediately; it does not wait to decide whether the player will double-click. One queued follow-up starts after every damaging window of the first attack, before its return to the holding pose. More presses do not queue a third attack. A single press keeps the original attack.

Each action pays the weapon's normal stamina cost. The second cost is charged when that action starts, and an interrupted or unaffordable follow-up does not start. The first and second actions have different server attack IDs. Each strike and each target retains independent damage, critical and on-hit rolls; dual katanas and fists can land four strikes across their complete combo. Spell-trait abilities retain their existing casting/cooldown system; double-click combos apply to weapon attacks and unarmed attacks.

| Weapons | Second attack |
| --- | --- |
| Dragon Longsword, Dark Sword, Ske'tonian Sword, Rusty Sword, Hedge-Knight Sword | Chamber beside the head, then cut diagonally across and down |
| Dual Katana, Arctic Dual Katana | Right overhand cut, then left overhand cut; shoulder-level chambers and approximately right-angle elbows |
| Sickle | Raised hooked cut descending across the front |
| Scythe | Return to the original guard, raise the shaft and shove forward with its middle |
| Executioner Axe | Two-handed descending diagonal chop |
| Wooden Club | Shoulder chamber into a two-handed cross-body sweep |
| Shield | Re-chamber and strike across the front with the shield edge |
| Spear, Trident | Withdraw into a higher two-handed chamber, then thrust |
| Elf Bow | Keep the bow raised, draw again, release and settle |
| Dragon Staff, Lightning Staff | Raise the staff and gather into another forward cast |
| Snake Wings, Fire Wings, Elder Wings, Chameleon Wings, unarmed | Lead hook followed by rear uppercut |

## Authoring and collision

The September 27 revision replaces reversed/time-compressed first-attack playback with independent follow-up poses. First attack pose data, hit windows and baked collision frames are unchanged. The exact first-attack chain pose is the follow-up's first frame; the original holding pose is its last frame.

`lib/arena/weapon-combos.js` defines family timing and strike/release windows. `components/arena/playground/combo-pose.js` authors grip-centred weapon paths, solves elbows with the rig's actual limb lengths and uses continuous cubic position and spherical rotation tracks. Intermediate poses retain momentum; genuine reversals and endpoints settle smoothly. Sword cuts take a forward arc instead of a straight chord through the shoulder. Two-handed weapons move as a rigid object constrained by both arms' reachable volume; the supporting hand cannot be clamped separately away from the handle. The torso turn is distributed across spine/chest joints. Locomotion stays independent.

The scythe follow-up uses a separate socket fitted to the actual shaft mesh between the hands. It deals **3d8+16 blunt damage**, has a **45% push chance**, a 0.10 m hit radius and a 1.1 m maximum reach gate; the shorter actual shaft path still determines contact. The original blade attack keeps its original damage and bleed. Other follow-up dice and effect chances are retained, with longer authored cycles where needed for a controlled motion; their damage per second is consequently lower than before. This is deliberate rather than speeding the recovery back up.

The BKA [guidance for dojo leaders](https://www.britishkendoassociation.com/a-guide-for-dojo-leaders-and-examiners/) informed controlled descending cuts and extension through the target. These are fantasy single-handed/dual-blade movements, not an orthodox kendo demonstration. World Archery's [recurve overview](https://www.worldarchery.sport/sport/equipment/recurve) and [form guidance](https://www.worldarchery.sport/news/149488/9-common-recurve-archery-mistakes-and-how-fix-them) informed retaining the bow arm through release and using the drawing elbow/shoulder.

`node scripts/bake-arena-collision.cjs` regenerates both the original and follow-up socket paths from the character pose implementation. The server uses `weapon-combo-paths.json` for second attacks, and the inline champion attack preview uses the same data for its pink hitbox overlays. The original idle model remains a separate preview.

The network carries only the accepted combo step and queue state as part of its existing action delta. It does not send per-frame bones or write additional movement frames to Firestore. The server decides eligibility, timing, stamina, hits and projectile creation.

## Checking changes

- `node --test tests/arena-weapon-combos.test.cjs tests/champion-attack-playback.test.cjs` checks all weapons, chaining, costs, interruptions, collision reach, handoff continuity, joint lengths, hand contacts and independent repeated hits.
- `node scripts/review-weapon-combos.cjs` renders all 22 combinations into `output/weapon-combos-v3`. Set `COMBO_REVIEW_SIDE=side` for side contact sheets. Use `--serve` for the interactive local reviewer on port 8850.
- `node scripts/build-arena-realtime.cjs` followed by `node scripts/test-arena-realtime-browser.cjs` exercises real browser double-clicks, movement, observer synchronization and reconnects with artificial latency.

## Regression evidence, September 27

- `tests/arena-combo-motion.test.cjs` compares first-attack SHA-256 fingerprints across walking, running and strafing; tests all 22 follow-ups for endpoint continuity, finite hand speed, retained bone lengths, independent leg poses, two-handed grip contact and katana chamber angles.
- `scripts/audit-combo-motion.cjs` samples 600 frames per follow-up at baseline cycle speed. Set `COMBO_AUDIT_OUTPUT` to a new filename when retaining comparisons. The katana maximum hand speed fell from **74.726 to 3.241 m/s**, scythe **11.864 to 1.722 m/s**, and longsword **36.185 to 3.341 m/s**. These are rig measurements, not motion-capture claims. Haste scales playback normally.
- Front and side contact sheets render nine phases for every weapon; the browser selector checks first/second/full-combo playback, hitboxes, dice/effects, orbit controls and mobile width. First collision frames/windows were compared directly against the saved pre-change bake.
- The multiplayer browser test waits for the server's action-complete state before drawing, rather than assuming a fixed 1.2-second recovery. Its 1/4/8-client cases exercise latency, double-click buffering, observer synchronization and reconnects.


## Follow-up refinement: continuous grips and anatomy

The next pass found that small hand speeds alone did not guarantee a natural pose. Some original first-attack grip frames differ from the held grip by roughly 150–170 degrees. Interpolating the weapon and its local hand grip independently compounded these rotations and folded the palm back against the forearm. The follow-up now interpolates the world hand orientation and derives the weapon from that grip. Original first attacks remain unchanged.

Authored keys align palms with forearms before interpolation. Blade-axis roll is adjusted before tilting a sword, retaining the intended striking direction. Spear/trident roll balances both grips while preserving the forward shaft axis. Elbow poles can make a limited anatomical adjustment, and the supporting palm can re-seat outside the contact window. Both hands stay rigidly on two-handed weapons during damage windows.

| Family / weapons | Motion refinement |
| --- | --- |
| Dragon Longsword, Dark Sword, Ske’tonian Sword, Rusty Sword, Hedge-Knight Sword | Continuous hand orientation through the first-to-second transition; blade-aligned grip roll; descending cut retains forward reach and carries through the finish. |
| Dual Katana, Arctic Dual Katana | Staggered right/left chambers; the waiting sword stays in guard before rising; torso rotation reverses with the striking arm; both cuts descend in front. |
| Scythe | Smooth return to guard, raised shaft shove and controlled recovery; shaft-centred collision retained. |
| Executioner Axe | Shared grip adjustment during preparation, supporting elbow follows the handle, torso leads the descending chop. |
| Wooden Club | Continuous two-handed shoulder-to-cross-body arc, with momentum into follow-through and no independent supporting-hand clamp. |
| Sickle | Blade-axis roll preserves the hooked cutting path while avoiding a folded wrist. |
| Shield | Smooth cross-body edge strike and controlled return, with the hand following its centred handle. |
| Spear, Trident | Both hands share shaft roll; points remain forward through the thrust instead of dipping downward to compensate for wrist alignment. |
| Dragon Staff, Lightning Staff | Raised preparation, lower forward release hand and restrained staff tilt, then a smooth return. |
| Elf Bow | Bow arm stays up through release; the released drawing arm recovers through local shoulder/elbow rotations, avoiding a near-straight-arm IK flip. |
| Snake, Fire, Elder, Chameleon Wings and unarmed | Torso follows the hook/uppercut sequence; wrists align with forearms; both free arms recover through local joint rotations. |

The University of Washington’s [animation principles notes](https://courses.cs.washington.edu/courses/cse458/24au/content/exercises/animation_principles.html) informed arcs, overlapping motion and follow-through. These are authored fantasy motions, not motion-capture or anatomically exact simulations.

Validation now includes continuous curve tangents, maximum elbow speed and palm-to-forearm alignment across all 22 follow-ups, alongside the earlier endpoint, grip, limb-length and first-attack fingerprint checks. The palm angle is a rig alignment proxy, not a medical wrist measurement. Front/side contact sheets and the 600-sample audit are in `output/weapon-combos-v3`. Gameplay paths are regenerated from these poses so server collision and preview overlays use the same revised second strikes. Damage dice, proc chances, stamina costs, attack timings and first-attack collision paths are unchanged in this refinement.
