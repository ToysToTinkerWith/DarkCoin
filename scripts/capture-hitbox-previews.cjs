const fs=require('fs'),path=require('path'),http=require('http'),assert=require('node:assert/strict');
const {chromium}=require('../tmp/playground-qa/node_modules/playwright');
const root=path.resolve(__dirname,'..'),publicDir=path.join(root,'public'),out=path.join(publicDir,'arena/playground/attack-review');
const allIds=JSON.parse(fs.readFileSync(path.join(out,'analysis.json'),'utf8')).measurements.map(r=>r.id);
const requested=process.argv.find(a=>a.startsWith('--weapons='))?.slice(10).split(',');
const ids=requested||allIds;for(const id of ids)assert(allIds.includes(id),'Unknown weapon '+id);
const mime={'.html':'text/html','.js':'application/javascript','.json':'application/json','.glb':'model/gltf-binary','.jpg':'image/jpeg','.mp4':'video/mp4','.md':'text/plain; charset=utf-8'};
const server=http.createServer((req,res)=>{const p=path.resolve(publicDir,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!p.startsWith(publicDir+path.sep)){res.writeHead(403);return res.end();}fs.stat(p,(e,s)=>{if(e||!s.isFile()){res.writeHead(404);return res.end();}res.setHeader('Content-Type',mime[path.extname(p)]||'application/octet-stream');fs.createReadStream(p).pipe(res);});});
(async()=>{await new Promise(r=>server.listen(8840,'127.0.0.1',r));const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox']});
try{const page=await browser.newPage({viewport:{width:1400,height:1030}}),errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:8840/arena/playground/hitbox-preview.html');await page.waitForFunction(()=>window.hitboxPreview?.ready(),null,{timeout:180000});
 for(const id of ids){await page.evaluate(id=>window.hitboxPreview.choose(id),id);const a=await page.evaluate(()=>window.hitboxPreview.analysis());let error=0;
  for(const phase of [.2,.237,.35,.413,.5,.65,.8])error=Math.max(error,await page.evaluate(p=>window.hitboxPreview.socketError(p),phase));
  // Baked interpolation is approximate between the 121 original samples.
  assert(error<.015,`${id} rendered socket deviates ${error}m from authoritative path`);
  const seconds=a.projectile?a.releaseSeconds+.10:(a.strikes[0].startSeconds+a.strikes[0].endSeconds)/2;
  const state=await page.evaluate(t=>window.hitboxPreview.seek(t),seconds);assert(state.active>0,id+' active overlay absent');
  if(a.projectile)assert(Math.abs(state.projectile.z-(a.origin[2]+.1*a.projectile.speedMps))<1e-6,id+' projectile disagrees with server speed');
  await page.locator('#stage').screenshot({path:path.join(out,id+'.jpg'),type:'jpeg',quality:88});
  const data=await page.evaluate(()=>window.hitboxPreview.record());fs.writeFileSync(path.join(out,id+'.mp4'),Buffer.from(data,'base64'));
  results.push({id,maxSocketErrorM:error,active:state.active,videoBytes:fs.statSync(path.join(out,id+'.mp4')).size});console.log(id,'PASS',error.toFixed(5)+'m');
 }
 assert.deepEqual(errors,[]);await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:8840/arena/playground/attack-review/index.html');assert.equal(await page.locator('video').count(),allIds.length);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify({passed:true,results,errors,mobileGallery:true},null,2));
}finally{await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
