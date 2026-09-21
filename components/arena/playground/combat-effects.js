import {BaselineSpellEffects} from './baseline-spell-effects';
import {baselineSpell} from '../../contracts/Arena/baselineSpells';
import * as T from 'three';

import {DAMAGE_PALETTE} from '../../contracts/Arena/arenaBalanceV1';



import {makeStatusBadge,statusBadgeRow} from './status-badges';



export class CombatEffects {

 constructor(scene){this.baselineFx=new BaselineSpellEffects(scene);this.root=new T.Group();scene.add(this.root);this.items=new Map();this.casts=new Map();this.labels=[];this.seen=new Set();this.statusRows=new Map();}

 material(color,opacity=1){return new T.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,toneMapped:false});}

 projectile(p){

  const g=new T.Group(),radius=p.width/2,color=DAMAGE_PALETTE[p.damageType],mat=this.material(color),id=p.traitId||'';

  const mesh=(geometry,material=mat)=>{const m=new T.Mesh(geometry,material);g.add(m);return m;};

  if(id==='elf_bow'){

   const shaft=mesh(new T.CylinderGeometry(.012,.012,.6,6));shaft.rotation.x=Math.PI/2;shaft.position.z=-.28;

   mesh(new T.ConeGeometry(radius,.18,4)).rotation.x=Math.PI/2;

  }else if(['ice_daggers','blood_shards'].includes(id)){

   for(let i=-1;i<=1;i++){const shard=mesh(new T.ConeGeometry(radius*.28,radius*2.4,4));shard.rotation.x=Math.PI/2;shard.position.set(i*radius*.55,0,-Math.abs(i)*radius*.6);}

  }else if(p.damageType==='lightning'){

   const points=[];for(let i=0;i<9;i++)points.push(new T.Vector3(i%2?radius*.5:-radius*.5,0,-i*.07));

   g.add(new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color,toneMapped:false})));

   mesh(new T.IcosahedronGeometry(radius*.55,1));

  }else{

   mesh(new T.IcosahedronGeometry(radius,2));

   const tail=mesh(new T.ConeGeometry(radius*.7,radius*3,8),this.material(color,.5));tail.rotation.x=-Math.PI/2;tail.position.z=-radius*1.7;

   if(p.damageType==='shadow'){const ring=mesh(new T.TorusGeometry(radius*.85,radius*.12,6,20));ring.rotation.x=Math.PI/2;}

   if(p.damageType==='poison')for(let i=0;i<3;i++){const m=mesh(new T.IcosahedronGeometry(radius*.35,0),this.material(color,.35));m.position.set(Math.sin(i*2)*radius*.4,Math.cos(i*2)*radius*.4,-radius*(i+1));}

  }

  g.add(new T.Mesh(new T.SphereGeometry(radius*1.2,12,8),this.material(color,.13)));

  g.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),new T.Vector3(p.dx,p.dy,p.dz).normalize());return g;

 }

 release(object){object.traverse(o=>{o.geometry?.dispose();if(o.material){o.material.map?.dispose();o.material.dispose();}});object.removeFromParent();}

 update(state,time,dt,entities){
  this.baselineFx.update(state,time,dt);

  for(const [id,row] of this.statusRows)if(!entities.has(id)){row.dispose();this.statusRows.delete(id);}
  for(const [id,entity] of entities){let row=this.statusRows.get(id);if(!row){row=statusBadgeRow(entity.actor);this.statusRows.set(id,row);}if(entity.bar)row.root.quaternion.copy(entity.bar.quaternion);row.update(state.players[id]?.statuses,time);}
  for(const [id,glow] of this.casts)if(!entities.has(id)){this.release(glow);this.casts.delete(id);}

  const ids=new Set();

  for(const p of state.projectiles){const key='p'+p.id;ids.add(key);let item=this.items.get(key);if(!item){item=this.projectile(p);this.items.set(key,item);this.root.add(item);}

   const elapsed=Math.min(.25,Math.max(0,time-state.time)),d=Math.min(elapsed*p.speed,p.range-p.distance);item.position.set(p.x+p.dx*d,p.y+p.dy*d,p.z+p.dz*d);

  }

  for(const f of state.fields){const key='f'+f.id;ids.add(key);let item=this.items.get(key);if(!item){item=new T.Mesh(new T.CylinderGeometry(f.radius,f.radius,.07,32),this.material(DAMAGE_PALETTE[f.damageType],.28));this.items.set(key,item);this.root.add(item);}item.position.set(f.x,.08,f.z);item.material.opacity=.18+.07*Math.sin(time*5);}

  for(const [key,item] of this.items)if(!ids.has(key)){this.release(item);this.items.delete(key);}

  for(const [id,entity] of entities){

   const p=state.players[id],a=p?.action;let glow=this.casts.get(id);

   if(a?.kind==='Cast'&&!a.cancelled&&time<a.start+a.duration){

    if(!glow){glow=new T.Mesh(new T.IcosahedronGeometry(.22,2),this.material('#ffffff',.3));entity.actor.add(glow);glow.position.set(-.32,2.03,.28);this.casts.set(id,glow);}

    const spell=baselineSpell(a.spellId);if(spell)glow.position.set(spell?.kind==='heal'?.38:0,spell?.kind==='heal'?2.2:1.6,spell?.kind==='heal'?.15:.7);else glow.position.set(-.32,2.03,.28);
    const phase=Math.max(0,(time-a.start)/a.duration);glow.scale.setScalar(.35+Math.sin(Math.PI*phase));

    glow.material.color.set(spell?.color||DAMAGE_PALETTE[({dark_magic:'shadow',fire_magic:'fire',lightning_magic:'lightning',water_magic:'water',ice_daggers:'frost',poison_cloud:'poison',blood_shards:'slashing'})[p.champion.loadout.magic]]);glow.rotation.y+=dt*5;

   }else if(glow){this.release(glow);this.casts.delete(id);}

  }

  for(const e of state.events){if(this.seen.has(e.id))continue;this.seen.add(e.id);if(time-e.time>1)continue;

   const status=e.type==='status',heal=e.type==='heal';if(!status&&(!heal&&e.type!=='hit'||e.amount<.5))continue;

   let sprite;
   if(status)sprite=makeStatusBadge({id:e.statusId,stacks:e.stacks||1});
   else{
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;const c=canvas.getContext('2d');c.font='bold 45px sans-serif';c.textAlign='center';c.fillStyle=heal?'#83efb2':e.critical?'#ffe273':DAMAGE_PALETTE[e.damageType]||'#ffffff';c.strokeStyle='#17131f';c.lineWidth=6;
    const text=(heal?'+':e.critical?'CRIT ':'')+Math.round(e.amount);c.strokeText(text,256,60);c.fillText(text,256,60);
    sprite=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(canvas),transparent:true,depthTest:false}));sprite.scale.set(2,.42,1);
   }
   sprite.position.set(e.x+((e.id%3)-1)*.22,status?2:1.65,e.z);this.root.add(sprite);this.labels.push({sprite,age:0,duration:status?1.5:1.2});
   while(this.labels.length>100){this.release(this.labels.shift().sprite);}

  }

  if(this.seen.size>1500)this.seen=new Set(state.events.map(e=>e.id));

  for(const label of [...this.labels]){label.age+=dt;label.sprite.position.y+=dt*.5;label.sprite.material.opacity=Math.max(0,1-label.age/label.duration);if(label.age>label.duration){this.release(label.sprite);this.labels.splice(this.labels.indexOf(label),1);}}

 }

 dispose(){this.baselineFx.dispose();for(const row of this.statusRows.values())row.dispose();this.statusRows.clear();for(const c of [...this.root.children])this.release(c);for(const c of this.casts.values())this.release(c);this.root.removeFromParent();this.items.clear();this.casts.clear();}

}

