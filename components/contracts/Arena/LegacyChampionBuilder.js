import React,{useEffect,useRef,useState} from 'react';
import {Button,TextField,LinearProgress} from '@mui/material';
import {useWallet} from '@txnlab/use-wallet-react';
import {doc,onSnapshot} from 'firebase/firestore';
import {db} from '../../../Firebase/FirebaseInit';
import Character from './Character';
import {ChampionNameEditor,refreshChampionName} from '../../ChampionName';
import {EffectRulesScope} from '../../EffectKeywords';
import {submitLegacyGeneration,generationStorageKey} from './legacy-generation-client';
import LegacyBuildPlanner,{DEFAULT_CHAMPION_BUILD} from './LegacyBuildPlanner';
import {normalizeAndValidateGenerationBuild} from '../../../lib/legacy-champion-build';
import {legacyGenerationProgress,queuedGenerationStatus} from '../../../lib/legacy-generation-status';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';

export default function LegacyChampionBuilder({nftId,name,contracts,selection}){
 const {activeAddress,signTransactions}=useWallet(),[build,setBuild]=useState(()=>structuredClone(DEFAULT_CHAMPION_BUILD)),[draftName,setDraftName]=useState(name||''),[saved,setSaved]=useState(null),[status,setStatus]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[view,setView]=useState('build'),[phase,setPhase]=useState(''),[pendingPayment,setPendingPayment]=useState(false);
 const initialized=useRef(false),submitting=useRef(false);
 useEffect(()=>{setPendingPayment(!!localStorage.getItem(generationStorageKey(activeAddress,nftId)));},[activeAddress,nftId,busy]);
 useEffect(()=>{initialized.current=false;setLoading(true);setSaved(null);setStatus(null);setPhase('');setError('');setBuild(structuredClone(DEFAULT_CHAMPION_BUILD));setDraftName(name||'');setView('build');
  return onSnapshot(doc(db,'chars',String(nftId)+'object'),snapshot=>{const data=snapshot.exists()?snapshot.data():{};setSaved(data.charObj||data.charObject||null);if(data.charObj?.name)refreshChampionName(nftId,data.charObj.name,'2d');setStatus(data);setLoading(false);if(!initialized.current){initialized.current=true;if(data.charObj){setDraftName(data.charObj.name||name||'');const previous=data.charObj.generationBuild||data.charObj.userSelectedBuild;if(previous)try{setBuild(normalizeAndValidateGenerationBuild(previous));}catch{}}}},e=>{setError(e.message||'Unable to load the saved 2D champion.');setLoading(false);});
 },[nftId,activeAddress]);
 let validation='';try{normalizeAndValidateGenerationBuild(build);}catch(e){validation=e.message.replace('Invalid generationBuild: ','');}
 const progress=legacyGenerationProgress(status),generating=progress?.active;
 async function generate(){if(submitting.current||generating)return;submitting.current=true;setError('');setBusy(true);try{const result=await submitLegacyGeneration({address:activeAddress,champId:Number(nftId),selection,generationBuild:pendingPayment?null:normalizeAndValidateGenerationBuild(build),championName:draftName.trim(),signTransactions,onProgress:setPhase});setStatus(previous=>queuedGenerationStatus(previous,result.requestId));}catch(e){setError(e.message||'Could not generate this champion.');}finally{setPhase('');setBusy(false);submitting.current=false;}}
 return <EffectRulesScope ruleset="classic"><section id="armoury-2d-builder" className="armouryBuildPanel legacyChampionBuilder" aria-label="Chronicles 2D champion builder">
  <header className="armouryBuildHeader"><img className="armouryBuildSeal" src="/home/arenaLogo.png" alt=""/><div><small>DARKCOIN CHRONICLES / 2D</small><h2>Champion builder</h2></div><span className="armouryBuildIdentity">Champion #{nftId}</span></header>
  <nav className="armouryPanelTabs" aria-label="2D champion views"><Button startIcon={<TuneOutlinedIcon/>} aria-pressed={view==='build'} onClick={()=>setView('build')}>Build a character</Button><Button startIcon={<BookmarkBorderIcon/>} disabled={!saved} aria-pressed={view==='saved'} onClick={()=>setView('saved')}>Saved 2D character</Button></nav>
  <div className="armouryPanelBody">
  {saved&&<ChampionNameEditor id={nftId} fallback={saved.name} game="2d" compact/>}
  {loading&&<p role="status">Loading the saved 2D character…</p>}
  {error&&<p role="alert">{error}</p>}
  {view==='saved'&&saved?<Character key={nftId+':'+(status?.updatedAt?.seconds||'saved')} nftId={nftId} contracts={contracts} setMessage={setError} hideSkillTree={false} hideDeleteButton darkCoinTheme/>:<>
   <div className="armouryBuildIntro"><TextField className="armouryNameField" fullWidth label="2D character name" value={draftName} onChange={e=>setDraftName(e.target.value)} inputProps={{maxLength:32}}/><div className="armouryBuildCost"><span>Generation cost</span><strong>10,000 DARK</strong><small>+ network fee</small></div></div>
   <LegacyBuildPlanner championBuild={build} setChampionBuild={setBuild}/>
   {validation&&<p role="status">{validation}</p>}
  </>}
  <footer className="armouryBuildFooter armouryGenerationFooter">
   <div className="armouryGenerationActions">
    <Button className="armouryPrimary" variant="contained" startIcon={<AutoAwesomeOutlinedIcon/>} disabled={loading||busy||generating||!activeAddress||(!pendingPayment&&(!!validation||!draftName.trim()))} onClick={generate}>{busy?'Preparing generation…':generating?(status.status==='queued'?'Generation queued':'Generating 2D character…'):pendingPayment?'Retry queueing paid build':saved?'Regenerate 2D character · 10,000 DARK':'Generate 2D character · 10,000 DARK'}</Button>
    {(busy||progress)&&<div className="armouryGenerationProgress">
     <div role="status" aria-live="polite"><span>{busy?phase||'Preparing generation…':progress.label}</span>{!busy&&!progress.failed&&<strong>{progress.percent}%</strong>}</div>
     {(busy||!progress.failed)&&<LinearProgress aria-label="2D character generation progress" variant={busy?'indeterminate':'determinate'} value={progress?.percent||0}/>}
     {!busy&&status.status==='queued'&&<p>Payment received. Startup can take a few minutes. You can leave this page; do not pay again.</p>}
     {!busy&&progress?.failed&&<p role="alert">{status.errorMessage||'Generation did not finish.'} Your payment is recorded. Contact support before paying for another build.</p>}
    </div>}
   </div>
   <p>Uses your equipped NFT traits. Apply trait swaps before generating.{saved?' Your saved character stays available until the replacement is ready.':''}</p>
  </footer>
  </div>
 </section></EffectRulesScope>;
}
