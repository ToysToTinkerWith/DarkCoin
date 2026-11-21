import {resolveLoadout,normalize} from '../../../lib/playground';
import {TRAITS} from './arenaBalanceV1';

// "None" means keep the equipped slot; "Remove" means an explicitly empty slot.
// Never merge NFT metadata over a draft selection.
export function draftChampion({id,name,equipped,changes}){
 const properties=Object.fromEntries(['Skin','Background','Head','Armour','Weapon','Magic','Extra'].map(type=>{
  const change=changes[type];
  const trait=change==='Remove'?null:change&&change!=='None'?change:equipped[type];
  return [type,trait?.name|| (type==='Background'?'Dawn Background':'None')];
 }));
 return {id:Number(id),name:name||'Your champion',traits:properties,loadout:resolveLoadout(properties)};
}
export function armouryTrait(type,trait){
 if(!trait?.name)return null;
 const name=normalize(trait.name);
 return Object.values(TRAITS[type]||{}).find(entry=>normalize(entry.name)===name||normalize(entry.id)===name)||null;
}
