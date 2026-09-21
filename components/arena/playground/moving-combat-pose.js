import {Matrix4,Quaternion,Vector3,PropertyBinding} from 'three';

const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const rowsMatrix=rows=>new Matrix4().set(...rows.flat());
function mixTRS(a,b,t){
 const p=new Vector3(...a[0]).lerp(new Vector3(...b[0]),t);
 const q=new Quaternion(...a[1]).normalize().slerp(new Quaternion(...b[1]).normalize(),t).normalize();
 const s=new Vector3(...a[2]).lerp(new Vector3(...b[2]),t);
 return new Matrix4().compose(p,q,s);
}
function trs(matrix){
 const p=new Vector3(),q=new Quaternion(),s=new Vector3();matrix.decompose(p,q,s);
 return [p.toArray(),q.toArray(),s.toArray()];
}
function indices(count,phase){const x=clamp(phase)*(count-1),a=Math.min(Math.floor(x),count-1);return [a,Math.min(a+1,count-1),x-a];}
function localOf(pose,name,parents){const p=parents[name];return p?pose[p].clone().invert().multiply(pose[name]):pose[name].clone();}
export function combatLayerWeight(name,action,phase,weights){
 if(action!=='Draw'&&action!=='Stow')return 1;
 const p=action==='Stow'?1-phase:phase;
 for(const [side,[start,end]] of [['R',weights.right_arm_draw_interval],['L',weights.left_arm_draw_interval]]){
  if(['clavicle.','upper_arm.','forearm.','hand.'].some(prefix=>name.startsWith(prefix+side))||
    (name.endsWith('.'+side)&&['thumb','index','middle','ring','pinky'].some(prefix=>name.startsWith(prefix))))return smooth((p-start)/(end-start));
 }
 const [start,end]=weights.torso_draw_interval;return smooth((p-start)/(end-start));
}

/** Deterministic, engine-independent two-clock pose evaluator in Blender space.
 * Uses the same sampled TRS tables and FK order as moving_weapon_motion.py.
 * The returned lower-body world matrices are the untouched sampled gait.
 */
export function composeMovingPose(data,gaitName,gaitPhase,action='Hold',actionPhase=0){
 const gait=data.gaits[gaitName];if(!gait)throw new Error('Unknown movement: '+gaitName);
 if(!['Carry','Hold','Draw','Stow','Swing'].includes(action))throw new Error('Unknown weapon action: '+action);
 const [i,j,u]=indices(gait.frames.length,((gaitPhase%1)+1)%1);const base={};
 for(const name of data.bone_order){
  const local=mixTRS(gait.frames[i][name],gait.frames[j][name],u);const parent=data.parents[name];
  base[name]=parent?base[parent].clone().multiply(local):local;
 }
 const pose=Object.fromEntries(Object.entries(base).map(([n,m])=>[n,m.clone()]));
 if(action==='Carry')return {pose,base};
 const phase=clamp(actionPhase),canonical=data.canonical[(action==='Stow'?'Draw':action)+'_'+(gaitName.startsWith('Run')?'Run':'Walk')];
 const samplePhase=action==='Stow'?1-phase:phase;
 const [a,b,f]=indices(canonical.frames.length,samplePhase);const first=canonical.frames[a],last=canonical.frames[b];
 const anchor=base[data.anchor_bone],target={};
 for(const name of data.upper_mask)target[name]=anchor.clone().multiply(mixTRS(first.bones[name],last.bones[name],f));
 for(const name of data.upper_mask){
  const parent=data.parents[name];const old=localOf(base,name,data.parents);
  const parentTarget=target[parent]||base[parent];
  const next=parentTarget.clone().invert().multiply(target[name]);
  pose[name]=pose[parent].clone().multiply(mixTRS(trs(old),trs(next),combatLayerWeight(name,action,phase,data.layer_weights)));
 }
 for(const arc of [data.pickup_reach_arc,data.free_left_clearance_arc]){
 if(arc&&(action==='Draw'||action==='Stow')&&samplePhase>arc.interval[0]&&samplePhase<arc.interval[1]){
  const u=(samplePhase-arc.interval[0])/(arc.interval[1]-arc.interval[0]);
  const angle=arc.maximum_angle_rad*Math.sin(Math.PI*u)**2;
  const center=new Vector3().setFromMatrixPosition(pose[arc.bone]);
  const delta=new Matrix4().makeTranslation(...center.toArray())
   .multiply(new Matrix4().makeRotationAxis(new Vector3(...arc.axis_blender_world).normalize(),angle))
   .multiply(new Matrix4().makeTranslation(...center.clone().negate().toArray()));
  for(const name of data.upper_mask){let ancestor=name;while(ancestor&&ancestor!==arc.bone)ancestor=data.parents[ancestor];if(ancestor===arc.bone)pose[name].premultiply(delta);}
 }
 }
 const binding=rowsMatrix(data.weapon_binding_from_authoring);
 const baseWeapon=base.weapon.clone().multiply(binding.clone().invert());
 const targetWeapon=anchor.clone().multiply(mixTRS(first.weapon,last.weapon,f));
 const [weaponStart,weaponEnd]=data.layer_weights.weapon_draw_interval;
 const amount=(action==='Draw'||action==='Stow')?smooth((samplePhase-weaponStart)/(weaponEnd-weaponStart)):1;
 pose.weapon=mixTRS(trs(baseWeapon),trs(targetWeapon),amount).multiply(binding);
 return {pose,base};
}

/** Apply only the upper mask and root-child weapon to a live glTF skeleton.
 * Descendant local joint matrices use the same basis as Blender; glTF's
 * world-axis conversion lives above them. The gait-controlled root/pelvis/
 * legs are never written. Restore before any AnimationMixer evaluation.
 */
export class MovingCombatPose {
 constructor(model,data){
  if(data.schema!=='C5-moving-combat-1')throw new Error('Unsupported moving combat data');
  this.model=model;this.data=data;this.bones=new Map();this.saved=null;
  const actual=new Map();model.traverse(o=>{if(o.isBone)actual.set(o.name,o);});
  for(const name of data.bone_order){const bone=actual.get(name)||actual.get(PropertyBinding.sanitizeNodeName(name));if(bone)this.bones.set(name,bone);}
  this.mask=[...data.upper_mask,'weapon'];
  for(const name of this.mask)if(!this.bones.has(name))throw new Error('Missing combat joint: '+name);
 }
 restoreBase(){
  if(!this.saved)return;
  for(const [name,value] of this.saved){const bone=this.bones.get(name);bone.position.copy(value[0]);bone.quaternion.copy(value[1]);bone.scale.copy(value[2]);bone.updateMatrix();}
  this.saved=null;this.model.updateMatrixWorld(true);
 }
 captureAndApply(action,phase,{gaitName,gaitPhase}){
  if(action==='Carry')return;
  if(this.saved)throw new Error('Restore the gait pose before applying another weapon layer');
  this.saved=new Map(this.mask.map(name=>{const b=this.bones.get(name);return [name,[b.position.clone(),b.quaternion.clone(),b.scale.clone()]];}));
  const {pose}=composeMovingPose(this.data,gaitName,gaitPhase,action,phase);
  for(const name of this.mask){
   const bone=this.bones.get(name),local=localOf(pose,name,this.data.parents);
   local.decompose(bone.position,bone.quaternion,bone.scale);bone.updateMatrix();
  }
  this.model.updateMatrixWorld(true);
 }
}
