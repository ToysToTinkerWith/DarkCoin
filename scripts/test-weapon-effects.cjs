const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),assets=path.join(root,'public/arena/playground/assets'),out=path.join(root,'output/playground');
global.self=global;global.createImageBitmap=async()=>({width:4096,height:4096,close(){}});global.ProgressEvent=class{constructor(t,o){Object.assign(this,o)}};
(async()=>{
 const T=await import('three'),esbuild=require(path.join(root,'tmp/champion-model-tools/node_modules/esbuild')),bundle=path.join(root,'tmp/weapon-effects-test.cjs');
 await esbuild.build({stdin:{contents:"export {loadCharacter} from './components/arena/playground/character';export {WeaponEffects} from './components/arena/playground/weapon-effects';export {weaponEffectsProfile,DAMAGE_COLORS} from './components/arena/playground/weapon-effects-profile';export {WeaponActionController} from './components/arena/playground/weapon-action-controller';export {WEAPONS,UNARMED,buildArenaStats} from './components/contracts/Arena/arenaBalanceV1';",resolveDir:root},bundle:true,platform:'node',format:'cjs',outfile:bundle,external:['three','three/*'],logLevel:'silent'});
 const {loadCharacter,WeaponEffects,WeaponActionController,WEAPONS,UNARMED,buildArenaStats}=require(bundle),originalFetch=global.fetch;
 global.fetch=async url=>{if(!String(url).includes('/assets/'))return originalFetch(url);const b=fs.readFileSync(path.join(assets,String(url).split('/assets/')[1]));return {ok:true,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),json:async()=>JSON.parse(b)};};
 const reports=[];
 try{for(const source of [...Object.values(WEAPONS),UNARMED]){
  const id=source===UNARMED?null:source.id,loadout={skin:'Undead',head:null,armour:null,extra:null,weapon:id},c=await loadCharacter(loadout,()=>{},new AbortController().signal),scene=new T.Scene(),actor=new T.Group();scene.add(actor);actor.add(c.model);actor.position.set(1,0,2);actor.rotation.y=.7;
  const fx=new WeaponEffects(scene,actor,c);assert.equal(c.attackProfile.damageType,source.damageType);
  c.state.setState('Hold');c.update(0,'Idle');assert(c.attack());const duration=c.state.duration;assert(Math.abs(duration-source.cycleSeconds/(1+buildArenaStats(loadout).stats.hastePct/100))<1e-8);assert(!c.attack());const attackId=c.state.attackId;fx.update(0);
  let maxArcs=0,launches=0,projectile=null,launchDirection=null;const launch=fx.launch.bind(fx);fx.launch=s=>{launches++;launch(s);};
  for(let i=0;i<Math.ceil((duration+.35)/.016);i++){
   actor.position.x+=.002;c.update(.016,'Walk');fx.update(.016);maxArcs=Math.max(maxArcs,fx.trails.length+fx.bursts.length);
   for(const tr of fx.trails)for(const s of tr.samples){assert(s.outer.toArray().every(Number.isFinite));assert(s.outer.distanceTo(s.inner)<3);}
   if(!projectile&&fx.projectiles.length){projectile=fx.projectiles[0];launchDirection=fx.forward();assert(projectile.direction.distanceTo(launchDirection)<1e-7);actor.rotation.y+=.6;}
   if(projectile)assert(projectile.direction.distanceTo(launchDirection)<1e-7,'projectile keeps launch heading after champion turns');
  }
  assert.equal(c.state.attackId,attackId);assert.equal(c.state.state,'Hold');
  if(['arrow','spell'].includes(c.attackProfile.kind)){assert.equal(launches,1,id+' emits once per release');assert.equal(maxArcs,0);}else assert(maxArcs>0,id+' draws a melee trail');
  fx.update(3);assert.equal(fx.root.children.length,0,'expired effects cleaned up');fx.dispose();assert(!fx.root.parent);c.dispose();reports.push({id:id||'unarmed',damageType:c.attackProfile.damageType,speedFactor:c.attackProfile.speedFactor,attackDurationSeconds:duration,projectiles:launches,meleeEffect:maxArcs>0});console.log('PASS',id||'unarmed');
 }
 for(const factor of [.7,1,1.3]){const state=new WeaponActionController({Draw:2,Stow:3,Swing:4},factor);assert(state.trigger('Draw'));assert.equal(state.duration,2);state.update(2);assert(state.trigger('Swing'));state.update(2/factor);assert(Math.abs(state.posePhase-.5)<1e-8);state.update(2/factor+.001);assert(state.trigger('Stow'));assert.equal(state.duration,3);}
 assert.throws(()=>new WeaponActionController(undefined,0));
 }finally{global.fetch=originalFetch;}
 fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'weapon-effects-validation.json'),JSON.stringify(reports,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
