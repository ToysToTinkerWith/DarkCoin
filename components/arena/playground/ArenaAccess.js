import React,{useState,useEffect,useRef} from 'react';
import algosdk from 'algosdk';
import {useWallet} from '@txnlab/use-wallet-react';
import {Buffer} from 'buffer';
import NftImage from '../../NftImage';
import {useArenaWallet} from '../../connect/ArenaWalletProvider';
export function lootAmount(atomic,decimals){const raw=String(atomic).padStart(decimals+1,'0');return decimals?raw.slice(0,-decimals)+(raw.slice(-decimals).replace(/0+$/,'')?'.'+raw.slice(-decimals).replace(/0+$/,''):''):raw;}
export default function ArenaAccess({champion,settings}){
 const {activeAddress,signTransactions}=useWallet(),[busy,setBusy]=useState(''),[error,setError]=useState(''),[token,setToken]=useState(''),[rewards,setRewards]=useState([]),[cursor,setCursor]=useState(null),[claimPreview,setClaimPreview]=useState(null),[checked,setChecked]=useState(false);
 const {authorizeChampion,signingArena}=useArenaWallet();
 const claimView=useRef(null),identity=useRef('');identity.current=`${activeAddress}-${champion.id}`;
 useEffect(()=>{if(claimPreview)claimView.current?.scrollIntoView({block:'nearest'});},[claimPreview]);
 useEffect(()=>{setToken('');setRewards([]);setCursor(null);setClaimPreview(null);setChecked(false);setError('');},[champion.id,activeAddress,settings?.enabled]);
 async function api(op,data={},auth=token){const r=await fetch('/api/arena/economy',{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+auth}:{})},body:JSON.stringify({op,...data})}),d=await r.json();if(!r.ok)throw new Error(d.error||'Arena request failed');return d;}
 async function verify(){
  setBusy('Approve sign-in in your connected wallet…');const selected=identity.current;
  const token=await authorizeChampion(champion.id);if(selected!==identity.current)throw new Error('Your champion or wallet changed.');setToken(token);return token;
 }
 async function run(fn){setError('');try{await fn();}catch(e){setError(e.message);}finally{setBusy('');}}
 async function load(more=false){const auth=await verify();setBusy('Loading loot…');const d=await api('rewards',more?{cursor}:{},auth);setRewards(rows=>more?[...rows,...d.rewards]:d.rewards);setCursor(d.cursor);setChecked(true);}
 async function claim(){
  const {transactions,hour}=claimPreview;setBusy('Approve your reward claim…');const signed=await signTransactions(transactions.map(s=>new Uint8Array(Buffer.from(s,'base64'))));
  if(!signed||signed.length!==transactions.length||signed.some(s=>!s))throw new Error('Claim cancelled');
  const client=new algosdk.Algodv2('',settings.algodUrl,new URL(settings.algodUrl).port);setBusy('Confirming reward…');const {txid}=await client.sendRawTransaction(signed).do();await algosdk.waitForConfirmation(client,txid,8);
  setRewards(rows=>rows.map(row=>row.hour===hour?{...row,claimed:true}:row));setClaimPreview(null);
 }
 if(!settings?.enabled)return null;
 return <section className="arenaLootPanel" aria-label="Free entry and monster loot">
  <div className="arenaLootHeading"><strong>FREE ARENA ENTRY</strong><span>MONSTER LOOT</span></div>
  <p>No subscription or DARK payment. Enter using your connected wallet. If sign-in is needed, your wallet will ask for a signature; no funds move.</p>
  <div className="arenaLootActions"><button disabled={!!busy||signingArena} onClick={()=>run(()=>load())}>Check my loot</button>{busy&&<span role="status">{busy}</span>}</div>
  <details><summary>Loot odds & claim fees</summary><p>Each champion present at a monster defeat gets a loot roll. Drops come from available treasury inventory. If one category is empty, the other is used; an empty treasury cannot award loot.</p>{Object.entries(settings.monsterRewards||{}).map(([kind,profile])=><p key={kind}><strong>{kind==='graveclaw'?'Graveclaw':'Cindermaw (dragon)'}</strong>: {profile.nftChanceBps/100}% NFT chance. After selecting a token: {profile.tokenTiers.map(t=>`${t.bps/100}% of its available balance (${t.chanceBps/100}% chance)`).join('; ')}.</p>)}<p>Minimum: {settings.tokenMinimum} whole token(s). Individual tokens can have different minimums or limits. A roll that cannot be funded is recorded as unavailable.</p><small>Verification signs an expired, zero-value transaction that is never broadcast. Claiming loot later uses an Algorand transaction; its fees and any asset opt-in are shown before signing. Walk over your drop to collect it. Opted-in wallets receive it automatically, with the game paying the fee. Otherwise it stays here for you to claim later. Loot may take a moment to appear.</small></details>
  {error&&<p className="playgroundError" role="alert">{error}</p>}
  {checked&&!rewards.length&&<p>No completed loot rolls yet.</p>}
  {rewards.map(r=><div className="arenaLootReward" key={`${r.hour}-${r.claim.slot}`}><NftImage src={r.claim.image} alt={r.claim.name||"Reward"} className="arenaLootImage"/><div><small>{new Date(r.hour*3600000).toLocaleString()}</small><strong>{r.claim.kind==='empty'?'Reward unavailable':`${r.claim.kind==='nft'?'NFT · ':lootAmount(r.claim.amount,r.claim.decimals)+' '}${r.claim.name}`}</strong>{r.deliveryStatus==='saved'&&<small>Saved reward · Opt in when claiming</small>}{['queued','pending'].includes(r.deliveryStatus)&&!r.claimed&&<small>Automatic delivery pending</small>}{r.claim.rewardAssetId>0&&<small>Asset #{r.claim.rewardAssetId}</small>}</div>{r.claim.kind==='empty'?<small>{r.claim.reason}</small>:r.claimed?<span>Claimed</span>:<button disabled={!!busy} onClick={()=>run(async()=>{const auth=await verify();setBusy('Preparing claim…');const d=await api('claim',{hour:r.hour,slot:r.claim.slot},auth);setClaimPreview({...d,hour:r.hour,name:r.claim.name});})}>Review claim</button>}</div>)}
  {cursor&&<button disabled={!!busy} onClick={()=>run(()=>load(true))}>More loot</button>}
  {claimPreview&&<div ref={claimView} className="arenaLootClaim" role="status"><strong>Claim {claimPreview.name}</strong><p>Network fee: {claimPreview.feeMicroAlgo/1e6} ALGO.{claimPreview.requiresOptIn?' Includes an asset opt-in, which increases your wallet’s required minimum balance by 0.1 ALGO.':''} No DARK is charged.</p><button disabled={!!busy} onClick={()=>run(claim)}>Sign & claim</button><button disabled={!!busy} onClick={()=>setClaimPreview(null)}>Cancel</button></div>}
 </section>;
}
