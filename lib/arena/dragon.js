// Cindermaw's authored rig, attack timing and proposed playtest balance.
// Pure data/math: the renderer and any future authority can share these sockets.
export const DRAGON={id:'cindermaw',name:'Cindermaw',maxHealth:720,maxStamina:140,
 walkMps:1.15,runMps:2.65,staminaRegen:18,sprintDrain:16,bodyRadius:.78,
 aggroM:9,loseTargetM:13,critChance:.10,critMultiplier:2,
 resistances:{blunt:15,slashing:30,piercing:10,fire:55,frost:0,lightning:15,water:0,poison:25,shadow:20,arcane:15},
 tenacityPct:20,clips:{Idle:3,Walk:1.6,Run:1,TailSweep:2.6,FlameBreath:4.2,Bite:1.5,Death:2.2},
 attacks:{
  tail:{name:'Scouring Tail',clip:'TailSweep',damageType:'blunt',damageRoll:'3d8+8',stamina:38,cycle:2.6,
   active:[.40,.63],radius:.28,reach:3.6,onHit:[{id:'knockback',chance:1,potency:1}],description:'A braced, sweeping tail strike. One hit per target per sweep.'},
  breath:{name:'Furnace Breath',clip:'FlameBreath',damageType:'fire',damageRoll:'1d6+3',stamina:48,cycle:4.2,cooldown:8,
   active:[.28,.72],ticks:6,range:5.8,halfAngleDegrees:13,widthAtMouth:.20,
   onHit:[{id:'burn',chance:.25,potency:1}],description:'Six independently rolled fire pulses. Aim locks at release; the head sweeps through a small readable arc.'},
  bite:{name:'Ironfang Bite',clip:'Bite',damageType:'piercing',damageRoll:'2d6+5',stamina:20,cycle:1.5,
   active:[.42,.55],radius:.25,reach:2.6,onHit:[{id:'bleed',chance:.25,potency:1}],description:'A short neck lunge and snapping jaw for close targets.'}
 }};
// Coordinates: +Z is forward, +Y is up. Every offset is fixed length.
export const DRAGON_RIG={root:{parent:null,p:[0,0,0]},body:{parent:'root',p:[0,1.25,-.35]},
 chest:{parent:'body',p:[0,.12,.64]},neck1:{parent:'chest',p:[0,.23,.46]},neck2:{parent:'neck1',p:[0,.26,.28]},
 neck3:{parent:'neck2',p:[0,.21,.28]},head:{parent:'neck3',p:[0,.12,.29]},jaw:{parent:'head',p:[0,-.12,.02]}};
