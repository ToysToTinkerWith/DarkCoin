// Offline announcement art uses the same geometry, crypt and clips as the game.
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {makeArena} from '../components/arena/playground/world';
import {makeGrave} from '../components/arena/playground/grave';
import {makeDarkCoinPickup} from '../components/arena/playground/dark-coin-pickup';

const scene=new T.Scene(),camera=new T.PerspectiveCamera(37,1600/675,.1,100);
camera.setViewOffset(1600,675,0,0,1200,675);
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setSize(1200,675);renderer.setPixelRatio(1);renderer.shadowMap.enabled=true;
renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.82;
document.querySelector('#scene').appendChild(renderer.domElement);
const arena=makeArena(scene);arena.target.visible=false;
const grave=makeGrave(scene),gltf=await new GLTFLoader().loadAsync('/arena/playground/assets/beasts/graveclaw.glb');
const beast=gltf.scene;scene.add(beast);
const mixer=new T.AnimationMixer(beast),clips=Object.fromEntries(gltf.animations.map(c=>[c.name,mixer.clipAction(c)]));
beast.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;o.frustumCulled=false;o.material=o.material.clone();}});
const rim=new T.DirectionalLight('#a5d5e0',5);rim.position.set(-2,4,-4);scene.add(rim);
const accent=new T.PointLight('#d49653',15,8,2);accent.position.set(0,1,2);scene.add(accent);
const coin=makeDarkCoinPickup();scene.add(coin);coin.position.set(-1.15,.06,1.4);coin.scale.setScalar(1.6);
const ring=new T.Mesh(new T.RingGeometry(.6,.64,64),new T.MeshBasicMaterial({color:'#efc777',transparent:true,opacity:.8,side:T.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.set(-1.15,.035,1.4);scene.add(ring);
const lootLight=new T.PointLight('#ffc76b',9,4,2);lootLight.position.set(-1.15,.7,1.4);scene.add(lootLight);
const sparks=new T.Group();scene.add(sparks);
for(let i=0;i<48;i++){const dot=new T.Mesh(new T.IcosahedronGeometry(.016+(i%3)*.007,0),new T.MeshBasicMaterial({color:'#e6bf80',transparent:true,opacity:.3+(i%5)*.12}));const a=i*2.399;dot.position.set(Math.sin(a)*(1.2+i%7*.12),.12+(i*17%43)/17,Math.cos(a)*(1+i%5*.16));sparks.add(dot);}
const states={
 warning:{clip:'Idle',phase:.4,angle:.18,camera:[4.6,3.1,7.6],target:[0,1.0,0],color:'#d2ac70'},
 spawn:{clip:'Claw',phase:.24,angle:.3,camera:[3.8,2.7,7.3],target:[0,1.15,0],color:'#ff6c47'},
 defeat:{clip:'Death',phase:1,angle:.45,camera:[4.2,4.2,7.4],target:[0,.55,0],color:'#f3ca75'},
 victory:{clip:'Walk',phase:.3,angle:Math.PI,camera:[4.5,3.6,7],target:[0,.7,0],color:'#8facce'},
};
window.renderEvent=async kind=>{
 const s=states[kind];if(!s)throw Error('Unknown event');
 for(const clip of Object.values(clips))clip.stop();const clip=clips[s.clip];clip.play();clip.paused=true;clip.time=Math.min(clip.getClip().duration-.000001,s.phase*clip.getClip().duration);mixer.update(0);
 grave.root.position.set(0,0,0);beast.position.set(0,0,0);beast.rotation.set(0,s.angle,0);beast.scale.setScalar(1);
 beast.traverse(o=>{if(o.isMesh){o.material.transparent=kind==='warning';o.material.opacity=kind==='warning'?.23:1;o.material.depthWrite=kind!=='warning';o.castShadow=kind!=='warning';if(o.material.name==='Ember eyes'){o.material.emissiveIntensity=kind==='defeat'?0:2.2;o.material.color.set(kind==='defeat'?'#26242b':'#ff9b4a');}}});
 grave.update({kind:'graveclaw',hp:320,spawnAt:0,emergeUntil:kind==='warning'?10:0,mode:kind==='victory'?'burrowing':'patrol',burrowAt:0},kind==='warning'?0:kind==='victory'?1.5:5);
 if(kind==='warning'){beast.position.y=.32;rim.color.set('#d4c0a0');}
 else rim.color.set(kind==='victory'?'#98bddb':'#acc5d7');
 if(kind==='victory'){beast.position.y=-.75;const chest=beast.getObjectByName('chest');chest?.rotateX(.5);}
 if(kind==='defeat'){
  // Settle the death pose onto the arena floor, rather than inside the crypt.
  beast.rotation.set(-1.5,.3,.25);beast.position.set(.4,0,1.3);beast.updateMatrixWorld(true);
  const bounds=new T.Box3().setFromObject(beast,true);beast.position.y+=.025-bounds.min.y;
  grave.update({kind:'graveclaw',hp:0,spawnAt:0,deathAt:0},5);grave.root.position.z=-2.3;
 }
 coin.visible=ring.visible=lootLight.visible=kind==='defeat';
 sparks.visible=kind!=='defeat';sparks.children.forEach(o=>o.material.color.set(s.color));accent.color.set(s.color);
 scene.fog.color.set(kind==='victory'?'#111d29':'#171c22');scene.background.copy(scene.fog.color);
 camera.position.fromArray(s.camera);camera.lookAt(...s.target);camera.updateMatrixWorld();arena.update(2);
 renderer.render(scene,camera);await document.fonts.ready;
 return {kind,clip:s.clip,vertices:beast.children.length};
};
window.artReady=true;
