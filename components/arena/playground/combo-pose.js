import {Matrix4,Quaternion,Vector3} from 'three';
import {weaponCombo} from '../../../lib/arena/weapon-combos';
import sockets from '../../../lib/arena/weapon-sockets.json';
import {matrixTrack,vectorTrack,segment} from './combo-curves';
const clamp=t=>Math.max(0,Math.min(1,t));
// Smooth envelopes for entering/leaving procedural corrections.
const smooth=t=>{t=clamp(t);return t*t*t*(10+t*(-15+6*t));};
const pos=m=>new Vector3().setFromMatrixPosition(m),v=a=>new Vector3(...a),up=new Vector3(0,0,1);
const clone=pose=>Object.fromEntries(Object.entries(pose).map(([n,m])=>[n,m.clone()]));
function descendant(n,root,parents){while(n){if(n===root)return true;n=parents[n];}return false;}
function mix(a,b,t){const ap=new Vector3(),aq=new Quaternion(),as=new Vector3(),bp=new Vector3(),bq=new Quaternion(),bs=new Vector3();a.decompose(ap,aq,as);b.decompose(bp,bq,bs);return new Matrix4().compose(ap.lerp(bp,t),aq.slerp(bq,t),as.lerp(bs,t));}
export function comboCurve(keys,t){if(t<=keys[0][0])return keys[0][1];for(let i=1;i<keys.length;i++)if(t<=keys[i][0])return keys[i-1][1]+(keys[i][1]-keys[i-1][1])*smooth((t-keys[i-1][0])/(keys[i][0]-keys[i-1][0]));return keys.at(-1)[1];}
function blendPose(a,b,parents,t){const result={};for(const n of Object.keys(b)){const p=parents[n],local=pose=>p?pose[p].clone().invert().multiply(pose[n]):pose[n];result[n]=(p?result[p].clone():new Matrix4()).multiply(mix(local(a),local(b),t));}return result;}
function around(origin,q,target=origin){return new Matrix4().makeTranslation(...target.toArray()).multiply(new Matrix4().makeRotationFromQuaternion(q)).multiply(new Matrix4().makeTranslation(...origin.clone().negate().toArray()));}
function rotate(pose,parents,root,angle,axis=up){const d=around(pos(pose[root]),new Quaternion().setFromAxisAngle(axis,angle));for(const n of Object.keys(pose))if(descendant(n,root,parents))pose[n].premultiply(d);}


function elbowSolve(pose,side,target,pole){
 const s=pos(pose['upper_arm.'+side]),e=pos(pose['forearm.'+side]),w=pos(pose['hand.'+side]),l1=s.distanceTo(e),l2=e.distanceTo(w);
 const ray=target.clone().sub(s),d=Math.min(l1+l2-.000001,Math.max(Math.abs(l1-l2)+.000001,ray.length()));ray.normalize();const wrist=s.clone().addScaledVector(ray,d);
 const bend=pole.clone().sub(s);bend.addScaledVector(ray,-bend.dot(ray));if(bend.lengthSq()<1e-8)bend.set(side==='R'?1:-1,0,-.2).addScaledVector(ray,-bend.dot(ray));bend.normalize();
 const along=(l1*l1-l2*l2+d*d)/(2*d),elbow=s.clone().addScaledVector(ray,along).addScaledVector(bend,Math.sqrt(Math.max(0,l1*l1-along*along)));
 return {s,e,w,wrist,elbow};
}
function palmDirection(pose,side,frame){
 const hand=pose['hand.'+side],axis=pos(pose['index_01.'+side]).add(pos(pose['ring_01.'+side])).multiplyScalar(.5).sub(pos(hand));
 return axis.transformDirection(hand.clone().invert()).transformDirection(frame);
}
function wristCorrection(pose,side,frame,pole,amount){
 const {wrist,elbow}=elbowSolve(pose,side,pos(frame),pole),fore=wrist.sub(elbow).normalize(),palm=palmDirection(pose,side,frame),angle=palm.angleTo(fore);
 const fraction=angle>1e-5?Math.max(0,angle-.62)/angle*amount:0;
 return new Quaternion().slerp(new Quaternion().setFromUnitVectors(palm,fore),fraction);
}

