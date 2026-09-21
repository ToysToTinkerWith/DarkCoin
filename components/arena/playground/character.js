import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {MultiWeaponPose} from './multi-weapon-pose';
import {MovingCombatPose,composeMovingPose} from './moving-combat-pose';
import {WeaponActionController} from './weapon-action-controller';
import {SKINS} from '../../../lib/playground';
import {weaponEffectsProfile} from './weapon-effects-profile';
import {createAttackSockets} from './weapon-effects';
import {attackTiming,buildArenaStats} from '../../contracts/Arena/arenaBalanceV1';
import {applyMagicCast} from './magic-cast-pose';
import {JumpPose} from './jump-pose';
import {sampleJump} from '../../../lib/arena/jump';
const BASE='/arena/playground/assets/';
export const wingWeapon=id=>['snake_wings','fire_wings','elder_wings','chameleon_wings'].includes(id);
export async function loadCharacter(loadout,onProgress,signal) {
  const resources=new T.Group();const loader=new GLTFLoader();
  const check=()=>{if(signal.aborted)throw new DOMException('Cancelled','AbortError');};
  async function glb(path){check();const r=await fetch(BASE+path,{signal});if(!r.ok)throw new Error('Could not load '+path);const g=await loader.parseAsync(await r.arrayBuffer(),BASE);resources.add(g.scene);check();return g;}
  async function json(path){const r=await fetch(BASE+path,{signal});if(!r.ok)throw new Error('Animation data could not load.');return r.json();}
  try {
    onProgress('Loading champion body…');const base=await glb('body.glb'),model=base.scene;const bones=new Map();model.traverse(o=>{if(o.isBone)bones.set(o.name,o);});
    const bindPart=async(path,skinRig=false)=>{const g=await glb(path);g.scene.updateMatrixWorld(true);const meshes=[];
      if(skinRig){
        const attach=b=>{if(bones.has(b.name))return bones.get(b.name);if(!/^skin_tail_\d+$/.test(b.name))throw new Error('Incompatible skin joint: '+b.name);const parent=attach(b.parent),bone=new T.Bone();bone.name=b.name;bone.position.copy(b.position);bone.quaternion.copy(b.quaternion);bone.scale.copy(b.scale);parent.add(bone);bones.set(b.name,bone);return bone;};
        g.scene.traverse(o=>{if(o.isBone&&o.name.startsWith('skin_tail_'))attach(o);});model.updateMatrixWorld(true);
      }
      g.scene.traverse(o=>{if(o.isMesh){const parents=[];for(let p=o.parent;p&&p!==g.scene;p=p.parent)parents.push(p.userData);o.userData=Object.assign({},...parents.reverse(),o.userData);meshes.push(o);}});for(const m of meshes){const rest=m.matrixWorld.clone();if(m.isSkinnedMesh){const joints=m.skeleton.bones.map(b=>{const bone=bones.get(b.name);if(!bone)throw new Error('Incompatible champion joint: '+b.name);return bone;});m.bind(new T.Skeleton(joints,m.skeleton.boneInverses.map(b=>b.clone())),m.bindMatrix.clone());}model.add(m);rest.decompose(m.position,m.quaternion,m.scale);m.frustumCulled=false;}};
    if(!SKINS.includes(loadout.skin))throw new Error('Unknown champion skin: '+loadout.skin);
    if(loadout.skin!=='Undead'){
      onProgress('Fitting '+loadout.skin+' skin…');
      const oldSkin=new T.Group(),meshes=[];resources.add(oldSkin);model.traverse(o=>{if(o.isMesh&&o.userData.trait==='01_Undead_Body')meshes.push(o);});meshes.forEach(o=>oldSkin.add(o));
      await bindPart('skins/'+loadout.skin.toLowerCase().replace(/[^a-z0-9]+/g,'_')+'-rigged.glb',true);
    }
    const tails=[...bones.values()].filter(b=>b.name.startsWith('skin_tail_')).map(b=>({bone:b,rest:b.quaternion.clone()}));const tailAxis=new T.Vector3(0,0,1),tailRotation=new T.Quaternion();let tailTime=0;
    onProgress('Fitting head and armour…');
    if(loadout.head)await bindPart('heads/head-'+loadout.head+'-rigged.glb');
    if(loadout.armour)await bindPart(loadout.armour==='leather_garb'?'leather_garb.glb':'armour/'+loadout.armour+'-rigged.glb');
    onProgress('Preparing weapon and movement…');
    if(loadout.weapon)await bindPart('weapons/'+loadout.weapon+'.glb');
    if(loadout.magic){onProgress('Placing shoulder magic…');await bindPart('magic/'+loadout.magic+'-rigged.glb');}
    if(loadout.extra){onProgress('Fitting ear and neck detail…');await bindPart('extras/'+loadout.extra+'-rigged.glb');}
    const [gaits,speeds,data,punchData]=await Promise.all([json('combat.json'),json('locomotion.json'),loadout.weapon==='scythe'?null:json('weapons/'+(loadout.weapon||'snake_wings')+'.json'),json('weapons/snake_wings.json')]);check();
    const unarmedProfile=weaponEffectsProfile(null),unarmedSockets=createAttackSockets(model,unarmedProfile,null);
    const attackProfile=weaponEffectsProfile(loadout.weapon),attackSockets=createAttackSockets(model,attackProfile,data),attackEvents=data?.events?.Swing||{};
    model.userData.skinName=loadout.skin;model.userData.skinId=loadout.skin.toLowerCase().replace(/[^a-z0-9]+/g,'_');
    batchEquipment(model);
    model.traverse(o=>{if(o.isMesh){o.frustumCulled=false;o.castShadow=!o.userData.line&&o.geometry.attributes.position.count>600;o.receiveShadow=true;if(o.userData.weapon_component==='carrier')o.visible=false;}});
    const mixer=new T.AnimationMixer(model),clips=new Map(base.animations.map(c=>[c.name,c]));
    const pose=data?new MultiWeaponPose(model,data,gaits):new MovingCombatPose(model,gaits);
    const punchPose=new MultiWeaponPose(model,{...punchData,weapon_bones:{}},gaits),jumpPose=new JumpPose(model,bones);
    let carriedSaved=[],magicSaved=[];
    const restoreOverlays=()=>{jumpPose.restore();for(const [b,q] of magicSaved)b.quaternion.copy(q);magicSaved=[];for(const [b,p,q,s] of carriedSaved){b.position.copy(p);b.quaternion.copy(q);b.scale.copy(s);}carriedSaved=[];punchPose.restoreBase();};
    const durations=data?.durations||{Draw:2,Stow:2,Swing:1.5};
    attackProfile.speedFactor=attackTiming(loadout.weapon,durations.Swing,buildArenaStats(loadout).stats.hastePct).speedFactor;
    const state=new WeaponActionController(durations,attackProfile.speedFactor);
    const permanent=wingWeapon(loadout.weapon)||!loadout.weapon;if(permanent)state.setState('Hold');
    let action=null,clipName='';
    const choose=name=>{if(name===clipName)return;pose.restoreBase();const clip=clips.get(name);if(!clip)throw new Error('Missing movement '+name);const previous=action;action=mixer.clipAction(clip);action.reset().setEffectiveWeight(1).play();if(previous){action.time=(previous.time/previous.getClip().duration)*clip.duration;previous.crossFadeTo(action,.14,false);}clipName=name;};
    choose('Idle');
    let networkAction=null,jump={tuck:0};
    const update=(dt,name)=>{
      restoreOverlays();pose.restoreBase();choose(name);mixer.update(dt);state.update(dt);
      const phase=action.time/action.getClip().duration;
      if(data)pose.captureAndApply(state.poseAction,state.posePhase,{gaitName:name,gaitPhase:phase});
      else{
        const gaitName=name==='Idle'?'Walk':name;const p=composeMovingPose(gaits,gaitName,name==='Idle'?0:phase,'Carry',0);const bone=bones.get('weapon');const local=p.base[gaits.parents.weapon].clone().invert().multiply(p.base.weapon);local.decompose(bone.position,bone.quaternion,bone.scale);
        pose.captureAndApply(state.poseAction,state.posePhase,{gaitName,gaitPhase:name==='Idle'?0:phase});
      }
      if(networkAction?.unarmed&&!networkAction.cancelled){
        model.updateMatrixWorld(true);const chest=bones.get('chest'),before=chest.matrixWorld.clone();
        const carried=['weapon','weapon_secondary'].map(n=>bones.get(n)).filter(Boolean).map(b=>[b,b.matrixWorld.clone()]);
        carriedSaved=carried.map(([b])=>[b,b.position.clone(),b.quaternion.clone(),b.scale.clone()]);
        punchPose.captureAndApply('Swing',networkAction.phase,{gaitName:name,gaitPhase:phase});
        const delta=chest.matrixWorld.clone().multiply(before.invert());
        for(const [b,world] of carried){b.parent.updateWorldMatrix(true,false);b.parent.matrixWorld.clone().invert().multiply(delta).multiply(world).decompose(b.position,b.quaternion,b.scale);}
      }
      tailTime+=dt;const moving=name!=='Idle';
      tails.forEach(({bone,rest},i)=>{const amplitude=(moving?.028:.010)*(1+i*.18);bone.quaternion.copy(rest).multiply(tailRotation.setFromAxisAngle(tailAxis,Math.sin(tailTime*(moving?3:1.4)-i*.6)*amplitude));});
      if(networkAction?.kind==='Cast'){
        const bothHands=['scythe','executioner_axe','wooden_club','spear','trident','dual_katana','arctic_dual_katana'].includes(loadout.weapon);
        const side=state.state==='Carry'||permanent?'R':bothHands?(networkAction.baseline?'R':null):data?.weapon_bones?.R?'L':'R';
        if(!networkAction.cancelled){magicSaved=[...bones.values()].map(b=>[b,b.quaternion.clone()]);applyMagicCast(model,bones,networkAction.phase,side,networkAction.gesture);}
      }
      jumpPose.apply(jump.tuck);model.updateMatrixWorld(true);
      return networkAction?.unarmed?'Punching':state.label;
    };
    const sync=(player,time)=>{
      jump=sampleJump(player.jumpStart,time);const a=player.action;networkAction=a?{...a,phase:Math.max(0,Math.min(1,(time-a.start)/a.duration))}:null;
      if(!a||a.kind==='Cast'||a.unarmed||a.cancelled){state.setState(player.carry);return;}
      state.action=a.kind;state.active=true;state.attackId=a.id;state.state=a.kind==='Draw'?'Carry':'Hold';
      if(a.kind==='Swing')state.speedFactor=state.durations.Swing/a.duration;
      else state.durations[a.kind]=a.duration;
      state.scrub(Math.max(0,time-a.start));
    };
    model.removeFromParent();return {model,state,permanent,speeds,unarmedProfile,unarmedSockets,unarmedEvents:punchData.events?.Swing||{},get unarmedAttack(){return !!networkAction?.unarmed;},get effectState(){return networkAction?.unarmed?{action:'Swing',attackId:networkAction.id,elapsed:networkAction.phase*networkAction.duration,duration:networkAction.duration,active:!networkAction.cancelled&&networkAction.phase<1}:state;},attackProfile,attackSockets,attackEvents,update,sync,toggle(){return permanent?false:state.trigger(state.state==='Carry'?'Draw':'Stow');},attack(){return state.trigger('Swing');},dispose(){restoreOverlays();pose.restoreBase();mixer.stopAllAction();mixer.uncacheRoot(model);disposeObject(model);disposeObject(resources);}};
  }catch(e){disposeObject(resources);throw e;}
}

