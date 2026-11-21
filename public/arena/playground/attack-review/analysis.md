# DarkCoin weapon animation and hitbox analysis

Measured from the current 3D animation paths used by the authoritative arena simulation. All 21 weapon traits plus the unarmed fallback are included. Values are for a stationary, forward-facing champion, at the weapon's base cycle (zero haste).

## How to read the previews

- Pale red circles cap a translucent 3D capsule along the active blade segment. The circles are horizontal cross-sections, not a replacement for 3D collision.
- Projectiles have a moving red circle and sphere with radius equal to half their configured width. They move forward from the actual release socket; the camera follows their flight.
- The ground arc is an annotation of the blade tip's angular span during its active window. It is **not** a filled damage cone. Winding up and recovering do not deal melee damage.
- 0 degrees points forward; positive bearings point toward the champion's right. Angles are unwrapped per strike. Tilt means blade axis elevation above the horizontal ground plane.
- Each separate strike can hit each target once, with its own crit and effect rolls. Dual katanas and wing punches have two independent active windows.

## Measurement method and limits

The source contains 121 frames per attack, sampled from the actual weapon/fist joints. These measurements interpolate the exact server paths at 480 phase intervals per cycle, inserting both active-window endpoints. Angular span is max-minus-min unwrapped tip bearing; angular travel includes reversals and can be larger. Radius is horizontal distance from the champion's root to the outer socket. Blade pitch uses the vector from inner to outer socket.

The server sweeps between phases (up to 240 phase subdivisions per cycle), samples along each blade segment at intervals no larger than 4 cm, and tests against a target capsule of radius 0.28 m with its axis from 0.40 to 1.65 m above ground. It also rejects melee target centers farther away than configured reach + 0.28 m. The configured reach caps enclose every reviewed active melee capsule; the sickle and Arctic katana caps were raised to eliminate clipped edges. A top-down overlap alone still does not guarantee a hit because vertical clearance matters. Segment sampling can miss extremely shallow edge contacts between samples; the overlay shows the intended continuous capsule.

The scythe capsule now fits blade-only mesh cross-sections, keeping it clear of the shaft and pierced heel. All seven sword families (including both dual-katana variants) translate their entire capsule 0.08 m toward the handle. Other melee sockets approximate the damaging portion as a straight segment from 38% of the grip-to-farthest-tip vector to the farthest tip. This is not a per-triangle blade collider: curved blades, broad shields, and club heads remain capsule approximations. Punches use hand-local endpoints; projectile weapons use their release mesh center. The review and live arena consume the same collision paths and strike windows. The resulting angles are descriptive metadata, not new restrictions on an attack.

Projectile flight is shown without a target. A real projectile ends at impact, max range, or the arena boundary. Projectile origin can vary slightly in the live 30 Hz simulation because it is sampled on the release-crossing step; previews use the exact authored release phase. Player movement translates the path and their facing rotates it. Equipment haste changes timing, not these stationary path measurements.

## Per-weapon measurements

