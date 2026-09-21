const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/champion-magic-v58'),assets=path.join(root,'public/arena/playground/assets');
global.self=global;global.createImageBitmap=async()=>({width:2560,height:1536,close(){}});global.ProgressEvent=class{constructor(t,o){Object.assign(this,o)}};
(async()=>{
 const T=await import('three');
 const validator=require(path.join(root,'tmp/champion-model-tools/node_modules/gltf-validator'));
 const rows=JSON.parse(fs.readFileSync(path.join(out,'magic-manifest.json')));
 const esbuild=require(path.join(root,'tmp/champion-model-tools/node_modules/esbuild'));
 const bundle=path.join(root,'tmp/magic-character-test.cjs');await esbuild.build({entryPoints:[path.join(root,'components/arena/playground/character.js')],bundle:true,platform:'node',format:'cjs',outfile:bundle,external:['three','three/*'],logLevel:'silent'});
 const originalFetch=global.fetch;global.fetch=async(url)=>{if(!String(url).includes('/assets/'))return originalFetch(url);const p=path.join(assets,String(url).split('/assets/')[1]);const b=fs.readFileSync(p);return {ok:true,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),json:async()=>JSON.parse(b)};};
 const {loadCharacter}=require(bundle),reports=[];
 for(const row of rows){
   for(const suffix of ['','-rigged']){const r=await validator.validateBytes(new Uint8Array(fs.readFileSync(path.join(out,'models',row.id+suffix+'.glb'))),{maxIssues:30});assert.equal(r.issues.numErrors,0,row.id+' GLB '+JSON.stringify(r.issues.messages));}
   for(const s of row.sockets){const shoulder=s.shoulder_blender_m,c=s.center_blender_m;assert(Math.abs((c[2]-shoulder[2])-.28)<1e-6);assert(Math.abs((shoulder[1]-c[1])-.28)<1e-6);}
   const c=await loadCharacter({skin:'Undead',head:'bone',armour:'leather_garb',weapon:'scythe',magic:row.id},()=>{},new AbortController().signal);
   let chest;const magic=[];c.model.traverse(o=>{if(o.isBone&&o.name==='chest')chest=o;if(o.isMesh&&o.userData.trait==='04_Magic')magic.push(o);});assert(magic.length>0,row.id+' missing magic');assert(chest);
   for(const m of magic){assert(m.isSkinnedMesh);const idx=m.geometry.attributes.skinIndex,w=m.geometry.attributes.skinWeight;for(let i=0;i<idx.count;i++){assert.equal(m.skeleton.bones[idx.getX(i)].name,'chest');assert(Math.abs(w.getX(i)-1)<1e-6);}}
   const relative=()=>magic.map(m=>{const p=new T.Vector3().fromBufferAttribute(m.geometry.attributes.position,0);m.applyBoneTransform(0,p);m.localToWorld(p);return chest.worldToLocal(p);});
   c.update(0,'Idle');const baseline=relative();let largestError=0;
   c.toggle();
   for(const gait of ['Walk','Run','Walk_Backward','Run_Left']){
     for(let i=0;i<15;i++){c.update(.09,gait);relative().forEach((p,j)=>{assert(p.toArray().every(Number.isFinite));largestError=Math.max(largestError,p.distanceTo(baseline[j]));});}
     c.attack();
   }
   assert(largestError<1e-4,row.id+' drifts from chest '+largestError);
   c.dispose();reports.push({id:row.id,validatedGLBs:2,attachmentErrorMetres:largestError,sockets:row.sockets.length});console.log('PASS',row.id,'rig + geometry + 4 gaits/actions');
 }
 global.fetch=originalFetch;fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify(reports,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
