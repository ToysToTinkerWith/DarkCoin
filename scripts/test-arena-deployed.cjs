const assert=require('node:assert/strict');
(async()=>{
 const url='https://us-central1-dark-coin-dc4a3.cloudfunctions.net/arenaCombat';
 const get=await fetch(url);assert.equal(get.status,405);
 const start=Date.now();const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+'0'.repeat(64)},body:JSON.stringify({op:'input',input:{seq:1,x:0,z:0,yaw:0}})});
 assert.equal(response.status,401,await response.text());
 console.log('PASS deployed function serves requests, reaches Firestore and rejects an invalid session; warm request '+(Date.now()-start)+'ms.');
 const site=process.env.ARENA_TEST_SITE||'https://dark-coin.com',page=await fetch(site+'/arena/playground?combat=v1.3');assert.equal(page.status,200);const html=await page.text();
 const chunk=html.match(/src="([^"]*pages\/arena\/playground-[^"]+\.js)"/)?.[1];assert(chunk,'playground page chunk');
 const code=await fetch(new URL(chunk,site)).then(r=>r.text());assert(code.includes('No transaction or signature required')&&code.includes('Press E to cast equipped magic'),'updated champion selector is live');
 const routed=await fetch(site+'/api/arena/combat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({op:'input',input:{seq:1,x:0,z:0,yaw:0}})});assert.equal(routed.status,401);
 for(const asset of ['body.glb','weapons/dragon_longsword.glb','magic/fire_magic-rigged.glb']){const r=await fetch(site+'/arena/playground/assets/'+asset,{method:'HEAD'});assert.equal(r.status,200,asset);assert(!r.headers.get('content-type')?.includes('text/html'),asset);}
 console.log('PASS live playground, signature-free preview UI, same-origin combat route, body, weapon and magic assets.');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