// Solve elbow position from the real humerus/forearm lengths and a continuously
// moving pole. No bone translation/scale is used to fake reach. Hands/fingers
// are transported as a rigid subtree, and a held weapon defines the hand frame.
function arm(pose,parents,side,target,pole,orientation=null,comfort=0){
 const u='upper_arm.'+side,f='forearm.'+side,h='hand.'+side;
 const old=clone(pose);
 if(orientation&&comfort){
  const initial=elbowSolve(old,side,target,pole),palm=palmDirection(old,side,orientation),fore=initial.wrist.clone().sub(initial.elbow).normalize(),bend=palm.angleTo(fore);
  const ray=initial.wrist.clone().sub(initial.s).normalize(),preferred=initial.wrist.clone().addScaledVector(palm,-initial.e.distanceTo(initial.w)).sub(initial.s);
  preferred.addScaledVector(ray,-preferred.dot(ray));
  const current=initial.elbow.clone().sub(initial.s);current.addScaledVector(ray,-current.dot(ray));
  if(preferred.lengthSq()>1e-6&&current.lengthSq()>1e-6){
   preferred.normalize();current.normalize();const angle=current.angleTo(preferred),fraction=angle>1e-5?Math.min(1,1.05/angle)*smooth((bend-.85)/.85)*comfort:0;
   current.applyQuaternion(new Quaternion().slerp(new Quaternion().setFromUnitVectors(current,preferred),fraction));pole=initial.s.clone().add(current);
  }
 }
 const {s,e,w,wrist,elbow}=elbowSolve(old,side,target,pole);
 const move=(root,from,to,q)=>{const delta=around(from,q,to);for(const n of Object.keys(pose))if(descendant(n,root,parents))pose[n]=delta.clone().multiply(old[n]);};
 move(u,s,s,new Quaternion().setFromUnitVectors(e.clone().sub(s).normalize(),elbow.clone().sub(s).normalize()));
 move(f,e,elbow,new Quaternion().setFromUnitVectors(w.clone().sub(e).normalize(),wrist.clone().sub(elbow).normalize()));
 if(orientation){const now=pose[h].clone(),wanted=orientation.clone();wanted.setPosition(wrist);const delta=wanted.multiply(now.invert());for(const n of Object.keys(pose))if(descendant(n,h,parents))pose[n].premultiply(delta);}
}

