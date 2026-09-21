# Complete arena trait effects — v1.4.0

Generated from `arenaBalanceV1.js` and `arenaTraitPerksV1.js`. All 104 traits appear below. The playground server uses this ruleset.

**95 traits have one perk; 9 have two.** Base attacks and universal out-of-combat recovery are shared mechanics, not additional perks. Rarity never adds power.

## Character stats

| Stat | Base | Cap range | Effect |
|---|---:|---:|---|
| Maximum health | 200 | 160–280 | Damage required to defeat the champion. |
| Maximum stamina | 100 | 100–140 | Sprint endurance; attacks cost no stamina. |
| Stamina recovery | 0% | 0–25 | Increases the 22 stamina/s recovery rate after its delay. |
| Universal power | 0% | 0–18 | Increases all damage; adds to the relevant specialized power, combined cap 25%. |
| Weapon power | 0% | 0–18 | Boosts melee, punches and bow attacks plus their applied DOTs. Staff bolts use magic power instead. |
| Magic power | 0% | 0–18 | Boosts staff LMB bolts and all E abilities, their DOTs and fields; never control duration or projectile size. |
| Attack haste | 0% | 0–18 | Shortens the complete LMB cycle; does not alter draw/stow or magic cooldown. |
| Casting speed | 0% | 0–15 | Shortens E cast time; minimum cast 0.55 s. Does not alter projectile travel speed. |
| Movement speed | 0% | -10–10 | Multiplies walk/run speed before directional and action modifiers. |
| Tenacity | 0% | 0–40 | Shortens slows, Exposed, Weaken and Stagger; does not shorten DOTs. |
| Ability cooldown reduction | 0% | 0–20 | Reduces the cooldown that starts when E casting finishes or is interrupted. |
| Critical chance | 10% | 10–25 | 10% baseline; gear and temporary buffs add percentage points, capped at 25%. |
| Critical multiplier | 2x | 2–2.5 | 2x baseline; gear adds to the multiplier, capped at 2.5x. No DOT/field crits. |
| Critical bonus protection | 0% | 0–30 | Reduces only the bonus portion of an incoming critical, never its normal-hit portion. |
| Sprint efficiency | 0% | 0–25 | Reduces sprint stamina drain: 18 * (1 - reduction/100) points/s. |
| Blunt resistance | 20 | 0–65 | Reduces blunt damage only: damage multiplier = 100 / (100 + rating). |
| Slashing resistance | 20 | 0–65 | Reduces slashing damage only: damage multiplier = 100 / (100 + rating). |
| Piercing resistance | 20 | 0–65 | Reduces piercing damage only: damage multiplier = 100 / (100 + rating). |
| Fire resistance | 20 | 0–65 | Reduces fire damage only: damage multiplier = 100 / (100 + rating). |
| Frost resistance | 20 | 0–65 | Reduces frost damage only: damage multiplier = 100 / (100 + rating). |
| Lightning resistance | 20 | 0–65 | Reduces lightning damage only: damage multiplier = 100 / (100 + rating). |
| Water resistance | 20 | 0–65 | Reduces water damage only: damage multiplier = 100 / (100 + rating). |
| Poison resistance | 20 | 0–65 | Reduces poison damage only: damage multiplier = 100 / (100 + rating). |
| Shadow resistance | 20 | 0–65 | Reduces shadow damage only: damage multiplier = 100 / (100 + rating). |
| Arcane resistance | 20 | 0–65 | Reduces arcane damage only: damage multiplier = 100 / (100 + rating). |

Physical types: blunt, slashing, piercing. Magic types: fire, frost, lightning, water, poison, shadow, arcane. Only the matching resistance applies: 20 rating reduces damage by 16.67%, 40 by 28.57%, and 65 by 39.39%.

Staff bolts and E abilities use universal + magic power. Other LMB attacks use universal + weapon power. Combined power caps at 25%. Damage type independently selects resistance.

## Criticals and proc chances

