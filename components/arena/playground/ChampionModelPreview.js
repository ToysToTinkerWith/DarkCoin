import React,{useEffect,useRef,useState} from 'react';
import * as T from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {loadCharacter,disposeObject} from './character';
import {selectedSpell} from './spell-selection';
import {ChampionSpellPlayback} from './champion-spell-playback';
import {ChampionAttackPlayback} from './champion-attack-playback';
import {makeArena} from './world';
import StatIcon from './StatIcon';

export default function ChampionModelPreview({champion,onReady,playing=true,mode='idle',spellId}){
 const attack=mode!=='idle';
 const host=useRef(null),controlsRef=useRef(null),[status,setStatus]=useState('Preparing your champion…'),[failed,setFailed]=useState(false),[retry,setRetry]=useState(0);
 const readyRef=useRef(onReady),playingRef=useRef(playing);readyRef.current=onReady;playingRef.current=playing;
 useEffect(()=>{
  const controller=new AbortController(),container=host.current;let renderer,controls,character,playback,frame,observer,visibility;
  let visible=true,elapsed=0,reportAt=0;container.dataset.previewTime='0';container.dataset.spell='';
  readyRef.current?.(false);setFailed(false);setStatus('Preparing your champion…');
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(38,1,.05,100),clock=new T.Clock(),bounds=new T.Box3();
  const target=new T.Vector3(0,1,.2);
  const orient=side=>{
   if(!controls)return;
   const angle=side==='back'?Math.PI:side==='side'?Math.PI/2:.18;
   const direction=side==='top'?new T.Vector3(.2,1,.68).normalize():new T.Vector3(Math.sin(angle),.09,Math.cos(angle)).normalize();
   const right=new T.Vector3().crossVectors(T.Object3D.DEFAULT_UP,direction).normalize(),up=new T.Vector3().crossVectors(direction,right);
   let width=1.4,height=2.2;
   if(!bounds.isEmpty())for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
    const p=new T.Vector3(x,y,z).sub(target);width=Math.max(width,Math.abs(p.dot(right))*2);height=Math.max(height,Math.abs(p.dot(up))*2);
   }
   const distance=Math.max(4.2,Math.max(height,width/camera.aspect)/(2*Math.tan(T.MathUtils.degToRad(camera.fov/2)))*1.17);
   camera.position.copy(target).addScaledVector(direction,distance);controls.target.copy(target);controls.update();
  };
  controlsRef.current=orient;
  try{
   renderer=new T.WebGLRenderer({antialias:true,alpha:!attack,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
   renderer.domElement.setAttribute('aria-label',attack?'Live 3D champion attack. Drag to orbit, right-drag to pan, scroll or pinch to zoom.':'Idle 3D champion. Drag to orbit, right-drag to pan, scroll or pinch to zoom.');renderer.domElement.setAttribute('role','img');container.appendChild(renderer.domElement);
   controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.enablePan=true;controls.minPolarAngle=.15;controls.maxPolarAngle=Math.PI*.49;controls.minDistance=1.4;controls.maxDistance=32;
   controls.mouseButtons={LEFT:T.MOUSE.ROTATE,MIDDLE:T.MOUSE.DOLLY,RIGHT:T.MOUSE.PAN};
   let world;
   if(attack){world=makeArena(scene);world.target.visible=false;}
   else{
    scene.add(new T.HemisphereLight(0xdde8ff,0x66605a,2));
    for(const [colour,intensity,pos] of [[0xffeed8,3,[3,5,4]],[0x99bbff,2,[-3,3,-3]],[0xffffff,1,[-4,2,3]]]){const light=new T.DirectionalLight(colour,intensity);light.position.set(...pos);scene.add(light);}
    const plinth=new T.Mesh(new T.CylinderGeometry(.72,.8,.08,72),new T.MeshStandardMaterial({color:0x23242a,roughness:.75,metalness:.35}));plinth.position.y=-.055;scene.add(plinth);
    const ring=new T.Mesh(new T.TorusGeometry(.76,.006,8,96),new T.MeshBasicMaterial({color:0xaaa99b}));ring.rotation.x=Math.PI/2;ring.position.y=-.007;scene.add(ring);
   }
   observer=new ResizeObserver(()=>{if(!container.clientWidth||!container.clientHeight)return;renderer.setSize(container.clientWidth,container.clientHeight);camera.aspect=container.clientWidth/container.clientHeight;camera.updateProjectionMatrix();});observer.observe(container);
   visibility=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;});visibility.observe(container);
   camera.aspect=Math.max(1,container.clientWidth)/Math.max(1,container.clientHeight);camera.updateProjectionMatrix();orient(attack?'top':'front');
   const draw=()=>{
    frame=requestAnimationFrame(draw);const dt=Math.min(clock.getDelta(),.05);if(!visible||document.hidden)return;
    elapsed+=dt;const state=playback?playback.update(playingRef.current?dt*.65:0):{time:0,active:0};if(!attack)character?.update(dt,'Idle');controls.update();world?.update(elapsed);renderer.render(scene,camera);
    if(state&&elapsed-reportAt>.1){reportAt=elapsed;container.dataset.previewTime=state.time.toFixed(4);container.dataset.playing=String(attack&&playingRef.current);container.dataset.pose=character?.state.poseAction||'loading';container.dataset.activeHitboxes=String(state.active);container.dataset.camera=camera.position.toArray().map(n=>n.toFixed(3)).join(',');container.dataset.cameraTarget=controls.target.toArray().map(n=>n.toFixed(3)).join(',');}
   };draw();
   loadCharacter(champion.loadout,setStatus,controller.signal).then(result=>{
    if(controller.signal.aborted){result.dispose();return;}character=result;scene.add(result.model);if(mode==='spell')playback=new ChampionSpellPlayback(scene,result,champion,spellId);else if(attack)playback=new ChampionAttackPlayback(scene,result,champion.loadout.weapon);else result.update(0,'Idle');scene.updateMatrixWorld(true);
    bounds.setFromObject(result.model);
    if(mode==='spell'){const spell=selectedSpell(champion.loadout,spellId),radius=spell.area?.radiusM||.4,depth=spell.area?spell.area.distanceM+radius:spell.projectile?Math.min(4,spell.projectile.maxRangeM):0;if(depth)for(const sign of [-1,1])bounds.expandByPoint(new T.Vector3(sign*radius,0,depth));}
    for(const list of playback?.motion?.frames||[])for(const socket of list)for(const key of ['inner','outer'])bounds.expandByPoint(new T.Vector3(...socket[key]));
    bounds.expandByScalar(.18);bounds.getCenter(target);target.y=Math.max(.8,target.y);
    orient(attack?'top':'front');container.dataset.spell=spellId||'';container.dataset.championId=String(champion.id);container.dataset.weapon=champion.loadout.weapon||'unarmed';setStatus('');readyRef.current?.(true);
   }).catch(e=>{if(!controller.signal.aborted){setFailed(true);setStatus(e.message||'The 3D preview could not load.');}});
  }catch(e){setFailed(true);setStatus('The 3D preview requires WebGL. Try another browser or enable graphics acceleration.');}
  return()=>{controller.abort();cancelAnimationFrame(frame);observer?.disconnect();visibility?.disconnect();controls?.dispose();playback?.dispose();character?.dispose();disposeObject(scene);renderer?.dispose();renderer?.forceContextLoss();renderer?.domElement.remove();controlsRef.current=null;};
 },[champion,retry,mode,spellId]);
 return <div className={attack?"championStage championAttackStage":"championStage"} data-preview-mode={mode}><div className="championStageLabel"><span className="championLiveDot"/> {mode==='spell'?'YOUR CHAMPION · SPELL PREVIEW':attack?'YOUR CHAMPION · LIVE 3D ATTACK':'YOUR CHAMPION · IDLE PREVIEW'}</div><div className="championViewport" ref={host}/>{status&&<div className="championModelStatus" role={failed?'alert':'status'}><span>{status}</span>{failed&&<button onClick={()=>setRetry(n=>n+1)}>Reload model</button>}</div>}<div className="championViewTools"><div>{['top','front','side','back'].map(side=><button key={side} onClick={()=>controlsRef.current?.(side)} aria-label={`View ${attack?'attack':'champion'} from ${side}`}>{side}</button>)}</div><small><StatIcon name="rotate"/> Drag to orbit · Right-drag to pan · Scroll / pinch to zoom</small></div></div>;
}
