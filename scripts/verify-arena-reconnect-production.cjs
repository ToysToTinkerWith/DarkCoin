// Read-only release checks plus one deliberately invalid WebSocket admission.
// Never opens a champion session or calls the economy/schedule/chat endpoints.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {execSync}=require('node:child_process'),WebSocket=require('../arena-server/node_modules/ws');
const root=path.resolve(__dirname,'..');
function argument(name,fallback){const at=process.argv.indexOf(name);if(at<0)return fallback;assert(process.argv[at+1]&&!process.argv[at+1].startsWith('--'),'Missing '+name+' value');return process.argv[at+1];}
const base=new URL(argument('--base','https://dark-coin.com'));
const worker=new URL(argument('--worker','https://arena-realtime-f6yfp3b4aq-uc.a.run.app'));
const expectedRevision=argument('--revision',null),stamp=Date.now();
const report={verifiedAt:new Date().toISOString(),site:base.origin,worker:worker.origin,scope:'Public playtest HTML and static chunks, worker health, Cloud Run status metadata, and one invalid-ticket handshake only. No valid admission, secrets, schedule/economy calls, chat, or notification writes.',passed:false,chunks:[]};
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
async function get(url,origin){const response=await fetch(new URL(url,origin),{cache:'no-store',signal:AbortSignal.timeout(30000)});assert.equal(response.status,200,'HTTP check failed: '+url);return response;}

async function invalidAdmission(){
 const url=new URL('/socket',worker);url.protocol=worker.protocol==='http:'?'ws:':'wss:';
 return new Promise((resolve,reject)=>{
  const socket=new WebSocket(url,{origin:base.origin,handshakeTimeout:15000});
  let opened=false,closed=false,packetCount=0,fatalMessage=null;
  const timer=setTimeout(()=>finish(Error('Invalid-ticket handshake timed out')),20000);
  function finish(error,result){if(closed)return;closed=true;clearTimeout(timer);if(socket.readyState!==WebSocket.CLOSED)socket.terminate();error?reject(error):resolve(result);}
  socket.on('open',()=>{opened=true;socket.send(JSON.stringify({type:'hello',ticket:'invalid-reconnect-release-verification'}));});
  socket.on('message',raw=>{
   try{
    const packet=JSON.parse(raw.toString());packetCount++;
    assert.notEqual(packet.type,'welcome','Invalid ticket must never open a session');
    assert.notEqual(packet.type,'state','Invalid ticket must never receive room state');
    if(packet.type==='fatal')fatalMessage=packet.message;
   }catch(error){finish(error);}
  });
  socket.on('error',error=>finish(error));
  socket.on('close',(code)=>{
   try{assert(opened,'WebSocket upgrade did not succeed');assert.equal(code,4003,'Invalid ticket must be rejected by admission');assert(fatalMessage,'Expected an admission rejection packet');finish(null,{connected:true,invalidTicketRejected:true,noSessionOpened:true,closeCode:code,packetCount,fatalMessage});}
   catch(error){finish(error);}
  });
 });
}

