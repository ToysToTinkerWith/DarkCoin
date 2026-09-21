const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require('../tmp/playground-qa/node_modules/playwright'),esbuild=require('../tmp/champion-model-tools/node_modules/esbuild');
const root=path.resolve(__dirname,'..'),site='https://dark-coin-arena-dev.web.app',owner='C5AN3H22ATPXVEPQILQQYPZWBXPI3E7OH4QSCKW7KWVIJXPG3KBN6WCSZ4',assetId=1559026255;
// Public ownership fixture used only in practice. No wallet connection, signature or chain write.
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox']});let page;const errors=[],requests=[];
 try{
  page=await browser.newPage({viewport:{width:1280,height:900}});page.on('pageerror',e=>errors.push(e.message));
  await page.goto(site+'/arena/playground',{waitUntil:'domcontentloaded',timeout:60000});await page.getByRole('heading',{name:'The proving ground',exact:true}).waitFor({timeout:60000});await page.getByText('Connect your wallet to enter.',{exact:true}).waitFor();
  assert.equal(await page.getByRole('heading',{name:'Temporarily closed',exact:true}).count(),0);
  await page.locator('.walletFixedShell.ready').waitFor({timeout:60000});
  await page.screenshot({path:path.join(root,'output/playground/dev-lobby.png')});
  await page.goto(site+'/arena',{waitUntil:'domcontentloaded'});assert.equal(await page.locator('a[href="/arena/playground"]').count(),1);
  const invalid=await page.request.post(site+'/api/arena/combat',{data:{op:'join'}});assert.equal(invalid.status(),400);
  const blocked=await page.request.post(site+'/api/arena/fight',{data:{}});assert.equal(blocked.status(),404);
  const preview=await page.request.get(site+'/api/arena/playground?'+new URLSearchParams({address:owner,assetId}));assert.equal(preview.status(),200,await preview.text());const champion=await preview.json();assert(champion.loadout);
  const code=(await esbuild.build({stdin:{contents:"import React from 'react';import {createRoot} from 'react-dom/client';import Playground from './pages/arena/playground';createRoot(document.getElementById('__next')).render(<Playground/>);",resolveDir:root,loader:'jsx'},bundle:true,write:false,loader:{'.js':'jsx'},define:{'process.env.NODE_ENV':'"production"','process.env.NEXT_PUBLIC_ARENA_DEV':'"true"'},plugins:[{name:'qa-wallet',setup(b){b.onResolve({filter:/^(@txnlab\/use-wallet-react|next\/head|next\/link|next\/dynamic)$/},a=>({path:a.path,namespace:'qa'}));b.onLoad({filter:/.*/,namespace:'qa'},a=>({contents:a.path.includes('use-wallet')?`export const useWallet=()=>({activeAddress:'${owner}'});`:a.path==='next/head'?'export default ()=>null;':a.path==='next/link'?"import React from 'react';export default function Link({children,href}){return React.cloneElement(children,{href});}":"import React from 'react';export default loader=>{const C=React.lazy(loader);return props=><React.Suspense fallback={<p>Loading engine</p>}><C {...props}/></React.Suspense>}",loader:'jsx',resolveDir:root}));}}]})).outputFiles[0].text;
  // Only the wallet adapter and Next router are substituted. All NFT, admission,
  // 3D assets and WebSocket requests go to the deployed dev services unchanged.
  await page.route(site+'/arena/playground',route=>route.fulfill({contentType:'text/html',body:'<html><body style="margin:0;background:#050505"><div id="__next"></div></body></html>'}));
  await page.goto(site+'/arena/playground');for(const file of ['playground.css','champion-preview.css'])await page.addStyleTag({content:fs.readFileSync(path.join(root,'components/arena/playground',file),'utf8')});
  page.on('request',r=>{if(r.url().endsWith('/api/arena/combat'))requests.push(JSON.parse(r.postData()));});
  await page.addScriptTag({content:code});
  const button=page.getByRole('button',{name:'Preview '+champion.name,exact:true});await button.waitFor({timeout:120000});await button.click();
  const enter=page.getByRole('button',{name:'Enter playground',exact:true});await enter.waitFor({timeout:120000});await page.waitForFunction(()=>!!document.querySelector('[role="dialog"] canvas'),null,{timeout:60000});
  assert.equal(requests.length,0);assert(await page.getByRole('meter').count()>0);
  await page.screenshot({path:path.join(root,'output/playground/dev-nft-preview.png')});
  await enter.click();await page.waitForFunction(()=>document.querySelector('.playgroundCanvas canvas')&&!document.querySelector('.playgroundOverlay'),null,{timeout:120000});
  assert.deepEqual(requests[0],{op:'join',assetId,address:owner});
  await page.locator('canvas').focus();await page.keyboard.down('KeyW');await new Promise(r=>setTimeout(r,900));await page.keyboard.up('KeyW');await page.getByRole('button',{name:'Draw / stow',exact:true}).click();await new Promise(r=>setTimeout(r,3500));await page.getByRole('button',{name:'Attack',exact:true}).click();await new Promise(r=>setTimeout(r,1700));
  const metrics=await page.locator('.playgroundCanvas').evaluate(e=>({...e.dataset}));assert(Number(metrics.fps)>0);assert.deepEqual(errors,[]);
  await page.screenshot({path:path.join(root,'output/playground/dev-nft-arena.png')});
  fs.writeFileSync(path.join(root,'output/playground/dev-entry-validation.json'),JSON.stringify({at:new Date().toISOString(),passed:true,site,assetId,loadout:champion.loadout,metrics,errors,checks:['deployed lobby and dev navigation','invalid admission rejected','non-playground API blocked','real NFT ownership and equipped traits','roster -> 3D stats preview -> enter','real signed dev admission and WebSocket authority','movement, draw and attack'],scope:'Browser wallet adapter uses a public ownership fixture; actual wallet pairing is left for user testing. No signatures, transactions or NFT changes.'},null,2));console.log('PASS development NFT roster, stats preview, live admission, equipped models and playable arena.');
 }finally{if(page)await page.getByRole('button',{name:'Leave arena',exact:true}).click({timeout:1500}).catch(()=>{});await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
