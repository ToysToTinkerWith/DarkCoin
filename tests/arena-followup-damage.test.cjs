const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('path');
require('esbuild').buildSync({stdin:{resolveDir:path.resolve(__dirname,'..'),contents:"export * from './lib/arena/simulation';export * from './components/contracts/Arena/arenaBalanceV1';export {AttackCard} from './components/arena/playground/ChampionDetails';"},bundle:true,platform:'node',loader:{'.js':'jsx'},external:['react','react-dom'],outfile:path.resolve(__dirname,'../tmp/followup-damage-tests.cjs')});
const s=require('../tmp/followup-damage-tests.cjs'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const mean=roll=>{const [,n,d,b]=roll.match(/^(\d+)d(\d+)([+-]\d+)?$/);return +n*(+d+1)/2+(+b||0);};
function setup(id,seed=42){const room=s.createRoom(100,seed);room.beast=null;s.syncTrainingDummy(room);const p=s.addPlayer(room,'p',{id:1,loadout:{skin:'Light Skin',weapon:id==='unarmed'?null:id}});Object.assign(p,{x:0,z:-1,yaw:0,carry:'Hold',stamina:1000});p.input.yaw=0;return {room,p};}
function run(room,seconds){const end=room.time+seconds;while(room.time<end-1e-8){for(const p of Object.values(room.players))p.lastSeen=room.time;s.advance(room,Math.min(end,room.time+1/60));}}
const attack=(room,seq)=>s.applyInput(room,'p',{seq,x:0,z:0,yaw:0,action:'attack'});

test('paired original attacks retain both independent hits without adding a second action',()=>{
 const effect=s.WEAPONS.arctic_dual_katana.onHit[0],chance=effect.chance;effect.chance=1;
 try{const {room}=setup('arctic_dual_katana');attack(room,1);run(room,.1);attack(room,2);run(room,2.6);const hits=room.events.filter(e=>e.type==='hit'&&e.playerId==='training-dummy');assert.equal(hits.length,2);assert.deepEqual(hits.map(h=>h.damageType),['frost','frost']);assert.equal(room.dummy.statuses.chill.stacks,2);}finally{effect.chance=chance;}
});
test('every attack card shows only the original dice and stamina',()=>{
 for(const trait of [...Object.values(s.WEAPONS),s.UNARMED]){const html=renderToStaticMarkup(React.createElement(s.AttackCard,{trait,attackSeconds:trait.cycleSeconds}));assert(html.includes(trait.damageRolls.join(' / ')));assert(!/DOUBLE CLICK|data-followup|Additional stamina/.test(html));}
});
