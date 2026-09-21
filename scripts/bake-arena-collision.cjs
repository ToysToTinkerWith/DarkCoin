// Bake actual animated blade paths once; the server never trusts client hit reports.
const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'..');
global.self=global;global.createImageBitmap=async()=>({width:4096,height:4096,close(){}});global.ProgressEvent=class{constructor(t,o){Object.assign(this,o)}};
(async()=>{
 const esbuild=require('../tmp/champion-model-tools/node_modules/esbuild');
 esbuild.buildSync({stdin:{contents:"export {loadCharacter} from './components/arena/playground/character';export {attackWindows} from './components/arena/playground/weapon-effects-profile';export {WEAPONS} from './components/contracts/Arena/arenaBalanceV1';",resolveDir:root},bundle:true,platform:'node',outfile:path.join(root,'tmp/arena-bake.cjs'),external:['three','three/*']});
 const {loadCharacter,attackWindows,WEAPONS}=require('../tmp/arena-bake.cjs');
 global.fetch=async url=>{const b=fs.readFileSync(path.join(root,'public',String(url)));return {ok:true,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),json:async()=>JSON.parse(b)};};
 const result={};
 for(const id of [...Object.keys(WEAPONS),null]){
  const c=await loadCharacter({skin:'Undead',head:null,armour:null,weapon:id,extra:null},()=>{},new AbortController().signal);
  c.state.setState('Hold');c.attack();const frames=[];
  for(let i=0;i<=120;i++){
   c.state.scrub(Math.min(.999999,i/120)*c.state.duration);c.update(0,'Idle');
   frames.push(c.attackSockets.map(s=>({side:s.side,inner:s.bone.localToWorld(s.inner.clone()).toArray().map(n=>+n.toFixed(5)),outer:s.bone.localToWorld(s.outer.clone()).toArray().map(n=>+n.toFixed(5))})));
  }
  result[id||'unarmed']={durations:c.state.durations,windows:attackWindows(c.attackProfile,c.attackEvents),frames};c.dispose();console.log('Baked',id||'unarmed');
 }
 fs.writeFileSync(path.join(root,'lib/arena/weapon-paths.json'),JSON.stringify(result));
})().catch(e=>{console.error(e);process.exitCode=1});
