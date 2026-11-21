import React,{useRef} from 'react';
import {STATUS_ICONS,statusColor,statusLabel,stackCount} from './status-icons';
export default function StatusEffects({statuses,time}){
 const starts=useRef(new Map()),active=(statuses||[]).filter(s=>!Number.isFinite(time)||s.until>time);
 for(const id of starts.current.keys())if(!active.some(s=>s.id===id))starts.current.delete(id);
 return <div className="playgroundStatusEffects" aria-label="Active effects">{active.map(s=>{
  let clock=starts.current.get(s.id);if(!clock||clock.until!==s.until){clock={until:s.until,start:time};starts.current.set(s.id,clock);}
  const life=Number.isFinite(time)?Math.max(0,Math.min(1,(s.until-time)/Math.max(.001,s.until-clock.start))):1;
  return <span key={s.id} className="playgroundStatusBadge" style={{'--effect-color':statusColor(s.id),color:statusColor(s.id)}} role="img" aria-label={`${statusLabel(s.id)}: ${stackCount(s)} stacks`} title={`${statusLabel(s.id)}: ${stackCount(s)} stacks`}>
   <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{(STATUS_ICONS[s.id]||STATUS_ICONS.exposed).map((d,i)=><path key={i} d={d}/>)}</svg><b>{stackCount(s)}</b><i className="playgroundEffectLife" aria-hidden="true"><i style={{transform:`scaleX(${life})`}}/></i>
  </span>;
 })}</div>;
}
