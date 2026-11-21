const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
require('esbuild').buildSync({stdin:{resolveDir:path.resolve(__dirname,'..'),contents:`export * from './components/contracts/Arena/arenaBalanceV1';export * from './components/contracts/Arena/baselineSpells';export * from './components/arena/playground/weapon-effects-profile';export {damageNumberStyle} from './components/arena/playground/damage-numbers';export * from './lib/arena/simulation';`},bundle:true,platform:'node',outfile:path.resolve(__dirname,'../tmp/arena-damage-feedback-test.cjs')});
const s=require('../tmp/arena-damage-feedback-test.cjs');
test('every weapon, unarmed strike and damaging spell has a type and one consistent color',()=>{
 assert.equal(new Set(Object.values(s.DAMAGE_PALETTE)).size,10);
 for(const [id,w] of Object.entries(s.WEAPONS)){
  assert(s.DAMAGE_TYPES.includes(w.damageType),id);assert.equal(s.weaponEffectsProfile(id).color,s.DAMAGE_PALETTE[w.damageType]);
 }
 for(const spell of [...Object.values(s.MAGIC),...Object.values(s.BASELINE_SPELLS).filter(x=>x.damageType),s.UNARMED])assert(s.DAMAGE_PALETTE[spell.damageType],spell.name);
 for(const spell of Object.values(s.BASELINE_SPELLS).filter(x=>x.damageType))assert.equal(spell.color,s.DAMAGE_PALETTE[spell.damageType]);
});
test('critical hits grow without replacing their damage type color; heals remain distinct',()=>{
 for(const damageType of s.DAMAGE_TYPES){
  const hit=s.damageNumberStyle({type:'hit',amount:26.7,damageType}),crit=s.damageNumberStyle({type:'hit',amount:53.4,damageType,critical:true});
  assert.equal(hit.color,s.DAMAGE_PALETTE[damageType]);assert.equal(crit.color,hit.color);assert(crit.height>hit.height*1.25);assert(crit.width>hit.width*1.25);assert.equal(hit.text,'27');
 }
 assert.equal(s.damageNumberStyle({type:'heal',amount:10}).text,'+10');
});
test('simultaneous DOTs emit separate typed totals and flush their remaining damage at expiry',()=>{
 const room=s.createRoom(100,5);room.beast=null;s.syncTrainingDummy(room);const a=s.addPlayer(room,'a',{id:1,loadout:{skin:'Undead',weapon:'scythe'}});
 s.applyStatus(room,a,room.dummy,'burn',1,'weapon');s.applyStatus(room,a,room.dummy,'poison',1,'weapon');s.applyStatus(room,a,room.dummy,'bleed',1,'weapon');
 s.advance(room,101.2);const hits=room.events.filter(e=>e.type==='hit'&&e.periodic);
 assert.deepEqual(new Set(hits.map(e=>e.damageType)),new Set(['fire','poison','slashing']));assert(hits.every(e=>!e.critical&&e.amount>0));
 s.advance(room,104.3);const final=room.events.filter(e=>e.type==='hit'&&e.periodic);
 const total=final.reduce((n,e)=>n+e.amount,0);assert(Math.abs((1000-room.dummy.hp)-total)<.001);assert.equal(Object.keys(room.dummy.periodicLabels||{}).length,0);
});

test('periodic damage is 60 percent of normal hit size and retains type color',()=>{for(const damageType of s.DAMAGE_TYPES){const hit=s.damageNumberStyle({type:'hit',amount:20,damageType}),dot=s.damageNumberStyle({type:'hit',amount:5,damageType,periodic:true});assert.equal(dot.color,hit.color);assert(Math.abs(dot.width-hit.width*.6)<1e-10);assert(Math.abs(dot.height-hit.height*.6)<1e-10);assert(dot.duration<hit.duration);}});
