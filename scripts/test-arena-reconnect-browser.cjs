// Local-only regression: a solo champion's brief outage must preserve preparation.
// Run after npm run build:arena-realtime. No Firebase credentials or cloud writes.
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const esbuild=require('esbuild');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
esbuild.buildSync({stdin:{contents:"export * from './lib/arena/tickets';export * from './lib/arena/room-store';export {currentEncounter} from './lib/arena/encounter-schedule';",resolveDir:root},bundle:true,platform:'node',outfile:path.join(root,'tmp/reconnect-browser-integration.cjs')});
const {issueTicket,FirestoreRoomStore,currentEncounter}=require('../tmp/reconnect-browser-integration.cjs');
const {createServer}=require('../arena-server/server.cjs');
const client=esbuild.buildSync({stdin:{contents:"export {WebSocketConnection} from './components/arena/playground/realtime-network';",resolveDir:root},bundle:true,platform:'browser',format:'iife',globalName:'ArenaNetwork',write:false}).outputFiles[0].text;

function database(){
 const data=new Map();let tail=Promise.resolve();
 return {data,reads:0,writes:0,collection:collection=>({doc:id=>({id,path:collection+'/'+id})}),runTransaction(fn){
  const run=async()=>{
   const writes=[];
   const result=await fn({
    get:async ref=>{this.reads++;const value=data.get(ref.path);return {exists:value!==undefined,data:()=>value===undefined?undefined:structuredClone(value),readTime:{toMillis:()=>Date.now()}};},
    set:(ref,value)=>writes.push({ref,value}),
    create:(ref,value)=>writes.push({ref,value,create:true}),
    update:(ref,value)=>writes.push({ref,value,update:true})
   });
   for(const {ref,value,create,update} of writes){
    if(create)assert(!data.has(ref.path),'Cannot create an existing document');
    if(update)assert(data.has(ref.path),'Cannot update a missing document');
    data.set(ref.path,structuredClone(update?{...data.get(ref.path),...value}:value));this.writes++;
   }
   return result;
  };
  const pending=tail.then(run);tail=pending.catch(()=>{});return pending;
 }};
}
const listen=server=>new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const close=server=>new Promise(resolve=>server.close(resolve));

