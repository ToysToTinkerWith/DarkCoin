const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
require('esbuild').buildSync({stdin:{resolveDir:path.resolve(__dirname,'..'),contents:`export * from './lib/arena/skills';export * from './lib/arena/champion-xp';export * from './lib/arena/champion-stats';export * from './lib/arena/simulation';export * from './components/arena/playground/preview-data';export * from './components/arena/playground/skill-storage';export {buildArenaStats} from './components/contracts/Arena/arenaBalanceV1';`},bundle:true,platform:'node',outfile:path.resolve(__dirname,'../tmp/arena-skills-test.cjs')});
const s=require('../tmp/arena-skills-test.cjs');
const champion=(id,skills={})=>({id,loadout:{skin:'Undead',head:'bone',armour:'leather_garb',weapon:'dragon_longsword',magic:'fire_magic'},progression:s.championLevel('10000'),skills});

test('legacy XP thresholds and one point per level, including exact uint64 values',()=>{
 for(const [xp,level] of [[0,1],[99,1],[100,2],[399,2],[400,3],[899,3],[900,4],[1600,5],[10000,11]]){
  const p=s.championLevel(xp);assert.equal(p.level,level);assert.equal(p.points,level);assert(p.progress>=0&&p.progress<100);
 }
 const max=s.championLevel('18446744073709551615');assert.equal(max.xp,'18446744073709551615');assert.equal(max.level,429496730);
 for(const invalid of [-1,'1.5','garbage','18446744073709551616'])assert.throws(()=>s.championLevel(invalid));
});
test('reads the original big-endian asset ID + xp box and never confuses missing XP with service failure',async()=>{
 let url;const bytes=Buffer.alloc(8);bytes.writeBigUInt64BE(4900n);
 const p=await s.readChampionProgression(123456789,async u=>{url=new URL(u);return {value:bytes.toString('base64')};});
 assert(url.pathname.includes('/1870514811/box'));const name=Buffer.from(url.searchParams.get('name').slice(4),'base64');assert.equal(name.readBigUInt64BE(),123456789n);assert.equal(name.subarray(8).toString(),'xp');assert.equal(p.level,8);
 assert.equal((await s.readChampionProgression(1,async()=>null)).xp,'0');
 await assert.rejects(s.readChampionProgression(1,async()=>{throw Error('Algod unavailable');}),/unavailable/);
 await assert.rejects(s.readChampionProgression(1,async()=>({value:Buffer.alloc(9).toString('base64')})),/Invalid/);
});
test('rejects forged, excessive, fractional, negative and prerequisite-skipping builds',()=>{
 assert.throws(()=>s.validateSkills({vitality:2},'0'),/exceeds/);
 for(const bad of [{force:4},{force:-1},{force:1.2},{force:'1'},{fake:1},[],null])assert.throws(()=>s.validateSkills(bad,'10000'));
 assert.throws(()=>s.validateSkills({tempo:1},'10000'),/requires/);
 assert.throws(()=>s.validateSkills({force:2,precision:1},'10000'),/requires/);
 assert.deepEqual(s.validateSkills({force:2,tempo:2,precision:3},'10000'),{force:2,tempo:2,precision:3});
 assert.deepEqual(s.changeSkill({force:2,tempo:2,precision:3,vitality:1},'force',-1,'10000'),{force:1,vitality:1});
});
test('preview and authority use identical bonuses, caps, health, movement and attack speed with isolated cache entries',()=>{
 const a=champion(1,{force:2,tempo:3,vitality:3}),b=champion(2);
 const expected=s.buildChampionStats(a),base=s.buildChampionStats(b),preview=s.championPreview(a.loadout,a.skills,a.progression.xp);
 assert.deepEqual(preview.stats,expected.stats);assert.equal(expected.stats.maxHealth,base.stats.maxHealth+24);
 assert(preview.contributions.maxHealth.some(c=>c.name==='Vitality · skill'&&c.value===24));
 const room=s.createRoom(100,42);room.beast=null;s.addPlayer(room,'a',a);s.addPlayer(room,'b',b);
 assert.equal(s.snapshot(room).players.a.maxHealth,expected.stats.maxHealth);assert.equal(s.snapshot(room).players.b.maxHealth,base.stats.maxHealth);
 room.players.a.carry=room.players.b.carry='Hold';
 s.applyInput(room,'a',{seq:1,x:0,z:0,yaw:0,action:'attack'});s.applyInput(room,'b',{seq:1,x:0,z:0,yaw:0,action:'attack'});
 assert(room.players.a.action.duration<room.players.b.action.duration);assert.equal(room.players.a.action.duration,preview.attackSeconds);
 const fast=champion(3,{endurance:2,recovery:2,footwork:3});s.addPlayer(room,'c',fast);
 assert.equal(s.realtimeSnapshot(room).players.c.motion.speedPct,s.buildChampionStats(fast).stats.moveSpeedPct);
 assert.equal(s.buildArenaStats(a.loadout,{maxHealth:500,critChancePct:99}).stats.maxHealth,280);
 assert.equal(s.buildArenaStats(a.loadout,{critChancePct:99}).stats.critChancePct,25);
});
test('per-champion saves survive reopening, isolate champions, refund and reject damaged saves',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
 s.saveSkills(storage,101,'900',{vitality:3});assert.deepEqual(s.loadSavedSkills(storage,101,'900').skills,{vitality:3});assert.deepEqual(s.loadSavedSkills(storage,102,'900').skills,{});
 assert.deepEqual(s.loadSavedSkills(storage,101,'0').skills,{});assert(s.loadSavedSkills(storage,101,'0').notice);
 s.saveSkills(storage,101,'900',{});assert.deepEqual(s.loadSavedSkills(storage,101,'900').skills,{});
 data.set([...data.keys()][0],'{broken');assert(s.loadSavedSkills(storage,101,'900').notice);
 assert.throws(()=>s.saveSkills({setItem(){throw Error('quota');}},101,'0',{vitality:1}),/quota/);
});

 test('four expansion paths validate, affect real stats and preserve original browser saves',()=>{
  assert.equal(s.SKILL_BRANCHES.length,8);assert.equal(s.SKILL_NODES.length,24);
  for(const id of ['duelist','spellbreaker','reaver','pathfinder']){
   const branch=s.SKILL_BRANCHES.find(b=>b.id===id),ranks=Object.fromEntries(branch.nodes.map(n=>[n.id,3]));
   assert.deepEqual(s.validateSkills(ranks,'6400'),ranks);
   const c=champion(90,ranks),stats=s.buildChampionStats(c).stats,base=s.buildChampionStats(champion(91)).stats;
   for(const node of branch.nodes)for(const key of Object.keys(node.bonus))assert(stats[key]>base[key],key);
   assert.throws(()=>s.validateSkills({[branch.nodes[2].id]:1},'6400'),/requires/);
   assert.deepEqual(s.changeSkill(ranks,branch.nodes[0].id,-1,'6400'),{...ranks,[branch.nodes[0].id]:2});
  }
  assert.equal(s.ARENA_SKILLS_VERSION,1);
 });
