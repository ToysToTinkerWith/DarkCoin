const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('path');
require('esbuild').buildSync({stdin:{resolveDir:path.resolve(__dirname,'..'),contents:"export * from './lib/arena/simulation';export {WEAPONS,UNARMED} from './components/contracts/Arena/arenaBalanceV1';export {WeaponActionController} from './components/arena/playground/weapon-action-controller';export {composeWeaponPose} from './components/arena/playground/multi-weapon-pose';export {composeMovingPose} from './components/arena/playground/moving-combat-pose';"},bundle:true,platform:'node',outfile:path.resolve(__dirname,'../tmp/arena-combos-test.cjs')});
const s=require('../tmp/arena-combos-test.cjs'),first=require('../lib/arena/weapon-paths.json'),second=require('../lib/arena/weapon-combo-paths.json'),gaits=require('../public/arena/playground/assets/combat.json');
function setup(id='dark_sword') {const room=s.createRoom(100,42);room.beast=null;const p=s.addPlayer(room,'a',{id:1,loadout:{skin:'Undead',weapon:id==='unarmed'?null:id}});p.carry='Hold';p.x=5;p.z=5;p.stamina=1000;return {room,p};}
const press=(room,seq,action='attack')=>s.applyInput(room,'a',{seq,x:0,z:0,yaw:0,action});
function run(room,seconds){const end=room.time+seconds;while(room.time<end-1e-8){for(const p of Object.values(room.players))p.lastSeen=room.time;s.advance(room,Math.min(end,room.time+1/60));}}
test('rapid clicks cannot queue a follow-up for any weapon or unarmed attack',()=>{
 for(const id of Object.keys(first)){const {room,p}=setup(id),spec=id==='unarmed'?s.UNARMED:s.WEAPONS[id];
  assert(!press(room,1).error);const a=p.action,stamina=p.stamina;assert.equal(a.spec,spec);
  run(room,.1);assert.match(press(room,2).error,/Finish/);assert.match(press(room,3).error,/Finish/);
  assert.equal(p.action.id,a.id);assert.equal(p.stamina,stamina);assert(!p.action.comboQueued);
  run(room,a.duration+.1);assert.equal(p.action,null);assert.equal(room.events.filter(e=>e.type==='action').length,1);
  assert(!press(room,4).error);assert.equal(p.action.kind,'Swing');assert.equal(p.action.spec,spec);assert.equal(p.action.duration,a.duration);
 }
});
test('local controller rejects both a queued click and direct Swing2 requests',()=>{
 const state=new s.WeaponActionController({Swing:1,Draw:1,Stow:1});state.setState('Hold');assert(!state.trigger('Swing2'));assert(state.trigger('Swing'));state.update(.1);assert(!state.trigger('Swing'));state.update(1);assert.equal(state.poseAction,'Hold');assert.equal(state.attackId,1);assert(!state.trigger('Swing2'));assert(state.trigger('Swing'));
});
test('rapid clicks fire exactly one projectile per original ranged action',()=>{
 for(const id of ['elf_bow','dragon_staff','lightning_staff']){const {room}=setup(id);press(room,1);run(room,.1);press(room,2);run(room,4.5);assert.equal(room.events.filter(e=>e.type==='projectile').length,1,id);}
});