// Positions below are in Blender metres: X across, -Y forward, Z up. They are
// offset with the held torso's gait motion, so movement remains a lower layer.
export function composeComboPose(sample,id,phase,parents,weaponBones){
 const c=weaponCombo(id),t=clamp(phase),start=sample(c.chain),held=sample(1);if(t===0)return start;if(t===1)return held;
 const incoming=sample(c.chain-.002).pose,incomingTime=-.002/c.durationScale;
 const base=held.pose,pose=blendPose(start.pose,base,parents,smooth(t/.28));
 const shoulderCenter=pos(base['upper_arm.L']).add(pos(base['upper_arm.R'])).multiplyScalar(.5),offset=shoulderCenter.clone().sub(v([0,0,1.39]));
 const point=a=>v(a).add(offset);
 const family=c.family,bodyKeys=family==='dual'?[[0,0],[.21,.16],[.43,-.23],[.50,-.17],[.69,.24],[.80,.18],[1,0]]:family==='fist'?[[0,0],[.20,-.12],[.43,.20],[.56,.10],[.70,-.24],[.82,-.15],[1,0]]:family==='shield'?[[0,0],[.23,.15],[.54,-.24],[.72,-.29],[1,0]]:family==='shaft'||family==='bow'?[[0,0],[1,0]]:family==='axe'||family==='club'?[[0,0],[.24,-.22],[.55,.24],[.73,.30],[1,0]]:[[0,0],[.22,-.16],[.51,.18],[.70,.22],[1,0]];
 const twist=vectorTrack(bodyKeys.map(([t,x])=>({t,x})),t,k=>v([k.x,0,0])).x;
 const pitch=family==='bow'?0:comboCurve([[0,0],[.25,-.012],[.58,family==='shaft'?.065:.045],[.75,.025],[1,0]],t);
 const before=pose.chest.clone();rotate(pose,parents,'spine_01',twist*.25);rotate(pose,parents,'spine_02',twist*.30);rotate(pose,parents,'chest',twist*.45);rotate(pose,parents,'spine_01',pitch,new Vector3(1,0,0));const bodyDelta=pose.chest.clone().multiply(before.invert());
 // Keep the gaze towards the target while the rib cage winds and unwinds.
 if(pose.neck)rotate(pose,parents,'neck',-twist*.55);
 if(['sword','sickle','staff','shield'].includes(family)){
  const support=comboCurve([[0,0],[.23,1],[.62,.85],[.80,.55],[1,0]],t);
  rotate(pose,parents,'upper_arm.R',-.18*support,new Vector3(1,0,0));
  rotate(pose,parents,'forearm.R',-.24*support,new Vector3(1,0,0));
 }
 const groups=[];
 function group(sides,bone,reference=base){
  const grip={};for(const side of sides)grip[side]=reference[bone].clone().invert().multiply(reference['hand.'+side]);
  const refCenter=sides.reduce((a,side)=>a.add(pos(reference['hand.'+side])),new Vector3()).multiplyScalar(1/sides.length);
  const socket=sockets[id]?.find(s=>s.bone===bone),axis=socket? v(socket.outer).applyMatrix4(reference[bone]).sub(socket.inner.every((n,i)=>n===socket.outer[i])?refCenter:v(socket.inner).applyMatrix4(reference[bone])).normalize():new Vector3(0,-1,0);
  const snapshot=(at,ref)=>({t:at,weapon:ref[bone].clone(),hands:Object.fromEntries(sides.map(side=>[side,ref[bone].clone().invert().multiply(ref['hand.'+side])])),poles:Object.fromEntries(sides.map(side=>[side,pos(ref['forearm.'+side])]))});
  const keys=[snapshot(0,start.pose)];keys[0].before=snapshot(incomingTime,incoming);
  const add=(at,center,direction,poles,rotation)=>{
   const q=rotation||new Quaternion().setFromUnitVectors(axis,v(direction).normalize()),d=around(refCenter,q,point(center));
   keys.push({t:at,weapon:d.clone().multiply(reference[bone]),hands:grip,poles:Object.fromEntries(sides.map(side=>[side,point(poles?.[side]||[side==='R'?.44:-.44,-.12,1.22])]))});
  };
  const copy=(at,ref)=>keys.push(snapshot(at,ref));
  const finish=()=>{keys.push(snapshot(1,base));groups.push({sides,bone,keys});};return {add,copy,finish,refCenter,axis};
 }
 if(['sword','sickle','dual'].includes(family)){
  for(const [side,bone] of Object.entries(weaponBones)){
   const sign=side==='R'?1:-1,g=group([side],bone),dual=family==='dual',isSecond=dual&&side==='L',chamber=family==='sickle'?1.53:1.66;
   const chamberPole={[side]:[sign*.445,-.035,1.39]},cutPole={[side]:[sign*.23,-.33,1.24]};
   if(isSecond){g.add(.26,[sign*.32,-.24,1.40],[sign*.10,.12,.98],{[side]:[sign*.40,-.08,1.24]});g.add(.46,[sign*.415,-.075,chamber],[sign*.10,.58,.80],chamberPole);}
   else g.add(.26,[sign*.415,-.075,chamber],[sign*.10,.58,.80],chamberPole);
   const end=dual?(isSecond?.72:.47):.63;
   g.add(end,[-sign*.025,-.37,1.18],[-sign*.58,-.73,-.36],cutPole);
   if(dual&&!isSecond)g.add(.68,[sign*.34,-.21,1.06],[sign*.42,-.83,.16],{[side]:[sign*.43,-.08,1.18]});
   else g.add(dual?.80:.73,[-sign*.035,-.34,1.15],[-sign*.64,-.68,-.36],cutPole);
   g.finish();
  }
 }else if(['shaft','axe','club','thrust'].includes(family)){
  const bone=Object.values(weaponBones)[0],ref=family==='thrust'?sample(.36).pose:base,g=group(['R','L'],bone,ref);
  if(family==='shaft'){
   g.copy(.26,base);
   const across=pos(base['hand.L']).sub(pos(base['hand.R'])).normalize(),q=new Quaternion().setFromUnitVectors(across,new Vector3(-1,0,0));
   g.add(.44,[.015,-.23,1.235],null,null,q);g.add(.66,[.015,-.43,1.265],null,{R:[.37,-.17,1.22],L:[-.37,-.17,1.22]},q);g.add(.75,[.015,-.41,1.25],null,null,q);
  }else if(family==='axe'){
   g.add(.30,[-.08,-.23,1.56],[-.20,.30,.93],{R:[.33,-.12,1.39],L:[-.4,-.05,1.4]});
   g.add(.64,[.07,-.36,1.17],[.42,-.77,-.48],{R:[.35,-.2,1.20],L:[-.28,-.25,1.21]});g.add(.74,[.10,-.33,1.12],[.48,-.67,-.57]);
  }else if(family==='club'){
   g.add(.30,[-.17,-.22,1.43],[-.64,.15,.75],{R:[.23,-.23,1.35],L:[-.4,-.08,1.38]});
   g.add(.65,[.10,-.34,1.24],[.68,-.72,-.15],{R:[.35,-.15,1.20],L:[-.28,-.27,1.23]});g.add(.75,[.13,-.3,1.2],[.72,-.66,-.20]);
  }else{
   g.add(.30,[-.18,-.14,1.32],[0,-1,.06],{R:[.27,-.16,1.18],L:[-.4,.03,1.19]});
   g.add(.40,[-.18,-.14,1.32],[0,-1,.06],{R:[.27,-.16,1.18],L:[-.4,.03,1.19]});
   g.add(.65,[-.13,-.37,1.38],[0,-1,.04],{R:[.23,-.29,1.24],L:[-.38,-.19,1.23]});g.add(.74,[-.14,-.32,1.37],[0,-1,.04]);
  }
  g.finish();
 }else if(family==='staff'){
  const [side,bone]=Object.entries(weaponBones)[0],g=group([side],bone);
  g.add(.30,[-.30,-.19,1.54],[0,-.25,.97],{L:[-.38,-.09,1.32]});
  g.add(.60,[-.25,-.45,1.32],[0,-.70,.71],{L:[-.38,-.20,1.23]});g.add(.73,[-.27,-.39,1.30],[0,-.62,.78],{L:[-.39,-.16,1.20]});g.finish();
 }else if(family==='shield'){
  const [side,bone]=Object.entries(weaponBones)[0],g=group([side],bone);
  g.add(.28,[.045,-.35,1.34],null,{L:[-.24,-.29,1.21]},new Quaternion().setFromAxisAngle(up,.48));
  g.add(.61,[-.40,-.36,1.32],null,{L:[-.39,-.17,1.23]},new Quaternion().setFromAxisAngle(up,-.60));g.add(.74,[-.43,-.29,1.29],null,{L:[-.43,-.12,1.21]},new Quaternion().setFromAxisAngle(up,-.68));g.finish();
 }else if(family==='bow'){
  // Use a few held anatomical landmarks, not a time-warp of the first attack.
  // The bow stays up while the string hand nocks, draws, releases, then settles.
  for(const [side,bone] of Object.entries(weaponBones)){const g=group([side],bone);for(const [at,source] of [[.21,.36],[.52,.60],[.60,.64],[.73,.72]])g.copy(at,sample(source).pose);g.finish();}
 }else if(family==='fist'){
  const handKeys={L:[[0,pos(start.pose['hand.L'])],[.25,point([-.34,-.18,1.38])],[.46,point([.035,-.45,1.37])],[.65,point([-.24,-.28,1.38])],[1,pos(base['hand.L'])]],R:[[0,pos(start.pose['hand.R'])],[.25,point([.25,-.27,1.36])],[.51,point([.28,-.24,1.16])],[.73,point([.10,-.46,1.48])],[1,pos(base['hand.R'])]]};
  for(const side of ['L','R']){
   const keys=handKeys[side].map(([t,p])=>({t,p}));keys[0].before={t:incomingTime,p:pos(incoming['hand.'+side])};const target=vectorTrack(keys,t,k=>k.p.clone()).applyMatrix4(bodyDelta);
   const middle=point([side==='R'?.43:-.43,-.16,1.22]),pole=pos(start.pose['forearm.'+side]).lerp(middle,smooth(t/.25)).lerp(pos(base['forearm.'+side]),smooth((t-.73)/.27)).applyMatrix4(bodyDelta);
   // Author the fist frame as well as its path. Deriving wrist roll from a
   // nearly straight elbow makes the forearm's shortest rotation flip.
   const strike=sample(side==='L'?.30:.53).pose['hand.'+side];
   const orientation=mix(start.pose['hand.'+side],strike,smooth(t/.25));
   const settled=mix(orientation,base['hand.'+side],smooth((t-.73)/.27)).premultiply(bodyDelta);
   settled.setPosition(target);settled.premultiply(around(target,wristCorrection(pose,side,settled,pole,smooth(t/.12)*smooth((1-t)/.15))));
   arm(pose,parents,side,target,pole,settled);
  }
 }
 for(const g of groups){
  // Correct authored grips before interpolation. A per-frame correction can
  // change its rotation axis abruptly when palm and forearm nearly oppose.
  // Interpolating anatomically aligned keys gives one continuous wrist path.
  for(const key of g.keys.slice(1,-1)){
   if(['sword','dual','sickle','thrust'].includes(family)){
    const socket=sockets[id].find(s=>s.bone===g.bone),axis=v(socket.outer).sub(v(socket.inner)).transformDirection(key.weapon);
    let sine=0,cosine=0;const pivot=new Vector3();
    for(const side of g.sides){
     const frame=key.weapon.clone().multiply(key.hands[side]),solved=elbowSolve(base,side,pos(frame),key.poles[side]),fore=solved.wrist.clone().sub(solved.elbow).normalize(),palm=palmDirection(base,side,frame);
     const a=palm.clone().addScaledVector(axis,-palm.dot(axis)),b=fore.clone().addScaledVector(axis,-fore.dot(axis));pivot.add(pos(frame));
     if(a.lengthSq()>1e-6&&b.lengthSq()>1e-6){a.normalize();b.normalize();sine+=axis.dot(a.clone().cross(b));cosine+=a.dot(b);}
    }
    key.weapon.premultiply(around(pivot.multiplyScalar(1/g.sides.length),new Quaternion().setFromAxisAngle(axis,Math.atan2(sine,cosine))));
   }
   for(let iteration=0;iteration<(family==='thrust'?0:8);iteration++){
   let correction=null;
   for(const side of g.sides){const frame=key.weapon.clone().multiply(key.hands[side]),q=wristCorrection(base,side,frame,key.poles[side],.65);correction=correction?correction.slerp(q,.5):q;}
   const pivot=g.sides.reduce((p,side)=>p.add(pos(key.weapon.clone().multiply(key.hands[side]))),new Vector3()).multiplyScalar(1/g.sides.length);
   key.weapon.premultiply(around(pivot,correction));
   }
  }
  const {i,u}=segment(g.keys,t),a=g.keys[i-1],b=g.keys[i],weapon=matrixTrack(g.keys,t,k=>k.weapon);
  const grips=Object.fromEntries(g.sides.map(side=>[side,matrixTrack(g.keys,t,k=>k.hands[side])]));
  // Interpolate the world hand frame, not two independent rotations whose
  // product can make an extra half-turn while changing from the first grip.
  const lead=g.sides[0],handFrame=matrixTrack(g.keys,t,k=>k.weapon.clone().multiply(k.hands[lead]));
  weapon.copy(handFrame.multiply(grips[lead].clone().invert()));
  // Interpolate the grip centre, not the offset GLB weapon origin. Rotating a
  // distant origin otherwise makes the wrist loop sharply through the shoulder.
  const center=(matrix,hands)=>g.sides.reduce((p,side)=>p.add(pos(matrix.clone().multiply(hands[side]))),new Vector3()).multiplyScalar(1/g.sides.length);
  const desired=vectorTrack(g.keys,t,k=>center(k.weapon,k.hands)),actual=center(weapon,grips);
  // Carry cuts around the front of the torso instead of folding the fist
  // through the shoulder on the straight chord between chamber and finish.
  if(['sword','sickle','dual'].includes(family)&&(a.t===0||a.t===.26&&b.t!==.46||a.t===.46))desired.y-=(a.t===0?.14:.12)*Math.sin(Math.PI*u)**2;
  weapon.setPosition(pos(weapon).add(desired.sub(actual))).premultiply(bodyDelta);pose[g.bone]=weapon;
  const poles=Object.fromEntries(g.sides.map(side=>[side,vectorTrack(g.keys,t,k=>k.poles[side].clone()).applyMatrix4(bodyDelta)]));

  // Keep the entire held object inside both arms' reachable volume. Clamping
  // wrists separately would detach the supporting hand from a heavy weapon.
  const clearance=.012*smooth(t/.12)*smooth((1-t)/.12);
  for(let iteration=0;iteration<8;iteration++)for(const side of g.sides){
   const shoulder=pos(pose['upper_arm.'+side]),elbow=pos(pose['forearm.'+side]),hand=pos(pose['hand.'+side]);
   const reach=shoulder.distanceTo(elbow)+elbow.distanceTo(hand)-clearance;
   const target=pos(weapon.clone().multiply(grips[side])),ray=target.sub(shoulder),length=ray.length();
   if(length>reach)weapon.setPosition(pos(weapon).addScaledVector(ray,(reach-length)/length));
  }
  for(const side of g.sides){
   const target=weapon.clone().multiply(grips[side]);
   // The supporting palm may re-seat during preparation/recovery, while its
   // fingers remain at the handle. During contact both grips are rigid.
   if(g.sides.length===2&&side!==lead){
    const contact=c.windows[0],release=smooth((contact.start-t)/.10)+smooth((t-contact.end)/.10);
    const free=matrixTrack(g.keys,t,k=>k.weapon.clone().multiply(k.hands[side])).premultiply(bodyDelta);free.setPosition(pos(target));target.copy(mix(target,free,Math.min(1,release)));
   }
   arm(pose,parents,side,pos(target),poles[side],target,smooth(t/.14)*smooth((1-t)/.16));
  }
 }
 // After release, bow and fist hands are free: use local joint rotations for
 // its recovery instead of solving a grip against an almost straight arm.
 // That IK pole degeneracy otherwise whips the elbow around near the hip.
 if(['bow','fist'].includes(family)&&t>.73){
  const released=composeComboPose(sample,id,.73,parents,weaponBones).pose,u=(t-.73)/.27,recovery=blendPose(released,base,parents,u*u*(3-2*u));
  for(const n of Object.keys(pose))if(descendant(n,'upper_arm.R',parents)||family==='fist'&&descendant(n,'upper_arm.L',parents))pose[n]=recovery[n];
 }
 return {pose,base:held.base};
}
