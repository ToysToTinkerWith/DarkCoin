const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('path');
require('esbuild').buildSync({stdin:{contents:"export * from './lib/arena/simulation';export * from './lib/arena/beast';export * from './lib/arena/wire';export {buildArenaStats} from './components/contracts/Arena/arenaBalanceV1';export {buildGraveclaw,poseRig} from './scripts/graveclaw-model';",resolveDir:path.resolve(__dirname,'..')},bundle:true,platform:'node',outfile:path.resolve(__dirname,'../tmp/arena-beast-tests.cjs')});
const s=require('../tmp/arena-beast-tests.cjs');
const champion={id:1,name:'Beast test',loadout:{skin:'Undead',weapon:'dark_sword',magic:'fire_magic'}};
function setup(seed=1){const r=s.createRoom(100,seed),p=s.addPlayer(r,'a',champion);r.dummy=null;Object.assign(r.beast,{x:0,z:0,yaw:0,pauseUntil:0});Object.assign(p,{x:0,z:1.42,yaw:Math.PI,spawnedAt:95});p.input.yaw=Math.PI;return {r,p,b:r.beast};}
function run(r,duration){const end=r.time+duration;while(r.time<end-1e-7){for(const p of Object.values(r.players))p.lastSeen=r.time;s.advance(r,Math.min(end,r.time+1/60));}}
test('NPC patrols without claiming a player slot; server pursues with bounded speed',()=>{const {r,p,b}=setup();p.x=10;p.z=10;run(r,2);assert(Math.hypot(b.x,b.z)>1);assert.equal(b.targetId,null);assert.equal(Object.keys(s.snapshot(r).players).length,1);p.x=b.x;p.z=b.z+5;const old=[b.x,b.z];run(r,.5);assert.equal(b.targetId,'a');assert(b.running);assert(Math.hypot(b.x-old[0],b.z-old[1])<=s.GRAVECLAW.runMps*.5+.01);assert(b.stamina<100);});
test('claw combo has readable windup, two independent hits, crits and bleed rolls',()=>{let bothCrit=false,bothBleed=false;for(let seed=1;seed<=400;seed++){const {r,p,b}=setup(seed);p.hp=10000;run(r,.3);assert.equal(p.hp,10000);assert(b.action);run(r,1.3);const direct=r.events.filter(e=>e.type==='hit'&&e.sourceId===b.id&&Object.hasOwn(e,'absorbed'));assert.equal(direct.length,2);bothCrit ||= direct.every(h=>h.critical);bothBleed ||= p.statuses.bleed?.stacks===2;assert(b.stamina<100);}assert(bothCrit);assert(bothBleed);});
test('a committed claw cannot track through a dodge or hit behind itself',()=>{const {r,p,b}=setup();run(r,.1);assert(b.action);p.z=-2;run(r,1.55);assert.equal(p.hp,s.buildArenaStats?s.buildArenaStats(champion.loadout).stats.maxHealth:200);assert.equal(b.yaw,0);});
test('fresh champions have three seconds of NPC grace',()=>{const {r,p}=setup();p.spawnedAt=r.time;run(r,2.9);assert.equal(p.hp,s.buildArenaStats(champion.loadout).stats.maxHealth);assert.equal(r.beast.targetId,null);});
test('champion melee and magic can injure and defeat the beast; it respawns with clean state',()=>{const {r,p,b}=setup();Object.assign(p,{z:1,yaw:Math.PI,carry:'Hold'});b.pauseUntil=1000;b.hp=1;s.applyInput(r,'a',{seq:1,x:0,z:0,yaw:Math.PI,action:'attack'});run(r,1.3);assert.equal(b.hp,0);assert(r.events.some(e=>e.type==='beastDeath'));assert.equal(b.mode,'dead');p.x=10;p.z=10;run(r,25);assert.equal(r.beast.hp,s.GRAVECLAW.maxHealth);assert.deepEqual(r.beast.statuses,{});assert(Math.hypot(p.x-r.beast.x,p.z-r.beast.z)>3);
const c=setup();c.b.pauseUntil=1000;c.p.z=4;c.p.input.yaw=Math.PI;s.applyInput(c.r,'a',{seq:1,x:0,z:0,yaw:Math.PI,action:'cast'});run(c.r,1.4);assert(c.b.hp<s.GRAVECLAW.maxHealth);});
test('status interruption cancels remaining claws and effects expire on beast',()=>{const {r,p,b}=setup();run(r,.1);s.applyStatus(r,p,b,'stagger',1,'ability');assert(b.action.cancelled);run(r,1.6);assert.equal(p.hp,s.buildArenaStats(champion.loadout).stats.maxHealth);assert(!b.statuses.stagger);});
test('stamina recovery prevents unlimited sprint/attack and snapshot hides NPC decisions',()=>{const {r,p,b}=setup();b.stamina=5;p.z=4;run(r,.5);assert.equal(b.mode,'recover');assert(!b.action);assert(b.stamina>5);const snap=s.snapshot(r);assert(!JSON.stringify(snap.beast).includes('targetId'));assert(!JSON.stringify(snap.beast).includes('damageRoll'));});
test('beast deltas update while all champions are idle and survive full resync',()=>{const {r}=setup(),sender=new s.DeltaSender();let packet=sender.packet(s.realtimeSnapshot(r),0),encoded=s.applyPacket(packet);sender.acknowledge(packet.n);run(r,.1);packet=sender.packet(s.realtimeSnapshot(r),0);assert('beast' in packet);encoded=s.applyPacket(packet,encoded);assert.equal(s.decodeState(encoded).beast.action.id,r.beast.action.id);sender.reset();encoded=s.applyPacket(sender.packet(s.realtimeSnapshot(r),0));assert.equal(s.decodeState(encoded).beast.hp,r.beast.hp);});
test('visual claw tip and collision tip agree at every sampled attack frame',()=>{const {model,bones}=s.buildGraveclaw();for(let i=0;i<=100;i++){s.poseRig(bones,'Claw',i/100);model.updateMatrixWorld(true);for(const side of [-1,1]){const b=bones['hand'+(side<0?'L':'R')],point=b.position.clone().set(0,-.16,.59).applyMatrix4(b.matrixWorld),expected=s.beastClawAt(i/100,side).outer;assert(Math.hypot(...expected.map((v,k)=>v-point.toArray()[k]))<1e-6);}}});
test('limbs retain their lengths and rig frames do not flip during any animation',()=>{
 const {model,bones}=s.buildGraveclaw(),rest=s.beastPose('Idle',0);
 for(const tag of ['L','R']){assert.equal(bones['fore'+tag].parent,bones['upper'+tag]);assert.equal(bones['upper'+tag].parent,bones['shoulder'+tag]);assert.equal(bones['thigh'+tag].parent,bones['hipSocket'+tag]);}
 for(const clip of Object.keys(s.GRAVECLAW.clips)){
  let previous=null;
  for(let i=0;i<=240;i++){
   const p=s.beastPose(clip,i/240);s.poseRig(bones,clip,i/240);model.updateMatrixWorld(true);
   for(const [name,joint] of Object.entries(p))if(joint.a){const length=x=>Math.hypot(...x.b.map((n,k)=>n-x.a[k]));assert(Math.abs(length(joint)-length(rest[name]))<1e-7,`${clip}: ${name} stretched`);}
   for(const [name,bone] of Object.entries(bones)){
    assert(bone.scale.toArray().every(n=>Math.abs(n-1)<1e-7));
    if(previous)assert(bone.quaternion.angleTo(previous[name])<.17,`${clip}: ${name} rolled abruptly at ${i}`);
   }
   previous=Object.fromEntries(Object.entries(bones).map(([n,b])=>[n,b.quaternion.clone()]));
  }
 }
});
test('claws wrap across the body with bent elbows instead of straight punches',()=>{
 for(const side of [-1,1]){
  const tag=side<0?'L':'R',start=side<0?.28:.54;
  const angle=t=>{const p=s.beastPose('Claw',t),a=p['upper'+tag],b=p['fore'+tag],u=a.b.map((n,i)=>n-a.a[i]),v=b.b.map((n,i)=>n-b.a[i]);return Math.acos(u.reduce((n,x,i)=>n+x*v[i],0)/(.5*.47))*180/Math.PI;};
  assert(angle(start-.15)>70);
  for(let i=0;i<=16;i++)assert(angle(start+i*.01)>59,'The contact arc must retain its elbow bend');
  const before=s.beastPose('Claw',start)['hand'+tag].p,after=s.beastPose('Claw',start+.16)['hand'+tag].p;
  assert(side*before[0]>.85,'Windup should start outside the shoulder');
  assert(side*after[0]>.1,'Follow-through must stop before the hand crosses into the opposite side');
  assert(Math.abs(after[0]-before[0])>Math.abs(after[2]-before[2])*1.5,'Swipe should travel predominantly across, not straight forward');
 }
});
test('hands stay separated and claw roots clear the torso throughout both swipes',()=>{
 for(let i=0;i<=300;i++){
  const p=s.beastPose('Claw',i/300);assert(Math.hypot(...p.handL.p.map((n,k)=>n-p.handR.p[k]))>.5);
  for(const side of [-1,1]){const c=s.beastClawAt(i/300,side);if(Math.abs(c.inner[0])<.55)assert(c.inner[2]>.45);}
 }
});
test('an exhausted beast retreats, regains stamina and then re-engages',()=>{
 const {r,p,b}=setup();b.stamina=5;p.z=2;const distance=()=>Math.hypot(p.x-b.x,p.z-b.z),before=distance();
 run(r,.5);assert.equal(b.mode,'retreat');assert(distance()>before);assert(b.stamina>5);assert(!b.running);
 run(r,3.2);assert(!b.recovering);assert(['chase','attack','stalk'].includes(b.mode));
});
test('beast death heals all survivors once and respawns after exactly ten seconds',()=>{
 const {r,p,b}=setup(),other=s.addPlayer(r,'b',{...champion,id:2});
 p.hp=40;other.hp=25;other.x=10;other.z=-10;b.hp=1;b.pauseUntil=1000;p.z=1;p.carry='Hold';
 s.applyInput(r,'a',{seq:1,x:0,z:0,yaw:Math.PI,action:'attack'});run(r,1.3);
 assert.equal(b.hp,0);assert.equal(p.hp,s.buildArenaStats(p.champion.loadout).stats.maxHealth);assert.equal(other.hp,s.buildArenaStats(other.champion.loadout).stats.maxHealth);
 assert.equal(b.deadUntil-b.deathAt,10);assert.equal(r.events.filter(e=>e.type==='heal'&&e.sourceId===b.id).length,2);
 p.x=-10;p.z=10;run(r,b.deadUntil-r.time-.1);assert.equal(r.beast.hp,0);run(r,.2);assert.equal(r.beast.hp,s.GRAVECLAW.maxHealth);
});
test('a champion killed by Graveclaw is removed and receives a death event',()=>{
 const {r,p,b}=setup();p.hp=.01;run(r,1.6);assert(!r.players[p.id]);assert(r.events.some(e=>e.type==='death'&&e.playerId===p.id&&e.killerId===b.id));
});

test('center dummy is absent during a living encounter and returns between monsters',()=>{
 const r=s.createRoom(100,1);assert.equal(r.dummy,null);
 s.activateEncounter(r,{id:10,kind:'graveclaw',status:'defeated'});assert.equal(r.dummy.id,'training-dummy');
 s.activateEncounter(r,{id:11,kind:'graveclaw',status:'active'});assert.equal(r.dummy,null);assert.equal(s.snapshot(r).dummy,null);
 r.beast.hp=0;s.advance(r,100.1);assert.equal(s.snapshot(r).dummy.id,'training-dummy');
 s.activateEncounter(r,{id:12,kind:'cindermaw',status:'active'});assert.equal(r.dummy,null);
});