| Weapon / strike | Active time | Tip sweep | Start → end bearing | Tip radius | Blade tilt | Collider radius |
|---|---:|---:|---:|---:|---:|---:|
| Dragon Long Sword / 1 (L) | 0.28–0.91 s | 143.3° | -93.3° → 50.0° | 1.37–1.47 m | 30.0°…30.0° | 0.12 m |
| Dragon Staff | release 0.91 s | forward projectile | 0° heading | 13 m range | — | 0.16 m |
| Dual Katana / 1 (R) | 0.14–0.46 s | 142.6° | 91.3° → -51.3° | 1.25–1.36 m | 31.8°…31.9° | 0.10 m |
| Dual Katana / 2 (L) | 0.62–0.92 s | 139.4° | -88.4° → 50.9° | 1.25–1.36 m | 35.6°…35.6° | 0.10 m |
| Executioner Axe / 1 (R) | 0.37–1.22 s | 170.9° | -104.5° → 66.3° | 1.15–1.55 m | -14.3°…33.1° | 0.18 m |
| Scythe / 1 (R) | 0.31–1.18 s | 133.9° | -87.1° → 36.4° | 1.61–1.70 m | -3.5°…-1.2° | 0.14 m |
| Shield / 1 (L) | 0.22–0.72 s | 13.0° | -35.9° → -22.8° | 0.51–0.68 m | -69.7°…-69.7° | 0.12 m |
| Sickle / 1 (L) | 0.20–0.65 s | 144.2° | -74.2° → 69.9° | 1.13–1.29 m | 23.1°…23.1° | 0.12 m |
| Spear / 1 (L) | 0.50–0.78 s | 11.8° | -20.8° → -9.0° | 0.90–2.04 m | -0.3°…-0.3° | 0.09 m |
| Trident / 1 (L) | 0.54–0.84 s | 9.2° | -17.4° → -8.2° | 1.05–2.20 m | -0.0°…-0.0° | 0.14 m |
| Dark Sword / 1 (L) | 0.25–0.81 s | 143.1° | -93.3° → 49.7° | 1.32–1.42 m | 29.6°…29.6° | 0.12 m |
| Elf Bow | release 0.86 s | forward projectile | 0° heading | 15 m range | — | 0.08 m |
| Wooden Club / 1 (R) | 0.51–1.15 s | 178.1° | -178.8° → -0.9° | 0.03–1.45 m | -28.9°…89.6° | 0.20 m |
| Snake Wings / 1 (R) | 0.18–0.36 s | 15.5° | 29.7° → 14.5° | 0.31–0.63 m | 0.9°…11.6° | 0.12 m |
| Snake Wings / 2 (L) | 0.36–0.53 s | 11.1° | -33.0° → -22.2° | 0.41–0.66 m | 0.8°…10.6° | 0.12 m |
| Ske'tonian Sword / 1 (L) | 0.26–0.85 s | 143.6° | -93.3° → 50.3° | 1.41–1.51 m | 30.2°…30.3° | 0.12 m |
| Fire Wings / 1 (R) | 0.19–0.38 s | 15.5° | 29.7° → 14.5° | 0.31–0.63 m | 0.9°…11.6° | 0.12 m |
| Fire Wings / 2 (L) | 0.38–0.56 s | 11.1° | -33.0° → -22.2° | 0.41–0.66 m | 0.8°…10.6° | 0.12 m |
| Elder Wings / 1 (R) | 0.19–0.38 s | 15.5° | 29.7° → 14.5° | 0.31–0.63 m | 0.9°…11.6° | 0.12 m |
| Elder Wings / 2 (L) | 0.38–0.56 s | 11.1° | -33.0° → -22.2° | 0.41–0.66 m | 0.8°…10.6° | 0.12 m |
| Chameleon Wings / 1 (R) | 0.18–0.36 s | 15.5° | 29.7° → 14.5° | 0.31–0.63 m | 0.9°…11.6° | 0.12 m |
| Chameleon Wings / 2 (L) | 0.36–0.53 s | 11.1° | -33.0° → -22.2° | 0.41–0.66 m | 0.8°…10.6° | 0.12 m |
| Arctic Dual Katana / 1 (R) | 0.14–0.46 s | 143.0° | 91.5° → -51.5° | 1.31–1.42 m | 29.8°…29.9° | 0.12 m |
| Arctic Dual Katana / 2 (L) | 0.62–0.92 s | 139.5° | -91.8° → 47.7° | 1.33–1.42 m | 29.8°…29.9° | 0.12 m |
| Rusty Sword / 1 (L) | 0.21–0.68 s | 143.6° | -93.3° → 50.3° | 1.41–1.51 m | 29.8°…29.8° | 0.12 m |
| Lightning Staff | release 0.80 s | forward projectile | 0° heading | 12 m range | — | 0.13 m |
| Hedge-Knight Sword / 1 (L) | 0.25–0.81 s | 143.6° | -93.3° → 50.3° | 1.41–1.51 m | 29.8°…29.8° | 0.12 m |
| Unarmed / 1 (R) | 0.18–0.36 s | 15.5° | 29.7° → 14.5° | 0.31–0.63 m | 0.9°…11.6° | 0.12 m |
| Unarmed / 2 (L) | 0.36–0.53 s | 11.1° | -33.0° → -22.2° | 0.41–0.66 m | 0.8°…10.6° | 0.12 m |