// Authoring keeps individual stitches, straw fibres and plates editable.
// The game can draw compatible pieces together with identical skinning math.
function batchEquipment(model) {
  const groups=new Map();
  model.traverse(o=>{
    if(!o.isSkinnedMesh||!o.visible||(o.userData.trait==='01_Undead_Body'&&o.userData.skin_component!=='surface_detail')||Array.isArray(o.material)||o.morphTargetInfluences?.length)return;
    o.updateMatrix();
    const key=[o.material.uuid,o.matrix.toArray().join(','),o.bindMatrix.toArray().join(','),o.skeleton.bones.map(b=>b.uuid).join(','),Object.keys(o.geometry.attributes).sort().join(','),!!o.geometry.index,!!o.userData.line].join('|');
    if(!groups.has(key))groups.set(key,[]);groups.get(key).push(o);
  });
  for(const meshes of groups.values()){
    if(meshes.length<2)continue;const geometry=mergeGeometries(meshes.map(m=>m.geometry),false);if(!geometry)continue;
    const first=meshes[0],merged=new T.SkinnedMesh(geometry,first.material);merged.name=first.name+'_batch';merged.userData={...first.userData};merged.position.copy(first.position);merged.quaternion.copy(first.quaternion);merged.scale.copy(first.scale);merged.bind(first.skeleton,first.bindMatrix.clone());merged.frustumCulled=false;model.add(merged);
    const oldGeometry=new Set();for(const m of meshes){oldGeometry.add(m.geometry);m.removeFromParent();}oldGeometry.forEach(g=>g.dispose());
  }
}

export function disposeObject(root) {
  const geometries=new Set(),materials=new Set(),textures=new Set(),skeletons=new Set();
  root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.skeleton)skeletons.add(o.skeleton);for(const m of [o.material].flat().filter(Boolean)){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});
  geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());skeletons.forEach(s=>s.dispose());root.removeFromParent();
}