Start at **10% crit chance and 2x crit damage**. Gear and buffs add to these values, capped at **25% and 2.5x**. +4 percentage points makes 10% into 14%; +0.25x makes 2x into 2.25x. Crits multiply the direct dice roll, never DOTs, fields, healing, barriers, status duration or knockback.

Each confirmed hit rolls its crit and each on-hit effect independently. Both strikes can succeed consecutively. There is no proc, crit, or triggered-perk cooldown. Repeated overlap of the same strike/target is deduplicated; DOTs and reaction effects cannot trigger more procs.

| Weapon | On-hit effect | Chance | Eligible hits | Potency |
|---|---|---:|---|---:|
| Dragon Long Sword | Burn | 45% | each | 1x |
| Dragon Staff | Burn | 55% | each | 1x |
| Executioner Axe | Stagger | 25% | each | 1.25x |
| Scythe | Bleed | 60% | each | 1.15x |
| Shield | Push | 100% | each | 1x |
| Sickle | Bleed | 35% | each | 0.85x |
| Trident | Soaked | 40% | each | 1x |
| Dark Sword | Weaken | 35% | each | 1x |
| Wooden Club | Push | 70% | each | 1.15x |
| Wooden Club | Stagger | 20% | each | 1.15x |
| Snake Wings | Poison | 50% | each | 0.75x |
| Ske'tonian Sword | Exposed | 40% | each | 1x |
| Fire Wings | Burn | 60% | each | 0.75x |
| Elder Wings | Weaken | 30% | each | 0.8x |
| Arctic Dual Katana | Chill | 35% | each | 0.8x |
| Lightning Staff | Exposed | 45% | each | 1x |

Shield Push remains guaranteed on an eligible hit. E abilities retain their listed status on a confirmed impact; the projectile can still miss.

## Every trait and its perks

These are the complete special abilities. Old resistance allocations and extra stat bundles have been removed. Conditional/triggered bonuses apply only when qualified; dice and reach are listed separately below.

### Weapon

| Trait | Main perk | Second perk |
|---|---|---|
| Dragon Long Sword | **Burn strike:** 45% chance to apply Burn on every confirmed hit at 1x potency; no cooldown. | — |
| Dragon Staff | **Burn strike:** 55% chance to apply Burn on every confirmed hit at 1x potency; no cooldown. | — |
| Dual Katana | **Paired Precision:** +3 percentage points critical chance. | — |
| Executioner Axe | **Stagger strike:** 25% chance to apply Stagger on every confirmed hit at 1.25x potency; no cooldown. | — |
| Scythe | **Bleed strike:** 60% chance to apply Bleed on every confirmed hit at 1.15x potency; no cooldown. | — |
| Shield | **Push strike:** 100% chance to apply Push on every confirmed hit at 1x potency; no cooldown. | **Frontal Guard**: While held outside actions, reduce frontal direct damage by 15% in a 100-degree cone; movement is 5% slower. |
| Sickle | **Bleed strike:** 35% chance to apply Bleed on every confirmed hit at 0.85x potency; no cooldown. | — |
| Spear | **Measured Reach:** +4% weapon power when the target is at least 1.8m from your body at impact. | — |
| Trident | **Soaked strike:** 40% chance to apply Soaked on every confirmed hit at 1x potency; no cooldown. | — |
| Dark Sword | **Weaken strike:** 35% chance to apply Weaken on every confirmed hit at 1x potency; no cooldown. | — |
| Elf Bow | **Patient Aim:** Committing an arrow after standing still for 0.75s grants +4 percentage points crit chance to that arrow. | — |
| Wooden Club | **Push strike:** 70% chance to apply Push on every confirmed hit at 1.15x potency; no cooldown. | **Stagger strike**: 20% chance to apply Stagger on every confirmed hit at 1.15x potency; no cooldown. |
| Snake Wings | **Poison strike:** 50% chance to apply Poison on every confirmed hit at 0.75x potency; no cooldown. | **Wing Footwork**: +2% movement speed; wings never enable flight. |
| Ske'tonian Sword | **Exposed strike:** 40% chance to apply Exposed on every confirmed hit at 1x potency; no cooldown. | — |
| Fire Wings | **Burn strike:** 60% chance to apply Burn on every confirmed hit at 0.75x potency; no cooldown. | **Wing Footwork**: +2% movement speed; wings never enable flight. |
| Elder Wings | **Weaken strike:** 30% chance to apply Weaken on every confirmed hit at 0.8x potency; no cooldown. | **Wing Footwork**: +2% movement speed; wings never enable flight. |
| Chameleon Wings | **Wing Footwork:** +3% movement speed; wings never enable flight. | — |
| Arctic Dual Katana | **Chill strike:** 35% chance to apply Chill on every confirmed hit at 0.8x potency; no cooldown. | — |
| Rusty Sword | **Jagged Edge:** +0.12x critical damage multiplier. | — |
| Lightning Staff | **Exposed strike:** 45% chance to apply Exposed on every confirmed hit at 1x potency; no cooldown. | — |
| Hedge-Knight Sword | **Practiced Forms:** +2% attack haste. | — |

