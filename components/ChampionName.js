import React,{useEffect,useRef,useState} from 'react';
import {useWallet} from '@txnlab/use-wallet-react';
import {Buffer} from 'buffer';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
const cache=new Map(),versions=new Map(),waiting=new Set(),listeners=new Set();let timer;
function notify(){listeners.forEach(fn=>fn());}
const nameKey=(id,game='3d')=>game+':'+id;
function queue(id,game='3d'){const key=nameKey(id,game);if(cache.has(key)||waiting.has(key)||!Number.isSafeInteger(id)||id<1)return;waiting.add(key);clearTimeout(timer);timer=setTimeout(async()=>{const keys=[...waiting];waiting.clear();await Promise.all(['2d','3d'].map(async scope=>{const selected=keys.filter(key=>key.startsWith(scope+':'));for(let offset=0;offset<selected.length;offset+=100){const batch=selected.slice(offset,offset+100),requested=new Map(batch.map(key=>[key,versions.get(key)||0]));try{const r=await fetch('/api/arena/champion-name?game='+scope+'&ids='+batch.map(key=>key.split(':')[1]).join(','));if(!r.ok)throw Error();const data=await r.json();batch.forEach(key=>{if((versions.get(key)||0)===requested.get(key))cache.set(key,data.names?.[key.split(':')[1]]||null);});notify();}catch{}}}));},25);}

export function refreshChampionName(id,name,game='3d'){const key=nameKey(id,game);versions.set(key,(versions.get(key)||0)+1);cache.set(key,name||null);notify();}
export function useChampionName(id,fallback,game='3d'){const [,refresh]=useState(0);id=Number(id);useEffect(()=>{const fn=()=>refresh(n=>n+1);listeners.add(fn);queue(id,game);return()=>listeners.delete(fn);},[id,game]);return cache.get(nameKey(id,game))||fallback||(id>0?`Champion #${id}`:null);}
export default function ChampionName({id,fallback}){return <>{useChampionName(id,fallback)}</>;}
export function ChampionNameEditor({id,fallback,game='3d',compact=false}){
 const {activeAddress,signTransactions}=useWallet(),name=useChampionName(id,fallback,game),[editing,setEditing]=useState(false),[draft,setDraft]=useState(name),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const gameLabel=game==='2d'?'Chronicles (2D)':'Arena (3D)';
 const identity=useRef();identity.current=activeAddress+':'+id+':'+game;
 useEffect(()=>{setEditing(false);setError('');setBusy(false);},[activeAddress,id,game]);
 async function request(body){const r=await fetch('/api/arena/champion-name',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw Error(data.error||'Could not save name.');return data;}
 async function save(e){e.preventDefault();const key=identity.current;setBusy(true);setError('');try{
  const challenge=await request({op:'challenge',game,address:activeAddress,assetId:Number(id),name:draft});if(identity.current!==key)return;
  const signed=await signTransactions([new Uint8Array(Buffer.from(challenge.unsigned,'base64'))]);if(identity.current!==key)return;if(!signed?.[0])throw Error('Name change cancelled.');
  const result=await request({op:'save',nonce:challenge.nonce,signed:Buffer.from(signed[0]).toString('base64')});const cacheKey=nameKey(id,game);versions.set(cacheKey,(versions.get(cacheKey)||0)+1);cache.set(cacheKey,result.name);notify();window.dispatchEvent(new CustomEvent('champion-name-changed',{detail:{...result,game}}));if(identity.current===key)setEditing(false);
 }catch(e){if(identity.current===key)setError(e.message||'Name change cancelled.');}finally{if(identity.current===key)setBusy(false);}}
 return <section className="championNameEditor" aria-label={gameLabel+' name'}><div><h2 data-champion-name>{name}</h2>{activeAddress&&!editing&&<button type="button" className={compact?'armouryIconButton':undefined} aria-label="Edit name" title="Edit name" onClick={()=>{setDraft(name);setError('');setEditing(true);}}>{compact?<EditOutlinedIcon/>:'Edit name'}</button>}</div>{editing&&<form onSubmit={save}><label htmlFor={'champion-name-'+id}>{gameLabel} name</label><input id={'champion-name-'+id} autoFocus value={draft} maxLength={game==='2d'?32:48} onChange={e=>setDraft(e.target.value)} disabled={busy}/><small>2–{game==='2d'?32:48} characters. Used in {gameLabel}; your other game name stays separate. Confirm ownership with a wallet signature; no transaction is submitted and no funds move.</small><div><button disabled={busy||!draft.trim()}>{busy?'Confirm in wallet…':'Save name'}</button><button type="button" disabled={busy} onClick={()=>setEditing(false)}>Cancel</button></div></form>}{error&&<p role="alert">{error}</p>}</section>;
}
