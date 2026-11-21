const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const esbuild=require('esbuild'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/playground'),bundle=path.join(root,'tmp/playground-qa/loot-ui.js');let server,browser;
(async()=>{
 await esbuild.build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import Connect from './components/connect/connect';createRoot(document.getElementById('root')).render(<Connect/>);`,resolveDir:root,loader:'jsx'},bundle:true,loader:{'.js':'jsx'},outfile:bundle,define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'fixtures',setup(b){
  b.onResolve({filter:/^algosdk$/},a=>a.importer.endsWith('WalletRewards.js')?{path:'claim-sdk',namespace:'mock'}:null);
  b.onResolve({filter:/^@txnlab\/use-wallet-react$|FirebaseInit$/},a=>({path:a.path,namespace:'mock'}));
  b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:a.path==='claim-sdk'?`export default {Algodv2:class{sendRawTransaction(txns){window.submitted=(window.submitted||0)+1;return {do:async()=>({txid:'fixture-confirmed'})};}},waitForConfirmation:async()=>{}};`:a.path.includes('FirebaseInit')?'export const storage=null;':`export const useWallet=()=>({activeAddress:'fixture-wallet',activeWallet:{id:'pera'},wallets:[],isReady:true,signTransactions:async(txns)=>{window.walletSignCount=(window.walletSignCount||0)+1;if(!window.acceptClaim)throw Error('Claim cancelled by user');return txns;}});`}));
 }}]});
 const requests=[],errors=[],direct=process.env.ARENA_DIRECT_QA==='true',delivered=new Set();
 const row=(hour,id,amount,name,decimals=6)=>({hour,pickedUpAt:1,deliveryMode:direct?'direct':'legacy',deliveryStatus:delivered.has(hour)?'delivered':'saved',claim:{slot:0,kind:'token',rewardAssetId:id,amount,name,decimals,image:'/asset.png'}});
 server=http.createServer(async(req,res)=>{
  if(req.url==='/api/arena/economy'){
   res.setHeader('Content-Type','application/json');if(req.method==='GET')return res.end(JSON.stringify({enabled:true,algodUrl:'https://mainnet-api.algonode.cloud'}));
   let raw='';for await(const c of req)raw+=c;const b=JSON.parse(raw);requests.push(b);assert.equal(b.address,'fixture-wallet');assert.equal(req.headers.authorization,undefined);
   if(b.op==='rewards')return res.end(JSON.stringify(b.cursor?{cursor:null,rewards:[row(102,501,'1000000','Test Token')]}:{cursor:'next',rewards:[row(100,500,'1','Cinder Crown',0),row(101,501,'12345678912345678','Test Token')]}));
   if(b.op==='claim')return res.end(JSON.stringify(direct?{deliveryMode:'direct',transactions:b.hour===100?['AQ==']:[],requiresOptIn:b.hour===100,feeMicroAlgo:b.hour===100?1000:0,minBalanceIncreaseMicroAlgo:b.hour===100?100000:0}:{transactions:['AQ=='],requiresOptIn:true,feeMicroAlgo:4000,minBalanceIncreaseMicroAlgo:100000}));
   if(b.op==='deliver'&&direct){delivered.add(b.hour);return res.end(JSON.stringify({queued:true}));}
   throw Error('Unexpected signature/authentication request');
  }
  if(req.url==='/'){res.setHeader('Content-Type','text/html');return res.end('<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><body style="margin:0;background:#0b0b0e;color:#eee;font-family:Arial"><h1 style="padding:40px">Dark Coin</h1><div id="root"></div><script src="/ui.js"></script>');}
  if(req.url==='/ui.js'){res.setHeader('Content-Type','application/javascript');return fs.createReadStream(bundle).pipe(res);}
  if(req.url==='/asset.png'||req.url.startsWith('/home/')){res.setHeader('Content-Type','image/svg+xml');return res.end('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#c8ac71"/><text x="30" y="48">D</text></svg>');}
  res.statusCode=404;res.end();
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1100,height:850}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.getByLabel('2 unique reward assets to claim').waitFor();
 await page.getByRole('button',{name:'Open wallet assets',exact:true}).click();await page.getByText('12345678913.345678',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>window.walletSignCount||0),0);
 await page.getByRole('button',{name:'Claim rewards',exact:true}).click();await page.getByRole('button',{name:'Approve & claim',exact:true}).waitFor();assert.match(await page.locator('.claimReview').innerText(),direct?/0.001 ALGO/:/0.012 ALGO/);assert.match(await page.locator('.claimReview').innerText(),direct?/0.1 ALGO/:/0.2 ALGO/);assert.equal(await page.evaluate(()=>window.walletSignCount||0),0);
 await page.screenshot({path:path.join(out,'wallet-rewards-desktop.png')});await page.setViewportSize({width:390,height:844});await page.waitForTimeout(400);await page.getByRole('button',{name:'Approve & claim',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'wallet-rewards-mobile.png')});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.getByRole('button',{name:'Approve & claim',exact:true}).click();await page.getByRole('alert').filter({hasText:'Claim cancelled by user'}).waitFor();assert.equal(await page.evaluate(()=>window.walletSignCount),1);assert.equal(await page.getByLabel('2 unique reward assets to claim').count(),1);
 await page.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(await page.locator('.claimReview').count(),0);assert(requests.some(r=>r.cursor==='next'));
 await page.getByRole('button',{name:'Claim rewards',exact:true}).click();await page.evaluate(()=>{window.acceptClaim=true;});await page.getByRole('button',{name:'Approve & claim',exact:true}).click();await page.locator('.walletRewards').waitFor({state:'detached'});assert.equal(await page.getByText('No rewards to claim',{exact:true}).count(),0);assert.equal(await page.evaluate(()=>window.submitted),direct?1:3);if(direct)assert.equal(delivered.size,3);assert.equal(await page.getByLabel('2 unique reward assets to claim').count(),0);assert.deepEqual(errors,[]);
 console.log('PASS actual wallet popup: unique ASA badge across pages, exact totals, no sign-in, fee/unique-opt-in review, cancelled claim keeps rewards, successful claims clear badge, desktop/mobile layout.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();server?.close();});
