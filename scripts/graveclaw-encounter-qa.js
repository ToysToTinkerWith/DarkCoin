import * as T from 'three';
import {makeArena} from '../components/arena/playground/world';
import {loadBeast} from '../components/arena/playground/beast';
import {loadCharacter} from '../components/arena/playground/character';
import {CombatEffects} from '../components/arena/playground/combat-effects';
import {WeaponEffects} from '../components/arena/playground/weapon-effects';
import {createRoom,addPlayer,applyInput,advance,realtimeSnapshot} from '../lib/arena/simulation';
import {GRAVECLAW,beastClawAt} from '../lib/arena/beast';
import {movementClip} from '../lib/playground';
const scene=new T.Scene(),camera=new T.PerspectiveCamera(40,innerWidth/innerHeight,.1,100),renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;document.body.appendChild(renderer.domElement);makeArena(scene);
camera.position.set(5,4.2,6);camera.lookAt(-.1,1,0);
const room=createRoom(100,32),p=addPlayer(room,'champion',{id:1,name:'Arena QA',loadout:{skin:'Undead',head:'bone',armour:'leather_garb',weapon:'dark_sword',magic:'fire_magic'}});room.dummy=null;Object.assign(p,{x:0,z:1.42,yaw:Math.PI,spawnedAt:95,carry:'Hold'});p.input.yaw=Math.PI;Object.assign(room.beast,{x:0,z:0,pauseUntil:0,yaw:0});
const fx=new CombatEffects(scene);const entities=new Map();let ready=false,character,beast,weaponFx,last=0,paused=false;
Promise.all([loadCharacter(p.champion.loadout,()=>{},new AbortController().signal),loadBeast(scene)]).then(([c,b])=>{character=c;beast=b;const actor=new T.Group();actor.add(c.model);scene.add(actor);actor.position.set(p.x,0,p.z);actor.rotation.y=p.yaw;entities.set(p.id,{actor,character:c});weaponFx=new WeaponEffects(scene,actor,c);weaponFx.serverProjectiles=true;ready=true;
window.encounter={state:()=>realtimeSnapshot(room),pause:()=>paused=true,resume:()=>paused=false,labels:()=>fx.labels.length,
 attack:()=>{applyInput(room,p.id,{seq:p.lastSeq+1,x:0,z:0,yaw:Math.PI,action:'attack'});},
 poseMatch:()=>{const before=paused;paused=true;let maxError=0;for(let i=0;i<=60;i++){b.preview('Claw',i/60);b.actor.updateMatrixWorld(true);for(const side of [-1,1]){const marker=b.model.getObjectByName('ClawTip_'+(side<0?'L':'R'));if(!marker)throw new Error('Missing exported claw socket');const point=marker.getWorldPosition(new T.Vector3());b.actor.worldToLocal(point);const expected=beastClawAt(i/60,side).outer;maxError=Math.max(maxError,point.distanceTo(new T.Vector3(...expected)));}}paused=before;return maxError;},
 defeat:()=>{room.beast.hp=1;room.beast.action=null;room.beast.pauseUntil=room.time+10;p.hp=230;Object.assign(p,{x:0,z:1,yaw:Math.PI});p.action=null;applyInput(room,p.id,{seq:p.lastSeq+1,x:0,z:0,yaw:Math.PI,action:'attack'});}};
}).catch(e=>{window.qaError=e.message;throw e;});
function tick(now){requestAnimationFrame(tick);const dt=Math.min(.033,(now-(last||now))/1000);last=now;if(!ready)return;if(!paused){p.lastSeen=room.time;advance(room,room.time+dt);const state=realtimeSnapshot(room);const entity=entities.get(p.id);if(state.players[p.id]){entity.actor.position.set(p.x,0,p.z);entity.actor.rotation.y=p.yaw;character.sync(state.players[p.id],room.time);character.update(dt,movementClip(p.vx,p.vz,p.yaw,p.running));weaponFx.update(dt);}beast.update({...state.beast,time:state.time},room.time,dt);fx.update(state,room.time,dt,entities);}renderer.render(scene,camera);}requestAnimationFrame(tick);
