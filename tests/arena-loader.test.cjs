const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),algo=require('algosdk');
require('esbuild').buildSync({entryPoints:[path.resolve('lib/arena/treasury-loader.js')],bundle:true,platform:'node',outfile:path.resolve('tmp/arena-loader-tests.cjs')});
const s=require('../tmp/arena-loader-tests.cjs'),sender=s.LOAD_CONFIG.loader,other=algo.generateAccount().addr.toString(),app=s.LOAD_CONFIG.appId;
const params={genesisID:'mainnet-v1.0',genesisHash:new Uint8Array(32),firstValid:1000,lastValid:2000,minFee:1000n};
const snapshot=(status={},asset={})=>({status:{compatible:true,amount:'0',minBalance:'100000',message:'Upgrade required',...status},asset:{id:500,name:'Example token',decimals:6,balance:'18446744073709551615',optedIn:false,registered:false,...asset}});
test('load group orders funding, contract opt-in, and deposit with one shared group',()=>{
 const {txns,summary}=s.buildLoadTransactions(sender,'12.345678',snapshot(),params);
 assert.equal(txns.length,3);assert.equal(txns[0].payment.amount,218900n);assert.equal(txns[0].payment.receiver.toString(),algo.getApplicationAddress(app).toString());
 assert.equal(txns[1].applicationCall.appIndex,BigInt(app));assert.equal(Buffer.from(txns[1].applicationCall.appArgs[0]).toString(),'load');assert.equal(Buffer.from(txns[1].applicationCall.appArgs[1]).readBigUInt64BE(),500n);assert.deepEqual(txns[1].applicationCall.foreignAssets,[500n]);
 assert.equal(txns[2].assetTransfer.amount,12345678n);assert.equal(txns[2].assetTransfer.assetIndex,500n);assert.equal(txns[2].assetTransfer.receiver.toString(),summary.receiver);
 for(const txn of txns){assert.equal(txn.sender.toString(),sender);assert(!txn.rekeyTo);assert.deepEqual(txn.group,txns[0].group);}assert(!txns[0].payment.closeRemainderTo);assert(!txns[2].assetTransfer.closeRemainderTo);assert(!txns[2].assetTransfer.assetSender);
 assert.equal(txns.reduce((sum,t)=>sum+t.fee,0n),4000n);assert.equal(summary.requiresOptIn,true);assert.equal(summary.requiresRegistration,true);
});
test('existing holdings, reward records and ALGO surplus avoid duplicate funding',()=>{
 assert.equal(s.buildLoadTransactions(sender,'1',snapshot({amount:'100000'}),params).summary.fundingMicroAlgo,'118900');
 const existing=s.buildLoadTransactions(sender,'1',snapshot({amount:'218900',minBalance:'218900'},{optedIn:true,registered:true}),params);
 assert.equal(existing.summary.fundingMicroAlgo,'0');assert.equal(existing.summary.feeMicroAlgo,3000);assert.equal(existing.summary.requiresRegistration,false);
 assert.equal(s.buildLoadTransactions(sender,'1',snapshot({amount:'1000000'}),params).summary.fundingMicroAlgo,'0');
 assert.equal(s.buildLoadTransactions(sender,'1',snapshot({amount:'200000',minBalance:'200000'},{optedIn:true}),params).summary.fundingMicroAlgo,'18900');
});
test('amounts are exact and wrong wallet, chain, frozen assets, and incompatible apps are rejected',()=>{
 assert.equal(s.parseTokenAmount('18446744073709.551615',6),18446744073709551615n);assert.equal(s.formatTokenAmount(12345678n,6),'12.345678');
 for(const amount of ['0','-1','1e6','1,000','1.0000001','18446744073709.551616'])assert.throws(()=>s.parseTokenAmount(amount,6));
 assert.throws(()=>s.buildLoadTransactions(other,'1',snapshot(),params),/authorized/);
 assert.throws(()=>s.buildLoadTransactions(sender,'1',snapshot({compatible:false}),params),/Upgrade/);
 assert.throws(()=>s.buildLoadTransactions(sender,'1',snapshot(),{...params,genesisID:'testnet-v1.0'}),/mainnet/);
 assert.throws(()=>s.buildLoadTransactions(sender,'1',snapshot({}, {frozen:true}),params),/frozen/);
 assert.throws(()=>s.buildLoadTransactions(sender,'1',snapshot({}, {treasuryFrozen:true}),params),/frozen/);
 assert.throws(()=>s.buildLoadTransactions(sender,'2',snapshot({}, {balance:'1000000'}),params),/balance/);
});
function mockClient({compatible=true,opted=false,registered=false,failSimulation=false}={}){
 const stat=(key,uint)=>({key:Buffer.from(key),value:{uint}}),notFound=()=>{throw Object.assign(new Error('not found'),{status:404});};let simulationCount=0;
 const client={
  getApplicationByID:()=>({do:async()=>({params:{creator:other,approvalProgram:compatible?Buffer.concat([Buffer.from('load'),Buffer.from(algo.decodeAddress(sender).publicKey)]):Buffer.from('listAsset'),globalState:compatible?[stat('version',2n),stat('paused',1n),{key:Buffer.from('oracle'),value:{bytes:Buffer.alloc(32)}}]:[]}})}),
  accountInformation:()=>({do:async()=>({amount:100000n,minBalance:100000n})}),
  getAssetByID:()=>({do:async()=>({params:{total:100000000n,decimals:6,name:'Example token'}})}),
  accountAssetInformation:addr=>({do:async()=>addr===sender?{assetHolding:{amount:10000000n,isFrozen:false}}:opted?{assetHolding:{amount:2n,isFrozen:false}}:notFound()}),
  getApplicationBoxByName:()=>({do:async()=>registered?{value:Buffer.alloc(32)}:notFound()}),
  getTransactionParams:()=>({do:async()=>params}),
  simulateTransactions:request=>({do:async()=>{simulationCount++;assert.equal(request.allowEmptySignatures,true);assert.equal(request.txnGroups[0].txns.length,3);assert(algo.encodeMsgpack(request).length>0);return {txnGroups:[failSimulation?{failureMessage:'assert failed'}:{}]};}}),
  count:()=>simulationCount
 };return client;
}
test('prepare verifies public app state and simulates before returning unsigned transactions',async()=>{
 const client=mockClient(),built=await s.prepareLoad(sender,500,'2.5',client);assert.equal(client.count(),1);assert.equal(built.transactions.length,3);assert.equal(built.amountAtomic,'2500000');assert.equal(built.requiresOptIn,true);
 const incompatible=mockClient({compatible:false});assert.equal((await s.loaderStatus(incompatible)).compatible,false);await assert.rejects(s.prepareLoad(sender,500,'1',incompatible),/compatible/);assert.equal(incompatible.count(),0);
 await assert.rejects(s.prepareLoad(sender,500,'1',mockClient({failSimulation:true})),/Nothing was submitted/);
 await assert.rejects(s.prepareLoad(other,500,'1',client),/authorized/);
});

// Authorization and replay guards are also exercised against the real AVM by
// scripts/check-arena-direct.cjs; the previous partial opcode interpreter could
// not evaluate dynamic group indexes or compiled constant blocks.
test('v3 deposits omit ALGO transfers unless low, then fund exactly ten ALGO',()=>{
 for(const [spendable,expected] of [[2000000n,0n],[1000000n,0n],[999999n,10000000n]]){
  const snap=snapshot();snap.status.version=3;snap.status.minBalance='100000';snap.status.amount=String(100000n+spendable);
  const r=s.buildLoadTransactions(sender,'1',snap,params);
  assert.equal(r.summary.fundingMicroAlgo,String(expected));assert.equal(r.txns.filter(t=>t.type==='pay').length,expected?1:0);assert.equal(r.txns.at(-1).type,'axfer');
 }
});
