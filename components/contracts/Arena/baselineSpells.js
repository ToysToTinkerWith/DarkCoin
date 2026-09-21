// Practice spells are available to every champion. They are not NFT traits.
// Pick one at admission; Q and equipped E magic have separate cooldowns, but
// share the action lock so casting and attacking cannot overlap.
import {ARENA_RULES} from './arenaBalanceV1';

export const BASELINE_SPELLS={
 renewing_light:{name:'Renewing Light',icon:'maxHealth',color:'#83efb2',kind:'heal',healRoll:'3d6+15',castSeconds:.9,cooldownSeconds:15,
  buff:{name:'Quickened',icon:'moveSpeedPct',stats:{moveSpeedPct:6},durationSeconds:4},
  description:'Heal yourself, then gain +6% movement speed for 4 seconds.'},
 ironbloom:{name:'Ironbloom',icon:'tenacityPct',color:'#f5d18a',kind:'heal',healRoll:'2d8+12',castSeconds:1.05,cooldownSeconds:17,
  buff:{name:'Ironbloom guard',icon:'tenacityPct',stats:{bluntResistance:10,slashingResistance:10,piercingResistance:10},durationSeconds:5},
  description:'Heal yourself and gain +10 blunt, slashing and piercing resistance for 5 seconds.'},
 arcane_dart:{name:'Arcane Dart',icon:'arcane',color:'#dc96ff',kind:'projectile',damageType:'arcane',damageRoll:'3d6+10',castSeconds:.7,cooldownSeconds:9,
  projectile:{speedMps:12,widthM:.28,maxRangeM:9},onHit:[],description:'A fast, precise arcane projectile. Aim ahead of moving enemies.'},
 frost_spark:{name:'Frost Spark',icon:'frost',color:'#83eeff',kind:'projectile',damageType:'frost',damageRoll:'2d8+8',castSeconds:.85,cooldownSeconds:11,
  projectile:{speedMps:10,widthM:.4,maxRangeM:8},onHit:[{id:'chill',chance:.65,potency:.75,strike:'each'}],
  description:'A frost projectile with a 65% chance to apply Chill: 15% slow for 2 seconds before tenacity. Reapplications stack potency and refresh duration.'},
 ember_burst:{name:'Ember Burst',icon:'fire',color:'#ff9554',kind:'area',damageType:'fire',damageRoll:'3d6+8',castSeconds:1.1,cooldownSeconds:13,
  area:{distanceM:3,radiusM:1.5,windupPhase:.2},onHit:[{id:'burn',chance:.35,potency:.75,strike:'each'}],
  description:'Mark a circle 3m ahead, then blast everyone inside. Each enemy independently rolls damage, a critical and a 35% Burn chance.'},
};
for(const [id,s] of Object.entries(BASELINE_SPELLS))Object.assign(s,{id,releasePhase:.6,powerSource:'ability',attackKind:s.kind==='area'?'area':'projectile',gesture:s.kind==='heal'?'heal':'forward'});
export const DEFAULT_BASELINE_SPELL='renewing_light';
export function baselineSpell(id){return typeof id==='string'&&Object.prototype.hasOwnProperty.call(BASELINE_SPELLS,id)?BASELINE_SPELLS[id]:null;}
export function validateBaselineSpell(id){if(id==null)return null;if(!baselineSpell(id))throw new Error('Choose a valid baseline spell.');return id;}
export function baselineTiming(id,cooldownReductionPct=0,castSpeedPct=0){
 const spell=baselineSpell(id);if(!spell)throw new Error('Unknown baseline spell');
 const c=Math.max(0,Math.min(ARENA_RULES.caps.cooldownReductionPct[1],cooldownReductionPct));
 const speed=Math.max(0,Math.min(ARENA_RULES.caps.castSpeedPct[1],castSpeedPct));
 return {castSeconds:Math.max(.55,spell.castSeconds/(1+speed/100)),cooldownSeconds:Math.max(4,spell.cooldownSeconds*(1-c/100))};
}
