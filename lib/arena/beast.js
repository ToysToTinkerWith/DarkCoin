// Shared metres/seconds animation contract. Server claw collisions and the rig
// use these same joint positions; damage never comes from a cosmetic effect.
export const GRAVECLAW={id:'graveclaw',name:'Graveclaw',maxHealth:320,maxStamina:100,maxMana:100,manaRegen:1.2,
 resistances:{slashing:28,piercing:18,blunt:12,fire:5,frost:20,lightning:20,water:20,poison:20,shadow:20,arcane:20},tenacityPct:15,
 heal:{name:'Grave Renewal',manaCost:35,castSeconds:1.8,cooldownSeconds:24,releasePhase:.65,healRoll:'4d8+12',healthThreshold:.55},
 enrage:{name:'Grave Fury',manaCost:45,castSeconds:2,cooldownSeconds:30,releasePhase:.65,durationSeconds:10,moveMultiplier:1.25,staminaBonus:40,regenMultiplier:1.5},
 walkMps:1.2,runMps:2.7,aggroM:6.5,loseTargetM:10,attackDistanceM:1.75,
 attackSeconds:1.65,attackStamina:24,runDrain:13,regen:19,respawnSeconds:10,
 radius:.48,attack:{attackKind:'melee',powerSource:'weapon',damageType:'slashing',
 damageRolls:['3d6+9','3d6+9'],onHit:[{id:'bleed',chance:.3,potency:1}],
 reachM:2.05,hitRadiusM:.12},
 windows:[{side:-1,start:.28,end:.44},{side:1,start:.54,end:.70}],
 clips:{Idle:2.4,Walk:1.1,Run:.68,Claw:1.65,Heal:1.8,Enrage:2,Death:1.1}};
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t),clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const ease=t=>{t=clamp(t);return t*t*(3-2*t);};
function path(keys,t){for(let i=1;i<keys.length;i++)if(t<=keys[i][0])return mix(keys[i-1][1],keys[i][1],ease((t-keys[i-1][0])/(keys[i][0]-keys[i-1][0])));return keys.at(-1)[1];}
export function beastPose(clip,phase){
 const t=clamp(phase),cycle=t*Math.PI*2,run=clip==='Run',moving=clip==='Walk'||run;
 const bob=moving?Math.cos(cycle*2)*(run?.024:.012):Math.sin(cycle)*.009;
 const death=clip==='Death'?ease(t):0,attack=clip==='Claw';
 const yaw=attack?path([[0,[0]],[.18,[-.20]],[.44,[.28]],[.54,[.20]],[.70,[-.28]],[1,[0]]],t)[0]:moving?Math.sin(cycle)*.035:0;
 const hips=[0,.99+bob-(run?.035:0)-death*.62,0];
 const hipR=[death*.15,yaw*.3,death*.4],chestR=[.14+(run?.055:0)+death*.52,yaw,death*.45];
 const plus=(a,b)=>a.map((n,i)=>n+b[i]);
 const chest=plus(hips,rotateXYZ([0,.64,.09],hipR));
 const pose={hips:{p:hips,r:hipR},chest:{p:chest,r:chestR},head:{p:plus(chest,rotateXYZ([0,.32,.27],chestR)),r:[.1+death*.5,yaw*.65,death*.45]}};
 // All limbs have invariant lengths. Feet use a two-bone hinge solution;
 // claws use shoulder and elbow angles, so the wrist travels along an arc.
 const unit=a=>{const d=Math.hypot(...a);return a.map(n=>n/d);};
 const dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0);
 const scale=(a,k)=>a.map(n=>n*k);
 function kneeAt(hip,foot){
  const delta=foot.map((n,i)=>n-hip[i]),d=clamp(Math.hypot(...delta),.05,.859),axis=unit(delta);
  const pole=unit([0,0,1].map((n,i)=>n-axis[i]*axis[2]));
  const along=(.44*.44-.42*.42+d*d)/(2*d),height=Math.sqrt(Math.max(0,.44*.44-along*along));
  return {knee:plus(plus(hip,scale(axis,along)),scale(pole,height)),foot:plus(hip,scale(axis,d))};
 }
 for(const side of [-1,1]){
  const s=side,tag=s<0?'L':'R',wave=Math.sin(cycle+(s<0?0:Math.PI));
  const hip=plus(hips,rotateXYZ([s*.27,-.05,-.015],hipR));
  const footGoal=[s*.34,.18+(moving?Math.max(0,Math.cos(cycle+(s<0?0:Math.PI)))*(run?.17:.09):0),moving?wave*(run?.36:.24):-death*.3];
  const leg=kneeAt(hip,footGoal);
  pose['thigh'+tag]={a:hip,b:leg.knee};pose['shin'+tag]={a:leg.knee,b:leg.foot};pose['foot'+tag]={p:leg.foot,r:[moving?Math.max(0,-wave)*.18:0,0,0]};
  const shoulder=plus(chest,rotateXYZ([s*.52,.04,0],chestR));
  let azimuth=32,pitch=-65,flex=32,hook=0,spellLift=0;
  if(clip==='Heal'||clip==='Enrage'){
   // Lift both bent arms symmetrically, hold the focus, then lower smoothly.
   const lift=path([[0,[0]],[.4,[1]],[.72,[1]],[1,[0]]],t)[0];
   spellLift=lift;azimuth=32+18*lift;pitch=-65+(clip==='Enrage'?79:73)*lift;flex=32+38*lift;
  }
  if(moving){pitch+=wave*(run?24:15);flex+=Math.max(0,-wave)*(run?22:10);}
  if(attack){
   const start=s<0?.28:.54,end=s<0?.44:.70;
   const wind=start-.15,follow=end+.09;
   // Keep the elbow bent while the shoulder sweeps horizontally. Extending the
   // elbow toward the target made the previous claw read as a straight punch.
   [azimuth,pitch,flex,hook]=path([[0,[32,-65,32,0]],[wind,[100,-19,72,1]],[start,[88,-17,68,1]],[end,[20,-20,60,1]],[end+.04,[24,-31,57,1]],[follow+.04,[38,-65,32,0]],[1,[32,-65,32,0]]],t);
  }
  const rad=Math.PI/180,a=s*azimuth*rad,p=(pitch-death*10)*rad;
  const upper=[Math.sin(a)*Math.cos(p),Math.sin(p),Math.cos(a)*Math.cos(p)];
  // A hook bends inward in the shoulder's sweep plane, rather than continually
  // pointing the forearm at world-forward. Blend this plane only during recovery.
  const swingBend=mix([0,.50,1],[-s*Math.cos(a),.16,s*Math.sin(a)],hook);
  const bendTarget=mix(swingBend,[-s*.15,1,.15],spellLift),projection=dot(upper,bendTarget);
  const bend=unit(bendTarget.map((n,i)=>n-upper[i]*projection)),f=flex*rad;
  const fore=upper.map((n,i)=>n*Math.cos(f)+bend[i]*Math.sin(f));
  const upperWorld=rotateXYZ(upper,chestR),foreWorld=rotateXYZ(fore,chestR);
  const elbow=plus(shoulder,scale(upperWorld,.50)),wrist=plus(elbow,scale(foreWorld,.47));
  // Align the palm/claws with the forearm, with a modest relaxed wrist bend.
  const handYaw=Math.atan2(foreWorld[0],foreWorld[2]),handPitch=-Math.asin(clamp(foreWorld[1],-1,1))+.10;
  const sy=Math.sin(handYaw/2),cy=Math.cos(handYaw/2),sx=Math.sin(handPitch/2),cx=Math.cos(handPitch/2);
  // Yaw then pitch keeps the palm level when the swipe crosses sideways;
  // a fixed-roll XYZ frame would flip near a 90-degree lateral direction.
  pose['upper'+tag]={a:shoulder,b:elbow};pose['fore'+tag]={a:elbow,b:wrist};pose['hand'+tag]={p:wrist,q:[cy*sx,sy*cx,-sy*sx,cy*cx]};
 }
 return pose;
}
export function rotateXYZ(v,r){
 // Three.js Euler XYZ applies Rz, Ry, then Rx to a column vector.
 let [x,y,z]=v;let c=Math.cos(r[2]),s=Math.sin(r[2]);[x,y]=[c*x-s*y,s*x+c*y];
 c=Math.cos(r[1]);s=Math.sin(r[1]);[x,z]=[c*x+s*z,-s*x+c*z];
 c=Math.cos(r[0]);s=Math.sin(r[0]);return [x,c*y-s*z,s*y+c*z];
}
export function beastClawAt(phase,side){
 const hand=beastPose('Claw',phase)['hand'+(side<0?'L':'R')];
 const rotate=p=>{const [x,y,z,w]=hand.q,[a,b,c]=p,tx=2*(y*c-z*b),ty=2*(z*a-x*c),tz=2*(x*b-y*a);return [a+w*tx+y*tz-z*ty,b+w*ty+z*tx-x*tz,c+w*tz+x*ty-y*tx];};
 const inner=rotate([0,-.03,.20]),outer=rotate([0,-.16,.59]);return {inner:hand.p.map((n,i)=>n+inner[i]),outer:hand.p.map((n,i)=>n+outer[i])};
}
export function createBeast(now){return {id:'beast-graveclaw',isBeast:true,x:-7,z:-4,yaw:0,vx:0,vz:0,running:false,
 hp:GRAVECLAW.maxHealth,stamina:GRAVECLAW.maxStamina,mana:GRAVECLAW.maxMana,lastManaSpend:-1e6,enragedUntil:0,healReadyAt:0,enrageReadyAt:0,statuses:{},buffs:{},barriers:[],carry:'Hold',action:null,
 stunnedUntil:0,lastCombat:now,lastSprint:-1e6,stationarySince:now,lastSeen:now,mode:'patrol',targetId:null,
 waypoint:0,pauseUntil:now+1.5,spawnAt:now,deadUntil:0};}
