import {sampleJump} from '../../../lib/arena/jump';
import SpellCooldownButton from './SpellCooldownButton';
import {baselineSpell} from '../../contracts/Arena/baselineSpells';
import StatIcon from './StatIcon';
import StatusEffects from './StatusEffects';
import React,{useEffect,useRef,useState} from 'react';
import * as T from 'three';
import {makeArena} from './world';
import {makeTrainingDummy} from './training-dummy';
import {loadCharacter,disposeObject,wingWeapon} from './character';
import {movementClip,catalog} from '../../../lib/playground';
import {WeaponEffects} from './weapon-effects';
import {CombatEffects} from './combat-effects';
import {ArenaConnection} from './arena-network';
import {MovementPrediction,RemoteInterpolation} from './prediction';

export default function ArenaCanvas({champion,onExit}){
 const host=useRef(null),controls=useRef(null);
 const [loading,setLoading]=useState('Loading your champion…'),[error,setError]=useState(''),[paused,setPaused]=useState(false),[dead,setDead]=useState(false),[hint,setHint]=useState(''),[hud,setHud]=useState(null);
 useEffect(()=>{
  const parent=host.current,abort=new AbortController(),entities=new Map(),pending=new Set(),keys=new Set(),listeners=[];
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(43,1,.1,130),cameraTarget=new T.Vector3(),focus=new T.Vector3();
  const pointer=new T.Vector2(),ray=new T.Raycaster(),plane=new T.Plane(new T.Vector3(0,1,0),0),hit=new T.Vector3();
  let renderer,connection,fx,frame,disposed=false,last=0,pause=false,aiming=false,zoom=1,state=champion.session?.state||{time:Date.now()/1000,players:{},events:[],projectiles:[],fields:[]},received=performance.now(),offset=0,lastHud=0,noticeTimer;
  let selfId=champion.session?.playerId;
  const realtime=champion.session?.transport==='websocket',prediction=new MovementPrediction(),interpolation=new RemoteInterpolation();
  const metrics={frames:0,last:performance.now(),fps:0};
  const listen=(el,type,fn,opts)=>{el.addEventListener(type,fn,opts);listeners.push(()=>el.removeEventListener(type,fn,opts));};
  const notify=(message,fatal=false)=>{if(disposed)return;if(fatal)setError(message);else{setHint(message);clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>setHint(''),2400);}};
  const setPause=value=>{pause=value;keys.clear();setPaused(value);};
  const action=kind=>{if(!pause&&state?.players[selfId])connection?.action(kind);};
  controls.current={toggle:()=>action('toggle'),attack:()=>action('attack'),cast:()=>action('cast'),baseline:()=>action('baseline'),jump:()=>action('jump'),pause:()=>setPause(true),resume:()=>{setPause(false);renderer?.domElement.focus();}};
  function deleteEntity(id){const e=entities.get(id);if(!e)return;e.effects.dispose();e.character.dispose();disposeObject(e.actor);entities.delete(id);}
  function receive(next,latency=0){
   if(disposed)return;selfId=champion.session.playerId;state=next;received=performance.now();offset=Math.min(.3,latency);
   if(realtime){interpolation.add(next);if(next.players[selfId])prediction.reconcile({...next.players[selfId],time:next.time},received/1000,offset);}
   if(!next.players[selfId]){const death=next.events.some(e=>e.playerId===selfId&&e.type==='death');if(death)setDead(true);else setError('Your champion left the arena after the connection was interrupted. Select it again to rejoin.');keys.clear();connection?.close();}
   for(const id of entities.keys())if(!next.players[id])deleteEntity(id);
   for(const p of Object.values(next.players))if(!entities.has(p.id)&&!pending.has(p.id)){
    pending.add(p.id);
    loadCharacter(p.champion.loadout,message=>{if(p.id===selfId&&!disposed)setLoading(message);},abort.signal).then(character=>{
     pending.delete(p.id);if(disposed||!state.players[p.id]){character.dispose();return;}
     const actor=new T.Group();scene.add(actor);actor.add(character.model);actor.position.set(p.x,0,p.z);actor.rotation.y=p.yaw;
     if(p.id!==selfId)character.model.traverse(o=>{if(o.isMesh)o.castShadow=false;});
     const effects=new WeaponEffects(scene,actor,character);effects.serverProjectiles=true;
     const bar=new T.Group(),back=new T.Mesh(new T.PlaneGeometry(.72,.065),new T.MeshBasicMaterial({color:0x20202c,depthTest:false})),health=new T.Mesh(new T.PlaneGeometry(.68,.045),new T.MeshBasicMaterial({color:p.id===selfId?0x73e5bc:0xf16983,depthTest:false}));bar.add(back,health);health.position.z=.001;bar.position.y=2.55;actor.add(bar);
     entities.set(p.id,{actor,character,effects,bar,health});if(p.id===selfId){setLoading('');renderer.domElement.focus();}
    }).catch(e=>{pending.delete(p.id);if(!disposed&&e.name!=='AbortError')notify(p.id===selfId?e.message:'A champion model could not load. Re-enter to retry.',p.id===selfId);});
   }
  }
  try{
   if(!champion.session)throw new Error('Enter through the champion selector to start a verified arena session.');
   renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;parent.appendChild(renderer.domElement);
   const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('aria-label','Multiplayer arena. WASD move, Shift run, Space jump, mouse aim, right click draw or stow, left click attack, E cast equipped magic, Q cast your baseline spell.');
   const world=makeArena(scene),dummy=makeTrainingDummy(scene);fx=new CombatEffects(scene);
   const resize=()=>{renderer.setSize(parent.clientWidth,parent.clientHeight,false);camera.aspect=parent.clientWidth/parent.clientHeight;camera.updateProjectionMatrix();};
   const observer=new ResizeObserver(resize);observer.observe(parent);listeners.push(()=>observer.disconnect());resize();
   const initial=state.players[selfId];if(initial){focus.set(initial.x,1,initial.z);cameraTarget.copy(focus);}
   listen(canvas,'pointermove',e=>{const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);aiming=true;});
   listen(canvas,'contextmenu',e=>e.preventDefault());listen(canvas,'wheel',e=>{e.preventDefault();zoom=Math.max(.62,Math.min(1.55,zoom+e.deltaY*.0006));},{passive:false});
   listen(canvas,'pointerdown',e=>{canvas.focus();if(e.button===2){e.preventDefault();action('toggle');}else if(e.button===0)action('attack');});
   listen(canvas,'keydown',e=>{if(['KeyW','KeyA','KeyS','KeyD','ShiftLeft','ShiftRight','Escape','KeyE','KeyQ','Space'].includes(e.code)){e.preventDefault();if(e.code==='Escape'){if(!e.repeat)setPause(!pause);}else if(e.code==='Space'){if(!e.repeat)action('jump');}else if(e.code==='KeyE'||e.code==='KeyQ'){if(!e.repeat)action(e.code==='KeyQ'?'baseline':'cast');}else if(!pause)keys.add(e.code);}});
   listen(window,'keyup',e=>keys.delete(e.code));listen(canvas,'blur',()=>keys.clear());listen(window,'blur',()=>setPause(true));listen(document,'visibilitychange',()=>{if(document.hidden)setPause(true);});
   listen(canvas,'webglcontextlost',e=>{e.preventDefault();notify('The graphics context was lost. Leave and re-enter the arena.',true);});
   connection=new ArenaConnection(champion.session,receive,notify);
   connection.intentProvider=()=>{
    const self=state.players[selfId],input=new T.Vector2((keys.has('KeyA')?1:0)-(keys.has('KeyD')?1:0),(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0));if(input.lengthSq()>1)input.normalize();
    let yaw=self?.yaw||0;if(self&&aiming){ray.setFromCamera(pointer,camera);if(ray.ray.intersectPlane(plane,hit))yaw=Math.atan2(hit.x-self.x,hit.z-self.z);}
    return {x:pause?0:input.x,z:pause?0:input.y,yaw,run:!pause&&(keys.has('ShiftLeft')||keys.has('ShiftRight'))};
   };
   connection.start();
   function tick(now){
    if(disposed)return;frame=requestAnimationFrame(tick);const dt=Math.min((now-(last||now))/1000,.06);last=now;
    const elapsed=(now-received)/1000+offset,age=Math.min(.3,elapsed),time=state.time+Math.min(1.3,elapsed),self=state.players[selfId];
    if(self){
     const input=new T.Vector2((keys.has('KeyA')?1:0)-(keys.has('KeyD')?1:0),(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0));if(input.lengthSq()>1)input.normalize();
     let yaw=self.yaw;
     if(aiming){ray.setFromCamera(pointer,camera);if(ray.ray.intersectPlane(plane,hit)){yaw=Math.atan2(hit.x-self.x,hit.z-self.z);world.target.visible=true;world.target.position.set(hit.x,.025,hit.z);}}
     connection.setIntent({x:pause?0:input.x,z:pause?0:input.y,yaw,run:!pause&&(keys.has('ShiftLeft')||keys.has('ShiftRight'))});
    }
    const predicted=realtime&&self&&now-Math.max(received,connection.lastControlAt||0)<300?prediction.step(connection.intent,dt,now/1000,time):null;
    for(const [id,e] of entities){
     const p=state.players[id];if(!p)continue;
     const visual=realtime?(id===selfId?predicted:interpolation.sample(id,time-Math.min(.18,.1+(connection.jitter||0)/2000))):null;
     const target=new T.Vector3(visual?.x??p.x+p.vx*age,sampleJump(p.jumpStart,time).height,visual?.z??p.z+p.vz*age);
     if(visual)e.actor.position.copy(target);else e.actor.position.lerp(target,1-Math.exp(-dt*16));e.actor.position.y=target.y;
     const yaw=visual?.yaw??p.yaw,diff=Math.atan2(Math.sin(yaw-e.actor.rotation.y),Math.cos(yaw-e.actor.rotation.y));e.actor.rotation.y+=diff*(1-Math.exp(-dt*20));
     e.character.sync(p,time);
     // Animation locomotion advances separately; action phase remains server-timed.
     const gait=visual||p;e.character.update(dt,movementClip(gait.vx,gait.vz,gait.yaw,gait.running));e.effects.update(dt);
     e.bar.quaternion.copy(camera.quaternion);e.bar.quaternion.premultiply(e.actor.quaternion.clone().invert());e.health.scale.x=Math.max(0,p.hp/p.maxHealth);e.health.position.x=-(1-e.health.scale.x)*.34;
     if(id===selfId)focus.set(e.actor.position.x,1,e.actor.position.z);
    }
    dummy.update(state.dummy,time,dt);fx.update(state,time,dt,entities);
    metrics.frames++;if(now-metrics.last>=2000){metrics.fps=metrics.frames*1000/(now-metrics.last);metrics.frames=0;metrics.last=now;parent.dataset.fps=metrics.fps.toFixed(0);parent.dataset.rtt=String(Math.round(connection.rtt||0));parent.dataset.drawCalls=String(renderer.info.render.calls);parent.dataset.correction=prediction.correction.toFixed(3);}
    if(now-lastHud>150){lastHud=now;setHud(self?{...self,time,players:Object.keys(state.players).length,cooldown:Math.max(0,self.cooldownUntil-time),baselineCooldown:Math.max(0,(self.baselineCooldownUntil||0)-time),castRemaining:self.action?.kind==='Cast'?Math.max(0,self.action.start+self.action.duration-time):0}:null);}
    cameraTarget.lerp(focus,1-Math.exp(-dt*8));camera.position.copy(cameraTarget).add(new T.Vector3(0,5.9*zoom,-8.5*zoom));camera.lookAt(cameraTarget);camera.updateMatrixWorld();world.update(time);renderer.render(scene,camera);
   }
   frame=requestAnimationFrame(tick);
  }catch(e){setLoading('');setError(e.message);}
  return()=>{disposed=true;connection?.close();abort.abort();cancelAnimationFrame(frame);clearTimeout(noticeTimer);listeners.forEach(fn=>fn());controls.current=null;fx?.dispose();for(const id of entities.keys())deleteEntity(id);disposeObject(scene);renderer?.dispose();renderer?.domElement.remove();};
 },[champion]);
 const spell=baselineSpell(champion.baselineSpell);
 const permanent=wingWeapon(champion.loadout.weapon)||!champion.loadout.weapon,blocked=!!loading||!!error||paused||dead;
 const status=hud?.action?({Cast:'Casting magic',Swing:'Attacking',Draw:'Drawing',Stow:'Stowing'})[hud.action.kind]:(hud?.carry==='Hold'?'Weapon ready':'Weapon stowed');
 return <div className="playgroundGame">
  <div ref={host} className="playgroundCanvas"/>
  <div className="playgroundHud"><div><span className="playgroundEyebrow">SHARED ARENA · {hud?.players||1}/8 CHAMPIONS</span><strong>{champion.name}</strong><small>{status}</small>{hud&&<><div aria-label="Health">HP {Math.ceil(hud.hp)} / {hud.maxHealth}{hud.barrier>0?' · Barrier '+Math.ceil(hud.barrier):''}</div><meter min="0" max={hud.maxHealth} value={hud.hp} style={{width:'100%',accentColor:'#73e5bc'}}/><small>Stamina {Math.floor(hud.stamina)} / {hud.maxStamina}</small>{hud.statuses.length>0&&<StatusEffects statuses={hud.statuses}/>}{(hud.buffs||[]).map(b=>{const s=baselineSpell(b.spellId);return s&&<small key={b.spellId} title={s.description} style={{color:s.color,display:'flex',alignItems:'center',gap:6}}><StatIcon name={s.buff.icon}/>{s.buff.name}</small>;})}</>}
   <dl className="playgroundEquippedTraits"><div><dt>Skin</dt><dd>{champion.loadout.skin}</dd></div><div><dt>Magic</dt><dd>{catalog.magic[champion.loadout.magic]||'None'}</dd></div></dl></div><button onClick={onExit}>Leave arena</button></div>
  <div className="playgroundHelp"><span><kbd>WASD</kbd> Move</span><span><kbd>Shift</kbd> Run</span><span><kbd>Space</kbd> Jump</span><span>Mouse · Aim</span><span>RMB · Draw/stow</span><span>LMB · Attack</span>{champion.loadout.magic&&<span><kbd>E</kbd> Magic</span>}{spell&&<span><kbd>Q</kbd> {spell.name}</span>}</div>
  <div className="playgroundActions">{!permanent&&<button disabled={blocked||!!hud?.action} onClick={()=>controls.current?.toggle()}>Draw / stow</button>}<button disabled={blocked||!!hud?.action} onClick={()=>controls.current?.attack()}>{permanent||hud?.carry==='Carry'?'Punch':'Attack'}</button><button disabled={blocked||sampleJump(hud?.jumpStart,hud?.time||0).active} onClick={()=>controls.current?.jump()}>Jump · Space</button>{champion.loadout.magic&&<SpellCooldownButton name={catalog.magic[champion.loadout.magic]||'Magic'} hotkey="E" start={hud?.magicCooldownStart} end={hud?.cooldownUntil} time={hud?.time} action={hud?.action} blocked={blocked} onClick={()=>controls.current?.cast()}/>}{spell&&<SpellCooldownButton name={spell.name} hotkey="Q" color={spell.color} icon={spell.icon} baseline start={hud?.baselineCooldownStart} end={hud?.baselineCooldownUntil} time={hud?.time} action={hud?.action} blocked={blocked} onClick={()=>controls.current?.baseline()}/>}<button onClick={()=>controls.current?.pause()}>Controls</button></div>
  {hint&&<div className="playgroundHint" role="status">{hint}</div>}
  {(loading||error||paused||dead)&&<div className="playgroundOverlay"><div><span className="playgroundEyebrow">DARK COIN ARENA</span><h2>{dead?'Champion defeated':error?'Connection interrupted':loading?'Preparing your champion':'Controls paused'}</h2><p role={error?'alert':'status'}>{dead?'Your champion has been removed from the arena. Select a champion to enter again.':error||loading||'The shared arena remains live. Your champion can still take damage.'}</p>{paused&&!loading&&!error&&!dead&&<button className="playgroundPrimary" onClick={()=>controls.current?.resume()}>Resume</button>}{(error||dead)&&<button className="playgroundPrimary" onClick={onExit}>Back to champions</button>}</div></div>}
 </div>;
}
