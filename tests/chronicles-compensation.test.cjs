const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),sdk=require('algosdk');
const api=require('../scripts/send-chronicles-compensation.js');
const copy=x=>JSON.parse(JSON.stringify(x));
function fixture(){
 const account=sdk.generateAccount(),sender=account.addr.toString(),full=api.loadPlan(),plan={...full,recipients:full.recipients.slice(0,2)};
 const state={sender:null,recipients:{}},chain=new Map(),broadcasts=[],persisted=[];
 const f={account,plan,state,chain,broadcasts,persisted,round:100n,indexedRound:100n,balance:4670000000000n,blocked:new Set(),offline:false,failWait:false,fees:1000n};
 const notFound=()=>Object.assign(Error('Not found'),{status:404});
 f.client={
  getTransactionParams:()=>({do:async()=>({firstValid:f.round,lastValid:f.round+1000n,fee:0n,minFee:f.fees,genesisID:'mainnet-v1.0',genesisHash:Buffer.from(api.MAINNET_HASH,'base64')})}),
  accountAssetInformation:(wallet)=>({do:async()=>{if(f.blocked.has(wallet))throw notFound();return {assetHolding:{amount:f.balance,isFrozen:false}};}}),
  accountInformation:()=>({do:async()=>({amount:1000000n,minBalance:200000n,authAddr:f.authAddr})}),
  status:()=>({do:async()=>({lastRound:f.round})}),
  pendingTransactionInformation:id=>({do:async()=>{if(!chain.has(id))throw notFound();return {confirmedRound:chain.get(id).confirmedRound};}}),
  sendRawTransaction:bytes=>({do:async()=>{
   const {txn}=sdk.decodeSignedTransaction(bytes),id=txn.txID(),last=persisted.at(-1);
   assert(last&&Object.values(last.recipients).some(r=>r.attempts.some(a=>a.txid===id&&a.signed===Buffer.from(bytes).toString('base64'))),'signed bytes must be durable BEFORE broadcast');
   broadcasts.push(id);if(f.offline)throw Error('Simulated network failure');
   chain.set(id,{id,confirmedRound:101n,txType:'axfer',sender:txn.sender.toString(),assetTransferTransaction:{assetId:txn.assetTransfer.assetIndex,amount:txn.assetTransfer.amount,receiver:txn.assetTransfer.receiver.toString()},note:txn.note});return {txid:id};
  }})
 };
 f.idx={
  makeHealthCheck:()=>({do:async()=>({round:f.indexedRound})}),
  lookupTransactionByID:id=>({do:async()=>{if(!chain.has(id))throw notFound();return {transaction:chain.get(id)};}}),
  searchForTransactions:()=>{let prefix;const q={address:()=>q,addressRole:()=>q,assetID:()=>q,txType:()=>q,limit:()=>q,nextToken:()=>q,notePrefix:p=>(prefix=p,q),do:async()=>({transactions:[...chain.values()].filter(t=>Buffer.from(t.note).equals(prefix))})};return q;}
 };
 f.run=extra=>api.execute({plan,client:f.client,idx:f.idx,account,state,save:()=>persisted.push(copy(state)),log:()=>{},wait:async id=>{if(f.failWait||!chain.has(id))throw Error('Simulated confirmation timeout');return {confirmedRound:chain.get(id).confirmedRound};},...extra});
 return f;
}
test('frozen audit plan reconciles exactly; changed plan is rejected',()=>{
 const p=api.loadPlan();assert.equal(p.recipients.length,32);assert.equal(p.totalAtomic,'4670000000000');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'chronicles-plan-')),file=path.join(dir,'plan.json');
 fs.writeFileSync(file,JSON.stringify({...p,totalAtomic:'1'}));assert.throws(()=>api.loadPlan(file),/checksum/);
});
test('persists before send; exact transfers confirm; rerun never sends a paid wallet again',async()=>{
 const f=fixture();assert.equal((await f.run()).sent,2);assert.equal(f.broadcasts.length,2);
 assert.equal((await f.run()).sent,0);assert.equal(f.broadcasts.length,2);
 for(const r of f.plan.recipients)assert.equal(f.state.recipients[r.wallet].status,'confirmed');
});
test('acknowledgement/confirmation loss resumes on-chain receipt without duplicate payment',async()=>{
 const f=fixture();f.failWait=true;await assert.rejects(f.run(),/Unconfirmed transaction saved/);assert.equal(f.broadcasts.length,1);
 f.failWait=false;await f.run();assert.equal(f.broadcasts.length,2);assert.equal(new Set(f.broadcasts).size,2);
});
test('failed broadcast rebroadcasts identical signed transaction on next run',async()=>{
 const f=fixture();f.offline=true;await assert.rejects(f.run(),/Unconfirmed/);const id=f.broadcasts[0];
 f.offline=false;await f.run();assert.equal(f.broadcasts[1],id);assert.equal(new Set(f.broadcasts).size,2);
});
test('expired transaction requires indexer coverage before safe replacement',async()=>{
 const f=fixture();f.offline=true;await assert.rejects(f.run(),/Unconfirmed/);const original=f.broadcasts[0];
 f.offline=false;f.round=301n;f.indexedRound=299n;await assert.rejects(f.run(),/Indexer has not passed/);assert.equal(f.broadcasts.length,1);
 f.indexedRound=301n;await f.run();assert.notEqual(f.broadcasts[1],original);assert.equal(f.state.recipients[f.plan.recipients[0].wallet].attempts[0].status,'expired');
});
test('missing opt-in is unpaid; eligible wallet paid; later opt-in pays only blocked wallet',async()=>{
 const f=fixture(),wallet=f.plan.recipients[0].wallet;f.blocked.add(wallet);await f.run();assert.equal(f.broadcasts.length,1);assert.equal(f.state.recipients[wallet].status,'blocked');
 f.blocked.clear();await f.run();assert.equal(f.broadcasts.length,2);assert.equal(f.state.recipients[wallet].status,'confirmed');
});
test('dry run does not sign, broadcast, or persist; insufficient funds sends nothing',async()=>{
 const f=fixture();await f.run({dryRun:true});assert.equal(f.broadcasts.length,0);assert.equal(f.persisted.length,0);
 f.balance=1n;await assert.rejects(f.run(),/Insufficient DARK/);assert.equal(f.broadcasts.length,0);
});
test('chain recovery can itself resume on a later run',async()=>{
 const f=fixture();await f.run();f.state.recipients={};await f.run();assert.equal(f.broadcasts.length,2);
 assert(Object.values(f.state.recipients).every(r=>r.attempts[0].recoveredFromChain));await f.run();assert.equal(f.broadcasts.length,2);
});
test('saved transaction tampering or excessive fees stop distribution',async()=>{
 const f=fixture();f.offline=true;await assert.rejects(f.run(),/Unconfirmed/);const a=f.state.recipients[f.plan.recipients[0].wallet].attempts[0];a.txid='X'.repeat(52);f.offline=false;await assert.rejects(f.run(),/does not match/);
 const other=fixture();other.fees=11000n;await assert.rejects(other.run(),/fee exceeds/);assert.equal(other.broadcasts.length,0);
});
test('rekeyed funding account requires the authorized key and supports SDK auth signing',async()=>{
 const bad=fixture();bad.authAddr=sdk.generateAccount().addr;await assert.rejects(bad.run(),/authorized signing key/);assert.equal(bad.broadcasts.length,0);
 const f=fixture();f.account.fundingAddress=sdk.generateAccount().addr.toString();f.authAddr=f.account.addr;
 await f.run();assert.equal(f.state.sender,f.account.fundingAddress);assert.equal(f.broadcasts.length,2);
 const attempt=f.state.recipients[f.plan.recipients[0].wallet].attempts[0],signed=sdk.decodeSignedTransaction(Buffer.from(attempt.signed,'base64'));
 assert.equal(signed.txn.sender.toString(),f.account.fundingAddress);assert.equal(signed.sgnr.toString(),f.account.addr.toString());
 await f.run();assert.equal(f.broadcasts.length,2);
});
test('public breakdown excludes signed bytes and shows actual confirmations and links',async()=>{
 const f=fixture();await f.run();const dir=fs.mkdtempSync(path.join(os.tmpdir(),'chronicles-public-'));
 api.reports(f.plan,f.state,dir);const publicText=fs.readFileSync(path.join(dir,'compensation-transactions.json'),'utf8'),md=fs.readFileSync(path.join(dir,'COMPENSATION-PAYOUTS.md'),'utf8');
 assert(!publicText.includes('"signed"'));assert(md.includes(f.broadcasts[0]));assert(publicText.includes('"confirmed"'));
});
