const test=require('node:test'),assert=require('node:assert/strict'),sdk=require('algosdk'),nacl=require('tweetnacl'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const m=require('../functions/council/model'),{verifyProof}=require('../functions/council/proof'),{poolState,resolveSwap}=require('../functions/council/tinyman'),{readCouncil}=require('../functions/council/chain'),{sha}=require('../functions/council/content');
const policy=require('../scripts/council-worker-policy.cjs'),{validate}=require('../scripts/release-council-change.cjs'),{acquire,leasedUpdate}=require('../functions/council/execution');
test('v3 state fits boxes while preserving the legacy one-integer schema',()=>{
  const p=m.normalizeProposal({title:'A funded change',body:'Please implement this change in the dapp.',actions:[]}),bytes=Buffer.alloc(m.PROPOSAL_SIZE);
  const owner=String(sdk.generateAccount().addr),header=m.encode(m.protocol.proposalFields,{owner,digest:sha(JSON.stringify(p)),actionsHash:sha(Buffer.alloc(0)),fee:20000000,rewardPool:8000000,minVotes:50,approvalBps:6000});header.copy(bytes);
  const decoded=m.decodeProposal(bytes,1);assert.equal(decoded.owner,owner);assert.equal(decoded.rewardPool,'8000000');assert.equal(decoded.actions.length,0);assert.equal(m.proposalKey(1).length,11);assert.equal(m.voteKey(1,101).length,19);
  assert(m.PROPOSAL_MBR>0&&m.CONFIG_MBR>0);
});
test('wallet proofs bind exact contents, expire, and support an explicit rekeyed signer',()=>{
  const owner=sdk.generateAccount(),signer=sdk.generateAccount(),sender=String(owner.addr),digest='a'.repeat(64),now=Date.now();
  const tx=sdk.makePaymentTxnWithSuggestedParamsFromObject({sender,receiver:sender,amount:0,note:Buffer.from(JSON.stringify({kind:'council-proposal-quote',sha256:digest,time:now})),suggestedParams:{firstValid:100,lastValid:1100,fee:1000,flatFee:true,genesisHash:new Uint8Array(32)}});
  const proof=Buffer.from(tx.signTxn(signer.sk)).toString('base64');
  assert(verifyProof({sender,proof,kind:'council-proposal-quote',digest,signer:String(signer.addr),now}));
  assert.throws(()=>verifyProof({sender,proof,kind:'council-proposal-quote',digest,now}));
  assert.throws(()=>verifyProof({sender,proof,kind:'council-proposal-quote',digest,signer:String(signer.addr),now:now+600000}),/expired/);
});
test('Tinyman discovery requires the configured validator, exact asset pair and positive liquidity',async()=>{
  const app=m.protocol.tinyman.mainnet,local=values=>({id:app,keyValue:Object.entries(values).map(([k,v])=>({key:Buffer.from(k),value:{type:2,uint:BigInt(v)}}))});
  const account={address:String(sdk.generateAccount().addr),appsLocalState:[local({asset_1_id:1088771340,asset_2_id:0,asset_1_reserves:1000000,asset_2_reserves:2000000})]};
  const q={do:async()=>({accounts:[account]})};for(const name of ['applicationID','assetID','limit'])q[name]=()=>q;
  const action=await resolveSwap({searchAccounts:()=>q},'mainnet',{kind:2,asset:'1088771340',outputAsset:'0',amount:'1000'});assert.equal(action.pool,account.address);
  assert.equal(poolState(account,999).asset_1_id,undefined);
  await assert.rejects(resolveSwap({lookupAccountByID:()=>({do:async()=>({account})})},'mainnet',{kind:2,asset:'8',outputAsset:'0',pool:account.address}),/does not match/);
});
test('the inactive Council still shows the existing treasury instead of a fabricated zero balance',async()=>{
  const client={accountInformation:()=>({do:async()=>({amount:1000000n,minBalance:500000n,assets:[]})}),getApplicationBoxByName:()=>({do:async()=>{throw Object.assign(Error('missing'),{status:404});}})};
  const data=await readCouncil('',{client,indexer:{}});assert.equal(data.config.ready,false);assert.equal(data.config.treasury,'500000');assert.equal(data.assets[0].amount,'1000000');assert.equal(data.config.host,require('../functions/council/hosting.json').address);
});
test('source snapshots exclude secrets and release rejects out-of-scope files or changed production bases',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'council-policy-')),source=path.join(root,'source'),worker=path.join(root,'worker');fs.mkdirSync(path.join(source,'components'),{recursive:true});fs.writeFileSync(path.join(source,'components','Example.js'),'old');fs.writeFileSync(path.join(source,'service.json'),'secret');fs.writeFileSync(path.join(source,'.env'),'secret');
  const base=policy.snapshot(source,worker);assert(!fs.existsSync(path.join(worker,'service.json')));assert(!base['.env']);
  fs.writeFileSync(path.join(worker,'components','Example.js'),'new');const edits=policy.changes(worker,base);assert.equal(edits.length,1);assert.equal(validate({workspace:worker,changes:edits},source)[0].file,'components/Example.js');
  fs.writeFileSync(path.join(source,'components','Example.js'),'concurrent change');assert.throws(()=>validate({workspace:worker,changes:edits},source),/Production changed/);
  fs.writeFileSync(path.join(worker,'package.json'),'{}');assert.throws(()=>policy.changes(worker,base),/protected file/);assert.throws(()=>policy.safePath(source,'../escape'),/Invalid release path/);
});
test('execution leases prevent duplicate workers and stale workers cannot update progress',async()=>{
  let record={status:'queued',attempt:0};const ref={};const db={runTransaction:async fn=>fn({get:async()=>({exists:true,data:()=>record}),update:(_,patch)=>{record={...record,...patch};}})};
  const job=await acquire(db,ref,'worker-one',1000);assert(job.lease);assert.equal(await acquire(db,ref,'worker-two',2000),null);
  await assert.rejects(leasedUpdate(db,ref,'stale',{status:'complete'}),/lease lost/);
  await leasedUpdate(db,ref,job.lease,{status:'complete'});assert.equal(record.status,'complete');
});
test('the treasury supervisor verifies the actual proposal and persists identity before sending; a retry never sends twice',async()=>{
  const {executeAction}=require('../functions/council/execution'),{membershipTree}=require('../functions/council/membership');
  const registry=require('../functions/council/membership.json'),tree=membershipTree(registry.assetIds),account=sdk.generateAccount(),sender=String(account.addr);
  const action=m.normalizeAction({kind:0,asset:1088771340,amount:'25000000000',recipient:sender});
  const manifest=m.normalizeProposal({title:'Pay for approved artwork',body:'Pay the artist for the artwork in this proposal.',actions:[action]});
  const digest=sha(JSON.stringify(manifest)),program=Buffer.from('unit-test-program');let mask=0,sends=0;
  const config=m.encode(m.protocol.configFields,{...m.protocol.defaults,version:3,next:2,revision:1,members:tree.assetIds.length,depth:tree.depth,root:tree.root,host:sender,quoteSigner:sender,executor:sender,tinyman:m.protocol.tinyman.mainnet});
  const proposal=()=>{const bytes=Buffer.alloc(m.PROPOSAL_SIZE);m.encode(m.protocol.proposalFields,{owner:sender,digest,actionsHash:sha(m.encodeActions(manifest.actions)),state:1,executed:mask,actionCount:1,minVotes:50,approvalBps:6000}).copy(bytes);m.encodeActions(manifest.actions).copy(bytes,m.P.size);return bytes;};
  const records=new Map([['councilManifests/'+digest,{manifest}],['councilExecutions/job',{transactionIds:[]}]]);
  const ref=key=>({key,get:async()=>({exists:records.has(key),data:()=>records.get(key)}),set:async value=>records.set(key,value),collection:name=>({doc:id=>ref(`${key}/${name}/${id}`)})});
  const db={collection:name=>({doc:id=>ref(`${name}/${id}`)}),runTransaction:async fn=>fn({get:r=>r.get(),update:(r,p)=>records.set(r.key,{...records.get(r.key),...p})})};
  const client={accountInformation:()=>({do:async()=>({amount:1000000000n,minBalance:100000n,assets:[]})}),getApplicationByID:()=>({do:async()=>({params:{approvalProgram:program}})}),
    getApplicationBoxByName:(_,key)=>({do:async()=>({value:Buffer.from(key).toString()==='C3C'?config:proposal()})}),
    getTransactionParams:()=>({do:async()=>({fee:0n,minFee:1000n,firstValid:100n,lastValid:1100n,genesisHash:new Uint8Array(32)})}),
    simulateTransactions:()=>({do:async()=>({txnGroups:[{}]})}),status:()=>({do:async()=>({lastRound:100n})}),pendingTransactionInformation:()=>({do:async()=>({confirmedRound:101n})}),
    sendRawTransaction:()=>({do:async()=>{assert(records.get('councilExecutions/job/transactions/0')?.txid,'Identity persisted before broadcast');sends++;mask=1;return {};}})};
  const keys=['COUNCIL_APP_ID','COUNCIL_NETWORK','COUNCIL_APPROVAL_SHA256'],old=keys.map(k=>process.env[k]);
  Object.assign(process.env,{COUNCIL_APP_ID:'1234',COUNCIL_NETWORK:'mainnet',COUNCIL_APPROVAL_SHA256:sha(program)});
  const args={db,ref:ref('councilExecutions/job'),job:{network:'mainnet',appId:1234,proposalId:'1',digest},index:0,account,client};
  try{const first=await executeAction(args);assert(first.txid);assert.equal(sends,1);const second=await executeAction(args);assert.equal(second.alreadyExecuted,true);assert.equal(sends,1);
    await assert.rejects(executeAction({...args,job:{...args.job,digest:'f'.repeat(64)}}),/integrity check/);
  }finally{keys.forEach((k,i)=>old[i]===undefined?delete process.env[k]:process.env[k]=old[i]);}
});