export function beastSnapshot(b){return b?{id:b.id,kind:b.kind||'graveclaw',name:b.kind==='cindermaw'?'Cindermaw':GRAVECLAW.name,x:b.x,z:b.z,yaw:b.yaw,vx:b.vx,vz:b.vz,running:b.running,
 hp:b.hp,maxHealth:b.maxHealth||GRAVECLAW.maxHealth,stamina:b.stamina,maxStamina:b.maxStamina||GRAVECLAW.maxStamina,mana:b.mana??GRAVECLAW.maxMana,maxMana:GRAVECLAW.maxMana,manaRegen:GRAVECLAW.manaRegen,enragedUntil:b.enragedUntil||0,mode:b.mode,
 emergeUntil:b.emergeUntil||0,returnStartedAt:b.returnStartedAt||0,burrowAt:b.burrowAt||0,returnAt:b.returnAt||0,deadUntil:b.deadUntil||0,deathAt:b.deathAt||0,spawnAt:b.spawnAt,action:b.action?{id:b.action.id,kind:b.action.kind,start:b.action.start,duration:b.action.duration,cancelled:!!b.action.cancelled}:null,
 statuses:Object.values(b.statuses).map(s=>({id:s.id,potency:s.potency,stacks:s.stacks||1,until:s.until}))}:null;}
