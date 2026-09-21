const fs=require('fs'),path=require('path'),http=require('http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),qa=path.join(root,'tmp/playground-qa'),out=path.join(root,'output/playground');
const esbuild=require('../tmp/champion-model-tools/node_modules/esbuild'),{chromium}=require('../tmp/playground-qa/node_modules/playwright');
const {CHAMPION_CREATOR}=require('../lib/playground');
let server,browser,page;
(async()=>{
 const champion={id:1001,name:'Champion preview fixture',loadout:{skin:'Undead',head:'bone',armour:'leather_garb',weapon:'dragon_longsword',magic:'fire_magic',extra:'golden_feathers',background:'dawn_background'}};
 const bare={id:1002,name:'Unequipped preview fixture',loadout:{skin:'Light Skin',head:null,armour:null,weapon:null,magic:null,extra:null,background:'noir_background'}};
 const requests=[],errors=[];let failJoin=true,failPreview=false,failModel=false;
 const plugins=[{name:'fixture-shell',setup(build){
  build.onResolve({filter:/^(next\/(head|link|dynamic)|@txnlab\/use-wallet-react)$|NftImage$|playground\/ArenaCanvas$/},a=>({path:a.path,namespace:'fixture'}));
  build.onLoad({filter:/.*/,namespace:'fixture'},a=>({loader:'jsx',resolveDir:root,contents:
   a.path==='next/head'?"export default ()=>null;":a.path==='next/link'?"export default ({children})=>children;":a.path==='next/dynamic'?"import React from 'react';export default (load,opts)=>{const C=React.lazy(load);return props=><React.Suspense fallback={opts.loading?.()||null}><C {...props}/></React.Suspense>};":
   a.path.includes('use-wallet')?"import React from 'react';export function useWallet(){const [activeAddress,set]=React.useState('fixture-address');React.useEffect(()=>{window.disconnectWallet=()=>set(null);},[]);return {activeAddress,signTransactions(){throw Error('Must never ask to sign');}}}":
   a.path.includes('NftImage')?"import React from 'react';export default ({alt})=><img src='/home/arena.png' alt={alt}/>;":
   "import React from 'react';export default ({champion,onExit})=><section><h2>Entered fixture arena: {champion.name}</h2><button onClick={onExit}>Exit fixture arena</button></section>;"
  }));
 }}];
 await esbuild.build({stdin:{contents:"import React from 'react';import {createRoot} from 'react-dom/client';import Page from './pages/arena/playground';createRoot(document.getElementById('__next')).render(<Page/>);",resolveDir:root,loader:'jsx'},bundle:true,outfile:path.join(qa,'preview-qa.js'),loader:{'.js':'jsx'},plugins,define:{'process.env.NODE_ENV':'"production"','process.env.NEXT_PUBLIC_ARENA_ENABLED':'"true"','process.env.NEXT_PUBLIC_ARENA_DEV':'"false"'}});
 server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');res.setHeader('Content-Type','application/json');
  if(url.pathname==='/api/getDcAssets')return res.end(JSON.stringify([champion,bare].map(c=>({amount:1,asset:{index:c.id,params:{name:c.name,creator:CHAMPION_CREATOR,total:1,url:''}}}))));
  if(url.pathname==='/api/arena/playground'){if(failPreview){res.statusCode=503;return res.end(JSON.stringify({error:'Fixture metadata unavailable'}));}return res.end(JSON.stringify(url.searchParams.get('assetId')==='1002'?bare:champion));}
  if(url.pathname==='/api/arena/combat'){let raw='';for await(const c of req)raw+=c;const body=JSON.parse(raw);requests.push(body);if(failJoin){res.statusCode=409;return res.end(JSON.stringify({error:'This practice room is full. Try again shortly.'}));}return res.end(JSON.stringify({champion:body.assetId===1002?bare:champion,session:{token:'fixture'}}));}
  if(url.pathname==='/'){res.setHeader('Content-Type','text/html');return res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/base.css"><link rel="stylesheet" href="/preview.css"></head><body style="margin:0;background:#050505;font-family:Arial"><div id="__next"></div><script src="/qa.js"></script></body></html>');}
  if(failModel&&url.pathname.endsWith('/body.glb')){res.statusCode=503;return res.end();}
  const file=url.pathname==='/qa.js'?path.join(qa,'preview-qa.js'):url.pathname==='/base.css'?path.join(root,'components/arena/playground/playground.css'):url.pathname==='/preview.css'?path.join(root,'components/arena/playground/champion-preview.css'):path.join(root,'public',decodeURIComponent(url.pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.statusCode=404;return res.end();}
  res.setHeader('Content-Type',({'.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.glb':'model/gltf-binary'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
 });await new Promise(r=>server.listen(8813,'127.0.0.1',r));
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 page=await browser.newPage({viewport:{width:1360,height:940}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8813/');await page.getByRole('button',{name:'Preview '+champion.name,exact:true}).click();
 const enter=page.getByRole('button',{name:'Enter playground'});await enter.waitFor({timeout:120000});assert.equal(requests.length,0,'inspection must not join');
 const spellView=page.locator('[data-preview-mode=spell] .championViewport');
 for(const [id,name] of [['renewing_light','Renewing Light'],['ironbloom','Ironbloom'],['arcane_dart','Arcane Dart'],['frost_spark','Frost Spark'],['ember_burst','Ember Burst']]){
  await page.getByRole('button',{name:new RegExp('^'+name+' ')}).click();
  if(id==='renewing_light')await page.getByRole('button',{name:'Preview '+name+' animation',exact:true}).click();
  await spellView.scrollIntoViewIfNeeded();
  await page.waitForFunction(id=>{const v=document.querySelector('[data-preview-mode=spell] .championViewport');return v?.dataset.spell===id&&Number(v.dataset.previewTime)>.65&&Number(v.dataset.previewTime)<.95},id,{timeout:120000});
  assert.equal(await page.locator('[data-preview-mode=spell] [role=alert]').count(),0);
  await page.screenshot({path:path.join(out,'baseline-spell-'+id+'.png')});
 }
 assert.deepEqual(errors,[]);assert.equal(requests.length,0);console.log('PASS all five selected-champion spell animation previews render without errors; no arena entry.');
 fs.writeFileSync(path.join(out,'baseline-spell-preview-validation.json'),JSON.stringify({passed:true,spells:5,errors,joinedArena:false},null,2));
})().catch(async e=>{console.error(e);if(page){console.log((await page.locator('body').innerText()).slice(-2500));await page.screenshot({path:path.join(out,'champion-preview-error.png')}).catch(()=>{});}process.exitCode=1;}).finally(async()=>{await browser?.close();server?.close();});
