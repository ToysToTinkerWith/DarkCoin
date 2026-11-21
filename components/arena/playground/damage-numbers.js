import * as T from 'three';
import {DAMAGE_PALETTE} from '../../contracts/Arena/arenaBalanceV1';

export function damageNumberStyle(event){
 const heal=event.type==='heal',periodic=!!event.periodic,critical=!!event.critical&&!periodic;
 return {color:heal?'#83efb2':DAMAGE_PALETTE[event.damageType]||'#ffffff',
  text:(heal?'+':'')+Math.round(event.amount),caption:heal?'HEAL':(event.damageType||'blunt').toUpperCase(),
  critical,periodic,width:periodic?.9:critical?1.95:1.5,height:periodic?.564:critical?1.22:.94,duration:periodic?1.05:critical?1.65:1.4};
}
export function makeDamageNumber(event){
 const style=damageNumberStyle(event),canvas=document.createElement('canvas');canvas.width=320;canvas.height=200;
 const c=canvas.getContext('2d');c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';
 const text=(value,y,font,color)=>{c.font=font;c.lineWidth=9;c.strokeStyle='#090c16';c.strokeText(value,160,y,306);c.fillStyle=color;c.fillText(value,160,y,306);};
 if(style.critical)text('◆ CRITICAL ◆',30,'800 23px system-ui','#fff1bc');
 text(style.text,106,`${style.critical?900:800} 105px system-ui`,style.color);
 text(style.caption,176,'800 21px system-ui',style.color);
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
 const sprite=new T.Sprite(new T.SpriteMaterial({map:texture,transparent:true,depthTest:false,depthWrite:false,toneMapped:false}));
 sprite.scale.set(style.width,style.height,1);sprite.renderOrder=20;
 sprite.name=`${style.critical?'Critical ':''}${style.caption} ${style.text}`;
 sprite.userData={...style,damageType:event.damageType,amount:event.amount};
 return sprite;
}
