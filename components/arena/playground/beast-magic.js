import * as T from 'three';

// Shared by the real arena and the boss preview; server state decides when active.
export function beastMagicEffects(actor){
 const group=new T.Group();actor.add(group);
 const rings=Array.from({length:3},()=>{const mesh=new T.Mesh(new T.TorusGeometry(1,.018,6,64),new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));mesh.rotation.x=Math.PI/2;group.add(mesh);return mesh;});
 const positions=new Float32Array(36*3),geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3));
 const particles=new T.Points(geometry,new T.PointsMaterial({size:.06,transparent:true,opacity:0,depthWrite:false}));group.add(particles);group.visible=false;
 return {update(kind,phase,time,enraged=false){
  const casting=kind==='Heal'||kind==='Enrage';group.visible=casting||enraged;if(!group.visible)return;
  const color=kind==='Heal'?0x76efad:0xff814d,envelope=casting?Math.sin(Math.PI*Math.min(1,Math.max(0,phase))):.35;
  for(let i=0;i<rings.length;i++){const ring=rings[i],cycle=(time*.7+i/3)%1;ring.material.color.setHex(color);ring.material.opacity=envelope*(.45-cycle*.25);ring.position.y=.08+(casting?cycle*2.8:i*.09);ring.scale.setScalar(casting?.55+cycle*.65:1.05+i*.09);}
  particles.material.color.setHex(color);particles.material.opacity=envelope*.8;
  for(let i=0;i<36;i++){const angle=i*2.399+time*.9,height=(i/36+time*.45)%1,radius=.75+.35*Math.sin(height*Math.PI);positions[i*3]=Math.cos(angle)*radius;positions[i*3+1]=.1+height*2.8;positions[i*3+2]=Math.sin(angle)*radius;}
  geometry.attributes.position.needsUpdate=true;
 }};
}
