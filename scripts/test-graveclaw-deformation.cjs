// Inspect the actual exported skin, not only the authored joint coordinates.
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),baseline=path.join(root,'output/graveclaw/revisions/initial-rig/graveclaw.glb');
const source=`
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
window.measureSkin=async(url)=>{
 const gltf=await new GLTFLoader().loadAsync(url),mixer=new T.AnimationMixer(gltf.scene);
 let mesh;gltf.scene.traverse(o=>{if(o.isSkinnedMesh&&o.material.name.startsWith('Ash hide'))mesh=o;});
 const positions=mesh.geometry.attributes.position,index=mesh.geometry.index;
 const actions=Object.fromEntries(gltf.animations.map(c=>[c.name,mixer.clipAction(c)]));
 function pose(clip,t){mixer.stopAllAction();const a=actions[clip];a.play();a.paused=true;a.time=t*a.getClip().duration;mixer.update(0);gltf.scene.updateMatrixWorld(true);mesh.skeleton.update();}
 function verts(){return Array.from({length:positions.count},(_,i)=>mesh.applyBoneTransform(i,new T.Vector3().fromBufferAttribute(positions,i)));}
 pose('Idle',0);const rest=verts(),edges=[],seen=new Set();
 for(let i=0;i<index.count;i+=3)for(let j=0;j<3;j++){
  let a=index.getX(i+j),b=index.getX(i+(j+1)%3);if(a>b)[a,b]=[b,a];const key=a+':'+b;if(seen.has(key))continue;seen.add(key);
  const center=rest[a].clone().add(rest[b]).multiplyScalar(.5);
  const shoulder=Math.abs(center.x)>.32&&Math.abs(center.x)<.72&&center.y>1.42&&center.y<1.82;
  const hip=Math.abs(center.x)>.16&&Math.abs(center.x)<.44&&center.y>.77&&center.y<1.1;
  const length=rest[a].distanceTo(rest[b]);if((shoulder||hip)&&length>.008)edges.push({a,b,length,region:shoulder?'shoulder':'hip'});
 }
 const result={};
 for(const clip of ['Walk','Run','Claw','Heal','Enrage'].filter(name=>actions[name])){
  const peak={shoulder:[],hip:[]};
  for(let frame=0;frame<=40;frame++){pose(clip,frame/40);const p=verts();for(const e of edges)peak[e.region].push(p[e.a].distanceTo(p[e.b])/e.length);}
  result[clip]={};for(const [region,values] of Object.entries(peak)){values.sort((a,b)=>a-b);result[clip][region]={p95:values[Math.floor(values.length*.95)],max:values.at(-1),samples:values.length};}
 }
 return result;
};`;
require('esbuild').buildSync({stdin:{contents:source,resolveDir:root},bundle:true,platform:'browser',outfile:path.join(root,'tmp/graveclaw-deformation.js')});
(async()=>{
 const server=http.createServer((req,res)=>{
  if(req.url==='/'){res.setHeader('Content-Type','text/html');return res.end('<script src="/qa.js"></script>');}
  const file=req.url==='/qa.js'?path.join(root,'tmp/graveclaw-deformation.js'):req.url==='/original.glb'?baseline:path.join(root,'public/arena/playground/assets/beasts/graveclaw.glb');
  res.setHeader('Content-Type',req.url.endsWith('.js')?'text/javascript':'application/octet-stream');fs.createReadStream(file).pipe(res);
 });
 await new Promise(r=>server.listen(8844,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  const page=await browser.newPage();await page.goto('http://127.0.0.1:8844');await page.waitForFunction(()=>window.measureSkin);
  const updated=await page.evaluate(()=>measureSkin('/current.glb'));
  const original=fs.existsSync(baseline)?await page.evaluate(()=>measureSkin('/original.glb')):null;
  fs.writeFileSync(path.join(root,'output/graveclaw/deformation-validation.json'),JSON.stringify({updated,original},null,2));console.log(JSON.stringify({updated,original}));
  for(const clip of Object.keys(updated))for(const region of ['shoulder','hip'])assert(updated[clip][region].p95<1.45,clip+' '+region+' is overstretching');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
