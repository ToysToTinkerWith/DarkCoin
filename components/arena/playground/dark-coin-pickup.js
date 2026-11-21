import * as T from 'three';
import {SVGLoader} from 'three/examples/jsm/loaders/SVGLoader.js';
import logo from './dark-coin-logo.json';

// The original logo's paths, including its crescent cutout and horizon stripes,
// become solid relief geometry. No billboard or image texture is used.
export function makeDarkCoinPickup(){
 const coin=new T.Group();coin.name='Dark Coin loot emblem';
 coin.userData={source:logo.source,kind:'loot-marker'};
 const dark=new T.MeshStandardMaterial({color:0x11151d,metalness:.55,roughness:.4});
 const rim=new T.MeshStandardMaterial({color:0xbfa46c,metalness:.7,roughness:.3});
 const silver=new T.MeshStandardMaterial({color:0xf3f1e8,metalness:.35,roughness:.32,emissive:0xc5d5df,emissiveIntensity:.12});
 function add(geometry,material,name,y){
  const mesh=new T.Mesh(geometry,material);mesh.name=name;mesh.position.y=y;
  mesh.castShadow=true;mesh.receiveShadow=true;coin.add(mesh);return mesh;
 }
 const profile=[[0,0],[.422,0],[.442,.014],[.442,.078],[.428,.092],[0,.092]];
 add(new T.LatheGeometry(profile.map(([r,y])=>new T.Vector2(r,y)),80),dark,'Solid beveled coin',.006);
 for(const y of [.022,.083]){
  const edge=add(new T.TorusGeometry(.435,.009,8,80),rim,'Machined rim',y);
  edge.rotation.x=Math.PI/2;
 }
 const reeding=new T.InstancedMesh(new T.BoxGeometry(.006,.044,.004),rim,64);
 reeding.name='Coin edge ridges';
 const transform=new T.Object3D();
 for(let i=0;i<64;i++){
  const angle=i*Math.PI/32;transform.position.set(Math.sin(angle)*.442,.051,Math.cos(angle)*.442);
  transform.rotation.y=angle;transform.updateMatrix();reeding.setMatrixAt(i,transform.matrix);
 }
 coin.add(reeding);
 const face=new T.Group();face.name='Extruded original Dark Coin logo';
 face.rotation.x=-Math.PI/2;face.position.y=.097;coin.add(face);
 const paths=new SVGLoader().parse(logo.svg).paths;
 for(const path of paths){
  if(path.userData?.style?.fill==='black')continue;
  const geometry=new T.ExtrudeGeometry(SVGLoader.createShapes(path),{
   depth:5,bevelEnabled:true,bevelThickness:.45,bevelSize:.4,bevelSegments:2,curveSegments:4,steps:1
  });
  geometry.translate(-139.5,-139.5,0);
  const relief=new T.Mesh(geometry,silver);relief.name='Raised crescent and horizon';
  relief.scale.set(.00315,-.00315,.003);relief.castShadow=true;relief.receiveShadow=true;face.add(relief);
 }
 return coin;
}
