import React from 'react';
import {SPAWN_WARNING_SECONDS} from '../../../lib/arena/encounter-timing';
import styles from './ArenaEncounterHud.module.css';

export function encounterHudState(encounter,beast,time){
 if(!encounter)return null;
 const name=encounter.name||'Graveclaw';
 if(['active','returning'].includes(encounter.status)){
  const max=Math.max(1,Number(beast?.maxHealth)||1),health=Math.max(0,Math.min(max,Number(beast?.hp)||0));
  return {name,fighting:true,label:encounter.status==='returning'?'Returning to his grave':'BOSS',
   value:beast?`${Math.ceil(health).toLocaleString()} / ${Math.ceil(max).toLocaleString()}`:'Emerging…',
   ratio:beast?health/max:1,current:health,max,description:`${name} health`};
 }
 const deadline=Number(encounter.nextSpawnAt);
 if(!deadline)return {name,label:'NEXT CHALLENGE',value:'Waiting for champions',ratio:0,current:0,max:SPAWN_WARNING_SECONDS,description:'Monster spawn countdown'};
 const remaining=Math.max(0,Math.ceil(deadline-time));
 const started=encounter.countdownStartedAt??encounter.resolvedAt??encounter.defeatedAt??deadline-SPAWN_WARNING_SECONDS;
 const duration=Math.max(SPAWN_WARNING_SECONDS,deadline-started,remaining);
 return {name,label:remaining>SPAWN_WARNING_SECONDS?'RESTING · NEXT SPAWN':'NEXT CHALLENGE',
  value:remaining?`${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`:'Emerging…',
  ratio:remaining/duration,current:remaining,max:duration,description:`${name} spawn countdown`};
}

export default function ArenaEncounterHud({encounter,beast,time,lootEligible}){
 const view=encounterHudState(encounter,beast,time);
 if(!view)return null;
 return <section className={`${styles.hud} ${view.fighting?styles.fighting:''}`} aria-label="Arena encounter">
  <div className={styles.heading}><div><span className={styles.label}>{view.label}</span><strong>{view.name}</strong></div><span className={styles.value}>{view.value}</span></div>
  <div className={styles.track} role="progressbar" aria-label={view.description} aria-valuemin={0} aria-valuemax={view.max} aria-valuenow={view.current} aria-valuetext={view.value}>
   <div className={styles.fill} style={{width:`${Math.max(0,Math.min(1,view.ratio))*100}%`}}/>
  </div>
  {view.fighting&&encounter.status==='active'&&<span className={styles.detail}>{lootEligible?'Loot eligible':'Damage or heal to qualify for loot'}</span>}
 </section>;
}
