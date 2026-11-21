const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),site='https://dark-coin.com';
async function read(url){const response=await fetch(new URL(url,site),{signal:AbortSignal.timeout(60000)});assert(response.ok,`Unavailable: ${url}`);return response.text();}
(async()=>{
 const html=await read('/arena/armory');
 const data=JSON.parse(html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)[1]);
 assert.equal(data.buildId,fs.readFileSync(path.join(root,'.next/BUILD_ID'),'utf8').trim());
 const scripts=[...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m=>m[1]);
 const source=(await Promise.all(scripts.filter(s=>s.includes('/_next/')).map(read))).join('\n');
 for(const marker of ['Show Arena stats (3D)','Hide Arena stats (3D)','armouryTraitEffects','armoury-character-preview','No champions were found','Connect your wallet','data-trait-swap-panel','darkcoin-effects'])assert(source.includes(marker),marker);
 assert(!source.includes('Show Chronicles build (2D)'));
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'.next/react-loadable-manifest.json'),'utf8'));
 const preview=Object.entries(manifest).find(([key])=>key.includes('Swapper.js -> ./ArmouryCharacterPreview'))?.[1];assert(preview);
 const previewSource=(await Promise.all(preview.files.map(file=>read('/_next/'+file)))).join('\n');
 for(const marker of ['Unsaved trait selections are not yet equipped in Arena.','All stats','Trait abilities','championStatContributions','championAttackPreview','armouryBuildPanel'])assert(previewSource.includes(marker),marker);
 assert(!Object.keys(manifest).some(key=>key.includes('Swapper.js -> ./LegacyChampionBuilder')));
 const renderer=Object.entries(manifest).find(([key])=>key.includes('ArmouryCharacterPreview.js ->'))?.[1];assert(renderer);
 const rendererSource=(await Promise.all(renderer.files.map(file=>read('/_next/'+file)))).join('\n');
 for(const marker of ['IDLE PREVIEW','activeHitboxes'])assert(rendererSource.includes(marker),marker);
 const css=(await Promise.all([...html.matchAll(/<link[^>]+href="([^"]+\.css)"/g)].map(m=>read(m[1])))).join('\n');
 for(const marker of ['.armouryObjectToggle','.armouryPreviewModels','.armouryBuildPanel','.armouryPrimary','.armouryPageHeader','.armouryGenerationProgress'])assert(css.includes(marker),marker);
 const names=JSON.parse(await read('/api/arena/champion-name?ids=77'));assert(names.names&&typeof names.names==='object');
 const classicNames=JSON.parse(await read('/api/arena/champion-name?ids=77&game=2d'));assert(classicNames.names&&typeof classicNames.names==='object');
 for(const body of [{op:'prepare'},{op:'queue',requestId:'invalid'}]){
  const response=await fetch(site+'/api/arena/legacy-generation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(60000)});
  assert.equal(response.status,400,'Generation enabled and invalid requests rejected');assert((await response.json()).error);
 }
 console.log('PASS: production build, separate game panels and names, 10,000 DARK draft generator, payment API validation, original attack preview, and responsive styles. No wallet connected, transactions signed, or generation jobs created.');
})().catch(error=>{console.error(error);process.exitCode=1;});
