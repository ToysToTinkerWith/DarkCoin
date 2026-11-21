# Cindermaw — dragon asset and proposed playtest balance

Cindermaw is a grounded, four-legged furnace dragon: charcoal hide, overlapping slate scales, bronze belly plates, ivory horns and claws, ember eyes and dark red bat-wing membranes. Its hinged jaw and long articulated tail drive the flame and sweep effects.

## Delivery and status

- Runtime model: `public/arena/playground/assets/beasts/cindermaw.glb`.
- Editable Blender scene and matching GLB: `output/cindermaw/cindermaw.blend` and `output/cindermaw/cindermaw.glb`.
- Interactive local preview: `/arena/playground/dragon-preview.html`.
- Shared stats, rig and animation math: `lib/arena/dragon.js`.
- Source geometry: `scripts/dragon-model.js`; game-side asset/VFX loader: `components/arena/playground/dragon.js`.

The model, animations and effects are implemented and previewable. These combat values are a proposed starting balance, not multiplayer playtest results. Cindermaw is **not spawned in the authoritative arena simulation and has not been deployed**. Graveclaw's live behavior is unchanged. The GLB contains geometry, materials, skeleton and animation; flame particles and warning/trail effects are implemented by the JavaScript loader rather than embedded in the GLB.

## Rig and animation

44 bones: root/body/chest, three neck joints, head, jaw, ten tail joints, three joints per leg, and articulated wing roots, elbows, wrists and fingers. Legs use fixed-length two-bone IK with planted feet during attacks. Torso motion does not stretch the leg bones. The main hide is fused and smoothed in Blender; skin weights are normalized and limited to four influences per vertex.

| Clip | Seconds | Motion |
| --- | ---: | --- |
| Idle | 3.0 | Breathing, subtle head movement, tail sway and wing flex |
| Walk | 1.6 | Deliberate diagonal gait with lifted swing feet |
| Run | 1.0 | Lower stance, longer stride and faster diagonal gait |
| TailSweep | 2.6 | Coil, brace, broad rear sweep, counterturn and recovery |
| FlameBreath | 4.2 | Neck lift, inhalation, jaw opening, fire plume and recovery |
| Bite | 1.5 | Jaw windup, short neck lunge and snapping bite |
| Death | 2.2 | Loss of footing, side fall, folded wings/legs, impact and settling; feet and talons clear the floor |

The preview supports orbit/zoom, five camera angles, timeline scrubbing, half speed and visible joints. It loops attacks for inspection and holds the final defeated pose until Replay is pressed; a future game controller should play attacks and death once. Locomotion is in place; an arena controller supplies world translation. Wing motion is grounded bracing, not a flight animation.

## Core stats

| Stat | Value |
| --- | ---: |
| Maximum health | 720 |
| Maximum stamina | 140 |
| Walk speed | 1.15 m/s |
| Run speed | 2.65 m/s |
| Stamina regeneration | 18/s |
| Sprint drain | 16/s |
| Body collision radius | 0.78 m |
| Target acquisition radius | 9 m |
| Target loss radius | 13 m |
| Critical chance per direct hit | 10% |
| Critical damage | 2× |
| Tenacity | 20% |

Suggested authority policy: regenerate stamina only outside attacks/sprinting; no passive health regeneration. Acquisition/loss radii are configuration for later AI integration. The body radius represents the central torso; the tail and wings should not block champion movement. Long-range attacks are slower and cost more stamina than the bite, giving players a recovery window.

### Resistances

These are ratings, not flat percentages. Use the arena's existing `100 / (100 + rating)` incoming-damage multiplier.

| Damage type | Rating | Damage reduction |
| --- | ---: | ---: |
| Blunt | 15 | 13.0% |
| Slashing | 30 | 23.1% |
| Piercing | 10 | 9.1% |
| Fire | 55 | 35.5% |
| Frost | 0 | 0% |
| Lightning | 15 | 13.0% |
| Water | 0 | 0% |
| Poison | 25 | 20.0% |
| Shadow | 20 | 16.7% |
| Arcane | 15 | 13.0% |

