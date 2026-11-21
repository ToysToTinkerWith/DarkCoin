import * as T from 'three';
import {formatLootAmount} from '../../../lib/arena/loot-drops';
import {makeDarkCoinPickup} from './dark-coin-pickup';

export class LootDrops{
 constructor(scene,host){this.scene=scene;this.host=host;this.items=new Map();this.overlay=document.createElement('div');this.overlay.className='arenaDropLabels';host.appendChild(this.overlay);}
 sync(drops){
  const wanted=new Set(drops.filter(d=>!d.pickedUp).map(d=>d.id));
  for(const [id,item] of this.items)if(!wanted.has(id)){item.group.removeFromParent();item.group.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});item.label.remove();this.items.delete(id);}
  for(const drop of drops)if(!drop.pickedUp&&!this.items.has(drop.id)){
   const group=new T.Group();group.position.set(drop.x,0,drop.z);this.scene.add(group);
   const ring=new T.Mesh(new T.TorusGeometry(.48,.027,8,36),new T.MeshBasicMaterial({color:0xffcc69,transparent:true,opacity:.85}));ring.rotation.x=Math.PI/2;ring.position.y=.045;group.add(ring);
   const coin=makeDarkCoinPickup();group.add(coin);
   const label=document.createElement('div');label.className='arenaDropCard';label.setAttribute('role','img');label.setAttribute('aria-label',`${drop.name}, ${formatLootAmount(drop.amount,drop.decimals)}, asset ${drop.assetId}. Walk here to collect.`);
   const img=document.createElement('img');img.src=drop.image||'/home/marketLogo.png';img.alt='';img.referrerPolicy='no-referrer';img.onerror=()=>{img.onerror=null;img.src='/home/marketLogo.png';};
   const text=document.createElement('div'),title=document.createElement('strong'),amount=document.createElement('span'),asset=document.createElement('small');
   title.textContent=drop.name;amount.textContent=`× ${formatLootAmount(drop.amount,drop.decimals)}`;asset.textContent=`ASA #${drop.assetId} · Your loot`;text.append(title,amount,asset);label.append(img,text);this.overlay.appendChild(label);
   this.items.set(drop.id,{group,coin,ring,label,drop,lastRequest:0});
  }
 }
 update(camera,time,self,pickup){
  for(const item of this.items.values()){
   item.ring.material.opacity=.6+Math.sin(time*2)*.15;
   const p=new T.Vector3(item.drop.x,1.02,item.drop.z).project(camera),visible=p.z>-1&&p.z<1&&Math.abs(p.x)<1.15&&Math.abs(p.y)<1.15;
   item.label.hidden=!visible;
   const half=item.label.offsetWidth/2+8,x=(p.x*.5+.5)*this.host.clientWidth;
   item.label.style.left=`${Math.max(half,Math.min(this.host.clientWidth-half,x))}px`;item.label.style.top=`${(-p.y*.5+.5)*this.host.clientHeight}px`;
   if(self&&Math.hypot(self.x-item.drop.x,self.z-item.drop.z)<1.15&&time-item.lastRequest>3){if(pickup(item.drop.id))item.lastRequest=time;}
  }
 }
 dispose(){this.sync([]);this.overlay.remove();}
}
