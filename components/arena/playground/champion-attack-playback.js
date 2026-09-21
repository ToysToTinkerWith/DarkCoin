import * as T from 'three';
import paths from '../../../lib/arena/weapon-paths.json';
import {bladeAt} from '../../../lib/arena/simulation';
import {WEAPONS,UNARMED} from '../../contracts/Arena/arenaBalanceV1';
import {CombatEffects} from './combat-effects';
import {disposeObject} from './character';

const tint='#ff939a';
const material=opacity=>new T.MeshBasicMaterial({color:tint,transparent:true,opacity,depthWrite:false,side:T.DoubleSide});
function circle(radius){
 const g=new T.Group();
 for(const [geometry,opacity] of [[new T.CircleGeometry(radius,40),.22],[new T.RingGeometry(Math.max(0,radius-.009),radius+.009,40),.85]]){
  const m=new T.Mesh(geometry,material(opacity));m.rotation.x=-Math.PI/2;g.add(m);
 }
 return g;
}
function capsule(radius){
 const root=new T.Group(),body=new T.Mesh(new T.CylinderGeometry(radius,radius,1,16),material(.16));root.add(body);
 const ends=[0,1].map(()=>{const end=new T.Group();end.add(new T.Mesh(new T.SphereGeometry(radius,16,10),material(.16)),circle(radius));root.add(end);return end;});
 const a=new T.Vector3(),b=new T.Vector3(),axis=new T.Vector3();
 return {root,set(blade){a.fromArray(blade.inner);b.fromArray(blade.outer);axis.copy(b).sub(a);const length=axis.length();body.position.copy(a).add(b).multiplyScalar(.5);body.scale.y=Math.max(.0001,length);if(length)body.quaternion.setFromUnitVectors(T.Object3D.DEFAULT_UP,axis.divideScalar(length));ends[0].position.copy(a);ends[1].position.copy(b);}};
}

// Equipped haste controls the cycle. Collision paths and active windows are the
// authoritative combat data; orbiting the camera never changes the attack.
export class ChampionAttackPlayback{
 constructor(scene,character,weapon){
  this.character=character;this.id=weapon||'unarmed';this.motion=paths[this.id];this.spec=weapon?WEAPONS[weapon]:UNARMED;
  this.root=new T.Group();scene.add(this.root);this.time=0;
  character.state.setState('Hold');character.attack();this.duration=character.state.duration;
  this.release=this.motion.windows[0].release*this.duration;
  this.flight=this.spec.projectile?this.spec.projectile.maxRangeM/this.spec.projectile.speedMps:0;
  this.total=Math.max(this.duration,this.flight?this.release+this.flight:0)+.65;
  this.colliders=[];
  if(this.spec.projectile){
   this.visuals=new CombatEffects(this.root);
   this.projectile=this.visuals.projectile({width:this.spec.projectile.widthM,damageType:this.spec.damageType,traitId:weapon,dx:0,dy:0,dz:1});
   this.projectile.name='Preview weapon projectile';this.projectile.add(circle(this.spec.projectile.widthM/2),new T.Mesh(new T.SphereGeometry(this.spec.projectile.widthM/2,16,10),material(.18)));
   this.root.add(this.projectile);this.origin=bladeAt(this.id,this.motion.windows[0].release,null).outer;
  }else for(const window of this.motion.windows){const c=capsule(this.spec.hitRadiusM);c.window=window;this.colliders.push(c);this.root.add(c.root);}
  this.update(0);
 }
 update(dt){
  this.time=(this.time+Math.max(0,dt))%this.total;
  this.character.state.scrub(Math.min(this.time,this.duration));this.character.update(0,'Idle');
  const phase=this.time/this.duration;let active=0;
  for(const c of this.colliders){c.root.visible=phase>=c.window.start&&phase<=c.window.end;if(c.root.visible){c.set(bladeAt(this.id,phase,c.window.side));active++;}}
  if(this.projectile){const age=this.time-this.release;this.projectile.visible=age>=0&&age<=this.flight;if(this.projectile.visible){this.projectile.position.set(this.origin[0],this.origin[1],this.origin[2]+age*this.spec.projectile.speedMps);active=1;}}
  return {time:this.time,phase:Math.min(1,phase),active};
 }
 dispose(){this.visuals?.dispose();disposeObject(this.root);}
}
