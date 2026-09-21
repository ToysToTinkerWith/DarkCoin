import * as T from 'three';
import {attackWindows} from './weapon-effects-profile';

export const SWORD_HITBOX_INSET_M=.08;
export const SWORD_HITBOX_IDS=['dragon_longsword','dark_sword','dual_katana','arctic_dual_katana','sketonian_sword','rusty_sword','hedge_knight_sword'];

// The scythe's local +X follows its curved blade. Fit cross-sections of the
// actual blade mesh, excluding the pierced heel and shaft at X=0.
function scytheBladeSegment(points,box){
 const width=box.max.x-box.min.x;
 const section=t=>{
  const x=box.min.x+width*t;
  const slice=points.filter(p=>Math.abs(p.x-x)<=width*.025);
  const bounds=new T.Box3().setFromPoints(slice),center=bounds.getCenter(new T.Vector3());
  return center.setX(x);
 };
 return {inner:section(.38),outer:section(.91)};
}

// Capture sockets before draw-call batching removes the original weapon meshes.
// The sampled points are in the actual deforming weapon joint's local space.
export function createAttackSockets(model,profile,motion){
 const bones=new Map(),groups=new Map();model.updateWorldMatrix(true,true);model.traverse(o=>{if(o.isBone)bones.set(o.name,o);});
 if(profile.kind==='punch')return ['R','L'].map(side=>({side,bone:bones.get('hand.'+side)||bones.get(T.PropertyBinding.sanitizeNodeName('hand.'+side)),inner:new T.Vector3(-.045,.06,0),outer:new T.Vector3(.045,.09,0)}));
 const wanted=profile.kind==='arrow'?['grip']:profile.kind==='spell'?(profile.id==='dragon_staff'?['orb']:['head','lightning']):profile.id==='shield'?['shield']:profile.id==='wooden_club'?['club']:['blade'];
 model.traverse(mesh=>{
  if(!mesh.isSkinnedMesh||mesh.userData.trait!=='05_Back_Weapon'||mesh.userData.line)return;
  const role=mesh.userData.weapon_role;if(!wanted.includes(role)&&role!=='grip')return;
  const pos=mesh.geometry.attributes.position,indices=mesh.geometry.attributes.skinIndex;
  for(let i=0;i<pos.count;i++){
   const joint=indices.getX(i),bone=mesh.skeleton.bones[joint];if(!/^weapon(_secondary)?$/.test(bone.name))continue;
   if(!groups.has(bone.name))groups.set(bone.name,{bone,points:[],grips:[]});
   const v=new T.Vector3().fromBufferAttribute(pos,i).applyMatrix4(mesh.bindMatrix).applyMatrix4(mesh.skeleton.boneInverses[joint]);
   if(wanted.includes(role))groups.get(bone.name).points.push(v);
   if(role==='grip')groups.get(bone.name).grips.push(v);
  }
 });
 const sockets=[];
 for(const {bone,points,grips} of groups.values()){
  if(!points.length)continue;
  const box=new T.Box3().setFromPoints(points),center=box.getCenter(new T.Vector3()),grip=grips.length?new T.Box3().setFromPoints(grips).getCenter(new T.Vector3()):new T.Vector3();
  const tip=points.reduce((a,b)=>a.distanceToSquared(grip)>b.distanceToSquared(grip)?a:b).clone();
  const side=Object.entries(motion?.weapon_bones||{R:'weapon'}).find(([,name])=>name===bone.name)?.[0]||'R';
  const projectile=profile.kind==='arrow'||profile.kind==='spell';
  let inner=projectile?center:grip.clone().lerp(tip,.38),outer=projectile?center:tip;
  if(profile.id==='scythe')({inner,outer}=scytheBladeSegment(points,box));
  if(SWORD_HITBOX_IDS.includes(profile.id)){
   const inset=tip.clone().sub(grip).normalize().multiplyScalar(SWORD_HITBOX_INSET_M);
   inner.sub(inset);outer.sub(inset);
  }
  sockets.push({side,bone,inner,outer});
 }
 if(!sockets.length)throw new Error('Missing weapon effect socket: '+profile.id);
 return sockets;
}

