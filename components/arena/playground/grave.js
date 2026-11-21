import * as T from 'three';
import {disposeObject} from './character';
// A shallow stone crypt, kept below combat height and centered on the spawn.
export function makeGrave(scene){
 const root=new T.Group();root.name='Graveclaw crypt';scene.add(root);root.visible=false;
 const stone=new T.MeshStandardMaterial({color:'#55545c',roughness:.95,metalness:.08});
 const dark=new T.MeshStandardMaterial({color:'#080a0d',roughness:1});
 const gold=new T.MeshStandardMaterial({color:'#89734c',roughness:.65});
 function box(w,h,d,x,y,z,mat=stone){const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;root.add(m);return m;}
 box(2.05,.035,2.45,0,.027,0,dark);
 box(.17,.17,2.7,-1.1,.10,0);box(.17,.17,2.7,1.1,.10,0);
 box(2.37,.17,.17,0,.10,1.3);box(2.37,.17,.17,0,.10,-1.3);
 const head=new T.Mesh(new T.CylinderGeometry(.69,.69,.19,6),stone);head.rotation.x=Math.PI/2;head.position.set(0,.76,-1.49);head.scale.y=1;root.add(head);
 box(1.19,.62,.22,0,.36,-1.49);box(.045,.42,.025,0,.73,-1.365,gold);box(.35,.045,.025,0,.78,-1.365,gold);
 const lid=box(2.08,.12,2.43,0,.13,0);lid.name='Sliding crypt lid';
 const dust=[];for(let i=0;i<18;i++){const m=new T.Mesh(new T.IcosahedronGeometry(.08+(i%4)*.025,0),new T.MeshBasicMaterial({color:'#8d7f69',transparent:true,opacity:0,depthWrite:false}));root.add(m);dust.push(m);}
 const clamp=n=>Math.max(0,Math.min(1,n)),smooth=n=>{n=clamp(n);return n*n*(3-2*n);};
 return {root,update(s,time){root.visible=!!s&&s.kind!=='cindermaw';if(!root.visible)return;
  const returning=s.mode==='burrowing',emerging=s.emergeUntil>time;
  const open=emerging?smooth((time-s.spawnAt)/1.2):returning?1-smooth((time-s.burrowAt-2.8)/1.2):s.hp<=0?1-smooth((time-s.deathAt-1)/2):1;
  lid.position.x=2.24*open;lid.rotation.z=-.05*open;
  for(let i=0;i<dust.length;i++){const m=dust[i],p=((time-s.spawnAt)*.5+i/18)%1,a=i*2.399;m.visible=emerging||returning;m.position.set(Math.sin(a)*(1+p*.8),.12+p*.9,Math.cos(a)*(1+p*.6));m.material.opacity=m.visible?(1-p)*.16:0;}
 },dispose(){disposeObject(root);root.removeFromParent();}};
}
