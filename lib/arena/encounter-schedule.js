import {ROOM_ID} from './tickets';
import {RESPAWN_SECONDS,SPAWN_WARNING_SECONDS} from './encounter-timing';
export {RESPAWN_SECONDS,SPAWN_WARNING_SECONDS} from './encounter-timing';
export const scheduleRef=(db,appId,roomId=ROOM_ID)=>db.collection('arenaPrivate').doc(`monster-schedule-${appId}-${roomId}`);
export const notificationRef=(db,key)=>db.collection('arenaPrivate/notifications/events').doc(key);
export function queueNotice(tx,db,key,event){tx.set(notificationRef(db,key),{...event,status:'pending',createdAt:Date.now()});}
// A durable deadline, with live occupancy piggybacked on the worker lease.
// Empty arenas never spawn. Only the first admission can extend preparation;
// subsequent admissions cannot postpone a fight or its countdown.
export async function currentEncounter(db,appId,roomId=ROOM_ID,now=Date.now()/1000,options={}){
 return db.runTransaction(async tx=>{
  const ref=scheduleRef(db,appId,roomId),schedule=(await tx.get(ref)).data();
  const leaseRef=db.collection('arenaPrivate').doc(roomId+'-lease'),lease=(await tx.get(leaseRef)).data();
  if(options.owner&&(lease?.owner!==options.owner||lease.epoch!==options.epoch||lease.expiresAt<=now))throw Error('Room ownership expired');
  const present=options.owner?Math.max(0,options.playerCount||0):lease?.expiresAt>now?Math.max(0,lease.playerCount||0):0;
  let id=schedule?.encounterId;
  if(!id){const checkpoint=(await tx.get(db.collection('arenaPrivate').doc(roomId+'-checkpoint'))).data();id=checkpoint?.state?.encounter?.id||Math.floor(now/3600);}
  const oldRef=db.collection('arenaPrivate').doc(`loot-encounter-${appId}-${id}`),old=(await tx.get(oldRef)).data();
  if(old&&old.room!==roomId)throw Error('Encounter room mismatch');
  const warningRef=!present&&schedule?.warnedFor&&!['active','returning'].includes(old?.status)?notificationRef(db,`${appId}-${id}-warning-${Math.floor(schedule.warnedFor)}`):null;
  const pendingWarning=warningRef?(await tx.get(warningRef)).data():null;
  if(options.owner&&lease.playerCount!==present)tx.set(leaseRef,{...lease,playerCount:present});
  let value=old?{...old}:null;
  // An expired worker has no resumable champions. Finish abandoned encounters
  // instead of permanently locking the lobby after a crash or deployment.
  if(!options.owner&&!(lease?.expiresAt>now)&&['active','returning'].includes(value?.status)){
   const resolvedAt=value.status==='returning'?value.returnAt||now:now;
   if(now>=resolvedAt){value={...value,status:'withdrawn',resolvedAt,nextSpawnAt:resolvedAt+RESPAWN_SECONDS,endsAt:resolvedAt+RESPAWN_SECONDS,recipients:[],beast:null};
    queueNotice(tx,db,`${appId}-${id}-victory`,{kind:'victory',name:value.name,spawnAt:value.nextSpawnAt});}
  }
  // Starting a fresh occupied session must always leave a full two minutes.
  if(present&&options.firstArrival&&!['active','returning'].includes(old?.status)){
   const deadline=Math.max(now+SPAWN_WARNING_SECONDS,old?.nextSpawnAt||0,['defeated','withdrawn'].includes(old?.status)?(old.resolvedAt||old.defeatedAt||old.savedAt||now)+RESPAWN_SECONDS:0);
   value={...(old||{}),status:['defeated','withdrawn'].includes(old?.status)?old.status:'waiting',nextSpawnAt:deadline,endsAt:deadline,countdownStartedAt:now};
  }
  if(!value){
   const newId=Math.max(Math.floor(now),Number(id)+1);
   value={id:newId,startsAt:0,endsAt:0,nextSpawnAt:null,kind:'graveclaw',name:'Graveclaw',rewardType:'inventory_loot',room:roomId,status:'waiting',contributions:{},participants:{}};
   tx.create(db.collection('arenaPrivate').doc(`loot-encounter-${appId}-${newId}`),value);tx.set(ref,{encounterId:newId,warnedFor:null});return value;
  }
  if(!old){ // First occupied call without an existing schedule (operator/test bootstrap).
   value={...value,id,startsAt:0,kind:'graveclaw',name:'Graveclaw',rewardType:'inventory_loot',room:roomId,contributions:{},participants:{}};
  }
  if(['defeated','withdrawn'].includes(value.status)&&!value.nextSpawnAt){value.nextSpawnAt=(value.resolvedAt||value.defeatedAt||value.savedAt||now)+RESPAWN_SECONDS;value.endsAt=value.nextSpawnAt;}
  if(['active','returning'].includes(value.status)){
   if(!schedule)tx.set(ref,{encounterId:id,warnedFor:null});return value;
  }
  if(!present){
   // Cancel preparation, but preserve the hour earned by the previous encounter.
   const cooldown=['defeated','withdrawn'].includes(value.status)?(value.resolvedAt||value.defeatedAt||value.savedAt||now)+RESPAWN_SECONDS:0;
   value.nextSpawnAt=cooldown>now?cooldown:null;value.endsAt=value.nextSpawnAt||0;value.countdownStartedAt=null;
   if(JSON.stringify(value)!==JSON.stringify(old))tx.set(oldRef,value);
   if(!schedule||schedule.warnedFor!=null)tx.set(ref,{encounterId:id,warnedFor:null});
   if(pendingWarning?.status==='pending')tx.update(warningRef,{status:'expired',until:0,reason:'Arena emptied before spawn'});
   return value;
  }
  // Also recover an empty-room reset when an existing connection resumes.
  if(!value.nextSpawnAt){value.nextSpawnAt=now+SPAWN_WARNING_SECONDS;value.endsAt=value.nextSpawnAt;value.countdownStartedAt=now;}
  const next=value.nextSpawnAt;
  if(present&&next&&now>=next){
   const newId=Math.max(Math.floor(now),Number(id)+1);
   const spawned={id:newId,startsAt:now,endsAt:0,nextSpawnAt:null,kind:'graveclaw',name:'Graveclaw',rewardType:'inventory_loot',room:roomId,status:'active',contributions:{},participants:{}};
   tx.create(db.collection('arenaPrivate').doc(`loot-encounter-${appId}-${newId}`),spawned);tx.set(ref,{encounterId:newId,warnedFor:null});
   queueNotice(tx,db,`${appId}-${newId}-spawn`,{kind:'spawn',name:spawned.name});return spawned;
  }
  if(JSON.stringify(value)!==JSON.stringify(old))tx.set(oldRef,value);
  if(!schedule)tx.set(ref,{encounterId:id,warnedFor:null});
  if(present&&next&&now>=next-SPAWN_WARNING_SECONDS&&schedule?.warnedFor!==next){
   queueNotice(tx,db,`${appId}-${id}-warning-${Math.floor(next)}`,{kind:'warning',name:'Graveclaw',spawnAt:next,preparation:!!options.firstArrival});
   tx.set(ref,{encounterId:id,warnedFor:next});
  }
  return value;
 });
}
