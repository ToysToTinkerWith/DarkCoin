const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const site=process.env.WEAPON_VIEWER_URL||'http://127.0.0.1:8850',out=path.resolve(__dirname,'../tmp/weapon-viewer-qa');fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(site+'/arena/weapons?weapon=dragon_longsword',{waitUntil:'domcontentloaded'});
 const select=page.getByLabel('Weapon · 22 options');await select.waitFor({timeout:60000});
 const loaded=async id=>{await page.waitForFunction(id=>document.querySelector('.championViewport')?.dataset.weapon===id&&!document.querySelector('.championModelStatus'),id,{timeout:120000});await page.locator('.championViewport').scrollIntoViewIfNeeded();};
 await loaded('dragon_longsword');assert.equal(await page.getByLabel('Playback speed').inputValue(),'0.65');
 const options=await select.locator('option').evaluateAll(nodes=>nodes.map(n=>({id:n.value,name:n.textContent})));
 assert.equal(options.length,22);
 const tested=process.env.WEAPON_VIEWER_SMOKE?options.filter(w=>['scythe','dragon_staff','dual_katana','unarmed'].includes(w.id)):options;
 for(const {id,name} of tested){
  await select.selectOption(id);await loaded(id);assert((await page.locator('main').innerText()).includes(name));
  await page.waitForFunction(()=>Number(document.querySelector('.championViewport')?.dataset.activeHitboxes)>0,null,{timeout:15000});
  assert.equal(await page.locator('[data-attack-card]').count(),1);
  assert.equal(await page.getByRole('button',{name:'Second attack',exact:true}).count(),0);
  assert.equal(await page.getByRole('button',{name:'Full combo',exact:true}).count(),0);
  assert.equal(await page.locator('.championViewport').getAttribute('data-combo-step'),'0');
  console.log('PASS weapon preview:',id);
 }
 await select.selectOption('dragon_longsword');await loaded('dragon_longsword');
 const first=page.locator('[data-attack-card=first]');assert((await first.innerText()).includes('4d6+17'));assert((await first.innerText()).includes('45% per hit'));
 await page.getByRole('button',{name:'Pause',exact:true}).click();await page.waitForTimeout(150);const time=await page.locator('.championViewport').getAttribute('data-preview-time');await page.waitForTimeout(250);assert.equal(await page.locator('.championViewport').getAttribute('data-preview-time'),time);
 await page.getByRole('button',{name:'Replay',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.championViewport')?.dataset.previewTime==='0.0000');
 const viewport=page.locator('.championViewport'),before=await viewport.getAttribute('data-camera'),r=await viewport.boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.mouse.move(r.x+r.width*.8,r.y+r.height*.6,{steps:10});await page.mouse.up();await page.waitForTimeout(300);assert.notEqual(await viewport.getAttribute('data-camera'),before);
 await page.getByRole('button',{name:'View attack from top',exact:true}).click();await page.getByRole('button',{name:'Play',exact:true}).click();
 await page.waitForFunction(()=>Number(document.querySelector('.championViewport')?.dataset.activeHitboxes)>0);
 await page.screenshot({path:path.join(out,'desktop.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(out,'mobile.png'),fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 assert.deepEqual(errors,[]);console.log(`PASS ${tested.length} weapon original animations and hitboxes, damage/effects, no follow-ups, playback controls, orbit, mobile layout.`);
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