(async()=>{
 const db=database(),economy={enabled:true,appId:987654321},roomId='qa-solo-reconnect';
 const secret='local-reconnect-regression-only-'.repeat(3),store=new FirestoreRoomStore(db,{roomId,economy});
 const web=http.createServer(async(req,res)=>{
  try{
   res.setHeader('Cache-Control','no-store');
   if(req.url==='/client.js'){res.setHeader('Content-Type','text/javascript');res.end(client);return;}
   if(req.url==='/schedule'){
    res.setHeader('Content-Type','application/json');
    res.end(JSON.stringify(await currentEncounter(db,economy.appId,roomId)));return;
   }
   res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Solo Arena reconnect regression</title><script src="/client.js"></script>');
  }catch(error){res.writeHead(500);res.end(JSON.stringify({error:error.message}));}
 });
 await listen(web);const origin='http://127.0.0.1:'+web.address().port;
 const app=createServer({store,secret,origins:[origin],economy,log:()=>{}});
 let browser;
 try{
  await listen(app.server);
  browser=await chromium.launch({executablePath:process.env.ARENA_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox']});
  const page=await browser.newPage();await page.goto(origin);
  const url='ws://127.0.0.1:'+app.server.address().port+'/socket';
  const champion={id:100001,name:'Solo reconnect fixture',loadout:{skin:'Undead',head:'bone',armour:'leather_garb',weapon:'dual_katana',magic:'fire_magic',extra:null}};
  const ticket=issueTicket(champion,'local-fixture-wallet',secret,Date.now()/1000,roomId,true);
  await page.evaluate(({url,ticket})=>{
   window.received=0;window.fatals=[];window.notices=[];window.lastState=null;
   window.client=new ArenaNetwork.WebSocketConnection({transport:'websocket',url,ticket,expiresAt:Date.now()/1000+60},state=>{lastState=state;received++;},(message,fatal)=>{notices.push(message);if(fatal)fatals.push(message);});
   client.start();
  },{url,ticket});
  await page.waitForFunction(()=>client.ready&&received>=2&&lastState.encounter?.nextSpawnAt,null,{timeout:10000});
  const before=await page.evaluate(()=>({playerId:client.playerId,time:lastState.time,nextSpawnAt:lastState.encounter.nextSpawnAt,countdownStartedAt:lastState.encounter.countdownStartedAt,received}));
  assert(before.nextSpawnAt>before.time);assert(before.countdownStartedAt>0);

  // Keep the actual browser socket offline across the worker's five-second
  // lease renewal. Poll the public schedule during the same empty-socket gap.
  await page.evaluate(()=>{
   const connect=client.connect.bind(client),until=performance.now()+6500;
   client.connect=()=>{const delay=until-performance.now();if(delay>0){client.retry=setTimeout(connect,delay);return;}connect();};
   window.interruptedAt=performance.now();window.interruptedReceived=received;client.socket.close(4000,'Solo reconnect regression');
  });
  await page.waitForFunction(()=>!client.ready,null,{timeout:3000});
  assert.equal(app.room.state.players[before.playerId].connected,false);
  const publicSamples=[];
  for(let i=0;i<5;i++){
   await new Promise(resolve=>setTimeout(resolve,1100));
   const sample=await page.evaluate(async()=>{const response=await fetch('/schedule');if(!response.ok)throw Error(await response.text());return response.json();});
   publicSamples.push(sample);
   assert.equal(sample.nextSpawnAt,before.nextSpawnAt,'Public polling during a brief outage must preserve the deadline');
   assert.equal(sample.countdownStartedAt,before.countdownStartedAt,'Public polling must preserve the preparation start');
  }
  assert.equal(db.data.get('arenaPrivate/'+roomId+'-lease').playerCount,1,'Lease renewal must retain a resumable solo champion');
  await page.waitForFunction(before=>client.ready&&client.metrics.reconnects>0&&received>interruptedReceived&&lastState.players[before.playerId],before,{timeout:10000});
  const after=await page.evaluate(()=>({playerId:client.playerId,time:lastState.time,nextSpawnAt:lastState.encounter.nextSpawnAt,countdownStartedAt:lastState.encounter.countdownStartedAt,received,fatals,notices,reconnects:client.metrics.reconnects,outageMs:performance.now()-interruptedAt}));
  assert.equal(after.playerId,before.playerId,'Reconnect must resume the same champion');
  assert.equal(after.nextSpawnAt,before.nextSpawnAt,'Reconnect must not restart the spawn countdown');
  assert.equal(after.countdownStartedAt,before.countdownStartedAt,'Reconnect must preserve the preparation start');
  assert.deepEqual(after.fatals,[]);assert(after.time-before.time>=5,'The countdown must continue while the browser is disconnected');
  assert(after.outageMs<12000,'The fixture must resume within the supported grace period');
  assert.equal(Object.keys(app.room.state.players).length,1);
  console.log('PASS solo economy Arena: real browser reconnect preserves player, spawn deadline and preparation start across lease renewal and public schedule polling; no fatal notice.');

  // Construct a legitimate outstanding input window after interrupting the
  // first socket. The server remains behind these sequence numbers, forcing
  // the resumed client to replay through the real worker's 80-message/s limit.
  // The queued controls are stale running inputs; current controls stay stopped.
  await page.waitForFunction(()=>client.unacked.size===0,null,{timeout:5000});
  const replayBefore=await page.evaluate(()=>{
   window.closeCodes=[];
   client.socket.addEventListener('close',event=>closeCodes.push(event.code));
   const NativeWebSocket=window.WebSocket;
   window.WebSocket=class extends NativeWebSocket{constructor(url){super(url);this.addEventListener('close',event=>closeCodes.push(event.code));}};
   const self=lastState.players[client.playerId];
   const prior={playerId:client.playerId,reconnects:client.metrics.reconnects,nextSpawnAt:lastState.encounter.nextSpawnAt,countdownStartedAt:lastState.encounter.countdownStartedAt,x:self.x,z:self.z};
   window.replayMaxMovement=0;
   const receive=client.onState;
   client.onState=(state,latency)=>{receive(state,latency);const player=state.players[client.playerId];if(player)replayMaxMovement=Math.max(replayMaxMovement,Math.hypot(player.x-prior.x,player.z-prior.z));};
   window.replayReceived=received;client.socket.close(4000,'Outstanding input replay regression');
   client.setIntent({x:0,z:0,yaw:0,run:false});
   for(let i=0;i<128;i++){const input={x:1,z:0,yaw:2,run:true,seq:++client.seq};client.unacked.set(input.seq,input);}
   return {...prior,queued:client.unacked.size,lastSequence:client.seq};
  });
  assert.equal(replayBefore.queued,128);
  await page.waitForFunction(previous=>client.ready&&client.metrics.reconnects>previous.reconnects&&client.unacked.size===0&&received>replayReceived,replayBefore,{timeout:10000});
  await new Promise(resolve=>setTimeout(resolve,2200));
  const replayAfter=await page.evaluate(()=>({playerId:client.playerId,reconnects:client.metrics.reconnects,queued:client.unacked.size,ready:client.ready,socketState:client.socket.readyState,fatals,closeCodes,nextSpawnAt:lastState.encounter.nextSpawnAt,countdownStartedAt:lastState.encounter.countdownStartedAt,x:lastState.players[client.playerId].x,z:lastState.players[client.playerId].z,maxMovement:replayMaxMovement}));
  assert.equal(replayAfter.playerId,replayBefore.playerId);
  assert.equal(replayAfter.queued,0,'Resumed inputs must be acknowledged');
  assert.equal(replayAfter.reconnects,replayBefore.reconnects+1,'Replaying outstanding inputs must not cause a reconnect loop');
  assert.equal(replayAfter.ready,true);assert.equal(replayAfter.socketState,1);
  assert(!replayAfter.closeCodes.includes(4008),'Outstanding input replay must respect the server rate limit');
  assert.deepEqual(replayAfter.fatals,[]);
  assert.equal(replayAfter.nextSpawnAt,replayBefore.nextSpawnAt);
  assert.equal(replayAfter.countdownStartedAt,replayBefore.countdownStartedAt);
  assert(replayAfter.maxMovement<.02,'Replay must use the current stopped controls instead of stale running inputs');
  assert(Math.hypot(replayAfter.x-replayBefore.x,replayAfter.z-replayBefore.z)<.02,'The stopped champion must remain in place after replay');
  console.log('PASS outstanding inputs: 128 stale running inputs drain across one real browser reconnect without rate-limit closure, repeated reconnects, or unwanted movement.');

  const report={createdAt:new Date().toISOString(),method:'Local Chromium Arena client and actual WebSocket worker; economy enabled; actual FirestoreRoomStore with in-memory transaction double; public schedule queried throughout a 6.5-second solo outage; second interruption with 128 seeded valid unacked stale running inputs while current controls are stopped. No cloud reads or writes.',before,after,publicSamples:publicSamples.length,replay:{before:replayBefore,after:replayAfter},databaseReads:db.reads,databaseWrites:db.writes};
  fs.mkdirSync(path.join(root,'output/playground'),{recursive:true});
  fs.writeFileSync(path.join(root,'output/playground/reconnect-browser-validation.json'),JSON.stringify(report,null,2));
 }finally{
  await browser?.close();await app.stop();await close(web);
 }
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
