import * as T from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {loadCharacter,disposeObject} from './character';
const stage=document.getElementById('stage'),selector=document.getElementById('magic'),status=document.getElementById('status'),reference=document.getElementById('reference');
const scene=new T.Scene();scene.background=new T.Color('#17272f');
scene.add(new T.HemisphereLight('#c9e2ef','#38424a',2));const sun=new T.DirectionalLight('#fff2dd',2.5);sun.position.set(-3,5,4);scene.add(sun);
const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.outputColorSpace=T.SRGBColorSpace;stage.appendChild(renderer.domElement);
const camera=new T.PerspectiveCamera(36,1,.01,50),controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=.4;controls.maxDistance=6;
let character=null,request=null,only=false,view='quarter',catalog=[],gait='Idle',last=0;
function fit(){const target=only?new T.Vector3(.20,1.68,.28):new T.Vector3(0,1.58,.08);if(only&&['fire_magic','water_magic','lightning_magic','poison_cloud'].includes(selector.value))target.x=0;controls.target.copy(target);const direction={front:[0,.025,1],quarter:[.6,.13,1],side:[1,.02,.05],back:[0,.05,-1]}[view];camera.position.copy(target).add(new T.Vector3(...direction).normalize().multiplyScalar(only?1.65:2.05));controls.update();}
function visibility(){character?.model.traverse(o=>{if(o.isMesh)o.visible=only?o.userData.trait==='04_Magic':o.userData.weapon_component!=='carrier';});document.getElementById('isolate').setAttribute('aria-pressed',String(only));fit();}
async function choose(){request?.abort();request=new AbortController();const signal=request.signal;selector.disabled=true;status.hidden=false;status.textContent='Loading magic…';const selected=catalog.find(r=>r.id===selector.value);reference.src='assets/magic/'+selected.id+'-crop.png';reference.alt=selected.name+' original artwork';document.getElementById('trait-title').textContent=selected.name;const url=new URL(location.href);url.searchParams.set('magic',selected.id);history.replaceState(null,'',url);
 try{const next=await loadCharacter({skin:'Undead',head:'bone',armour:'leather_garb',weapon:null,magic:selected.id},text=>{if(!signal.aborted)status.textContent=text;},signal);if(signal.aborted){next.dispose();return;}character?.dispose();character=next;scene.add(character.model);character.update(0,'Idle');visibility();status.hidden=true;}
 catch(e){if(e.name!=='AbortError'){status.textContent=e.message;status.hidden=false;}}
 finally{if(!signal.aborted)selector.disabled=false;}
}
selector.addEventListener('change',choose);document.getElementById('isolate').addEventListener('click',()=>{only=!only;visibility();});
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{view=b.dataset.view;fit();}));
document.getElementById('walk').addEventListener('change',e=>gait=e.target.checked?'Walk':'Idle');
const resize=new ResizeObserver(()=>{renderer.setSize(stage.clientWidth,stage.clientHeight,false);camera.aspect=stage.clientWidth/stage.clientHeight;camera.updateProjectionMatrix();});resize.observe(stage);
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.04,(now-(last||now))/1000);last=now;character?.update(dt,gait);controls.update();renderer.render(scene,camera);}requestAnimationFrame(frame);
fetch('assets/magic/catalog.json').then(r=>r.json()).then(rows=>{catalog=rows;for(const r of rows){const option=document.createElement('option');option.value=r.id;option.textContent=r.name;selector.appendChild(option);}const id=new URLSearchParams(location.search).get('magic');selector.value=rows.some(r=>r.id===id)?id:rows[0].id;choose();}).catch(e=>status.textContent=e.message);
window.addEventListener('pagehide',()=>{request?.abort();character?.dispose();resize.disconnect();controls.dispose();disposeObject(scene);renderer.dispose();});
