import React,{useEffect,useState} from 'react';
import {Tooltip} from '@mui/material';
import {CHAMPION_TRAITS} from './traitsData';
import {ARENA_EFFECT_INFO} from './effectInfo';
import {loadLegacyPotencies} from './legacyTraitPotency';

const statHelp={health:['health.svg','Maximum health in the 2D game. Strength adds 2 health per point.'],speed:['speed.png','Determines how often this champion takes a turn. Dexterity increases speed.'],strength:['strength.svg','Increases melee power and maximum health.'],dexterity:['dexterity.svg','Increases ranged power and speed.'],intelligence:['intelligence.svg','Increases magic power and resistance.'],resist:['resist.png','Reduces incoming effect stacks. Intelligence increases resistance.'],accuracy:['accuracy.svg','Improves the chance for a move to hit.']};
export default function LegacyTraitEffects({trait,type}){
 const name=trait?.name||trait?.trait,definition=CHAMPION_TRAITS[type]?.find(t=>t.trait===name||Number(t.assetId)===Number(trait?.assetId));
 const effects=definition?.effects||[],[values,setValues]=useState(null);
 useEffect(()=>{let active=true;setValues(null);if(name&&effects.length)loadLegacyPotencies(name,effects.length).then(v=>{if(active)setValues(v);});return()=>{active=false;};},[name,effects.length]);
 if(!effects.length)return null;
 return <div className="armouryTraitEffects" data-legacy-trait-effects={name} data-effect-ruleset="classic" data-no-keywords><small>2D ARENA</small>{effects.map((effect,i)=>{
  const key=Object.keys(ARENA_EFFECT_INFO).find(k=>new RegExp('\\b'+k+'\\b','i').test(effect)),info=key?ARENA_EFFECT_INFO[key]:null;
  const stat=Object.keys(statHelp).find(k=>new RegExp('\\b'+k+'\\b','i').test(effect));
  const icon=info?.icon||(stat?'/dragonshorde/'+statHelp[stat][0]:null),help=info?.description||(stat?statHelp[stat][1]:effect);
  return <Tooltip key={effect+i} title={<div data-effect-ruleset="classic" data-no-keywords><strong>Chronicles · {info?.label||'Trait bonus'}</strong><p>{help}</p>{info?.details?.map(d=><p key={d.text}>{d.text}</p>)}</div>} arrow><span tabIndex={0} style={{display:'flex',gap:6,alignItems:'center',padding:'6px 0',cursor:'help',borderBottom:'1px dotted #91826d',fontSize:11}}>{icon&&<img src={icon} alt="" style={{width:22,height:22,objectFit:'contain'}}/>}<span>{effect}<br/><b>Potency: {values?.[i]??'—'}</b></span></span></Tooltip>;
 })}</div>;
}
