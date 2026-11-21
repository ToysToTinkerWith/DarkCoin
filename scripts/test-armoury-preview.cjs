const fs=require('fs'),path=require('path'),http=require('http'),assert=require('node:assert/strict');
const esbuild=require('esbuild');
const {chromium}=require('playwright');
const sdk=require('algosdk'),CID=require('cids'),mh=require('multihashes');
const root=path.resolve(__dirname,'..'),out=path.join(root,'tmp/armoury-preview-qa');fs.mkdirSync(out,{recursive:true});
const address=sdk.generateAccount().addr.toString();
const hash=new CID(0,'dag-pb',mh.encode(Buffer.alloc(32,1),'sha2-256')).toString();
const traits=['Background','Weapon','Magic','Head','Armour','Extra'].map((type,i)=>({type,name:['Noir Background','Dragon Longsword','Water Magic','Snake','Iron Plate','Golden Feathers'][i],assetId:200+i,owned:true}));
const old=traits.map((t,i)=>({...t,name:['Dawn Background','Scythe','Fire Magic','Bone','Leather Garb','Hoop Earring'][i],assetId:100+i}));
let server,browser,page;const errors=[],requests=[];let confirmed=false,failHash=false;
async function checkCanvas(mode,width){
 const canvas=page.locator(`[data-preview-mode=${mode}] canvas`);await canvas.scrollIntoViewIfNeeded();
 const png=await canvas.screenshot({path:path.join(out,`${mode}-${width}.png`)});
 const pixels=await page.evaluate(async base64=>{
  const image=new Image();image.src='data:image/png;base64,'+base64;await image.decode();
  const el=document.createElement('canvas');el.width=image.width;el.height=image.height;const ctx=el.getContext('2d');ctx.drawImage(image,0,0);
  const data=ctx.getImageData(0,0,el.width,el.height).data,colors=new Set();let colorful=0;
  for(let i=0;i<data.length;i+=16){const rgb=[data[i],data[i+1],data[i+2]];colors.add(rgb.map(v=>v>>4).join(','));if(Math.max(...rgb)-Math.min(...rgb)>25)colorful++;}
  return {colors:colors.size,colorful};
 },png.toString('base64'));
 assert(pixels.colors>30&&pixels.colorful>100,`${mode} canvas is blank or missing its model at ${width}px: ${JSON.stringify(pixels)}`);
}
(async()=>{
 const plugins=[{name:'isolated-wallet-and-network',setup(b){
  b.onResolve({filter:/^(next\/dynamic|algosdk|@txnlab\/use-wallet-react|firebase\/storage)$|FirebaseInit$|NftImage$/},a=>a.pluginData?.real?null:{path:a.path,namespace:'fixture'});
  b.onResolve({filter:/^actual-sdk$/},()=>({path:require.resolve('algosdk')}));
  b.onLoad({filter:/.*/,namespace:'fixture'},a=>({loader:'jsx',resolveDir:root,contents:
   a.path==='next/dynamic'?`import React from 'react';export default (load,opts={})=>{const C=React.lazy(load);return props=><React.Suspense fallback={opts.loading?.()||null}><C {...props}/></React.Suspense>};`:
   a.path==='algosdk'?`import * as real from 'actual-sdk';
    class Algodv2 {getApplicationBoxByName(app,name){return {do:async()=>{if(app!==123)throw Error('No DAO fixture');const slot=String.fromCharCode(name[name.length-1]);const idx='BWMHAE'.indexOf(slot);return {value:real.encodeUint64(window.fixtureEmpty?0:100+idx)}}}}getTransactionParams(){return {do:async()=>({fee:1000,minFee:1000,flatFee:true,firstValid:1,lastValid:100,genesisHash:new Uint8Array(32),genesisID:'fixture'})}}sendRawTransaction(txns){return {do:async()=>{window.sent=(window.sent||0)+1;await fetch('/fixture-confirm',{method:'POST'});return {txid:'fixture'}}}}}
    class Indexer {lookupAccountAssets(){return {do:async()=>({assets:window.fixtureOptedIn?Array.from({length:6},(_,i)=>({assetId:100+i})):[]})}}}
    export default {...real,Algodv2,Indexer,waitForConfirmation:async()=>({})};`:
   a.path.includes('use-wallet')?`import * as sdk from 'actual-sdk';export function useWallet(){return {activeAddress:${JSON.stringify(address)},signTransactions:async(bytes,indexes)=>{window.signed=(window.signed||0)+1;window.lastGroup=bytes.map(b=>{const t=sdk.decodeUnsignedTransaction(b);return {type:t.type,asset:Number(t.assetTransfer?.assetIndex||t.assetConfig?.assetIndex||0),amount:Number(t.assetTransfer?.amount||0),args:t.applicationCall?.appArgs.map(a=>new TextDecoder().decode(a)),note:t.note.length?new TextDecoder().decode(t.note):null,group:Array.from(t.group||[])}});window.signingIndexes=indexes;if(window.cancelFixture)throw Error('User rejected transaction');return bytes.map(()=>new Uint8Array([1]));}}}`:
   a.path==='firebase/storage'?`export const getStorage=()=>({});export const ref=(_s,p)=>p;export const getDownloadURL=async p=>'/fixture-image.svg?name='+encodeURIComponent(p);`:
   a.path.includes('FirebaseInit')?'export const storage={},db={};':`import React from 'react';export default p=><img {...p}/>;`
  }));
 }}];
 const entry=`import React from 'react';import CssBaseline from '@mui/material/CssBaseline';import {createRoot} from 'react-dom/client';import {Buffer} from 'buffer';import Swapper from './components/contracts/Arena/Swapper';window.Buffer=Buffer;window.signed=0;window.sent=0;function App(){const [message,setMessage]=React.useState('');return <><CssBaseline/><div role='status'>{message}</div><Swapper nftId={999} zoom={true} contracts={{swapper:123}} traits={${JSON.stringify([...old,...traits])}} ownTraits={${JSON.stringify([...traits,{name:'Unowned Weapon',assetId:300,type:'Weapon',owned:false}])}} setMessage={setMessage} setProgress={()=>{}} refetchData={async()=>{window.refetched=true}}/></>}createRoot(document.getElementById('root')).render(<App/>);`;
 await esbuild.build({stdin:{contents:entry,resolveDir:root,loader:'jsx'},bundle:true,outfile:path.join(out,'qa.js'),loader:{'.js':'jsx'},plugins,define:{'process.env.NODE_ENV':'"production"'}});
 server=http.createServer(async(req,res)=>{let raw='';for await(const chunk of req)raw+=chunk;const body=raw?JSON.parse(raw):null;requests.push({path:req.url,body});res.setHeader('Content-Type','application/json');
  if(req.url.startsWith('/api/arena/champion-name'))return res.end(JSON.stringify({names:{}}));
  if(req.url==='/api/getNft')return res.end(JSON.stringify({nft:{assets:[{params:{name:'Generated champion fixture',url:'/fixture-image.svg'}}]},charStats:JSON.stringify({properties:{Skin:'Undead',...Object.fromEntries(old.map(t=>[t.type,t.name]))}}),charObject:{charObj:{name:'Existing generated champion',moves:['Keep me']}},action:null}));
  if(req.url.startsWith('/api/arena/playground'))return res.end(JSON.stringify({loadout:{weapon:'rusty_sword'},progression:{xp:'0',level:1}}));
  if(req.url==='/api/changeImg')return res.end(JSON.stringify({image:'/fixture-image.svg?preview'}));
  if(req.url==='/api/getHash'){if(failHash){res.statusCode=500;return res.end(JSON.stringify({error:'Fixture metadata failed'}));}return res.end(JSON.stringify({hash}));}
  if(req.url==='/api/mintNft')return res.end(JSON.stringify({signedTxn:Buffer.from([2]).toString('base64')}));
  if(req.url==='/fixture-confirm'){confirmed=true;return res.end('{}');}
  if(req.url==='/qa.js'){res.setHeader('Content-Type','text/javascript');return res.end(fs.readFileSync(path.join(out,'qa.js')));}
  if(req.url==='/'){res.setHeader('Content-Type','text/html');return res.end('<html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/preview.css"><link rel="stylesheet" href="/armoury.css"><body style="background:#080808;color:white"><div id="root"></div><script src="/qa.js"></script></body></html>');}
  if(req.url.startsWith('/api/')){res.statusCode=500;return res.end(JSON.stringify({error:'Unexpected API: '+req.url}));}
  const file=req.url==='/preview.css'?path.join(root,'components/arena/playground/champion-preview.css'):req.url==='/armoury.css'?path.join(root,'components/contracts/Arena/armoury-preview.css'):path.join(root,'public',decodeURIComponent(req.url.split('?')[0]));
  if(file.startsWith(root+path.sep)&&fs.existsSync(file)&&fs.statSync(file).isFile()){res.setHeader('Content-Type',({'.css':'text/css','.json':'application/json','.glb':'model/gltf-binary','.png':'image/png','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream');return res.end(req.url==='/armoury.css'?fs.readFileSync(file)+'\n'+fs.readFileSync(path.join(root,'components/contracts/Arena/armoury-build.css')):fs.readFileSync(file));}
  res.setHeader('Content-Type','image/svg+xml');res.end('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#444"/></svg>');
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});page=await browser.newPage({viewport:{width:1300,height:1000}});page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 const url=`http://127.0.0.1:${server.address().port}`;

 const select=async(type,name)=>{await page.getByRole('button',{name:'Change '+type,exact:true}).click();await page.getByTitle(name,{exact:true}).click();};
 await page.goto(url);await page.getByRole('button',{name:'Show Arena stats (3D)',exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:/Chronicles build/}).count(),0);
 const panel=await page.locator('[data-trait-swap-panel]').boundingBox(),toggle=await page.locator('.armouryObjectToggle').first().boundingBox();const traitsBottom=await page.getByRole('button',{name:/^Change /}).evaluateAll(nodes=>Math.max(...nodes.map(e=>e.getBoundingClientRect().bottom)));assert(panel.y>=traitsBottom,'swap panel below traits');assert(toggle.y>=panel.y+panel.height,'preview toggle below swap panel');assert.equal(await page.locator('.championNameEditor').count(),0);
 assert.equal(await page.locator('[data-trait-effects]').count(),0);assert.equal(await page.locator('.championViewport canvas').count(),0);
 await page.getByRole('button',{name:'Show Arena stats (3D)',exact:true}).click();
 const loaded=weapon=>page.waitForFunction(weapon=>[...document.querySelectorAll('#armoury-character-preview .championViewport')].filter(e=>e.dataset.weapon===weapon).length===2,weapon,{timeout:120000});
 await loaded('scythe');assert.equal(await page.locator('[data-trait-effects=scythe]').count(),1);assert((await page.locator('.championStat').count())>=24);
 assert.equal(await page.getByRole('button',{name:'Hide Arena stats (3D)',exact:true}).evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(230, 230, 230)');
 await select('Weapon','Dragon Longsword');await loaded('dragon_longsword');assert.equal(await page.locator('[data-trait-effects=dragon_longsword]').count(),1);assert.equal(await page.locator('[data-trait-effects=scythe]').count(),0);
 assert((await page.locator('#armoury-character-preview').innerText()).includes('Dragon Long Sword'));
 await page.getByRole('button',{name:'Change Head',exact:true}).click();assert.equal(await page.locator('[data-trait-effects=snake]').count(),1);
 await page.getByTitle('Snake',{exact:true}).click();await loaded('dragon_longsword');await page.waitForFunction(()=>!document.querySelector('#armoury-character-preview .championStageLoading'));
 await page.getByRole('button',{name:'Attacks',exact:true}).click();assert((await page.locator('#armoury-character-preview').innerText()).includes('4d6+17'));
 await page.getByRole('button',{name:'All stats',exact:true}).click();
 await page.locator('#armoury-character-preview').scrollIntoViewIfNeeded();await page.waitForFunction(()=>![...document.querySelectorAll('#armoury-character-preview')].some(e=>/Fitting|Placing|Preparing|Loading/.test(e.textContent)));await page.screenshot({path:path.join(out,'preview-desktop.png'),fullPage:true});
 await page.locator('#armoury-character-preview').screenshot({path:path.join(out,'panel-desktop.png')});
 await checkCanvas('idle',1300);await checkCanvas('attack',1300);
 await page.getByRole('button',{name:'Pause weapon animation',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[data-preview-mode=attack] .championViewport').dataset.playing==='false');
 await page.getByRole('button',{name:'Play weapon animation',exact:true}).click();const time=await page.locator('[data-preview-mode=attack] .championViewport').getAttribute('data-preview-time');await page.waitForFunction(t=>document.querySelector('[data-preview-mode=attack] .championViewport').dataset.previewTime!==t,time);
 await page.locator('[data-preview-mode=idle] .championViewport').scrollIntoViewIfNeeded();const oldCamera=await page.locator('[data-preview-mode=idle] .championViewport').getAttribute('data-camera');
 const view=page.locator('[data-preview-mode=idle] .championViewport'),rect=await view.boundingBox();await page.mouse.move(rect.x+rect.width*.5,rect.y+rect.height*.5);await page.mouse.down();await page.mouse.move(rect.x+rect.width*.7,rect.y+rect.height*.55,{steps:12});await page.mouse.up();
 await page.waitForFunction(camera=>document.querySelector('[data-preview-mode=idle] .championViewport').dataset.camera!==camera,oldCamera);
 await page.setViewportSize({width:390,height:844});await page.locator('#armoury-character-preview').scrollIntoViewIfNeeded();await page.waitForFunction(()=>![...document.querySelectorAll('#armoury-character-preview')].some(e=>/Fitting|Placing|Preparing|Loading/.test(e.textContent)));await page.screenshot({path:path.join(out,'preview-mobile.png'),fullPage:true});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'mobile page must fit');
 for(const width of [390,320]){
  await page.setViewportSize({width,height:844});await checkCanvas('idle',width);await checkCanvas('attack',width);
  await page.locator('.armouryPreviewModels').screenshot({path:path.join(out,`models-${width}.png`)});
  const overflow=await page.locator('#armoury-character-preview button').evaluateAll(buttons=>buttons.filter(el=>el.scrollWidth>el.clientWidth+2).map(el=>el.textContent));assert.deepEqual(overflow,[]);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'Narrow mobile page must fit');
 }
 await page.getByRole('button',{name:'Hide Arena stats (3D)',exact:true}).click();assert.equal(await page.locator('.championViewport canvas').count(),0);assert.equal(await page.locator('[data-trait-effects]').count(),0);
 assert.equal(await page.evaluate(()=>signed),0);assert.equal(await page.evaluate(()=>sent),0);assert(!requests.some(r=>/mintNft|generateChar|deleteChar/.test(r.path)));assert.deepEqual(errors,[]);
 console.log('PASS: real Swapper draft drives both 3D models, selected/available trait effects, current arena stats, removals tested separately, lazy hidden default, mobile layout, hide/dispose, no signing or NFT mutation.');
})().catch(async e=>{console.error(e);console.error(errors);if(page)console.error((await page.locator('body').innerText()).slice(-2200));process.exitCode=1}).finally(async()=>{await browser?.close();server?.close()});
