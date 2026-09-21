const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/champion-skins-v60'),assets=path.join(root,'public/arena/playground/assets');
global.self=global;global.createImageBitmap=async()=>({width:2560,height:1536,close(){}});global.ProgressEvent=class{constructor(t,o){Object.assign(this,o)}};
(async()=>{
 const T=await import('three'),{GLTFLoader}=await import('three/examples/jsm/loaders/GLTFLoader.js'),validator=require(path.join(root,'tmp/champion-model-tools/node_modules/gltf-validator')),esbuild=require(path.join(root,'tmp/champion-model-tools/node_modules/esbuild'));
 const bundle=path.join(root,'tmp/skin-character-test.cjs');await esbuild.build({entryPoints:[path.join(root,'components/arena/playground/character.js')],bundle:true,platform:'node',format:'cjs',outfile:bundle,external:['three','three/*'],logLevel:'silent'});
 const loader=new GLTFLoader(),raw=fs.readFileSync(path.join(assets,'body.glb'));const base=await loader.parseAsync(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength),'');const master=new Map();base.scene.traverse(o=>{if(o.isBone)master.set(o.name,{position:o.position.clone(),quaternion:o.quaternion.clone(),scale:o.scale.clone()});});
 const originalFetch=global.fetch;global.fetch=async url=>{if(!String(url).includes('/assets/'))return originalFetch(url);const p=path.join(assets,String(url).split('/assets/')[1]),b=fs.readFileSync(p);return {ok:true,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),json:async()=>JSON.parse(b)};};
 const {loadCharacter,disposeObject}=require(bundle),rows=JSON.parse(fs.readFileSync(path.join(out,'skin-manifest.json'))),reports=[];
 assert.equal(rows.length,9);assert.equal(new Set(rows.map(r=>r.body_geometry_sha256)).size,1,'All skins preserve exactly the original body vertex positions');
 try{for(const row of rows){
  const bytes=fs.readFileSync(path.join(assets,'skins',row.id+'-rigged.glb')),validation=await validator.validateBytes(new Uint8Array(bytes),{maxIssues:30});assert.equal(validation.issues.numErrors,0,row.id+' '+JSON.stringify(validation.issues.messages));
  const c=await loadCharacter({skin:row.name,head:'bone',armour:'leather_garb',weapon:'dragon_longsword',magic:'dark_magic',extra:'golden_feathers'},()=>{},new AbortController().signal);
  const tails=[],bodies=[],meshes=[],rigBones=new Map();c.model.traverse(o=>{if(o.isBone){rigBones.set(o.name,o);if(o.name.startsWith('skin_tail_'))tails.push(o);}if(o.isMesh){meshes.push(o);if(o.userData.skin_surface)bodies.push(o);}});
  assert.equal(bodies.length,1,row.id+' has one body, not a tinted body plus a duplicate');if(row.id==='chameleon')assert(bodies[0].material.map,'Chameleon artwork atlas loads');assert.equal(tails.length,row.tail?7:0);
  for(const [name,rest] of master){const b=rigBones.get(name);assert(b,name);assert(b.position.distanceTo(rest.position)<1e-6,name+' unchanged rest position');assert(1-Math.abs(b.quaternion.dot(rest.quaternion))<1e-6,name+' unchanged rest rotation');}
  assert(meshes.some(o=>o.userData.trait==='04_Magic'));assert(meshes.some(o=>o.userData.trait==='05_Extra'));assert(meshes.some(o=>o.userData.trait==='02_Bone_Head'));
  const tailMeshes=meshes.filter(o=>o.userData.skin_component==='tail');assert.equal(tailMeshes.length,row.tail?1:0);
  const tailSamples=()=>tailMeshes.flatMap(m=>[0,Math.floor(m.geometry.attributes.position.count/2),m.geometry.attributes.position.count-1].map(i=>{const v=new T.Vector3().fromBufferAttribute(m.geometry.attributes.position,i);m.applyBoneTransform(i,v);m.localToWorld(v);return v;}));
  c.update(0,'Idle');let previous=tailSamples(),maxStep=0;
  for(const gait of ['Walk','Run','Run_Left','Walk_Backward']){
   for(const action of ['Draw','Swing','Stow']){
    assert(action==='Swing'?c.attack():c.toggle(),row.id+' starts '+action);
    const frames=Math.ceil(c.state.duration/.05)+1;
    for(let i=0;i<frames;i++){
     c.update(.05,gait);const now=tailSamples();now.forEach((v,j)=>{assert(v.toArray().every(Number.isFinite));assert(v.length()<4);maxStep=Math.max(maxStep,v.distanceTo(previous[j]));});previous=now;
    }
    assert.equal(c.state.state,action==='Stow'?'Carry':'Hold');
   }
  }
  assert(maxStep<.15,row.id+' tail motion has no teleporting vertices');c.dispose();reports.push({id:row.id,glbErrors:0,unchangedBodyHash:row.body_geometry_sha256,tailBones:tails.length,maximumTailFrameDisplacementM:maxStep,combinedEquipment:true});console.log('PASS',row.id);
 }}finally{global.fetch=originalFetch;disposeObject(base.scene);}
 fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify(reports,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
