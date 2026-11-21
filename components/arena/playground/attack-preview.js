import * as T from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {loadCharacter} from './character';
import {WeaponEffects} from './weapon-effects';
import {catalog,SKINS} from '../../../lib/playground';
const stage=document.getElementById('stage'),selector=document.getElementById('weapon'),skin=document.getElementById('skin'),status=document.getElementById('status');
const scene=new T.Scene();scene.background=new T.Color('#24343e');const actor=new T.Group();scene.add(actor);scene.add(new T.HemisphereLight('#fff5dd','#516779',2));scene.add(new T.GridHelper(16,32,'#527077','#34474f'));
const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;stage.appendChild(renderer.domElement);
const camera=new T.PerspectiveCamera(40,1,.01,60);camera.position.set(3.6,2.3,4.8);const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,1,0);controls.update();
let character,effects,request,paused=false,last=0;
for(const [id,name] of Object.entries(catalog.weapons)){const o=document.createElement('option');o.value=id;o.textContent=name;selector.appendChild(o);}for(const name of SKINS){const o=document.createElement('option');o.value=name;o.textContent=name;skin.appendChild(o);}skin.value='Undead';selector.value=new URLSearchParams(location.search).get('weapon')||'dragon_longsword';
async function choose(){request?.abort();request=new AbortController();const signal=request.signal;status.hidden=false;selector.disabled=true;
 try{const next=await loadCharacter({skin:skin.value,head:'bone',armour:'leather_garb',weapon:selector.value},t=>{if(!signal.aborted)status.textContent=t;},signal);if(signal.aborted){next.dispose();return;}effects?.dispose();character?.dispose();character=next;actor.add(character.model);character.state.setState('Hold');character.update(0,'Idle');effects=new WeaponEffects(scene,actor,character);paused=false;const p=character.attackProfile;document.getElementById('title').textContent=catalog.weapons[selector.value];document.getElementById('damage').textContent=p.damageType;document.getElementById('damage').style.color=p.color;document.getElementById('speed').textContent=p.speedFactor+'×';document.getElementById('duration').textContent=(character.state.durations.Swing/p.speedFactor).toFixed(2)+' seconds';status.hidden=true;const url=new URL(location.href);url.searchParams.set('weapon',selector.value);history.replaceState(null,'',url);}
 catch(e){if(e.name!=='AbortError')status.textContent=e.message;}finally{if(!signal.aborted)selector.disabled=false;}
}
function advance(dt){character?.update(dt,document.getElementById('walk').checked?'Walk':'Idle');effects?.update(dt);}
function render(){scene.updateMatrixWorld(true);renderer.render(scene,camera);}
selector.addEventListener('change',choose);skin.addEventListener('change',choose);document.getElementById('attack').addEventListener('click',()=>{paused=false;character?.attack();});document.getElementById('draw').addEventListener('click',()=>{paused=false;character?.toggle();});document.getElementById('pause').addEventListener('click',()=>{paused=!paused;});
const resize=new ResizeObserver(()=>{renderer.setSize(stage.clientWidth,stage.clientHeight,false);camera.aspect=stage.clientWidth/stage.clientHeight;camera.updateProjectionMatrix();render();});resize.observe(stage);
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.04,(now-(last||now))/1000);last=now;if(!paused)advance(dt);controls.update();render();}requestAnimationFrame(frame);choose();
// Deterministic capture controls for this standalone preview only.
window.attackPreview={seek(phase){paused=true;effects?.dispose();character.state.setState('Hold');character.update(0,'Idle');effects=new WeaponEffects(scene,actor,character);character.attack();effects.update(0);const seconds=phase*character.state.duration,steps=Math.max(1,Math.ceil(seconds*120));for(let i=0;i<steps;i++)advance(seconds/steps);render();return {skin:character.model.userData.skinName,profile:character.attackProfile,phase:character.state.posePhase,arcs:effects.trails.length+effects.bursts.length,projectiles:effects.projectiles.length};},view(side){camera.position.set(...(side==='side'?[4.5,2.2,1.6]:[3.6,2.3,4.8]));controls.target.set(0,1,0);controls.update();render();}};
window.addEventListener('pagehide',()=>{request?.abort();effects?.dispose();character?.dispose();controls.dispose();resize.disconnect();renderer.dispose();});
