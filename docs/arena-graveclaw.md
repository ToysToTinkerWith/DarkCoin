# Graveclaw — playground roaming enemy

One shared, server-authoritative beast inhabits each new arena room. It does not
consume a champion slot, require an NFT, write movement to Firebase, or directly award tokens. Scheduled encounter loot is handled by the reward service. All connected clients see the same HP, stamina, mana, movement and attacks.

## Behaviour and playtest balance

| Property | Value |
| --- | --- |
| Health / stamina / mana | 320 / 100 / 100 |
| Walk / run | 1.2 / 2.7 metres per second |
| Acquire / lose target | 6.5 / 10 metres |
| Attack initiation | Within 1.75 metres, facing the target |
| Claw combo | 1.65 seconds, two separately resolved swipes |
| Attack stamina | 24 per combo |
| Sprint drain / idle recovery | 13 / 19 stamina per second |
| Exhaustion recovery | Retreats below 26 stamina; re-engages above 65 |
| Damage per claw | 3d6 + 9 slashing, before resistance |
| Crit | Independent 10% per claw, 2x damage |
| Bleed | Independent 30% per claw; 1 potency, 3 seconds |
| Physical resistance ratings | Blunt 12, slashing 28, piercing 18 |
| Magic resistance ratings | Fire 5; other types 20 |
| Tenacity | 15% |
| Public encounter schedule | One-hour cooldown after victory or retreat; two-minute warning/start rules in arena-encounter-rules.md |
| Defeat reward | All surviving champions immediately recover full health |

One Bleed application deals 3 raw damage/second. Successful reapplications
add potency and refresh duration through the existing combat rules. Each claw
can hit a target once per combo, with independent crit/proc rolls and no proc
lockout. Champion armour, barriers, reactive traits and resistances still apply.
Champions can damage the beast with fists, melee weapons, projectiles, area
spells and damage-over-time effects; slows, weakening, stagger and knockback
use the existing status system.

The beast patrols six waypoints with pauses, holds its current target until
out of range, and turns before committing. After a combo it chooses a short
circling move or diagonal retreat. Low stamina forces a walking retreat, then
a rest once it has enough space; it re-engages above 65 stamina. Retreats steer
away from the arena edge. These decisions and their seeded random choices run
only on the shared server. Its facing and feet stay fixed during
the claw combo so players can dodge behind it. A red ground warning precedes
the first hit; claw trails show the active swipe. New arrivals receive three
seconds of protection from NPC targeting/hits (not from other champions).
Its slower sprint allows an unimpeded running champion to create distance.
In scheduled encounters it heals only through Grave Renewal. On defeat it heals
every surviving champion once. The public schedule and loot rules are documented
in arena-encounter-rules.md; isolated unscheduled test rooms retain the old ten-second respawn. Defeated champions stay removed and must use **Back to
champions** to select a champion again; the group heal does not resurrect them.

## Model and animation sources

- Runtime GLB: `public/arena/playground/assets/beasts/graveclaw.glb`
- Editable Blender scene: `output/graveclaw/graveclaw.blend`
- Authored geometry: `scripts/graveclaw-model.js`
- Surface fusion, weight transfer and export: `scripts/refine-graveclaw.py`
- Shared motion/hitbox definition: `lib/arena/beast.js`
- Runtime controller: `components/arena/playground/beast.js`
- Viewer: `/arena/playground/beast-preview.html`

The asset has 21 bones and Idle, Walk, Run, Claw, Heal, Enrage and Death animation clips.
The anatomical forms are joined with voxel remeshing, smoothed, reduced for
realtime rendering, and rebound through interpolated skin weights. Horns,
talons, fangs, dorsal plates, eyes and carved lines remain separate material
surfaces. No external textures or linked Blender libraries are needed.

The revised rig uses actual pelvis/spine/chest and arm/leg parent chains,
shoulder and hip support joints, constant limb lengths and unit bone scales.
The claws use a broad shoulder-led hook: elbows remain bent 60–72 degrees,
the upper arm sweeps inward from the side, and the torso counter-turns
between swipes. Wrist orientation follows the forearm with a level palm,
including when the claw points sideways. Stable bind-frame transport avoids limb roll
flips. Foot targets use a fixed-length two-bone knee solution. Final skin weights
are smoothed around the support joints and limited to four influences per vertex.
The preview includes half-speed playback and an optional joint overlay.
Follow-through stops before the hand crosses the centreline; each arm returns
to its own side before the other swipe. Scapular plates attach to shoulder
support joints and their spikes fan outward/backward instead of rotating inward
with the upper arms.

Rebuild in this order:

```powershell
node scripts/build-graveclaw.cjs
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --python scripts/refine-graveclaw.py
node scripts/bundle-beast-preview.cjs
```

The build/QA scripts use the existing project tools in
`tmp/champion-model-tools/node_modules` (esbuild) and
`tmp/playground-qa/node_modules` (playwright), plus installed Chrome and Blender.
These development dependencies are not required by deployed browsers or the
arena worker. Adjust executable locations on another machine.

