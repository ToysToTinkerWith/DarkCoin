import * as T from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {loadCharacter} from './character';
const stage=document.getElementById('stage'),selector=document.getElementById('extra'),status=document.getElementById('status');
const scene=new T.Scene();scene.background=new T.Color('#25353d');scene.add(new T.HemisphereLight('#ecfaff','#544535',2));const sun=new T.DirectionalLight('#fff6df',2);sun.position.set(-3,5,3);scene.add(sun);
const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.outputColorSpace=T.SRGBColorSpace;stage.appendChild(renderer.domElement);
const camera=new T.PerspectiveCamera(32,1,.001,30),controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=.04;controls.maxDistance=3;
let character,request,rows=[],only=false,view='quarter',last=0;
function fit(){
 const neck=['battle_wound','crescent_birthmark'].includes(selector.value);const target=only?new T.Vector3(neck?-.039:0,neck?1.512:1.641,neck?.045:.007):new T.Vector3(0,1.636,0);controls.target.copy(target);
 const dir={front:[0,.015,1],quarter:[-.65,.08,1],side:[-1,.03,.01],back:[0,.04,-1]}[view];let distance=only?(neck?.30:.62):.71;
 camera.position.copy(target).add(new T.Vector3(...dir).normalize().multiplyScalar(distance));controls.update();
}
function visibility(){character?.model.traverse(o=>{if(o.isMesh)o.visible=only?o.userData.trait==='05_Extra':!(document.getElementById('skin').checked&&o.userData.trait==='02_Bone_Head');});document.getElementById('isolate').setAttribute('aria-pressed',String(only));fit();}
async function choose(){request?.abort();request=new AbortController();const signal=request.signal;selector.disabled=true;status.hidden=false;status.textContent='Fitting accessory…';const row=rows.find(r=>r.id===selector.value);document.getElementById('title').textContent=row.name;const image=document.getElementById('reference');image.src='assets/extras/'+row.id+'-crop.png';image.alt=row.name+' original artwork';document.getElementById('placement').textContent=row.attachment==='neck_skin'?'Fitted directly to the viewer’s left side of the neck.':'Fitted symmetrically to both ears of the skin.';const url=new URL(location.href);url.searchParams.set('extra',row.id);history.replaceState(null,'',url);
 try{const next=await loadCharacter({skin:'Undead',head:'bone',armour:'leather_garb',weapon:null,extra:row.id},t=>{if(!signal.aborted)status.textContent=t;},signal);if(signal.aborted){next.dispose();return;}character?.dispose();character=next;scene.add(character.model);character.update(0,'Idle');visibility();status.hidden=true;}catch(e){if(e.name!=='AbortError')status.textContent=e.message;}finally{if(!signal.aborted)selector.disabled=false;}
}
selector.addEventListener('change',choose);document.getElementById('isolate').addEventListener('click',()=>{only=!only;visibility();});document.getElementById('skin').addEventListener('change',visibility);document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{view=b.dataset.view;fit();}));
const resize=new ResizeObserver(()=>{renderer.setSize(stage.clientWidth,stage.clientHeight,false);camera.aspect=stage.clientWidth/stage.clientHeight;camera.updateProjectionMatrix();});resize.observe(stage);
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.04,(now-(last||now))/1000);last=now;character?.update(dt,document.getElementById('walk').checked?'Walk':'Idle');controls.update();renderer.render(scene,camera);}requestAnimationFrame(frame);
fetch('assets/extras/catalog.json').then(r=>r.json()).then(data=>{rows=data;for(const r of rows){const o=document.createElement('option');o.value=r.id;o.textContent=r.name;selector.appendChild(o);}const id=new URLSearchParams(location.search).get('extra');selector.value=rows.some(r=>r.id===id)?id:rows[0].id;choose();}).catch(e=>status.textContent=e.message);
window.addEventListener('pagehide',()=>{request?.abort();character?.dispose();resize.disconnect();controls.dispose();renderer.dispose();});
