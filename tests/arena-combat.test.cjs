const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('path');
require('../tmp/champion-model-tools/node_modules/esbuild').buildSync({stdin:{contents:"export * from './lib/arena/simulation'; export * from './lib/arena/walletProof'; export * from './components/contracts/Arena/arenaBalanceV1';",resolveDir:path.resolve(__dirname,'..')},bundle:true,platform:'node',outfile:path.resolve(__dirname,'../tmp/arena-combat-tests.cjs')});
const s=require('../tmp/arena-combat-tests.cjs'),algo=require('algosdk');
const champ=(id,weapon='arctic_dual_katana',magic=null,extras={})=>({id,name:'Champion '+id,loadout:{skin:'Undead',weapon,magic,head:null,armour:null,extra:null,background:'noir_background',...extras}});
function setup(weapon='arctic_dual_katana',magic=null,seed=42,extras={}){const r=s.createRoom(100,seed),a=s.addPlayer(r,'a',champ(1,weapon,magic,extras)),b=s.addPlayer(r,'b',champ(2,null));Object.assign(a,{x:0,z:0,yaw:0,carry:'Hold'});Object.assign(b,{x:0,z:1,yaw:Math.PI,hp:10000});r.dummy=null;a.input.yaw=0;b.input.yaw=Math.PI;return {r,a,b};}
const input=(seq,action)=>({seq,x:0,z:0,yaw:0,run:false,action});
function run(r,seconds){const end=r.time+seconds;while(r.time<end-1e-6){for(const p of Object.values(r.players))p.lastSeen=r.time;s.advance(r,Math.min(end,r.time+1/60));}}

test('both katana strikes independently hit, crit and proc without lockouts',()=>{
 let bothCrit=0,bothProc=0,mixedCrit=0;
 for(let seed=1;seed<=300;seed++){
  const {r,a,b}=setup('arctic_dual_katana',null,seed);s.command(r,'a',input(1,'attack'),100);
  run(r,.48);const first=b.statuses.chill?.appliedAt;
  run(r,.65);const hits=r.events.filter(e=>e.type==='hit'&&e.playerId==='b');assert.equal(hits.length,2);
  if(hits.every(h=>h.critical))bothCrit++;if(hits[0].critical!==hits[1].critical)mixedCrit++;
  if(first&&b.statuses.chill.appliedAt>first)bothProc++;
 }
 assert(bothCrit>0,'consecutive criticals occur');assert(bothProc>0,'second strike refreshes a successful first proc');assert(mixedCrit>0,'crit rolls are independent');
});
test('effect potency scales magnitude and every immediate hit is eligible',()=>{
 assert.equal(s.potentStatus('burn',1.5).damagePerSecond,6);assert.equal(s.potentStatus('chill',2).slowPct,40);assert.equal(s.potentStatus('knockback',1.25).distanceM,.8125);
 for(const strikeIndex of [0,1,0,1])assert(s.tryStatusProc({chance:.5,potency:1.4},{strikeIndex,nowSeconds:0,lastAppliedAtSeconds:0},()=>.1).applied);
 for(const traits of Object.values(s.TRAITS))for(const trait of Object.values(traits))for(const perk of trait.abilities)if(perk.trigger!=='activeAbility'){assert(!perk.cooldownSeconds);assert(!perk.maxActivationsPerRound);}
});
test('triggered healing applies on each hit, without an internal cooldown',()=>{
 const {r,a}=setup('dual_katana',null,8,{head:'farmer'});a.hp=100;s.command(r,'a',input(1,'attack'),100);run(r,1.2);assert.equal(a.hp,106);
});
test('real blade sweep misses targets behind and outside weapon reach',()=>{
 for(const z of [-3,3]){const {r,b}=setup('dark_sword');b.z=z;s.command(r,'a',input(1,'attack'),100);run(r,1.4);assert.equal(b.hp,10000);}
});
test('weapon action locks are cycles, not cooldowns; duplicate input cannot repeat attacks',()=>{
 const {r,a}=setup('dark_sword');s.command(r,'a',input(1,'attack'),100);const id=a.action.id;assert(s.command(r,'a',input(1,'attack'),100).duplicate);assert.equal(a.action.id,id);
 assert(s.command(r,'a',input(2,'attack'),100.1).error);run(r,1.2);assert(!a.action);assert(!s.command(r,'a',input(3,'attack'),r.time).error);assert(a.action.id!==id);
});
test('no magic trait means no cast; magic cooldown begins after casting ends',()=>{
 const {r,a}=setup('dark_sword');assert(s.command(r,'a',input(1,'cast'),100).error);assert.equal(a.cooldownUntil,0);
 const c=setup('dark_sword','fire_magic');s.command(c.r,'a',input(1,'cast'),100);assert.equal(c.a.action.kind,'Cast');assert.equal(c.a.cooldownUntil,0);run(c.r,.4);assert.equal(c.r.projectiles.length,1);assert.equal(c.a.cooldownUntil,0);run(c.r,.3);assert(c.a.cooldownUntil>=111.65-1e-6);assert(s.command(c.r,'a',input(2,'cast'),c.r.time).error);
});
test('all seven equipped magic types release one sized, directed projectile',()=>{
 for(const [id,magic] of Object.entries(s.MAGIC)){const {r,a,b}=setup('dark_sword',id);b.z=8;s.command(r,'a',input(1,'cast'),100);run(r,.4);assert.equal(r.projectiles.length,1,id);const p=r.projectiles[0];assert.equal(p.width,magic.projectile.widthM);assert.equal(p.range,magic.projectile.maxRangeM);assert.equal(p.damageType,magic.damageType);a.yaw=1.5;assert.equal(p.dx,0);assert.equal(p.dz,1);}
});
test('projectiles collide server-side and dead champions are removed',()=>{
 const {r,b}=setup('elf_bow');b.z=4;b.hp=1;s.command(r,'a',input(1,'attack'),100);run(r,2);assert(!r.players.b);assert(r.events.some(e=>e.type==='death'&&e.playerId==='b'));assert(!s.snapshot(r).players.b);
});
test('server bounds speed, stale inputs, radius and disconnect removal',()=>{
 const {r,a}=setup('dark_sword');s.command(r,'a',{...input(1),x:999,z:999,run:true},100);run(r,1);assert(Math.hypot(a.x,a.z)<=3.2*.7+.02);assert.equal(a.vx,0);
 a.lastSeen=r.time;s.advance(r,r.time+13);assert(!r.players.a);assert.throws(()=>s.command(setup().r,'a',{...input(1),x:NaN},100));
});
test('snapshot contains no authoritative RNG, wallet identity, perk internals or damage rolls',()=>{
 const {r}=setup('elf_bow');s.command(r,'a',input(1,'attack'),100);run(r,.9);const snap=JSON.stringify(s.snapshot(r));for(const name of ['rng','walletHash','damageRolls','"spec"'])assert(!snap.includes(name));
});
test('proof binds champion, nonce, wallet and exact expired zero-value transaction',()=>{
 const account=algo.generateAccount(),other=algo.generateAccount(),address=String(account.addr),unsigned=s.createChallenge(address,123,'test-nonce');
 const txn=algo.decodeUnsignedTransaction(new Uint8Array(Buffer.from(unsigned,'base64'))),signed=Buffer.from(txn.signTxn(account.sk)).toString('base64');
 assert(s.verifyProof(signed,{unsigned,address},address));assert.equal(txn.lastValid,1n);assert.equal(txn.payment.amount,0n);assert.equal(txn.fee,0n);
 assert.throws(()=>s.verifyProof(signed,{unsigned:s.createChallenge(address,124,'test-nonce'),address},address));assert.throws(()=>s.verifyProof(signed,{unsigned,address},String(other.addr)));
 const tampered=Buffer.from(signed,'base64');tampered[10]^=1;assert.throws(()=>s.verifyProof(tampered.toString('base64'),{unsigned,address},address));
});

