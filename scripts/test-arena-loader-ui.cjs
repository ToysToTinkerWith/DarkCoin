const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const esbuild=require('esbuild'),{chromium}=require('playwright');
const config=require('../lib/arena/treasury-load-config.json'),algo=require('algosdk'),root=path.resolve(__dirname,'..'),out=path.join(root,'output/playground'),bundle=path.join(root,'tmp/playground-qa/loader-ui.js');
let browser,server,compatible=true;const requests=[],errors=[];
(async()=>{
 await esbuild.build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import Page from './pages/arena/load';createRoot(document.getElementById('root')).render(<Page/>);`,resolveDir:root,loader:'jsx'},bundle:true,loader:{'.js':'jsx'},outfile:bundle,define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'mock-wallet',setup(build){
  build.onResolve({filter:/^(@txnlab\/use-wallet-react|next\/head|next\/link)$/},a=>({path:a.path,namespace:'fixture'}));
  build.onLoad({filter:/.*/,namespace:'fixture'},a=>({resolveDir:root,contents:a.path==='next/head'?'export default ()=>null;':a.path==='next/link'?'export default ({children})=>children;':`import {useSyncExternalStore} from 'react';let address='${config.loader}';const listeners=new Set();window.setWallet=value=>{address=value;listeners.forEach(f=>f());};export const useWallet=()=>({activeAddress:useSyncExternalStore(f=>{listeners.add(f);return()=>listeners.delete(f)},()=>address),signTransactions:async()=>{window.signCount=(window.signCount||0)+1;return null;}});`}));
 }}]});
 const receiver=algo.getApplicationAddress(config.appId).toString(),status=()=>({...config,address:receiver,creator:config.loader,compatible,paused:true,amount:'100000',minBalance:'100000',message:compatible?'Ready':'Contract upgrade required.'});
 const asset={id:500,name:'Dark Coin test reward',unitName:'DARK',decimals:6,kind:'token',balance:'125000000',optedIn:false,registered:false};
 server=http.createServer(async(req,res)=>{
  if(req.url==='/api/arena/load'){
   res.setHeader('Content-Type','application/json');if(req.method==='GET')return res.end(JSON.stringify(status()));
   let raw='';for await(const c of req)raw+=c;const b=JSON.parse(raw);requests.push(b);
   if(b.op==='asset')return res.end(JSON.stringify({status:status(),asset}));
   if(b.op==='prepare'){
    const p={genesisID:'mainnet-v1.0',genesisHash:new Uint8Array(32),firstValid:1000,lastValid:2000,fee:1000,flatFee:true};
    const txn=algo.makeAssetTransferTxnWithSuggestedParamsFromObject({sender:config.loader,receiver,assetIndex:500,amount:12500000,suggestedParams:p}),encoded=Buffer.from(algo.encodeUnsignedTransaction(txn)).toString('base64');
    return res.end(JSON.stringify({sender:config.loader,assetId:500,amount:'12.5',name:asset.name,requiresOptIn:true,fundingMicroAlgo:'118900',feeMicroAlgo:4000,transactions:[encoded,encoded,encoded]}));
   }
  }
  if(req.url==='/ui.js'){res.setHeader('Content-Type','application/javascript');return fs.createReadStream(bundle).pipe(res);}
  if(req.url==='/'){res.setHeader('Content-Type','text/html');return res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#080a0c}</style><div id="root"></div><script src="/ui.js"></script>');}
  res.statusCode=404;res.end();
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1280,height:1100}});page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://**',route=>{errors.push('Unexpected network request '+route.request().url());route.abort();});
 const url=`http://127.0.0.1:${server.address().port}/`;await page.goto(url);
 await page.getByLabel('Asset ID',{exact:true}).fill('500');await page.getByRole('button',{name:'Look up asset',exact:true}).click();await page.getByLabel('Amount to deposit').fill('12.5');await page.getByRole('button',{name:/Review deposit/}).click();await page.getByRole('region',{name:'Deposit review'}).waitFor();
 assert.match(await page.getByRole('region',{name:'Deposit review'}).innerText(),/0.1189 ALGO/);assert.match(await page.getByRole('region',{name:'Deposit review'}).innerText(),/0.004 ALGO/);assert.equal(await page.evaluate(()=>window.signCount||0),0);
 fs.mkdirSync(out,{recursive:true});await page.screenshot({path:path.join(out,'arena-load-desktop.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(out,'arena-load-mobile.png'),fullPage:true});
 await page.getByRole('button',{name:'Sign & deposit',exact:true}).click();await page.getByRole('alert').filter({hasText:'Signing cancelled'}).waitFor();assert.equal(await page.evaluate(()=>window.signCount),1);
 await page.evaluate(()=>window.setWallet('different-wallet'));await page.getByRole('heading',{name:'Authorized wallet required'}).waitFor();assert.equal(await page.getByRole('button',{name:'Sign & deposit'}).count(),0);assert.equal(await page.getByLabel('Asset ID',{exact:true}).count(),0);
 compatible=false;await page.goto(url);await page.getByRole('heading',{name:'Contract update required'}).waitFor();await page.getByLabel('Asset ID',{exact:true}).fill('500');assert(await page.getByRole('button',{name:'Look up asset',exact:true}).isDisabled());
 assert.deepEqual(errors,[]);assert.deepEqual(requests.map(r=>r.op),['asset','prepare']);console.log('PASS loader UI: authorized wallet, blocked incompatible app, review before signing, wallet switch, cancelled signature, no broadcast, mobile layout.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();server?.close();});
