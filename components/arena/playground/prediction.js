import {movePlayer} from '../../../lib/arena/movement';
const copy=p=>({...p,motion:p.motion&&{...p.motion}});
export class MovementPrediction{
 constructor(){this.history=[];this.player=null;this.error={x:0,z:0};this.correction=0;}
 reconcile(p,received,latency=0){
  if(!p.motion)return;const before=this.player&&{x:this.player.x+this.error.x,z:this.player.z+this.error.z};
  const captured=received-Math.min(.3,latency);this.player=copy(p);this.time=p.time;this.history=this.history.filter(f=>f.at+f.dt>captured);
  for(const f of this.history){const dt=Math.max(0,Math.min(f.dt,f.at+f.dt-captured));movePlayer(this.player,f.input,dt,p.time+f.at+f.dt-captured,p.motion);}
  if(before){const dx=before.x-this.player.x,dz=before.z-this.player.z;this.correction=Math.hypot(dx,dz);this.error=this.correction<2?{x:dx,z:dz}:{x:0,z:0};}
 }
 step(input,dt,now,serverTime){
  if(!this.player)return null;
  // Predict no more than 300 ms without a fresh server acknowledgment.
  this.history.push({input:{...input},dt,at:now-dt});this.history=this.history.filter(f=>now-f.at<.35);
  movePlayer(this.player,input,dt,serverTime,this.player.motion);
  const decay=Math.exp(-dt*18);this.error.x*=decay;this.error.z*=decay;
  return {...this.player,x:this.player.x+this.error.x,z:this.player.z+this.error.z};
 }
}
export class RemoteInterpolation{
 constructor(){this.frames=[];}
 add(state){this.frames.push(state);if(this.frames.length>12)this.frames.shift();}
 sample(id,time){
  const frames=this.frames.filter(f=>f.players[id]);if(!frames.length)return null;
  let a=frames[0],b=frames.at(-1);for(const f of frames){if(f.time<=time)a=f;if(f.time>=time){b=f;break;}}
  const p=a.players[id],q=b.players[id];
  if(time>=b.time){const dt=Math.min(.1,Math.max(0,time-b.time));return {...q,x:q.x+q.vx*dt,z:q.z+q.vz*dt};}
  const t=Math.max(0,Math.min(1,(time-a.time)/Math.max(.001,b.time-a.time))),angle=Math.atan2(Math.sin(q.yaw-p.yaw),Math.cos(q.yaw-p.yaw));
  return {...p,x:p.x+(q.x-p.x)*t,z:p.z+(q.z-p.z)*t,yaw:p.yaw+angle*t};
 }
}