### Magic

| Trait | Main perk | Second perk |
|---|---|---|
| Dark Magic | **Withering bolt:** Cast 4d6+8 shadow damage; 11m range, 0.4m width. On hit: Weaken. 11s cooldown after casting. | — |
| Fire Magic | **Ember shot:** Cast 3d8+14 fire damage; 11m range, 0.36m width. On hit: Burn. 11s cooldown after casting. | — |
| Lightning Magic | **Disrupting spark:** Cast 4d6+9 lightning damage; 10m range, 0.24m width. On hit: Stagger. 12s cooldown after casting. | — |
| Water Magic | **Tidal pulse:** Cast 4d6+6 water damage; 10m range, 0.5m width. On hit: Soaked and Push. 11s cooldown after casting. | — |
| Ice Daggers | **Ice lance:** Cast 4d6+9 frost damage; 11m range, 0.3m width. On hit: Chill. 12s cooldown after casting. | — |
| Poison Cloud | **Venom mist:** Cast 3d4+5 poison damage; 9m range, 0.44m width. On hit: Poison. 13s cooldown after casting. Impact mist: roll 1d4+1 HP/s once per cast; 1.4m radius for 3s; no crits or extra status procs. | — |
| Blood-Shards | **Crimson shard:** Cast 3d6+13 slashing damage; 10m range, 0.3m width. On hit: Bleed. 11s cooldown after casting. | — |

### Head

