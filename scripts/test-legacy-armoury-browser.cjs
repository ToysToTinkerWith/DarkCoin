const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),sdk=require('algosdk');
const esbuild=require('esbuild'),{chromium}=require('playwright');
const root=process.cwd(),out=path.join(root,'tmp/legacy-armoury-browser'),account=sdk.generateAccount(),address=account.addr.toString();fs.mkdirSync(out,{recursive:true});
(async()=>{
 const fixture=`import React from 'react';import {createRoot} from 'react-dom/client';import Builder from './components/contracts/Arena/LegacyChampionBuilder';import {ChampionNameEditor} from './components/ChampionName';import EffectKeywords from './components/EffectKeywords';
 function App(){const [mode,setMode]=React.useState('2d');return <><EffectKeywords/><p id="glossary-control">Poison</p><h1>NFT original name</h1><button id="mode" onClick={()=>setMode(mode==='2d'?'3d':'2d')}>Switch arena</button>{mode==='2d'?<Builder nftId={99} name="NFT original name" contracts={{}} selection={{Weapon:3586495825,Armour:0}}/>:<ChampionNameEditor id={99} fallback="NFT original name" game="3d"/>}</>;}createRoot(document.getElementById('root')).render(<App/>);`;
 await esbuild.build({stdin:{contents:fixture,loader:'jsx',resolveDir:root},bundle:true,loader:{'.js':'jsx'},outfile:path.join(out,'app.js'),define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'fixtures',setup(b){
  b.onResolve({filter:/^@txnlab\/use-wallet-react$|^firebase\/firestore$|FirebaseInit$|^\.\/Character$/},a=>({path:a.path,namespace:'fixture'}));
  b.onLoad({filter:/.*/,namespace:'fixture'},a=>({loader:'jsx',resolveDir:root,contents:a.path.includes('use-wallet')?`export function useWallet(){return {activeAddress:'${address}',signTransactions:async()=>{window.signCalls=(window.signCalls||0)+1;if(window.cancelPayment!==false)throw Error('Wallet cancelled');return [new Uint8Array([1,2,3])];}};}`:a.path==='firebase/firestore'?`export const doc=()=>({});export function onSnapshot(ref,fn){window.emitCharacterSnapshot=data=>fn({exists:()=>true,data:()=>data});window.emitCharacterSnapshot({charObj:{name:'2D Veteran',strength:12},status:'completed'});return ()=>{delete window.emitCharacterSnapshot;};}`:a.path.includes('FirebaseInit')?'export const db={};':`import React from 'react';export default ()=> <p>Saved character fixture</p>;`}));
 }}]});
 const names={'2d':'2D Veteran','3d':'3D Hero'};let preparedBody,challenge,queueCalls=0;
 const server=http.createServer(async(req,res)=>{
  if(req.url==='/app.js'){res.setHeader('Content-Type','text/javascript');return res.end(fs.readFileSync(path.join(out,'app.js')));}
  if(req.url==='/armoury.css'){res.setHeader('Content-Type','text/css');return res.end(fs.readFileSync('components/contracts/Arena/armoury-preview.css')+'\n'+fs.readFileSync('components/contracts/Arena/armoury-build.css'));}
  const publicRoot=path.join(root,'public'),asset=path.resolve(publicRoot,'.'+new URL(req.url,'http://local').pathname);
  if(asset.startsWith(publicRoot+path.sep)&&fs.existsSync(asset)&&fs.statSync(asset).isFile()){
   res.setHeader('Content-Type',({'.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg'})[path.extname(asset)]||'application/octet-stream');return res.end(fs.readFileSync(asset));
  }
  let raw='';for await(const c of req)raw+=c;const body=raw?JSON.parse(raw):{};res.setHeader('Content-Type','application/json');
  if(req.url.startsWith('/api/arena/champion-name')){const url=new URL(req.url,'http://local');if(req.method==='GET')return res.end(JSON.stringify({names:{99:names[url.searchParams.get('game')]}}));if(body.op==='challenge'){challenge=body;return res.end(JSON.stringify({nonce:'test',unsigned:'AQI='}));}names[challenge.game]=challenge.name;return res.end(JSON.stringify({assetId:99,name:challenge.name,game:challenge.game}));}
  if(req.url==='/api/arena/legacy-generation'){
   if(body.op==='queue'){queueCalls++;return res.end(JSON.stringify({status:'queued',requestId:body.requestId}));}
   preparedBody=body;const tx=sdk.makeAssetTransferTxnWithSuggestedParamsFromObject({sender:address,receiver:'VWYCYQ3H3PPNIGON4H363DIH7BP33TTZWUUUNMTDXCIHRCDPFOMU7VJ5HM',assetIndex:1088771340,amount:10000000000n,note:Buffer.from('fixture'),suggestedParams:{fee:1000,flatFee:true,firstValid:10,lastValid:100,genesisID:'mainnet-v1.0',genesisHash:new Uint8Array(32)}});
   return res.end(JSON.stringify({requestId:'a'.repeat(48),paymentTxnId:tx.txID(),unsigned:Buffer.from(sdk.encodeUnsignedTransaction(tx)).toString('base64')}));
  }
  res.setHeader('Content-Type','text/html');res.end('<html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/armoury.css"><body style="background:#080808;color:white;margin:0"><div id="root"></div><script src="/app.js"></script></body></html>');
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});const page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port);
  const generate=page.getByRole('button',{name:'Regenerate 2D character · 10,000 DARK',exact:true});await generate.waitFor();assert(await generate.isEnabled());
  await page.waitForFunction(()=>[...(CSS.highlights.get('darkcoin-effects')||[])].some(range=>range.startContainer.parentElement.closest('#glossary-control')));
  const poison=page.locator('.legacyEffectChoice').filter({hasText:'Poison'}).first();await poison.hover();
  await page.getByRole('tooltip').filter({hasText:'Poison'}).waitFor();
  assert.equal(await page.locator('[data-effect-tooltip]').count(),0,'Only the existing Armory hover explanation should open.');
  assert(await page.getByRole('tooltip').locator('[data-no-keywords]').count(),'Portaled tooltip content must also opt out.');
  assert.equal(await page.evaluate(()=>[...(CSS.highlights.get('darkcoin-effects')||[])].filter(range=>range.startContainer.parentElement.closest('[data-no-keywords]')).length),0,'No duplicate glossary links on existing tooltip controls.');
  await page.locator('h1').hover();await page.getByRole('tooltip').waitFor({state:'hidden'});
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('.armouryPrimary')).backgroundColor==='rgb(230, 230, 230)');
  await page.getByRole('button',{name:'Decrease Strength points',exact:true}).click();assert(await generate.isDisabled());
  await page.getByRole('button',{name:'Increase Strength points',exact:true}).click();assert(await generate.isEnabled());
  await page.getByRole('textbox',{name:'2D character name',exact:true}).fill('Draft swordsman');await generate.click();await page.getByRole('alert').filter({hasText:'Wallet cancelled'}).waitFor();
  assert.equal(preparedBody.selection.Weapon,3586495825);assert.equal(preparedBody.selection.Armour,0);assert.equal(preparedBody.championName,'Draft swordsman');assert.equal(preparedBody.generationBuild.moves.length,3);assert.equal(queueCalls,0);
  assert.equal(await page.evaluate(()=>localStorage.length),0);
  await page.getByRole('button',{name:'Edit name',exact:true}).click();await page.getByRole('textbox',{name:'Chronicles (2D) name',exact:true}).fill('Classic rename');await page.evaluate(()=>window.cancelPayment=false);await page.getByRole('button',{name:'Save name',exact:true}).click();await page.getByRole('heading',{name:'Classic rename',exact:true}).waitFor();assert.equal(names['2d'],'Classic rename');assert.equal(names['3d'],'3D Hero');
  await page.locator('#mode').click();await page.getByRole('heading',{name:'3D Hero',exact:true}).waitFor();assert.equal(await generate.count(),0);
  await page.evaluate(address=>localStorage.setItem('darkcoin-2d-generation:'+address+':99',JSON.stringify({requestId:'b'.repeat(48),paymentTxnId:'already-paid'})),address);
  await page.locator('#mode').click();const before=await page.evaluate(()=>window.signCalls);
  await page.evaluate(()=>window.emitCharacterSnapshot({generationJobId:'old-job',status:'completed',progress:100,charObj:{name:'2D Veteran',strength:12}}));
  await page.getByRole('button',{name:'Retry queueing paid build',exact:true}).click();
  await page.getByText('Waiting for the generation server',{exact:true}).waitFor();
  const queuedButton=page.getByRole('button',{name:'Generation queued',exact:true}),progressBar=page.getByRole('progressbar',{name:'2D character generation progress'});
  assert(await queuedButton.isDisabled(),'The queue receipt must disable generation before Firestore updates.');
  assert.equal(await progressBar.getAttribute('aria-valuenow'),'0');
  assert.equal(await page.locator('.armouryGenerationActions').getByRole('button').count(),1);
  assert.equal(await page.locator('.armouryGenerationActions').getByRole('progressbar').count(),1);
  assert.equal(queueCalls,1);assert.equal(await page.evaluate(()=>window.signCalls),before);assert.equal(await page.evaluate(()=>localStorage.length),0);
  await page.evaluate(()=>window.emitCharacterSnapshot({generationJobId:'b'.repeat(48),status:'queued',stage:'queued',progress:0,charObj:{name:'2D Veteran',strength:12}}));
  await page.getByText('Payment received. Startup can take a few minutes.',{exact:false}).waitFor();assert(await queuedButton.isDisabled());
  await page.getByRole('button',{name:'Saved 2D character',exact:true}).click();await page.getByText('Waiting for the generation server',{exact:true}).waitFor();
  await page.evaluate(()=>window.emitCharacterSnapshot({generationJobId:'b'.repeat(48),status:'generating_images',stage:'move_2_assets_generated',progress:84,charObj:{name:'2D Veteran',strength:12}}));
  await page.getByText('Move 2 assets generated',{exact:true}).waitFor();
  assert.equal(await progressBar.getAttribute('aria-valuenow'),'84');
  assert(await page.getByRole('button',{name:'Generating 2D character…',exact:true}).isDisabled());
  for(const width of [1280,390,320]){
   await page.setViewportSize({width,height:900});await page.locator('.armouryGenerationActions').screenshot({path:path.join(out,`progress-${width}.png`)});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Progress and button must fit the viewport.');
  }
  await page.setViewportSize({width:1280,height:1000});
  await page.evaluate(()=>window.emitCharacterSnapshot({generationJobId:'b'.repeat(48),status:'completed',stage:'done',progress:100,charObj:{name:'Completed Hero',strength:12}}));
  await page.getByText('Your 2D character is ready.',{exact:true}).waitFor();assert.equal(await page.getByText(/Waiting for the generation server|Generating character:/).count(),0);assert.equal(queueCalls,1);assert.equal(await page.evaluate(()=>window.signCalls),before);
  assert.equal(await progressBar.getAttribute('aria-valuenow'),'100');
  await page.getByRole('button',{name:'Build a character',exact:true}).click();assert(await generate.isEnabled());
  await page.waitForFunction(()=>[...document.querySelectorAll('#armoury-2d-builder img')].every(img=>img.complete&&img.naturalWidth>0));
  await page.screenshot({path:path.join(out,'completed-desktop.png'),fullPage:true});
  await page.evaluate(()=>window.emitCharacterSnapshot({generationJobId:'b'.repeat(48),status:'failed',errorMessage:'Worker stopped',charObj:{name:'2D Veteran',strength:12}}));
  await page.getByRole('alert').filter({hasText:'Your payment is recorded.'}).waitFor();assert.equal(await page.getByText('Your 2D character is ready.',{exact:true}).count(),0);
  for(const width of [390,320]){
   await page.setViewportSize({width,height:844});await page.screenshot({path:path.join(out,`mobile-${width}.png`),fullPage:true});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'The 2D panel must fit the viewport.');
   const overflow=await page.locator('#armoury-2d-builder button').evaluateAll(buttons=>buttons.filter(el=>el.scrollWidth>el.clientWidth+2).map(el=>el.textContent));assert.deepEqual(overflow,[]);
   await page.getByRole('button',{name:'Edit name',exact:true}).click();await page.getByRole('textbox',{name:'Chronicles (2D) name',exact:true}).fill('A champion with a long name');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.getByRole('button',{name:'Cancel',exact:true}).click();
  }
  assert.deepEqual(errors,[]);
  console.log('PASS generation payload, cancellation, independent names, paid retry without signing again, queued/processing/completed/failed live updates in both views, and desktop/mobile rendering.');
 }finally{await browser?.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
