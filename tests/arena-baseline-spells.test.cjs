const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('path');
require('../tmp/champion-model-tools/node_modules/esbuild').buildSync({stdin:{contents:"export * from './lib/arena/simulation';export * from './lib/arena/wire';export * from './components/contracts/Arena/baselineSpells';export * from './components/arena/playground/preview-data';",resolveDir:path.resolve(__dirname,'..')},bundle:true,platform:'node',outfile:path.resolve(__dirname,'../tmp/arena-baseline-tests.cjs')});
const s=require('../tmp/arena-baseline-tests.cjs');
const loadout={skin:'Light Skin',head:null,armour:null,weapon:null,magic:null,extra:null,background:'noir_background'};
const input=(seq,action='baseline')=>({seq,x:0,z:0,yaw:0,action});
function setup(spell,seed=42,magic=null){const r=s.createRoom(100,seed);r.dummy=null;const p=s.addPlayer(r,'a',{id:1,loadout:{...loadout,magic},baselineSpell:spell});Object.assign(p,{x:0,z:0,yaw:0,hp:60});p.input.yaw=0;return {r,p};}
function run(r,seconds){const end=r.time+seconds;while(r.time<end-1e-6){for(const p of Object.values(r.players))p.lastSeen=r.time;s.advance(r,Math.min(end,r.time+1/60));}}
test('heals release once, respect HP cap, grant real buffs, expire and replicate',()=>{
 for(const id of ['renewing_light','ironbloom']){
  const {r,p}=setup(id);s.applyInput(r,'a',input(1));run(r,.2);assert.equal(p.hp,60);run(r,1);
  assert(p.hp>60);assert.equal(r.events.filter(e=>e.type==='heal').length,1);assert.deepEqual(p.buffs['baseline:'+id].stats,s.BASELINE_SPELLS[id].buff.stats);
  const wire=s.decodeState(s.encodeState(s.realtimeSnapshot(r)));assert.equal(wire.players.a.buffs[0].spellId,id);assert(wire.players.a.baselineCooldownUntil>r.time);
  if(id==='renewing_light')assert.equal(wire.players.a.motion.speedPct,6);
  assert(s.applyInput(r,'a',input(2)).error);assert.equal(r.events.filter(e=>e.type==='heal').length,1);
  run(r,5);assert(!p.buffs['baseline:'+id]);p.hp=199;p.baselineCooldownUntil=0;s.applyInput(r,'a',input(3));run(r,1.2);assert.equal(p.hp,200);
 }
});
test('trait magic and baseline keep independent cooldowns but cannot overlap actions',()=>{
 const {r,p}=setup('arcane_dart',42,'fire_magic');s.applyInput(r,'a',input(1));assert(s.applyInput(r,'a',input(2,'cast')).error);run(r,.8);
 assert(p.baselineCooldownUntil>r.time);assert.equal(p.cooldownUntil,0);assert(!s.applyInput(r,'a',input(3,'cast')).error);run(r,.8);assert(p.cooldownUntil>r.time);assert(s.applyInput(r,'a',input(4)).error);
});
test('interrupt before release cancels heal and starts only its own cooldown',()=>{
 const {r,p}=setup('renewing_light'),enemy=s.addPlayer(r,'b',{id:2,loadout});s.applyInput(r,'a',input(1));s.applyStatus(r,enemy,p,'stagger',1,'weapon');run(r,1);assert.equal(p.hp,60);assert.equal(Object.keys(p.buffs).length,0);assert(p.baselineCooldownUntil>r.time);assert.equal(p.cooldownUntil,0);
});
test('projectile dimensions, forward direction and range match catalog; dodge still works',()=>{
 for(const id of ['arcane_dart','frost_spark']){const {r,p}=setup(id);s.applyInput(r,'a',input(1));run(r,.55);assert.equal(r.projectiles.length,1);const shot=r.projectiles[0],spec=s.BASELINE_SPELLS[id].projectile;assert.equal(shot.width,spec.widthM);assert.equal(shot.range,spec.maxRangeM);assert.equal(shot.dx,0);assert.equal(shot.dz,1);assert.equal(shot.dy,0);run(r,2);assert.equal(r.projectiles.length,0);}
});
test('area marks fixed forward position, hits each target once and ignores outside/self',()=>{
 const {r,p}=setup('ember_burst');const targets=[];for(let i=0;i<3;i++){const q=s.addPlayer(r,'b'+i,{id:i+2,loadout});Object.assign(q,{x:i===2?2.5:i*.8,z:3,hp:200});targets.push(q);}
 s.applyInput(r,'a',input(1));run(r,.3);const mark=r.events.find(e=>e.type==='spellTelegraph');assert.equal(mark.z,3);assert.equal(mark.radius,1.5);
 p.input.yaw=Math.PI/2;run(r,1);assert(targets[0].hp<200);assert(targets[1].hp<200);assert.equal(targets[2].hp,200);assert.equal(p.hp,60);assert.equal(r.events.filter(e=>e.type==='hit'&&e.amount>10).length,2);assert.equal(r.events.filter(e=>e.type==='spellBurst').length,1);
});
test('direct spell impacts roll independent criticals and procs, heals can crit',()=>{
 let crits=0,procs=0,plain=0,healCrit=0;
 for(let seed=1;seed<=100;seed++){
  const {r,p}=setup('frost_spark',seed),q=s.addPlayer(r,'b',{id:2,loadout});Object.assign(q,{x:0,z:3});s.applyInput(r,'a',input(1));run(r,1.2);
  const hit=r.events.find(e=>e.type==='hit');assert(hit);if(hit.critical)crits++;if(q.statuses.chill)procs++;else plain++;
  const h=setup('ironbloom',seed);s.applyInput(h.r,'a',input(1));run(h.r,1.2);if(h.r.events.find(e=>e.type==='heal').critical)healCrit++;
 }assert(crits>0&&crits<30);assert(procs>0&&plain>0);assert(healCrit>0&&healCrit<30);
});
test('unknown IDs and prototype keys cannot grant spells; actions cannot choose a different spell',()=>{
 for(const id of ['fire_magic','__proto__','constructor',{},'999'])assert.throws(()=>setup(id));
 const {r,p}=setup(null);assert(s.applyInput(r,'a',{...input(1),spellId:'ironbloom'}).error);assert.equal(p.action,null);
});
test('item notes explain permanent contributions without including conditional stats',()=>{
 const p=s.championPreview({...loadout,skin:'Undead',armour:'leather_garb',head:'elder'});
 assert.deepEqual(p.contributions.maxHealth,[{slot:'armour',name:'Leather Garb',value:10},{slot:'skin',name:'Undead',value:10}]);assert(p.contributions.maxStamina.some(c=>c.name==='Leather Garb'&&c.value===15));assert.deepEqual(p.contributions.abilityPowerPct,[]);
});