| Trait | Main perk | Second perk |
|---|---|---|
| Crown of Horns | **Blood Price:** After taking a direct hit below 40% health, gain +8% weapon power for 4s. | — |
| All Knowing | **Spell Insight:** An E ability hit refunds 1s of its cooldown.  | — |
| Bone | **Marrow Ward:** After surviving a critical hit, gain a 10 HP barrier for 3s. | — |
| Dark Knight Helm | **Dread Gaze:** A weapon hit has a 30% chance to Weaken the target. | — |
| Dragon Knight Helm | **Heat Tempered:** +16 fire resistance. | — |
| Dragon | **Predator:** +4 percentage points critical chance. | — |
| Elder | **Still Mind:** While stationary for at least 0.75s, gain +6% magic power. Snapshot at cast/attack commitment. | — |
| Gladiator Helm | **Second Bout:** A weapon hit restores 6 stamina. | — |
| Purity | **Clean Break:** Finishing an E cast removes your oldest cleanseable debuff. | — |
| Scarred | **Old Scars:** +18 maximum health. | — |
| Snake | **Venom Feast:** Hitting a poisoned target restores 3 HP. | — |
| Undead | **Refuse Death:** After surviving damage that crosses below 30% health, restore 10 HP. | — |
| Uni Horn | **Prismatic Ward:** Finishing an E cast grants an 8 HP barrier for 3s. | — |
| Farmer | **Harvest:** A weapon hit restores 3 HP. | — |
| Samurai | **Iaijutsu:** Finishing a weapon draw grants +6 percentage points crit chance for 3s. | — |
| Barbarian | **Savage Critical:** +0.25x critical damage multiplier. | — |
| Gold Hermes Helm | **Golden Stride:** Finishing an E cast grants +8% movement speed for 2s. | — |
| Silver Hermes Helm | **Silver Escape:** After surviving a critical hit, remove your oldest slow. | — |
| Pirate Bandana | **Boarding Footwork:** Gain +3 percentage points crit chance when committing a weapon attack while moving. | — |
| Skel'tonian Mask | **Split Focus:** +2 percentage points crit chance. | **Other Half**: +2% magic power. |
| Frost | **Cold Rebuke:** After a melee/punch hit damages you, 30% chance to Chill its attacker. | — |
| Cyclops | **Measured Blow:** Noncritical weapon strikes gain +6% weapon power. Evaluated after the critical roll. | — |
| Slayer | **Finish the Hunt:** +8% weapon power against a target below 35% health, evaluated before the hit. | — |
| Ram | **Ram Charge:** A weapon hit has a 25% chance to Push the target. | — |
| Cannibal | **Blood Feast:** Hitting a bleeding target restores 4 HP. | — |

### Armour

| Trait | Main perk | Second perk |
|---|---|---|
| Dark Knight Armour | **Sheathed Bulwark:** Finishing a weapon stow grants an 18 HP barrier for 5s. | — |
| Dragon Hunter Armour | **Hunt the Flame:** +9% weapon power against a burning target. | — |
| Dragon Knight Armour | **Dragon Heart:** After surviving damage that crosses below 50% health, gain a 20 HP barrier for 4s. | — |
| Gladiator Armour | **Pit Fighter:** +28 maximum health. | — |
| Hidden One | **Hidden Opening:** Finishing an E cast grants +8 percentage points crit chance for 3s. | — |
| Magicians Robe | **Spell Rhythm:** +10% E ability cooldown reduction; cooldown still starts after casting ends. | — |
| Pharaoh | **Royal Renewal:** An E ability hit restores 8 HP. | — |
| Rags | **Unburdened:** +5% movement speed. | — |
| Shinobi | **Rapid Forms:** +7% attack haste. | — |
| Unchained | **Break Chains:** Finishing a weapon draw removes your oldest slow. | **Unbowed**: +8% tenacity. |
| Emperor Armour | **Imperial Vigor:** +15 maximum health. | **Royal Composure**: Reduce the BONUS portion of incoming critical damage by 25%; normal hit damage is unchanged. |
| Elf Robe | **Spell to Arrow:** An E ability hit grants +8% attack haste for 4s. | — |
| Leather Garb | **Travel Ready:** +15 maximum stamina. | **Padded**: +10 maximum health. |
| Executioner Robe | **Executioner’s Edge:** +0.35x critical damage multiplier. | — |
| Pirate Coat | **Plunder Momentum:** A weapon critical grants +8% movement speed for 3s. | — |
| Rogue | **Find the Gap:** +6 percentage points critical chance. | — |
| Arctic Shinobi | **Slip the Frost:** After a slow is applied to you, remove your oldest slow. | — |
| Earth-Faction | **Deep Reserves:** +30 maximum stamina. | — |
| Dragon-Guard | **Tempered Plates:** +12 blunt, slashing and piercing resistance. | — |

### Extra

