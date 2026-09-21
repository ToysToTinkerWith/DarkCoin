const assert=require('node:assert/strict'),http=require('http'),fs=require('fs'),path=require('path');
const esbuild=require('../tmp/champion-model-tools/node_modules/esbuild'),{chromium}=require('../tmp/playground-qa/node_modules/playwright');
const root=path.resolve(__dirname,'..');
esbuild.buildSync({stdin:{contents:"export * from './lib/arena/tickets';export * from './lib/arena/room-store';",resolveDir:root},bundle:true,platform:'node',outfile:path.join(root,'tmp/realtime-integration.cjs')});
const {issueTicket,FirestoreRoomStore}=require('../tmp/realtime-integration.cjs'),{createServer}=require('../arena-server/server.cjs');
const client=esbuild.buildSync({stdin:{contents:"import {WebSocketConnection} from './components/arena/playground/realtime-network';import {MovementPrediction} from './components/arena/playground/prediction';window.ArenaClient=WebSocketConnection;window.MovementPrediction=MovementPrediction;",resolveDir:root},bundle:true,platform:'browser',write:false}).outputFiles[0].text;
const fixture={skin:'Undead',head:'bone',armour:'leather_garb',weapon:'dual_katana',magic:'fire_magic',extra:null};
function database(){const data=new Map();let tail=Promise.resolve();return {data,writes:0,reads:0,collection:()=>({doc:id=>({id})}),runTransaction(fn){const run=async()=>{const writes=[];const result=await fn({get:async ref=>{this.reads++;return {exists:data.has(ref.id),data:()=>data.get(ref.id),readTime:{toMillis:()=>Date.now()}};},set:(ref,v)=>writes.push([ref.id,v]),create:(ref,v)=>{assert(!data.has(ref.id));writes.push([ref.id,v]);}});for(const [k,v] of writes){data.set(k,v);this.writes++;}return result;};const p=tail.then(run);tail=p.catch(()=>{});return p;}};}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const secret='local-integration-test-only-'.repeat(3),results=[];
 const web=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/client.js'?'text/javascript':'text/html');res.end(req.url==='/client.js'?client:'<!doctype html><script src="/client.js"></script><body>Arena transport test</body>');});await new Promise(r=>web.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+web.address().port;
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox']});
 try{for(const count of [1,4,8])for(const rtt of [50,100,200]){
  const db=database(),store=new FirestoreRoomStore(db),app=createServer({store,secret,origins:[origin],log:()=>{}});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
  const url='ws://127.0.0.1:'+app.server.address().port+'/socket',pages=[];
  try{
   for(let i=0;i<count;i++){
    const page=await browser.newPage();pages.push(page);await page.goto(origin);
    const ticket=issueTicket({id:100000+i,name:'Network fixture '+i,loadout:{...fixture,weapon:i%2?'dragon_staff':'dual_katana'}},'fixture-wallet-'+i,secret);
    await page.evaluate(({url,ticket,rtt,i})=>{
     const Native=window.WebSocket;
     window.WebSocket=class{
      constructor(url){this.ws=new Native(url);this.out=0;this.in=0;this.ws.onopen=e=>this.delay('in',()=>this.onopen?.(e));this.ws.onmessage=e=>this.delay('in',()=>this.onmessage?.(e));this.ws.onclose=e=>this.delay('in',()=>this.onclose?.(e));this.ws.onerror=e=>this.onerror?.(e);}
      delay(direction,fn){const now=performance.now();this[direction]=Math.max(now+rtt/2+(Math.random()-.5)*rtt*.2,this[direction]+.1);setTimeout(fn,this[direction]-now);}
      send(x){this.delay('out',()=>{if(this.ws.readyState===1)this.ws.send(x);});}close(...args){this.ws.close(...args);}get readyState(){return this.ws.readyState;}get bufferedAmount(){return this.ws.bufferedAmount;}
     };
     window.received=0;window.errors=[];window.lastState=null;window.prediction=new MovementPrediction();
     window.client=new ArenaClient({transport:'websocket',url,ticket,expiresAt:Date.now()/1000+60},s=>{window.lastState=s;window.received++;const p=s.players[client.playerId];if(p)prediction.reconcile({...p,time:s.time},performance.now()/1000,client.rtt/2000);},(message,fatal)=>{if(fatal)errors.push(message);});
     client.intentProvider=()=>({x:i%2?.6:-.6,z:.5,yaw:0,run:true});client.start();
    },{url,ticket,rtt,i});
   }
   await Promise.all(pages.map(p=>p.waitForFunction(()=>client.ready&&received>=3,null,{timeout:15000})));
   const before=await pages[0].evaluate(()=>({x:lastState.players[client.playerId].x,z:lastState.players[client.playerId].z}));
   await pages[0].evaluate(()=>client.action('jump'));
   await pages[0].waitForFunction(()=>lastState.players[client.playerId]?.jumpStart>0,null,{timeout:5000});
   const jumper=await pages[0].evaluate(()=>client.playerId);
   if(pages[1])await pages[1].waitForFunction(id=>lastState.players[id]?.jumpStart>0,jumper,{timeout:5000});
   await pages[0].evaluate(()=>client.action('attack'));
   await pages[0].waitForFunction(()=>lastState.players[client.playerId]?.action?.unarmed,null,{timeout:5000});
   if(pages[1])await pages[1].waitForFunction(id=>lastState.players[id]?.action?.unarmed,jumper,{timeout:5000});
   await sleep(1200);
   await Promise.all(pages.map(p=>p.evaluate(()=>client.action('toggle'))));await sleep(1600);
   await Promise.all(pages.map(p=>p.evaluate(()=>client.action('attack'))));await sleep(1400);
   await pages[0].evaluate(()=>{client.baselines.clear();client.socket.close(4000,'Test interruption');});
   await pages[0].waitForFunction(()=>client.ready&&client.metrics.reconnects>0,null,{timeout:10000});await sleep(800);
   const metrics=await Promise.all(pages.map(p=>p.evaluate(()=>({received,errors,players:Object.keys(lastState.players).length,x:lastState.players[client.playerId]?.x,z:lastState.players[client.playerId]?.z,rtt:client.rtt,...client.metrics}))));
   for(const m of metrics){assert.deepEqual(m.errors,[]);assert.equal(m.players,count);assert(m.received>8);}
   assert(Math.hypot(metrics[0].x-before.x,metrics[0].z-before.z)>.1);assert(db.writes<40,'Movement must not persist on each input');
   results.push({clients:count,addedRtt:rtt,writes:db.writes,reads:db.reads,inputs:app.room.metrics.inputs,bytes:metrics.reduce((n,m)=>n+m.bytesIn+m.bytesOut,0),reconnects:metrics[0].reconnects});console.log('PASS '+count+' browser clients; '+rtt+' ms added RTT; '+db.writes+' database writes.');
   await app.room.drain('Controlled deployment');await sleep(rtt+100);assert((await pages[0].evaluate(()=>errors.length))>0);
  }finally{await Promise.all(pages.map(p=>p.close()));await app.stop();}
 }
 fs.mkdirSync(path.join(root,'output/playground'),{recursive:true});fs.writeFileSync(path.join(root,'output/playground/realtime-browser-validation.json'),JSON.stringify({createdAt:new Date().toISOString(),method:'Actual Chromium clients and WebSocket server; ordered application-level latency/jitter injection; in-memory Firestore transaction test double; not a cloud bandwidth bill or eight-character GPU test.',results},null,2));
 }finally{await browser.close();await new Promise(r=>web.close(r));}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
