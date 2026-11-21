import * as T from 'three';
import {makeArena} from '../components/arena/playground/world';
import {loadBeast} from '../components/arena/playground/beast';
import {makeGrave} from '../components/arena/playground/grave';
const scene=new T.Scene(),camera=new T.PerspectiveCamera(40,innerWidth/innerHeight,.1,100),renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;document.body.style.margin='0';document.body.appendChild(renderer.domElement);makeArena(scene);camera.position.set(5,4.5,6);camera.lookAt(0,.7,0);const grave=makeGrave(scene);
loadBeast(scene).then(beast=>{window.graveQA={sample(time){const s={kind:'graveclaw',x:0,z:0,yaw:0,vx:0,vz:0,hp:320,maxHealth:320,stamina:100,maxStamina:100,statuses:[],spawnAt:0,emergeUntil:6,burrowAt:10,returnAt:14,mode:time<6?'emerging':time>=10?'burrowing':'idle'};grave.update(s,time);beast.update(s,time,1/30,camera);renderer.render(scene,camera);return {y:beast.actor.position.y,visible:grave.root.visible,meshes:renderer.info.render.calls};}};});