Fire is its strongest defense; frost and water avoid that protection. Resistances are kept modest enough that physical builds still contribute.

## Attacks

| Attack | Raw damage | Stamina | Cycle | Active window | Reach/effect |
| --- | --- | ---: | ---: | --- | --- |
| Scouring Tail | `3d8+8` blunt; 11–32, mean 21.5 | 38 | 2.6s | 1.040–1.638s | Roughly 160° rear sweep; 3.6m envelope; 0.28m contact radius |
| Furnace Breath | Six `1d6+3` fire pulses; 4–9 each, 24–54 total, mean total 39 | 48 | 4.2s | 1.176–3.024s | 5.8m from mouth; 26° cone; 0.20m mouth width; 8s cooldown |
| Ironfang Bite | `2d6+5` piercing; 7–17, mean 12 | 20 | 1.5s | 0.630–0.825s | 2.6m forward envelope; 0.25m mouth contact radius |

Damage values exclude critical hits, resistances and damage-over-time effects. Each direct hit independently rolls its dice and critical chance. Each fire pulse independently rolls its burn chance as well. There is no proc/crit lockout. Tail and bite use their action cycle and stamina cost, without a separate cooldown. The proposed breath cooldown is start-to-start.

- **Tail:** guaranteed knockback at 1.1 potency (approximately 0.715m using the current 0.65m base). Hit a given target once per sweep, even if several tail samples overlap them. The red ground warning is generated from the actual animated tail path.
- **Breath:** 25% burn chance per pulse, 0.65 potency. With the existing burn rule, a single application is 2.6 raw damage/s for 2s. Six direct pulses span the active interval. Lock world aim at release; retain only the authored small head sweep so players can sidestep the plume.
- **Bite:** 25% bleed chance, 0.65 potency. Under the existing bleed rule, a single application is 1.95 raw damage/s for 3s. Apply direct damage only once per target in the active window.

Reapplying an effect adds its potency and refreshes its duration, consistent with the arena's existing stacking rules. Damage-over-time ticks do not independently crit. Integrating the dragon will require the authoritative server to apply these policies; the preview does not deal damage.

For collision integration, use the shared `dragonSockets()` positions and swept segments between simulation ticks, rather than a static circle around the dragon. `FlameMuzzle` and `TailImpact` are also embedded in the exported model. Reach values are envelopes, not a substitute for those sampled contact positions. Fire particles are a visual plume, not individual damage projectiles.

## Rebuild and validation

Run from the repository root (the scripts use the existing local Three.js, esbuild, Playwright and glTF Validator dependencies):

```powershell
node scripts/build-dragon.cjs
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --python scripts/refine-dragon.py
node scripts/bundle-dragon-preview.cjs
node --test tests/arena-dragon.test.cjs
node scripts/test-dragon-browser.cjs --serve
```

The final command serves the preview at `http://127.0.0.1:8847/arena/playground/dragon-preview.html` after browser QA. Omit `--serve` for a one-shot test. Rebuilding regenerates the model and replaces Blender edits; keep custom sculpt edits in a separate source scene before running the procedural build again.

Validation checks all animation frames for finite transforms and fixed limb lengths; planted attack feet; tail floor clearance; smooth looping and idle transitions; attack data; valid glTF; and exported socket alignment against shared animation math. Browser QA samples every clip, checks loading errors and saves multi-angle renders to `output/cindermaw/`. No live server or player data is touched.

The defeat regression check, `node scripts/test-dragon-defeat.cjs` (with the preview server running), samples all exported skinned vertices at 133 points through the fall, checks ground clearance, verifies the final-pose hold and Replay control, and saves five camera views plus intermediate poses. Its report is `output/cindermaw/defeat-validation.json`.
