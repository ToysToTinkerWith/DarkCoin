// Browser QA uses a public NFT ownership fixture; no wallet is connected or signed.
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert');
const root=path.resolve(__dirname,'..'),qa=path.join(root,'tmp/playground-qa'),out=path.join(root,'output/playground');fs.mkdirSync(out,{recursive:true});
const esbuild=require(path.join(root,'tmp/champion-model-tools/node_modules/esbuild'));
const {chromium}=require(path.join(qa,'node_modules/playwright'));
const owner='C5AN3H22ATPXVEPQILQQYPZWBXPI3E7OH4QSCKW7KWVIJXPG3KBN6WCSZ4';
let server,browser,qaPage;
(async()=>{
 const fixture=await fetch(`http://127.0.0.1:3011/api/arena/playground?assetId=1559026255&address=${owner}`).then(r=>r.json());assert(fixture.loadout,JSON.stringify(fixture));
 // Optional deterministic equipment fixture exercises selection with both new categories.
 if(process.env.QA_MAGIC_EXTRAS){fixture.traits={...fixture.traits,Magic:'Dark Magic',Extra:'Golden Feathers'};fixture.loadout=require('../lib/playground').resolveLoadout(fixture.traits);}
 if(process.env.QA_SKIN){fixture.traits={...fixture.traits,Skin:process.env.QA_SKIN};fixture.loadout=require('../lib/playground').resolveLoadout(fixture.traits);}
 const roster=[{amount:1,asset:{index:fixture.id,params:{name:fixture.name,total:1,creator:require('../lib/playground').CHAMPION_CREATOR,url:fixture.image}}}];
 await esbuild.build({stdin:{contents:"import React from 'react';import {createRoot} from 'react-dom/client';import Playground from './pages/arena/playground';import ArenaCanvas from './components/arena/playground/ArenaCanvas';const root=createRoot(document.getElementById('root'));root.render(<Playground/>);window.previewTraits=()=>root.render(<main className='playgroundPage'><ArenaCanvas champion={{id:'preview',name:'Trait preview · Farmer',loadout:{skin:'Undead',head:'farmer',armour:'leather_garb',weapon:'dragon_staff'}}} onExit={()=>root.render(<Playground/>)}/></main>);",resolveDir:root,loader:'jsx'},bundle:true,outfile:path.join(qa,'qa.js'),loader:{'.js':'jsx'},define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'qa-wallet',setup(b){b.onResolve({filter:/^(@txnlab\/use-wallet-react|next\/head|next\/link|next\/dynamic)$/},a=>({path:a.path,namespace:'qa'}));b.onLoad({filter:/.*/,namespace:'qa'},a=>({contents:a.path.includes('use-wallet')?`export const useWallet=()=>({activeAddress:'${owner}'});`:a.path==='next/head'?'export default ()=>null;':a.path==='next/link'?"import React from 'react';export default function Link({children,href}){return React.cloneElement(children,{href});}":"import React from 'react';export default loader=>{const C=React.lazy(loader);return props=><React.Suspense fallback={<p>Loading engine</p>}><C {...props}/></React.Suspense>}",loader:'jsx',resolveDir:root}));}}],logLevel:'silent'});
 server=http.createServer(async(req,res)=>{
   try{
     if(req.url==='/api/getDcAssets'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify(roster));}
     if((process.env.QA_MAGIC_EXTRAS||process.env.QA_SKIN)&&req.url.startsWith('/api/arena/playground?')){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify(fixture));}
     if(req.url.startsWith('/api/')){const r=await fetch('http://127.0.0.1:3011'+req.url);res.writeHead(r.status,{'Content-Type':'application/json'});return res.end(await r.text());}
     if(req.url==='/'){res.setHeader('Content-Type','text/html');return res.end('<html><head><link rel="stylesheet" href="/qa.css"></head><body style="margin:0;background:#101b22;font-family:Arial"><div id="root"></div><script src="/qa.js"></script></body></html>');}
     const file=req.url==='/qa.js'?path.join(qa,'qa.js'):req.url==='/qa.css'?path.join(root,'components/arena/playground/playground.css'):path.join(root,'public',decodeURIComponent(req.url.split('?')[0]));
     if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);return res.end();}
     const types={'.js':'application/javascript','.css':'text/css','.glb':'model/gltf-binary','.json':'application/json','.png':'image/png'};res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
   }catch(e){res.writeHead(500);res.end(e.message);}
 });await new Promise(r=>server.listen(8811,'127.0.0.1',r));
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox']});
 const page=qaPage=await browser.newPage({viewport:{width:1100,height:800}});const errors=[],loadedAssets=[];page.on('response',r=>{if(r.url().endsWith('-rigged.glb')&&r.status()===200)loadedAssets.push(r.url());});page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message);});
 await page.goto('http://127.0.0.1:8811/');await page.getByRole('button',{name:/Dark Coin Champion #0001/}).waitFor({timeout:60000});await page.screenshot({path:path.join(out,'champion-selection.png')});
 if(!process.env.QA_PREVIEW_ONLY){
 await page.getByRole('button',{name:/Dark Coin Champion #0001/}).click();await page.locator('canvas').waitFor({timeout:120000});await page.waitForFunction(()=>document.querySelector('.playgroundActions button')?.disabled===false,null,{timeout:120000});
 assert.equal(await page.getByText('Unable to enter',{exact:true}).count(),0);
 if(fixture.loadout.skin!=='Undead')assert(loadedAssets.some(u=>u.endsWith('/skins/'+fixture.loadout.skin.toLowerCase().replace(/[^a-z0-9]+/g,'_')+'-rigged.glb')),'Selected skin model loaded');
 await page.getByText(fixture.loadout.skin,{exact:true}).waitFor();
 for(const [key,dir] of [['magic','magic'],['extra','extras']])if(fixture.loadout[key])assert(loadedAssets.some(u=>u.endsWith('/'+dir+'/'+fixture.loadout[key]+'-rigged.glb')),'Selected '+key+' model loaded');
 if(process.env.QA_MAGIC_EXTRAS){await page.getByText('Dark Magic',{exact:true}).waitFor();await page.getByText('Golden Feathers',{exact:true}).waitFor();}

 const canvas=page.locator('canvas'),box=await canvas.boundingBox();await page.mouse.move(box.x+box.width*.60,box.y+box.height*.6);await canvas.click({button:'right'});await page.getByText('In hands',{exact:true}).waitFor({timeout:120000});
 await page.screenshot({path:path.join(out,process.env.QA_MAGIC_EXTRAS?'arena-magic-extra-equipped.png':'arena-equipped.png')});
 await page.keyboard.down('KeyW');await page.keyboard.down('Shift');await page.waitForTimeout(1200);await page.mouse.click(box.x+box.width*.60,box.y+box.height*.6);await page.getByText('Swinging',{exact:true}).waitFor({timeout:10000});await page.screenshot({path:path.join(out,'arena-moving-attack.png')});await page.keyboard.up('KeyW');await page.keyboard.up('Shift');
 await page.getByText('In hands',{exact:true}).waitFor({timeout:120000});await canvas.click({button:'right'});await page.getByText('On back',{exact:true}).waitFor({timeout:120000});
 await page.keyboard.press('Escape');await page.getByRole('heading',{name:'Paused'}).waitFor();await page.getByRole('button',{name:'Resume',exact:true}).click();await page.getByRole('heading',{name:'Paused'}).waitFor({state:'hidden'});
 await page.getByRole('button',{name:'Change champion'}).click();await page.getByRole('heading',{name:/Your roster/}).waitFor();assert.equal(await page.locator('canvas').count(),0);assert.deepEqual(errors,[]);
 }
 await page.evaluate(()=>window.previewTraits());await page.locator('canvas').waitFor();await page.waitForFunction(()=>document.querySelector('.playgroundActions button')?.disabled===false,null,{timeout:120000});
 await page.mouse.move(920,720);await page.mouse.wheel(0,-450);await page.getByRole('button',{name:/Draw \/ stow/}).click();console.log('Farmer draw requested');await page.getByText('In hands',{exact:true}).waitFor({timeout:60000});await page.screenshot({path:path.join(out,'arena-farmer-preview.png')});
 fs.writeFileSync(path.join(out,process.env.QA_PREVIEW_ONLY?'preview-validation.json':process.env.QA_MAGIC_EXTRAS?'magic-extra-browser-validation.json':'browser-validation.json'),JSON.stringify({passed:true,fixture:{assetId:fixture.id,loadout:fixture.loadout},checks:process.env.QA_PREVIEW_ONLY?['Farmer + leather + staff rendering','draw from button','zoom']:['roster selection',process.env.QA_MAGIC_EXTRAS?'QA magic + extra selection fixture':'actual equipped trait fetch','selected skin, magic and extra model requests and HUD','3D load','right click draw','WASD + Shift','left click attack while running','right click stow','Escape pause/resume','exit disposes canvas','Farmer + leather + staff rendering','draw from button','zoom'],errors},null,2));console.log('Browser interaction checks passed');
})().catch(async e=>{console.error(e);if(qaPage){console.log(await qaPage.locator('body').innerText());await qaPage.screenshot({path:path.join(out,'browser-error.png')}).catch(()=>{});}process.exitCode=1;}).finally(async()=>{await browser?.close();server?.close();});