async function main(){
 assert(['http:','https:'].includes(base.protocol));assert(['http:','https:'].includes(worker.protocol));
 const expectedBuildId=fs.readFileSync(path.join(root,'.next/BUILD_ID'),'utf8').trim();
 const html=await(await get('/arena/playtest?reconnect-release='+stamp,base)).text();
 const match=html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);assert(match,'Playtest Next.js data missing');
 const data=JSON.parse(match[1]);assert.equal(data.buildId,expectedBuildId,'Live playtest build differs from the tested local build');
 report.playtest={status:200,buildId:data.buildId,expectedBuildId};
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'.next/react-loadable-manifest.json'),'utf8'));
 const entries=Object.entries(manifest).filter(([key])=>key.includes('ArenaCanvas'));
 const files=[...new Set(entries.flatMap(([,value])=>value.files))].filter(file=>file.endsWith('.js'));
 assert(files.length,'ArenaCanvas dynamic JavaScript files missing from local manifest');
 let canvas='';
 for(const file of files){
  assert(file.startsWith('static/')&&!file.includes('..'),'Unexpected chunk path');
  const remote=Buffer.from(await(await get('/_next/'+file,base)).arrayBuffer());
  const local=fs.readFileSync(path.join(root,'.next',file)),sha256=digest(remote);
  assert.equal(sha256,digest(local),'Live ArenaCanvas chunk differs from tested build: '+file);
  canvas+=remote.toString('utf8');report.chunks.push({file,sha256,bytes:remote.length,matchesLocal:true});
 }
 const replayStart=canvas.indexOf('this.unacked.get(this.replay[0])');assert(replayStart>=0,'Replay input lookup missing');
 const replayCode=canvas.slice(replayStart,replayStart+900);
 const markers={
  pacedReplay:canvas.includes('lastReplay')&&/replay\.length&&[\w$]+<2/.test(canvas),
  currentMovementOnReplay:/x:([\w$]+)\.x,z:\1\.z,yaw:Math\.round\([^}]+,run:/.test(replayCode),
  acknowledgmentGrace:canvas.includes('lastAckProgress')&&canvas.includes('Acknowledgments stalled'),
  connectionWatchdog:canvas.includes('connectStarted')&&canvas.includes('Connection timeout'),
  admissionWatchdog:/this\.ready\?(?:7e3|7000):(?:2e4|20000)/.test(canvas)
 };
 for(const [name,present]of Object.entries(markers))assert(present,'Release client marker missing: '+name);
 report.clientMarkers=markers;
 const healthResponse=await fetch(new URL('/healthz',worker),{cache:'no-store',signal:AbortSignal.timeout(30000)});
 const healthBody=await healthResponse.text();
 if(healthResponse.status===200){
  const health=JSON.parse(healthBody);assert.equal(health.ok,true);assert.equal(health.protocol,1);assert.equal(health.draining,false,'Worker is draining');
  report.health={endpoint:'/healthz',status:200,httpHealthy:true,...health};
 }else{
  assert.equal(healthResponse.status,404,'Unexpected public health endpoint response');
  assert(healthBody.includes('www.google.com/images/errors/robot.png'),'Health404 must be the observed Google Frontend reserved-path response');
  report.health={endpoint:'/healthz',status:404,httpHealthy:false,platformReservedPath:true,limitation:'Google Frontend intercepts this health endpoint; worker health is verified separately through Cloud Run Ready status and the responsive WebSocket admission handler.',documentation:'https://docs.cloud.google.com/run/docs/known-issues#reserved-url-paths'};
 }
 report.websocket=await invalidAdmission();
 // Query status only: no service specification, environment values or secrets.
 // Require a Ready service and responsive protocol even when healthz is reserved.
 const status=JSON.parse(execSync('gcloud run services describe arena-realtime --project=dark-coin-dc4a3 --region=us-central1 --format="json(status)"',{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:30000})).status;
 const ready=(status.conditions||[]).find(condition=>condition.type==='Ready');
 assert.equal(ready?.status,'True','Cloud Run worker service is not Ready');
 const traffic=(status.traffic||[]).filter(target=>(target.percent||0)>0);
 if(expectedRevision){
  assert.equal(traffic.length,1,'Worker traffic is split across revisions');
  assert.equal(traffic[0].revisionName,expectedRevision,'Worker traffic points to a different revision');
  assert.equal(traffic[0].percent,100,'Expected revision must receive all traffic');
  assert.equal(status.latestReadyRevisionName,expectedRevision,'Expected worker revision is not the latest ready revision');
 }
 report.workerRevision={expected:expectedRevision,latestReady:status.latestReadyRevisionName,ready:true,traffic};
 report.workerHealth={cloudRunReady:true,websocketAdmissionResponsive:report.websocket.invalidTicketRejected,httpHealthEndpointHealthy:report.health.httpHealthy};
 report.passed=true;
}
main().catch(error=>{report.error=error.message;console.error(error.stack);process.exitCode=1;}).finally(()=>{
 fs.mkdirSync(path.join(root,'output/playground'),{recursive:true});
 fs.writeFileSync(path.join(root,'output/playground/reconnect-production-validation.json'),JSON.stringify(report,null,2));
 if(report.passed)console.log(JSON.stringify(report,null,2));
});
