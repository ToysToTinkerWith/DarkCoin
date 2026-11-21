// Read-only checks: no arena admission, test champions, tickets or database writes.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),site='https://dark-coin.com';
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
 const report={checkedAt:new Date().toISOString(),site};
 const asset='/arena/playground/assets/beasts/graveclaw.glb';
 const response=await fetch(site+asset,{signal:AbortSignal.timeout(60000)});assert.equal(response.status,200);
 const model=Buffer.from(await response.arrayBuffer());assert.equal(digest(model),digest(fs.readFileSync(path.join(root,'public',asset))));
 const json=JSON.parse(model.subarray(20,20+model.readUInt32LE(12)).toString());
 report.modelHash=digest(model);report.bones=Math.max(...json.skins.map(s=>s.joints.length));report.clips=json.animations.map(a=>a.name);assert.equal(report.bones,21);
 const page=await fetch(site+'/arena/playground?graveclaw=release',{signal:AbortSignal.timeout(60000)});assert.equal(page.status,200);const html=await page.text();
 report.buildId=fs.readFileSync(path.join(root,'.next/BUILD_ID'),'utf8').trim();assert(html.includes(report.buildId),'Website is not serving the new build');
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'.next/react-loadable-manifest.json'),'utf8'));
 const entry=Object.entries(manifest).find(([k])=>k.includes('ArenaCanvas'));assert(entry,'ArenaCanvas dynamic entry');
 let containsBeast=false;report.chunks=[];
 for(const file of entry[1].files){const r=await fetch(site+'/_next/'+file,{signal:AbortSignal.timeout(60000)});assert.equal(r.status,200);const bytes=Buffer.from(await r.arrayBuffer());assert.equal(digest(bytes),digest(fs.readFileSync(path.join(root,'.next',file))));containsBeast ||= bytes.toString().includes('Graveclaw defeated');report.chunks.push(file);}
 assert(containsBeast,'Live arena component is missing Graveclaw');
 // Probe the actual game transport. The public Google frontend can return its
 // own 404 for /healthz even while the worker and WebSocket route are healthy.
 const WS=require('../arena-server/node_modules/ws');
 report.workerHealth=await new Promise((resolve,reject)=>{
  const ws=new WS('wss://arena-realtime-f6yfp3b4aq-uc.a.run.app/socket',{origin:site});let response;
  const timer=setTimeout(()=>{ws.terminate();reject(new Error('Worker probe timed out'));},15000);
  ws.on('open',()=>ws.send(JSON.stringify({type:'hello',ticket:'invalid-read-only-health-check'})));
  ws.on('message',m=>{response=JSON.parse(m.toString());});
  ws.on('error',e=>{clearTimeout(timer);reject(e);});
  ws.on('close',code=>{clearTimeout(timer);if(code===4003&&response?.type==='fatal'&&response.message==='Invalid admission ticket.')resolve({websocket:true,invalidTicketRejected:true});else reject(new Error('Unexpected worker response '+code));});
 });
 fs.writeFileSync(path.join(root,'output/graveclaw/production-validation.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
})().catch(e=>{console.error(e);process.exitCode=1;});
