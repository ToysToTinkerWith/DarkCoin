import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {GRAVECLAW,beastClawAt} from '../../../lib/arena/beast';
import {beastMagicEffects} from './beast-magic';
import {statusBadgeRow} from './status-badges';
import {disposeObject} from './character';
export async function loadBeast(scene){
 const gltf=await new GLTFLoader().loadAsync('/arena/playground/assets/beasts/graveclaw.glb?v=mana1');
 const actor=new T.Group();actor.name='Graveclaw NPC';scene.add(actor);actor.add(gltf.scene);
 gltf.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;}});
 const mixer=new T.AnimationMixer(gltf.scene),actions=Object.fromEntries(gltf.animations.map(c=>[c.name,mixer.clipAction(c)]));
 const titleCanvas=document.createElement('canvas');titleCanvas.width=512;titleCanvas.height=100;const ctx=titleCanvas.getContext('2d');ctx.font='bold 40px sans-serif';ctx.textAlign='center';ctx.fillStyle='#17151d';ctx.fillRect(10,10,492,78);ctx.fillStyle='#f2c1aa';ctx.fillText('GRAVECLAW',256,64);
 const title=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(titleCanvas),depthTest:false}));title.position.y=2.93;title.scale.set(1.7,.33,1);actor.add(title);
 const bars=new T.Group();actor.add(bars);bars.position.y=2.68;
 function bar(y,color){const bg=new T.Sprite(new T.SpriteMaterial({color:'#201d25',depthTest:false}));bg.scale.set(1.08,.075,1);bg.position.y=y;bars.add(bg);const fg=new T.Sprite(new T.SpriteMaterial({color,depthTest:false}));fg.scale.set(1,.048,1);fg.position.y=y;fg.renderOrder=2;bars.add(fg);return fg;}
 const health=bar(0,'#d85e66'),stamina=bar(-.10,'#d2b571'),mana=bar(-.20,'#83adff'),magic=beastMagicEffects(actor),badges=statusBadgeRow(actor,3.23);
 const telegraph=new T.Mesh(new T.RingGeometry(.85,1.7,48,1,Math.PI*.16,Math.PI*.68),new T.MeshBasicMaterial({color:'#f97772',transparent:true,opacity:.19,side:T.DoubleSide,depthWrite:false}));telegraph.rotation.x=Math.PI/2;telegraph.position.y=.026;actor.add(telegraph);telegraph.visible=false;
 const trails=[];for(const side of [-1,1])for(let i=0;i<7;i++){const m=new T.Mesh(new T.SphereGeometry(.07,8,6),new T.MeshBasicMaterial({color:'#fac2ac',transparent:true,opacity:0,depthWrite:false}));actor.add(m);trails.push({m,side,lag:i*.006});}
 let active=null,gait=0,lastHP=GRAVECLAW.maxHealth,flash=0,spawn=null;
 function animation(name,phase,dt){const next=actions[name];if(!next)return;if(active!==name){for(const a of Object.values(actions))a.stop();next.play();active=name;}next.paused=true;next.time=Math.min(next.getClip().duration-.000001,Math.max(0,phase)*next.getClip().duration);mixer.update(0);}
 return {actor,model:gltf.scene,clips:gltf.animations,actions,
  update(state,time,dt,camera){actor.visible=!!state;if(!state)return;bars.visible=title.visible=state.hp>0;
   const respawn=spawn!==state.spawnAt;if(respawn){spawn=state.spawnAt;actor.position.set(state.x,0,state.z);actor.rotation.y=state.yaw;lastHP=state.hp;}
   const age=Math.min(.15,Math.max(0,time-(state.time??time)));
   actor.position.lerp(new T.Vector3(state.x+state.vx*age,0,state.z+state.vz*age),1-Math.exp(-dt*18));
   const angle=Math.atan2(Math.sin(state.yaw-actor.rotation.y),Math.cos(state.yaw-actor.rotation.y));actor.rotation.y+=angle*(1-Math.exp(-dt*18));
   let clip='Idle',phase=0;const a=state.action;
   if(state.hp<=0){clip='Death';phase=Math.min(1,(time-state.deathAt)/GRAVECLAW.clips.Death);actor.visible=time-state.deathAt<4;}
   else if(a){clip=a.cancelled?'Idle':a.kind;phase=Math.min(1,Math.max(0,(time-a.start)/a.duration));}
   else {clip=Math.hypot(state.vx,state.vz)>.1?(state.running?'Run':'Walk'):'Idle';gait+=dt/GRAVECLAW.clips[clip];phase=state.mode==='retreat'?1-gait%1:gait%1;}
   // Reuse the articulated walk gait for the crawl; ease the torso forward
   // while climbing from the opening, then straighten before combat starts.
   const emerging=state.emergeUntil>time,burrowing=state.mode==='burrowing',returning=state.mode==='returning';
   const smooth=n=>{n=Math.max(0,Math.min(1,n));return n*n*(3-2*n);};
   let crouch=0;
   if(emerging){const t=time-state.spawnAt;clip='Walk';phase=((Math.max(0,t-1)/1.8)%1);const rise=smooth((t-1)/4.2);actor.position.y=-2.5*(1-rise);crouch=Math.sin(rise*Math.PI)*.5;}
   else if(burrowing){const t=time-state.burrowAt;clip='Walk';phase=(t/1.8)%1;const sink=smooth(t/3.5);actor.position.y=-2.5*sink;crouch=Math.sin(sink*Math.PI)*.5;}
   else actor.position.y=0;
   if(emerging||burrowing||returning)bars.visible=title.visible=false;
   animation(clip,phase,dt);magic.update(clip,phase,time,(state.enragedUntil||0)>time);
   const chest=gltf.scene.getObjectByName('chest');if(chest&&crouch)chest.rotateX(crouch);
   telegraph.visible=clip==='Claw'&&phase<.28;telegraph.material.opacity=.1+phase*.5;
   for(const {m,side,lag} of trails){const p=phase-lag,window=GRAVECLAW.windows.find(w=>w.side===side);m.visible=clip==='Claw'&&p>=window.start&&p<=window.end;if(m.visible){m.position.fromArray(beastClawAt(p,side).outer);m.material.opacity=.62*(1-lag/.045);}}
   health.scale.x=Math.max(.001,state.hp/state.maxHealth);stamina.scale.x=Math.max(.001,state.stamina/state.maxStamina);mana.scale.x=Math.max(.001,(state.mana??0)/(state.maxMana||GRAVECLAW.maxMana));badges.update(state.statuses,time,camera);
   if(state.hp<lastHP)flash=.16;lastHP=state.hp;flash=Math.max(0,flash-dt);gltf.scene.traverse(o=>{if(o.isMesh&&o.material.name.startsWith('Ash hide')){o.material.emissive.set('#b54938');o.material.emissiveIntensity=flash*2;}});
  },preview(clip,phase){bars.visible=title.visible=false;animation(clip,phase,0);magic.update(clip,phase,phase*(GRAVECLAW.clips[clip]||2),clip==='Enrage'&&phase>.65);},
  dispose(){mixer.stopAllAction();mixer.uncacheRoot(gltf.scene);badges.dispose();disposeObject(actor);actor.removeFromParent();}};
}
