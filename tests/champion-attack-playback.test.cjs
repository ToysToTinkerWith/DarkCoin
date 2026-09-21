const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('path');
require('../tmp/champion-model-tools/node_modules/esbuild').buildSync({stdin:{contents:"export {ChampionAttackPlayback} from './components/arena/playground/champion-attack-playback';export {WeaponActionController} from './components/arena/playground/weapon-action-controller';export {WEAPONS,UNARMED,attackTiming} from './components/contracts/Arena/arenaBalanceV1';export {bladeAt} from './lib/arena/simulation';",resolveDir:path.resolve(__dirname,'..')},bundle:true,platform:'node',outfile:path.resolve(__dirname,'../tmp/champion-attack-playback-test.cjs'),external:['three','three/*']});
const {ChampionAttackPlayback,WeaponActionController,WEAPONS,UNARMED,attackTiming,bladeAt}=require('../tmp/champion-attack-playback-test.cjs'),T=require('three');
function character(id,haste=0){const timing=attackTiming(id,2,haste),state=new WeaponActionController({Draw:1,Stow:1,Swing:2},timing.speedFactor);return{state,attack(){return state.trigger('Swing')},update(dt){state.update(dt);this.lastPhase=state.posePhase;}};}
test('all equipped weapon previews use actual cycles, strike windows and authoritative hitbox paths',()=>{
 for(const id of [...Object.keys(WEAPONS),null]){
  const scene=new T.Scene(),c=character(id,12),p=new ChampionAttackPlayback(scene,c,id),spec=id?WEAPONS[id]:UNARMED;
  assert(Math.abs(p.duration-spec.cycleSeconds/1.12)<1e-8);
  if(!spec.projectile){
   for(const collider of p.colliders){const phase=(collider.window.start+collider.window.end)/2;p.time=phase*p.duration;const current=p.update(0);assert(current.active>0);assert(collider.root.visible);assert(Math.abs(c.lastPhase-phase)<1e-8);const b=bladeAt(p.id,phase,collider.window.side);assert(collider.root.children[1].position.distanceTo(new T.Vector3(...b.inner))<1e-8);assert(collider.root.children[2].position.distanceTo(new T.Vector3(...b.outer))<1e-8);}
  }else{
   p.time=p.release-.001;p.update(0);assert(!p.projectile.visible);
   p.time=p.release+.2;p.update(0);assert(p.projectile.visible);const expected=bladeAt(p.id,p.motion.windows[0].release,null).outer;assert(Math.abs(p.projectile.position.z-(expected[2]+.2*spec.projectile.speedMps))<1e-8);assert.equal(p.projectile.position.x,expected[0]);
   p.time=p.release+p.flight+.1;p.update(0);assert(!p.projectile.visible);
  }
  const time=p.time,phase=c.lastPhase;p.update(0);assert.equal(p.time,time);assert.equal(c.lastPhase,phase);
  p.time=p.total-.01;p.update(.02);assert(Math.abs(p.time-.01)<1e-8);assert(c.state.active);p.dispose();assert.equal(scene.children.length,0);
 }
});