## Individual observations

### Dragon Long Sword

Base cycle: 1.40 s. Damage: fire. Melee target-center reach cap: 2.18 m.

- Strike 1: 143.3° angular span, 143.3° total angular travel, and 143.3° net turn. Socket endpoints range from 1.25 to 1.55 m high. Outer collision radius reaches 1.59 m; the target-center reach upper bound, including the target radius and configured cap, is 1.87 m. The projected full hitbox (including its thickness and inner endpoint) spans 155.9 degrees; this angular envelope is not a filled damage area.

### Dragon Staff

Base cycle: 1.65 s. Damage: fire. The hitbox releases at 0.91 s, then travels at 9 m/s for up to 1.44 s. Width is 0.32 m and maximum travel distance is 13 m. Launch height is 1.50 m. The ranged hitbox follows the projectile rather than the held weapon.

### Dual Katana

Base cycle: 1.15 s. Damage: slashing. Melee target-center reach cap: 1.78 m.

- Strike 1: 142.6° angular span, 142.6° total angular travel, and -142.6° net turn. Socket endpoints range from 1.34 to 1.48 m high. Outer collision radius reaches 1.46 m; the target-center reach upper bound, including the target radius and configured cap, is 1.74 m. The projected full hitbox (including its thickness and inner endpoint) spans 154.0 degrees; this angular envelope is not a filled damage area.

- Strike 2: 139.4° angular span, 139.4° total angular travel, and 139.4° net turn. Socket endpoints range from 1.32 to 1.48 m high. Outer collision radius reaches 1.46 m; the target-center reach upper bound, including the target radius and configured cap, is 1.74 m. The projected full hitbox (including its thickness and inner endpoint) spans 151.8 degrees; this angular envelope is not a filled damage area.

### Executioner Axe

Base cycle: 1.70 s. Damage: slashing. Melee target-center reach cap: 2.28 m.

- Strike 1: 170.9° angular span, 170.9° total angular travel, and 170.8° net turn. Socket endpoints range from 0.97 to 1.94 m high. Outer collision radius reaches 1.73 m; the target-center reach upper bound, including the target radius and configured cap, is 2.01 m. The projected full hitbox (including its thickness and inner endpoint) spans 190.0 degrees; this angular envelope is not a filled damage area.

### Scythe

Base cycle: 1.55 s. Damage: slashing. Melee target-center reach cap: 2.58 m.

- Strike 1: 133.9° angular span, 144.3° total angular travel, and 123.5° net turn. Socket endpoints range from 1.21 to 1.39 m high. Outer collision radius reaches 1.84 m; the target-center reach upper bound, including the target radius and configured cap, is 2.12 m. The projected full hitbox (including its thickness and inner endpoint) spans 165.5 degrees; this angular envelope is not a filled damage area. The tip reverses direction within the active window, so angular travel exceeds its covered span.

### Shield

Base cycle: 1.20 s. Damage: blunt. Melee target-center reach cap: 1.33 m.

- Strike 1: 13.0° angular span, 13.0° total angular travel, and 13.0° net turn. Socket endpoints range from 0.85 to 1.08 m high. Outer collision radius reaches 0.80 m; the target-center reach upper bound, including the target radius and configured cap, is 1.08 m. The projected full hitbox (including its thickness and inner endpoint) spans 43.8 degrees; this angular envelope is not a filled damage area. This is primarily a thrust, bash, vertical strike, or jab; a broad horizontal cone would misrepresent it.

### Sickle

