const {test}=require('node:test'),assert=require('node:assert/strict'),sdk=require('algosdk');
require('esbuild').buildSync({entryPoints:['lib/legacy-generation.js'],bundle:true,platform:'node',outfile:'tmp/legacy-generation-tests.cjs',external:['firebase-admin','algosdk']});
const s=require('../tmp/legacy-generation-tests.cjs');
const build={moves:[{range:'melee',class:'damage',effect:'bleed'},{range:'ranged',class:'curse',effect:'doom'},{range:'magic',class:'buff',effect:'nurture'}],stats:{strength:4,dexterity:3,intelligence:3},effectPoints:{bleed:2,doom:2,nurture:2}};
const current={Skin:{name:'Undead'},Weapon:{assetId:1631204549},Head:{assetId:0}};
const owned=new Set([3586495825]),selection={Weapon:3586495825};
function db(){const data=new Map();const ref=id=>({id,get:async()=>({exists:data.has(id),data:()=>data.get(id)}),create:async v=>{assert(!data.has(id));data.set(id,structuredClone(v))}});let lock=Promise.resolve();return {data,collection:c=>({doc:id=>ref(c+'/'+id)}),runTransaction:fn=>{const next=lock.then(()=>fn({get:r=>r.get(),set:(r,v,o)=>data.set(r.id,o?.merge?{...data.get(r.id),...structuredClone(v)}:structuredClone(v)),create:(r,v)=>{assert(!data.has(r.id));data.set(r.id,structuredClone(v));},update:(r,v)=>data.set(r.id,{...data.get(r.id),...structuredClone(v)})}));lock=next.catch(()=>{});return next;}};}
const params={fee:1000,flatFee:true,firstValid:10,lastValid:1010,genesisID:'mainnet-v1.0',genesisHash:new Uint8Array(32)};
async function prepared(){const store=db(),a=sdk.generateAccount(),address=a.addr.toString(),client={getTransactionParams:()=>({do:async()=>params})};const p=await s.prepareLegacyGeneration({address,champId:99,championName:'Classic Hero',generationBuild:build,selection},{db:store,client,equipment:async()=>({current:{...current,Weapon:{assetId:selection.Weapon}},holdings:owned}),now:100000});const request=store.data.get('arenaPrivate/legacy-generation-'+p.requestId);const payment={id:p.paymentTxnId,sender:address,confirmedRound:11n,roundTime:101,assetTransferTransaction:{assetId:BigInt(s.GENERATION_FEE.assetId),receiver:s.GENERATION_FEE.receiver,amount:BigInt(s.GENERATION_FEE.amount)},note:Buffer.from(request.note)};return {store,p,request,payment};}
test('generation snapshots wallet selections and removals, never trusts supplied skin or arbitrary traits',()=>{
 const snap=s.validateGenerationSelection({...selection,Skin:'Fire Dragon'},current,owned);assert.equal(snap.properties.Weapon,'Wooden Club');assert.equal(snap.properties.Skin,'Undead');assert.equal(snap.properties.Head,'None');assert.equal(current.Skin.name,'Undead');
 assert.throws(()=>s.validateGenerationSelection({Weapon:3586495825},current,new Set()),/does not own/);
 assert.throws(()=>s.validateGenerationSelection({Weapon:123},current,owned),/valid weapon/);
 assert.equal(s.validateGenerationSelection({Weapon:3586495825},{...current,Weapon:{assetId:3586495825}},new Set()).properties.Weapon,'Wooden Club');
});
test('prepared request signs only the 10,000 DARK payment with the exact immutable build intent',async()=>{
 const {p,request}=await prepared(),txn=sdk.decodeUnsignedTransaction(Buffer.from(p.unsigned,'base64'));
 assert.equal(txn.type,'axfer');assert.equal(txn.assetTransfer.amount,10000000000n);assert.equal(txn.assetTransfer.assetIndex,1088771340n);assert.equal(txn.assetTransfer.receiver.toString(),s.GENERATION_FEE.receiver);assert.equal(txn.group,undefined);assert.equal(txn.rekeyTo,undefined);assert.equal(request.properties.Weapon,'Wooden Club');assert.equal(request.championName,'Classic Hero');assert.equal(txn.txID(),p.paymentTxnId);assert.equal(Buffer.from(txn.note).toString(),request.note);
});

