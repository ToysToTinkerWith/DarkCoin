import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRAGON,dragonSockets} from '../../../lib/arena/dragon';
import {disposeObject} from './character';
export async function loadDragon(scene){
 const gltf=await new GLTFLoader().loadAsync('/arena/playground/assets/beasts/cindermaw.glb?v=side-fall-1');
 const actor=new T.Group();actor.name='Cindermaw';actor.add(gltf.scene);scene.add(actor);
 gltf.scene.traverse(o=>{if(o.isMesh){o.frustumCulled=false;o.castShadow=true;o.receiveShadow=true;}});
 const mixer=new T.AnimationMixer(gltf.scene),actions=Object.fromEntries(gltf.animations.map(c=>[c.name,mixer.clipAction(c)]));let active;
 const fire=new T.Group();actor.add(fire);const particles=[];
 const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(32,32,0,32,32,32);
 gradient.addColorStop(0,'rgba(255,255,255,1)');gradient.addColorStop(.22,'rgba(255,255,255,.8)');gradient.addColorStop(.6,'rgba(255,255,255,.28)');gradient.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
 const texture=new T.CanvasTexture(canvas),palette=['#ffe8a0','#ffb22c','#ff7020','#b93818'];
 for(let i=0;i<160;i++){const material=new T.SpriteMaterial({map:texture,color:palette[i%4],transparent:true,opacity:.6,depthWrite:false,blending:T.AdditiveBlending});const m=new T.Sprite(material);fire.add(m);particles.push(m);}
 const glow=new T.PointLight('#ff8428',0,7,2);actor.add(glow);
 const arc=new T.Group();actor.add(arc);const arcGeo=new T.SphereGeometry(.12,8,6),arcMat=new T.MeshBasicMaterial({color:'#ffc185',transparent:true,opacity:.25,depthWrite:false});
 const traces=Array.from({length:15},()=>{const m=new T.Mesh(arcGeo,arcMat);arc.add(m);return m;});
 // Trace the authored tail path so the warning covers the actual rear arc.
 const warningPoints=[],warningIndices=[];
 for(let i=0;i<=64;i++){
  const p=dragonSockets('TailSweep',.40+.23*i/64).tail,dx=p[0],dz=p[2]+1.18;
  warningPoints.push(dx*.16,.025,-1.18+dz*.16,dx*1.07,.025,-1.18+dz*1.07);
  if(i){const a=(i-1)*2;warningIndices.push(a,a+1,a+2,a+1,a+3,a+2);}
 }
 const warningGeometry=new T.BufferGeometry();warningGeometry.setAttribute('position',new T.Float32BufferAttribute(warningPoints,3));warningGeometry.setIndex(warningIndices);
 const telegraph=new T.Mesh(warningGeometry,new T.MeshBasicMaterial({color:'#ee8374',transparent:true,opacity:.14,side:T.DoubleSide,depthWrite:false}));actor.add(telegraph);
 function sample(clip,t){
  const a=actions[clip];if(active!==clip){mixer.stopAllAction();a.play();active=clip;}a.paused=true;a.time=Math.min(t,.999999)*a.getClip().duration;mixer.update(0);gltf.scene.updateMatrixWorld(true);
  const sockets=dragonSockets(clip,t),attack=DRAGON.attacks.breath,[begin,end]=attack.active;
  const age=(t-begin)*DRAGON.clips.FlameBreath,stop=(end-begin)*DRAGON.clips.FlameBreath;
  fire.visible=clip==='FlameBreath'&&age>0&&age<stop+.45;
  const forward=new T.Vector3(...sockets.direction),right=new T.Vector3(1,0,0).applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),forward)),up=forward.clone().cross(right);
  if(fire.visible)for(let i=0;i<particles.length;i++){
   const u=((i/particles.length+age*1.65)%1),life=.43,emission=age-u*life;
   const m=particles[i];m.visible=emission>=0&&emission<=stop;
   const d=u*attack.range,angle=i*2.399963,r=(.045+d*.19)*(.3+.7*((i*37)%101)/101);
   m.position.fromArray(sockets.mouth).addScaledVector(forward,d).addScaledVector(right,Math.cos(angle)*r).addScaledVector(up,Math.sin(angle)*r);
   m.scale.set(.18+u*.83,.25+u*.95,1);m.material.rotation=age+i;m.material.opacity=(1-u)*.53;
  }
  glow.position.fromArray(sockets.mouth);glow.intensity=fire.visible?4:clip==='FlameBreath'&&t>.18&&t<begin?2:0;
  telegraph.visible=clip==='TailSweep'&&t<DRAGON.attacks.tail.active[0];arc.visible=clip==='TailSweep'&&t>.40&&t<.70;
  if(arc.visible)traces.forEach((m,i)=>{const p=t-i*.004;m.visible=p>=.40&&p<=.63;if(m.visible)m.position.fromArray(dragonSockets(clip,p).tail);});
 }
 return {actor,model:gltf.scene,clips:gltf.animations,sample,
  dispose(){mixer.stopAllAction();mixer.uncacheRoot(gltf.scene);disposeObject(actor);actor.removeFromParent();}};
}
