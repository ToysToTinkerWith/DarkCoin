import * as T from 'three';
import {makeGrave} from './grave';
import {loadBeast} from './beast';
import {loadDragon} from './dragon';
import {DRAGON} from '../../../lib/arena/dragon';
import {statusBadgeRow} from './status-badges';
export function arenaMonster(scene,onError){
 const grave=makeGrave(scene);
 let current=null,kind=null,loading=null,closed=false;
 async function swap(next){
  loading=next;current?.dispose();current=null;
  try{
   const object=next==='cindermaw'?await loadDragon(scene):await loadBeast(scene);
   if(closed){object.dispose();return;}
   if(next==='cindermaw'){
    const bars=new T.Group();object.actor.add(bars);bars.position.y=3.65;
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=80;const ctx=canvas.getContext('2d');ctx.font='bold 36px sans-serif';ctx.textAlign='center';ctx.fillStyle='#ffe0a0';ctx.fillText('CINDERMAW',256,46);
    const title=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(canvas),depthTest:false}));title.position.y=.3;title.scale.set(2.3,.36,1);bars.add(title);
    const bar=(y,color)=>{const bg=new T.Sprite(new T.SpriteMaterial({color:'#251b22',depthTest:false}));bg.scale.set(1.6,.09,1);bg.position.y=y;bars.add(bg);const fg=new T.Sprite(new T.SpriteMaterial({color,depthTest:false}));fg.position.y=y;fg.scale.set(1.55,.065,1);bars.add(fg);return fg;};
    const hp=bar(0,'#df666a'),stamina=bar(-.13,'#dbb86d'),badges=statusBadgeRow(object.actor,4.3);let gait=0,spawn=null;
    object.update=(s,time,dt,camera)=>{
     object.actor.visible=!!s;if(!s)return;bars.visible=s.hp>0;
     const p=new T.Vector3(s.x,0,s.z);if(spawn!==s.spawnAt){spawn=s.spawnAt;object.actor.position.copy(p);object.actor.rotation.y=s.yaw;}else object.actor.position.lerp(p,1-Math.exp(-18*dt));
     const turn=Math.atan2(Math.sin(s.yaw-object.actor.rotation.y),Math.cos(s.yaw-object.actor.rotation.y));object.actor.rotation.y+=turn*(1-Math.exp(-18*dt));
     let clip='Idle',phase=0;
     if(s.hp<=0){clip='Death';phase=Math.min(1,(time-s.deathAt)/DRAGON.clips.Death);object.actor.visible=time-s.deathAt<8;}
     else if(s.action&&!s.action.cancelled){clip=s.action.kind;phase=Math.min(1,Math.max(0,(time-s.action.start)/s.action.duration));}
     else{clip=Math.hypot(s.vx,s.vz)>.1?(s.running?'Run':'Walk'):'Idle';gait+=dt/DRAGON.clips[clip];phase=gait%1;}
     object.sample(clip,phase);hp.scale.x=1.55*Math.max(.001,s.hp/s.maxHealth);stamina.scale.x=1.55*Math.max(.001,s.stamina/s.maxStamina);badges.update(s.statuses,time,camera);
    };
   }
   current=object;kind=next;
  }catch(e){onError(e);}finally{loading=null;}
 }
 return {update(s,time,dt,camera){grave.update(s,time);if(!s){if(current)current.actor.visible=false;return;}const next=s.kind||'graveclaw';if(next!==kind&&!loading)void swap(next);if(kind===next)current?.update(s,time,dt,camera);},dispose(){closed=true;grave.dispose();current?.dispose();}};
}