Base cycle: 1.00 s. Damage: slashing. Melee target-center reach cap: 1.70 m.

- Strike 1: 144.2° angular span, 144.2° total angular travel, and 144.2° net turn. Socket endpoints range from 1.23 to 1.40 m high. Outer collision radius reaches 1.41 m; the target-center reach upper bound, including the target radius and configured cap, is 1.69 m. The projected full hitbox (including its thickness and inner endpoint) spans 167.1 degrees; this angular envelope is not a filled damage area.

### Spear

Base cycle: 1.25 s. Damage: piercing. Melee target-center reach cap: 2.78 m.

- Strike 1: 11.8° angular span, 11.8° total angular travel, and 11.8° net turn. Socket endpoints range from 1.33 to 1.34 m high. Outer collision radius reaches 2.13 m; the target-center reach upper bound, including the target radius and configured cap, is 2.41 m. The projected full hitbox (including its thickness and inner endpoint) spans 76.3 degrees; this angular envelope is not a filled damage area. This is primarily a thrust, bash, vertical strike, or jab; a broad horizontal cone would misrepresent it.

### Trident

Base cycle: 1.35 s. Damage: water. Melee target-center reach cap: 2.63 m.

- Strike 1: 9.2° angular span, 9.2° total angular travel, and 9.2° net turn. Socket endpoints range from 1.34 to 1.34 m high. Outer collision radius reaches 2.34 m; the target-center reach upper bound, including the target radius and configured cap, is 2.62 m. The projected full hitbox (including its thickness and inner endpoint) spans 67.9 degrees; this angular envelope is not a filled damage area. This is primarily a thrust, bash, vertical strike, or jab; a broad horizontal cone would misrepresent it.

### Dark Sword

Base cycle: 1.25 s. Damage: shadow. Melee target-center reach cap: 2.13 m.

- Strike 1: 143.1° angular span, 143.1° total angular travel, and 143.1° net turn. Socket endpoints range from 1.23 to 1.51 m high. Outer collision radius reaches 1.54 m; the target-center reach upper bound, including the target radius and configured cap, is 1.82 m. The projected full hitbox (including its thickness and inner endpoint) spans 156.0 degrees; this angular envelope is not a filled damage area.

### Elf Bow

Base cycle: 1.35 s. Damage: piercing. The hitbox releases at 0.86 s, then travels at 16 m/s for up to 0.94 s. Width is 0.16 m and maximum travel distance is 15 m. Launch height is 1.49 m. The ranged hitbox follows the projectile rather than the held weapon.

### Wooden Club

Base cycle: 1.60 s. Damage: blunt. Melee target-center reach cap: 2.18 m.

- Strike 1: 178.1° angular span, 178.3° total angular travel, and 177.9° net turn. Socket endpoints range from 0.51 to 2.82 m high. Outer collision radius reaches 1.65 m; the target-center reach upper bound, including the target radius and configured cap, is 1.93 m. The projected full hitbox (including its thickness and inner endpoint) spans 360.0 degrees; this angular envelope is not a filled damage area. Its projection crosses the root, making a single horizontal hitbox angle uninformative; use the 3D volume and height instead. This is an OVERHEAD strike: its tip passes within 2.9 cm of the root in horizontal projection, changing bearing from behind to in front. The 178-degree bearing span is not a lateral semicircular sweep. Its blade pitches from about +90 degrees to -29 degrees. The preview intentionally omits a floor angle arc for this case and shows the true path and active volume instead. Part of the active path passes above a standing target capsule; its ground projection is not all hittable.

### Snake Wings

Base cycle: 1.00 s. Damage: poison. Melee target-center reach cap: 1.33 m.

- Strike 1: 15.5° angular span, 15.7° total angular travel, and -15.3° net turn. Socket endpoints range from 1.40 to 1.45 m high. Outer collision radius reaches 0.75 m; the target-center reach upper bound, including the target radius and configured cap, is 1.03 m. The projected full hitbox (including its thickness and inner endpoint) spans 54.3 degrees; this angular envelope is not a filled damage area. This is primarily a thrust, bash, vertical strike, or jab; a broad horizontal cone would misrepresent it.

