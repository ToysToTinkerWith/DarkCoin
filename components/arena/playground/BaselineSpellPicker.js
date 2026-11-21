import React,{useState} from 'react';
import dynamic from 'next/dynamic';
import StatIcon from './StatIcon';
import {spellChoices,selectedSpell,selectionTiming} from './spell-selection';
const Model=dynamic(()=>import('./ChampionModelPreview'),{ssr:false});
export default function BaselineSpellPicker({champion,selected,onChange,stats}){
 const [preview,setPreview]=useState(false);
 const choices=spellChoices(champion.loadout),spell=selectedSpell(champion.loadout,selected);
 return <section className="championSpellPicker" aria-label="Choose your spell">
  <div className="championSectionTitle"><span>CHOOSE YOUR SPELL</span><b>✧</b></div>
  <p className="championStatNote">Your equipped Magic trait appears first and casts with E. Baseline spells are available to every champion and cast with Q when selected. Choose a spell to see its details and animation.</p>
  <div className="championSpellChoices" role="group" aria-label="Spells">{choices.map(s=>{
   const timing=selectionTiming(s,stats);
   return <button type="button" key={s.id} className="championSpellChoice" aria-pressed={s.id===spell.id} onClick={()=>onChange(s.id)} style={{'--spell-color':s.color}}>
    <StatIcon name={s.icon}/><span><strong>{s.name}</strong><small>{s.isTrait?'EQUIPPED TRAIT · E':'BASELINE SPELL · Q'}</small><span>{s.description}</span><small>{s.healRoll?`${s.healRoll} healing`:`${s.damageRoll} ${s.damageType}`} · {timing.castSeconds.toFixed(2)}s cast · {timing.cooldownSeconds.toFixed(1)}s cooldown</small><small>{s.projectile?`${s.projectile.maxRangeM}m range · ${s.projectile.widthM}m width`:s.area?`${s.area.distanceM}m ahead · ${s.area.radiusM}m radius`:'Self only · heal cannot exceed maximum HP'}</small></span><b aria-hidden="true">{s.id===spell.id?'✓':'+'}</b>
   </button>;
  })}</div>
  <p className="championStatNote">Dice scale with ability power. Heals and direct damage use your critical chance and multiplier (base 10% / 2×). Buffs refresh without stacking and respect stat caps.</p>
  <button className="championSpellPreviewButton" onClick={()=>setPreview(v=>!v)} aria-expanded={preview}>{preview?'Hide':'Preview'} {spell.name} animation</button>
  {preview&&<Model champion={champion} mode="spell" spellId={spell.id}/>}
 </section>;
}
