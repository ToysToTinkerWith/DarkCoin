import {Matrix4,Quaternion,Vector3,PropertyBinding} from 'three';
import {composeMovingPose} from './moving-combat-pose.js';
const rows=r=>new Matrix4().set(...r.flat());
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const trs=m=>{const p=new Vector3(),q=new Quaternion(),s=new Vector3();m.decompose(p,q,s);return [p.toArray(),q.toArray(),s.toArray()];};
const mix=(a,b,t)=>new Matrix4().compose(new Vector3(...a[0]).lerp(new Vector3(...b[0]),t),new Quaternion(...a[1]).normalize().slerp(new Quaternion(...b[1]).normalize(),t),new Vector3(...a[2]).lerp(new Vector3(...b[2]),t));
function local(pose,n,parents){const p=parents[n];return p?pose[p].clone().invert().multiply(pose[n]):pose[n].clone();}
function sample(frames,t){const f=Math.max(0,Math.min(1,t))*(frames.length-1),a=Math.floor(f);return [frames[a],frames[Math.min(a+1,frames.length-1)],f-a];}

export function composeWeaponPose(data,gaits,gaitName,gaitPhase,action='Hold',phase=0){
 let base;
 if(gaits.gaits[gaitName])base=composeMovingPose(gaits,gaitName,gaitPhase,'Carry',0).base;
 else {base={};for(const n of gaits.bone_order){const m=mix(data.standing_pose[n],data.standing_pose[n],0),p=data.parents[n];base[n]=p?base[p].clone().multiply(m):m;}}
 base.weapon_secondary=base.weapon.clone();
 const pose=Object.fromEntries(Object.entries(base).map(([n,m])=>[n,m.clone()]));
 const [a,b,f]=sample(data.canonical[action].frames,phase),anchor=base[data.anchor_bone];
 if(action!=='Carry'){
  const target={};for(const n of data.upper_mask)target[n]=anchor.clone().multiply(mix(a.bones[n],b.bones[n],f));
  const drawPhase=action==='Stow'?1-phase:phase;
  const amount=['Draw','Stow'].includes(action)?smooth((drawPhase-data.draw_blend_interval[0])/(data.draw_blend_interval[1]-data.draw_blend_interval[0])):1;
  for(const n of data.upper_mask){const p=data.parents[n],old=local(base,n,data.parents),next=(target[p]||base[p]).clone().invert().multiply(target[n]);pose[n]=pose[p].clone().multiply(mix(trs(old),trs(next),amount));}
 }
 // The low free hand travels around the hip, not through it, while blending
 // out of a locomotion arm swing. This transient abduction vanishes at both
 // endpoints and does not affect standing clips or either weapon grip.
 if(gaits.gaits[gaitName] && data.weapon_bones.L && !data.weapon_bones.R && (action==='Draw'||action==='Stow')){
  const p=action==='Stow'?1-phase:phase;
  const amount=smooth((p-data.draw_blend_interval[0])/(data.draw_blend_interval[1]-data.draw_blend_interval[0]));
  const angle=.22*Math.sin(Math.PI*amount)**2;
  const chest=pose.chest.clone().multiply(mix(data.reference_chest_world,data.reference_chest_world,0).invert());
  const axis=new Vector3(0,-1,0).transformDirection(chest),origin=new Vector3().setFromMatrixPosition(pose['upper_arm.R']);
  const delta=new Matrix4().makeTranslation(...origin.toArray()).multiply(new Matrix4().makeRotationFromQuaternion(new Quaternion().setFromAxisAngle(axis,angle))).multiply(new Matrix4().makeTranslation(-origin.x,-origin.y,-origin.z));
  const arm=new Set(['upper_arm.R']);
  for(const n of data.bone_order){if(arm.has(data.parents[n]))arm.add(n);if(arm.has(n))pose[n].premultiply(delta);}
 }
 for(const [side,boneName] of Object.entries(data.weapon_bones)){
  const carried=base.chest.clone().multiply(mix(data.reference_chest_world,data.reference_chest_world,0).invert()).multiply(mix(data.carry_authoring[side],data.carry_authoring[side],0));
  let weapon=carried;
  if(action!=='Carry'){
   weapon=anchor.clone().multiply(mix(a.weapons[side],b.weapons[side],f));
   if(action==='Draw'||action==='Stow'){
    const p=action==='Stow'?1-phase:phase;
    const w=smooth((p-data.draw_blend_interval[0])/(data.draw_blend_interval[1]-data.draw_blend_interval[0]));
    weapon=mix(trs(carried),trs(weapon),w);
   }
  }
  pose[boneName]=weapon.multiply(rows(data.bindings[side]));
 }
 return {pose,base};
}

export class MultiWeaponPose{
 constructor(model,data,gaits){
  this.model=model;this.data=data;this.gaits=gaits;this.saved=null;this.bones=new Map();
  const actual=new Map();model.traverse(o=>{if(o.isBone)actual.set(o.name,o);});
  for(const n of data.bone_order){const b=actual.get(n)||actual.get(PropertyBinding.sanitizeNodeName(n));if(b)this.bones.set(n,b);}
  this.mask=[...data.upper_mask,...Object.values(data.weapon_bones)];
  for(const n of this.mask)if(!this.bones.has(n))throw new Error('Missing weapon rig joint '+n);
 }
 restoreBase(){if(!this.saved)return;for(const [n,[p,q,s]] of this.saved){const b=this.bones.get(n);b.position.copy(p);b.quaternion.copy(q);b.scale.copy(s);b.updateMatrix();}this.saved=null;this.model.updateMatrixWorld(true);}
 captureAndApply(action,phase,{gaitName,gaitPhase}){
  if(this.saved)throw new Error('Restore the base pose before composing another weapon action.');
  const mask=action==='Carry'?Object.values(this.data.weapon_bones):this.mask;
  this.saved=new Map(mask.map(n=>{const b=this.bones.get(n);return [n,[b.position.clone(),b.quaternion.clone(),b.scale.clone()]];}));
  const {pose}=composeWeaponPose(this.data,this.gaits,gaitName,gaitPhase,action,phase);
  for(const n of mask){const b=this.bones.get(n);local(pose,n,this.data.parents).decompose(b.position,b.quaternion,b.scale);b.updateMatrix();}
  this.model.updateMatrixWorld(true);
 }
}
