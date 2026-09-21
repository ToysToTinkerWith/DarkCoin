import React from 'react';
import {STATUS_ICONS,statusColor,statusLabel,stackCount} from './status-icons';
export default function StatusEffects({statuses}){
 return <div className="playgroundStatusEffects" aria-label="Active effects">{statuses.map(s=><span key={s.id} className="playgroundStatusBadge" style={{color:statusColor(s.id)}} role="img" aria-label={`${statusLabel(s.id)}: ${stackCount(s)} stacks`} title={`${statusLabel(s.id)}: ${stackCount(s)} stacks`}><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{(STATUS_ICONS[s.id]||STATUS_ICONS.exposed).map((d,i)=><path key={i} d={d}/>)}</svg><b>{stackCount(s)}</b></span>)}</div>;
}
