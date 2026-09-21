// Local research benchmark only. Does not connect to or write to Firebase.
const fs=require('fs'),path=require('path'),{performance}=require('perf_hooks');
const root=path.resolve(__dirname,'..');
require('../tmp/champion-model-tools/node_modules/esbuild').buildSync({entryPoints:[path.join(root,'lib/arena/simulation.js')],bundle:true,platform:'node',outfile:path.join(root,'tmp/arena-sync-benchmark.cjs')});
const sim=require('../tmp/arena-sync-benchmark.cjs');
const size=v=>Buffer.byteLength(JSON.stringify(v));
const weapons=['dragon_longsword','dragon_staff','dual_katana','scythe','dark_sword','executioner_axe','elf_bow','lightning_staff'];
const fixture=(i)=>({id:1000+i,name:'Benchmark champion '+i,image:'https://example.invalid/ipfs/benchmark-image',traits:{Head:'Bone',Skin:'Undead',Armour:'Leather Garb',Weapon:weapons[i],Magic:'Fire Magic',Extra:'Golden Feathers',Background:'Dawn Background'},loadout:{head:'bone',skin:'Undead',armour:'leather_garb',weapon:weapons[i],magic:'fire_magic',extra:'golden_feathers',background:'dawn_background'}});
function compact(s){return {t:Math.round(s.time*1000),p:Object.values(s.players).map((p,i)=>[i,Math.round(p.x*100),Math.round(p.z*100),Math.round(p.yaw*1000),Math.round(p.vx*100),Math.round(p.vz*100),Math.round(p.hp),Math.round(p.stamina),p.running?1:0,p.carry==='Hold'?1:0,Math.round(p.barrier),Math.round(p.cooldownUntil*1000),p.statuses.map(s=>[s.id,s.potency,Math.round(s.until*1000)])]),a:Object.values(s.players).map((p,i)=>p.action?[i,p.action.id,p.action.kind,Math.round(p.action.start*1000),Math.round(p.action.duration*1000),p.action.cancelled?1:0]:null).filter(Boolean),projectiles:s.projectiles,fields:s.fields,events:s.events};}
function scenario(count,combat){
 const room=sim.createRoom(100,42);for(let i=0;i<count;i++){const p=sim.addPlayer(room,'benchmark-player-'+i,fixture(i));p.carry='Hold';p.hp=100000;}
 const times=[],full=[],small=[],persistent=[];let sequence=0;
 for(let frame=1;frame<=1200;frame++){
  const now=100+frame/30,start=performance.now();
  if(frame%6===0){sequence++;for(const p of Object.values(room.players))sim.command(room,p.id,{seq:sequence,x:combat?Math.sin(frame/70):0,z:combat?Math.cos(frame/70):0,yaw:frame/50,run:combat,action:combat&&sequence%8===0?(sequence%64===0?'cast':'attack'):undefined},now);}
  sim.advance(room,now);
  if(frame>300)times.push(performance.now()-start);
  if(frame>300&&frame%3===0){const s=sim.snapshot(room);full.push(size(s));small.push(size(compact(s)));persistent.push(size(room));}
 }
 const mean=a=>a.reduce((x,y)=>x+y,0)/a.length,quantile=(a,q)=>[...a].sort((a,b)=>a-b)[Math.floor(a.length*q)];
 return {players:count,scenario:combat?'moving and attacking':'stationary (occasional facing input)',localTickMeanMs:mean(times),localTickP95Ms:quantile(times,.95),fullSnapshotMeanBytes:mean(full),compactJsonEstimateMeanBytes:mean(small),persistedRoomMeanBytes:mean(persistent),snapshotReductionPct:100*(1-mean(small)/mean(full))};
}
const results=[1,4,8].flatMap(n=>[scenario(n,false),scenario(n,true)]);
const report={capturedAt:new Date().toISOString(),environment:{node:process.version,platform:process.platform,arch:process.arch},method:'Local Node simulation, 1,200 ticks at simulated 30 Hz, first 300 discarded; no network/Firestore/WebGL. Fixture metadata is representative, not actual NFTs. HP inflated to keep eight fixtures alive. Compact JSON is an estimated schema, not a deployed protocol. Static champion metadata and max stats are assumed to be sent once on admission; dynamic statuses, barriers, cooldowns, actions and full recent event/projectile arrays remain included.',results,costModel:{players:8,targetClientHz:5,requestsPerRoomHour:8*5*3600,minimumDocumentReadsPerRoomHour:8*5*3600*2,documentWritesPerRoomHour:8*5*3600,proposedCheckpointEverySeconds:30,proposedCheckpointWritesPerRoomHour:120,proposedLeaseEverySeconds:5,proposedLeaseWritesPerRoomHour:720,proposedSteadyStateWritesPerRoomHour:840,steadyStateWriteReductionPct:100*(1-840/(8*5*3600)),leaseAndCheckpointExclude:'Entry/exit/result documents, retries, TTL deletes, and exceptional recovery events.',cloudRunEstimate:{region:'us-central1',billing:'instance-based',vcpu:1,memoryGiB:.5,cpuUsdPerSecond:.000018,memoryUsdPerGiBSecond:.000002,usdPerActiveHour:(.000018+.5*.000002)*3600,usdPer730HoursBeforeFreeTier:(.000018+.5*.000002)*3600*730,excluded:'Internet egress, build/artifact/logging costs, Firestore, free-tier credits, taxes; not a bill forecast.'}}};
const destination=path.join(root,'output/playground/arena-sync-research.json');fs.writeFileSync(destination,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
