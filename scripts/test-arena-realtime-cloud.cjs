// Private operator QA while public admission is disabled. No real NFT state/rewards change.
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),{execSync}=require('child_process');
const esbuild=require('../tmp/champion-model-tools/node_modules/esbuild'),{chromium}=require('../tmp/playground-qa/node_modules/playwright');
const root=path.resolve(__dirname,'..');
const dev=process.argv.includes('--dev'),service=dev?'arena-realtime-dev':'arena-realtime',secretName=dev?'ARENA_DEV_TICKET_SECRET':'ARENA_TICKET_SECRET',site=dev?'https://dark-coin-arena-dev.web.app':'https://dark-coin.com',roomId=dev?'playground-dev-v1':'playground-realtime-v1',prefix=dev?'realtime-dev-cloud':'realtime-cloud';
const secret=execSync('gcloud secrets versions access latest --secret '+secretName+' --project dark-coin-dc4a3',{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const base=execSync('gcloud run services describe '+service+' --region us-central1 --project dark-coin-dc4a3 --format="value(status.url)"',{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim(),url=base.replace('https:','wss:')+'/socket';
esbuild.buildSync({stdin:{contents:"export * from './lib/arena/tickets';",resolveDir:root},bundle:true,platform:'node',outfile:path.join(root,'tmp/cloud-ticket-qa.cjs')});const {issueTicket}=require('../tmp/cloud-ticket-qa.cjs');
const code=esbuild.buildSync({stdin:{contents:"import React from 'react';import {createRoot} from 'react-dom/client';import ArenaCanvas from './components/arena/playground/ArenaCanvas';import {WebSocketConnection} from './components/arena/playground/realtime-network';window.ArenaClient=WebSocketConnection;window.renderArena=champion=>{document.body.innerHTML='<div id=\"qa-arena\" class=\"playgroundPage\"></div>';createRoot(document.getElementById('qa-arena')).render(React.createElement(ArenaCanvas,{champion,onExit:()=>{}}));};",resolveDir:root},loader:{'.js':'jsx'},bundle:true,platform:'browser',define:{'process.env.NODE_ENV':'"production"'},write:false}).outputFiles[0].text;
const fixture=i=>({id:1900000000+i,name:'Private networking QA '+i,loadout:{skin:'Undead',head:'bone',armour:'leather_garb',weapon:i%2?'dragon_staff':'dual_katana',magic:'fire_magic',extra:null}});
let stage='initializing';
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox']});const pages=[],errors=[];
 try{
  for(let i=0;i<8;i++){
   const page=await browser.newPage({viewport:{width:1280,height:900}});pages.push(page);page.on('pageerror',e=>errors.push(e.message));
   await page.goto(site+'/arena/playground',{waitUntil:'domcontentloaded',timeout:60000});await page.addScriptTag({content:code});
   const champion=fixture(i),ticket=issueTicket(champion,'private-qa-'+i,secret,Date.now()/1000,roomId);
   const session={transport:'websocket',url,ticket,expiresAt:Date.now()/1000+60};
   if(i===0){
    await page.addStyleTag({content:fs.readFileSync(path.join(root,'components/arena/playground/playground.css'),'utf8')});
    await page.evaluate(champion=>{window.renderArena(champion);},{...champion,session});
    await page.locator('.playgroundCanvas canvas').waitFor({timeout:30000});
   }else{
    await page.evaluate(({session})=>{window.states=[];window.notices=[];window.client=new ArenaClient(session,s=>{states.push(s);if(states.length>20)states.shift();},(message,fatal)=>{if(fatal)notices.push(message);});client.start();},{session});
    await page.waitForFunction(()=>client.ready&&states.length>0,null,{timeout:30000});
   }
  }
  console.log('Cloud QA: eight clients connected.');stage='model ready';
  const scene=pages[0];await scene.waitForFunction(()=>!document.querySelector('.playgroundOverlay'),null,{timeout:60000});
  stage='eight-player snapshot';
  await pages[7].waitForFunction(()=>Object.keys(states.at(-1).players).length===8,null,{timeout:15000});
  await scene.locator('canvas').focus();await scene.keyboard.down('KeyW');await new Promise(r=>setTimeout(r,1200));await scene.keyboard.up('KeyW');
  stage='draw';await scene.getByRole('button',{name:'Draw / stow',exact:true}).click();
  await pages[6].waitForFunction(()=>Object.values(states.at(-1).players).some(p=>p.champion.id===1900000000&&p.carry==='Hold'&&!p.action),null,{timeout:15000});
  stage='swing';await scene.getByRole('button',{name:'Attack',exact:true}).click();
  await pages[6].waitForFunction(()=>Object.values(states.at(-1).players).some(p=>p.champion.id===1900000000&&p.action?.kind==='Swing'),null,{timeout:10000});
  stage='reconnect';await pages[7].evaluate(()=>{client.baselines.clear();client.socket.close(4000,'Private reconnect test');});await pages[7].waitForFunction(()=>client.ready&&client.metrics.reconnects>0,null,{timeout:15000});
  const soakSeconds=process.argv.includes('--soak')?35:0;
  if(soakSeconds){stage='periodic persistence soak';console.log('Cloud QA: keeping eight clients connected through a checkpoint interval.');await new Promise(r=>setTimeout(r,soakSeconds*1000));}
  const stats=await scene.locator('.playgroundCanvas').evaluate(e=>({...e.dataset}));assert(Number(stats.fps)>0);
  const remote=await pages[6].evaluate(()=>({players:Object.keys(states.at(-1).players).length,notices,rtt:client.rtt}));assert.equal(remote.players,8);assert.deepEqual(remote.notices,[]);assert.deepEqual(errors,[]);
  await scene.screenshot({path:path.join(root,'output/playground/'+prefix+'-arena.png')});
  fs.writeFileSync(path.join(root,'output/playground/'+prefix+'-validation.json'),JSON.stringify({at:new Date().toISOString(),worker:base,clients:8,renderedScenes:1,soakSeconds,metrics:stats,remote,errors,publicAdmission:dev?'dev open / production paused':'paused',scope:'Private signed synthetic champion fixtures. Real Cloud Run WebSockets, Firestore leases, GLB assets and Chromium renderer; no actual champion NFT or rewards modified.'},null,2));
  console.log('PASS deployed Cloud Run: eight clients, equipped 3D scene, movement, attacks, reconnect; public admission remains paused.');
 }catch(e){
  await pages[0]?.screenshot({path:path.join(root,'output/playground/'+prefix+'-failure.png')}).catch(()=>{});
  const debug=await pages.at(-1)?.evaluate(()=>({notices:window.notices,players:window.states?.at(-1)?.players})).catch(()=>null);
  fs.writeFileSync(path.join(root,'output/playground/'+prefix+'-failure.json'),JSON.stringify({stage,message:e.message,debug,errors},null,2));throw e;
 }finally{for(const page of pages)await page.evaluate(()=>window.client?.close()).catch(()=>{});await new Promise(r=>setTimeout(r,500));await browser.close();}
})().catch(e=>{console.error(stage+': '+e.message);process.exitCode=1;});
