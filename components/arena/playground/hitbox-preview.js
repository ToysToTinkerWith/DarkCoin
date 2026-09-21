import * as T from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {loadCharacter,disposeObject} from './character';
import {CombatEffects} from './combat-effects';
import {analyzeAttack,weaponIds,weaponSpec,sampleBlade} from '../../../lib/arena/attack-analysis';

const $=id=>document.getElementById(id),stage=$('stage'),scene=new T.Scene();
scene.background=new T.Color('#111a21');scene.add(new T.HemisphereLight('#fff0db','#6c8492',2.4));
const key=new T.DirectionalLight('#fff6e5',3);key.position.set(-3,7,4);scene.add(key);
scene.add(new T.GridHelper(40,40,'#52616a','#26343e'));
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;stage.appendChild(renderer.domElement);
const hud=document.createElement('canvas');hud.className='hud';stage.appendChild(hud);const ctx=hud.getContext('2d');
const camera=new T.PerspectiveCamera(38,1,.05,80),controls=new OrbitControls(camera,renderer.domElement);controls.enablePan=false;
const actor=new T.Group();scene.add(actor);let character,analysis,id,clock=0,playing=true,previous=0,controller,overlay=new T.Group(),guides=new T.Group(),projectileVisual;
scene.add(overlay,guides);const combatVisuals=new CombatEffects(scene);
const red='#ff939a',fmt=(n,d=1)=>n.toFixed(d),duration=()=>analysis.cycleSeconds;
const finish=()=>analysis.projectile?Math.max(duration(),analysis.releaseSeconds+analysis.projectile.flightSeconds):duration();
const total=()=>finish()+.7;
const material=(opacity=.22)=>new T.MeshBasicMaterial({color:red,transparent:true,opacity,depthWrite:false,side:T.DoubleSide});

