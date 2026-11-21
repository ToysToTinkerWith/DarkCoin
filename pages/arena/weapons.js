import {EffectText} from '../../components/EffectKeywords';
import React,{useEffect,useMemo,useState} from 'react';
import Head from 'next/head';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {WEAPONS,UNARMED,DAMAGE_PALETTE,potentStatus} from '../../components/contracts/Arena/arenaBalanceV1';
import {STATUS_ICONS,statusColor} from '../../components/arena/playground/status-icons';
import StatIcon from '../../components/arena/playground/StatIcon';
import styles from '../../components/arena/playground/weapon-preview.module.css';

const Model=dynamic(()=>import('../../components/arena/playground/ChampionModelPreview'),{ssr:false,loading:()=> <p role="status">Loading 3D viewer…</p>});
const choices=[...Object.values(WEAPONS)].sort((a,b)=>a.name.localeCompare(b.name)).concat(UNARMED);
const number=n=>Number(n.toFixed(2));
function diceRange(roll){const [,count,sides,bonus='0']=roll.match(/^(\d+)d(\d+)([+-]\d+)?$/);return {min:+count+(+bonus),max:count*sides+(+bonus),mean:count*(+sides+1)/2+(+bonus)};}
function Effect({effect}){
 const s=potentStatus(effect.id,effect.potency),details=[];
 if(s.damagePerSecond)details.push(`${number(s.damagePerSecond)} ${s.damageType} damage/sec`);
 if(s.slowPct)details.push(`${number(s.slowPct)}% movement slow`);
 if(s.allResistanceReduction)details.push(`−${number(s.allResistanceReduction)} to all resistances`);
 if(s.powerReductionPct)details.push(`${number(s.powerReductionPct)}% less outgoing damage`);
 if(s.distanceM)details.push(`${number(s.distanceM)}m push`);
 if(s.kind==='interrupt')details.push('Interrupts the target’s action');
 return <div className={styles.effect}><svg viewBox="0 0 24 24" aria-hidden="true" style={{color:statusColor(effect.id)}}>{STATUS_ICONS[effect.id].map((d,i)=><path key={i} d={d}/>)}</svg><div><strong><EffectText>{s.label}</EffectText> <span>{Math.round(effect.chance*100)}% per hit</span></strong><p>{details.join(' · ')}{s.kind!=='displacement'&&` · ${number(s.durationSeconds)}s`}</p></div></div>;
}
function SwingCard({weapon,active}){
 const spec=weapon,duration=weapon.cycleSeconds;
 return <article className={`${styles.card} ${active?styles.active:''}`} data-attack-card="first" style={{'--damage':DAMAGE_PALETTE[spec.damageType]}}>
  <header><small>WEAPON ATTACK</small><span>{active?'PLAYING':''}</span></header>
  <h2>{weapon.attackKind==='projectile'?'Opening shot':weapon.attackKind==='punch'?'One-two punch':'Opening strike'}</h2>
  <div className={styles.damageType}><StatIcon name={spec.damageType}/>{spec.damageType}</div>
  <div className={styles.rolls}>{spec.damageRolls.map((roll,i)=>{const range=diceRange(roll);return <div key={i}><small>HIT {i+1}</small><b>{roll}</b><span>{range.min}–{range.max} damage · {number(range.mean)} average</span></div>;})}</div>
  <dl className={styles.metrics}><div><dt>Cycle</dt><dd>{number(duration)}s</dd></div><div><dt>Stamina</dt><dd>{weapon.staminaCost}</dd></div><div><dt>{weapon.projectile?'Range':'Reach'}</dt><dd>{spec.projectile?.maxRangeM??spec.reachM}m</dd></div>{weapon.projectile&&<div><dt>Projectile width</dt><dd>{weapon.projectile.widthM}m</dd></div>}</dl>
  <h3>On-hit effects</h3>{spec.onHit.length?spec.onHit.map(effect=><Effect key={effect.id} effect={effect}/>):<p className={styles.muted}>No built-in on-hit status effect.</p>}
 </article>;
}
export default function WeaponViewer(){
 const [id,setId]=useState('scythe'),[playing,setPlaying]=useState(true),[speed,setSpeed]=useState(.65),[replay,setReplay]=useState(0);
 useEffect(()=>{const value=new URLSearchParams(window.location.search).get('weapon');if(WEAPONS[value]||value==='unarmed')setId(value);if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)setPlaying(false);},[]);
 const weapon=id==='unarmed'?UNARMED:WEAPONS[id];
 const champion=useMemo(()=>({id:0,name:'Weapon preview champion',loadout:{skin:'Undead',head:'bone',armour:'leather_garb',weapon:id==='unarmed'?null:id,magic:null,extra:null,background:'Dawn Background'},skills:{},progression:{xp:'0'}}),[id]);
 const select=value=>{setId(value);const url=new URL(window.location.href);url.searchParams.set('weapon',value);window.history.replaceState(null,'',url);};
 const perks=weapon.abilities.filter(a=>a.handler!=='weaponOnHit');
 return <main className={styles.page}>
  <Head><title>Weapon animations | Dark Coin Arena</title><meta name="description" content="Explore every Dark Coin weapon’s attack in 3D, with damage dice, hitboxes, and effects."/></Head>
  <div className={styles.shell}>
   <nav><Link href="/arena">← Arena</Link><Link href="/arena/armory">Armory</Link></nav>
   <header className={styles.heading}><span>THE ARMORY / ATTACK STUDY</span><h1>Every weapon. Every attack.</h1><p>Choose a weapon to explore its attack, hitbox, damage, and effects.</p></header>
   <div className={styles.selector}><div><label htmlFor="weapon-select">Weapon · {choices.length} options</label><select id="weapon-select" value={id} onChange={e=>select(e.target.value)}>{choices.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></div><div className={styles.arrows}><button aria-label="Previous weapon" onClick={()=>select(choices[(choices.findIndex(w=>w.id===id)+choices.length-1)%choices.length].id)}>←</button><button aria-label="Next weapon" onClick={()=>select(choices[(choices.findIndex(w=>w.id===id)+1)%choices.length].id)}>→</button></div></div>
   <div className={styles.layout}>
    <section className={styles.viewer} aria-label="Selected weapon animation">
     <header>{id!=='unarmed'&&<img src={`/arena/playground/traits/weapon-${id}.webp`} width="56" height="56" alt="Original weapon artwork"/>}<div><small>LIVE 3D PREVIEW</small><h2>{weapon.name}</h2></div></header>
     <Model champion={champion} mode="attack" playing={playing} playbackSpeed={speed} replayKey={replay}/>
     <div className={styles.playback}><button onClick={()=>setPlaying(v=>!v)}>{playing?'Pause':'Play'}</button><button onClick={()=>{setReplay(n=>n+1);}}>Replay</button><label>Speed <select aria-label="Playback speed" value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value="0.35">0.35×</option><option value="0.65">0.65×</option><option value="1">1×</option></select></label></div>
     <p>Red shows the active hitbox, including projectiles. Drag to orbit; right-drag to pan.</p>
    </section>
    <section className={styles.details} aria-label="Weapon damage and effects"><SwingCard weapon={weapon} active={playing}/>
     <aside className={styles.notes}><h3>How the rolls work</h3><p>Raw weapon damage before champion bonuses, criticals, and target resistance. Every hit rolls its own damage, critical, and effect chances, including both strikes of paired weapons.</p><p>Base critical chance: <b>10%</b> · Critical damage: <b>2×</b>. Equipment and skills can change these.</p><p>Effect values show one application at this weapon’s potency. Reapplying a timed effect adds potency and refreshes its duration. There is no proc or critical cooldown.</p>{perks.length>0&&<><h3>Other weapon abilities</h3>{perks.map(perk=><p key={perk.id}><b>{perk.name}.</b> <EffectText>{perk.description}</EffectText></p>)}</>}</aside>
    </section>
   </div>
  </div>
 </main>;
}
