const fs=require('fs'),path=require('path'),assert=require('assert');
const {pathToFileURL}=require('url');
const root=path.resolve(__dirname,'..'),assets=path.join(root,'public/arena/playground/assets');
global.self=global;global.createImageBitmap=async()=>({width:2560,height:1536,close(){}});global.ProgressEvent=class{constructor(t,o){Object.assign(this,o)}};
(async()=>{
 const {GLTFLoader}=await import('three/examples/jsm/loaders/GLTFLoader.js');const T=await import('three');
 const validator=require(path.join(root,'tmp/champion-model-tools/node_modules/gltf-validator'));
 const glbs=fs.readdirSync(assets,{recursive:true}).filter(p=>p.endsWith('.glb'));
 for(const file of glbs){const report=await validator.validateBytes(new Uint8Array(fs.readFileSync(path.join(assets,file))),{maxIssues:30});assert.equal(report.issues.numErrors,0,file+' validation');}
 console.log('Validated',glbs.length,'component GLBs');
 const esbuild=require(path.join(root,'tmp/champion-model-tools/node_modules/esbuild'));
 const bundle=path.join(root,'tmp/playground-character-test.cjs');await esbuild.build({entryPoints:[path.join(root,'components/arena/playground/character.js')],bundle:true,platform:'node',format:'cjs',outfile:bundle,external:['three','three/*'],logLevel:'silent'});
 const originalFetch=global.fetch;global.fetch=async(url)=>{if(!String(url).includes('/assets/'))return originalFetch(url);const p=path.join(assets,String(url).split('/assets/')[1]);const b=fs.readFileSync(p);return {ok:true,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),json:async()=>JSON.parse(b)};};
 const {loadCharacter}=require(bundle),catalog=require('../lib/playground-catalog.json');
 for(const weapon of [...Object.keys(catalog.weapons),null]){
   const c=await loadCharacter({skin:'Undead',head:'snake',armour:'leather_garb',weapon},()=>{},new AbortController().signal);
   for(const gait of ['Idle','Walk','Run_Backward','Walk_Left']){
     c.state.setState(c.permanent?'Hold':'Carry');c.update(.016,gait);
     if(!c.permanent){assert(c.toggle());c.update(c.state.duration+.001,gait);assert.equal(c.state.state,'Hold');}
     assert(c.attack());for(let i=0;i<5;i++)c.update(c.state.duration/5+.001,gait);
     c.model.traverse(o=>{if(o.isBone)assert(o.matrixWorld.elements.every(Number.isFinite),weapon+' '+o.name);});
     if(!c.permanent){assert(c.toggle());c.update(c.state.duration+.001,gait);assert.equal(c.state.state,'Carry');}
   }
   c.dispose();console.log('PASS',weapon||'unarmed');
 }
 global.fetch=originalFetch;
})().catch(e=>{console.error(e);process.exitCode=1});