- Strike 2: 11.1° angular span, 11.3° total angular travel, and 10.8° net turn. Socket endpoints range from 1.40 to 1.45 m high. Outer collision radius reaches 0.78 m; the target-center reach upper bound, including the target radius and configured cap, is 1.06 m. The projected full hitbox (including its thickness and inner endpoint) spans 48.9 degrees; this angular envelope is not a filled damage area. This is primarily a thrust, bash, vertical strike, or jab; a broad horizontal cone would misrepresent it.

### Ske'tonian Sword

Base cycle: 1.30 s. Damage: slashing. Melee target-center reach cap: 2.08 m.

- Strike 1: 143.6° angular span, 143.6° total angular travel, and 143.6° net turn. Socket endpoints range from 1.24 to 1.58 m high. Outer collision radius reaches 1.63 m; the target-center reach upper bound, including the target radius and configured cap, is 1.91 m. The projected full hitbox (including its thickness and inner endpoint) spans 156.0 degrees; this angular envelope is not a filled damage area.

### Fire Wings

Base cycle: 1.05 s. Damage: fire. Melee target-center reach cap: 1.33 m.

- Strike 1: 15.5° angular span, 15.7° total angular travel, and -15.3° net turn. Socket endpoints range from 1.40 to 1.45 m high. Outer collision radius reaches 0.75 m; the target-center reach upper bound, including the target radius and configured cap, is 1.03 m. The projected full hitbox (including its thickness and inner endpoint) spans 54.3 degrees; this angular envelope is not a filled damage area. This is primarily a thrust, bash, vertical strike, or jab; a broad horizontal cone would misrepresent it.

- Strike 2: 11.1° angular span, 11.3° total angular travel, and 10.8° net turn. Socket endpoints range from 1.40 to 1.45 m high. Outer collision radius reaches 0.78 m; the target-center reach upper bound, including the target radius and configured cap, is 1.06 m. The projected full hitbox (including its thickness and inner endpoint) spans 48.9 degrees; this angular envelope is not a filled damage area. This is primarily a thrust, bash, vertical strike, or jab; a broad horizontal cone would misrepresent it.

### Elder Wings

Base cycle: 1.05 s. Damage: arcane. Melee target-center reach cap: 1.33 m.

- Strike 1: 15.5° angular span, 15.7° total angular travel, and -15.3° net turn. Socket endpoints range from 1.40 to 1.45 m high. Outer collision radius reaches 0.75 m; the target-center reach upper bound, including the target radius and configured cap, is 1.03 m. The projected full hitbox (including its thickness and inner endpoint) spans 54.3 degrees; this angular envelope is not a filled damage area. This is primarily a thrust, bash, vertical strike, or jab; a broad horizontal cone would misrepresent it.

- Strike 2: 11.1° angular span, 11.3° total angular travel, and 10.8° net turn. Socket endpoints range from 1.40 to 1.45 m high. Outer collision radius reaches 0.78 m; the target-center reach upper bound, including the target radius and configured cap, is 1.06 m. The projected full hitbox (including its thickness and inner endpoint) spans 48.9 degrees; this angular envelope is not a filled damage area. This is primarily a thrust, bash, vertical strike, or jab; a broad horizontal cone would misrepresent it.

### Chameleon Wings

Base cycle: 1.00 s. Damage: poison. Melee target-center reach cap: 1.33 m.

- Strike 1: 15.5° angular span, 15.7° total angular travel, and -15.3° net turn. Socket endpoints range from 1.40 to 1.45 m high. Outer collision radius reaches 0.75 m; the target-center reach upper bound, including the target radius and configured cap, is 1.03 m. The projected full hitbox (including its thickness and inner endpoint) spans 54.3 degrees; this angular envelope is not a filled damage area. This is primarily a thrust, bash, vertical strike, or jab; a broad horizontal cone would misrepresent it.

