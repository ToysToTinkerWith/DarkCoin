import crypto from 'crypto';
import {createRoom,addPlayer,removePlayer,advance,command,snapshot} from './simulation';
import {hash} from './walletProof';

const COLLECTION='arenaPrivate',ROOM='room-public-v3';
function fail(message,status=400){const error=new Error(message);error.status=status;throw error;}
function clean(value){return JSON.parse(JSON.stringify(value));}
// Signature-free practice admission. The API checks public NFT holdings; this
// intentionally does not authenticate control of that wallet or grant rewards.
export async function joinPracticeArena(db,address,champion,token,now=Date.now()/1000,roomId=ROOM){
 const roomRef=db.collection(COLLECTION).doc(roomId),id=crypto.randomUUID();
 const sessionRef=db.collection(COLLECTION).doc('session-'+hash(token));
 const admissionRef=db.collection(COLLECTION).doc('admission-'+hash(roomId+address));
 return db.runTransaction(async tx=>{
  const [roomDoc,admissionDoc]=await Promise.all([tx.get(roomRef),tx.get(admissionRef)]);
  if(now-(admissionDoc.data()?.createdAt??-Infinity)<5)fail('Please wait a moment before entering again.',429);
  const room=roomDoc.exists?roomDoc.data().state:createRoom(now,crypto.randomBytes(4).readUInt32LE());advance(room,now);
  if(Object.values(room.players).some(p=>p.walletHash===hash(address)))fail('This wallet already has a champion in the arena.',409);
  const player=addPlayer(room,id,champion);player.walletHash=hash(address);
  tx.set(sessionRef,{playerId:id,address,assetId:champion.id,expiresAt:now+3600,deleteAt:new Date((now+3600)*1000)});
  tx.set(admissionRef,{createdAt:now,deleteAt:new Date((now+60)*1000)});
  tx.set(roomRef,{state:clean(room),updatedAt:now,deleteAt:new Date((now+86400)*1000)});
  return {playerId:id,token,expiresAt:now+3600,state:snapshot(room)};
 });
}
export async function arenaCommand(db,token,input,now=Date.now()/1000,roomId=ROOM){
 if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))fail('Sign in with your champion first.',401);
 const roomRef=db.collection(COLLECTION).doc(roomId),sessionRef=db.collection(COLLECTION).doc('session-'+hash(token));
 return db.runTransaction(async tx=>{
  const [roomDoc,sessionDoc]=await Promise.all([tx.get(roomRef),tx.get(sessionRef)]),session=sessionDoc.data();
  if(!session||session.expiresAt<now)fail('Your arena session expired. Select your champion again.',401);
  if(!roomDoc.exists)fail('This arena has restarted. Please enter again.',410);
  const room=roomDoc.data().state;
  if(input.leave){advance(room,now);removePlayer(room,session.playerId);tx.delete(sessionRef);}
  else{
   const p=room.players[session.playerId];
   if(p&&now-p.lastSeen<.08&&input.seq>p.lastSeq)return {state:snapshot(room),throttled:true};
   const result=command(room,session.playerId,input,now);
   tx.set(roomRef,{state:clean(room),updatedAt:now,deleteAt:new Date((now+86400)*1000)});return {...result,state:snapshot(room)};
  }
  tx.set(roomRef,{state:clean(room),updatedAt:now,deleteAt:new Date((now+86400)*1000)});return {state:snapshot(room)};
 });
}
