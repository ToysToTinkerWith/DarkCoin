> Retired September 28, 2026: champion second attacks have been removed from gameplay and previews. This document records historical authoring work only. Original attacks remain unchanged.

# Second-attack motion audit

Samples: 601 poses per option, baseline attack-cycle speed, walking pose held at phase 0.31. First-attack fingerprints additionally cover walk, run and left strafe. These are procedural rig measurements, not motion-capture or medical joint measurements.

Palm/forearm angle measures the wrist-to-metacarpal direction against the elbow-to-wrist direction. Values above 90 degrees indicate the palm doubling back toward the forearm. Each reported maximum is across both hands and the full second attack, including its transition and recovery.

| Weapon | Previous max palm/forearm angle | Revised angle | Revised max hand speed | Revised max wrist rotation speed |
| --- | ---: | ---: | ---: | ---: |
| Dragon Longsword | 131.9° | 54.4° | 2.70 m/s | 4.83 rad/s |
| Dragon Staff | 87.9° | 37.8° | 1.29 m/s | 2.71 rad/s |
| Dual Katana | 127.6° | 39.2° | 2.69 m/s | 8.34 rad/s |
| Executioner Axe | 138.7° | 65.3° | 2.19 m/s | 6.66 rad/s |
| Scythe | 47.1° | 44.1° | 1.35 m/s | 3.02 rad/s |
| Shield | 46.2° | 48.9° | 2.00 m/s | 3.22 rad/s |
| Sickle | 101.6° | 46.5° | 3.38 m/s | 6.67 rad/s |
| Spear | 97.7° | 60.3° | 3.15 m/s | 9.36 rad/s |
| Trident | 97.5° | 60.3° | 2.92 m/s | 8.68 rad/s |
| Dark Sword | 131.8° | 54.4° | 3.02 m/s | 5.41 rad/s |
| Elf Bow | 88.5° | 43.5° | 5.19 m/s | 18.68 rad/s |
| Wooden Club | 111.6° | 47.9° | 1.29 m/s | 5.49 rad/s |
| Snake Wings | 87.4° | 35.5° | 3.38 m/s | 8.97 rad/s |
| Sketonian Sword | 132.0° | 54.4° | 2.91 m/s | 5.20 rad/s |
| Fire Wings | 87.4° | 35.5° | 3.22 m/s | 8.55 rad/s |
| Elder Wings | 87.4° | 35.5° | 3.22 m/s | 8.55 rad/s |
| Chameleon Wings | 87.4° | 35.5° | 3.38 m/s | 8.97 rad/s |
| Arctic Dual Katana | 131.4° | 41.7° | 2.69 m/s | 8.16 rad/s |
| Rusty Sword | 131.8° | 54.4° | 3.60 m/s | 6.44 rad/s |
| Lightning Staff | 87.5° | 37.8° | 1.47 m/s | 3.04 rad/s |
| Hedge Knight Sword | 131.8° | 54.4° | 3.02 m/s | 5.41 rad/s |
| Unarmed | 87.4° | 35.5° | 3.38 m/s | 8.97 rad/s |

No first-attack pose hashes changed. Original first-attack baked collision paths also compare identically. All 22 options passed the endpoint, limb-length, gait independence, palm alignment, hand/elbow speed and contact-grip tests. The spear/trident contact axes were separately checked to remain aimed forward.

See [motion design and per-family changes](arena-weapon-combos.md) for implementation details. Reproduce with `scripts/audit-combo-motion.cjs`; use `COMBO_AUDIT_OUTPUT` for the output path and optional `COMBO_AUDIT_BUNDLE` for a saved comparison implementation. Visual sheets are in `output/weapon-combos-v3`.


## Release verification

Published September 27, 2026 (Pacific time). Web build: `bnGDiOD2gpPxJn4KVYSMg`. Worker revision: `arena-realtime-00028-kap`, with 100% production traffic. Web function: `nextserver-00070-dat`; Firebase combat fallback: `arenacombat-00024-hab`.

73 automated tests passed, all 22 local weapon previews passed, and the multiplayer browser checks passed for 1, 4 and 8 clients at 50, 100 and 200 ms added round-trip latency. The production build ID and worker WebSocket handshake were verified. The temporary review route was removed and the arena transport restored to WebSocket mode after deployment.
