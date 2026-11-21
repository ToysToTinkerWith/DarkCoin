// Authored 3D source: stylized anatomical volumes, jointed hide, bone armour and
// individually modelled talons. All geometry is real, not image billboards.
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {GRAVECLAW,beastPose} from '../lib/arena/beast';
const Y=new T.Vector3(0,1,0),v=a=>new T.Vector3(...a);
const restPose=beastPose('Idle',0);
const parents={hips:null,spine:'hips',chest:'spine',head:'chest'};
for(const tag of ['L','R'])Object.assign(parents,{['shoulder'+tag]:'chest',['upper'+tag]:'shoulder'+tag,['fore'+tag]:'upper'+tag,['hand'+tag]:'fore'+tag,['hipSocket'+tag]:'hips',['thigh'+tag]:'hipSocket'+tag,['shin'+tag]:'thigh'+tag,['foot'+tag]:'shin'+tag});
export function poseRig(bones,clip,t){
 const pose=beastPose(clip,t),world={},quaternions={};
 for(const [name,p] of Object.entries(pose)){
  const q=new T.Quaternion();
  if(p.a){
   const rest=restPose[name],axis=v(rest.b).sub(v(rest.a)).normalize(),current=v(p.b).sub(v(p.a)).normalize();
   // Transport the bind frame, instead of recomputing its roll around -Y.
   q.setFromUnitVectors(axis,current).multiply(new T.Quaternion().setFromUnitVectors(Y,axis));
  }else if(p.q)q.fromArray(p.q);else q.setFromEuler(new T.Euler(...p.r));
  quaternions[name]=q;world[name]=new T.Matrix4().compose(v(p.a||p.p),q,new T.Vector3(1,1,1));
 }
 function support(name,position,q){quaternions[name]=q;world[name]=new T.Matrix4().compose(position,q,new T.Vector3(1,1,1));}
 support('spine',v(pose.hips.p).lerp(v(pose.chest.p),.48),quaternions.hips.clone().slerp(quaternions.chest,.48));
 for(const tag of ['L','R'])for(const [name,limb,torso] of [['shoulder','upper','chest'],['hipSocket','thigh','hips']]){
  const rest=restPose[limb+tag],restQ=new T.Quaternion().setFromUnitVectors(Y,v(rest.b).sub(v(rest.a)).normalize());
  const delta=quaternions[limb+tag].clone().multiply(restQ.invert());
  const q=new T.Quaternion().slerp(delta,.4).multiply(new T.Quaternion().setFromEuler(new T.Euler(...restPose[torso].r)));
  support(name+tag,v(pose[limb+tag].a),q);
 }
 for(const [name,bone] of Object.entries(bones)){
  const local=world[name].clone(),parent=parents[name];
  if(parent)local.premultiply(world[parent].clone().invert());
  local.decompose(bone.position,bone.quaternion,bone.scale);bone.scale.set(1,1,1);
 }
}
export function buildGraveclaw(){
 const model=new T.Group();model.name='Graveclaw';const root=new T.Bone();root.name='GraveclawRoot';model.add(root);
 const bones={},rest=beastPose('Idle',0),parts=new Map();
 for(const name of Object.keys(parents)){const p=rest[name],b=new T.Bone();b.name=name;b.userData.restLength=p?.a?v(p.b).distanceTo(v(p.a)):1;bones[name]=b;}
 for(const [name,b] of Object.entries(bones))(parents[name]?bones[parents[name]]:root).add(b);
 poseRig(bones,'Idle',0);model.updateMatrixWorld(true);
 for(const tag of ['L','R']){const tip=new T.Object3D();tip.name='ClawTip_'+tag;tip.position.set(0,-.16,.59);bones['hand'+tag].add(tip);}
 const mats={hide:new T.MeshStandardMaterial({name:'Ash hide • illustrated',color:'#53565b',roughness:.94}),
  muscle:new T.MeshStandardMaterial({name:'Raised hide planes',color:'#707276',roughness:.96}),
  dark:new T.MeshStandardMaterial({name:'Ink and carved creases',color:'#20222b',roughness:1}),
  bone:new T.MeshStandardMaterial({name:'Ancient ivory',color:'#cbbda0',roughness:.82}),
  horn:new T.MeshStandardMaterial({name:'Horn shadow',color:'#746858',roughness:.87}),
  red:new T.MeshStandardMaterial({name:'Crimson fissures',color:'#762f36',roughness:1}),
  eye:new T.MeshStandardMaterial({name:'Ember eyes',color:'#ff9b4a',emissive:'#ff4a19',emissiveIntensity:2.2,roughness:.3})};
 const boneArray=[root,...Object.values(bones)],index=new Map(boneArray.map((b,i)=>[b,i]));
 function add(geo,mat,joint,pos=[0,0,0],scale=[1,1,1],rotation=[0,0,0]){
  geo=geo.toNonIndexed();const matrix=new T.Matrix4().compose(v(pos),new T.Quaternion().setFromEuler(new T.Euler(...rotation)),v(scale));geo.applyMatrix4(matrix);geo.applyMatrix4(bones[joint].matrixWorld);
  const count=geo.attributes.position.count,ids=new Uint16Array(count*4),weights=new Float32Array(count*4);for(let i=0;i<count;i++){ids[i*4]=index.get(bones[joint]);weights[i*4]=1;}
  geo.setAttribute('skinIndex',new T.Uint16BufferAttribute(ids,4));geo.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
  if(!parts.has(mat))parts.set(mat,[]);parts.get(mat).push(geo);
 }
 const oval=(joint,mat,pos,scale,rot=[0,0,0],detail=24)=>add(new T.SphereGeometry(1,detail,16),mat,joint,pos,scale,rot);
 function tube(joint,mat,points,radii,sides=9){
  const verts=[],indices=[];
  for(let i=0;i<points.length;i++){const p=v(points[i]),t=v(points[Math.min(i+1,points.length-1)]).sub(v(points[Math.max(i-1,0)])).normalize(),u=new T.Vector3(0,1,0);if(Math.abs(t.dot(u))>.95)u.set(1,0,0);u.cross(t).normalize();const w=t.clone().cross(u);
   for(let j=0;j<sides;j++){const a=j/sides*Math.PI*2,q=p.clone().addScaledVector(u,Math.cos(a)*radii[i]).addScaledVector(w,Math.sin(a)*radii[i]);verts.push(...q);}
   if(i)for(let j=0;j<sides;j++){const a=(i-1)*sides+j,b=(i-1)*sides+(j+1)%sides,c=i*sides+j,d=i*sides+(j+1)%sides;indices.push(a,b,c,b,d,c);}
  }
  for(let j=1;j<sides-1;j++){indices.push(0,j+1,j);const k=(points.length-1)*sides;indices.push(k,k+j,k+j+1);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setIndex(indices);g.computeVertexNormals();g.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(verts.length/3*2),2));add(g,mat,joint);
 }
 // Narrow waist, broad humped thorax and distinct pectoral/abdominal planes.
 oval('hips','hide',[0,.07,0],[.34,.39,.27]);oval('chest','hide',[0,-.15,-.01],[.52,.48,.33]);
 for(const s of [-1,1]){
  oval('chest','muscle',[s*.23,-.03,.21],[.265,.18,.15],[0,s*.15,s*-.13]);
  for(let i=0;i<3;i++)oval('hips','muscle',[s*.11,.31-i*.125,.245],[.115,.074,.047]);
  for(let i=0;i<3;i++)tube('chest','dark',[[s*.20,-.17-i*.095,.29],[s*.32,-.14-i*.1,.26],[s*.43,-.09-i*.1,.19]],[.006,.009,.002],5);
  oval('chest','hide',[s*.40,.1,-.10],[.25,.23,.28]);
  tube('chest','dark',[[s*.12,.12,-.31],[s*.28,.04,-.305],[s*.38,-.13,-.26],[s*.31,-.30,-.24]],[.002,.007,.008,.001],6);
  tube('hips','dark',[[s*.08,.04,-.258],[s*.18,-.035,-.235],[s*.22,-.17,-.18]],[.002,.006,.001],5);
 }
 // Interlocking dorsal plates and a broken ridge, visible from every angle.
 for(let i=0;i<7;i++){
  const joint=i<4?'chest':'hips',y=i<4?.3-i*.16:.2-(i-4)*.13;
  oval(joint,'horn',[0,y,-.275],[.14,.13,.065]);
  tube(joint,'bone',[[0,y,-.27],[0,y+.08,-.42],[0,y+.13,-.50-i*.004]],[.073,.039,.001]);
 }
 oval('head','hide',[0,-.06,-.1],[.26,.28,.29]);
 oval('head','bone',[0,.07,.045],[.225,.20,.24]);
 oval('head','hide',[0,-.105,.25],[.177,.123,.31]);
 oval('head','dark',[0,-.068,.52],[.105,.042,.043]);
 oval('head','dark',[0,-.205,.29],[.177,.055,.224]);
 oval('head','hide',[0,-.28,.23],[.16,.067,.23]);
 // Slanted brows, recessed eyes, long swept horns and pointed pinnae.
 for(const s of [-1,1]){
  oval('head','dark',[s*.16,.012,.23],[.108,.060,.049],[0,s*.4,s*.33]);
  oval('head','eye',[s*.159,.018,.272],[.065,.017,.024],[0,s*.30,s*.33]);
  tube('head','bone',[[s*.06,.047,.28],[s*.18,.096,.256],[s*.275,.116,.15]],[.038,.040,.007],9);
  tube('head','bone',[[s*.18,.12,-.04],[s*.28,.27,-.09],[s*.34,.46,-.21],[s*.30,.63,-.30]],[.11,.08,.046,.001],12);
  tube('head','hide',[[s*.20,.025,-.08],[s*.39,.17,-.10],[s*.50,.24,-.21]],[.106,.075,.001]);
  tube('head','bone',[[s*.13,-.15,.37],[s*.145,-.28,.41],[s*.115,-.335,.40]],[.039,.021,.001]);
  for(let i=0;i<3;i++)tube('head','bone',[[s*(.035+i*.039),-.179,.445-i*.014],[s*(.037+i*.039),-.246,.44-i*.014]],[.017,.001],7);
  tube('head','dark',[[s*.03,.23,.16],[s*.10,.20,.205],[s*.15,.14,.223]],[.004,.006,.001],5);
 }
 for(const s of [-1,1]){
  const tag=s<0?'L':'R',upper='upper'+tag,fore='fore'+tag,hand='hand'+tag,thigh='thigh'+tag,shin='shin'+tag,foot='foot'+tag;
  const len=n=>bones[n].userData.restLength;
  oval(upper,'hide',[0,len(upper)*.43,0],[.22,len(upper)*.66,.23]);
  oval(upper,'muscle',[0,len(upper)*.48,.10],[.17,len(upper)*.41,.17]);
  // Scapular armour rides the support joint, not the rotating upper arm.
  // Its spikes fan outward/backward, clear of the neck and upper shoulder.
  const shoulder='shoulder'+tag;
  oval(shoulder,'horn',[s*.10,.075,-.12],[.21,.115,.19]);
  for(let i=0;i<3;i++)tube(shoulder,'bone',[[s*(.09+i*.055),.12,-.15],[s*(.18+i*.075),.25,-.29],[s*(.25+i*.09),.32-i*.025,-.40]],[.060,.033,.001]);
  oval(fore,'hide',[0,len(fore)*.45,0],[.175,len(fore)*.65,.19]);
  oval(fore,'muscle',[.02,len(fore)*.42,.08],[.13,len(fore)*.48,.13]);
  for(let i=0;i<2;i++)tube(fore,'bone',[[s*.12,len(fore)*(.25+i*.32),-.08],[s*.24,len(fore)*(.27+i*.30),-.15],[s*.28,len(fore)*(.12+i*.30),-.21]],[.065,.03,.001]);
  oval(hand,'hide',[0,-.025,.08],[.175,.108,.18]);
  for(let finger=0;finger<4;finger++){
   const x=(finger-1.5)*.087,z=.19-Math.abs(finger-1.5)*.022;
   tube(hand,'hide',[[x,0,z-.08],[x*1.13,-.014,z+.10],[x*1.18,-.04,z+.19]],[.05,.046,.027]);
   tube(hand,'bone',[[x*1.18,-.04,z+.15],[x*1.21,-.037,z+.28],[x*1.19,-.105,z+.37],[x*1.15,-.19,z+.40]],[.038,.03,.017,.001]);
   oval(hand,'muscle',[x,.065,z-.1],[.041,.018,.045]);
  }
  tube(hand,'hide',[[s*.12,0,.08],[s*.23,-.055,.13],[s*.24,-.08,.24]],[.07,.055,.023]);
  tube(hand,'bone',[[s*.24,-.08,.23],[s*.27,-.11,.34],[s*.24,-.18,.38]],[.033,.02,.001]);
  oval(thigh,'hide',[0,len(thigh)*.35,0],[.225,len(thigh)*.67,.24]);
  oval(thigh,'muscle',[0,len(thigh)*.32,.1],[.17,len(thigh)*.45,.20]);
  oval(shin,'hide',[0,len(shin)*.4,-.045],[.14,len(shin)*.66,.16]);
  oval(thigh,'bone',[0,len(thigh),.10],[.125,.1,.085]);
  oval(foot,'hide',[0,-.07,.105],[.195,.115,.26]);
  for(let i=-1;i<=1;i++)tube(foot,'bone',[[i*.10,-.06,.25],[i*.115,-.09,.36],[i*.12,-.145,.40]],[.05,.037,.001]);
  // Painted fissures use narrow geometry, avoiding blurry projected textures.
  for(let i=0;i<2;i++)tube(upper,'red',[[s*.08,len(upper)*(.3+i*.15),.208],[s*.13,len(upper)*(.45+i*.15),.20],[s*.14,len(upper)*(.54+i*.15),.16]],[.005,.009,.001],5);
 }
 const skeleton=new T.Skeleton(boneArray);
 for(const [mat,geometries] of parts){const g=mergeGeometries(geometries);const mesh=new T.SkinnedMesh(g,mats[mat]);mesh.name='Graveclaw '+mat;model.add(mesh);mesh.bind(skeleton);mesh.castShadow=true;mesh.receiveShadow=true;for(const item of geometries)item.dispose();}
 const clips=[];
 for(const [name,duration] of Object.entries(GRAVECLAW.clips)){
  const frames=Math.ceil(duration*60),tracks=[],values=Object.fromEntries(Object.keys(bones).map(k=>[k,{p:[],q:[],s:[]}])) ,times=[];
  for(let i=0;i<=frames;i++){const t=i/frames;times.push(t*duration);poseRig(bones,name,t);for(const [k,b] of Object.entries(bones)){values[k].p.push(...b.position);values[k].q.push(...b.quaternion);values[k].s.push(...b.scale);}}
  for(const [k,x] of Object.entries(values)){tracks.push(new T.VectorKeyframeTrack(k+'.position',times,x.p),new T.QuaternionKeyframeTrack(k+'.quaternion',times,x.q),new T.VectorKeyframeTrack(k+'.scale',times,x.s));}
  clips.push(new T.AnimationClip(name,duration,tracks));
 }
 poseRig(bones,'Idle',0);model.updateMatrixWorld(true);model.animations=clips;
 return {model,bones,clips};
}
