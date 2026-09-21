import {WEAPONS,UNARMED} from '../../contracts/Arena/arenaBalanceV1';

export const DAMAGE_COLORS=Object.freeze({fire:'#ff742e',slashing:'#c8e9ff',blunt:'#e5aa59',piercing:'#ffe58a',water:'#269fff',shadow:'#a965ff',poison:'#66ef68',arcane:'#ed79ff',frost:'#83eeff',lightning:'#fff14e'});
export function weaponEffectsProfile(id){
 const source=id?WEAPONS[id]:UNARMED;
 if(id&&!source)throw new Error('Missing 3D weapon combat definition: '+id);
 const damageType=source?.damageType||'blunt',speedFactor=1;
 if(!DAMAGE_COLORS[damageType]||!Number.isFinite(speedFactor)||speedFactor<=0)throw new Error('Invalid attack definition: '+id);
 const kind=id==='elf_bow'?'arrow':['dragon_staff','lightning_staff'].includes(id)?'spell':(!id||id.endsWith('_wings'))?'punch':'melee';
 return {id,damageType,speedFactor,color:DAMAGE_COLORS[damageType],kind,projectile:source.projectile,reachM:source.reachM};
}

export function attackWindows(profile,events={}){
 if(profile.kind==='arrow'||profile.kind==='spell')return [{side:'L',release:events.release??events.cast??events.strike??.55}];
 if(profile.kind==='punch')return [{side:'R',start:.18,end:events.right_strike??.36},{side:'L',start:.36,end:events.left_strike??.53}];
 if(events.right_strike!=null&&events.left_strike!=null)return [
  {side:'R',start:events.right_chamber??.12,end:events.right_follow??.40},
  {side:'L',start:events.left_chamber??.54,end:events.left_follow??.80},
 ];
 return [{side:null,start:events.chamber??.20,end:events.follow??.76}];
}
