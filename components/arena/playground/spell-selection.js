import {MAGIC,DAMAGE_PALETTE,abilityTiming} from '../../contracts/Arena/arenaBalanceV1';
import {BASELINE_SPELLS,DEFAULT_BASELINE_SPELL,baselineTiming} from '../../contracts/Arena/baselineSpells';

// Only the champion's own equipped trait may appear alongside universal spells.
export function spellChoices(loadout){
 const trait=Object.hasOwn(MAGIC,loadout?.magic)?MAGIC[loadout.magic]:null;
 return [...(trait?[{...trait,isTrait:true,icon:'magic',color:DAMAGE_PALETTE[trait.damageType],description:trait.abilities.find(a=>a.trigger==='activeAbility')?.description||trait.label}]:[]),...Object.values(BASELINE_SPELLS)];
}
export function selectedSpell(loadout,id){const choices=spellChoices(loadout);return choices.find(s=>s.id===id)||choices[0];}
export function defaultSpellId(loadout){return selectedSpell(loadout)?.id||DEFAULT_BASELINE_SPELL;}
export function selectionTiming(spell,stats={}){return (spell.isTrait?abilityTiming:baselineTiming)(spell.id,stats.cooldownReductionPct,stats.castSpeedPct);}
