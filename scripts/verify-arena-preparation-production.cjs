const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),base='https://dark-coin.com',stamp=Date.now();
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
async function get(url){const r=await fetch(new URL(url,base),{signal:AbortSignal.timeout(60000)});assert.equal(r.status,200,url);return r;}
async function main(){
 const expected=fs.readFileSync(path.join(root,'.next/BUILD_ID'),'utf8').trim(),report={verifiedAt:new Date().toISOString(),buildId:expected,pages:{},chunks:[]};
 let armory;
 for(const route of ['/arena','/arena/armory','/arena/playtest']){
  const html=await (await get(route+'?release='+stamp)).text(),data=JSON.parse(html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)[1]);
  assert.equal(data.buildId,expected,route+' build mismatch');report.pages[route]=200;if(route.endsWith('armory'))armory=html;
 }
 const scripts=[...armory.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m=>m[1]).filter(x=>x.startsWith('/_next/'));
 let code='';for(const url of scripts)code+=await (await get(url)).text();
 assert(code.includes('Show Arena stats (3D)'),'3D toggle missing');assert(!code.includes('Show Chronicles build (2D)'),'Retired toggle still present');
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'.next/react-loadable-manifest.json'),'utf8'));
 assert(!Object.keys(manifest).some(k=>k.includes('Swapper.js -> ./LegacyChampionBuilder')));
 const files=[...new Set(Object.entries(manifest).filter(([k])=>k.includes('ArenaCanvas')).flatMap(([,v])=>v.files))].filter(f=>f.endsWith('.js'));
 assert(files.length,'Arena canvas chunks missing');
 let canvas='';for(const file of files){const remote=Buffer.from(await (await get('/_next/'+file)).arrayBuffer()),local=fs.readFileSync(path.join(root,'.next',file));assert.equal(digest(remote),digest(local),'Arena chunk differs from tested build');canvas+=remote.toString();report.chunks.push({file,sha256:digest(remote)});}
 assert(canvas.includes('NEXT CHALLENGE')&&canvas.includes('120'),'Two-minute HUD missing');
 // Admission does not schedule spawns in WebSocket mode; the room worker and
 // durable scheduler are the two authorities that must share the new timing.
 for(const file of ['arena-server/server.cjs','functions/arenaRewards.bundle.cjs']){
  const text=fs.readFileSync(path.join(root,file),'utf8');assert(text.includes('SPAWN_WARNING_SECONDS = 120'),file+' countdown mismatch');
 }
 const WS=require('../arena-server/node_modules/ws');
 await new Promise((resolve,reject)=>{const socket=new WS('wss://arena-realtime-f6yfp3b4aq-uc.a.run.app/socket',{origin:base}),timer=setTimeout(()=>{socket.terminate();reject(Error('Socket timeout'));},15000);let opened=false;
  socket.on('open',()=>{opened=true;socket.send(JSON.stringify({type:'hello',ticket:'invalid-release-verification'}));});
  socket.on('error',e=>{clearTimeout(timer);reject(e);});socket.on('close',(code)=>{clearTimeout(timer);try{assert(opened);assert([1008,4003].includes(code));report.websocket={connected:true,invalidTicketRejected:true,closeCode:code};resolve();}catch(e){reject(e);}});
 });
 for(const url of ['/scripts/send-chronicles-compensation.local.cjs','/.compensation-state/chronicles-v1.json']){
  const r=await fetch(base+url,{method:'HEAD',signal:AbortSignal.timeout(60000)});assert([403,404].includes(r.status),'Private payout path exposed: '+url);
 }
 const control=await fetch(base+'/api/arena/combat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({op:'input',input:{seq:1,x:0,z:0,yaw:0}}),signal:AbortSignal.timeout(60000)});assert([401,410].includes(control.status),'Unauthenticated/retired REST movement must be rejected');report.admission=control.status;
 report.armory={arenaToggle:true,chroniclesToggle:false};report.preparationSeconds=120;report.respawnSeconds=3600;
 report.workerBundleSha256=digest(fs.readFileSync(path.join(root,'arena-server/server.cjs')));
 fs.mkdirSync(path.join(root,'output/playground'),{recursive:true});fs.writeFileSync(path.join(root,'output/playground/two-minute-production-validation.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
