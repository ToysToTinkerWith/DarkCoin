const http=require('http'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');const root=path.resolve(__dirname,'../public'),out=path.resolve(__dirname,'../output/cindermaw');
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.glb')?'model/gltf-binary':file.endsWith('.json')?'application/json':'text/html');fs.createReadStream(file).pipe(res);});
(async()=>{await new Promise(r=>server.listen(8847,'127.0.0.1',r));const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});try{
 const page=await browser.newPage({viewport:{width:1600,height:1080}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:8847/arena/playground/dragon-preview.html');await page.waitForFunction(()=>window.dragonPreview,null,{timeout:30000});
 for(const view of ['quarter','front','side','back','top']){await page.evaluate(view=>{dragonPreview.select('Idle',0,false);dragonPreview.view(view);},view);await page.waitForTimeout(180);await page.screenshot({path:path.join(out,view+'.png')});}
 for(const [clip,t] of [['Walk',.2],['Run',.2],['TailSweep',.30],['TailSweep',.52],['TailSweep',.65],['FlameBreath',.2],['FlameBreath',.5],['Bite',.40],['Death',.95]]){await page.evaluate(({clip,t})=>{dragonPreview.select(clip,t,false);dragonPreview.view('quarter');},{clip,t});await page.waitForTimeout(150);await page.screenshot({path:path.join(out,clip+'-'+t+'.png')});}
 const result=await page.evaluate(()=>{
  const d=dragonPreview.dragon,info={bones:0,vertices:0,triangles:0,clips:d.clips.map(c=>c.name),maxSocketError:0};
  d.model.traverse(o=>{if(o.isSkinnedMesh){info.bones=Math.max(info.bones,o.skeleton.bones.length);info.vertices+=o.geometry.attributes.position.count;info.triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;}});
  for(const clip of info.clips)for(let i=0;i<=60;i++){
   d.sample(clip,i/60);d.actor.updateMatrixWorld(true);const expected=dragonPreview.sockets(clip,i/60);
   for(const [name,key] of [['FlameMuzzle','mouth'],['TailImpact','tail']]){const socket=d.model.getObjectByName(name),p=socket.position.clone();socket.getWorldPosition(p);d.actor.worldToLocal(p);info.maxSocketError=Math.max(info.maxSocketError,Math.hypot(...expected[key].map((n,k)=>n-p.toArray()[k])));}
  }return info;
 });
 assert.equal(result.clips.length,7);assert(result.bones>=40);assert(result.maxSocketError<.06,JSON.stringify(result));assert.deepEqual(errors,[]);
 await page.locator('#speed').click();await page.locator('#joints').click();assert(await page.locator('#joints').evaluate(b=>b.classList.contains('active')));
 fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify({passed:true,...result},null,2));console.log(JSON.stringify({passed:true,...result}));
 }finally{await browser.close();if(!process.argv.includes('--serve'))await new Promise(r=>server.close(r));else console.log('Dragon preview: http://127.0.0.1:8847/arena/playground/dragon-preview.html');}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
