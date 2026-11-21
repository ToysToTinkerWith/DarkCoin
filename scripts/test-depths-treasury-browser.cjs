const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const base=process.argv[2]||'http://127.0.0.1:8892';
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1365,height:950}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  for(const route of ['/arena/depths','/arena/fight']){
   await page.goto(base+route);assert.equal(new URL(page.url()).pathname,'/arena');
   await page.locator('a[href="/arena/armory"]').first().waitFor();
   assert.equal(await page.locator('a[href="/arena/depths"], a[href="/arena/fight"]').count(),0);
  }
  const response=await page.request.post(base+'/api/arena/claimDepthsReward',{data:{action:'grantDarkCoin'}});
  assert.equal(response.status(),400);assert.match((await response.json()).error,/runId and runToken/);
  const old=await page.request.post(base+'/api/arena/claimDepthsReward',{data:{action:'recordDarkCoinClaim'}});assert.equal(old.status(),410);
  assert.deepEqual(errors,[]);
  console.log('PASS retired page redirects, Arena navigation, missing proof rejection, retired claim rejection, no browser exceptions.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
