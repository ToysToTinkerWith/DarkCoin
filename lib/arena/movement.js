import {sampleJump} from './jump';
// Shared deterministic movement only. Combat and collision authority stays server-side.
export const RADIUS=13.4;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function movePlayer(p,input,dt,now,m){
 p.y=sampleJump(p.jumpStart,now).height;
 const moving=Math.hypot(input.x,input.z)>.01,run=input.run&&moving&&p.stamina>1;
 const turn=Math.atan2(Math.sin(input.yaw-p.yaw),Math.cos(input.yaw-p.yaw));
 p.yaw+=clamp(turn,-dt*(p.action?3:12),dt*(p.action?3:12));
 let speed=(run?m.run:m.walk)*(1+m.speedPct/100);
 const forward=input.x*Math.sin(p.yaw)+input.z*Math.cos(p.yaw);
 if(forward<-.2)speed*=.8;else if(Math.abs(forward)<.7)speed*=.9;
 if(p.action)speed*=p.action.kind==='Cast'?.7:.75;
 speed*=1-m.slow/100;
 if(p.carry==='Hold'&&!p.action)speed*=1-m.guard/100;
 if(m.stunnedUntil>now)speed=0;
 p.vx=input.x*speed;p.vz=input.z*speed;p.running=run;
 p.x+=p.vx*dt;p.z+=p.vz*dt;
 if(m.push?.until>now){p.x+=m.push.x*dt;p.z+=m.push.z*dt;}
 const distance=Math.hypot(p.x,p.z);if(distance>RADIUS){p.x*=RADIUS/distance;p.z*=RADIUS/distance;}
 if(moving)p.stationarySince=now;
 if(run){p.stamina=Math.max(0,p.stamina-18*(1-m.sprintCost/100)*dt);p.lastSprint=now;}
 else if(now-p.lastSprint>=1)p.stamina=Math.min(m.maxStamina,p.stamina+22*(1+m.regen/100)*dt);
}