function line(points,color=red,opacity=.6){return new T.Line(new T.BufferGeometry().setFromPoints(points.map(p=>new T.Vector3(...p))),new T.LineBasicMaterial({color,transparent:true,opacity,depthWrite:false}));}
function circle(radius){const g=new T.Group(),disc=new T.Mesh(new T.CircleGeometry(radius,48),material());disc.rotation.x=-Math.PI/2;g.add(disc);const ring=new T.Mesh(new T.RingGeometry(Math.max(0,radius-.009),radius+.009,48),material(.85));ring.rotation.x=-Math.PI/2;g.add(ring);return g;}
function capsule(a,b,r){
 const g=new T.Group();for(const p of [a,b]){const c=circle(r);c.position.set(...p);g.add(c);}
 // True 3D collision volume, with circular horizontal cross-sections for top-down reading.
 const av=new T.Vector3(...a),bv=new T.Vector3(...b),delta=bv.clone().sub(av),length=delta.length();
 const body=new T.Mesh(new T.CapsuleGeometry(r,length,6,12),material(.16));body.position.copy(av).add(bv).multiplyScalar(.5);if(length>0)body.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());g.add(body);
 g.add(line([a,b],red,.9));return g;
}
function clear(group){disposeObject(group);const next=new T.Group();scene.add(next);return next;}
function top(){camera.position.set(0,8,-3.84);controls.target.set(0,.55,.35);controls.update();}
function drawGuides(){
 guides=clear(guides);if(!$('paths').checked)return;
 guides.add(line([[0,.018,0],[0,.018,3]],'#81cdbd',.55));
 if(analysis.projectile){const p=analysis.origin;guides.add(line([[p[0],.025,p[2]],[p[0],.025,p[2]+analysis.projectile.maxRangeM]],red,.5));return;}
 analysis.strikes.forEach((s,i)=>{
  guides.add(line(s.samples.map(b=>[b.outer[0],.024+i*.002,b.outer[2]]),red,.5));
  if(id==='wooden_club')return; // An overhead pass crosses the root; a floor semicircle is misleading.
  const r=s.tipRadiusM.max+.28,points=[];
  for(let n=0;n<=100;n++){const angle=(s.minDegrees+(s.maxDegrees-s.minDegrees)*n/100)*Math.PI/180;points.push([Math.sin(angle)*r,.022,Math.cos(angle)*r]);}
  guides.add(line(points,red,.65));for(const angle of [s.minDegrees,s.maxDegrees]){const a=angle*Math.PI/180;guides.add(line([[0,.022,0],[Math.sin(a)*r,.022,Math.cos(a)*r]],red,.3));}
 });
}
function summary(){
 $('title').textContent=analysis.name;$('cycle').textContent=fmt(duration(),2)+' s';$('kind').textContent=analysis.kind;
 $('measurements').innerHTML=analysis.projectile?
  `<article><b>Projectile collider</b><p>Diameter ${fmt(analysis.projectile.widthM,2)} m · ${analysis.projectile.speedMps} m/s</p><p>Range ${analysis.projectile.maxRangeM} m · heading 0° (forward)</p><p>Release ${fmt(analysis.releaseSeconds,2)} s · flight ${fmt(analysis.projectile.flightSeconds,2)} s</p></article>`:
  analysis.strikes.map(s=>`<article><b>Strike ${s.index} · ${s.side==='L'?'left':'right'} hand</b><strong class="angle">${fmt(s.sweepDegrees)}°</strong><p>Tip bearing ${fmt(s.startDegrees)}° → ${fmt(s.endDegrees)}°</p><p>Active ${fmt(s.startSeconds,2)}–${fmt(s.endSeconds,2)} s</p><p>Tip radius ${fmt(s.tipRadiusM.min,2)}–${fmt(s.tipRadiusM.max,2)} m</p><p>Blade tilt ${fmt(s.bladePitchDegrees.min)}° to ${fmt(s.bladePitchDegrees.max)}°</p><p>Hitbox radius ${fmt(analysis.hitRadiusM,2)} m</p></article>`).join('');
 $('stats-link').href='attack-review/analysis.html';
}
async function choose(value){
 controller?.abort();controller=new AbortController();const signal=controller.signal;$('status').hidden=false;$('weapon').disabled=true;
 try{
  const c=await loadCharacter({skin:'Undead',head:'bone',armour:'leather_garb',weapon:value==='unarmed'?null:value},t=>{$('status').textContent=t;},signal);
  if(signal.aborted){c.dispose();return;}character?.dispose();character=c;actor.add(c.model);id=value;analysis=analyzeAttack(id);
  // Neutral, zero-haste cycle isolates weapon geometry from equipment stat bonuses.
  c.state.speedFactor=c.state.durations.Swing/analysis.cycleSeconds;c.state.setState('Hold');c.attack();clock=0;
  if(projectileVisual){combatVisuals.release(projectileVisual);projectileVisual=null;}
  summary();drawGuides();top();$('status').hidden=true;$('weapon').value=id;
  const url=new URL(location.href);url.searchParams.set('weapon',id);history.replaceState(null,'',url);seek(0);
 }catch(e){if(e.name!=='AbortError'){$('status').textContent=e.message;throw e;}}
 finally{if(!signal.aborted)$('weapon').disabled=false;}
}
function seek(seconds){
 if(!character)return;clock=Math.max(0,Math.min(total(),seconds));const phase=Math.min(.999999,clock/duration());
 character.state.scrub(phase*duration());character.update(0,'Idle');
 overlay=clear(overlay);let active=0,projectile=null;
 if(analysis.projectile){
  const p=analysis.projectile,age=clock-analysis.releaseSeconds;
  if(age>=0&&age<=p.flightSeconds){const [x,y,z]=analysis.origin;projectile={x,y,z:z+age*p.speedMps};
   if(!projectileVisual){projectileVisual=combatVisuals.projectile({width:p.widthM,damageType:analysis.damageType,traitId:id,dx:0,dy:0,dz:1});scene.add(projectileVisual);}
   projectileVisual.visible=true;projectileVisual.position.set(projectile.x,projectile.y,projectile.z);
   const c=circle(p.radiusM);c.position.copy(projectileVisual.position);overlay.add(c);const sphere=new T.Mesh(new T.SphereGeometry(p.radiusM,20,12),material(.18));sphere.position.copy(projectileVisual.position);overlay.add(sphere);active=1;
  }else if(projectileVisual)projectileVisual.visible=false;
 }else if(clock<=duration()){
  for(const s of analysis.strikes)if(phase>=s.startPhase&&phase<=s.endPhase){const b=sampleBlade(id,phase,s.side);overlay.add(capsule(b.inner,b.outer,analysis.hitRadiusM));active++;}
 }
 if($('follow').checked&&analysis.projectile){const z=projectile?Math.max(0,projectile.z-2.2):0;camera.position.set(0,8,z-3.84);controls.target.set(0,.55,z+.35);controls.update();}
 $('timeline').value=clock/total()*1000;$('time').textContent=fmt(clock,2)+' / '+fmt(total(),2)+' s';
 $('phase').textContent=active?(analysis.projectile?'PROJECTILE ACTIVE':'HITBOX ACTIVE'):clock>=duration()?'RECOVERY / RESET':analysis.projectile?'CAST / RELEASE':'WINDUP / RECOVERY';
 render(active,projectile);
 return {id,phase,active,projectile,time:clock};
}
function render(active=0,projectile=null){
 renderer.render(scene,camera);ctx.clearRect(0,0,hud.width,hud.height);if(!analysis)return;
 const w=hud.width;ctx.fillStyle='#101821ed';ctx.fillRect(18,18,Math.min(w-36,560),91);ctx.fillStyle='#f4f0e4';ctx.font='600 22px system-ui';ctx.fillText(analysis.name,32,49);
 ctx.fillStyle=red;ctx.font='15px system-ui';ctx.fillText(analysis.projectile?`Forward projectile · ${analysis.projectile.widthM.toFixed(2)} m diameter · ${analysis.projectile.maxRangeM} m range`:id==='wooden_club'?`Overhead strike · blade tilt ${fmt(analysis.strikes[0].bladePitchDegrees.min)}° to ${fmt(analysis.strikes[0].bladePitchDegrees.max)}°`:analysis.strikes.map(s=>`Strike ${s.index}: ${s.sweepDegrees.toFixed(1)}°`).join('    /    '),32,75);
 ctx.fillStyle='#b6c1c8';ctx.font='12px system-ui';ctx.fillText(`${clock.toFixed(2)} s  ·  ${$('phase').textContent}  ·  ${$('speed').value}× playback`,32,96);
 ctx.fillStyle='#101821df';ctx.fillRect(18,hud.height-48,Math.min(w-36,570),30);ctx.fillStyle='#ffc0c4';ctx.fillText('Red = collision volume · ground arc = measured tip sweep · grid = 1 m',29,hud.height-28);
}
const resize=new ResizeObserver(()=>{const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h,false);hud.width=w;hud.height=h;camera.aspect=w/h;camera.updateProjectionMatrix();if(character)seek(clock);});resize.observe(stage);
for(const value of weaponIds){const option=document.createElement('option');option.value=value;option.textContent=weaponSpec(value).name;$('weapon').appendChild(option);}
$('weapon').onchange=()=>choose($('weapon').value);$('pause').onclick=()=>{playing=!playing;$('pause').textContent=playing?'Pause':'Play';};$('restart').onclick=()=>{seek(0);playing=true;$('pause').textContent='Pause';};$('top').onclick=top;$('paths').onchange=drawGuides;
$('timeline').oninput=()=>{playing=false;$('pause').textContent='Play';seek(+$('timeline').value/1000*total());};
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.05,(now-(previous||now))/1000);previous=now;if(character&&playing&&!$('weapon').disabled){let next=clock+dt*+$('speed').value;if(next>total())next=0;seek(next);}else{controls.update();render();}}requestAnimationFrame(frame);
window.hitboxPreview={choose,seek(seconds){playing=false;return seek(seconds);},analysis:()=>analysis,ready:()=>!!character&&!$('weapon').disabled,
 async record(){
  playing=false;$('pause').textContent='Play';const canvas=document.createElement('canvas');canvas.width=1100;canvas.height=850;const c=canvas.getContext('2d'),stream=canvas.captureStream(30);
  const recorder=new MediaRecorder(stream,{mimeType:'video/mp4;codecs=avc1.42001E',videoBitsPerSecond:5000000}),chunks=[];
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};const done=new Promise(resolve=>recorder.onstop=resolve);
  recorder.start();const start=performance.now(),speed=.65;
  await new Promise(resolve=>{function tick(now){const t=(now-start)/1000*speed;seek(Math.min(t,total()));c.drawImage(renderer.domElement,0,0,1100,850);c.drawImage(hud,0,0,1100,850);if(t>=total())resolve();else requestAnimationFrame(tick);}requestAnimationFrame(tick);});
  recorder.stop();await done;stream.getTracks().forEach(t=>t.stop());const blob=new Blob(chunks,{type:'video/mp4'}),buffer=await blob.arrayBuffer();
  let binary='';const bytes=new Uint8Array(buffer);for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(binary);
 },
 socketError(phase){seek(phase*duration());let max=0;for(const s of character.attackSockets){const b=sampleBlade(id,phase,s.side);for(const key of ['inner','outer'])max=Math.max(max,s.bone.localToWorld(s[key].clone()).distanceTo(new T.Vector3(...b[key])));}return max;}
};
choose(new URLSearchParams(location.search).get('weapon')||'dragon_longsword');
window.addEventListener('pagehide',()=>{controller?.abort();character?.dispose();combatVisuals.dispose();disposeObject(overlay);disposeObject(guides);controls.dispose();resize.disconnect();renderer.dispose();});
