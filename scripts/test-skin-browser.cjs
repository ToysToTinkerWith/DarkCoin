const path=require('path'),fs=require('fs'),assert=require('assert');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/champion-skins-v60/browser');fs.mkdirSync(out,{recursive:true});
const {chromium}=require(path.join(root,'tmp/playground-qa/node_modules/playwright'));
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-swiftshader']});try{
 const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().includes('/arena/playground'))errors.push(r.status()+' '+r.url());});
 await page.goto('http://127.0.0.1:3011/arena/playground/skin-preview.html');const frame=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const loaded=async()=>{await page.waitForFunction(()=>document.querySelector('#skin').options.length>0&&!document.querySelector('#skin').disabled&&document.querySelector('#status').hidden,null,{timeout:120000});await frame();};await loaded();
 const all=await page.locator('#skin option').evaluateAll(os=>os.map(o=>o.value)),requested=process.argv.slice(2),ids=requested.length?all.filter(i=>requested.includes(i)):all;
 for(const id of ids){await page.selectOption('#skin',id);await loaded();
  for(const v of ['front','quarter','side','back']){await page.click('[data-view="'+v+'"]');await frame();await page.locator('#stage').screenshot({path:path.join(out,id+'-'+v+'.png')});}
  await page.click('[data-view="quarter"]');await page.check('#detail');await frame();await page.locator('#stage').screenshot({path:path.join(out,id+'-detail.png')});await page.uncheck('#detail');
  await page.check('#equipment');await loaded();await page.locator('#stage').screenshot({path:path.join(out,id+'-equipped.png')});
  await page.selectOption('#motion','Run');await page.click('#draw');await frame();await page.click('#attack');await frame();await page.selectOption('#motion','Idle');await page.uncheck('#equipment');await loaded();console.log('PASS',id);
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify({ids,errors,views:6},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
