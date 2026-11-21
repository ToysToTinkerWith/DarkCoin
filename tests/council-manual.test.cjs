const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {executionBrief}=require('../functions/council/handoff');
const {localStore,verifyProposal}=require('../scripts/council-execute.cjs');
const config={ready:true,network:'mainnet',appId:1239236238};
const p={id:'42',state:1,textVerified:true,digest:'a'.repeat(64),title:'Fund the tournament',body:'Send the approved prize pool and implement the tournament page.',images:[{hash:'b'.repeat(64),caption:'Use this artwork.'}],actions:[{kind:'0',asset:'1088771340',amount:'25000000000',recipient:'voted-recipient'}],executed:'0'};
test('the handoff includes the immutable identity, prompt, images and exact treasury tool commands',()=>{
  const text=executionBrief(config,p);
  for(const expected of [p.body,p.digest,p.images[0].hash,'node scripts/council-execute.cjs verify 42','execute 42 0 --digest','voted-recipient','25000000000','Copied text alone is not proof'])assert(text.includes(expected));
  for(const proposal of [{...p,state:0},{...p,state:2},{...p,textVerified:false}])assert.throws(()=>executionBrief(config,proposal),/verified, passed/);
  assert.throws(()=>executionBrief({...config,ready:false},p),/verified, passed/);
});
test('the local verifier rejects unpassed or substituted proposals and requires the copied digest',async()=>{
  const read=async()=>({config,proposals:[p]});
  const verified=await verifyProposal({id:'42',digest:p.digest,read,verifyImages:false});assert.equal(verified.proposal.body,p.body);
  for(const proposal of [{...p,state:0},{...p,state:2},{...p,textVerified:false},{...p,digest:'c'.repeat(64)}])await assert.rejects(verifyProposal({id:'42',digest:p.digest,read:async()=>({config,proposals:[proposal]}),verifyImages:false}),/does not show/);
  await assert.rejects(verifyProposal({id:'42',digest:'',read,verifyImages:false}),/digest/);
  await assert.rejects(verifyProposal({id:'42',digest:p.digest,read:async()=>({config:{ready:false},proposals:[]}),verifyImages:false}),/not been activated/);
});
test('local payment identities survive reopening without a hosted database or AI API',async()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'council-local-'));let store=localStore(directory);
  const ref=store.db.collection('councilExecutions').doc('mainnet-1234-42');await ref.set({transactionIds:[]});
  await ref.collection('transactions').doc('0').set({txid:'original-payment',lastValid:'1100'});
  store=localStore(directory);const reopened=store.db.collection('councilExecutions').doc('mainnet-1234-42');
  assert.equal((await reopened.collection('transactions').doc('0').get()).data().txid,'original-payment');
  await store.db.runTransaction(async tx=>{const s=await tx.get(reopened);tx.update(reopened,{transactionIds:[...s.data().transactionIds,'original-payment']});});
  assert.deepEqual((await reopened.get()).data().transactionIds,['original-payment']);
});
test('no hosted AI worker is exported by the Firebase deployment',()=>{
  const source=fs.readFileSync(path.resolve(__dirname,'../functions/index.js'),'utf8');assert(!source.includes('councilExecutor'));
});
