import * as T from 'three';
import {STATUS_ICONS,statusColor,statusLabel,stackCount} from './status-icons';

export function makeStatusBadge(status){
 const canvas=document.createElement('canvas');canvas.width=208;canvas.height=112;const c=canvas.getContext('2d');
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
 const sprite=new T.Sprite(new T.SpriteMaterial({map:texture,depthTest:false,depthWrite:false,transparent:true,toneMapped:false}));
 sprite.scale.set(.8,.43,1);sprite.renderOrder=12;
 sprite.userData.paint=(value,life=1,flash=false)=>{
  const count=stackCount(value),key=`${value.id}:${count}:${Math.ceil(life*30)}:${flash}`;
  if(sprite.userData.paintKey===key)return;sprite.userData.paintKey=key;
  const color=statusColor(value.id);c.clearRect(0,0,208,112);
  c.fillStyle='#0b101bf5';c.beginPath();c.roundRect(3,3,202,106,18);c.fill();c.strokeStyle=flash?'#fff8e5':'#4e566a';c.lineWidth=flash?4:2;c.stroke();
  c.fillStyle=color+'24';c.beginPath();c.roundRect(13,13,72,72,12);c.fill();
  c.save();c.translate(23,23);c.scale(52/24,52/24);c.lineWidth=1.8;c.lineCap='round';c.lineJoin='round';c.strokeStyle=color;
  for(const path of STATUS_ICONS[value.id]||STATUS_ICONS.exposed)c.stroke(new Path2D(path));c.restore();
  c.fillStyle='#ffffff';c.font='800 51px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillText(String(count),146,51,94);
  c.fillStyle='#2d3443';c.fillRect(15,95,178,5);c.fillStyle=color;c.fillRect(15,95,178*Math.max(0,Math.min(1,life)),5);
  sprite.name=statusLabel(value.id)+' '+count+' stacks';sprite.userData.statusId=value.id;sprite.userData.stacks=count;texture.needsUpdate=true;
 };
 sprite.userData.paint(status);return sprite;
}
export function statusBadgeRow(parent,height=3.05){
 const root=new T.Group();root.position.y=height;parent.add(root);const badges=new Map(),rotation=new T.Quaternion();
 const remove=o=>{o.material.map.dispose();o.material.dispose();o.removeFromParent();};
 return {root,update(statuses,time,camera){
  if(camera){parent.getWorldQuaternion(rotation);root.quaternion.copy(rotation.invert()).multiply(camera.quaternion);}
  const active=(statuses||[]).filter(s=>s.until>time).sort((a,b)=>a.id.localeCompare(b.id)),ids=new Set(active.map(s=>s.id));
  for(const [id,o] of badges)if(!ids.has(id)){remove(o);badges.delete(id);}
  active.forEach((s,i)=>{
   let o=badges.get(s.id);if(!o){o=makeStatusBadge(s);root.add(o);badges.set(s.id,o);}
   if(o.userData.until!==s.until||o.userData.stacks!==stackCount(s)){o.userData.started=time;o.userData.until=s.until;}
   const life=(s.until-time)/Math.max(.001,s.until-o.userData.started);
   o.userData.paint(s,life,time-o.userData.started<.25);
   const columns=Math.min(3,active.length-Math.floor(i/3)*3);o.position.set((i%3-(columns-1)/2)*.86,Math.floor(i/3)*.49,0);
  });
 },dispose(){for(const o of badges.values())remove(o);badges.clear();root.removeFromParent();}};
}
