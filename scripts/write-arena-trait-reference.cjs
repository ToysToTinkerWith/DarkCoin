// Generate the readable effects from the same config used by the checker.
const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'..');
require('../tmp/champion-model-tools/node_modules/esbuild').buildSync({entryPoints:[path.join(root,'components/contracts/Arena/arenaBalanceV1.js')],bundle:true,platform:'node',outfile:path.join(root,'tmp/arena-trait-reference.cjs')});
const b=require('../tmp/arena-trait-reference.cjs');
const f=n=>Number(n.toFixed(3)),safe=s=>String(s).replace(/\|/g,'/').replace(/\n/g,' ');
const traits=Object.values(b.TRAITS).flatMap(Object.values),one=traits.filter(t=>t.abilities.length===1).length;
const lines=['# Complete arena trait effects — v'+b.ARENA_RULES.version,'',
  'Generated from `arenaBalanceV1.js` and `arenaTraitPerksV1.js`. All 104 traits appear below. The playground server uses this ruleset.','',
  `**${one} traits have one perk; ${traits.length-one} have two.** Base attacks and universal out-of-combat recovery are shared mechanics, not additional perks. Rarity never adds power.`,'',
  '## Character stats','', '| Stat | Base | Cap range | Effect |','|---|---:|---:|---|'];
for(const s of Object.values(b.STAT_DEFINITIONS))lines.push(`| ${s.label} | ${s.base}${s.unit==='%'?'%':s.unit==='x'?'x':''} | ${s.cap.join('–')} | ${s.effect} |`);
lines.push('','Physical types: blunt, slashing, piercing. Magic types: fire, frost, lightning, water, poison, shadow, arcane. Only the matching resistance applies: 20 rating reduces damage by 16.67%, 40 by 28.57%, and 65 by 39.39%.','',
  'Staff bolts and E abilities use universal + magic power. Other LMB attacks use universal + weapon power. Combined power caps at 25%. Damage type independently selects resistance.','',
  '## Criticals and proc chances','',
  'Start at **10% crit chance and 2x crit damage**. Gear and buffs add to these values, capped at **25% and 2.5x**. +4 percentage points makes 10% into 14%; +0.25x makes 2x into 2.25x. Crits multiply the direct dice roll, never DOTs, fields, healing, barriers, status duration or knockback.','',
  'Each confirmed hit rolls its crit and each on-hit effect independently. Both strikes can succeed consecutively. There is no proc, crit, or triggered-perk cooldown. Repeated overlap of the same strike/target is deduplicated; DOTs and reaction effects cannot trigger more procs.','',
  '| Weapon | On-hit effect | Chance | Eligible hits | Potency |','|---|---|---:|---|---:|');
for(const w of Object.values(b.WEAPONS))for(const e of w.onHit)lines.push(`| ${w.name} | ${b.STATUS_EFFECTS[e.id].label} | ${f(e.chance*100)}% | ${e.strike} | ${e.potency}x |`);
lines.push('','Shield Push remains guaranteed on an eligible hit. E abilities retain their listed status on a confirmed impact; the projectile can still miss.','',
  '## Every trait and its perks','',
  'These are the complete special abilities. Old resistance allocations and extra stat bundles have been removed. Conditional/triggered bonuses apply only when qualified; dice and reach are listed separately below.');
for(const [category,entries] of Object.entries(b.TRAITS)){
  lines.push('',`### ${category}`,'','| Trait | Main perk | Second perk |','|---|---|---|');
  for(const e of Object.values(entries))lines.push(`| ${safe(e.name)} | **${safe(e.abilities[0].name)}:** ${safe(e.abilities[0].description)} | ${e.abilities[1]?'**'+safe(e.abilities[1].name)+'**: '+safe(e.abilities[1].description):'—'} |`);
}
lines.push('','## Weapon dice and timing','',
  'Averages use the shared 10% / 2x baseline, before trait bonuses. Each strike rolls independently. Haste shortens the full cycle, including recovery.','',
  '| Weapon | Dice per attack | Normal total range | Baseline average with crits | Cycle | Reach / range |','|---|---|---:|---:|---:|---:|');
for(const w of Object.values(b.WEAPONS)){const ds=w.damageRolls.map(b.diceStatistics);lines.push(`| ${w.name} | ${w.damageRolls.join(' then ')} | ${ds.reduce((a,d)=>a+d.min,0)}–${ds.reduce((a,d)=>a+d.max,0)} | ${f(ds.reduce((a,d)=>a+d.mean*1.1,0))} | ${w.cycleSeconds}s | ${w.reachM}m |`);}
lines.push('','## Magic dice and projectiles','',
  'Width means full collision diameter. Casts start at 0.65s, release at 60%, and cannot become shorter than 0.55s. Cooldowns start after casting ends. On interruption, cooldown starts immediately and remaining recovery is still consumed.','',
  '| Magic | Roll | Range | Width | Speed | Post-cast cooldown |','|---|---|---:|---:|---:|---:|');
