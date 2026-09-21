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
import ChampionPreview from '../../components/arena/playground/ChampionPreview';
import {PLAYGROUND_JOIN_ENABLED,PLAYGROUND_PAUSED_MESSAGE} from '../../lib/arena/availability';
const ArenaCanvas=dynamic(()=>import('../../components/arena/playground/ArenaCanvas'),{ssr:false,loading:()=> <p className="playgroundLoading">Loading the arena engine…</p>});

export default function Playground(){
  if(!PLAYGROUND_JOIN_ENABLED)return <><Head><title>Playground temporarily closed | Dark Coin Arena</title></Head><main className="playgroundPage playgroundLobby"><section className="playgroundIntro"><Link href="/arena"><a className="playgroundBack">← Arena</a></Link><div className="playgroundIntroSeal"><img src="/home/arenaLogo.png" alt=""/></div><span className="playgroundEyebrow">DARK COIN ARENA / 3D PLAYGROUND</span><h1>Temporarily closed</h1><div className="playgroundDivider" aria-hidden="true">◇</div><p role="status">{PLAYGROUND_PAUSED_MESSAGE}</p></section></main></>;
  return <OpenPlayground/>;
}

function OpenPlayground(){
  const {activeAddress}=useWallet();
  const [champions,setChampions]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0),[selected,setSelected]=useState(null),[entering,setEntering]=useState(false);
  const [preview,setPreview]=useState(null),[previewBusy,setPreviewBusy]=useState(false),[previewError,setPreviewError]=useState('');
  const [spellId,setSpellId]=useState(DEFAULT_BASELINE_SPELL);
  const request=useRef(null),epoch=useRef(0),joining=useRef(false);
  useEffect(()=>{
    const controller=new AbortController();epoch.current++;request.current?.abort();joining.current=false;setSelected(null);setPreview(null);setEntering(false);setChampions([]);setError('');
    if(!activeAddress){setBusy(false);return()=>{controller.abort();epoch.current++;};}setBusy(true);
    fetch('/api/getDcAssets',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({address:activeAddress}),signal:controller.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||'Could not load your champions.');return d;}).then(d=>{if(!controller.signal.aborted)setChampions(ownedChampions(d));}).catch(e=>{if(e.name!=='AbortError')setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setBusy(false);});
    return()=>{controller.abort();request.current?.abort();epoch.current++;};
  },[activeAddress,retry]);
  async function inspect(row){
    request.current?.abort();const controller=new AbortController();request.current=controller;
    const id=row.asset?.index??row.id,name=row.asset?.params?.name??row.name;
    setSpellId(DEFAULT_BASELINE_SPELL);setPreview({id,name});setPreviewBusy(true);setPreviewError('');
    try{const r=await fetch('/api/arena/playground?'+new URLSearchParams({assetId:id,address:activeAddress}),{signal:controller.signal});const d=await r.json();if(!r.ok)throw new Error(d.error||'Could not read this champion.');if(!controller.signal.aborted){setSpellId(defaultSpellId(d.loadout));setPreview(d);}}
    catch(e){if(e.name!=='AbortError')setPreviewError(e.message);}finally{if(!controller.signal.aborted)setPreviewBusy(false);}
  }
  function closePreview(){if(joining.current)return;request.current?.abort();setPreview(null);setPreviewError('');}
  async function enter(){
    if(joining.current||!preview?.loadout)return;joining.current=true;setEntering(true);setPreviewError('');const ticket=epoch.current;
    try{
      // No signing or transaction submission. The server rechecks NFT holdings
      // and equipment; the client cannot choose its own combat stats.
      const r=await fetch('/api/arena/combat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({op:'join',assetId:preview.id,address:activeAddress,baselineSpell:getBaselineSpell(spellId)?.id||null})});
      const result=await r.json();if(!r.ok)throw new Error(result.error||'Could not enter the arena.');
      if(ticket!==epoch.current){await fetch('/api/arena/combat',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+result.session.token},body:JSON.stringify({op:'leave'})}).catch(()=>{});return;}
      setSelected({...result.champion,session:result.session});setPreview(null);
    }catch(e){if(ticket===epoch.current)setPreviewError(e.message);}finally{if(ticket===epoch.current){joining.current=false;setEntering(false);}}
  }
  return <><Head><title>Playground | Dark Coin Arena</title><meta name="description" content="Bring your Dark Coin Champion into a playable 3D arena. Move, aim and practice with your equipped weapon."/></Head>
    <main className="playgroundPage playgroundLobby">
      {process.env.NEXT_PUBLIC_ARENA_DEV === 'true'&&<p className="playgroundFootnote" role="status">DEVELOPMENT ARENA · Up to 8 champions · Test matches have no rewards. Production remains closed.</p>}
      {selected?<ArenaCanvas key={`${activeAddress}-${selected.id}`} champion={selected} onExit={()=>setSelected(null)}/>:<>
        <section className="playgroundIntro"><Link href="/arena"><a className="playgroundBack">← Arena</a></Link><div className="playgroundIntroSeal"><img src="/home/arenaLogo.png" alt=""/></div><span className="playgroundEyebrow">DARK COIN ARENA / 3D PLAYGROUND</span><h1>The proving ground</h1><div className="playgroundDivider" aria-hidden="true">◇</div><p>Inspect your champion. Know your strengths. Enter the arena.<br/>Your equipped traits, brought to life in 3D.</p><div className="playgroundLegend"><span><kbd>WASD</kbd> Move</span><span><kbd>SHIFT</kbd> Run</span><span>Mouse to aim & attack</span></div></section>
        <section className="playgroundRoster"><div className="playgroundRosterTitle"><div><span className="playgroundEyebrow">CHOOSE YOUR CHAMPION</span><h2>Your roster {activeAddress&&!busy&&<small>{champions.length}</small>}</h2></div>{activeAddress&&<button onClick={()=>setRetry(v=>v+1)} disabled={busy||!!entering}>Refresh</button>}</div>
          {!activeAddress?<div className="playgroundEmpty"><h3>Connect your wallet to enter.</h3><p>Use the wallet button above to find your Dark Coin Champions.</p></div>:busy?<div className="playgroundEmpty" role="status">Finding your champions…</div>:!champions.length&&!error?<div className="playgroundEmpty"><h3>No champions in this wallet yet.</h3><p>Choose a wallet that holds a Dark Coin Champion NFT.</p><Link href="/market"><a>Browse the market →</a></Link></div>:null}
          {error&&<p className="playgroundError" role="alert">{error} <button onClick={()=>setRetry(v=>v+1)}>Retry</button></p>}
          <div className="playgroundCards">{champions.map(row=><button className="playgroundChampion" key={row.asset.index} onClick={()=>inspect(row)} aria-label={`Preview ${row.asset.params.name}`}><NftImage src={assetImageUrl(row.asset.params)} alt={row.asset.params.name}/><div><small>#{row.asset.index}</small><h3>{row.asset.params.name}</h3><span>Inspect champion <b aria-hidden="true">↗</b></span></div></button>)}</div>
          <p className="playgroundFootnote">Select a champion to preview their 3D equipment, stats and trait abilities before joining. No transaction or signature required. Keyboard and mouse recommended. Press E for equipped magic and Q for your chosen baseline spell.</p>
        </section>
      </>}
    </main>
    {preview&&!selected&&<ChampionPreview spellId={spellId} onSpellChange={setSpellId} champion={preview} loading={previewBusy} error={previewError} entering={entering} onClose={closePreview} onEnter={enter} onRetry={()=>inspect(preview)}/>}
  </>;
}
