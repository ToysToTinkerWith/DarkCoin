import {loadSavedSkills,saveSkills} from '../../components/arena/playground/skill-storage';
import React,{useEffect,useRef,useState} from 'react';
import Head from 'next/head';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {useWallet} from '@txnlab/use-wallet-react';
import NftImage from '../../components/NftImage';
import {assetImageUrl} from '../../lib/ipfsMedia';
import {ownedChampions} from '../../lib/playground';
import {defaultSpellId} from '../../components/arena/playground/spell-selection';
import {DEFAULT_BASELINE_SPELL,baselineSpell as getBaselineSpell} from '../../components/contracts/Arena/baselineSpells';
import GraveclawPanel from '../../components/arena/playground/GraveclawPanel';
import ArenaEntryNotice,{encounterEntryLocked} from '../../components/arena/playground/ArenaEntryNotice';
import ChampionPreview from '../../components/arena/playground/ChampionPreview';
import {PLAYGROUND_JOIN_ENABLED,PLAYGROUND_PAUSED_MESSAGE} from '../../lib/arena/availability';
const ArenaCanvas=dynamic(()=>import('../../components/arena/playground/ArenaCanvas'),{ssr:false,loading:()=> <p className="playgroundLoading">Loading the arena engine…</p>});

export default function Playground(){
  if(!PLAYGROUND_JOIN_ENABLED)return <><Head><title>Playtest temporarily closed | Dark Coin Arena</title></Head><main className="playgroundPage playgroundLobby"><section className="playgroundIntro"><Link href="/arena"><a className="playgroundBack">← All games</a></Link><div className="playgroundIntroSeal"><img src="/home/arenaLogo.png" alt=""/></div><span className="playgroundEyebrow">REAL-TIME 3D · PLAYTEST</span><h1>Temporarily closed</h1><div className="playgroundDivider" aria-hidden="true">◇</div><p role="status">{PLAYGROUND_PAUSED_MESSAGE}</p></section></main></>;
  return <OpenPlayground/>;
}