| Trait | Main perk | Second perk |
|---|---|---|
| Crescent Moon Earring | **Moon Echo:** An E ability critical refunds 1s of its cooldown. | — |
| Dragon Fangs Earring | **Fang Critical:** +0.15x critical damage multiplier. | — |
| Fusion Pearl Earring | **Pearl Focus:** +2 percentage points critical chance. | — |
| Tentacle Earring | **Tidal Grip:** Hitting a Soaked target restores 4 stamina. | — |
| Hoop Earring | **Sturdy Hoop:** +10 maximum health. | — |
| Golden Feathers | **Light Steps:** Sprint consumes 10% less stamina. | — |
| Battle Wound | **Last Laugh:** Below 40% health, gain +4 percentage points critical chance. | — |
| Crescent-Birthmark | **Lunar Release:** After Weaken or Exposed is applied to you, remove the oldest of those two debuffs. | — |

### Skin

| Trait | Main perk | Second perk |
|---|---|---|
| Dark Skin | **Human Endurance:** +8% stamina recovery; same effect on both human skin tones. | — |
| Tribal Dark Skin | **Trail Hardened:** +8% tenacity; same effect on both tribal skin tones. | — |
| Tribal Light Skin | **Trail Hardened:** +8% tenacity; same effect on both tribal skin tones. | — |
| Fire Dragon | **Ember Scales:** +12 fire resistance. | — |
| Undead | **Grave Reserve:** +10 maximum health. | — |
| Chameleon | **Startled Dash:** After surviving direct damage, gain +4% movement speed for 2s. | — |
| Light Skin | **Human Endurance:** +8% stamina recovery; same effect on both human skin tones. | — |
| Elder Dragon | **Ancient Flow:** An E ability hit restores 5 stamina. | — |
| Snake | **Venom Hide:** +12 poison resistance. | — |

### Background

| Trait | Main perk | Second perk |
|---|---|---|
| Aqua Background | **Aqua Ward:** +6 water resistance. | — |
| Blood Background | **Blood Moon Edge:** +0.08x critical damage multiplier. | — |
| Cosmos Background | **Cosmic Study:** +2% magic power. | — |
| Dungeon Background | **Learn the Miss:** A completed weapon attack that hit nobody restores 3 stamina. | — |
| Forest Background | **Forest Vigor:** +5 maximum health. | — |
| Golden Background | **Golden Arrival:** On arena entry, gain a 5 HP barrier lasting 6s. | — |
| Midnight Background | **Night Focus:** +1 percentage point critical chance. | — |
| Noir Background | **Composure:** +4% tenacity. | — |
| Red Moon Background | **Red Resolve:** Below 40% health, gain +3% weapon power. | — |
| Sunset Background | **Sunset Ward:** +6 fire resistance. | — |
| Toxic Background | **Toxic Ward:** +6 poison resistance. | — |
| Valley Background | **Valley Pace:** +1% movement speed. | — |
| Golden Moon | **Moonlit Spark:** An E ability critical restores 4 stamina. | — |
| Waves Background | **Steady Breath:** +5% stamina recovery. | — |
| Dawn Background | **Small Renewal:** Finishing an E cast restores 2 HP. | — |

## Weapon dice and timing

Averages use the shared 10% / 2x baseline, before trait bonuses. Each strike rolls independently. Haste shortens the full cycle, including recovery.

