// Versioned, acknowledged deltas. A snapshot is never based on unacknowledged data.
export const WIRE_VERSION=1;
const fields=['x','z','yaw','vx','vz','running','hp','stamina','barrier','carry','cooldownUntil','statuses','action','motion','lastSprint','baselineCooldownUntil','buffs','jumpStart','magicCooldownStart','baselineCooldownStart'];
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const q=(v,n=100)=>Math.round(v*n)/n;
export function encodeState(s){
 return {dummy:s.dummy||null,time:s.time,players:Object.fromEntries(Object.values(s.players).map(p=>[p.id,{info:[p.champion,p.maxHealth,p.maxStamina],values:fields.map(k=>['x','z','vx','vz','hp','stamina','barrier'].includes(k)?q(p[k]):k==='yaw'?q(p[k],1000):p[k])}])),
  projectiles:Object.fromEntries(s.projectiles.map(p=>[p.id,{...p,x:q(p.x),y:q(p.y),z:q(p.z),distance:q(p.distance)}])),fields:Object.fromEntries(s.fields.map(f=>[f.id,f]))};
}
function changedMap(next,old={}){const changed={},removed=[];for(const [id,value] of Object.entries(next))if(!same(value,old[id]))changed[id]=value;for(const id of Object.keys(old))if(!next[id])removed.push(id);return [changed,removed];}
export function makePacket(next,base,seq,baseSeq,events,ackInput){
 const joined={},patches={},removed=[];
 for(const [id,p] of Object.entries(next.players)){
  const previous=base?.players[id];if(!previous){joined[id]=p;continue;}
  const changes=[];p.values.forEach((v,i)=>{if(!same(v,previous.values[i]))changes.push(i,v);});if(changes.length)patches[id]=changes;
 }
 for(const id of Object.keys(base?.players||{}))if(!next.players[id])removed.push(id);
 return {type:'state',v:WIRE_VERSION,n:seq,b:base?baseSeq:0,t:next.time,j:joined,p:patches,r:removed,
  ...(same(next.dummy,base?.dummy)?{}:{dummy:next.dummy}),shots:changedMap(next.projectiles,base?.projectiles),zones:changedMap(next.fields,base?.fields),events,ack:ackInput};
}
function applyMap(base,[changes,removed]){const next={...base,...changes};for(const id of removed)delete next[id];return next;}
export function applyPacket(packet,base){
 if(packet.v!==WIRE_VERSION||packet.b&&!base)throw new Error('State baseline unavailable');
 const players={...(base?.players||{}),...packet.j};
 for(const id of packet.r)delete players[id];
 for(const [id,patch] of Object.entries(packet.p)){if(!players[id])throw new Error('Missing entity');const p=players[id],values=[...p.values];for(let i=0;i<patch.length;i+=2)values[patch[i]]=patch[i+1];players[id]={...p,values};}
 return {dummy:Object.prototype.hasOwnProperty.call(packet,'dummy')?packet.dummy:base?.dummy,time:packet.t,players,projectiles:applyMap(base?.projectiles||{},packet.shots),fields:applyMap(base?.fields||{},packet.zones)};
}
export function decodeState(s,events=[]){return {dummy:s.dummy||null,version:3,capacity:8,time:s.time,players:Object.fromEntries(Object.entries(s.players).map(([id,p])=>[id,{id,champion:p.info[0],maxHealth:p.info[1],maxStamina:p.info[2],...Object.fromEntries(fields.map((k,i)=>[k,p.values[i]]))}])),projectiles:Object.values(s.projectiles),fields:Object.values(s.fields),events};}
export class DeltaSender{
 constructor(){this.serial=0;this.ack=0;this.eventAck=0;this.history=new Map();}
 acknowledge(n){const entry=this.history.get(n);if(!entry||n<=this.ack)return;this.ack=n;this.eventAck=entry.eventCursor;}
 reset(){this.ack=0;}
 packet(state,ackInput){
  const encoded=encodeState(state),base=this.history.get(this.ack),n=++this.serial;
  const events=state.events.filter(e=>e.id>this.eventAck),eventCursor=Math.max(this.eventAck,...events.map(e=>e.id));
  const packet=makePacket(encoded,base?.state,n,this.ack,events,ackInput);
  this.history.set(n,{state:encoded,eventCursor});while(this.history.size>32)this.history.delete(this.history.keys().next().value);
  return packet;
 }
}
