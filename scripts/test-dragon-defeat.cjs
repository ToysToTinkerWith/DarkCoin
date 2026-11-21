const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const out=path.resolve(__dirname,'../output/cindermaw');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1600,height:1080}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8847/arena/playground/dragon-preview.html?clip=Death');
  await page.waitForFunction(()=>window.dragonPreview);
  const report=await page.evaluate(()=>{
   const d=dragonPreview.dragon,meshes=[];
   d.model.traverse(m=>{if(m.isSkinnedMesh)meshes.push(m);});
   let minY=Infinity,worstFrame=0,worstMesh='';
   // Test actual deformed vertices of the exported/refined GLB, not just bones.
   for(let frame=0;frame<=132;frame++){
    d.sample('Death',frame/132);d.actor.updateMatrixWorld(true);
    for(const mesh of meshes){
     mesh.skeleton.update();const point=mesh.position.clone();
     for(let i=0;i<mesh.geometry.attributes.position.count;i++){
      mesh.getVertexPosition(i,point);mesh.localToWorld(point);
      if(point.y<minY){minY=point.y;worstFrame=frame;worstMesh=mesh.name;}
     }
    }
   }
   return {frames:133,minY,worstFrame,worstMesh};
  });
  fs.writeFileSync(path.join(out,'defeat-validation.json'),JSON.stringify(report,null,2));
  for(const view of ['quarter','front','side','back','top']){
   await page.evaluate(view=>{dragonPreview.select('Death',1,false);dragonPreview.view(view);},view);
   await page.waitForTimeout(120);await page.screenshot({path:path.join(out,'defeat-'+view+'.png')});
  }
  for(const t of [.18,.35,.5,.65]){
   await page.evaluate(t=>{dragonPreview.select('Death',t,false);dragonPreview.view('quarter');},t);
   await page.waitForTimeout(120);await page.screenshot({path:path.join(out,'defeat-'+t+'.png')});
  }
  await page.evaluate(()=>dragonPreview.select('Death',.99,true));
  await page.waitForTimeout(250);
  assert.equal(await page.locator('#pause').textContent(),'Replay');
  assert.equal(await page.locator('#scrub').inputValue(),'1000');
  await page.locator('#pause').click();
  assert.equal(await page.locator('#pause').textContent(),'Pause');
  assert.deepEqual(errors,[]);
  assert(report.minY>=-.008,JSON.stringify(report));
  console.log(JSON.stringify({passed:true,...report}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
