import React,{useEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import dynamic from 'next/dynamic';
import BaselineSpellPicker from './BaselineSpellPicker';
import {selectedSpell,selectionTiming} from './spell-selection';
import StatIcon from './StatIcon';
import ChampionAttackPreview from './ChampionAttackPreview';
import {championPreview,statMeter,statDisplay,STAT_GROUPS} from './preview-data';
import {STAT_DEFINITIONS,DAMAGE_PALETTE} from '../../contracts/Arena/arenaBalanceV1';
const Model=dynamic(()=>import('./ChampionModelPreview'),{ssr:false,loading:()=> <div className="championStage championModelStatus" role="status">Loading 3D engine…</div>});
const slotNames={head:'Head',armour:'Armour',weapon:'Weapon',magic:'Magic',skin:'Skin',extra:'Extra',background:'Background'};

function Stat({name,value,contributions=[]}){
 const d=STAT_DEFINITIONS[name],bar=statMeter(name,value),colour=DAMAGE_PALETTE[name.replace('Resistance','')];
 return <div className="championStat" style={colour?{'--stat-colour':colour}:undefined}>
  <div className="championStatLine"><StatIcon name={name}/><span>{d.label}</span><strong>{statDisplay(name,value)}</strong></div>
  <div className="championStatTrack" role="meter" aria-label={d.label} aria-valuemin={bar.min} aria-valuemax={bar.max} aria-valuenow={value} aria-valuetext={`${statDisplay(name,value)} ${d.unit==='rating'?'rating':''}. Base ${statDisplay(name,d.base)}. Maximum ${statDisplay(name,bar.max)}.`}><i style={{left:bar.left+'%',width:bar.width+'%'}}/><b style={{left:bar.base+'%'}}/></div>
  {contributions.length>0&&<div className="championStatContributions">{contributions.map(c=><small key={c.slot}>{c.name} <b>{c.value>0?'+':''}{statDisplay(name,c.value)}</b></small>)}{Math.abs(d.base+contributions.reduce((n,c)=>n+c.value,0)-value)>.001&&<small>Combined bonus limited by the stat cap.</small>}</div>}
  <details className="championStatExplanation"><summary>Base {statDisplay(name,d.base)} <span>Cap {statDisplay(name,bar.max)} ⓘ</span></summary><p>{d.effect}</p></details>
 </div>;
}
function AttackCard({trait,magic,timing,attackSeconds}){
 if(!trait)return null;
 const healing=!!trait.healRoll,range=trait.projectile?.maxRangeM??trait.area?.distanceM??trait.reachM;
 return <div className="championAttackCard" data-selected-spell={magic?trait.id:undefined} style={{'--stat-colour':trait.color||DAMAGE_PALETTE[trait.damageType]}}><div className="championAttackHeading"><StatIcon name={healing?'maxHealth':magic?'magic':'weapon'}/><div><small>{magic?(trait.isTrait?'E · SELECTED SPELL':'Q · SELECTED SPELL'):'LEFT CLICK · ATTACK'}</small><h4>{trait.name}</h4></div><span className="championDamageType">{healing?'Healing':trait.damageType}</span></div><div className="championAttackNumbers"><span><b>{magic?(trait.healRoll||trait.damageRoll):trait.damageRolls.join(' / ')}</b>{healing?'Healing dice':'Raw damage dice'}{!magic&&trait.damageRolls.length>1?' · one roll per hit':''}</span><span><b>{(magic?timing.castSeconds:attackSeconds).toFixed(2)}s</b>{magic?'Cast time':'Attack cycle'}</span><span><b>{range==null?'Self':`${range}m`}</b>{healing?'Target':trait.area?'Distance ahead':magic||trait.projectile?'Range':'Reach'}</span>{magic&&<><span><b>{timing.cooldownSeconds.toFixed(1)}s</b>Cooldown after cast</span>{trait.projectile&&<span><b>{trait.projectile.widthM}m</b>Projectile width</span>}{trait.area&&<span><b>{trait.area.radiusM}m</b>Area radius</span>}</>}</div>{magic&&<p className="championStatNote">{trait.description}</p>}</div>;
}
export default function ChampionPreview({champion,loading,error,entering,onClose,onEnter,onRetry,spellId,onSpellChange}){
 const dialog=useRef(null),[tab,setTab]=useState('Overview'),[ready,setReady]=useState(false),[playing,setPlaying]=useState(false);
 useEffect(()=>{setPlaying(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);},[champion?.id]);
 const data=useMemo(()=>champion?.loadout?championPreview(champion.loadout):null,[champion]);
 const spell=data?selectedSpell(champion.loadout,spellId):null;
 const closeRef=useRef(onClose);closeRef.current=onClose;
 useEffect(()=>{
  const previous=document.activeElement,overflow=document.body.style.overflow,app=document.getElementById('__next'),wasInert=app?.inert;
  document.body.style.overflow='hidden';if(app)app.inert=true;dialog.current?.focus();
  function keys(e){if(e.key==='Escape'){e.preventDefault();closeRef.current();}if(e.key==='Tab'){
   const items=[...dialog.current.querySelectorAll('button:not(:disabled),a[href],summary,[tabindex="0"]')].filter(e=>e.getClientRects().length);
   const first=items[0],last=items[items.length-1];if(!first){e.preventDefault();return;}
   if(e.shiftKey&&(document.activeElement===first||document.activeElement===dialog.current)){e.preventDefault();last.focus();}
   else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===dialog.current)){e.preventDefault();first.focus();}
  }}document.addEventListener('keydown',keys);
  return()=>{document.body.style.overflow=overflow;if(app)app.inert=wasInert;document.removeEventListener('keydown',keys);if(previous?.isConnected)previous.focus();};
 },[]);
 const tabs=['Overview','All stats','Trait abilities'];
 return createPortal(<div className="championModalBackdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><section className="championModal" ref={dialog} role="dialog" aria-modal="true" aria-labelledby="champion-preview-title" tabIndex={-1}>
  <header className="championModalHeader"><div className="championSeal"><img src="/home/arenaLogo.png" alt=""/></div><div><span className="championKicker">ARENA / CHAMPION INSPECTION</span><h2 id="champion-preview-title">{champion?.name||'Your champion'}</h2><small>CHAMPION NFT · #{champion?.id}</small></div><button className="championClose" onClick={onClose} disabled={entering} aria-label="Close champion preview"><StatIcon name="close"/></button></header>
  {loading?<div className="championPreviewLoading" role="status"><span className="championLoadingSeal">◇</span>Reading your champion’s equipped traits…</div>:data?<div className="championPreviewBody"><Model champion={champion} onReady={setReady}/><div className="championDossier"><div className="championTabs" role="tablist" aria-label="Champion details">{tabs.map((name,i)=><button key={name} role="tab" id={`champion-tab-${i}`} aria-controls="champion-detail-panel" aria-selected={tab===name} tabIndex={tab===name?0:-1} onClick={()=>setTab(name)} onKeyDown={e=>{if(['ArrowRight','ArrowLeft','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?2:(i+(e.key==='ArrowRight'?1:2))%3;setTab(tabs[next]);document.getElementById(`champion-tab-${next}`).focus();}}}>{name}</button>)}</div><div className="championDetailPanel" role="tabpanel" id="champion-detail-panel" aria-labelledby={`champion-tab-${tabs.indexOf(tab)}`} tabIndex={0} key={tab}>
   {tab==='Overview'&&<><ChampionAttackPreview champion={champion} name={data.selected.weapon.name} playing={playing} onToggle={()=>setPlaying(value=>!value)}/><div className="championSectionTitle"><span>READY FOR THE ARENA</span><b>◇</b></div><div className="championQuickStats">{['maxHealth','maxStamina','weaponPowerPct','abilityPowerPct','critChancePct','critMultiplier'].map(name=><Stat key={name} name={name} value={data.stats[name]} contributions={data.contributions[name]}/>)}</div><p className="championStatNote">Bars show permanent equipped stats against their caps. The notch marks the base value.</p><AttackCard trait={data.selected.weapon} attackSeconds={data.attackSeconds}/><AttackCard trait={spell} magic timing={selectionTiming(spell,data.stats)}/><p className="championStatNote">Damage dice are before power, critical hits and target resistance. Healing cannot exceed maximum health. Each hit rolls independently.</p><BaselineSpellPicker champion={champion} selected={spell.id} onChange={onSpellChange} stats={data.stats}/></>}
   {tab==='All stats'&&<><p className="championStatNote">Permanent stats only. Conditional and triggered bonuses appear under Trait abilities. A resistance rating is not a percentage.</p><div className="championMovement"><StatIcon name="moveSpeedPct"/><span>Walk <b>{data.walkSpeed.toFixed(2)} m/s</b></span><span>Run <b>{data.runSpeed.toFixed(2)} m/s</b></span></div>{STAT_GROUPS.map(group=><section key={group.name}><h3 className="championGroupTitle">{group.name}</h3><div className="championQuickStats">{group.keys.map(name=><Stat key={name} name={name} value={data.stats[name]} contributions={data.contributions[name]}/>)}</div></section>)}</>}
   {tab==='Trait abilities'&&<><p className="championStatNote">Every equipped trait contributes its own ability. Temporary bonuses activate only when their listed conditions are met.</p>{Object.entries(slotNames).map(([slot,label])=>{const trait=data.selected[slot];return <section className="championTraitCard" key={slot}><header>{trait&&trait.id!=='unarmed'?<img className="championTraitImage" src={`/arena/playground/traits/${trait.category.toLowerCase()}-${trait.id}.webp`} alt={`${trait.name} original trait artwork`} loading="lazy" width="64" height="64"/>:<StatIcon name={slot}/>}<div><small>{label}</small><h3>{trait?.name||'Not equipped'}</h3></div></header>{trait?.abilities?.length?trait.abilities.map(ability=><div className="championPerk" key={ability.id}><div><strong>{ability.name}</strong><span>{ability.trigger==='always'?'Passive':ability.trigger==='conditional'?'Conditional':slot==='magic'?'Cast · E':ability.handler==='weaponOnHit'||ability.trigger==='confirmedHit'?'On hit':'Triggered'}</span></div><p>{ability.description}</p></div>):<p className="championStatNote">{slot==='weapon'?'Unarmed attacks remain available.':'No trait bonus in this slot.'}</p>}</section>;})}</>}
  </div></div></div>:null}
  <footer className="championModalFooter">{error&&<div className="championPreviewError" role="alert">{error} {!data&&<button onClick={onRetry}>Try again</button>}</div>}<div><p><strong>THE PROVING GROUND</strong><span>Shared practice arena · No transaction or signature required</span><small>WASD move · Shift run · Space jump · Right click draw / stow · Left click attack · E trait magic · Q baseline spell</small></p><button className="championEnter" disabled={loading||!data||!ready||entering} onClick={onEnter}>{entering?'Entering arena…':!data||loading?'Reading champion…':!ready?'Preparing 3D champion…':'Enter playground'}<span aria-hidden="true">↗</span></button></div></footer>
 </section></div>,document.body);
}