## Verification and deployment

```powershell
node --test tests/arena-beast.test.cjs tests/arena-combat.test.cjs tests/arena-realtime.test.cjs
node scripts/test-graveclaw-browser.cjs
node scripts/test-graveclaw-encounter.cjs
node scripts/test-graveclaw-deformation.cjs
npm run build:arena-server
npm run build:arena-realtime
npm run build
```

The encounter check compares actual exported claw sockets against server paths,
loads a real equipped champion, verifies damage labels, and defeats the beast
using the champion's sword. Renders and validation reports are under
`output/graveclaw/`. Balance values are initial playtest tuning, not established
PvE balance from player testing.

The deformation check samples actual exported skin edges around the shoulders
and hips during Walk, Run and Claw. Its original-model comparison is optional
and uses `output/graveclaw/revisions/initial-rig/graveclaw.glb` when present.
`deformation-validation.json` records regional 95th-percentile and maximum edge
length ratios relative to idle. These are deformation diagnostics, not a claim
that every vertex is free of compression or intersection.

Deploy web assets and the updated client before rolling the authoritative
worker to avoid old clients encountering an invisible NPC. Use the controlled
room drain/restart procedure in `arena-realtime-operations.md`. Existing room
objects without `beast` remain valid; newly created rooms spawn the beast.
Rollback requires reverting the worker as well as the web client. No database
migration, extra per-input persistence or new Firebase service is required.

The earlier September 21 GitHub recovery snapshot predates this new asset.
Include `output/graveclaw` and the new runtime/source files in the next backup.

## Production release — September 21, 2026

Published the model, client, `nextServer`, `arenaCombat`, and authoritative worker.
Web build: `1odlPJH-O_dgdNX3Tj0pe`. Worker: `arena-realtime-00011-ss7`, serving
100% of traffic. Admissions were drained for the replacement and reopened after
verification (`websocket`, `drain: false`). Players with an old tab should refresh.

Validation: 49 tests passed; browser transport checks passed for 1/4/8 clients
at 50/100/200 ms added latency. Exported claw sockets matched server paths within
9 mm. Public GLB and arena chunks matched local SHA-256 hashes. The live WebSocket
route rejected an invalid ticket as expected without creating a player. Public
`/healthz` returned a Google frontend 404, so transport was checked directly.
No synthetic champions were admitted to the live public room.
Read-only verification: `node scripts/verify-graveclaw-production.cjs`.
Details: `output/graveclaw/production-validation.json`.

## Mana abilities — October 2, 2026

The public Playtest card is compact: small idle model, Next Challenge, name and
current treasury inventory/odds. Inspect expands champion-style stat bars and
rotatable Claw, Heal and Enrage animation previews. Wheel zoom is disabled.

Graveclaw has 100 mana, recovering 1.2/s after a two-second post-cast delay.
- **Grave Renewal:** 35 mana, 1.8s cast, 24s cooldown after the cast; available
  below 55% health. Heals 4d8+12 (16–44 solo), multiplied by maximum HP / 320.
- **Grave Fury:** 45 mana, 2s cast, 30s cooldown after the cast. For 10 seconds:
  +25% movement speed, +40 maximum stamina, +50% stamina regen (28.5/s).
  Activation restores 40 stamina, capped at the new 140 maximum.

Both abilities raise both claws with green healing/orange enrage rings and
particles. Server release is at 65% of cast time; interruption before release
prevents the effect but does not refund mana. AI prioritizes healing over enrage,
only after entrance completes and a champion is targeted. Enrage is considered
below 85% health or 55 stamina. Old fractional status potency is normalized to
whole numbers; current authored effects use potency 1.

Validate with tests/arena-mana.test.cjs plus existing combat, beast, status,
encounter, replication and recovery tests. Rebuild GLB and run Blender refinement
to preserve the continuous sculpt before deploying Hosting.

## Mana release verification — October 2, 2026

Production web build: `o6ODvSruo6LlQjDl26R30`. Authoritative worker:
`arena-realtime-rollout-20261003-025808` (100% traffic). Published nextServer,
arenaCombat, arenaRewards, arenaNotifications and Hosting. The final GLB SHA-256
is `42a855432125bc513ea7d536742ff30d14deeb70a35d15f36fa8a4934cbe3e3b`.

139 gameplay tests passed, plus all 79,800 passive loadout combinations.
Exported claw-to-server error remains below 9 mm. Walk/Run/Claw/Heal/Enrage
shoulder and hip deformation passed the existing 95th-percentile threshold;
this is a deformation diagnostic, not a guarantee of zero local stretching.
The original sculpt-refinement pipeline and editable Blender file were retained.

`node scripts/test-arena-mana-browser.cjs --live` checks the compact card, all
three expanded clips, hitbox visibility, drag orbit, disabled wheel zoom and
mobile overflow. Omit `--live` and optionally set `ARENA_QA_URL` for local QA.
`node scripts/verify-playtest-production.cjs` verifies build ID, old-route
redirect, exact model hash/animation clips and current treasury inventory.
