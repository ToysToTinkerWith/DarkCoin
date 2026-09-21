import * as T from 'three';
import {baselineSpell} from '../../contracts/Arena/baselineSpells';

// Visuals read authoritative release events and buff expiry, never deal damage.
export class BaselineSpellEffects{
 constructor(scene){this.root=new T.Group();scene.add(this.root);this.effects=[];this.buffs=new Map();this.seen=new Set();}
 ring(color,radius,opacity){const material=new T.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:T.DoubleSide,toneMapped:false});const m=new T.Mesh(new T.RingGeometry(radius*.88,radius,48),material);m.rotation.x=-Math.PI/2;return m;}
 disposeObject(o){o.traverse(m=>{m.geometry?.dispose();m.material?.dispose();});o.removeFromParent();}
 update(state,time,dt){
  for(const event of state.events){
   if(this.seen.has(event.id))continue;this.seen.add(event.id);if(time-event.time>1)continue;
   const spell=baselineSpell(event.spellId);if(!spell||!['heal','spellBurst','spellTelegraph'].includes(event.type))continue;
   const g=new T.Group();g.position.set(event.x,0,event.z);this.root.add(g);
   const telegraph=event.type==='spellTelegraph',heal=event.type==='heal',radius=event.radius||.64;
   const ring=this.ring(spell.color,radius,telegraph?.28:.8);ring.position.y=.045;g.add(ring);
   if(!telegraph)for(let i=0;i<16;i++){
    const p=new T.Mesh(new T.OctahedronGeometry(heal?.04:.055),new T.MeshBasicMaterial({color:spell.color,transparent:true,opacity:.9,depthWrite:false}));
    p.userData.angle=i*Math.PI/8;p.userData.height=(i%4)*.3;g.add(p);
   }
   this.effects.push({g,ring,heal,telegraph,radius,start:event.time,until:telegraph?event.until:event.time+(heal?1.4:.65)});
  }
  for(const e of [...this.effects]){
   const age=Math.max(0,time-e.start),life=Math.max(.01,e.until-e.start),phase=Math.min(1,age/life);
   e.ring.material.opacity=(e.telegraph?.2+.15*Math.sin(age*20):.8)*(1-phase*.8);
   if(!e.telegraph){e.ring.scale.setScalar(e.heal?1+phase*.2:.4+phase*.6);e.ring.position.y=e.heal?.06+phase*1.8:.05;}
   for(const p of e.g.children.slice(1)){const a=p.userData.angle+age*(e.heal?2:.3),r=e.radius*(e.heal?.8:.2+phase*.8);p.position.set(Math.sin(a)*r,e.heal?e.g.position.y+p.userData.height+age:Math.sin(phase*Math.PI)*.5,Math.cos(a)*r);p.material.opacity=1-phase;}
   if(time>=e.until){this.disposeObject(e.g);this.effects.splice(this.effects.indexOf(e),1);}
  }
  const ids=new Set();for(const p of Object.values(state.players))for(const b of p.buffs||[]){
   if(b.until<=time)continue;const spell=baselineSpell(b.spellId);if(!spell)continue;const key=p.id+':'+b.spellId;ids.add(key);
   let ring=this.buffs.get(key);if(!ring){ring=this.ring(spell.color,.62,.25);this.root.add(ring);this.buffs.set(key,ring);}ring.position.set(p.x,.035,p.z);ring.material.opacity=.16+.1*Math.sin(time*3);
  }
  for(const [id,o] of this.buffs)if(!ids.has(id)){this.disposeObject(o);this.buffs.delete(id);}
  if(this.seen.size>1000)this.seen=new Set(state.events.map(e=>e.id));
 }
 dispose(){for(const o of [...this.root.children])this.disposeObject(o);this.root.removeFromParent();this.effects=[];this.buffs.clear();}
}