for(const a of Object.values(b.MAGIC))lines.push(`| ${a.name} | ${a.damageRoll} ${a.damageType} | ${a.projectile.maxRangeM}m | ${a.projectile.widthM}m | ${a.projectile.speedMps}m/s | ${a.cooldownSeconds}s |`);
lines.push('','Dagger/shard fans share one collider and roll. Poison mist rolls 1d4+1 HP/s once per cast, lasts 3s in a 1.4m radius, and never crits or applies additional statuses.','',
  '## Status effects','', '| Status | Exact effect |','|---|---|');
for(const [id,s] of Object.entries(b.STATUS_EFFECTS)){
  const description=s.kind==='dot'?`${s.damagePerSecond} ${s.damageType} HP/s for ${s.durationSeconds}s; no crit.`:
    s.kind==='slow'?`${s.slowPct}% slow for ${s.durationSeconds}s.`:
    id==='exposed'?`Reduce all resistance ratings by ${s.allResistanceReduction}, minimum 0, for ${s.durationSeconds}s.`:
    id==='weaken'?`${s.powerReductionPct}% multiplicative outgoing damage reduction for ${s.durationSeconds}s.`:
    id==='stagger'?`${s.durationSeconds}s interruption at 1x potency; no immunity cooldown.`:
    `Push ${s.distanceM}m over ${s.durationSeconds}s at 1x potency; no immunity cooldown; clamp to walls.`;
  lines.push(`| ${s.label} | ${description} |`);
}
lines.push('','Each application has 0.25–2x potency. Successful reapplications add potency and refresh the whole effect duration; aggregate potency has no stack cap. Icons show application count (1, 2, 3), not fractional potency. Two equal applications double the effect. It scales damage rate, slow strength, resistance reduction, weakening and push distance. Percentage reductions stop at 100%; only the strongest slow type affects movement. Stagger potency scales interruption duration. Other durations do not multiply. Magic impact statuses use 1.25x. Expiry or cleansing removes all stacks of that effect.','','## Stacking and event rules','');
for(const [key,text] of Object.entries(b.ARENA_RULES.perks))if(typeof text==='string')lines.push(`- **${key}:** ${text}`);
lines.push('','- Gear and temporary buffs add before stat caps; never multiply individual item bonuses.','- Statuses sum application potency and reset expiry. DOT/field damage is individually mitigated without a shared DPS cap. A refresh never deals an instant DOT tick. Latest application receives source credit; accumulated DOT power is weighted by application potency.','- Human skin tones share mechanics, as do tribal skin tones. Tails and cosmetic geometry never enlarge hurtboxes.','- Universal Second wind remains 8 HP/s after 6s without combat; damaging statuses block it. It is not an extra skin perk.','',
  '## Build examples','',
  '- **Opening duelist:** Samurai + Hidden One + Fusion Pearl. Draw or finish E casting to create a short crit window; stacking beyond 25% wastes excess.','- **Heavy criticals:** Barbarian + Executioner Robe + Dragon Fangs exceed the 2.5x cap together. Replace at least one with stamina, healing or mobility.','- **Blood hunter:** Scythe + Cannibal. Land the 60% Bleed proc before following up to heal, on every qualifying hit; healing is capped by missing health.','- **Reactive defender:** Bone + Emperor Armour. Incoming crits lose part of their bonus, then surviving one can create a barrier. Neither prevents the original hit.','- **Caster sustain:** All Knowing + Pharaoh + Crescent Moon Earring. E hits can heal and refund cooldown; shared limits prevent resets and infinite healing.','',
  '## Validation and implementation boundary','',
  'Run `node scripts/check-arena-balance.cjs`, then `node scripts/write-arena-trait-reference.cjs` after edits. Checks cover all identities, one/two-perk counts, stat caps, 79,800 passive loadout combinations, dice/crit distributions, per-weapon proc distributions, independent multi-hit procs and potency boundaries.','',
  'The server simulation executes dice, crits, potency, triggered/conditional perks, movement, collisions, magic, health and death. Run the combat and multiplayer integration tests too. Static arithmetic cannot establish matchup win rates; live balance remains a playtest candidate.','');
fs.writeFileSync(path.join(root,'docs/arena-trait-effects-v1.md'),lines.join('\n'));
fs.writeFileSync(path.join(root,'output/playground/arena-trait-effects-v1.json'),JSON.stringify({version:b.ARENA_RULES.version,stats:b.STAT_DEFINITIONS,traits:b.TRAITS,statuses:b.STATUS_EFFECTS,perkRules:b.ARENA_RULES.perks},null,2));
console.log('Wrote full reference:',one,'single-perk traits,',traits.length-one,'two-perk traits.');