test('the unchanged listener cannot use unsaved swaps; reject additions and removals before payment',async()=>{
 for(const draft of [selection,{Weapon:0}]){
  const store=db();let paymentPrepared=false;
  await assert.rejects(s.prepareLegacyGeneration({address:sdk.generateAccount().addr.toString(),champId:99,championName:'Classic Hero',generationBuild:build,selection:draft},{db:store,equipment:async()=>({current,holdings:owned}),client:{getTransactionParams:()=>{paymentPrepared=true;throw Error('Must not prepare a payment');}}}),/Apply your trait swaps/);
  assert.equal(paymentPrepared,false);assert.equal(store.data.size,0);
 }
});
test('payment rejects different payer, amount, note, asset, receiver, rekey, clawback and expired intent',async()=>{
 const {request,payment}=await prepared();s.verifyGenerationPayment(payment,request);
 for(const patch of [{sender:s.GENERATION_FEE.receiver},{id:'different'},{confirmedRound:0},{note:Buffer.from('other')},{rekeyTo:s.GENERATION_FEE.receiver},{roundTime:9999999},{assetTransferTransaction:{...payment.assetTransferTransaction,amount:1n}},{assetTransferTransaction:{...payment.assetTransferTransaction,assetId:1n}},{assetTransferTransaction:{...payment.assetTransferTransaction,receiver:request.address}},{assetTransferTransaction:{...payment.assetTransferTransaction,sender:request.address}},{assetTransferTransaction:{...payment.assetTransferTransaction,closeTo:request.address}}])assert.throws(()=>s.verifyGenerationPayment({...payment,...patch},request));
});
test('queue is idempotent under concurrent retries, preserves existing character and uses saved build',async()=>{
 const {store,p,payment}=await prepared();store.data.set('chars/99object',{charObj:{name:'Existing character'},status:'completed'});
 const dependencies={db:store,idx:{lookupTransactionByID:()=>({do:async()=>({transaction:payment})})},owner:async()=>{},now:110000};
 await Promise.all([1,2].map(()=>s.queueLegacyGeneration({requestId:p.requestId,properties:{Weapon:'forged'}},dependencies)));
 const jobs=[...store.data].filter(([k])=>k.startsWith('queuedChars/'));assert.equal(jobs.length,1);assert.equal(jobs[0][0],'queuedChars/'+p.paymentTxnId);assert.equal(jobs[0][1].properties.Weapon,'Wooden Club');assert.equal(store.data.get('chars/99object').charObj.name,'Existing character');assert.equal(store.data.get('chars/99object').generationJobId,p.requestId);assert.equal([...store.data].filter(([k])=>k.startsWith('txns/')).length,1);
});
test('the worker receives the complete saved build, trait snapshot, name and confirmed payment envelope',async()=>{
 const {store,p,request,payment}=await prepared();
 await s.queueLegacyGeneration({requestId:p.requestId,champId:777,championName:'Forged',generationBuild:{},confirmedRound:999,properties:{Skin:'Forged'}},{db:store,idx:{lookupTransactionByID:()=>({do:async()=>({transaction:payment})})},owner:async()=>{},now:110000});
 const job=store.data.get('queuedChars/'+p.paymentTxnId);
 assert.equal(job.generationQueue,'queuedChars');assert.equal(job.requestId,p.requestId);
 assert.deepEqual(job.generationBuild,request.generationBuild);
 assert.deepEqual(job.generationBuild.stats,build.stats);assert.deepEqual(job.generationBuild.effectPoints,build.effectPoints);
 assert.deepEqual(job.generationBuild.moves.map(({range,class:kind,type,effect,slot,cooldown})=>({range,class:kind,type,effect,slot,cooldown})),build.moves.map((move,i)=>({...move,type:move.range+' '+move.class,slot:i+1,cooldown:3})));
 assert.deepEqual(job.properties,request.properties);assert.deepEqual(Object.keys(job.properties),s.GENERATION_SLOTS);assert.deepEqual(job.traitAssetIds,request.traitAssetIds);
 assert.equal(job.championName,'Classic Hero');assert.equal(job.randomName,false);assert.equal(job.champId,99);assert.equal(job.configTargetAssetId,99);assert.equal(job.schemaVersion,2);
 for(const field of ['txnId','paymentTxnId','darkcoinTransferTxId','groupTxId'])assert.equal(job[field],payment.id);
 assert.equal(job.sender,payment.sender);assert.equal(job.receiver,s.GENERATION_FEE.receiver);assert.equal(job.assetId,s.GENERATION_FEE.assetId);
 assert.equal(job.amount,10000000000);assert.equal(job.amountString,'10000000000');assert.equal(job.confirmedRound,11);assert.equal(job.noteBase64,Buffer.from(request.note).toString('base64'));
 assert.equal(job.assetConfigTxId,null);assert.equal(job.groupId,null);assert.equal(job.status,'queued');assert.equal(job.queuedAt,110000);
 assert.doesNotThrow(()=>JSON.stringify(job));assert.equal([...store.data.keys()].filter(k=>k.startsWith('legacyGenerationJobs/')).length,0,'Do not dispatch to two independent generators.');
});
test('invalid payment cannot produce a worker payload',async()=>{
 const {request,payment}=await prepared();
 assert.throws(()=>s.generationJobPayload(request,{...payment,confirmedRound:0n},110000),/confirmed payment/);
 assert.throws(()=>s.generationJobPayload(request,{...payment,assetTransferTransaction:{...payment.assetTransferTransaction,amount:1n}},110000),/confirmed payment/);
});
test('unconfirmed payment and transferred champion cannot create a generation job',async()=>{
 const {store,p,payment}=await prepared();await assert.rejects(s.queueLegacyGeneration({requestId:p.requestId},{db:store,idx:{lookupTransactionByID:()=>({do:async()=>{throw Error('404')}})},owner:async()=>{}}),/not indexed/);
 await assert.rejects(s.queueLegacyGeneration({requestId:p.requestId},{db:store,idx:{lookupTransactionByID:()=>({do:async()=>({transaction:payment})})},owner:async()=>{throw Error('No longer owner')}}),/No longer owner/);
 assert.equal([...store.data].filter(([k])=>k.startsWith('legacyGenerationJobs/')||k.startsWith('queuedChars/')).length,0);
});

