const fs=require('fs'),assert=require('node:assert/strict'),{chromium}=require('../tmp/playground-qa/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('https://dark-coin.com/arena/playground',{waitUntil:'domcontentloaded',timeout:60000});
  await page.getByRole('heading',{name:'The proving ground',exact:true}).waitFor({timeout:60000});
  await page.getByText('Connect your wallet to enter.',{exact:true}).waitFor();
  assert.equal(await page.getByRole('heading',{name:'Temporarily closed',exact:true}).count(),0);
  await page.locator('.walletFixedShell.ready').waitFor({timeout:30000});
  const expectedBuild=fs.readFileSync('.next/BUILD_ID','utf8').trim();assert.equal(await page.evaluate(()=>window.__NEXT_DATA__.buildId),expectedBuild);
  await page.screenshot({path:'output/playground/production-open-lobby.png'});
  await page.goto('https://dark-coin.com/arena',{waitUntil:'domcontentloaded'});
  await page.locator('a[href="/arena/playground"]').waitFor({timeout:30000});
  assert.equal(await page.locator('.arenaAppCard').count(),4);
  const bad=await page.request.post('https://dark-coin.com/api/arena/combat',{data:{op:'join'}});assert.equal(bad.status(),400);assert.notEqual((await bad.json()).code,'PLAYGROUND_PAUSED');
  const join=await page.request.post('https://dark-coin.com/api/arena/combat',{data:{op:'join',assetId:1559026255,address:'C5AN3H22ATPXVEPQILQQYPZWBXPI3E7OH4QSCKW7KWVIJXPG3KBN6WCSZ4'}});assert.equal(join.status(),200);const {session}=await join.json();assert.equal(session.transport,'websocket');
  const connected=await page.evaluate(session=>new Promise((resolve,reject)=>{
   const ws=new WebSocket(session.url);let playerId;const timer=setTimeout(()=>{ws.close();reject(Error('Admission connection timed out'));},15000);
   ws.onopen=()=>ws.send(JSON.stringify({type:'hello',ticket:session.ticket}));
   ws.onmessage=({data})=>{const m=JSON.parse(data);if(m.type==='welcome')playerId=m.playerId;if(m.type==='fatal'){clearTimeout(timer);ws.close();reject(Error(m.message));}if(m.type==='state'&&playerId){clearTimeout(timer);ws.send(JSON.stringify({type:'leave'}));ws.close();resolve({welcomed:true,dummy:m.dummy?.id,capacity:8});}};
   ws.onerror=()=>{clearTimeout(timer);ws.close();reject(Error('WebSocket connection failed'));};
  }),session);
  assert.equal(connected.dummy,'training-dummy');assert.deepEqual(errors,[]);
  fs.writeFileSync('output/playground/production-open-validation.json',JSON.stringify({at:new Date().toISOString(),passed:true,build:expectedBuild,checks:['public lobby open','Arena link restored','wallet control visible','invalid entry remains rejected','verified NFT admission accepted','production WebSocket welcome with center dummy'],connected,errors,scope:'Existing public NFT ownership fixture used for brief admission then immediately left. No wallet signing or chain transaction.'},null,2));
  console.log('PASS public production lobby, restored Arena link, verified NFT admission and live dummy session.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
