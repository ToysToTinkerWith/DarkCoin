// Real local WebSockets and production authority; fixture wallets, inventory and
// Firestore transactions. Never connects to mainnet or creates a live reward.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const W=require('../arena-server/node_modules/ws'),algo=require('algosdk');
require('esbuild').buildSync({stdin:{contents:['tickets','room-store','wire','reward-publisher'].map(n=>`export * from './lib/arena/${n}';`).join('\n'),resolveDir:process.cwd()},bundle:true,platform:'node',external:['algosdk'],outfile:'tmp/multiplayer-loot.cjs'});
const s=require('../tmp/multiplayer-loot.cjs'),{createServer}=require('../arena-server/server.cjs');
function database(){const data=new Map();let tail=Promise.resolve();const doc=id=>({id:id.split('/').at(-1),ref:ref(id),exists:data.has(id),data:()=>structuredClone(data.get(id)),readTime:{toMillis:()=>Date.now()}}),ref=id=>({id,get:async()=>doc(id)});return {data,collection:name=>({doc:id=>ref(name+'/'+id),where:(k,op,v)=>{let limit=Infinity;const q={orderBy:()=>q,limit:n=>(limit=n,q),get:async()=>({docs:[...data.keys()].filter(id=>id.startsWith(name+'/')&&data.get(id)[k]===v).slice(0,limit).map(doc)})};return q;}}),runTransaction(fn){const p=tail.then(async()=>{const writes=[];let wrote=false;const tx={get:async r=>{assert(!wrote);return doc(r.id);},set:(r,v)=>{wrote=true;writes.push([r.id,v]);},create:(r,v)=>{assert(!data.has(r.id));tx.set(r,v);},update:(r,v)=>tx.set(r,{...data.get(r.id),...v})};const out=await fn(tx);for(const [id,v]of writes)data.set(id,structuredClone(v));return out;});tail=p.catch(()=>{});return p;}};}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));async function until(fn){for(let i=0;i<200;i++){if(fn())return;await sleep(50);}throw Error('Multiplayer assertion timed out');}
(async()=>{
 const db=database(),economy={enabled:true,appId:123,algodUrl:'https://example.invalid'},store=new s.FirestoreRoomStore(db,{economy}),secret='multiplayer-fixture-only-'.repeat(3),origin='http://localhost';
 store.watchLootDrops=null;
 const app=createServer({store,secret,economy,origins:[origin],log:()=>{}});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const peers=[];
 try{
  for(let i=0;i<4;i++){
   const address=algo.generateAccount().addr.toString(),champion={id:100+i,name:'Fixture '+i,baselineSpell:'renewing_light',loadout:{skin:'Undead',weapon:'dragon_staff'}};
   const ws=new W(`ws://127.0.0.1:${app.server.address().port}/socket`,{origin}),peer={ws,address,champion,states:new Map(),seq:0};peers.push(peer);
   ws.on('message',raw=>{const m=JSON.parse(raw);if(m.type==='welcome')peer.id=m.playerId;if(m.type==='fatal')throw Error(m.message);if(m.type==='state'){const state=s.applyPacket(m,peer.states.get(m.b));peer.states.set(m.n,state);peer.state=s.decodeState(state,m.events);ws.send(JSON.stringify({type:'ack',n:m.n}));}});
   await new Promise(r=>ws.once('open',r));ws.send(JSON.stringify({type:'hello',ticket:s.issueTicket(champion,address,secret,Date.now()/1000,undefined,true)}));await until(()=>peer.state?.players[peer.id]);
  }
  await until(()=>peers.every(p=>Object.keys(p.state.players).length===4));assert.equal(app.room.state.encounter.status,'waiting');assert.equal(app.room.state.beast,null);assert(app.room.state.encounter.nextSpawnAt-Date.now()/1000>295);
  // Accelerate only the test fixture's preparation deadline; real admission was exercised above.
  const waitingKey=`arenaPrivate/loot-encounter-123-${app.room.state.encounter.id}`,waiting=db.data.get(waitingKey);db.data.set(waitingKey,{...waiting,nextSpawnAt:Date.now()/1000-.1});
  await app.room.syncEncounter();assert.equal(app.room.state.beast.maxHealth,896);
  const keep=setInterval(()=>peers.forEach(p=>p.ws.readyState===1&&p.ws.send(JSON.stringify({type:'ping',at:Date.now()}))),1000);
  const action=(p,action)=>p.ws.send(JSON.stringify({type:'input',input:{seq:++p.seq,x:0,z:0,yaw:0,action}}));
  try{
   app.room.state.beast.emergeUntil=0;app.room.state.beast.mode='patrol';app.room.state.beast.pauseUntil=app.room.state.time+1000;
   for(const p of peers.slice(0,3))action(p,'baseline');
   await until(()=>peers.slice(0,3).every(p=>p.state.players[p.id]?.lootEligible));assert(!peers[3].state.players[peers[3].id].lootEligible);
   const first=app.room.state.players[peers[0].id];first.x=first.z=0;first.yaw=0;first.carry='Hold';const beast=app.room.state.beast;beast.x=0;beast.z=3;beast.hp=1;
   await until(()=>!first.action);action(peers[0],'attack');await until(()=>app.room.state.encounter.status==='defeated');
   await until(()=>peers.every(p=>p.state.beast?.hp===0));const encounter=app.room.state.encounter;assert.equal(encounter.recipients.length,3);assert.equal(encounter.nextSpawnAt-encounter.defeatedAt,3600);
   await until(()=>app.room.savedDefeat===encounter.id);
   await s.processArenaRewards(db,economy,{direct:true,maintain:async()=>true,legacyBox:async()=>null,inventory:async()=>[{rewardAssetId:500,available:'1000000000000',kind:'token',capBps:10000,capAtomic:'0',name:'Fixture token',decimals:6}],randomSeed:()=> 'b'.repeat(64)});
   const drops=await store.lootDrops(encounter.id);assert.equal(drops.length,3);assert(!drops.some(d=>d.rewardWallet===peers[3].address));
   for(const peer of peers.slice(0,3)){const drop=drops.find(d=>d.rewardWallet===peer.address),p=app.room.state.players[peer.id];p.x=drop.drop.x;p.z=drop.drop.z;await store.pickup(drop.id,p,encounter.id);}
   assert.equal([...db.data.values()].filter(v=>v.deliveryQueue==='pickup-123').length,3);
   // Independent champion-vs-champion attack, after loot allocation: no new rewards.
   for(const p of Object.values(app.room.state.players)){p.x=8;p.z=8;}
   first.x=first.z=0;const victim=app.room.state.players[peers[3].id];victim.x=0;victim.z=3;victim.hp=1;
   await until(()=>!first.action);action(peers[0],'attack');await until(()=>!app.room.state.players[victim.id]);assert.equal((await store.lootDrops(encounter.id)).length,3);
   const report={createdAt:new Date().toISOString(),clients:4,sharedMonsterHealth:896,eligibleChampions:3,idleChampionsExcluded:1,personalDrops:3,validatedPickups:3,pvpKill:true,pvpRewards:0,respawnSeconds:3600,method:'Real local WebSocket clients and production room authority; deterministic fixture positioning/monster health; mock Firestore and token inventory; no live blockchain transfers.'};
   fs.writeFileSync(path.resolve('output/playground/multiplayer-loot-validation.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
  }finally{clearInterval(keep);}
 }finally{for(const p of peers)p.ws.close();await app.stop();}
})().catch(e=>{console.error(e);process.exitCode=1;});
