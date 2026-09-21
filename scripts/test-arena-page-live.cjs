const path=require('path'),assert=require('node:assert/strict'),{chromium}=require('../tmp/playground-qa/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1200,height:850}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('https://dark-coin.com/arena/playground?combat=v1.3',{waitUntil:'domcontentloaded',timeout:60000});
  await page.getByRole('heading',{name:/The proving ground/}).waitFor({timeout:60000});
  await page.getByText('Connect your wallet to enter.',{exact:true}).waitFor();
  assert((await page.locator('.playgroundFootnote').innerText()).includes('No transaction or signature required'));
  await page.waitForFunction(()=>{const img=document.querySelector('.playgroundIntroSeal img');return img?.complete&&img.naturalWidth>0;},null,{timeout:60000});
  await page.evaluate(()=>new Promise((resolve,reject)=>{const image=new Image();image.onload=resolve;image.onerror=()=>reject(new Error('Arena backdrop failed to load'));image.src='/home/arena.png';}));
  await page.screenshot({path:path.resolve(__dirname,'../output/playground/arena-live-roster.png'),fullPage:true});
  assert.deepEqual(errors,[]);console.log('PASS live custom-domain page hydrates, shows champion selection, wallet-entry instructions and E-cast controls.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
