const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('path');
require('../tmp/champion-model-tools/node_modules/esbuild').buildSync({stdin:{contents:"export * from './lib/arena/simulation';export * from './components/contracts/Arena/arenaBalanceV1';export * from './lib/arena/wire';",resolveDir:path.resolve(__dirname,'..')},bundle:true,platform:'node',outfile:path.resolve(__dirname,'../tmp/arena-status-tests.cjs')});
const s=require('../tmp/arena-status-tests.cjs');
test('every reviewed melee capsule fits inside its authoritative reach cutoff',()=>{
 const paths=require('../lib/arena/weapon-paths.json');
 for(const [id,motion] of Object.entries(paths)){
  const spec=id==='unarmed'?s.UNARMED:s.WEAPONS[id];if(spec.projectile)continue;
  for(const window of motion.windows){
   const phases=[window.start,window.end,...motion.frames.map((_,i)=>i/(motion.frames.length-1)).filter(p=>p>window.start&&p<window.end)];
   for(const phase of phases){const blade=s.bladeAt(id,phase,window.side);for(const q of [blade.inner,blade.outer])assert(Math.hypot(q[0],q[2])+spec.hitRadiusM<=spec.reachM+1e-6,id+' must not clip its displayed collider');}
  }
 }
});
test('sickle and Arctic katana can hit the reviewed collider edge beyond their former cutoff',()=>{
 const paths=require('../lib/arena/weapon-paths.json');
 for(const [id,oldReach] of [['sickle',1.3],['arctic_dual_katana',1.5]]){
  const motion=paths[id],spec=s.WEAPONS[id];let tip=null,radius=0;
  for(const w of motion.windows)for(let i=0;i<=480;i++){
   const blade=s.bladeAt(id,w.start+(w.end-w.start)*i/480,w.side);
   for(const q of [blade.inner,blade.outer])if(q[1]>=.4&&q[1]<=1.65&&Math.hypot(q[0],q[2])>radius){tip=q;radius=Math.hypot(q[0],q[2]);}
  }
  assert(tip);const distance=radius+spec.hitRadiusM+.28-.02;assert(distance>oldReach+.28);
  const room=s.createRoom(100,1),a=s.addPlayer(room,'a',{id:1,loadout:{skin:'Light Skin',weapon:id}}),b=s.addPlayer(room,'b',{id:2,loadout:{skin:'Light Skin',weapon:null}});room.dummy=null;
  Object.assign(a,{x:0,z:0,yaw:0,carry:'Hold'});a.input.yaw=0;Object.assign(b,{x:tip[0]/radius*distance,z:tip[2]/radius*distance,hp:10000});
  s.applyInput(room,'a',{seq:1,x:0,z:0,yaw:0,action:'attack'});s.advance(room,100+spec.cycleSeconds+.2);
  assert(room.events.some(e=>e.type==='hit'&&e.playerId==='b'),id+' must hit at the previously clipped edge');
 }
});
function fixture(){const room=s.createRoom(100,12),source=s.addPlayer(room,'source',{id:200,name:'Stack test',loadout:{skin:'Light Skin',weapon:'scythe'}});source.x=6;source.z=6;return {room,source,target:room.dummy};}
test('repeat application adds potency, doubles DOT and resets expiry without an instant tick',()=>{
 const {room,source,target}=fixture();s.applyStatus(room,source,target,'bleed',1.15,'weapon');const first=target.statuses.bleed;
 assert.equal(first.stacks,1);assert.equal(first.potency,1.15);s.advance(room,100.5);const hp=target.hp;
 s.applyStatus(room,source,target,'bleed',1.15,'weapon');const second=target.statuses.bleed;
 assert.equal(second.stacks,2);assert.equal(second.potency,2.3);assert.equal(second.damagePerSecond,first.damagePerSecond*2);assert.equal(second.until,103.5);assert.equal(target.hp,hp);
 const before=target.hp;s.advance(room,100.75);assert(Math.abs(before-target.hp-second.damagePerSecond*second.powerMultiplier*.25)<1e-8);
 const status=s.snapshot(room).dummy.statuses[0];assert.equal(status.stacks,2);assert.equal(status.potency,2.3);
});
test('stacks exceed former potency and shared DPS caps, mixed strengths add, expiry restarts at one',()=>{
 const {room,source,target}=fixture();for(const p of [1.15,.85,1.15,.85])s.applyStatus(room,source,target,'bleed',p,'weapon');
 assert.equal(target.statuses.bleed.stacks,4);assert.equal(target.statuses.bleed.potency,4);assert.equal(target.statuses.bleed.damagePerSecond,12);
 const hp=target.hp,rate=12*target.statuses.bleed.powerMultiplier;s.advance(room,100.5);assert(Math.abs(hp-target.hp-rate*.5)<1e-8);
 s.advance(room,103.1);assert(!target.statuses.bleed);s.applyStatus(room,source,target,'bleed',.85,'weapon');assert.equal(target.statuses.bleed.stacks,1);assert.equal(target.statuses.bleed.potency,.85);
});
test('different attackers preserve weighted DOT power while latest application receives credit',()=>{
 const {room,source,target}=fixture();s.applyStatus(room,source,target,'burn',1,'weapon');const power=target.statuses.burn.powerMultiplier;
 const other=s.addPlayer(room,'other',{id:201,loadout:{skin:'Light Skin',weapon:'dragon_staff'}});s.applyStatus(room,other,target,'burn',1,'ability');
 const one=fixture();const same=s.addPlayer(one.room,'other',{id:201,loadout:{skin:'Light Skin',weapon:'dragon_staff'}});s.applyStatus(one.room,same,one.target,'burn',1,'ability');
 assert.equal(target.statuses.burn.stacks,2);assert.equal(target.statuses.burn.source,'other');assert.equal(target.statuses.burn.powerMultiplier,(power+one.target.statuses.burn.powerMultiplier)/2);
});
test('slow and weaken stacks cannot invert movement or turn damage into healing; control effects have badges',()=>{
 const {room,source,target}=fixture();for(let i=0;i<20;i++){s.applyStatus(room,source,target,'chill',1,'weapon');s.applyStatus(room,source,target,'weaken',1,'weapon');}
 assert.equal(target.statuses.chill.slowPct,100);assert.equal(target.statuses.weaken.powerReductionPct,100);assert.equal(target.statuses.chill.stacks,20);
 s.applyStatus(room,source,target,'stagger',1,'weapon');s.applyStatus(room,source,target,'stagger',1,'weapon');assert.equal(target.statuses.stagger.stacks,2);assert.equal(target.statuses.stagger.durationSeconds,.32);
 s.applyStatus(room,source,target,'knockback',1,'weapon');assert.equal(target.statuses.knockback.stacks,1);
});
test('two successful katana procs add two stacks; retransmitted input does not add another',()=>{
 const room=s.createRoom(100,1),a=s.addPlayer(room,'a',{id:1,loadout:{skin:'Light Skin',weapon:'arctic_dual_katana'}}),b=s.addPlayer(room,'b',{id:2,loadout:{skin:'Light Skin',weapon:null}});room.dummy=null;
 Object.assign(a,{x:0,z:0,yaw:0,carry:'Hold'});Object.assign(b,{x:0,z:1,hp:10000});a.input.yaw=0;
 const effect=s.WEAPONS.arctic_dual_katana.onHit[0],chance=effect.chance;effect.chance=1;
 try{const input={seq:1,x:0,z:0,yaw:0,action:'attack'};s.applyInput(room,'a',input);s.applyInput(room,'a',input);s.advance(room,101.1);assert.equal(b.statuses.chill.stacks,2);assert.equal(b.statuses.chill.potency,1.6);}finally{effect.chance=chance;}
});
test('stack counts and refreshed expiry survive acknowledged deltas and full reconnect snapshots',()=>{
 const {room,source,target}=fixture(),sender=new s.DeltaSender();
 s.applyStatus(room,source,source,'bleed',1.15,'weapon');s.applyStatus(room,source,target,'bleed',1.15,'weapon');
 const first=sender.packet(s.realtimeSnapshot(room),0);let client=s.applyPacket(first,null);sender.acknowledge(first.n);
 s.advance(room,100.5);s.applyStatus(room,source,source,'bleed',1.15,'weapon');s.applyStatus(room,source,target,'bleed',1.15,'weapon');
 const delta=sender.packet(s.realtimeSnapshot(room),0);assert.equal(delta.b,first.n);client=s.applyPacket(delta,client);
 const check=encoded=>{const state=s.decodeState(encoded);for(const list of [state.players.source.statuses,state.dummy.statuses]){assert.equal(list[0].stacks,2);assert.equal(list[0].potency,2.3);assert.equal(list[0].until,103.5);}};
 check(client);sender.reset();const full=sender.packet(s.realtimeSnapshot(room),0);assert.equal(full.b,0);check(s.applyPacket(full,null));
});