| Weapon | Dice per attack | Normal total range | Baseline average with crits | Cycle | Reach / range |
|---|---|---:|---:|---:|---:|
| Dragon Long Sword | 4d6+17 | 21–41 | 34.1 | 1.4s | 1.9m |
| Dragon Staff | 3d10+16 | 19–46 | 35.75 | 1.65s | 13m |
| Dual Katana | 3d6+5 then 3d6+5 | 16–46 | 34.1 | 1.15s | 1.5m |
| Executioner Axe | 5d8+22 | 27–62 | 48.95 | 1.7s | 2m |
| Scythe | 3d10+20 | 23–50 | 40.15 | 1.55s | 2.3m |
| Shield | 3d8+12 | 15–36 | 28.05 | 1.2s | 1.05m |
| Sickle | 3d6+12 | 15–30 | 24.75 | 1s | 1.42m |
| Spear | 4d6+18 | 22–42 | 35.2 | 1.25s | 2.5m |
| Trident | 4d6+18 | 22–42 | 35.2 | 1.35s | 2.35m |
| Dark Sword | 4d6+17 | 21–41 | 34.1 | 1.25s | 1.85m |
| Elf Bow | 4d8+13 | 17–45 | 34.1 | 1.35s | 15m |
| Wooden Club | 4d10+20 | 24–60 | 46.2 | 1.6s | 1.9m |
| Snake Wings | 2d6+5 then 2d6+5 | 14–34 | 26.4 | 1s | 1.05m |
| Ske'tonian Sword | 4d6+17 | 21–41 | 34.1 | 1.3s | 1.8m |
| Fire Wings | 2d6+5 then 2d6+5 | 14–34 | 26.4 | 1.05s | 1.05m |
| Elder Wings | 3d4+5 then 3d4+5 | 16–34 | 27.5 | 1.05s | 1.05m |
| Chameleon Wings | 3d4+5 then 3d4+5 | 16–34 | 27.5 | 1s | 1.05m |
| Arctic Dual Katana | 3d6+3 then 3d6+3 | 12–42 | 29.7 | 1.15s | 1.55m |
| Rusty Sword | 4d6+14 | 18–38 | 30.8 | 1.05s | 1.65m |
| Lightning Staff | 4d6+18 | 22–42 | 35.2 | 1.45s | 12m |
| Hedge-Knight Sword | 4d6+18 | 22–42 | 35.2 | 1.25s | 1.8m |

## Magic dice and projectiles

Width means full collision diameter. Casts start at 0.65s, release at 60%, and cannot become shorter than 0.55s. Cooldowns start after casting ends. On interruption, cooldown starts immediately and remaining recovery is still consumed.

| Magic | Roll | Range | Width | Speed | Post-cast cooldown |
|---|---|---:|---:|---:|---:|
| Dark Magic | 4d6+8 shadow | 11m | 0.4m | 10m/s | 11s |
| Fire Magic | 3d8+14 fire | 11m | 0.36m | 10m/s | 11s |
| Lightning Magic | 4d6+9 lightning | 10m | 0.24m | 17m/s | 12s |
| Water Magic | 4d6+6 water | 10m | 0.5m | 9m/s | 11s |
| Ice Daggers | 4d6+9 frost | 11m | 0.3m | 13m/s | 12s |
| Poison Cloud | 3d4+5 poison | 9m | 0.44m | 8m/s | 13s |
| Blood-Shards | 3d6+13 slashing | 10m | 0.3m | 12m/s | 11s |

Dagger/shard fans share one collider and roll. Poison mist rolls 1d4+1 HP/s once per cast, lasts 3s in a 1.4m radius, and never crits or applies additional statuses.

## Status effects

| Status | Exact effect |
|---|---|
| Burn | 4 fire HP/s for 2s; no crit. |
| Bleed | 3 slashing HP/s for 3s; no crit. |
| Poison | 3 poison HP/s for 4s; no crit. |
| Chill | 20% slow for 2s. |
| Soaked | 12% slow for 2.5s. |
| Exposed | Reduce all resistance ratings by 8, minimum 0, for 3s. |
| Weaken | 8% multiplicative outgoing damage reduction for 2.5s. |
| Stagger | 0.16s interruption at 1x potency; no immunity cooldown. |
| Push | Push 0.65m over 0.12s at 1x potency; no immunity cooldown; clamp to walls. |

Each application has 0.25–2x potency. Successful reapplications add potency and refresh the whole effect duration; aggregate potency has no stack cap. Icons show application count (1, 2, 3), not fractional potency. Two equal applications double the effect. It scales damage rate, slow strength, resistance reduction, weakening and push distance. Percentage reductions stop at 100%; only the strongest slow type affects movement. Stagger potency scales interruption duration. Other durations do not multiply. Magic impact statuses use 1.25x. Expiry or cleansing removes all stacks of that effect.