test('previously prepared cloud jobs keep their route, and already queued retries never redispatch',async()=>{
 const {store,p,payment}=await prepared();
 delete store.data.get('arenaPrivate/legacy-generation-'+p.requestId).generationQueue;
 const dependencies={db:store,idx:{lookupTransactionByID:()=>({do:async()=>({transaction:payment})})},owner:async()=>{},now:110000};
 await s.queueLegacyGeneration({requestId:p.requestId,generationQueue:'queuedChars'},dependencies);
 assert(store.data.has('legacyGenerationJobs/'+p.requestId));assert(!store.data.has('queuedChars/'+p.paymentTxnId));
 await s.queueLegacyGeneration({requestId:p.requestId},dependencies);
 assert.equal([...store.data.keys()].filter(k=>k.startsWith('legacyGenerationJobs/')).length,1);
 assert(!store.data.has('queuedChars/'+p.paymentTxnId));
});

test('retry after listener completion and deletion does not enqueue or charge again',async()=>{
 const {store,p,payment}=await prepared();
 const dependencies={db:store,idx:{lookupTransactionByID:()=>({do:async()=>({transaction:payment})})},owner:async()=>{}};
 await s.queueLegacyGeneration({requestId:p.requestId,generationQueue:'legacyGenerationJobs'},dependencies);
 store.data.delete('queuedChars/'+p.paymentTxnId);
 await s.queueLegacyGeneration({requestId:p.requestId},dependencies);
 assert(!store.data.has('queuedChars/'+p.paymentTxnId));assert(!store.data.has('legacyGenerationJobs/'+p.requestId));
});
