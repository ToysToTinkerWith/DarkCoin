import {currentEncounter,queueNotice} from './encounter-schedule';
import {performance} from 'node:perf_hooks';
import crypto from 'node:crypto';
import {ROOM_ID} from './tickets';
import {canPickUp} from './loot-drops';
const clean=x=>JSON.parse(JSON.stringify(x));
const serverSeconds=doc=>doc.readTime.toMillis()/1000;
export class FirestoreRoomStore{
 constructor(db,{roomId=ROOM_ID,owner=crypto.randomUUID(),clock=()=>performance.now(),economy=null}={}){
  this.economy=economy;
  this.db=db;this.owner=owner;this.clock=clock;this.deadline=0;this.epoch=0;this.writes=0;
  this.collection=db.collection('arenaPrivate');this.lease=this.collection.doc(roomId+'-lease');this.control=this.collection.doc(roomId+'-control');this.checkpointRef=this.collection.doc(roomId+'-checkpoint');this.roomId=roomId;
 }
 valid(){return this.epoch>0&&this.clock()<this.deadline;}
 async acquire(){
  const started=this.clock();
  const epoch=await this.db.runTransaction(async tx=>{
   const [doc,control]=await Promise.all([tx.get(this.lease),tx.get(this.control)]),old=doc.data(),now=serverSeconds(doc),config=control.data();
   if(config?.drain||config?.mode==='rest'||old?.expiresAt>now&&old.owner!==this.owner)return 0;
   const epoch=(old?.epoch||0)+1;
   tx.set(this.lease,{owner:this.owner,epoch,expiresAt:now+20,playerCount:0});return epoch;
  });
  if(!epoch)return false;this.writes++;this.epoch=epoch;this.deadline=started+15000;return this.valid();
 }
 async renew(playerCount=0){
  if(!this.valid())return false;const started=this.clock(),previousDeadline=this.deadline,epoch=this.epoch;
  const ok=await this.db.runTransaction(async tx=>{
   const [doc,control]=await Promise.all([tx.get(this.lease),tx.get(this.control)]),old=doc.data(),now=serverSeconds(doc),config=control.data();
   if(config?.drain||config?.mode==='rest'||old?.owner!==this.owner||old.epoch!==this.epoch||old.expiresAt<=now)return false;
   tx.set(this.lease,{...old,expiresAt:now+20,playerCount});return true;
  });
  if(!ok||this.epoch!==epoch||this.clock()>=previousDeadline){this.deadline=0;return false;}this.writes++;this.deadline=started+15000;return this.valid();
 }
 async fenced(write){
  if(!this.valid())throw new Error('Room ownership expired');
  const epoch=this.epoch;
  return this.db.runTransaction(async tx=>{
   const doc=await tx.get(this.lease),lease=doc.data();
   if(!this.valid()||this.epoch!==epoch||lease?.owner!==this.owner||lease.epoch!==epoch||lease.expiresAt<=serverSeconds(doc))throw new Error('Room ownership expired');
   return write(tx);
  });
 }
 async claim(c,playerId,hour=null){
  const ref=this.collection.doc('ticket-'+c.nonce);
  await this.fenced(async tx=>{
   if((await tx.get(ref)).exists)throw new Error('Admission ticket already used. Select your champion again.');
   if(this.economy?.enabled){
    if(!Number.isSafeInteger(hour))throw new Error('Hourly admission is required');
    const eventRef=this.encounterRef(hour),event=(await tx.get(eventRef)).data();
    if(!event||event.room!==this.roomId)throw new Error('Encounter is unavailable');
    if(['active','returning'].includes(event.status))throw new Error('Graveclaw is fighting. Entry reopens after he is defeated or returns to his grave.');
    const participants={...event.participants};
    participants[c.address+':'+c.champion.id]=c.champion.id;tx.update(eventRef,{participants});
   }
   tx.create(ref,{epoch:this.epoch,room:this.roomId,playerId,expiresAt:c.exp,deleteAt:new Date((c.exp+86400)*1000)});
  });this.writes++;
 }
 async checkpoint(state,reason='periodic'){
  await this.fenced(async tx=>{
   if(this.economy?.enabled&&state.encounter){
    const e=state.encounter,ref=this.encounterRef(e.id),doc=await tx.get(ref),previous=doc.data();
    if(previous?.room!==this.roomId)throw new Error('Encounter room mismatch');
    if(['active','returning'].includes(previous.status)&&['active','defeated','returning','withdrawn'].includes(e.status)&&!(previous.status==='returning'&&e.status==='active')){
     const defeated=e.status==='defeated',recipients=e.recipients||[];
     tx.set(ref,{...previous,...clean(e),participants:{...e.participants,...previous.participants},room:this.roomId,beast:clean(state.beast),savedAt:state.time,...(defeated?{recipients,lootVersion:2,publishStatus:recipients.length?'pending':'empty',lootQueue:recipients.length?`pending-${this.economy.appId}`:null}:{})});
     if(e.status==='withdrawn'&&previous.status!=='withdrawn')queueNotice(tx,this.db,`${this.economy.appId}-${e.id}-victory`,{kind:'victory',name:e.name,spawnAt:e.nextSpawnAt});
     if(defeated)queueNotice(tx,this.db,`${this.economy.appId}-${e.id}-defeat`,{kind:'defeat',name:e.name,champions:recipients.length,spawnAt:e.nextSpawnAt});
     if(defeated&&recipients.length)tx.set(this.db.collection('arenaPrivate/loot-jobs/jobs').doc(`publish-${this.economy.appId}-${e.id}`),{kind:'publish',appId:this.economy.appId,hour:e.id,createdAt:Date.now()});
    }
   }
   tx.set(this.checkpointRef,{epoch:this.epoch,owner:this.owner,reason,state:clean(state),updatedAt:Date.now()/1000,deleteAt:new Date(Date.now()+86400000)});
  });this.writes++;
 }
 encounterRef(id){return this.collection.doc(`loot-encounter-${this.economy.appId}-${id}`);}
 watchLootDrops(hour,onRows,onError){
  return this.collection.where('dropEncounter','==',`${this.economy.appId}-${hour}`).limit(8).onSnapshot(docs=>onRows(docs.docs.map(doc=>({id:doc.id,...doc.data()}))),onError);
 }
 async lootDrops(hour){
  const docs=await this.collection.where('dropEncounter','==',`${this.economy.appId}-${hour}`).limit(8).get();
  return docs.docs.map(doc=>({id:doc.id,...doc.data()}));
 }
 async pickup(id,player,hour){
  if(!/^loot-reward-\d+-\d+-[0-7]$/.test(id))throw new Error('Invalid drop');
  return this.fenced(async tx=>{
   const ref=this.collection.doc(id),row=(await tx.get(ref)).data();
   if(!row||row.appId!==this.economy.appId||row.lootVersion!==2||!canPickUp(player,row,hour))throw new Error('Walk closer to your own reward to pick it up.');
   tx.update(ref,{pickedUpAt:Date.now(),deliveryStatus:'queued',deliveryQueue:`pickup-${this.economy.appId}`});
   tx.set(this.db.collection('arenaPrivate/loot-jobs/jobs').doc(id),{kind:'pickup',appId:this.economy.appId,rewardId:id,createdAt:Date.now()});
   this.writes++;return {id,status:'queued'};
  });
 }
 async currentEncounter(now,options={}){if(!this.valid())throw Error('Room ownership expired');return currentEncounter(this.db,this.economy.appId,this.roomId,now,{...options,owner:this.owner,epoch:this.epoch});}
 async encounter(hour){
  return this.fenced(async tx=>{const ref=this.encounterRef(hour.id),doc=await tx.get(ref),old=doc.data();
   if(old){
    if(old.room!==this.roomId)throw new Error('Reward encounters require the canonical arena room');
    // Switch an unfinished featured encounter to the current playtest monster.
    // Never modify a defeat or an allocated reward when changing modes.
    if(old.status==='active'&&!old.draw&&old.kind!==hour.kind){const value={...old,kind:hour.kind,name:hour.name,beast:null};tx.set(ref,value);return value;}
    return old;
   }
   const value={...hour,room:this.roomId,status:'active',contributions:{},participants:{}};tx.create(ref,value);return value;
  });
 }
 async results(events){
  if(!events.length)return;
  await this.fenced(tx=>{for(const e of events)tx.set(this.collection.doc(`${this.roomId}-result-${this.epoch}-${e.id}`),{...clean(e),epoch:this.epoch,deleteAt:new Date(Date.now()+7*86400000)});});this.writes+=events.length;
 }
 async release(){
  if(!this.epoch)return;
  try{await this.db.runTransaction(async tx=>{const doc=await tx.get(this.lease),old=doc.data();if(old?.owner===this.owner&&old.epoch===this.epoch){tx.set(this.lease,{...old,expiresAt:0,playerCount:0});this.writes++;}});}finally{this.deadline=0;}
 }
}
