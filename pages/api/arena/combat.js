import {validateBaselineSpell} from '../../../components/contracts/Arena/baselineSpells';
import algosdk from 'algosdk';
import crypto from 'crypto';
import {arenaDatabase} from '../../../lib/arena/firebaseServer';
import {joinPracticeArena,arenaCommand} from '../../../lib/arena/service';
import championHandler from './playground';
import {PLAYGROUND_JOIN_ENABLED,PLAYGROUND_PAUSED_MESSAGE} from '../../../lib/arena/availability';
import {issueTicket} from '../../../lib/arena/tickets';

export const config={api:{bodyParser:{sizeLimit:'20kb'}}};
const attempts=new Map();
async function verifiedChampion(assetId,address){
 let status=200,result;
 await championHandler({method:'GET',query:{assetId,address}},{setHeader(){},status(n){status=n;return this;},json(value){result=value;return this;}});
 if(status!==200){const e=new Error(result?.error||'Could not verify this champion.');e.status=status;throw e;}
 return result;
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Use POST.'});}
 try{
  const body=req.body||{},op=body.op,now=Date.now()/1000;
  if(op==='join'&&!PLAYGROUND_JOIN_ENABLED)return res.status(503).json({code:'PLAYGROUND_PAUSED',error:PLAYGROUND_PAUSED_MESSAGE});
  if(op==='join'){
   const address=String(body.address||''),assetId=Number(body.assetId);
   if(!algosdk.isValidAddress(address)||!Number.isSafeInteger(assetId)||assetId<1)return res.status(400).json({error:'Choose a champion from your connected wallet.'});
   const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0];
   if(now-(attempts.get(ip)||0)<3)return res.status(429).json({error:'Please wait a moment before entering again.'});
   if(attempts.size>2000)attempts.clear();attempts.set(ip,now);
   // Re-read ownership and equipment on entry. Never accept client stats/loadout.
   // Practice only: a public address is not cryptographic wallet authentication.
   const baselineSpell=validateBaselineSpell(body.baselineSpell);
   const champion=await verifiedChampion(assetId,address);
   champion.baselineSpell=baselineSpell;
   if(process.env.ARENA_TRANSPORT==='websocket'){
    const url=process.env.ARENA_WS_URL;
    if(!url||!url.startsWith('wss://'))return res.status(503).json({error:'The arena connection is not configured yet.'});
    return res.json({champion,session:{transport:'websocket',url,ticket:issueTicket(champion,address,process.env.ARENA_TICKET_SECRET,now,process.env.ARENA_ROOM_ID),expiresAt:now+60}});
   }
   const db=arenaDatabase();
   const session=await joinPracticeArena(db,address,champion,crypto.randomBytes(32).toString('hex'));
   return res.json({champion,session});
  }
  if(op==='input'||op==='leave'){
   if(process.env.ARENA_TRANSPORT==='websocket')return res.status(410).json({error:'The arena connection has changed. Select your champion again.'});
   const db=arenaDatabase();
   const token=String(req.headers.authorization||'').replace(/^Bearer /,'');
   return res.json(await arenaCommand(db,token,{...body.input,leave:op==='leave'}));
  }
  return res.status(400).json({error:'Unknown arena request.'});
 }catch(e){
  const infrastructure=/credential|permission|UNAVAILABLE|DEADLINE|ECONN|metadata|ENOTFOUND/i.test(e.message||'');
  if(infrastructure)console.error('Arena authority unavailable:',e.code||e.name);
  return res.status(e.status||(infrastructure?503:400)).json({error:infrastructure?'The arena server is unavailable. Please try again shortly.':e.message});
 }
}