- Strike 2: 11.1° angular span, 11.3° total angular travel, and 10.8° net turn. Socket endpoints range from 1.40 to 1.45 m high. Outer collision radius reaches 0.78 m; the target-center reach upper bound, including the target radius and configured cap, is 1.06 m. The projected full hitbox (including its thickness and inner endpoint) spans 48.9 degrees; this angular envelope is not a filled damage area. This is primarily a thrust, bash, vertical strike, or jab; a broad horizontal cone would misrepresent it.

### Arctic Dual Katana

Base cycle: 1.15 s. Damage: frost. Melee target-center reach cap: 1.83 m.

- Strike 1: 143.0° angular span, 143.0° total angular travel, and -143.0° net turn. Socket endpoints range from 1.23 to 1.52 m high. Outer collision radius reaches 1.54 m; the target-center reach upper bound, including the target radius and configured cap, is 1.82 m. The projected full hitbox (including its thickness and inner endpoint) spans 156.9 degrees; this angular envelope is not a filled damage area.

- Strike 2: 139.5° angular span, 139.5° total angular travel, and 139.5° net turn. Socket endpoints range from 1.23 to 1.52 m high. Outer collision radius reaches 1.54 m; the target-center reach upper bound, including the target radius and configured cap, is 1.82 m. The projected full hitbox (including its thickness and inner endpoint) spans 151.7 degrees; this angular envelope is not a filled damage area.

### Rusty Sword

Base cycle: 1.05 s. Damage: slashing. Melee target-center reach cap: 1.93 m.

- Strike 1: 143.6° angular span, 143.6° total angular travel, and 143.6° net turn. Socket endpoints range from 1.25 to 1.57 m high. Outer collision radius reaches 1.63 m; the target-center reach upper bound, including the target radius and configured cap, is 1.91 m. The projected full hitbox (including its thickness and inner endpoint) spans 156.0 degrees; this angular envelope is not a filled damage area.

### Lightning Staff

Base cycle: 1.45 s. Damage: lightning. The hitbox releases at 0.80 s, then travels at 12 m/s for up to 1.00 s. Width is 0.26 m and maximum travel distance is 12 m. Launch height is 1.63 m. The ranged hitbox follows the projectile rather than the held weapon.

### Hedge-Knight Sword

Base cycle: 1.25 s. Damage: slashing. Melee target-center reach cap: 2.08 m.

- Strike 1: 143.6° angular span, 143.6° total angular travel, and 143.6° net turn. Socket endpoints range from 1.25 to 1.57 m high. Outer collision radius reaches 1.63 m; the target-center reach upper bound, including the target radius and configured cap, is 1.91 m. The projected full hitbox (including its thickness and inner endpoint) spans 156.0 degrees; this angular envelope is not a filled damage area.

### Unarmed

Base cycle: 1.00 s. Damage: blunt. Melee target-center reach cap: 1.33 m.

- Strike 1: 15.5° angular span, 15.7° total angular travel, and -15.3° net turn. Socket endpoints range from 1.40 to 1.45 m high. Outer collision radius reaches 0.75 m; the target-center reach upper bound, including the target radius and configured cap, is 1.03 m. The projected full hitbox (including its thickness and inner endpoint) spans 54.3 degrees; this angular envelope is not a filled damage area. This is primarily a thrust, bash, vertical strike, or jab; a broad horizontal cone would misrepresent it.

- Strike 2: 11.1° angular span, 11.3° total angular travel, and 10.8° net turn. Socket endpoints range from 1.40 to 1.45 m high. Outer collision radius reaches 0.78 m; the target-center reach upper bound, including the target radius and configured cap, is 1.06 m. The projected full hitbox (including its thickness and inner endpoint) spans 48.9 degrees; this angular envelope is not a filled damage area. This is primarily a thrust, bash, vertical strike, or jab; a broad horizontal cone would misrepresent it.
