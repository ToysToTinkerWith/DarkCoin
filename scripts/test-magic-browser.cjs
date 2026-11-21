const path=require('path'),fs=require('fs'),assert=require('assert');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/champion-magic-v58/browser');fs.mkdirSync(out,{recursive:true});
const {chromium}=require(path.join(root,'tmp/playground-qa/node_modules/playwright'));
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().includes('/arena/playground'))errors.push(r.status()+' '+r.url());});
 await page.goto('http://127.0.0.1:3011/arena/playground/magic-preview.html');
 const loaded=async()=>{await page.waitForFunction(()=>document.querySelector('#magic').options.length===7&&!document.querySelector('#magic').disabled&&document.querySelector('#status').hidden,{},{timeout:120000});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));};await loaded();
 const requested=process.argv.slice(2);const all=await page.locator('#magic option').evaluateAll(options=>options.map(o=>o.value));const ids=requested.length?all.filter(id=>requested.includes(id)):all;
 for(const id of ids){
   await page.selectOption('#magic',id);await loaded();
   for(const view of ['front','quarter','side','back']){
     await page.click('[data-view="'+view+'"]');await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
     await page.locator('#stage').screenshot({path:path.join(out,id+'-'+view+'.png')});
   }
   await page.click('[data-view="quarter"]');await page.click('#isolate');await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await page.locator('#stage').screenshot({path:path.join(out,id+'-detail.png')});await page.click('#isolate');
   await page.check('#walk');await page.waitForFunction(()=>document.querySelector('#walk').checked);await page.uncheck('#walk');console.log('PASS browser',id);
 }
 await page.selectOption('#magic','fire_magic');await loaded();await page.click('[data-view="quarter"]');await page.screenshot({path:path.join(out,'magic-preview-desktop.png')});
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));assert(await page.locator('canvas').isVisible());await page.screenshot({path:path.join(out,'magic-preview-mobile.png'),fullPage:true});
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,requested.length?'browser-validation-'+requested.join('-')+'.json':'browser-validation.json'),JSON.stringify({traits:ids,views:['front','quarter','side','back'],errors},null,2));await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1});
