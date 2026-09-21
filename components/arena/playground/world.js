import * as T from 'three';

export function makeArena(scene) {
  scene.background=new T.Color('#111d27');scene.fog=new T.FogExp2('#111d27',.018);
  scene.add(new T.HemisphereLight('#c5e4ed','#423127',2.1));
  const sun=new T.DirectionalLight('#ffe7ba',3.2);sun.position.set(-9,18,6);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-18,right:18,top:18,bottom:-18,near:1,far:50});sun.shadow.bias=-.0003;scene.add(sun);
  const stone=new T.MeshStandardMaterial({color:'#525c62',roughness:.95});
  const edge=new T.MeshStandardMaterial({color:'#303c46',roughness:.82});
  const gold=new T.MeshStandardMaterial({color:'#a88b52',roughness:.55,metalness:.55});
  const glow=new T.MeshBasicMaterial({color:'#76d9d5'});
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;const c=canvas.getContext('2d');
  c.fillStyle='#9a8c73';c.fillRect(0,0,1024,1024);
  let seed=437;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<28000;i++){const shade=90+rand()*95;c.fillStyle=`rgba(${shade},${shade*.93},${shade*.78},.18)`;c.fillRect(rand()*1024,rand()*1024,1+rand()*3,1+rand()*3);}
  c.strokeStyle='#756e60';c.lineWidth=2;
  for(let y=0;y<1024;y+=128){c.beginPath();c.moveTo(0,y);c.lineTo(1024,y);c.stroke();for(let x=(y%256?64:0);x<1024;x+=128){c.beginPath();c.moveTo(x,y);c.lineTo(x,y+128);c.stroke();}}
  const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(4,4);tex.anisotropy=4;
  function mesh(geo,mat,x,y,z,shadow=true){const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=shadow;m.receiveShadow=true;scene.add(m);return m;}
  mesh(new T.CylinderGeometry(14,14.5,.6,128),stone,0,-.32,0);
  mesh(new T.CircleGeometry(13.95,128),new T.MeshStandardMaterial({map:tex,roughness:1}),0,-.012,0,false).rotation.x=-Math.PI/2;
  function ring(radius,width,material,y=.006){const m=mesh(new T.RingGeometry(radius-width,radius,128),material,0,y,0,false);m.rotation.x=-Math.PI/2;return m;}
  ring(13.35,.06,gold);ring(12.95,.025,gold);ring(3.4,.035,gold);ring(2.95,.022,gold);
  for(let i=0;i<8;i++){const a=i*Math.PI/4;const mark=mesh(new T.BoxGeometry(.08,.015,1),gold,Math.sin(a)*3.85,.002,Math.cos(a)*3.85,false);mark.rotation.y=a;}
  // Low collision boundary and stepped spectator terraces.
  for(let i=0;i<72;i++){const a=i/72*Math.PI*2;const block=mesh(new T.BoxGeometry(1.26,.72,.55),i%3?stone:edge,Math.sin(a)*14.05,.33,Math.cos(a)*14.05);block.rotation.y=a;}
  for(let tier=0;tier<3;tier++){const r=15.3+tier*1.6;const m=mesh(new T.CylinderGeometry(r+1.4,r+1.5,.65,96,1,true),edge,0,.28+tier*.7,0);m.material.side=T.DoubleSide;ring(r+1.4,1.5,stone,.62+tier*.7);}
  const flames=[];
  for(let i=0;i<12;i++){
    const a=i*Math.PI/6,x=Math.sin(a)*15,z=Math.cos(a)*15;
    mesh(new T.CylinderGeometry(.4,.52,.3,8),edge,x,.92,z);
    mesh(new T.CylinderGeometry(.25,.32,3.8,8),stone,x,2.8,z);
    mesh(new T.BoxGeometry(.95,.25,.95),gold,x,4.8,z);
    const fire=mesh(new T.OctahedronGeometry(.21,1),new T.MeshBasicMaterial({color:'#ffbc65'}),x,5.15,z,false);fire.scale.y=2;flames.push(fire);
    if(i%3===0){const light=new T.PointLight('#ffad55',16,8,2);light.position.set(x,4.8,z);scene.add(light);}
    const banner=mesh(new T.PlaneGeometry(.82,1.7),new T.MeshStandardMaterial({color:i%2?'#592d35':'#20474e',side:T.DoubleSide,roughness:1}),x,3.55,z);banner.rotation.y=a;
  }
  for(let i=0;i<24;i++){const a=i/24*Math.PI*2,r=24+rand()*9;const m=mesh(new T.ConeGeometry(2+rand()*3,5+rand()*9,5),edge,Math.sin(a)*r,1,Math.cos(a)*r);m.rotation.y=rand()*6;}
  const target=new T.Group();const outer=new T.Mesh(new T.RingGeometry(.13,.17,32),glow);outer.rotation.x=-Math.PI/2;target.add(outer);target.position.y=.025;scene.add(target);
  return {target,update(time){for(let i=0;i<flames.length;i++)flames[i].scale.y=1.8+Math.sin(time*7+i*2)*.22;}};
}
