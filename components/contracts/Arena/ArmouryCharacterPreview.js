import {ChampionNameEditor} from '../../ChampionName';
import React,{useEffect,useMemo,useState} from 'react';
import dynamic from 'next/dynamic';
import {draftChampion} from './armoury-preview-data';
import {championPreview,STAT_GROUPS} from '../../arena/playground/preview-data';
import {Stat,AttackCard,TraitAbilities} from '../../arena/playground/ChampionDetails';
import ChampionAttackPreview from '../../arena/playground/ChampionAttackPreview';
import {loadSavedSkills} from '../../arena/playground/skill-storage';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import FlashOnOutlinedIcon from '@mui/icons-material/FlashOnOutlined';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
const Model=dynamic(()=>import('../../arena/playground/ChampionModelPreview'),{ssr:false});

export default function ArmouryCharacterPreview({id,name,equipped,changes,address}){
 const [playing,setPlaying]=useState(true),[tab,setTab]=useState('All stats'),[progress,setProgress]=useState(null),[notice,setNotice]=useState('Reading champion level and saved arena skills…');
 useEffect(()=>{
  setPlaying(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const controller=new AbortController();setProgress(null);
  if(!address){setNotice('Equipment stats only; arena skill bonuses are not included.');return()=>controller.abort();}
  (async()=>{try{
   const response=await fetch('/api/arena/playground?'+new URLSearchParams({assetId:id,address}),{signal:controller.signal});const data=await response.json();if(!response.ok)throw Error('Progression unavailable');
   let saved={skills:{}};try{saved=loadSavedSkills(window.localStorage,id,data.progression?.xp||'0');}catch{}
   if(!controller.signal.aborted){setProgress({progression:data.progression,skills:saved.skills});setNotice('Includes equipped traits and your saved arena skill bonuses.');}
  }catch{if(!controller.signal.aborted)setNotice('Equipment stats only; champion level and saved skills could not be loaded.');}})();
  return()=>controller.abort();
 },[id,address]);
 const result=useMemo(()=>{try{const champion={...draftChampion({id,name,equipped,changes}),...progress};return {champion,data:championPreview(champion.loadout,champion.skills,champion.progression?.xp)};}catch(error){return {error:error.message};}},[id,name,equipped,changes,progress]);
 if(result.error)return <section id="armoury-character-preview" className="armouryBuildPanel armouryCharacterPreview" role="alert"><h2>Character preview unavailable</h2><p>{result.error}</p><p>You can continue using the trait swapper.</p></section>;
 const {champion,data}=result;
 return <section id="armoury-character-preview" className="armouryBuildPanel armouryCharacterPreview" aria-label="Draft champion 3D preview">
  <header className="armouryBuildHeader"><img className="armouryBuildSeal" src="/home/arenaLogo.png" alt=""/><div><small>DARKCOIN ARENA / 3D</small><ChampionNameEditor id={id} fallback={name} game="3d" compact/><p>Draft loadout{champion.progression&&` / Level ${champion.progression.level}`}</p></div><span className="armouryBuildIdentity">Champion #{champion.id}</span></header>
  <div className="armouryPreviewToolbar"><p>Unsaved trait selections are not yet equipped in Arena.</p><a href="/arena/weapons">Weapon attacks <ArrowForwardIcon fontSize="small"/></a></div>
  <div className="armouryPreviewModels"><Model champion={champion}/><ChampionAttackPreview champion={champion} name={data.selected.weapon.name} playing={playing} onToggle={()=>setPlaying(v=>!v)} compact/></div>
  <div className="armouryPreviewDetails"><div className="championTabs armouryPanelTabs" aria-label="Draft champion details">{[['All stats',BarChartOutlinedIcon],['Attacks',FlashOnOutlinedIcon],['Trait abilities',AutoAwesomeOutlinedIcon]].map(([t,Icon])=><button type="button" key={t} aria-pressed={tab===t} onClick={()=>setTab(t)}><Icon fontSize="small"/>{t}</button>)}</div><p className="championStatNote">{notice}</p>
   {tab==='All stats'&&<><div className="championMovement"><span>Walk <b>{data.walkSpeed.toFixed(2)} m/s</b></span><span>Run <b>{data.runSpeed.toFixed(2)} m/s</b></span></div>{STAT_GROUPS.map(group=><section key={group.name}><h3 className="championGroupTitle">{group.name}</h3><div className="championQuickStats">{group.keys.map(stat=><Stat key={stat} name={stat} value={data.stats[stat]} contributions={data.contributions[stat]}/>)}</div></section>)}</>}
   {tab==='Attacks'&&<><AttackCard trait={data.selected.weapon} attackSeconds={data.attackSeconds}/>{data.selected.magic?<AttackCard trait={{...data.selected.magic,isTrait:true}} magic timing={data.magicTiming}/>:<p className="championStatNote">No magic trait selected. Baseline spells can be chosen before entering the arena.</p>}</>}
   {tab==='Trait abilities'&&<TraitAbilities data={data}/>}
  </div>
 </section>;
}
