import React,{useEffect,useMemo,useRef,useState} from 'react';
import {championPreview,STAT_GROUPS} from './preview-data';
import {Stat,AttackCard,TraitAbilities} from './ChampionDetails';
import {spellChoices,selectionTiming} from './spell-selection';
import {baselineSpell} from '../../contracts/Arena/baselineSpells';

export default function ArenaCharacter({champion,hud,onClose}){
 const panel=useRef(null),close=useRef(onClose),[tab,setTab]=useState('Stats');close.current=onClose;
 const data=useMemo(()=>championPreview(champion.loadout,champion.skills,champion.progression?.xp),[champion]);
 const spells=[baselineSpell(champion.baselineSpell),...spellChoices(champion.loadout).filter(s=>s.isTrait)].filter(Boolean);
 useEffect(()=>{
  const previous=document.activeElement;panel.current?.querySelector('button')?.focus();
  const key=e=>{
   if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close.current();}
   if(e.key==='Tab'){
    const items=[...panel.current.querySelectorAll('button:not(:disabled),summary,[tabindex="0"]')].filter(el=>el.getClientRects().length);
    const first=items[0],last=items[items.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
   }
  };
  document.addEventListener('keydown',key,true);
  return()=>{document.removeEventListener('keydown',key,true);previous?.focus?.();};
 },[]);
 return <div className="playgroundOverlay"><section ref={panel} className="arenaCharacterDialog" role="dialog" aria-modal="true" aria-labelledby="arena-character-title">
  <header className="arenaCharacterHeader"><div><span className="playgroundEyebrow">YOUR CHAMPION · #{champion.id}</span><h2 id="arena-character-title">{champion.name}</h2></div><button onClick={onClose} aria-label="Close character">✕</button></header>
  <div className="arenaCharacterVitals"><span>Health <strong>{Math.ceil(hud?.hp??data.stats.maxHealth)} / {hud?.maxHealth??data.stats.maxHealth}</strong></span><span>Stamina <strong>{Math.floor(hud?.stamina??data.stats.maxStamina)} / {hud?.maxStamina??data.stats.maxStamina}</strong></span><span>Mana <strong>{Math.floor(hud?.mana??data.stats.maxMana)} / {hud?.maxMana??data.stats.maxMana}</strong></span>{champion.progression&&<span>Level <strong>{champion.progression.level}</strong></span>}</div>
  <p className="championStatNote">Your inputs are paused. The arena stays live and your champion can still take damage.</p>
  <div className="championTabs" role="tablist" aria-label="In-arena character details">{['Stats','Abilities'].map((name,i)=><button key={name} role="tab" id={`arena-character-tab-${i}`} aria-selected={tab===name} aria-controls="arena-character-panel" tabIndex={tab===name?0:-1} onClick={()=>setTab(name)} onKeyDown={e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?1:1-i;setTab(['Stats','Abilities'][next]);document.getElementById(`arena-character-tab-${next}`).focus();}}}>{name}</button>)}</div>
  <div id="arena-character-panel" className="arenaCharacterBody" role="tabpanel" aria-labelledby={`arena-character-tab-${tab==='Stats'?0:1}`} tabIndex={0} key={tab}>
   {tab==='Stats'?<><p className="championStatNote">Equipment and skill bonuses from this arena session. Bars show permanent stats; temporary effects are not included. The notch marks the base value.</p><div className="championMovement"><span>Walk <b>{data.walkSpeed.toFixed(2)} m/s</b></span><span>Run <b>{data.runSpeed.toFixed(2)} m/s</b></span></div>{STAT_GROUPS.map(group=><section key={group.name}><h3 className="championGroupTitle">{group.name}</h3><div className="championQuickStats">{group.keys.map(name=><Stat key={name} name={name} value={data.stats[name]} contributions={data.contributions[name]}/>)}</div></section>)}</>:<><h3 className="championGroupTitle">Weapon & spells</h3><AttackCard trait={data.selected.weapon} attackSeconds={data.attackSeconds}/>{spells.map(spell=><AttackCard key={spell.id} trait={spell} magic timing={selectionTiming(spell,data.stats)}/>)}<h3 className="championGroupTitle">Equipped trait abilities</h3><TraitAbilities data={data}/></>}
  </div>
 </section></div>;
}

