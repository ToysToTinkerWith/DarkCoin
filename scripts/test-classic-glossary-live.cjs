const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const base=process.argv[2]||'https://dark-coin.com';
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/arena/depths');
  await page.waitForFunction(()=>CSS.highlights.has('darkcoin-effects'),{},{timeout:60000});
  assert.equal(await page.evaluate(()=>JSON.parse(document.querySelector('#__NEXT_DATA__').textContent).buildId),fs.readFileSync('.next/BUILD_ID','utf8').trim());
  // A temporary local DOM probe checks the deployed global scanner without
  // connecting a wallet, opening a paid run, or changing any server data.
  await page.evaluate(()=>{const p=document.createElement('p');p.id='classic-glossary-probe';p.textContent='Doom potency';p.style='position:fixed;top:220px;left:40px;z-index:99999;background:#111;color:white;padding:12px;font:20px sans-serif';document.body.append(p);});
  for(const [word,expected] of [['Doom','-0.4 resist per stack'],['potency','adds more Doom stacks']]){
   await page.waitForFunction(word=>[...CSS.highlights.get('darkcoin-effects')].some(r=>r.startContainer.parentElement.id==='classic-glossary-probe'&&r.toString()===word),word);
   const pos=await page.evaluate(word=>{const r=[...CSS.highlights.get('darkcoin-effects')].find(r=>r.startContainer.parentElement.id==='classic-glossary-probe'&&r.toString()===word),b=r.getBoundingClientRect();return{x:b.x+b.width/2,y:b.y+b.height/2};},word);
   await page.mouse.move(pos.x,pos.y);await page.locator('[data-effect-tooltip]').filter({hasText:expected}).waitFor();
   assert.doesNotMatch(await page.locator('[data-effect-tooltip]').innerText(),/3D|Playtest|refresh.*duration/i);
  }
  await page.evaluate(()=>document.getElementById('classic-glossary-probe').remove());
  assert.deepEqual(errors,[]);console.log('PASS deployed build, Depths Doom and potency use original 2D rules, no browser exceptions.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