function OpenPlayground(){
  const {activeAddress}=useWallet();
  const [champions,setChampions]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0),[selected,setSelected]=useState(null),[entering,setEntering]=useState(false);
  const [preview,setPreview]=useState(null),[previewBusy,setPreviewBusy]=useState(false),[previewError,setPreviewError]=useState('');
  const [skillsNotice,setSkillsNotice]=useState('');
  const [spellId,setSpellId]=useState(DEFAULT_BASELINE_SPELL);
  const [economy,setEconomy]=useState(null),[economyError,setEconomyError]=useState('');
  const refreshEconomy=useRef(null);
  useEffect(()=>{
    let live=true,pending=null;const controller=new AbortController();
    const refresh=()=>{
      if(pending)return pending;
      pending=fetch('/api/arena/economy',{signal:controller.signal,cache:'no-store'}).then(async r=>{
        const d=await r.json();if(!r.ok)throw new Error(d.error||'Arena settings unavailable');
        if(live){setEconomy(d);setEconomyError('');}return d;
      }).catch(e=>{if(live){setEconomy(null);setEconomyError(e.message);}return null;}).finally(()=>{pending=null;});
      return pending;
    };
    const visible=()=>{if(document.visibilityState==='visible')void refresh();};
    refreshEconomy.current=refresh;void refresh();const timer=setInterval(visible,15000);
    window.addEventListener('focus',visible);document.addEventListener('visibilitychange',visible);
    return()=>{live=false;controller.abort();clearInterval(timer);window.removeEventListener('focus',visible);document.removeEventListener('visibilitychange',visible);refreshEconomy.current=null;};
  },[]);
  const entryStatus=economy?.schedule?.[0]?.status,entryLocked=encounterEntryLocked(entryStatus);
  const request=useRef(null),epoch=useRef(0),joining=useRef(false);
  useEffect(()=>{
    const controller=new AbortController();epoch.current++;request.current?.abort();joining.current=false;setSelected(null);setPreview(null);setEntering(false);setChampions([]);setError('');
    if(!activeAddress){setBusy(false);return()=>{controller.abort();epoch.current++;};}setBusy(true);
    fetch('/api/getDcAssets',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({address:activeAddress}),signal:controller.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||'Could not load your champions.');return d;}).then(d=>{if(!controller.signal.aborted)setChampions(ownedChampions(d));}).catch(e=>{if(e.name!=='AbortError')setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setBusy(false);});
    return()=>{controller.abort();request.current?.abort();epoch.current++;};
  },[activeAddress,retry]);
  async function inspect(row){
    void refreshEconomy.current?.();
    request.current?.abort();const controller=new AbortController();request.current=controller;
    const id=row.asset?.index??row.id,name=row.asset?.params?.name??row.name;
    setSkillsNotice('');setSpellId(DEFAULT_BASELINE_SPELL);setPreview({id,name});setPreviewBusy(true);setPreviewError('');
    try{const r=await fetch('/api/arena/playground?'+new URLSearchParams({assetId:id,address:activeAddress}),{signal:controller.signal});const d=await r.json();if(!r.ok)throw new Error(d.error||'Could not read this champion.');if(!controller.signal.aborted){setSpellId(defaultSpellId(d.loadout));let saved={skills:{},notice:''};try{saved=loadSavedSkills(window.localStorage,id,d.progression?.xp||'0');}catch{saved.notice='Browser storage is unavailable. Your build will last for this visit only.';}setSkillsNotice(saved.notice);setPreview({...d,skills:saved.skills});}}
    catch(e){if(e.name!=='AbortError')setPreviewError(e.message);}finally{if(!controller.signal.aborted)setPreviewBusy(false);}
  }
  function updateSkills(skills){
    if(!preview||entering)return;
    try{saveSkills(window.localStorage,preview.id,preview.progression?.xp||'0',skills);setSkillsNotice('Saved on this browser. Your updated build will apply when you enter.');}
    catch{setSkillsNotice('Could not save in this browser. Your build will last for this visit only.');}
    setPreview(current=>({...current,skills}));
  }
  function closePreview(){if(joining.current)return;request.current?.abort();setPreview(null);setPreviewError('');}
  async function enter(){
    if(joining.current||!preview?.loadout||entryLocked)return;joining.current=true;setEntering(true);setPreviewError('');const ticket=epoch.current;
    try{
      // Use the existing connected address. The server rechecks NFT ownership
      // and equipment; no wallet signature is requested on entry.
      const latest=await refreshEconomy.current?.();
      if(ticket!==epoch.current)return;
      if(!latest)throw new Error('Could not check arena availability. Please try again.');
      if(encounterEntryLocked(latest.schedule?.[0]?.status))return;
      const r=await fetch('/api/arena/combat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({op:'join',assetId:preview.id,address:activeAddress,baselineSpell:getBaselineSpell(spellId)?.id||DEFAULT_BASELINE_SPELL,skills:preview.skills||{}})});
      const result=await r.json();if(!r.ok)throw new Error(result.error||'Could not enter the arena.');
      if(ticket!==epoch.current){await fetch('/api/arena/combat',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+result.session.token},body:JSON.stringify({op:'leave'})}).catch(()=>{});return;}
      setSelected({...result.champion,session:result.session});setPreview(null);
    }catch(e){if(ticket===epoch.current)setPreviewError(e.message);}finally{if(ticket===epoch.current){joining.current=false;setEntering(false);}}
  }
  return <><Head><title>DarkCoin Arena | 3D Playtest</title><meta name="description" content="Bring your Dark Coin Champion into a playable 3D arena. Move, aim and practice with your equipped weapon."/></Head>
    <main className="playgroundPage playgroundLobby">
      {process.env.NEXT_PUBLIC_ARENA_DEV === 'true'&&<p className="playgroundFootnote" role="status">DEVELOPMENT ARENA · Up to 8 champions · {economy?.enabled?'Treasury testing enabled: check the wallet network before signing.':'Practice mode: no payments or rewards.'}</p>}
      {economyError&&<p className="playgroundError" role="alert">Arena entry is unavailable: {economyError}. Retrying automatically.</p>}
      {selected?<ArenaCanvas key={`${activeAddress}-${selected.id}`} champion={selected} onExit={()=>setSelected(null)}/>:<>
        <section className="playgroundIntro"><Link href="/arena"><a className="playgroundBack">← All games</a></Link><div className="playgroundIntroSeal"><img src="/home/arenaLogo.png" alt=""/></div><span className="playgroundEyebrow">REAL-TIME 3D · PLAYTEST</span><h1>DarkCoin Arena</h1><div className="playgroundDivider" aria-hidden="true">◇</div><p>Inspect your champion. Know your strengths. Enter the arena.<br/>Your equipped traits, brought to life in 3D.</p><div className="playgroundLegend"><span><kbd>WASD</kbd> Move</span><span><kbd>SHIFT</kbd> Run</span><span>Mouse to aim & attack</span></div></section>
        <GraveclawPanel/>
        <section className="playgroundRoster"><div className="playgroundRosterTitle"><div><span className="playgroundEyebrow">CHOOSE YOUR CHAMPION</span><h2>Your roster {activeAddress&&!busy&&<small>{champions.length}</small>}</h2></div>{activeAddress&&<button onClick={()=>setRetry(v=>v+1)} disabled={busy||!!entering}>Refresh</button>}</div>
          <ArenaEntryNotice status={entryStatus}/>
          {!activeAddress?<div className="playgroundEmpty"><h3>Connect your wallet to enter.</h3><p>Use the wallet button above to find your Dark Coin Champions.</p></div>:busy?<div className="playgroundEmpty" role="status">Finding your champions…</div>:!champions.length&&!error?<div className="playgroundEmpty"><h3>No champions in this wallet yet.</h3><p>Choose a wallet that holds a Dark Coin Champion NFT.</p><Link href="/market"><a>Browse the market →</a></Link></div>:null}
          {error&&<p className="playgroundError" role="alert">{error} <button onClick={()=>setRetry(v=>v+1)}>Retry</button></p>}
          <div className="playgroundCards">{champions.map(row=><button className="playgroundChampion" key={row.asset.index} onClick={()=>inspect(row)} aria-label={`Preview ${row.asset.params.name}`}><NftImage src={assetImageUrl(row.asset.params)} alt={row.asset.params.name}/><div><small>#{row.asset.index}</small><h3>{row.asset.params.name}</h3><span>Inspect champion <b aria-hidden="true">↗</b></span></div></button>)}</div>
          <p className="playgroundFootnote">Select a champion to preview their 3D equipment, stats and trait abilities before joining. No transaction or signature required. Keyboard and mouse recommended. Press E for equipped magic and Q for your chosen baseline spell.</p>
        </section>
      </>}
    </main>
    {preview&&!selected&&<ChampionPreview onSkillsChange={updateSkills} skillsNotice={skillsNotice} spellId={spellId} onSpellChange={setSpellId} champion={preview} loading={previewBusy||!economy} error={previewError||economyError} entering={entering} onClose={closePreview} onEnter={enter} onRetry={()=>inspect(preview)} accessReady={!!economy} entryLocked={entryLocked} entryStatus={entryStatus}/>}
  </>;
}