for(let i=0;i<10;i++)DRAGON_RIG['tail'+i]={parent:i?'tail'+(i-1):'body',p:i?[0,-.035,-.32]:[0,.02,-.83]};
for(const s of [-1,1]){
 const tag=s<0?'L':'R';
 for(const [end,z] of [['Front',.58],['Back',-.68]]){
  const base=end+tag;
  DRAGON_RIG[base+'Upper']={parent:'body',p:[s*.49,-.06,z]};
  DRAGON_RIG[base+'Lower']={parent:base+'Upper',p:[s*.18,-.52,end==='Front'?-.07:.18]};
  DRAGON_RIG[base+'Foot']={parent:base+'Lower',p:[s*.02,-.50,end==='Front'?.10:-.12]};
 }
 DRAGON_RIG['wing'+tag]={parent:'chest',p:[s*.42,.22,-.05]};
 DRAGON_RIG['wingElbow'+tag]={parent:'wing'+tag,p:[s*.76,.70,-.23]};
 DRAGON_RIG['wingWrist'+tag]={parent:'wingElbow'+tag,p:[s*.78,.23,-.38]};
 for(let i=0;i<4;i++)DRAGON_RIG['wingFinger'+tag+i]={parent:'wingWrist'+tag,p:[0,0,0]};
}
const clamp=t=>Math.max(0,Math.min(1,t)),smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
function keys(points,t){for(let i=1;i<points.length;i++)if(t<=points[i][0]){const u=smooth((t-points[i-1][0])/(points[i][0]-points[i-1][0]));return points[i-1][1]+(points[i][1]-points[i-1][1])*u;}return points.at(-1)[1];}
export function dragonPose(clip,phase){
 const t=clamp(phase),c=t*Math.PI*2,run=clip==='Run',moving=run||clip==='Walk';
 const pose=Object.fromEntries(Object.entries(DRAGON_RIG).map(([n,b])=>[n,{p:[...b.p],r:[0,0,0]}]));
 const set=(n,r)=>pose[n].r=r;
 pose.body.p[1]+=moving?Math.cos(c*2)*(run?.025:.012)-(run?.12:.03):Math.sin(c)*.012;
 set('chest',[Math.sin(c)*.012,0,0]);
 for(let i=0;i<10;i++)set('tail'+i,[-.07+i*.014,Math.sin(c-i*.35)*.025,0]);
 set('head',[.03,Math.sin(c)*.025,0]);
 for(const s of [-1,1]){
  const tag=s<0?'L':'R';
  for(const end of ['Front','Back']){
   const phase=c+(s<0?0:Math.PI)+(end==='Front'?0:Math.PI),stride=moving?Math.sin(phase)*(run?.48:.25):0;
   set(end+tag+'Upper',[stride,0,s*.025]);
   set(end+tag+'Lower',[-Math.max(0,-Math.sin(phase))*(moving?(run?.65:.35):0),0,0]);
   set(end+tag+'Foot',[-stride*.35,0,0]);
  }
  set('wing'+tag,[.04, s*-.12,s*(.18+Math.sin(c)*.025)]);
  set('wingElbow'+tag,[0,0,0]);
 }
 if(clip==='TailSweep'){
  pose.body.p[1]-=.045*Math.sin(Math.PI*t)**2;
  const coil=keys([[0,0],[.30,1.05],[.4,1.10],[.63,-1.15],[.76,-.95],[1,0]],t);
  set('body',[0,coil*.22,0]);set('chest',[0,-coil*.18,0]);set('head',[0,-coil*.2,0]);
  for(let i=0;i<10;i++){
   const delayed=keys([[0,0],[.30+i*.006,1],[.4+i*.004,1],[.63+i*.004,-1],[.80,-.7],[1,0]],t);
   set('tail'+i,[i?-.008:keys([[0,0],[.3,-.05],[.7,-.05],[1,0]],t),i?delayed*.035:coil,0]);
  }
  for(const s of [-1,1]){const tag=s<0?'L':'R';set('wing'+tag,[.03,s*-.10,s*-.10]);}
 }
 if(clip==='FlameBreath'){
  const lift=keys([[0,0],[.19,-.24],[.28,.11],[.72,.11],[.88,-.08],[1,0]],t);
  const open=keys([[0,0],[.20,.12],[.28,.53],[.70,.55],[.83,.1],[1,0]],t);
  set('neck1',[lift*.50,0,0]);set('neck2',[lift*.35,0,0]);set('head',[lift*.3,keys([[0,0],[.28,-.12],[.72,.12],[1,0]],t),0]);set('jaw',[open,0,0]);
  for(const s of [-1,1])set('wing'+(s<0?'L':'R'),[0,s*-.16,s*keys([[0,.18],[.22,-.16],[.76,-.16],[1,.18]],t)]);
 }
 if(clip==='Bite'){
  const lunge=keys([[0,0],[.30,-.13],[.43,.30],[.56,.28],[1,0]],t);
  set('neck1',[lunge,0,0]);set('neck2',[lunge*.5,0,0]);set('head',[-lunge*.7,0,0]);
  set('jaw',[keys([[0,0],[.28,.6],[.42,.63],[.52,0],[1,0]],t),0,0]);
 }
 if(clip==='Death'){
  // Lose support, tip over the left flank, impact, then settle. The torso
  // rolls as a rigid mass; the four legs fold rather than sinking vertically.
  const idle=dragonPose('Idle',0),fold=keys([[0,0],[.12,.12],[.38,.80],[.60,1],[1,1]],t);
  for(const name of Object.keys(pose))pose[name]={p:[...idle[name].p],r:[...idle[name].r],...(idle[name].q?{q:[...idle[name].q]}:{})};
  pose.body.p=[keys([[0,0],[.18,-.08],[.55,-.62],[.73,-.76],[1,-.78]],t),keys([[0,1.25],[.18,1.25],[.35,1.18],[.52,.94],[.62,.84],[.72,.89],[.86,.84],[1,.84]],t),-.35];
  set('body',[keys([[0,0],[.18,.08],[.56,.03],[1,.02]],t),0,keys([[0,0],[.18,.15],[.56,1.53],[.64,1.63],[.75,1.50],[.90,1.56],[1,1.56]],t)]);
  set('chest',[.04*fold,0,-.04*fold]);
  const settle=smooth((t-.38)/.45);
  set('neck1',[.22*fold,.12*fold,-.10*fold+.65*settle]);set('neck2',[.13*fold,.06*fold,-.06*fold+.16*settle]);set('neck3',[.04*fold,0,0]);
  set('head',[.03+.15*fold,-.10*fold,-.10*fold-.50*settle]);set('jaw',[keys([[0,0],[.3,.15],[.62,.24],[.86,.13],[1,.13]],t),0,0]);
  for(let i=0;i<10;i++)set('tail'+i,[-.07+i*.014,keys([[0,idle['tail'+i].r[1]],[.4,-.035],[.66,i===0?.09:.015],[.90,i===0?.155:.004],[1,i===0?.155:.004]],t),0]);
  for(const s of [-1,1]){
   const tag=s<0?'L':'R';
   set('wing'+tag,[.04*(1-fold),s*-.12*(1-fold),s*(.18+.82*fold)]);
   set('wingElbow'+tag,[0,s*fold,0]);
   for(const end of ['Front','Back']){
    const upper=end+tag+'Upper',lower=end+tag+'Lower',foot=end+tag+'Foot',front=end==='Front';
    const weight=keys([[0,0],[.14,.12],[.40,.82],[.62,1],[1,1]],t);
    pose[upper].q=blendQuaternion(idle[upper].q,quaternion([front?.42:-.50,s*.08,s<0?.58:.24]),weight);
    pose[lower].q=blendQuaternion(idle[lower].q,quaternion([front?-.95:1.0,0,0]),weight);
    pose[foot].q=blendQuaternion(idle[foot].q,quaternion([front?.36:-.30,0,.08]),weight);
   }
  }
 }
 if(['TailSweep','FlameBreath','Bite'].includes(clip)){
  const idle=dragonPose('Idle',t),weight=smooth(t/.10)*smooth((1-t)/.10);
  // Enter and leave the braced attack poses without popping the wings or tail.
  for(const name of Object.keys(pose))pose[name].r=pose[name].r.map((v,i)=>idle[name].r[i]+(v-idle[name].r[i])*weight);
 }
 {
  // Fixed-length two-bone legs plant the feet while the torso braces/turns.
  // During locomotion only the swing half of each diagonal pair lifts.
  const bodyQ=quaternion(pose.body.r),inverse=[-bodyQ[0],-bodyQ[1],-bodyQ[2],bodyQ[3]];
  const add=(a,b)=>a.map((n,i)=>n+b[i]),sub=(a,b)=>a.map((n,i)=>n-b[i]),mul=(a,k)=>a.map(n=>n*k),dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0),unit=a=>mul(a,1/Math.hypot(...a));
  for(const s of [-1,1])for(const end of ['Front','Back']){
   const tag=s<0?'L':'R',upper=end+tag+'Upper',lower=end+tag+'Lower',foot=end+tag+'Foot';
   const upperVector=DRAGON_RIG[lower].p,lowerVector=DRAGON_RIG[foot].p,L1=Math.hypot(...upperVector),L2=Math.hypot(...lowerVector);
   const phase=c+(s<0?0:Math.PI)+(end==='Front'?0:Math.PI),swing=Math.sin(phase),lift=Math.max(0,Math.cos(phase));
   const rest=add(add(add(DRAGON_RIG.body.p,DRAGON_RIG[upper].p),upperVector),lowerVector);
   let target=[rest[0],rest[1]+(moving?lift*(run?.19:.10):0),rest[2]+(moving?swing*(run?.38:.23):0)],footWorldQ=[0,0,0,1];
   let preferred=[s*.3,0,end==='Front'?-1:1];
   if(clip==='Death'){
    const release=smooth((t-.20)/.32),uq=pose[upper].q,lq=pose[lower].q;
    const foldedBend=rotateBy(uq,upperVector),foldedFoot=add(DRAGON_RIG[upper].p,add(foldedBend,rotateBy(multiply(uq,lq),lowerVector)));
    const worldFoot=add(pose.body.p,rotateBy(bodyQ,foldedFoot));
    target=target.map((v,i)=>v+(worldFoot[i]-v)*release);
    footWorldQ=blendQuaternion([0,0,0,1],multiply(bodyQ,multiply(uq,multiply(lq,pose[foot].q))),release);
    // Keep the sole and the forward talons above the floor throughout the
    // release. Interpolating ankle targets avoids a downward quaternion arc.
    const up=rotateBy([-footWorldQ[0],-footWorldQ[1],-footWorldQ[2],footWorldQ[3]],[0,1,0]);
    let sole=rotateBy(footWorldQ,[0,-.045,.13])[1]-Math.hypot(up[0]*.19,up[1]*.095,up[2]*.25);
    for(const x of [-.14,0,.14]){sole=Math.min(sole,rotateBy(footWorldQ,[x,-.085,.46])[1]-.01,rotateBy(footWorldQ,[x,-.04,.29])[1]-.07);}
    target[1]=Math.max(target[1],.025-sole);
    preferred=preferred.map((v,i)=>v*(1-release)+foldedBend[i]*release);
   }
   const localTarget=rotateBy(inverse,sub(target,pose.body.p)),hip=DRAGON_RIG[upper].p,delta=sub(localTarget,hip),distance=Math.max(.1,Math.min(L1+L2-.003,Math.hypot(...delta))),axis=unit(delta);
   const pole=unit(sub(preferred,mul(axis,dot(preferred,axis))));
   const along=(L1*L1-L2*L2+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,L1*L1-along*along));
   const bend=add(mul(axis,along),mul(pole,height)),shin=sub(mul(axis,distance),bend);
   const upperQ=align(unit(upperVector),unit(bend)),lowerQ=align(unit(lowerVector),unit(shin)),upperInv=[-upperQ[0],-upperQ[1],-upperQ[2],upperQ[3]];
   pose[upper].q=upperQ;pose[lower].q=multiply(upperInv,lowerQ);pose[foot].q=multiply(multiply([-lowerQ[0],-lowerQ[1],-lowerQ[2],lowerQ[3]],inverse),footWorldQ);
  }
 }
 return pose;
}
function align(a,b){const dot=a.reduce((n,v,i)=>n+v*b[i],0),q=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0],1+dot],length=Math.hypot(...q);return q.map(n=>n/length);}
function blendQuaternion(a,b,t){const sign=a.reduce((sum,v,i)=>sum+v*b[i],0)<0?-1:1,q=a.map((v,i)=>v*(1-t)+b[i]*sign*t),length=Math.hypot(...q);return q.map(v=>v/length);}
export function rotateBy(q,v){const [x,y,z,w]=q,[a,b,c]=v,tx=2*(y*c-z*b),ty=2*(z*a-x*c),tz=2*(x*b-y*a);return [a+w*tx+y*tz-z*ty,b+w*ty+z*tx-x*tz,c+w*tz+x*ty-y*tx];}
function multiply(a,b){const [x,y,z,w]=a,[X,Y,Z,W]=b;return [w*X+x*W+y*Z-z*Y,w*Y-x*Z+y*W+z*X,w*Z+x*Y-y*X+z*W,w*W-x*X-y*Y-z*Z];}
function quaternion(r){const [x,y,z]=r.map(v=>v/2),c1=Math.cos(x),c2=Math.cos(y),c3=Math.cos(z),s1=Math.sin(x),s2=Math.sin(y),s3=Math.sin(z);return [s1*c2*c3+c1*s2*s3,c1*s2*c3-s1*c2*s3,c1*c2*s3+s1*s2*c3,c1*c2*c3-s1*s2*s3];}
export function dragonWorldPose(clip,t){const local=dragonPose(clip,t),world={};for(const [n,b] of Object.entries(DRAGON_RIG)){const p=local[n],parent=world[b.parent],q=p.q||quaternion(p.r);world[n]=parent?{p:rotateBy(parent.q,p.p).map((v,i)=>v+parent.p[i]),q:multiply(parent.q,q)}:{p:p.p,q};}return world;}
export function dragonSockets(clip,t){const world=dragonWorldPose(clip,t),point=(n,p)=>rotateBy(world[n].q,p).map((v,i)=>v+world[n].p[i]);return {mouth:point('head',[0,-.08,.66]),direction:rotateBy(world.head.q,[0,-.12,Math.sqrt(1-.12*.12)]),tail:point('tail9',[0,0,-.34]),tailChain:Array.from({length:10},(_,i)=>point('tail'+i,[0,0,0]))};}
