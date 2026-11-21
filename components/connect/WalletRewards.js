import React,{useCallback,useEffect,useRef,useState} from 'react';
import {useWallet} from '@txnlab/use-wallet-react';
import algosdk from 'algosdk';
import {Buffer} from 'buffer';
import NftImage from '../NftImage';
import {groupWalletRewards,rewardKey,rewardAmount} from './wallet-rewards';

async function request(address,op,data={}){
 const r=await fetch('/api/arena/economy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({op,address,...data})}),d=await r.json();
 if(!r.ok)throw new Error(d.error||'Could not load rewards');return d;
}
export function useWalletRewards(open,onClaimed){
 const {activeAddress,activeWallet,activeNetwork,signTransactions}=useWallet();
 const identity=`${activeAddress||''}:${activeWallet?.id||''}:${activeNetwork||''}`;
 const current=useRef(identity);current.current=identity;
 const [state,setState]=useState({identity,rows:[],error:'',busy:'',review:null,loaded:false});
 const [settings,setSettings]=useState(null),confirmed=useRef(new Set()),loading=useRef(null),acting=useRef(null);
 const update=useCallback(patch=>{if(current.current===identity)setState(s=>({...s,...patch,identity}));},[identity]);
 const refresh=useCallback(async()=>{
  if(!activeAddress||loading.current===identity)return;
  loading.current=identity;
  try{
   const r=await fetch('/api/arena/economy'),config=await r.json();if(!r.ok)throw new Error(config.error||'Could not check rewards');
   if(current.current!==identity)return;setSettings(config);
   if(!config.enabled){update({rows:[],loaded:true,error:''});return;}
   let rows=[],cursor=null;
   do{
    const data=await request(activeAddress,'rewards',{cursor});
    if(current.current!==identity)return;
    rows.push(...data.rewards);cursor=data.cursor;
   }while(cursor);
   update({rows:rows.filter(r=>!confirmed.current.has(rewardKey(r))),loaded:true,error:''});
  }catch(e){update({error:e.message,loaded:true});}
  finally{if(loading.current===identity)loading.current=null;}
 },[activeAddress,identity,update]);
 useEffect(()=>{
  confirmed.current=new Set();setState({identity,rows:[],busy:'',error:'',review:null,loaded:false});setSettings(null);
  refresh();const timer=setInterval(()=>{if(document.visibilityState==='visible')refresh();},60000);
  const visible=()=>{if(document.visibilityState==='visible')refresh();};
  window.addEventListener('arena-rewards-changed',refresh);document.addEventListener('visibilitychange',visible);
  return()=>{clearInterval(timer);window.removeEventListener('arena-rewards-changed',refresh);document.removeEventListener('visibilitychange',visible);};
 },[identity,refresh]);
 useEffect(()=>{if(open)refresh();},[open,refresh]);
 const view=state.identity===identity?state:{rows:[],busy:'',error:'',review:null,loaded:false};
 const groups=groupWalletRewards(view.rows);
 async function action(fn){
  if(acting.current)return;acting.current=identity;update({error:''});
  try{await fn();}catch(e){update({error:e.message});}finally{if(acting.current===identity)acting.current=null;update({busy:''});}
 }
 function prepare(){return action(async()=>{
  update({busy:'Preparing rewards…',review:null});
  // Bound each wallet approval to four claims (at most twelve transactions).
  const rows=groups.flatMap(g=>g.rewards).slice(0,4),claims=[];
  for(const row of rows){
   const d=await request(activeAddress,'claim',{hour:row.hour,slot:row.claim.slot});
   if(current.current!==identity)return;claims.push({...d,row});
  }
  update({review:claims.length?claims:null});
 });}
 function claim(){return action(async()=>{
  const claims=view.review;if(!claims?.length)return;
  update({busy:'Approve your claim in your wallet…'});
  const transactions=claims.flatMap(c=>c.transactions.map(s=>new Uint8Array(Buffer.from(s,'base64'))));
  const signed=transactions.length?await signTransactions(transactions):[];
  if(current.current!==identity)throw new Error('Wallet changed. Claim not submitted.');
  if(!signed||signed.length!==transactions.length||signed.some(s=>!s))throw new Error('Claim cancelled.');
  const client=new algosdk.Algodv2('',settings.algodUrl,new URL(settings.algodUrl).port);
  let offset=0,completed=0;
  try{
   for(const c of claims){
    if(current.current!==identity)throw new Error('Wallet changed. Remaining claims were not submitted.');
    update({busy:`Confirming reward ${completed+1} of ${claims.length}…`});
    const group=signed.slice(offset,offset+c.transactions.length);offset+=c.transactions.length;
    if(group.length){const {txid}=await client.sendRawTransaction(group).do();await algosdk.waitForConfirmation(client,txid,8);}
    if(c.deliveryMode==='direct'){await request(activeAddress,'deliver',{hour:c.row.hour,slot:c.row.claim.slot});completed++;continue;}
    if(current.current!==identity)return;
    confirmed.current.add(rewardKey(c.row));completed++;
    setState(s=>({...s,rows:s.rows.filter(r=>!confirmed.current.has(rewardKey(r)))}));
   }
  }finally{
   update({review:null});
   if(current.current===identity){await refresh();if(completed)await onClaimed?.(activeAddress,true);}
  }
 });}
 return {...view,groups,count:groups.length,refresh,prepare,claim,cancel:()=>update({review:null}),enabled:settings?.enabled};
}
export default function WalletRewards({rewards:r}){
 if(r.enabled===false||!r.count)return null;
 const total=r.groups.reduce((n,g)=>n+g.rewards.length,0);
 const fees=r.review?.reduce((n,c)=>n+c.feeMicroAlgo,0)||0;
 const optIns=new Set((r.review||[]).filter(c=>c.requiresOptIn).map(c=>c.row.claim.rewardAssetId)).size;
 return <section className="walletRewards" aria-label="Arena rewards">
  <header><div><small>ARENA REWARDS</small><strong>{`${r.count} asset${r.count===1?'':'s'} to claim`}</strong></div><button disabled={!!r.busy} aria-label="Refresh arena rewards" onClick={r.refresh}>↻</button></header>
  {r.groups.map(g=><div className="rewardRow" key={g.rewardAssetId}><NftImage style={{width:38,height:38,objectFit:'contain',borderRadius:6,flexShrink:0}} src={g.image} alt={g.name||'Reward'}/><div><strong>{g.name||`Asset ${g.rewardAssetId}`}</strong><small>ASA #{g.rewardAssetId}</small></div><b>{rewardAmount(g.amount,g.decimals)}</b></div>)}
  {!!r.count&&!r.review&&<button className="claimRewards" disabled={!!r.busy} onClick={r.prepare}>{total>4?'Claim next 4 rewards':'Claim rewards'}</button>}
  {r.review&&<div className="claimReview"><strong>Review {r.review.length} reward claim{r.review.length===1?'':'s'}</strong><p>Network fees: {fees/1e6} ALGO.{optIns>0?` Includes ${optIns} asset opt-in${optIns===1?'':'s'}, requiring ${optIns/10} ALGO more minimum wallet balance.`:''}</p><button className="claimRewards" disabled={!!r.busy} onClick={r.claim}>Approve & claim</button><button disabled={!!r.busy} onClick={r.cancel}>Cancel</button></div>}
  {r.busy&&<p role="status">{r.busy}</p>}{r.error&&<p role="alert">{r.error}</p>}
  <style jsx>{`
   .walletRewards{padding:16px;margin-bottom:16px;border:1px solid #88744b;border-radius:12px;background:linear-gradient(135deg,#26221b,#121515);color:#f4ead4;font-family:Georgia,serif}
   header{display:flex;justify-content:space-between;align-items:center;gap:12px}header div{display:grid;gap:5px}small{font-size:10px;color:#c7b58e;letter-spacing:.1em}header strong{font-size:17px;font-weight:normal}
   button{cursor:pointer;border:1px solid #8a754c;border-radius:6px;padding:8px 12px;color:#f5e6c6;background:#29281f;font:inherit}button:disabled{opacity:.5;cursor:wait}
   .rewardRow{display:flex;align-items:center;gap:10px;padding:12px 0;border-bottom:1px solid #ffffff16}.rewardRow :global(img){width:38px;height:38px;object-fit:contain;border-radius:6px}.rewardRow div{flex:1;min-width:0;display:grid;gap:5px}.rewardRow strong{overflow-wrap:anywhere;font-size:13px}.rewardRow b{max-width:45%;overflow-wrap:anywhere;font-size:13px}
   .claimRewards{width:100%;margin:12px 0 0;background:#c8ac71;color:#151711;font-weight:bold}.claimReview{margin-top:12px}.claimReview p,p[role]{font-size:12px;line-height:1.5}p[role=alert]{color:#ffaaaa}.claimReview button+button{margin-top:8px}
  `}</style>
 </section>;
}
