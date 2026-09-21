import * as T from 'three';
import {statusBadgeRow} from './status-badges';
export {statusColor} from './status-icons';
function textSprite(text,color,width=2.4){const c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d');ctx.font='bold 32px sans-serif';ctx.textAlign='center';ctx.strokeStyle='#14151b';ctx.lineWidth=7;ctx.strokeText(text,256,60);ctx.fillStyle=color;ctx.fillText(text,256,60);const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;const s=new T.Sprite(new T.SpriteMaterial({map:texture,depthTest:false,transparent:true}));s.scale.set(width,width*96/512,1);return s;}
export function makeTrainingDummy(scene){
 const root=new T.Group();root.name='Training dummy';scene.add(root);
 const wood=new T.MeshStandardMaterial({color:'#55351f',roughness:.95}),rope=new T.MeshStandardMaterial({color:'#7d623c',roughness:1}),iron=new T.MeshStandardMaterial({color:'#323c42',metalness:.65,roughness:.6});
 const texCanvas=document.createElement('canvas');texCanvas.width=texCanvas.height=256;const c=texCanvas.getContext('2d');c.fillStyle='#b99b65';c.fillRect(0,0,256,256);
 for(let n=0;n<256;n+=8){c.strokeStyle=n%16?'#ac8d58':'#c7ad79';c.lineWidth=2;c.beginPath();c.moveTo(n,0);c.lineTo(n,256);c.moveTo(0,n);c.lineTo(256,n);c.stroke();}
 const tex=new T.CanvasTexture(texCanvas);tex.colorSpace=T.SRGBColorSpace;const straw=new T.MeshStandardMaterial({map:tex,roughness:1});
 const mesh=(geometry,material,x,y,z)=>{const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;root.add(m);return m;};
 mesh(new T.CylinderGeometry(.45,.53,.12,24),iron,0,.06,0);mesh(new T.CylinderGeometry(.085,.105,1.3,12),wood,0,.73,0);
 const body=mesh(new T.CapsuleGeometry(.27,.62,6,18),straw,0,1.15,0);body.scale.x=1.08;
 const cross=mesh(new T.CylinderGeometry(.07,.07,1.12,10),wood,0,1.42,0);cross.rotation.z=Math.PI/2;
 for(const side of [-1,1]){const arm=mesh(new T.CylinderGeometry(.105,.12,.26,12),straw,side*.42,1.42,0);arm.rotation.z=Math.PI/2;}
 mesh(new T.SphereGeometry(.205,18,12),straw,0,1.86,0);
 for(const y of [.87,1.12,1.42]){const band=mesh(new T.TorusGeometry(.278,.026,6,24),rope,0,y,0);band.rotation.x=Math.PI/2;}
 // Target faces the arriving champion, and has a matching target on its reverse.
 for(const side of [-1,1]){
  const target=mesh(new T.CircleGeometry(.18,32),new T.MeshStandardMaterial({color:'#873b2a',roughness:1,side:T.DoubleSide}),0,1.26,side*.283);
  mesh(new T.RingGeometry(.07,.09,28),new T.MeshBasicMaterial({color:'#ddc899',side:T.DoubleSide}),0,1.26,side*.287);
  mesh(new T.CircleGeometry(.035,16),iron,0,1.26,side*.29);
 }
 const title=textSprite('STRIKE DUMMY','#ead5a3');title.position.y=2.33;root.add(title);
 const bar=new T.Sprite(new T.SpriteMaterial({color:'#33303a',depthTest:false}));bar.scale.set(.84,.06,1);bar.position.y=2.12;root.add(bar);
 const health=new T.Sprite(new T.SpriteMaterial({color:'#e6b965',depthTest:false}));health.scale.set(.8,.035,1);health.position.set(0,2.12,-.002);health.renderOrder=2;root.add(health);
 const badges=statusBadgeRow(root,2.66);let flash=0,lastHP=1000;
 return {root,update(state,time,dt){root.visible=!!state;if(!state)return;
  if(state.hp<lastHP)flash=.18;lastHP=state.hp;flash=Math.max(0,flash-dt);straw.emissive.set('#ffbc65');straw.emissiveIntensity=flash*2;
  body.rotation.z=Math.sin(flash*45)*flash*.12;health.scale.x=.8*Math.max(0,state.hp/state.maxHealth);
  badges.update(state.statuses,time);
 }};
}
