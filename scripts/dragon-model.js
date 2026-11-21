import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {DRAGON,DRAGON_RIG,dragonPose} from '../lib/arena/dragon';
const V=a=>new T.Vector3(...a);
export function poseDragon(bones,clip,t){for(const [n,p] of Object.entries(dragonPose(clip,t))){bones[n].position.fromArray(p.p);if(p.q)bones[n].quaternion.fromArray(p.q);else bones[n].rotation.set(...p.r);bones[n].scale.set(1,1,1);}}
export function buildDragon(){
 const model=new T.Group();model.name='Cindermaw';const bones={},parts=new Map();
 for(const [n,b] of Object.entries(DRAGON_RIG)){const bone=new T.Bone();bone.name=n;bone.position.fromArray(b.p);bones[n]=bone;(b.parent?bones[b.parent]:model).add(bone);}
 model.updateMatrixWorld(true);
 const boneArray=Object.values(bones),index=new Map(boneArray.map((b,i)=>[b.name,i]));
 const mats={hide:new T.MeshStandardMaterial({name:'Cindermaw sculpt hide',color:'#333b40',roughness:.86}),
  jaw:new T.MeshStandardMaterial({name:'Cindermaw jaw hide',color:'#343c40',roughness:.86}),
  scale:new T.MeshStandardMaterial({name:'Overlapping basalt scales',color:'#45515a',roughness:.8}),
  edge:new T.MeshStandardMaterial({name:'Scale edge shadows',color:'#1a242b',roughness:.9}),
  belly:new T.MeshStandardMaterial({name:'Weathered bronze throat plates',color:'#a98d64',roughness:.86}),
  bone:new T.MeshStandardMaterial({name:'Horn and talon ivory',color:'#cbb68c',roughness:.76}),
  horn:new T.MeshStandardMaterial({name:'Horn roots',color:'#6c6657',roughness:.88}),
  membrane:new T.MeshStandardMaterial({name:'Oxblood wing membranes',color:'#6b303c',roughness:.95,side:T.DoubleSide}),
  vein:new T.MeshStandardMaterial({name:'Raised wing tendons',color:'#9a5360',roughness:.9}),
  dark:new T.MeshStandardMaterial({name:'Mouth and nostril recesses',color:'#12141b',roughness:.92}),
  tongue:new T.MeshStandardMaterial({name:'Tongue',color:'#773848',roughness:.8}),
  ember:new T.MeshStandardMaterial({name:'Ember eyes and throat',color:'#ffc06a',emissive:'#ff5c13',emissiveIntensity:2,roughness:.5})};
 function add(g,mat,joint,p=[0,0,0],size=[1,1,1],r=[0,0,0],weights=null){
  if(g.index)g=g.toNonIndexed();g.applyMatrix4(new T.Matrix4().compose(V(p),new T.Quaternion().setFromEuler(new T.Euler(...r)),V(size)));
  if(joint)g.applyMatrix4(bones[joint].matrixWorld);
  const count=g.attributes.position.count,ids=new Uint16Array(count*4),w=new Float32Array(count*4);
  for(let i=0;i<count;i++){const point=new T.Vector3().fromBufferAttribute(g.attributes.position,i),influences=weights?weights(point):[[joint,1]];influences.forEach(([n,weight],k)=>{ids[i*4+k]=index.get(n);w[i*4+k]=weight;});}
  g.setAttribute('skinIndex',new T.Uint16BufferAttribute(ids,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(w,4));
  if(!g.attributes.uv)g.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(count*2),2));
  if(!parts.has(mat))parts.set(mat,[]);parts.get(mat).push(g);
 }
 const oval=(joint,mat,p,size,r=[0,0,0])=>add(new T.SphereGeometry(1,24,16),mat,joint,p,size,r);
 function tube(joint,mat,points,radii,sides=12,weights=null){
  const vertices=[],faces=[];
  for(let i=0;i<points.length;i++){
   const p=V(points[i]),axis=V(points[Math.min(i+1,points.length-1)]).sub(V(points[Math.max(0,i-1)])).normalize();
   const u=new T.Vector3(0,1,0);if(Math.abs(axis.dot(u))>.94)u.set(1,0,0);u.cross(axis).normalize();const w=axis.clone().cross(u);
   for(let j=0;j<sides;j++)vertices.push(...p.clone().addScaledVector(u,Math.cos(j/sides*Math.PI*2)*radii[i]).addScaledVector(w,Math.sin(j/sides*Math.PI*2)*radii[i]));
   if(i)for(let j=0;j<sides;j++){const a=(i-1)*sides+j,b=(i-1)*sides+(j+1)%sides,c=i*sides+j,d=i*sides+(j+1)%sides;faces.push(a,b,c,b,d,c);}
  }
  for(let j=1;j<sides-1;j++){faces.push(0,j+1,j);const k=(points.length-1)*sides;faces.push(k,k+j,k+j+1);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex(faces);g.computeVertexNormals();add(g,mat,joint,[0,0,0],[1,1,1],[0,0,0],weights);
 }
 function plate(joint,mat,p,w,l,h,r=[0,0,0]){
  const g=new T.BufferGeometry(),v=[-w,0,0,0,0,l*.65,w,0,0,0,0,-l*.5,0,h,0];
  g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setIndex([0,1,4,1,2,4,2,3,4,3,0,4,0,3,2,0,2,1]);g.computeVertexNormals();add(g,mat,joint,p,[1,1,1],r);
 }
 function loft(joint,mat,rings,sides=24){
  const v=[],f=[];for(let i=0;i<rings.length;i++){const [z,y,rx,ry]=rings[i];for(let j=0;j<sides;j++){const a=j/sides*Math.PI*2;v.push(Math.cos(a)*rx,y+Math.sin(a)*ry,z);}if(i)for(let j=0;j<sides;j++){const a=(i-1)*sides+j,b=(i-1)*sides+(j+1)%sides,c=i*sides+j,d=i*sides+(j+1)%sides;f.push(a,b,c,b,d,c);}}
  for(let j=1;j<sides-1;j++){f.push(0,j+1,j);const n=(rings.length-1)*sides;f.push(n,n+j,n+j+1);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setIndex(f);g.computeVertexNormals();add(g,mat,joint);
 }
 // Long, tapered quadruped torso with a deep breast and a narrow tail root.
 loft('body','hide',[[-.91,.0,.20,.24],[-.63,.01,.49,.40],[-.15,.02,.62,.51],[.38,.07,.63,.52],[.73,.14,.43,.39],[.96,.20,.26,.24]]);
 for(const s of [-1,1])oval('body','hide',[s*.40,.0,-.55],[.29,.35,.4]);
 for(let i=0;i<6;i++)oval('body','belly',[0,-.41+.018*i,-.55+i*.23],[.34+.02*i,.105,.155]);
 // Individual shingled scales on the back/flanks are genuine raised geometry.
 for(let row=0;row<9;row++)for(const s of [-1,1])for(let col=0;col<3;col++){
  const z=-.7+row*.18,x=s*(.15+col*.15),y=.43-col*.095;
  plate('body',col===2?'edge':'scale',[x,y,z],.105,.24,.05,[0,s*.10,s*-.38*col]);
 }
 for(let i=0;i<7;i++)tube('body','bone',[[0,.43,-.67+i*.22],[0,.66,-.77+i*.22],[0,.83,-.89+i*.22]],[.10,.058,.001],10);
 for(const [n,radius,length] of [['neck1',.29,.40],['neck2',.255,.36],['neck3',.225,.35]]){
  tube(n,'hide',[[0,-.14,-.16],[0,0,0],[0,.14,.16],[0,.22,.29]],[radius,radius,radius*.85,radius*.8],20);
  for(let j=0;j<3;j++)oval(n,'belly',[0,-.12+j*.09,.16+j*.07],[radius*.76,.052,.12],[-.50,0,0]);
  tube(n,'bone',[[0,.10,-.16],[0,.33,-.23],[0,.43,-.36]],[.073,.05,.001]);
  for(const s of [-1,1])for(let j=0;j<3;j++)plate(n,'scale',[s*(radius*.8),j*.10-.04,.02+j*.06],.07,.15,.035,[.4,0,-s*.9]);
 }
 // Angular skull, long muzzle, hinged jaw and individually seated teeth.
 loft('head','hide',[[-.24,0,.17,.19],[-.06,.025,.30,.24],[.20,-.015,.24,.18],[.49,-.055,.205,.105],[.68,-.063,.15,.079]],16);
 loft('jaw','jaw',[[-.09,-.045,.18,.068],[.18,-.078,.225,.064],[.46,-.055,.18,.049],[.64,-.026,.125,.035]],16);
 oval('jaw','dark',[0,-.018,.25],[.19,.023,.33]);oval('jaw','tongue',[0,.005,.28],[.10,.016,.25]);
 oval('head','dark',[0,-.135,.32],[.20,.028,.29]);oval('head','ember',[0,-.105,-.045],[.075,.06,.023]);
 for(const s of [-1,1]){
  oval('head','dark',[s*.251,.052,.09],[.045,.083,.132],[0,s*.08,s*.25]);
  oval('head','ember',[s*.285,.067,.10],[.017,.022,.083],[0,s*.05,s*.22]);
  oval('head','dark',[s*.302,.07,.108],[.012,.023,.012]);
  tube('head','scale',[[s*.12,.19,.24],[s*.27,.18,.07],[s*.32,.15,-.10]],[.055,.081,.031]);
  oval('head','dark',[s*.147,-.018,.57],[.045,.028,.049],[0,s*.3,0]);
  for(let i=0;i<5;i++){
   const z=.17+i*.087,x=s*(.205-i*.013);
   tube('head','bone',[[x,-.10,z],[x*.98,-.19-(i===0?.06:0),z+.025]],[.025,.001],8);
   tube('jaw','bone',[[x*.9,-.004,z],[x*.91,.063,z-.018]],[.02,.001],8);
  }
  tube('head','horn',[[s*.20,.17,-.13],[s*.29,.30,-.27],[s*.40,.52,-.49],[s*.46,.65,-.79],[s*.39,.73,-.98]],[.12,.105,.075,.043,.001],14);
  tube('head','bone',[[s*.36,.44,-.41],[s*.40,.52,-.49],[s*.46,.65,-.79],[s*.39,.73,-.98]],[.080,.075,.043,.001],14);
  tube('head','bone',[[s*.22,-.06,-.12],[s*.39,-.05,-.36],[s*.46,.08,-.58]],[.085,.059,.001]);
  plate('head','scale',[s*.12,.214,-.02],.11,.24,.045,[0,s*.18,s*.13]);
  tube('head','scale',[[s*.20,-.04,.26],[s*.23,-.03,.06],[s*.28,-.12,-.16]],[.025,.038,.003]);
 }
 // Four muscular legs, wrists/ankles, spread toes and curved talons.
 for(const s of [-1,1])for(const end of ['Front','Back']){
  const tag=s<0?'L':'R',upper=end+tag+'Upper',lower=end+tag+'Lower',foot=end+tag+'Foot',hind=end==='Back';
  tube(upper,'hide',[[0,.10,0],[s*.08,-.18,hind?.05:0],[s*.18,-.52,hind?.18:-.07]],[hind?.30:.25,hind?.27:.22,.14],18);
  tube(lower,'hide',[[0,.06,0],[0,-.22,hind?-.04:.03],[s*.02,-.50,hind?-.12:.10]],[.16,.125,.09],16);
  oval(foot,'hide',[0,-.045,.13],[.19,.095,.25]);
  for(let j=-1;j<=1;j++){
   tube(foot,'hide',[[j*.10,-.02,.16],[j*.13,-.04,.29]],[.07,.045],10);
   tube(foot,'bone',[[j*.13,-.04,.27],[j*.14,-.02,.40],[j*.14,-.085,.46]],[.043,.028,.001],10);
  }
  for(let j=0;j<3;j++)plate(lower,'scale',[s*.05,-.12-j*.10,.13],.10,.14,.035,[Math.PI/2,0,0]);
  oval(upper,'scale',[s*.13,-.12,-.10],[.17,.16,.21]);
  tube(upper,'bone',[[s*.14,-.15,-.16],[s*.27,-.07,-.29],[s*.31,.03,-.40]],[.07,.04,.001]);
 }
 // Ten linked tail sections with continuous two-joint weighting at each seam.
 for(let i=0;i<10;i++){
  const n='tail'+i,r=.25*(1-i/11),next=i<9?'tail'+(i+1):n,origin=new T.Vector3().setFromMatrixPosition(bones[n].matrixWorld);
  const weights=p=>{const a=Math.max(0,Math.min(1,(origin.z-p.z)/.32));return [[n,1-a],[next,a]];};
  tube(n,'hide',[[0,.02,.07],[0,0,-.08],[0,-.025,-.22],[0,-.035,-.35]],[r,r*.96,r*.87,r*.8],18,weights);
  plate(n,'scale',[0,r*.84,-.13],r*.78,.35,r*.23);
  if(i<8)tube(n,'bone',[[0,r*.85,-.08],[0,r+.19-i*.008,-.21],[0,r+.23-i*.009,-.31]],[r*.30,r*.18,.001],10);
 }
 for(const s of [-1,1])tube('tail9','bone',[[0,0,-.10],[s*.17,.025,-.24],[s*.27,.04,-.41],[s*.05,.015,-.48]],[.065,.065,.038,.001],10);
 // Batlike wing structure. Membranes are curved ruled surfaces between ribs;
 // their weights interpolate continuously, including along shared borders.
 for(const s of [-1,1]){
  const tag=s<0?'L':'R',root='wing'+tag,elbow='wingElbow'+tag,wrist='wingWrist'+tag;
  tube(root,'hide',[[0,0,0],[s*.37,.39,-.12],[s*.76,.70,-.23]],[.20,.15,.105],16);
  tube(elbow,'hide',[[0,0,0],[s*.36,.15,-.16],[s*.78,.23,-.38]],[.11,.08,.066],14);
  oval(wrist,'scale',[0,0,0],[.11,.10,.13]);
  tube(wrist,'bone',[[0,.015,0],[s*.10,.22,.06],[s*.21,.30,.02]],[.064,.034,.001]);
  const ends=[[s*1.16,-.08,-.20],[s*.88,-.42,-1.03],[s*.23,-.76,-1.61],[s*-.49,-.70,-1.54]];
  for(let i=0;i<4;i++){
   const n='wingFinger'+tag+i,e=ends[i];tube(n,'hide',[[0,0,0],[e[0]*.55,e[1]*.5+.06,e[2]*.52],e],[.052,.035,.008],10);
   tube(n,'bone',[e,e.map((v,k)=>v+(k===0?s*.10:k===1?-.01:-.08))],[.018,.001],8);
  }
  const wristWorld=new T.Vector3().setFromMatrixPosition(bones[wrist].matrixWorld);
  for(let span=0;span<3;span++){
   const a=V(ends[span]),b=V(ends[span+1]),verts=[],faces=[],weights=[];
   const N=18,M=14;
   for(let row=0;row<=N;row++)for(let col=0;col<=M;col++){
    const u=row/N,v=col/M,scallop=1-.15*Math.sin(v*Math.PI)*Math.pow(u,4),p=a.clone().lerp(b,v).multiplyScalar(u*scallop);
    p.y+=.06*Math.sin(u*Math.PI)-.11*Math.sin(v*Math.PI)*Math.sin(u*Math.PI);
    verts.push(...p.add(wristWorld));weights.push([['wingFinger'+tag+span,1-v],['wingFinger'+tag+(span+1),v]]);
    if(row&&col){const d=row*(M+1)+col,c=d-1,b0=d-(M+1),a0=b0-1;faces.push(a0,c,b0,b0,c,d);}
   }
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setIndex(faces);g.computeVertexNormals();
   // Preserve the grid's exact influences after conversion to triangles.
   const expanded=g.toNonIndexed(),idx=g.index.array,ids=new Uint16Array(idx.length*4),ws=new Float32Array(idx.length*4);
   idx.forEach((source,k)=>weights[source].forEach(([n,w],j)=>{ids[k*4+j]=index.get(n);ws[k*4+j]=w;}));
   expanded.setAttribute('skinIndex',new T.Uint16BufferAttribute(ids,4));expanded.setAttribute('skinWeight',new T.Float32BufferAttribute(ws,4));expanded.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(idx.length*2),2));
   if(!parts.has('membrane'))parts.set('membrane',[]);parts.get('membrane').push(expanded);
   for(const fraction of [.35,.62,.83]){
    const points=[.12,.50,.88].map(u=>{const p=a.clone().lerp(b,fraction).multiplyScalar(u*(1-.15*Math.sin(fraction*Math.PI)*Math.pow(u,4)));p.y+=.06*Math.sin(u*Math.PI)-.11*Math.sin(fraction*Math.PI)*Math.sin(u*Math.PI)+.008;return p.toArray();});
    tube(wrist,'vein',points,[.005,.006,.001],5);
   }
  }
  // Proximal web continues from the last rib to the torso, leaving a clear
  // armpit rather than an intersecting rectangular filler panel.
  const e=V(ends[3]).add(wristWorld),hinge=new T.Vector3().setFromMatrixPosition(bones[root].matrixWorld),anchor=hinge.clone().add(new T.Vector3(0,-.12,-.78));
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([...wristWorld,...e,...anchor,...hinge],3));g.setIndex([0,1,2,0,2,3]);g.computeVertexNormals();
  add(g,'membrane',null,[0,0,0],[1,1,1],[0,0,0],p=>{const d=p.distanceTo(wristWorld),a=Math.min(1,d/1.8);return [[wrist,1-a],[root,a]];});
 }
 const skeleton=new T.Skeleton(boneArray);
 for(const [mat,gs] of parts){const g=mergeGeometries(gs),mesh=new T.SkinnedMesh(g,mats[mat]);mesh.name='Cindermaw '+mat;model.add(mesh);mesh.bind(skeleton);mesh.frustumCulled=false;gs.forEach(g=>g.dispose());}
 for(const [name,joint,pos] of [['FlameMuzzle','head',[0,-.08,.66]],['TailImpact','tail9',[0,0,-.34]]]){const socket=new T.Object3D();socket.name=name;socket.position.fromArray(pos);bones[joint].add(socket);}
 const clips=[];
 for(const [name,duration] of Object.entries(DRAGON.clips)){
  const frames=Math.ceil(duration*60),times=[],values=Object.fromEntries(boneArray.map(b=>[b.name,{p:[],q:[]}])) ;
  for(let i=0;i<=frames;i++){poseDragon(bones,name,i/frames);times.push(i/frames*duration);for(const [n,b] of Object.entries(bones)){values[n].p.push(...b.position);values[n].q.push(...b.quaternion);}}
  const tracks=[];for(const [n,v] of Object.entries(values)){tracks.push(new T.VectorKeyframeTrack(n+'.position',times,v.p),new T.QuaternionKeyframeTrack(n+'.quaternion',times,v.q));}clips.push(new T.AnimationClip(name,duration,tracks));
 }
 poseDragon(bones,'Idle',0);model.updateMatrixWorld(true);model.animations=clips;return {model,bones,clips};
}
