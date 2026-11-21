# Weapon follow-up damage

Raw dice before power, criticals, barriers or target resistance. Each entry is the second attack of a double-click combo. Slash-separated rolls are separate hits, in animation order. Each hit independently rolls its critical and on-hit effects.

| Weapon | First attack | Follow-up | Second damage type |
| --- | --- | --- | --- |
| Dragon Long Sword | 4d6+17 fire | 5d6+12 | slashing |
| Dragon Staff | 3d10+16 fire | 4d8+13 | fire |
| Dual Katana | 3d6+5 / 3d6+5 slashing | 2d8+6 / 4d4+7 | slashing |
| Executioner Axe | 5d8+22 slashing | 4d10+25 | slashing |
| Scythe | 3d10+20 slashing | 5d8+18 | slashing |
| Shield | 3d8+12 blunt | 4d6+10 | blunt |
| Sickle | 3d6+12 slashing | 2d8+12 | slashing |
| Spear | 4d6+18 piercing | 3d8+16 | piercing |
| Trident | 4d6+18 water | 5d4+17 | piercing |
| Dark Sword | 4d6+17 shadow | 3d8+15 | slashing |
| Elf Bow | 4d8+13 piercing | 3d10+12 | piercing |
| Wooden Club | 4d10+20 blunt | 5d8+22 | blunt |
| Snake Wings | 2d6+5 / 2d6+5 poison | 3d4+4 / 2d6+6 | poison |
| Ske'tonian Sword | 4d6+17 slashing | 4d8+11 | slashing |
| Fire Wings | 2d6+5 / 2d6+5 fire | 2d8+3 / 3d4+5 | fire |
| Elder Wings | 3d4+5 / 3d4+5 arcane | 2d6+5 / 2d8+5 | arcane |
| Chameleon Wings | 3d4+5 / 3d4+5 poison | 3d4+4 / 3d6+3 | poison |
| Arctic Dual Katana | 3d6+3 / 3d6+3 frost | 3d4+6 / 2d8+5 | slashing |
| Rusty Sword | 4d6+14 slashing | 3d8+12 | slashing |
| Lightning Staff | 4d6+18 lightning | 3d10+14 | lightning |
| Hedge-Knight Sword | 4d6+18 slashing | 5d4+17 | slashing |
| Unarmed | 2d6+5 / 2d6+5 blunt | 1d10+6 / 3d4+5 | blunt |

## Balance and behavior

The expected raw damage divided by the follow-up duration is within 10% of the corresponding first attack. Heavy return swings have higher totals to match their longer motions. These are starting playtest values, not a guarantee of identical combat effectiveness against different resistances.

The Dragon Longsword, Dark Sword and Arctic Dual Katana switch to slashing on the return cut; the Trident switches to piercing on its second thrust. Other follow-ups retain the original damage type. Weapon enchantment procs remain eligible, so a physical return cut can still apply Burn, Weaken or Chill. Stamina costs, proc chances, power source, hitboxes and combo timing are unchanged.

Edit components/contracts/Arena/weaponFollowups.js for these dice and damage types. The main arenaBalanceV1.js re-exports the table and resolver. The server, weapon effects and first/follow-up UI cards consume the same profiles.
