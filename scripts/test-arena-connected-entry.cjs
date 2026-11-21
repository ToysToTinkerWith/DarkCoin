const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const esbuild=require('esbuild'),{chromium}=require('playwright');let browser,server;
(async()=>{
 const root=path.resolve(__dirname,'..'),file=path.join(root,'tmp/connected-entry.js');
 await esbuild.build({stdin:{resolveDir:root,loader:'jsx',contents:`import React from 'react';import {createRoot} from 'react-dom/client';import Page from './pages/arena/playground';createRoot(document.getElementById('root')).render(<Page/>);`},bundle:true,loader:{'.js':'jsx'},outfile:file,define:{'process.env.NODE_ENV':'"production"','process.env.NEXT_PUBLIC_ARENA_DEV':'"false"'},plugins:[{name:'fixtures',setup(b){
  b.onResolve({filter:/^@txnlab\/use-wallet-react$|^next\/(head|link|dynamic)$|\/ChampionPreview$|\/GraveclawPanel$|\/availability$/},a=>({path:a.path,namespace:'mock'}));
  b.onLoad({filter:/.*/,namespace:'mock'},a=>({resolveDir:root,loader:'jsx',contents:a.path.includes('use-wallet')?`export const useWallet=()=>({activeAddress:'fixture-wallet',activeWallet:{id:'pera'},activeNetwork:'mainnet',signTransactions:async()=>{window.signs=(window.signs||0)+1;return new Promise((resolve,reject)=>{window.approve=()=>resolve([new Uint8Array([1])]);window.cancel=()=>reject(Error('Wallet sign-in cancelled.'));});}});`:a.path.endsWith('availability')?`export const PLAYGROUND_JOIN_ENABLED=true;export const PLAYGROUND_PAUSED_MESSAGE='paused';`:a.path.endsWith('GraveclawPanel')?`export default ()=>null;`:a.path.endsWith('head')?`export default ()=>null;`:a.path.endsWith('link')?`export default ({children})=>children;`:a.path.endsWith('dynamic')?`import React from 'react';export default ()=>({onExit})=><button onClick={onExit}>Leave arena</button>;`:`import React from 'react';import Notice from './components/arena/playground/ArenaEntryNotice';export default p=><section><Notice status={p.entryStatus} compact/>{p.accessPanel}{p.error&&<p role="alert">{p.error}</p>}<button disabled={p.loading||p.entering||!p.accessReady||p.entryLocked} onClick={p.onEnter}>{p.signingWallet?'Approve in wallet':'Enter playground'}</button><button onClick={p.onClose}>Close preview</button></section>;`}));
 }}]});
 let joins=0,encounterStatus='active';const champion={id:123,name:'Fixture Champion',loadout:{skin:'Undead',head:'bone',weapon:'scythe',armour:'leather_garb'}};
 server=http.createServer(async(req,res)=>{res.setHeader('Content-Type','application/json');
  if(req.url==='/'){res.setHeader('Content-Type','text/html');return res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"><div id="root"></div><script src="/app.js"></script>');}
  if(req.url==='/styles.css'){res.setHeader('Content-Type','text/css');return res.end(['components/arena/playground/playground.css','components/arena/playground/champion-preview.css','tmp/connected-entry.css'].map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n'));}
  if(req.url==='/app.js'){res.setHeader('Content-Type','application/javascript');return fs.createReadStream(file).pipe(res);}
  if(req.url==='/api/getDcAssets')return res.end(JSON.stringify([{amount:1,asset:{index:123,params:{name:champion.name,creator:'L6VIKAHGH4D7XNH3CYCWKWWOHYPS3WYQM6HMIPNBVSYZWPNQ6OTS5VERQY',total:1}}}]));
  if(req.url.startsWith('/api/arena/playground'))return res.end(JSON.stringify(champion));
  if(req.url==='/api/arena/economy'&&req.method==='GET')return res.end(JSON.stringify({enabled:true,monsterRewards:{},tokenMinimum:1,schedule:[{status:encounterStatus}]}));
  let raw='';for await(const part of req)raw+=part;const body=raw?JSON.parse(raw):{};
  if(body.op==='challenge'||body.op==='authenticate')throw new Error('Entry must not request wallet proof');
  if(body.op==='authenticate')return res.end(JSON.stringify({token:'verified-proof',expiresAt:Date.now()/1000+900}));
  if(body.op==='join'){assert.equal(req.headers.authorization,undefined);assert.equal(body.address,'fixture-wallet');joins++;return res.end(JSON.stringify({champion,session:{transport:'websocket',ticket:'fixture'}}));}
  res.statusCode=404;res.end('{}');
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox']});const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);
 const open=()=>page.getByRole('button',{name:'Preview Fixture Champion',exact:true}).click();
 await page.getByText('Graveclaw is active and fighting champions',{exact:true}).waitFor();
 fs.mkdirSync(path.join(root,'tmp/entry-notice-qa'),{recursive:true});
 for(const width of [1280,390]){await page.setViewportSize({width,height:900});const notice=page.getByRole('status',{name:'Arena entry status'});await notice.screenshot({path:path.join(root,`tmp/entry-notice-qa/notice-${width}.png`)});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
 await open();const enter=page.getByRole('button',{name:'Enter playground',exact:true});assert(await enter.isDisabled());assert.equal(joins,0);
 const refresh=()=>page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 encounterStatus='returning';await refresh();await page.getByText('Graveclaw is returning to his grave',{exact:true}).first().waitFor();assert(await enter.isDisabled());
 encounterStatus='waiting';await refresh();await page.waitForFunction(()=>![...document.querySelectorAll('button')].find(b=>b.textContent==='Enter playground').disabled);
 assert.equal(await page.getByRole('status',{name:'Arena entry status'}).count(),0);
 // Spawn between inspection and clicking Enter: recheck before any join POST.
 encounterStatus='active';await enter.click();await page.getByText('Graveclaw is active and fighting champions',{exact:true}).first().waitFor();assert(await enter.isDisabled());assert.equal(joins,0);
 encounterStatus='defeated';await refresh();await page.waitForFunction(()=>![...document.querySelectorAll('button')].find(b=>b.textContent==='Enter playground').disabled);
 assert.equal(await page.getByRole('button',{name:/Verify wallet|Check my loot/}).count(),0);
 assert.equal(await page.getByText('Free entry · Random monster loot',{exact:true}).count(),0);
 await page.getByRole('button',{name:'Enter playground',exact:true}).click();await page.getByRole('button',{name:'Leave arena'}).waitFor();assert.equal(joins,1);
 await page.getByRole('button',{name:'Leave arena'}).click();await open();await page.getByRole('button',{name:'Enter playground',exact:true}).click();await page.getByRole('button',{name:'Leave arena'}).waitFor();assert.equal(joins,2);assert.equal(await page.evaluate(()=>window.signs||0),0);assert.deepEqual(errors,[]);
 console.log('PASS real playground page: visible active/returning notices, disabled entry, automatic reopening, pre-join spawn race check, connected wallet enters/re-enters without signatures, authentication requests, loot panel or bearer token.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();server?.close();});
