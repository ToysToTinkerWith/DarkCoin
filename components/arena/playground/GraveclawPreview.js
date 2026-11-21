import React,{useEffect,useRef,useState} from 'react';
import * as T from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {loadBeast} from './beast';
import {GRAVECLAW,beastClawAt} from '../../../lib/arena/beast';
import styles from './GraveclawPanel.module.css';

export default function GraveclawPreview({attack=false,clip='Claw'}){
 const host=useRef(null),paused=useRef(false),[playing,setPlaying]=useState(true),[status,setStatus]=useState('Loading Graveclaw…');
 useEffect(()=>{
  paused.current=false;setPlaying(true);setStatus('Loading Graveclaw…');
  const container=host.current,scene=new T.Scene(),camera=new T.PerspectiveCamera(38,1,.05,60);
  let renderer,controls,beast,frame,resize,visibility,closed=false,visible=true,elapsed=0,last=performance.now();
  container.dataset.clip=attack?clip:'Idle';delete container.dataset.ready;
  const boxes=[];
  const cleanup=()=>{closed=true;cancelAnimationFrame(frame);resize?.disconnect();visibility?.disconnect();controls?.dispose();beast?.dispose();scene.traverse(o=>{o.geometry?.dispose();for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[])m.dispose();});renderer?.dispose();renderer?.forceContextLoss();renderer?.domElement.remove();};
  try{
   renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
   renderer.domElement.setAttribute('role','img');renderer.domElement.setAttribute('aria-label',attack?`Graveclaw ${clip} animation${clip==='Claw'?' with live three-dimensional collision volumes':''}. Drag to rotate.`:'Graveclaw in 3D. Drag to rotate.');container.appendChild(renderer.domElement);
   scene.add(new T.HemisphereLight(0xdce6ff,0x5c4440,2));
   for(const [color,intensity,xyz] of [[0xffe3cf,3,[3,5,4]],[0xabc9ff,2,[-3,3,-3]],[0xffffff,1,[-4,2,3]]]){const light=new T.DirectionalLight(color,intensity);light.position.set(...xyz);scene.add(light);}
   const floor=new T.Mesh(new T.CylinderGeometry(2.05,2.12,.07,64),new T.MeshStandardMaterial({color:0x262329,roughness:.85}));floor.position.y=-.05;scene.add(floor);
   const ring=new T.Mesh(new T.TorusGeometry(2.02,.009,8,96),new T.MeshBasicMaterial({color:0x776454}));ring.rotation.x=Math.PI/2;ring.position.y=-.007;scene.add(ring);
   controls=new OrbitControls(camera,renderer.domElement);controls.enableZoom=false;controls.enablePan=false;controls.enableDamping=true;controls.minPolarAngle=.1;controls.maxPolarAngle=Math.PI*.49;controls.target.set(0,1.1,.2);
   controls.mouseButtons={LEFT:T.MOUSE.ROTATE,MIDDLE:T.MOUSE.ROTATE,RIGHT:T.MOUSE.ROTATE};
   const orient=()=>{const portrait=container.clientWidth/container.clientHeight<1;camera.position.set(...(attack?[3.8,6.2,5.8]:[2.4,2.7,5]));camera.position.sub(controls.target).multiplyScalar(portrait?1.12:1).add(controls.target);controls.update();};orient();
   for(const window of GRAVECLAW.windows){const box=new T.Mesh(new T.CapsuleGeometry(GRAVECLAW.attack.hitRadiusM,1,8,16),new T.MeshBasicMaterial({color:0xff828b,transparent:true,opacity:.48,depthWrite:false}));box.visible=false;box.userData.window=window;scene.add(box);boxes.push(box);}
   resize=new ResizeObserver(()=>{if(!container.clientWidth||!container.clientHeight)return;renderer.setSize(container.clientWidth,container.clientHeight);camera.aspect=container.clientWidth/container.clientHeight;camera.updateProjectionMatrix();});resize.observe(container);
   visibility=new IntersectionObserver(([e])=>{visible=e.isIntersecting;});visibility.observe(container);
   const up=new T.Vector3(0,1,0),a=new T.Vector3(),b=new T.Vector3();
   function draw(now){frame=requestAnimationFrame(draw);const dt=Math.min(.05,(now-last)/1000);last=now;if(!visible||document.hidden)return;
    if(!paused.current)elapsed+=dt;
    const duration=attack?GRAVECLAW.clips[clip]:GRAVECLAW.clips.Idle,phase=(elapsed*(attack?.65:1)%duration)/duration;
    beast?.preview(attack?clip:'Idle',phase);
    let active=0;
    for(const box of boxes){const w=box.userData.window;box.visible=!!beast&&attack&&clip==='Claw'&&phase>=w.start&&phase<=w.end;if(box.visible){active++;const hit=beastClawAt(phase,w.side);a.fromArray(hit.inner);b.fromArray(hit.outer);const length=a.distanceTo(b);
     // CapsuleGeometry's hemispheres must keep their radius; replace only when
     // the exact server segment length changes, never stretch an end-cap.
     if(Math.abs((box.userData.length||0)-length)>.0001){box.geometry.dispose();box.geometry=new T.CapsuleGeometry(GRAVECLAW.attack.hitRadiusM,length,8,16);box.userData.length=length;}
     box.position.copy(a).add(b).multiplyScalar(.5);box.quaternion.setFromUnitVectors(up,b.sub(a).normalize());}}
    controls.update();renderer.render(scene,camera);container.dataset.activeHitboxes=String(active);container.dataset.phase=phase.toFixed(4);container.dataset.camera=camera.position.toArray().map(n=>n.toFixed(3)).join(',');container.dataset.distance=camera.position.distanceTo(controls.target).toFixed(3);
   }frame=requestAnimationFrame(draw);
   loadBeast(scene).then(result=>{if(closed){result.dispose();return;}beast=result;setStatus('');container.dataset.ready='true';}).catch(()=>{if(!closed)setStatus('The 3D model could not load. Reload the page to retry.');});
  }catch{setStatus('3D preview unavailable on this device. Boss stats and odds are below.');}
  return cleanup;
 },[attack,clip]);
 return <div className={styles.preview}><div ref={host} className={attack?styles.attackStage:styles.stage} data-boss-preview={attack?'attack':'idle'}/>{status&&<span role="status" className={styles.loading}>{status}</span>}<div className={styles.previewFoot}><span>Drag to rotate · Scroll to browse</span>{attack&&<button onClick={()=>{paused.current=!paused.current;setPlaying(!paused.current);}}>{playing?'Pause':'Play'}</button>}</div></div>;
}
