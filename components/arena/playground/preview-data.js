import {buildArenaStats,STAT_DEFINITIONS,attackTiming,abilityTiming,ARENA_RULES} from '../../contracts/Arena/arenaBalanceV1';

export const STAT_GROUPS = [
 {name:'Vitality & movement',keys:['maxHealth','maxStamina','moveSpeedPct','staminaRegenPct','sprintCostReductionPct']},
 {name:'Offence & casting',keys:['weaponPowerPct','abilityPowerPct','powerPct','critChancePct','critMultiplier','hastePct','castSpeedPct','cooldownReductionPct']},
 {name:'Defence',keys:['tenacityPct','critBonusReductionPct',...Object.keys(STAT_DEFINITIONS).filter(k=>k.endsWith('Resistance'))]},
];
export function statDisplay(key,value){
 const d=STAT_DEFINITIONS[key],number=Number(value.toFixed(2));
 return d.unit==='%'?`${number}%`:d.unit==='x'?`${number}×`:`${number}`;
}
export function statMeter(key,value){
 const d=STAT_DEFINITIONS[key],min=Math.min(0,d.cap[0]),max=d.cap[1];
 const position=n=>100*(Math.min(max,Math.max(min,n))-min)/(max-min);
 const zero=position(0),end=position(value);
 return {min,max,left:Math.min(zero,end),width:Math.abs(end-zero),base:position(d.base)};
}
export function championPreview(loadout){
 const built=buildArenaStats(loadout),{stats,selected}=built;
 const contributions=Object.fromEntries(Object.keys(STAT_DEFINITIONS).map(key=>[key,Object.entries(selected).flatMap(([slot,trait])=>trait?.statBonuses?.[key]?[{slot,name:trait.name,value:trait.statBonuses[key]}]:[])]));
 return {...built,contributions,attackSeconds:attackTiming(loadout.weapon,selected.weapon.cycleSeconds,stats.hastePct).durationSeconds,
  magicTiming:selected.magic?abilityTiming(loadout.magic,stats.cooldownReductionPct,stats.castSpeedPct):null,
  walkSpeed:ARENA_RULES.movement.walkMps*(1+stats.moveSpeedPct/100),runSpeed:ARENA_RULES.movement.runMps*(1+stats.moveSpeedPct/100)};
}