function dummySetup(weapon='arctic_dual_katana',magic=null,seed=1){const r=s.createRoom(100,seed),a=s.addPlayer(r,'a',champ(1,weapon,magic));Object.assign(a,{x:0,z:-1,yaw:0,carry:'Hold'});a.input.yaw=0;return {r,a};}
test('center dummy takes both independent strikes and displays applied effects without occupying a player slot',()=>{
 let proc=false,crit=false;
 for(let seed=1;seed<=40;seed++){const {r}=dummySetup(undefined,null,seed);s.command(r,'a',input(1,'attack'),100);run(r,1.2);const hits=r.events.filter(e=>e.type==='hit'&&e.playerId==='training-dummy');assert.equal(hits.length,2);assert(r.dummy.hp<1000);proc ||= r.events.some(e=>e.type==='status'&&e.playerId==='training-dummy'&&e.statusId==='chill'&&e.potency>0);crit ||= hits.some(h=>h.critical);assert.equal(r.dummy.x,0);assert.equal(r.dummy.z,0);assert.equal(Object.keys(s.snapshot(r).players).length,1);}
 assert(proc);assert(crit);
 const {r}=dummySetup();for(let i=2;i<=8;i++)s.addPlayer(r,String(i),champ(i));assert.equal(Object.keys(r.players).length,8);assert.throws(()=>s.addPlayer(r,'9',champ(9)),/full/);
});
test('dummy receives ranged hits and periodic damage, expires effects and resets health without dying',()=>{
 let burned=false;
 for(let seed=1;seed<=20;seed++){const {r,a}=dummySetup('dragon_staff','fire_magic',seed);a.z=-4;s.command(r,'a',input(1,'cast'),100);run(r,1.1);assert(r.events.some(e=>e.type==='hit'&&e.playerId==='training-dummy'));if(!r.dummy.statuses.burn)continue;burned=true;const hp=r.dummy.hp;run(r,1);assert(r.dummy.hp<hp);run(r,3);assert(!r.dummy.statuses.burn);run(r,7);assert.equal(r.dummy.hp,1000);break;}
 assert(burned);
 const {r}=dummySetup();r.dummy.hp=1;s.command(r,'a',input(1,'attack'),100);run(r,1.2);assert(r.dummy.hp>0);assert(r.events.some(e=>e.type==='dummyReset'));assert(!r.events.some(e=>e.type==='death'&&e.playerId==='training-dummy'));
});
test('dummy obeys weapon reach and can be missed',()=>{const {r,a}=dummySetup('dark_sword');a.z=-5;s.command(r,'a',input(1,'attack'),100);run(r,1.5);assert.equal(r.dummy.hp,1000);assert(!r.events.some(e=>e.type==='hit'));});
