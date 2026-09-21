import {performance} from 'node:perf_hooks';
import crypto from 'node:crypto';
import {ROOM_ID} from './tickets';
const clean=x=>JSON.parse(JSON.stringify(x));
const serverSeconds=doc=>doc.readTime.toMillis()/1000;
export class FirestoreRoomStore{
 constructor(db,{roomId=ROOM_ID,owner=crypto.randomUUID(),clock=()=>performance.now()}={}){
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
   tx.set(this.lease,{owner:this.owner,epoch,expiresAt:now+20});return epoch;
  });
  if(!epoch)return false;this.writes++;this.epoch=epoch;this.deadline=started+15000;return this.valid();
 }
 async renew(){
  if(!this.valid())return false;const started=this.clock(),previousDeadline=this.deadline,epoch=this.epoch;
  const ok=await this.db.runTransaction(async tx=>{
   const [doc,control]=await Promise.all([tx.get(this.lease),tx.get(this.control)]),old=doc.data(),now=serverSeconds(doc),config=control.data();
   if(config?.drain||config?.mode==='rest'||old?.owner!==this.owner||old.epoch!==this.epoch||old.expiresAt<=now)return false;
   tx.set(this.lease,{...old,expiresAt:now+20});return true;
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
 async claim(c,playerId){
  const ref=this.collection.doc('ticket-'+c.nonce);
  await this.fenced(async tx=>{
   if((await tx.get(ref)).exists)throw new Error('Admission ticket already used. Select your champion again.');
   tx.create(ref,{epoch:this.epoch,room:this.roomId,playerId,expiresAt:c.exp,deleteAt:new Date((c.exp+86400)*1000)});
  });this.writes++;
 }
 async checkpoint(state,reason='periodic'){
  await this.fenced(tx=>tx.set(this.checkpointRef,{epoch:this.epoch,owner:this.owner,reason,state:clean(state),updatedAt:Date.now()/1000,deleteAt:new Date(Date.now()+86400000)}));this.writes++;
 }
 async results(events){
  if(!events.length)return;
  await this.fenced(tx=>{for(const e of events)tx.set(this.collection.doc(`${this.roomId}-result-${this.epoch}-${e.id}`),{...clean(e),epoch:this.epoch,deleteAt:new Date(Date.now()+7*86400000)});});this.writes+=events.length;
 }
 async release(){
  if(!this.epoch)return;
  try{await this.db.runTransaction(async tx=>{const doc=await tx.get(this.lease),old=doc.data();if(old?.owner===this.owner&&old.epoch===this.epoch){tx.set(this.lease,{...old,expiresAt:0});this.writes++;}});}finally{this.deadline=0;}
 }
}
