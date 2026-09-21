const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('path');
require('../tmp/champion-model-tools/node_modules/esbuild').buildSync({stdin:{contents:"export * from './lib/arena/simulation';export * from './lib/arena/wire';export * from './lib/arena/jump';export * from './components/contracts/Arena/arenaBalanceV1';",resolveDir:path.resolve(__dirname,'..')},bundle:true,platform:'node',outfile:path.resolve(__dirname,'../tmp/arena-jump-tests.cjs')});
const s=require('../tmp/arena-jump-tests.cjs');
const loadout={skin:'Light Skin',head:null,armour:null,weapon:'dragon_staff',magic:'fire_magic',extra:null,background:'noir_background'};
const input=(seq,action)=>({seq,x:0,z:0,yaw:0,action});
function setup(weapon='dragon_staff'){const r=s.createRoom(100,42);r.dummy=null;const p=s.addPlayer(r,'a',{id:1,loadout:{...loadout,weapon},baselineSpell:'renewing_light'});Object.assign(p,{x:0,z:0,yaw:0});p.input.yaw=0;return {r,p};}
function run(r,t){s.advance(r,r.time+t);}
test('every stowed weapon punches twice with blunt damage and no weapon projectile/proc',()=>{
 for(const weapon of Object.keys(s.WEAPONS).filter(id=>!s.WEAPONS[id].permanent)){
  const {r,p}=setup(weapon),q=s.addPlayer(r,'b',{id:2,loadout:{...loadout,weapon:null}});Object.assign(q,{x:0,z:.72,hp:10000});
  assert.deepEqual(s.applyInput(r,'a',input(1,'attack')),{});assert(p.action.unarmed);assert.equal(p.action.spec.id,'unarmed');assert.equal(p.action.duration,1/(1+s.buildArenaStats(p.champion.loadout).stats.hastePct/100));
  run(r,1.4);const hits=r.events.filter(e=>e.type==='hit'&&e.playerId==='b');assert.equal(hits.length,2,weapon);assert(hits.every(e=>e.damageType==='blunt'));assert.equal(r.projectiles.length,0);assert.equal(Object.keys(q.statuses).length,0);assert.equal(p.carry,'Carry');
 }
});
test('draw switches back to equipped attacks; fists do not reach a distant target',()=>{
 const {r,p}=setup(),q=s.addPlayer(r,'b',{id:2,loadout:{...loadout,weapon:null}});Object.assign(q,{x:0,z:2,hp:10000});s.applyInput(r,'a',input(1,'attack'));run(r,1.2);assert.equal(q.hp,10000);
 s.applyInput(r,'a',input(2,'toggle'));run(r,3);assert.equal(p.carry,'Hold');s.applyInput(r,'a',input(3,'attack'));assert.equal(p.action.unarmed,false);assert(p.action.spec.projectile);
});
test('jump follows shared height, allows concurrent attack/movement, rejects double jumps and stun',()=>{
 const {r,p}=setup();s.applyInput(r,'a',input(1,'attack'));const action=p.action;
 assert.deepEqual(s.applyInput(r,'a',{...input(2,'jump'),x:1}),{});assert.equal(p.action,action);assert.equal(p.jumpStart,100);
 assert(s.applyInput(r,'a',input(3,'jump')).error);assert(s.applyInput(r,'a',input(2,'jump')).duplicate);
 s.applyInput(r,'a',{...input(4),x:1});run(r,s.JUMP_DURATION/2);assert(Math.abs(p.y-s.JUMP_HEIGHT)<1e-8);assert(p.x>0);assert.equal(s.sampleJump(100,r.time).tuck,1);
 run(r,s.JUMP_DURATION/2+.01);assert.equal(p.y,0);p.stunnedUntil=r.time+1;assert(s.applyInput(r,'a',input(5,'jump')).error);p.stunnedUntil=0;assert.deepEqual(s.applyInput(r,'a',input(6,'jump')),{});
});
test('jump raises projectile launch and target body capsule, not only rendered model',()=>{
 const ground=setup(),air=setup();for(const x of [ground,air]){x.p.carry='Hold';s.applyInput(x.r,'a',input(1,'cast'));}s.applyInput(air.r,'a',input(2,'jump'));
 run(ground.r,.4);run(air.r,.4);assert.equal(air.r.projectiles.length,1);assert(air.r.projectiles[0].y>ground.r.projectiles[0].y+.6);
 // The upper capsule follows an airborne target rather than its ground position.
 assert.equal(s.capsuleHit([0,2.5,.72],[0,2.5,.72],{x:0,z:.72,y:0},.1),false);
 assert.equal(s.capsuleHit([0,2.5,.72],[0,2.5,.72],{x:0,z:.72,y:s.JUMP_HEIGHT},.1),true);
});
test('jump timestamp, unarmed flag and both cooldown starts survive delta encoding',()=>{
 const {r,p}=setup();s.applyInput(r,'a',input(1,'jump'));s.applyInput(r,'a',input(2,'attack'));
 const decoded=s.decodeState(s.encodeState(s.realtimeSnapshot(r)));assert.equal(decoded.players.a.jumpStart,100);assert(decoded.players.a.action.unarmed);
 run(r,1.2);s.applyInput(r,'a',input(3,'baseline'));run(r,1.1);s.applyInput(r,'a',input(4,'cast'));run(r,1.1);
 const next=s.decodeState(s.encodeState(s.realtimeSnapshot(r))).players.a;assert(next.magicCooldownStart>next.baselineCooldownStart);assert(next.cooldownUntil>next.magicCooldownStart);assert(next.baselineCooldownUntil>next.baselineCooldownStart);
});
