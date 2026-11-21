// Run after `npm run build` and `npm run start -- -p 8885`.
// Exercises real Next production chunks, including browser-target transforms.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const base=process.argv[2]||'http://127.0.0.1:8885';
const liveData=process.argv.includes('--live-data');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  // Fixture only the API, never the application code or 3D components.
  if(!liveData)await page.route('**/api/arena/loot-preview*',route=>route.fulfill({json:{enabled:true,asOf:Date.now(),assets:[{id:1088771340,name:'Dark Coin',unitName:'DARK',kind:'token',decimals:6,available:'123456123456',selectionChance:1,minimum:'1000000',maximum:'123456123456',tiers:[{percent:.025,chance:.6,amount:'30864030',payable:true},{percent:.125,chance:.25,amount:'154320154',payable:true},{percent:.25,chance:.1,amount:'308640308',payable:true},{percent:1.25,chance:.04,amount:'1543201543',payable:true},{percent:2.5,chance:.01,amount:'3086403086',payable:true}]}]}}));
  const inventoryResponse=page.waitForResponse(r=>r.url().includes('/api/arena/loot-preview')&&r.status()===200,{timeout:60000});
  await page.goto(base+'/arena/playtest',{waitUntil:'domcontentloaded'});
  assert.equal(await page.evaluate(()=>window.__NEXT_DATA__.buildId),fs.readFileSync('.next/BUILD_ID','utf8').trim());
  const inventory=await(await inventoryResponse).json(),dark=inventory.assets.find(a=>a.id===1088771340);
  assert(dark,'DARK inventory must be present for the BigInt regression check');
  const scale=BigInt('1'+'0'.repeat(dark.decimals||0));
  const display=n=>((BigInt(n)+scale-1n)/scale).toLocaleString('en-US');
  await page.getByText(display(dark.available)+' '+dark.unitName+' available',{exact:true}).waitFor({timeout:60000});
  const tiers=page.getByLabel(dark.name+' payout tiers');
  for(const t of dark.tiers)await tiers.getByText(display(t.amount)+' '+dark.unitName,{exact:true}).first().waitFor();
  await page.getByRole('button',{name:'Graveclaw Inspect +'}).click();
  await page.getByText('Claw sweep',{exact:true}).first().waitFor();
  assert.deepEqual(errors,[],'Production page must render without uncaught errors');
  console.log('PASS: real Next production page renders rounded DARK balance and all five payout tiers; expanded preview opens without runtime errors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