const MAX_SAMPLES=48,TRAIL_LIFE=.26;
function makeTrail(color){
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(new Float32Array(MAX_SAMPLES*2*3),3).setUsage(T.DynamicDrawUsage));geometry.setAttribute('alpha',new T.BufferAttribute(new Float32Array(MAX_SAMPLES*2),1).setUsage(T.DynamicDrawUsage));geometry.setAttribute('edge',new T.BufferAttribute(new Float32Array(MAX_SAMPLES*2),1));
 const indices=[];for(let i=0;i<MAX_SAMPLES;i++){geometry.attributes.edge.setX(i*2,0);geometry.attributes.edge.setX(i*2+1,1);if(i<MAX_SAMPLES-1)indices.push(i*2,i*2+1,i*2+3,i*2,i*2+3,i*2+2);}geometry.setIndex(indices);geometry.setDrawRange(0,0);
 const material=new T.ShaderMaterial({uniforms:{tint:{value:new T.Color(color)}},vertexShader:'attribute float alpha; attribute float edge; varying float vAlpha; varying float vEdge; void main(){vAlpha=alpha;vEdge=edge;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform vec3 tint; varying float vAlpha; varying float vEdge; void main(){float opacity=smoothstep(0.,.22,vEdge)*vAlpha;vec3 col=mix(tint,vec3(1.),.5*smoothstep(.88,1.,vEdge));gl_FragColor=vec4(col,opacity);}',transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,toneMapped:false});
 const mesh=new T.Mesh(geometry,material);mesh.frustumCulled=false;mesh.renderOrder=3;mesh.name='Weapon damage arc';mesh.userData.attackEffect='arc';return {mesh,samples:[]};
}

