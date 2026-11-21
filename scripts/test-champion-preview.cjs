const fs=require('fs'),path=require('path'),http=require('http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),qa=path.join(root,'tmp/playground-qa'),out=path.join(root,'output/playground');
const esbuild=require('esbuild'),{chromium}=require('playwright');
const {CHAMPION_CREATOR}=require('../lib/playground');
let server,browser,page;
(async()=>{
 console.log('Building champion preview fixture...');
 const champion={progression:{xp:'4900',level:8,points:8},id:1001,name:'Champion preview fixture',loadout:{skin:'Undead',head:'bone',armour:'leather_garb',weapon:'dragon_longsword',magic:'fire_magic',extra:'golden_feathers',background:'dawn_background'}};
 const bare={id:1002,name:'Unequipped preview fixture',loadout:{skin:'Light Skin',head:null,armour:null,weapon:null,magic:null,extra:null,background:'noir_background'}};
 const requests=[],errors=[];let failJoin=true,failPreview=false,failModel=false;
 const plugins=[{name:'fixture-shell',setup(build){
  build.onResolve({filter:/^(next\/(head|link|dynamic)|@txnlab\/use-wallet-react)$|NftImage$|playground\/ArenaCanvas$/},a=>({path:a.path,namespace:'fixture'}));
  build.onLoad({filter:/.*/,namespace:'fixture'},a=>({loader:'jsx',resolveDir:root,contents:
   a.path==='next/head'?"export default ()=>null;":a.path==='next/link'?"export default ({children})=>children;":a.path==='next/dynamic'?"import React from 'react';export default (load,opts)=>{const C=React.lazy(load);return props=><React.Suspense fallback={opts.loading?.()||null}><C {...props}/></React.Suspense>};":
   a.path.includes('use-wallet')?"import React from 'react';let address='fixture-address';const listeners=new Set();window.disconnectWallet=()=>{address=null;for(const fn of listeners)fn();};export function useWallet(){const activeAddress=React.useSyncExternalStore(fn=>{listeners.add(fn);return()=>listeners.delete(fn);},()=>address,()=>address);return {activeAddress,signTransactions(){throw Error('Must never ask to sign');}}}":
   a.path.includes('NftImage')?"import React from 'react';export default ({alt})=><img src='/home/arena.png' alt={alt}/>;":
   "import React from 'react';export default ({champion,onExit})=><section><h2>Entered fixture arena: {champion.name}</h2><button onClick={onExit}>Exit fixture arena</button></section>;"
  }));
 }}];
 await esbuild.build({stdin:{contents:"import React from 'react';import {createRoot} from 'react-dom/client';import Page from './pages/arena/playground';createRoot(document.getElementById('__next')).render(<Page/>);",resolveDir:root,loader:'jsx'},bundle:true,outfile:path.join(qa,'preview-qa.js'),loader:{'.js':'jsx'},plugins,define:{'process.env.NODE_ENV':'"production"','process.env.NEXT_PUBLIC_ARENA_ENABLED':'"true"','process.env.NEXT_PUBLIC_ARENA_DEV':'"false"'}});
 server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');res.setHeader('Content-Type','application/json');
  if(url.pathname==='/api/arena/economy')return res.end(JSON.stringify({enabled:false,entryFee:0}));
  if(url.pathname==='/api/getDcAssets')return res.end(JSON.stringify([champion,bare].map(c=>({amount:1,asset:{index:c.id,params:{name:c.name,creator:CHAMPION_CREATOR,total:1,url:''}}}))));
  if(url.pathname==='/api/arena/playground'){if(failPreview){res.statusCode=503;return res.end(JSON.stringify({error:'Fixture metadata unavailable'}));}return res.end(JSON.stringify(url.searchParams.get('assetId')==='1002'?bare:champion));}
  if(url.pathname==='/api/arena/combat'){let raw='';for await(const c of req)raw+=c;const body=JSON.parse(raw);requests.push(body);if(failJoin){res.statusCode=409;return res.end(JSON.stringify({error:'This practice room is full. Try again shortly.'}));}return res.end(JSON.stringify({champion:body.assetId===1002?bare:champion,session:{token:'fixture'}}));}
  if(url.pathname==='/'){res.setHeader('Content-Type','text/html');return res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/base.css"><link rel="stylesheet" href="/preview.css"></head><body style="margin:0;background:#050505;font-family:Arial"><div id="__next"></div><script src="/qa.js"></script></body></html>');}
  if(failModel&&url.pathname.endsWith('/body.glb')){res.statusCode=503;return res.end();}
  const file=url.pathname==='/qa.js'?path.join(qa,'preview-qa.js'):url.pathname==='/base.css'?path.join(root,'components/arena/playground/playground.css'):url.pathname==='/preview.css'?path.join(root,'components/arena/playground/champion-preview.css'):path.join(root,'public',decodeURIComponent(url.pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.statusCode=404;return res.end();}
  res.setHeader('Content-Type',({'.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.glb':'model/gltf-binary'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
 });await new Promise(r=>server.listen(8813,'127.0.0.1',r));
 console.log('Preview fixture listening on 8813.');
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox']});
 page=await browser.newPage({viewport:{width:1360,height:940}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8813/');console.log('Selecting fixture champion.');await page.getByRole('button',{name:'Preview '+champion.name,exact:true}).click();
 console.log('Champion selection opened.');
 const enter=page.getByRole('button',{name:'Enter playground'});await enter.waitFor({timeout:120000});assert.equal(requests.length,0,'inspection must not join');
 if(process.env.ARENA_SKILLS_QA==='true'){
  await page.getByRole('tab',{name:'Skill tree',exact:true}).click();
  assert.equal(await page.locator('.skillPointCount strong').innerText(),'8');
  assert(await page.getByRole('button',{name:'Add one rank of Tempo',exact:true}).isDisabled());
  for(const name of ['Force','Force','Tempo','Vitality','Vitality'])await page.getByRole('button',{name:'Add one rank of '+name,exact:true}).click();
  assert.equal(await page.locator('.skillPointCount strong').innerText(),'3');
  assert.match(await page.locator('.skillSaveNote').innerText(),/Saved on this browser/);
  await page.screenshot({path:path.join(out,'champion-skills-desktop.png')});
  await page.getByRole('tab',{name:'All stats',exact:true}).click();
  assert.equal(await page.getByRole('meter',{name:'Maximum health',exact:true}).getAttribute('aria-valuenow'),'236');
  assert.match(await page.locator('.championStatContributions').first().innerText(),/Vitality/);
  await page.reload();await page.getByRole('button',{name:'Preview '+champion.name,exact:true}).click();await enter.waitFor({timeout:120000});
  await page.getByRole('tab',{name:'Skill tree',exact:true}).click();assert.equal(await page.locator('.skillPointCount strong').innerText(),'3');
  await page.getByRole('button',{name:'Refund one rank of Force',exact:true}).click();assert.equal(await page.locator('.skillPointCount strong').innerText(),'5');assert.match(await page.locator('[data-skill=tempo]').innerText(),/0\/3/);
  await page.getByRole('button',{name:'Add one rank of Force',exact:true}).click();await page.getByRole('button',{name:'Add one rank of Tempo',exact:true}).click();
  await page.setViewportSize({width:390,height:844});await page.locator('.skillProgression').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'champion-skills-mobile.png')});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert(await page.locator('.skillBranches').evaluate(e=>e.scrollWidth<=e.clientWidth));
  await enter.click();await page.getByRole('alert').filter({hasText:'room is full'}).waitFor();assert.deepEqual(requests[0].skills,{force:2,tempo:1,vitality:2});
  await page.getByRole('button',{name:'Refund all points',exact:true}).click();
  assert.equal(await page.locator('.skillBranch').count(),8);
  for(const name of ['Deadly Edge','Deadly Edge','Composure','Elemental Ward','Ferocity','Economy of Motion'])await page.getByRole('button',{name:'Add one rank of '+name,exact:true}).click();
  assert.equal(await page.locator('.skillPointCount strong').innerText(),'2');
  await page.reload();await page.getByRole('button',{name:'Preview '+champion.name,exact:true}).click();await enter.waitFor({timeout:120000});
  await page.getByRole('tab',{name:'Skill tree',exact:true}).click();assert.equal(await page.locator('.skillPointCount strong').innerText(),'2');
  await page.locator('[data-skill=economy_of_motion]').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'champion-new-skills-mobile.png')});
  await page.setViewportSize({width:1360,height:940});await page.locator('[data-skill=deadly_edge]').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'champion-new-skills-desktop.png')});
  await enter.click();await page.getByRole('alert').filter({hasText:'room is full'}).waitFor();assert.deepEqual(requests[1].skills,{deadly_edge:2,composure:1,elemental_ward:1,ferocity:1,economy_of_motion:1});
  await page.getByRole('button',{name:'Close champion preview'}).click();await page.getByRole('button',{name:'Preview '+bare.name,exact:true}).click();await enter.waitFor({timeout:120000});
  await page.getByRole('tab',{name:'Skill tree',exact:true}).click();assert.equal(await page.locator('.skillPointCount strong').innerText(),'1');
  await page.getByRole('button',{name:'Add one rank of Vitality',exact:true}).click();assert.equal(await page.locator('.skillPointCount strong').innerText(),'0');assert(await page.getByRole('button',{name:'Add one rank of Force',exact:true}).isDisabled());
  await page.getByRole('button',{name:'Refund all points',exact:true}).click();assert.equal(await page.locator('.skillPointCount strong').innerText(),'1');
  assert.deepEqual(errors,[]);console.log('PASS skill tree desktop/mobile: live stats, prerequisites, refunds, reload persistence, champion isolation, entry payload and no wallet signature.');return;
 }
 if(process.env.ARENA_PREVIEW_QUICK==='true'){
  assert.equal(await page.locator('[role="dialog"] canvas').count(),2);
  await page.evaluate(()=>window.disconnectWallet());await page.getByRole('heading',{name:'Connect your wallet to enter.'}).waitFor();await page.getByRole('dialog').waitFor({state:'detached'});
  assert.equal(requests.length,0);assert.deepEqual(errors,[]);console.log('PASS preview smoke: both 3D views, free-entry button, no premature join/signature, shared-wallet disconnect closes preview.');return;
 }
 console.log('Champion preview ready; checking attack and cameras.');
 const viewport=page.locator('[data-preview-mode=attack] .championViewport'),idle=page.locator('[data-preview-mode=idle] .championViewport');
 await page.waitForFunction(()=>Number(document.querySelector('[data-preview-mode=attack] .championViewport')?.dataset.previewTime)>0);
 await page.waitForFunction(()=>document.querySelector('[data-preview-mode=attack] .championViewport')?.dataset.pose==='Swing',null,{timeout:30000});
 assert.doesNotMatch(await page.locator('.championAttackPreview').innerText(),/Double-click/);assert.equal(await page.locator('[data-followup]').count(),0);
 assert.equal(await viewport.getAttribute('data-weapon'),'dragon_longsword');assert.equal(await viewport.getAttribute('data-champion-id'),'1001');
 assert.equal(await page.locator('[role="dialog"] canvas').count(),2,'separate idle and attack renderers');
 assert.equal(await page.locator('[role="dialog"] video').count(),0,'no generic prerecorded champion');
 assert.equal(await page.locator('[role="dialog"] a[href*="hitbox-preview"]').count(),0);
 await page.getByRole('button',{name:'Pause weapon animation'}).click();await page.waitForFunction(()=>document.querySelector('[data-preview-mode=attack] .championViewport')?.dataset.playing==='false');const frozen=await viewport.getAttribute('data-preview-time');await page.waitForTimeout(250);assert.equal(await viewport.getAttribute('data-preview-time'),frozen);
 const idleCamera=await idle.getAttribute('data-camera');assert.equal(await idle.getAttribute('data-preview-time'),'0.0000');assert.notEqual(await idle.getAttribute('data-pose'),'Swing');
 const canvas=viewport.locator('canvas'),box=await canvas.boundingBox(),x=box.x+box.width*.5,y=box.y+box.height*.45;
 const before=await viewport.getAttribute('data-camera');await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+75,y+25,{steps:10});await page.mouse.up();await page.waitForTimeout(300);assert.notEqual(await viewport.getAttribute('data-camera'),before,'left drag orbits while paused');
 const target=await viewport.getAttribute('data-camera-target');await page.mouse.move(x,y);await page.mouse.down({button:'right'});await page.mouse.move(x+45,y+15,{steps:8});await page.mouse.up({button:'right'});await page.waitForTimeout(300);assert.notEqual(await viewport.getAttribute('data-camera-target'),target,'right drag pans');
 const distance=()=>viewport.evaluate(e=>{const p=e.dataset.camera.split(',').map(Number),t=e.dataset.cameraTarget.split(',').map(Number);return Math.hypot(...p.map((x,i)=>x-t[i]));});const preZoom=await distance();await page.mouse.wheel(0,-160);await page.waitForTimeout(300);assert(Math.abs(await distance()-preZoom)<.01,'wheel must not change camera distance');
 assert.equal(await idle.getAttribute('data-camera'),idleCamera,'attack camera does not rotate idle model');
 await page.getByRole('button',{name:'View attack from top'}).click();await page.getByRole('button',{name:'Play weapon animation'}).click();
 await page.waitForFunction(()=>Number(document.querySelector('[data-preview-mode=attack] .championViewport')?.dataset.activeHitboxes)>0);
 await page.getByRole('button',{name:'Pause weapon animation'}).click();
 assert.equal(await page.getByRole('meter',{name:'Maximum health',exact:true}).getAttribute('aria-valuenow'),'220');
 assert.equal(await page.getByRole('meter',{name:'Maximum stamina',exact:true}).getAttribute('aria-valuenow'),'115');
 assert.equal(await page.locator('#__next').evaluate(e=>e.inert),true);
 await page.screenshot({path:path.join(out,'champion-preview-desktop.png')});
 await page.getByRole('button',{name:'View champion from back'}).click();await page.waitForTimeout(300);await page.screenshot({path:path.join(out,'champion-preview-back.png')});
 await page.getByRole('button',{name:'View champion from front'}).click();
 await page.getByRole('tab',{name:'All stats',exact:true}).click();assert.equal(await page.getByRole('meter').count(),25);
 await page.getByRole('tab',{name:'Trait abilities'}).click();await page.getByText('Marrow Ward',{exact:true}).waitFor();await page.getByText('Travel Ready',{exact:true}).waitFor();await page.waitForFunction(()=>{const i=document.querySelector('.championTraitImage');return i?.complete&&i.naturalWidth>0},{},{timeout:15000});await page.screenshot({path:path.join(out,'champion-preview-abilities.png')});
 assert.equal(await page.locator('.championTraitImage').count(),7);for(const src of await page.locator('.championTraitImage').evaluateAll(images=>images.map(i=>i.getAttribute('src'))))assert((await page.request.get('http://127.0.0.1:8813'+src)).ok());
 await page.getByRole('tab',{name:'Overview',exact:true}).click();
 assert.match(await page.locator('.championStatContributions').first().innerText(),/Leather Garb/);
 const firstSpell=page.locator('.championSpellChoice').first();assert.match(await firstSpell.innerText(),/Fire Magic/);assert.equal(await firstSpell.getAttribute('aria-pressed'),'true');assert.equal(await page.locator('[data-selected-spell]').getAttribute('data-selected-spell'),'fire_magic');
 await page.getByRole('button',{name:'Preview Fire Magic animation',exact:true}).click();const traitSpellView=page.locator('[data-preview-mode=spell] .championViewport');await traitSpellView.scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('[data-preview-mode=spell] .championViewport')?.dataset.spell==='fire_magic'&&Number(document.querySelector('[data-preview-mode=spell] .championViewport')?.dataset.activeHitboxes)>0,null,{timeout:120000});await page.screenshot({path:path.join(out,'champion-preview-selected-trait-magic.png')});await page.getByRole('button',{name:'Hide Fire Magic animation',exact:true}).click();
 await page.getByRole('button',{name:/Renewing Light.*Heal yourself/i}).click();assert.equal(await page.locator('[data-selected-spell]').getAttribute('data-selected-spell'),'renewing_light');
 await page.getByRole('button',{name:'Preview Renewing Light animation',exact:true}).click();
 const spellView=page.locator('[data-preview-mode=spell] .championViewport');await spellView.scrollIntoViewIfNeeded();await page.waitForFunction(()=>Number(document.querySelector('[data-preview-mode=spell] .championViewport')?.dataset.previewTime)>.5,{},{timeout:120000});
 assert.equal(await page.locator('[data-preview-mode=spell] [role=alert]').count(),0);await page.screenshot({path:path.join(out,'champion-preview-heal.png')});
 await page.getByRole('button',{name:/Frost Spark.*frost projectile/i}).click();await spellView.scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('[data-preview-mode=spell] .championViewport')?.dataset.spell==='frost_spark'&&Number(document.querySelector('[data-preview-mode=spell] .championViewport')?.dataset.activeHitboxes)>0,{},{timeout:120000});
 await page.screenshot({path:path.join(out,'champion-preview-frost.png')});
 await page.getByRole('button',{name:'Hide Frost Spark animation',exact:true}).click();
 await page.getByRole('button',{name:/Ironbloom.*Heal yourself/i}).click();assert.equal(await page.getByRole('button',{name:/Ironbloom.*Heal yourself/i}).getAttribute('aria-pressed'),'true');
 await enter.click();await page.getByRole('alert').filter({hasText:'room is full'}).waitFor();assert.equal(requests.length,1);assert.deepEqual(requests[0],{op:'join',assetId:1001,address:'fixture-address',baselineSpell:'ironbloom',skills:{}});
 await page.getByRole('button',{name:'Close champion preview'}).click();assert.equal(await page.locator('#__next').evaluate(e=>e.inert),false);assert.equal(await page.getByRole('button',{name:'Preview '+champion.name,exact:true}).evaluate(e=>e===document.activeElement),true);
 await page.getByRole('button',{name:'Preview '+champion.name,exact:true}).click();await enter.waitFor({timeout:120000});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(250);await page.screenshot({path:path.join(out,'champion-preview-mobile.png')});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow on mobile');
 await viewport.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'champion-preview-mobile-attack.png')});
 await page.getByRole('tab',{name:'Trait abilities'}).click();await page.getByText('Marrow Ward',{exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'champion-preview-mobile-abilities.png')});
 await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'detached'});assert.equal(await page.getByRole('dialog').count(),0);
 failPreview=true;await page.getByRole('button',{name:'Preview '+champion.name,exact:true}).click();await page.getByText('Fixture metadata unavailable').waitFor();failPreview=false;await page.getByRole('button',{name:'Try again'}).click();await enter.waitFor({timeout:120000});await page.keyboard.press('Escape');
 failModel=true;await page.getByRole('button',{name:'Preview '+champion.name,exact:true}).click();await page.locator('[data-preview-mode=idle]').getByRole('button',{name:'Reload model'}).waitFor({timeout:120000});assert(await page.getByRole('button',{name:'Preparing 3D champion…'}).isDisabled());failModel=false;await page.locator('[data-preview-mode=idle]').getByRole('button',{name:'Reload model'}).click();await enter.waitFor({timeout:120000});await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Preview '+bare.name,exact:true}).click();await enter.waitFor({timeout:120000});assert.equal(await page.locator('[data-selected-spell]').getAttribute('data-selected-spell'),'renewing_light');assert.equal(await page.locator('.championSpellChoice').first().getAttribute('aria-pressed'),'true');assert.equal(await page.getByText('No magic equipped',{exact:true}).count(),0);await page.getByRole('button',{name:/Ember Burst.*Mark a circle/i}).click();assert.equal(await page.locator('[data-selected-spell]').getAttribute('data-selected-spell'),'ember_burst');assert.match(await page.locator('[data-selected-spell]').innerText(),/Area radius/);await page.waitForFunction(()=>document.querySelector('[data-preview-mode=attack] .championViewport')?.dataset.championId==='1002');assert.equal(await viewport.getAttribute('data-weapon'),'unarmed');assert.equal(await viewport.getAttribute('data-champion-id'),'1002');failJoin=false;await enter.click();await page.getByRole('heading',{name:'Entered fixture arena: '+bare.name,exact:true}).waitFor();assert.equal(requests.length,2);assert.equal(requests[1].assetId,1002);assert.equal(requests[1].baselineSpell,'ember_burst');
 await page.getByRole('button',{name:'Exit fixture arena'}).click();await page.getByRole('button',{name:'Preview '+champion.name,exact:true}).click();await enter.waitFor({timeout:120000});assert.equal(await page.locator('.championSpellChoice').first().getAttribute('aria-pressed'),'true');await enter.click();await page.getByRole('heading',{name:'Entered fixture arena: '+champion.name,exact:true}).waitFor();assert.equal(requests[2].baselineSpell,'renewing_light');await page.getByRole('button',{name:'Exit fixture arena'}).click();await page.getByRole('button',{name:'Preview '+champion.name,exact:true}).click();await page.evaluate(()=>window.disconnectWallet());await page.getByRole('heading',{name:'Connect your wallet to enter.'}).waitFor();await page.getByRole('dialog').waitFor({state:'detached'});assert.equal(await page.getByRole('dialog').count(),0);
 assert.deepEqual(errors,[]);console.log('PASS preview: both selected-champion models; idle stays idle; live attacks and hitboxes; independent cameras; stats; all 25 bars; perks; orbit/pan with wheel zoom disabled; mobile; focus restore; Escape; metadata/model/entry retries; no premature entry; unsigned join; empty slots; wallet disconnect.');
 fs.writeFileSync(path.join(out,'champion-preview-validation.json'),JSON.stringify({passed:true,errors,joinRequests:requests},null,2));
})().catch(async e=>{console.error(e);if(page){console.log((await page.locator('body').innerText()).slice(-2500));await page.screenshot({path:path.join(out,'champion-preview-error.png')}).catch(()=>{});}process.exitCode=1;}).finally(async()=>{await browser?.close();server?.close();});
