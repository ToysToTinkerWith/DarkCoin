const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../lib/arena/dragon.js'));
const dragon=import('data:text/javascript;base64,'+source.toString('base64'));
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));

test('all seven dragon clips preserve limb lengths and finite, normalized transforms',async()=>{
 const {DRAGON,DRAGON_RIG,dragonWorldPose}=await dragon;
 assert.equal(Object.keys(DRAGON_RIG).length,44);
 assert.equal(Object.keys(DRAGON.clips).length,7);
 for(const clip of Object.keys(DRAGON.clips))for(let i=0;i<=120;i++){
  const world=dragonWorldPose(clip,i/120);
  for(const [name,bone] of Object.entries(DRAGON_RIG)){
   const transform=world[name];
   assert([...transform.p,...transform.q].every(Number.isFinite),`${clip} ${name} contains nonfinite values`);
   assert(Math.abs(Math.hypot(...transform.q)-1)<1e-6,`${clip} ${name} quaternion`);
   if(bone.parent&&name!=='body')assert(Math.abs(distance(transform.p,world[bone.parent].p)-Math.hypot(...bone.p))<1e-6,`${clip} ${name} stretched`);
  }
 }
});

test('attack feet remain planted, tail clears the floor and sweeps across both rear flanks',async()=>{
 const {dragonWorldPose,dragonSockets}=await dragon;
 for(const clip of ['TailSweep','FlameBreath','Bite']){
  const start=dragonWorldPose(clip,0);
  for(let i=0;i<=120;i++){
   const world=dragonWorldPose(clip,i/120);
   for(const foot of ['FrontLFoot','FrontRFoot','BackLFoot','BackRFoot'])assert(distance(start[foot].p,world[foot].p)<.015,`${clip} ${foot} slides`);
   assert(dragonSockets(clip,i/120).tail[1]>.25,`${clip} tail below floor`);
  }
 }
 const left=dragonSockets('TailSweep',.4).tail,right=dragonSockets('TailSweep',.63).tail;
 assert(left[0]<-3&&right[0]>3,'tail must cross both flanks');
 assert(distance(left,right)>6,'tail must cover a broad arc');
});

test('locomotion loops and attacks return smoothly to the idle pose',async()=>{
 const {DRAGON_RIG,dragonWorldPose}=await dragon;
 for(const clip of ['Idle','Walk','Run']){
  const a=dragonWorldPose(clip,0),b=dragonWorldPose(clip,1);
  for(const name of Object.keys(DRAGON_RIG))assert(distance(a[name].p,b[name].p)<1e-6,`${clip} ${name} loop pops`);
 }
 for(const clip of ['TailSweep','FlameBreath','Bite'])for(const t of [0,1]){
  const a=dragonWorldPose(clip,t),b=dragonWorldPose('Idle',t);
  for(const name of Object.keys(DRAGON_RIG))assert(distance(a[name].p,b[name].p)<1e-6,`${clip} ${name} transition pops`);
 }
});

test('breath opens its jaw and emits forward; attack stats have valid costs, windows and proc chances',async()=>{
 const {DRAGON,dragonPose,dragonSockets}=await dragon;
 assert(dragonPose('FlameBreath',.5).jaw.r[0]>.5);
 assert(dragonSockets('FlameBreath',.5).direction[2]>.95);
 assert.equal(DRAGON.critChance,.1);assert.equal(DRAGON.critMultiplier,2);
 assert.deepEqual(Object.keys(DRAGON.resistances).sort(),['arcane','blunt','fire','frost','lightning','piercing','poison','shadow','slashing','water']);
 for(const attack of Object.values(DRAGON.attacks)){
  assert(attack.active[0]>0&&attack.active[1]>attack.active[0]&&attack.active[1]<1);
  assert(attack.stamina>0&&attack.stamina<DRAGON.maxStamina);
  assert.equal(attack.cycle,DRAGON.clips[attack.clip]);
  assert(/^\d+d\d+\+\d+$/.test(attack.damageRoll));
  for(const proc of attack.onHit)assert(proc.chance>0&&proc.chance<=1&&proc.potency>0);
 }
 assert.equal(DRAGON.attacks.breath.ticks,6);
 assert.equal(DRAGON.attacks.tail.cooldown,undefined);assert.equal(DRAGON.attacks.bite.cooldown,undefined);
});

test('final GLB is valid with the full rig and baked animations',async()=>{
 const validator=require('gltf-validator');
 const bytes=fs.readFileSync(path.join(__dirname,'../public/arena/playground/assets/beasts/cindermaw.glb'));
 const report=await validator.validateBytes(new Uint8Array(bytes),{maxIssues:30});
 assert.equal(report.issues.numErrors,0,JSON.stringify(report.issues.messages));
 fs.writeFileSync(path.join(__dirname,'../output/cindermaw/gltf-validation.json'),JSON.stringify(report,null,2));
});
