import ArenaEntryNotice from './ArenaEntryNotice';
import ChampionSkillTree from './ChampionSkillTree';
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import dynamic from 'next/dynamic';
import BaselineSpellPicker from './BaselineSpellPicker';
import {selectedSpell,selectionTiming} from './spell-selection';
import StatIcon from './StatIcon';
import ChampionAttackPreview from './ChampionAttackPreview';
import {championPreview,STAT_GROUPS} from './preview-data';
import {Stat,AttackCard,TraitAbilities} from './ChampionDetails';
const Model=dynamic(()=>import('./ChampionModelPreview'),{ssr:false,loading:()=> <div className="championStage championModelStatus" role="status">Loading 3D engine…</div>});
export default function ChampionPreview({champion,loading,error,entering,onClose,onEnter,onRetry,spellId,onSpellChange,accessReady=true,entryLocked=false,entryStatus,onSkillsChange,skillsNotice}){
 const dialog=useRef(null),[tab,setTab]=useState('Overview'),[ready,setReady]=useState(false),[playing,setPlaying]=useState(false);
 useEffect(()=>{setPlaying(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);},[champion?.id]);
 const data=useMemo(()=>champion?.loadout?championPreview(champion.loadout,champion.skills,champion.progression?.xp):null,[champion]);
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
 const tabs=['Overview','All stats','Trait abilities','Skill tree'];
 return createPortal(<div className="championModalBackdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><section className="championModal" ref={dialog} role="dialog" aria-modal="true" aria-labelledby="champion-preview-title" tabIndex={-1}>
  <header className="championModalHeader"><div className="championSeal"><img src="/home/arenaLogo.png" alt=""/></div><div><span className="championKicker">ARENA / CHAMPION INSPECTION</span><h2 id="champion-preview-title">{champion?.name||'Your champion'}</h2><small>CHAMPION NFT · #{champion?.id}{champion?.progression&&` · LEVEL ${champion.progression.level}`}</small></div><button className="championClose" onClick={onClose} disabled={entering} aria-label="Close champion preview"><StatIcon name="close"/></button></header>
  {loading?<div className="championPreviewLoading" role="status"><span className="championLoadingSeal">◇</span>Reading your champion’s equipped traits…</div>:data?<div className="championPreviewBody"><Model champion={champion} onReady={setReady}/><div className="championDossier"><div className="championTabs" role="tablist" aria-label="Champion details">{tabs.map((name,i)=><button key={name} role="tab" id={`champion-tab-${i}`} aria-controls="champion-detail-panel" aria-selected={tab===name} tabIndex={tab===name?0:-1} onClick={()=>setTab(name)} onKeyDown={e=>{if(['ArrowRight','ArrowLeft','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:tabs.length-1))%tabs.length;setTab(tabs[next]);document.getElementById(`champion-tab-${next}`).focus();}}}>{name}</button>)}</div><div className="championDetailPanel" role="tabpanel" id="champion-detail-panel" aria-labelledby={`champion-tab-${tabs.indexOf(tab)}`} tabIndex={0} key={tab}>
   {tab==='Skill tree'&&<ChampionSkillTree champion={champion} onChange={onSkillsChange} notice={skillsNotice} disabled={entering}/> }
   {tab==='Overview'&&<><ChampionAttackPreview champion={champion} name={data.selected.weapon.name} playing={playing} onToggle={()=>setPlaying(value=>!value)}/><div className="championSectionTitle"><span>READY FOR THE ARENA</span><b>◇</b></div><div className="championQuickStats">{['maxHealth','maxStamina','weaponPowerPct','abilityPowerPct','critChancePct','critMultiplier'].map(name=><Stat key={name} name={name} value={data.stats[name]} contributions={data.contributions[name]}/>)}</div><p className="championStatNote">Bars show permanent equipped stats. The notch marks the base value.</p><AttackCard trait={data.selected.weapon} attackSeconds={data.attackSeconds}/><AttackCard trait={spell} magic timing={selectionTiming(spell,data.stats)}/><p className="championStatNote">Damage dice are before power, critical hits and target resistance. Healing cannot exceed maximum health. Each hit rolls independently.</p><BaselineSpellPicker champion={champion} selected={spell.id} onChange={onSpellChange} stats={data.stats}/></>}
   {tab==='All stats'&&<><p className="championStatNote">Permanent stats only. Conditional and triggered bonuses appear under Trait abilities. A resistance rating is not a percentage.</p><div className="championMovement"><StatIcon name="moveSpeedPct"/><span>Walk <b>{data.walkSpeed.toFixed(2)} m/s</b></span><span>Run <b>{data.runSpeed.toFixed(2)} m/s</b></span></div>{STAT_GROUPS.map(group=><section key={group.name}><h3 className="championGroupTitle">{group.name}</h3><div className="championQuickStats">{group.keys.map(name=><Stat key={name} name={name} value={data.stats[name]} contributions={data.contributions[name]}/>)}</div></section>)}</>}
   {tab==='Trait abilities'&&<TraitAbilities data={data}/>}
  </div></div></div>:null}
  <footer className="championModalFooter">{entryLocked&&<ArenaEntryNotice status={entryStatus||'active'} compact/>}{error&&<div className="championPreviewError" role="alert">{error} {!data&&<button onClick={onRetry}>Try again</button>}</div>}<div><button className="championEnter" disabled={loading||!data||!ready||entering||!accessReady||entryLocked} onClick={onEnter}>{entryLocked?'Encounter in progress · Entry closed':entering?'Entering arena…':!data||loading?'Reading champion…':!ready?'Preparing 3D champion…':!accessReady?'Checking arena access…':'Enter playtest'}<span aria-hidden="true">↗</span></button></div></footer>
 </section></div>,document.body);
}