## Stacking and event rules

- **counts:** One named passive, conditional or triggered mechanic counts as one perk. Weapon/ability base damage and universal Second wind are baseline mechanics, not extra perks.
- **eventOrder:** Resolve death first. Survivors emit damage-taken events. Emit primary-hit events, roll weapon procs and apply statuses, then emit debuffApplied reactions. A lethal hit cannot trigger a survival heal or barrier.
- **hitEligibility:** Each confirmed primary hit, including each katana strike, independently rolls eligible on-hit effects. Repeated overlap from the same strike is deduplicated. DOTs and fields never roll additional hit effects.
- **procChance:** Each eligible effect independently rolls its chance on every confirmed hit, including consecutive successes. No internal effect cooldown. No proc chains.
- **linkedWeaponHandlers:** Abilities marked weaponOnHit describe their indexed onHit entry; process that entry ONCE, not a second time as a generic perk. magicCast similarly describes the equipped E action.
- **conditionalSampling:** movingAtCommit and stationarySecondsAtLeast are snapshots at action commitment. Source and target conditions use the pre-hit state. critical:false is evaluated after the critical roll and may modify power only. Re-evaluate health threshold buffs for every hit.
- **buffs:** Sum different stat buffs with gear, then clamp to STAT_DEFINITIONS caps. Same perk refreshes, never stacks. All damage increases must use the power stats and the shared 25% combined power cap.
- **refunds:** Maximum 2s cooldown refund per cast, never reduce the post-cast cooldown below 4s. Hits before casting ends bank the refund for that cast. Refunds never reset the ability or refund a later cast.
- **healing:** Every qualifying hit can heal. Clamp to missing health. No timer or cooldown; heal amounts are deliberately small.
- **barriers:** Shared 30 HP barrier pool. Grants add only until 30; each grant keeps its own expiry and earliest-expiring HP is consumed first. No damage reflection or barrier procs.
- **resets:** New entry resets health, stamina, statuses and action identifiers. Changing carry state never resets magic cooldown.

- Gear and temporary buffs add before stat caps; never multiply individual item bonuses.
- Statuses sum application potency and reset expiry. DOT/field damage is individually mitigated without a shared DPS cap. A refresh never deals an instant DOT tick. Latest application receives source credit; accumulated DOT power is weighted by application potency.
- Human skin tones share mechanics, as do tribal skin tones. Tails and cosmetic geometry never enlarge hurtboxes.
- Universal Second wind remains 8 HP/s after 6s without combat; damaging statuses block it. It is not an extra skin perk.

## Build examples

- **Opening duelist:** Samurai + Hidden One + Fusion Pearl. Draw or finish E casting to create a short crit window; stacking beyond 25% wastes excess.
- **Heavy criticals:** Barbarian + Executioner Robe + Dragon Fangs exceed the 2.5x cap together. Replace at least one with stamina, healing or mobility.
- **Blood hunter:** Scythe + Cannibal. Land the 60% Bleed proc before following up to heal, on every qualifying hit; healing is capped by missing health.
- **Reactive defender:** Bone + Emperor Armour. Incoming crits lose part of their bonus, then surviving one can create a barrier. Neither prevents the original hit.
- **Caster sustain:** All Knowing + Pharaoh + Crescent Moon Earring. E hits can heal and refund cooldown; shared limits prevent resets and infinite healing.

## Validation and implementation boundary

Run `node scripts/check-arena-balance.cjs`, then `node scripts/write-arena-trait-reference.cjs` after edits. Checks cover all identities, one/two-perk counts, stat caps, 79,800 passive loadout combinations, dice/crit distributions, per-weapon proc distributions, independent multi-hit procs and potency boundaries.

The server simulation executes dice, crits, potency, triggered/conditional perks, movement, collisions, magic, health and death. Run the combat and multiplayer integration tests too. Static arithmetic cannot establish matchup win rates; live balance remains a playtest candidate.
