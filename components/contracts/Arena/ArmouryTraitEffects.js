import {EffectText} from '../../EffectKeywords';
import React from 'react';
import {armouryTrait} from './armoury-preview-data';
import {STAT_DEFINITIONS} from './arenaBalanceV1';
import {statDisplay} from '../../arena/playground/preview-data';

export default function ArmouryTraitEffects({type,trait}){
 const entry=armouryTrait(type,trait);if(!entry)return null;
 return <div className="armouryTraitEffects" data-trait-effects={entry.id}>
  {Object.entries(entry.statBonuses||{}).map(([key,value])=><div className="armouryTraitBonus" key={key}><span>{STAT_DEFINITIONS[key].label}</span><b>{value>0?'+':''}{statDisplay(key,value)}</b></div>)}
  {entry.damageRolls&&<p><b>{entry.damageRolls.join(' / ')}</b> {entry.damageType} damage</p>}
  {entry.damageRoll&&<p><b>{entry.damageRoll}</b> {entry.damageType} damage</p>}
  {entry.abilities?.map(a=><div className="armouryTraitAbility" key={a.id}><strong><EffectText>{a.name}</EffectText></strong><p><EffectText>{a.description}</EffectText></p></div>)}
 </div>;
}