export class WeaponEffects{
 constructor(scene,actor,character){
  this.root=new T.Group();this.root.name='Weapon attack effects';scene.add(this.root);this.actor=actor;this.character=character;this.profile=character.attackProfile;this.windows=attackWindows(this.profile,character.attackEvents);this.clock=0;this.sequence=character.state.attackId;this.previousPhase=0;this.launched=false;this.trails=[];this.current=new Map();this.projectiles=[];this.bursts=[];this.disposed=false;
 }
 points(socket){socket.bone.updateWorldMatrix(true,false);return {inner:socket.bone.localToWorld(socket.inner.clone()),outer:socket.bone.localToWorld(socket.outer.clone())};}
 forward(){this.actor.updateWorldMatrix(true,false);const v=new T.Vector3(0,0,1).transformDirection(this.actor.matrixWorld);v.y=0;return v.normalize();}
 launch(socket){
  if(this.serverProjectiles)return;
  const start=this.points(socket).outer,direction=this.forward(),group=new T.Group(),p=this.profile;
  group.name=p.kind==='arrow'?'Damage-colored arrow':'Damage-colored spell';group.userData.attackEffect='projectile';group.userData.damageType=p.damageType;group.position.copy(start).addScaledVector(direction,.08);group.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),direction);
  const material=new T.MeshBasicMaterial({color:p.color,transparent:true,opacity:.95,toneMapped:false});
  if(p.kind==='arrow'){
   const shaft=new T.Mesh(new T.CylinderGeometry(.015,.015,.58,8),material);shaft.rotation.x=Math.PI/2;shaft.position.z=-.24;group.add(shaft);
   const tip=new T.Mesh(new T.ConeGeometry(.065,.18,4),material);tip.rotation.x=Math.PI/2;tip.position.z=.06;group.add(tip);
  }else{
   group.add(new T.Mesh(new T.IcosahedronGeometry(.115,2),material));
   const glow=new T.Mesh(new T.IcosahedronGeometry(.19,1),new T.MeshBasicMaterial({color:p.color,transparent:true,opacity:.18,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}));group.add(glow);
   const tail=new T.Mesh(new T.ConeGeometry(.095,.65,12),material);tail.rotation.x=-Math.PI/2;tail.position.z=-.35;group.add(tail);
  }
  this.root.add(group);this.projectiles.push({group,direction,age:0,speed:p.projectile?.speedMps||(p.kind==='arrow'?12:8),life:p.projectile?p.projectile.maxRangeM/p.projectile.speedMps:1.8});
  if(this.projectiles.length>12)this.remove(this.projectiles.shift().group);
 }
 burst(socket){
  const mesh=new T.Mesh(new T.RingGeometry(.12,.20,28,1,-Math.PI*.72,Math.PI*1.44),new T.MeshBasicMaterial({color:this.profile.color,transparent:true,opacity:.75,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}));
  mesh.name='Melee impact crescent';mesh.userData.attackEffect='arc';mesh.position.copy(this.points(socket).outer);const direction=this.forward();mesh.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),direction);this.root.add(mesh);this.bursts.push({mesh,age:0,direction});
 }
 update(dt){
  if(this.disposed)return;dt=Math.max(0,dt);this.clock+=dt;const state=this.character.effectState||this.character.state;
  const profile=this.character.unarmedAttack?this.character.unarmedProfile:this.character.attackProfile;
  const sockets=this.character.unarmedAttack?this.character.unarmedSockets:this.character.attackSockets;
  if(profile!==this.profile){this.profile=profile;this.windows=attackWindows(profile,this.character.unarmedAttack?this.character.unarmedEvents:this.character.attackEvents);this.sequence=-1;}
  if(state.attackId!==this.sequence){this.sequence=state.attackId;this.previousPhase=0;this.launched=false;this.current.clear();}
  const isAttack=state.action==='Swing',phase=isAttack?Math.min(1,state.elapsed/state.duration):0;
  if(isAttack&&state.attackId>0){
   if(this.profile.kind==='arrow'||this.profile.kind==='spell'){
    if(!this.launched&&this.previousPhase<this.windows[0].release&&phase>=this.windows[0].release){this.launch(sockets[0]);this.launched=true;}
   }else{
    this.windows.forEach((window,i)=>{
     const matching=sockets.filter(s=>window.side===null||s.side===window.side);
     for(const socket of matching){
      if(state.active&&phase>=window.start&&phase<=window.end){
       const key=i+socket.side;let trail=this.current.get(key);if(!trail){trail=makeTrail(this.profile.color);this.current.set(key,trail);this.trails.push(trail);this.root.add(trail.mesh);}
       const points=this.points(socket);trail.samples.push({...points,time:this.clock});if(trail.samples.length>MAX_SAMPLES)trail.samples.shift();
      }
      if((this.profile.kind==='punch'||['shield','spear','trident'].includes(this.profile.id))&&this.previousPhase<window.end&&phase>=window.end)this.burst(socket);
     }
    });
   }
   this.previousPhase=phase;
  }
  for(const trail of [...this.trails]){
   trail.samples=trail.samples.filter(s=>this.clock-s.time<TRAIL_LIFE);const g=trail.mesh.geometry;
   if(!trail.samples.length){this.remove(trail.mesh);this.trails.splice(this.trails.indexOf(trail),1);for(const [k,v] of this.current)if(v===trail)this.current.delete(k);continue;}
   trail.samples.forEach((s,i)=>{g.attributes.position.setXYZ(i*2,...s.inner.toArray());g.attributes.position.setXYZ(i*2+1,...s.outer.toArray());const alpha=.80*Math.pow(1-(this.clock-s.time)/TRAIL_LIFE,1.5);g.attributes.alpha.setX(i*2,alpha*.12);g.attributes.alpha.setX(i*2+1,alpha);});g.attributes.position.needsUpdate=true;g.attributes.alpha.needsUpdate=true;g.setDrawRange(0,Math.max(0,trail.samples.length-1)*6);
  }
  for(const p of [...this.projectiles]){p.age+=dt;p.group.position.addScaledVector(p.direction,p.speed*dt);if(p.age>p.life||Math.hypot(p.group.position.x,p.group.position.z)>14.3){this.remove(p.group);this.projectiles.splice(this.projectiles.indexOf(p),1);}}
  for(const b of [...this.bursts]){b.age+=dt;b.mesh.position.addScaledVector(b.direction,dt*1.5);b.mesh.scale.setScalar(1+b.age*2);b.mesh.material.opacity=.7*Math.max(0,1-b.age/.24);if(b.age>=.24){this.remove(b.mesh);this.bursts.splice(this.bursts.indexOf(b),1);}}
 }
 remove(object){const materials=new Set();object.traverse(o=>{o.geometry?.dispose();if(o.material)materials.add(o.material);});materials.forEach(m=>m.dispose());object.removeFromParent();}
 dispose(){if(this.disposed)return;this.disposed=true;for(const child of [...this.root.children])this.remove(child);this.root.removeFromParent();this.trails=[];this.projectiles=[];this.bursts=[];this.current.clear();}
}
