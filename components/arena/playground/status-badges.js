import * as T from 'three';
import {STATUS_ICONS,statusColor,statusLabel,stackCount} from './status-icons';

export function makeStatusBadge(status){
 const canvas=document.createElement('canvas');canvas.width=160;canvas.height=80;const c=canvas.getContext('2d');
 c.fillStyle='#131925ed';c.beginPath();c.roundRect(2,2,156,76,15);c.fill();c.strokeStyle=statusColor(status.id);c.lineWidth=2;c.stroke();
 c.save();c.translate(12,12);c.scale(56/24,56/24);c.lineWidth=1.7;c.lineCap='round';c.lineJoin='round';
 for(const path of STATUS_ICONS[status.id]||STATUS_ICONS.exposed)c.stroke(new Path2D(path));c.restore();
 c.fillStyle='#fff8ec';c.font='bold 42px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillText(String(stackCount(status)),116,42,66);
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
 const sprite=new T.Sprite(new T.SpriteMaterial({map:texture,depthTest:false,depthWrite:false,transparent:true}));sprite.scale.set(.7,.35,1);sprite.renderOrder=9;
 sprite.name=statusLabel(status.id)+' '+stackCount(status)+' stacks';sprite.userData.statusId=status.id;sprite.userData.stacks=stackCount(status);return sprite;
}
export function statusBadgeRow(parent,height=2.85){
 const root=new T.Group();root.position.y=height;parent.add(root);const badges=new Map();
 const remove=o=>{o.material.map.dispose();o.material.dispose();o.removeFromParent();};
 return {root,update(statuses,time){
  const active=(statuses||[]).filter(s=>s.until>time).sort((a,b)=>a.id.localeCompare(b.id)),ids=new Set(active.map(s=>s.id));
  for(const [id,o] of badges)if(!ids.has(id)){remove(o);badges.delete(id);}
  active.forEach((s,i)=>{let o=badges.get(s.id);if(o&&o.userData.stacks!==stackCount(s)){remove(o);badges.delete(s.id);o=null;}
   if(!o){o=makeStatusBadge(s);root.add(o);badges.set(s.id,o);}const columns=Math.min(4,active.length-Math.floor(i/4)*4);o.position.set((i%4-(columns-1)/2)*.75,Math.floor(i/4)*.4,0);
  });
 },dispose(){for(const o of badges.values())remove(o);badges.clear();root.removeFromParent();}};
}
