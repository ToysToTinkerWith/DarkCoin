const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..');
require('esbuild').buildSync({stdin:{contents:"export * from './lib/arena/depths-treasury'; export * from './lib/arena/direct-rewards'; export * from './lib/arena/wallet-rewards';",resolveDir:root},bundle:true,platform:'node',external:['algosdk'],outfile:path.join(root,'tmp/depths-treasury-tests.cjs')});
const s=require('../tmp/depths-treasury-tests.cjs'),config={appId:123,enabled:true};
function database(){
 const data=new Map();let queue=Promise.resolve();
 const ref=id=>({id:id.split('/').at(-1),path:id,get:async()=>snap(id)}),snap=id=>({id:ref(id).id,ref:ref(id),exists:data.has(id),data:()=>structuredClone(data.get(id))});
 return {data,collection:name=>({doc:id=>ref(name+'/'+id)}),runTransaction(fn){
  const task=queue.then(async()=>{const writes=[];let wrote=false;const tx={get:async r=>{assert(!wrote,'Firestore reads must precede writes');return snap(r.path);},set:(r,v)=>{wrote=true;writes.push([r.path,v]);},create:(r,v)=>{assert(!data.has(r.path),'must not overwrite');wrote=true;writes.push([r.path,v]);},update:(r,v)=>{assert(data.has(r.path));wrote=true;writes.push([r.path,{...data.get(r.path),...v}]);}};
   const result=await fn(tx);for(const [k,v]of writes)data.set(k,structuredClone(v));return result;
  });queue=task.catch(()=>{});return task;
 }};
}
function fixture(){
 const db=database(),runRef=db.collection('depthsRuns').doc('completed-run'),ledgerPath='arenaPrivate/'+s.directLedgerId(123);
 db.data.set(runRef.path,{status:'completed',serverRewardEligible:true,serverRewardProof:'proof',activeAddress:'wallet',championAssetId:42});
 db.data.set(ledgerPath,{reserved:{500:'200'},lastSequence:'17'});
 const item={rewardAssetId:500,available:'1000',capBps:10000,capAtomic:'0',name:'DARK',decimals:6};let rolls=0;
 const deps={verify:async()=>({version:3n}),inventory:async()=>[item],clock:()=>100};
 const eligible={runRef,championAssetId:42,walletAddress:'wallet',serverRewardProof:'proof'};
 const options={assetId:500,rollReward:available=>{rolls++;return {basisPoints:1000,amountAtomic:String(available/10n),amountDisplay:'unused',tierId:'test',contractBalanceAtomic:String(available)};},formatAmount:v=>String(v)};
 return {db,ledgerPath,item,deps,eligible,options,rolls:()=>rolls,reserve:()=>s.reserveDepthsReward(db,config,eligible,options,deps)};
}
test('Depths subtracts arena obligations, atomically reserves, and queues the existing direct-payment worker',async()=>{
 const f=fixture(),row=await f.reserve();assert.equal(row.claim.amount,'80');assert.equal(row.source,'depths');assert.equal(row.depthRoll.contractBalanceAtomic,'800');assert.equal(row.pickedUpAt,100);
 assert.equal(f.db.data.get(f.ledgerPath).reserved[500],'280');assert.equal(f.db.data.get(f.ledgerPath).lastSequence,'17');
 const id=f.db.data.get(f.eligible.runRef.path).serverDepthsRewardId;assert.match(id,/^loot-reward-123-4000000000000001-0$/);
 assert.equal(f.db.data.get('arenaPrivate/loot-jobs/jobs/'+id+'-depths').rewardId,id);
 assert.equal(s.subtractDirectReservations([f.item],f.db.data.get(f.ledgerPath))[0].available,'720');
});
test('retries return the immutable reward even after payment; no reroll or second reservation',async()=>{
 const f=fixture(),first=await f.reserve();f.item.available='500';assert.deepEqual(await f.reserve(),first);assert.equal(f.rolls(),1);
 const id=f.db.data.get(f.eligible.runRef.path).serverDepthsRewardId;
 Object.assign(f.db.data.get('arenaPrivate/'+id),{deliveryStatus:'delivered',deliveryTxid:'confirmed'});
 const view=s.depthsRewardView(await f.reserve());assert.equal(view.status,'claimed');assert.equal(view.claimTxId,'confirmed');assert.equal(f.rolls(),1);
});
test('concurrent requests cannot roll twice or duplicate a payout',async()=>{
 const f=fixture();const results=await Promise.allSettled([f.reserve(),f.reserve()]);assert(results.some(r=>r.status==='fulfilled'));assert.equal(f.rolls(),1);assert.equal(f.db.data.get(f.ledgerPath).reserved[500],'280');
 await f.reserve();assert.equal(f.rolls(),1);
});
test('pending chain operations block new reservations; cleared operations allow retry',async()=>{
 const f=fixture();f.db.data.get(f.ledgerPath).operation={kind:'reward'};
 await assert.rejects(f.reserve(),/processing another reward/);assert.equal(f.rolls(),0);
 f.db.data.get(f.ledgerPath).operation=null;await f.reserve();assert.equal(f.rolls(),1);
});
test('no allocation for exhausted inventory, disabled caps, ineligible runs, or legacy payouts',async()=>{
 for(const change of [f=>f.item.available='200',f=>f.item.capBps=0,f=>f.db.data.get(f.eligible.runRef.path).status='active',f=>f.db.data.get(f.eligible.runRef.path).activeAddress='other',f=>f.db.data.get(f.eligible.runRef.path).serverRewardProof='forged',f=>f.db.data.get(f.eligible.runRef.path).darkCoinRewardGrantTxId='old-confirmed']){
  const f=fixture();change(f);await assert.rejects(f.reserve());assert.equal(f.db.data.get(f.ledgerPath).reserved[500],'200');assert(!f.db.data.get(f.eligible.runRef.path).serverDepthsRewardId);
 }
});
test('odds use the same reserved balance and cap calculation as payment allocation',async()=>{
 const f=fixture();f.item.capAtomic='35';const item=await s.depthsAvailableBalance(f.db,config,500,f.deps);
 assert.equal(item.available,'800');assert.equal(s.depthsPayoutAmount(item,1000),35n);const row=await f.reserve();assert.equal(row.claim.amount,'35');assert(row.depthRoll.capped);
});
test('asset opt-in failures remain in the common wallet summary without leaking run proofs',async()=>{
 const f=fixture(),row=await f.reserve();row.deliveryStatus='saved';row.deliveryReason='opt_in_required';const view=s.rewardSummary(row,false);
 assert.equal(view.source,'depths');assert.equal(view.deliveryMode,'direct');assert.equal(view.claim.amount,'80');assert.equal(view.hour,4000000000000001);assert(!JSON.stringify(view).includes('proof'));
});
test('saved reward reference cannot redirect another wallet or treasury',async()=>{
 const f=fixture();await f.reserve();const id=f.db.data.get(f.eligible.runRef.path).serverDepthsRewardId;f.db.data.get('arenaPrivate/'+id).rewardWallet='attacker';await assert.rejects(f.reserve(),/reconciliation/);
});
