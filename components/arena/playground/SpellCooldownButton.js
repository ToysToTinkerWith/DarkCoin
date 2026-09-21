import React from 'react';
import StatIcon from './StatIcon';

export default function SpellCooldownButton({name,hotkey,color='#bd9cf7',icon='abilityPowerPct',start=0,end=0,time=0,action,baseline=false,blocked,onClick}){
 const casting=action?.kind==='Cast'&&!!action.baseline===baseline&&time<action.start+action.duration;
 const recovering=end>time;
 const progress=casting?Math.max(0,Math.min(1,(time-action.start)/action.duration)):recovering?Math.max(0,Math.min(1,(time-start)/Math.max(.001,end-start))):1;
 const label=casting?'Casting':recovering?'Recovering':'Ready';
 return <button className="playgroundSpellButton" style={{'--spell-color':color}} disabled={blocked||recovering||!!action} onClick={onClick} aria-label={`${name} (${hotkey}) · ${label}`}>
  <span className="playgroundSpellName"><StatIcon name={icon}/><span>{name}</span><kbd>{hotkey}</kbd></span>
  <span className="playgroundCooldownTrack" role="progressbar" aria-label={`${name} ${casting?'cast':'cooldown'}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress*100)} aria-valuetext={`${label} · ${Math.round(progress*100)}%`}><span style={{width:`${progress*100}%`}}/></span>
  <span className="playgroundCooldownLabel">{label}</span>
 </button>;
}
