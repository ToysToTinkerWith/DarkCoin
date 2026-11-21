const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),algo=require('algosdk');
const root=path.resolve(__dirname,'..');
const modules=Promise.all([import('../contracts/depths-migration.mjs'),import('../contracts/deployment-programs.mjs')]);
const saved=JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures/depths-app-before-migration.json'),'utf8'));
const sender=saved.params.creator,oracle=algo.generateAccount().addr.toString();
function context(m,p){
 const app={params:{creator:sender,approvalProgram:Buffer.from(saved.params['approval-program'],'base64'),globalState:[],globalStateSchema:{numUint:64,numByteSlice:0},extraProgramPages:0}};
 const state={account:{amount:10000000n,minBalance:200000n,assets:[{assetId:1088771340n,amount:2000000n}]},boxList:{boxes:[]}};
 const algod={accountInformation:()=>({do:async()=>state.account}),getApplicationBoxes:()=>({max:()=>({do:async()=>state.boxList})})};
 return {state,input:{appId:m.DEPTHS_APP_ID,programs:p.readDeploymentPrograms(),app,sender,oracleAddress:oracle,algod,
  bytecode:{approvalProgram:new Uint8Array(2100),clearProgram:Uint8Array.from([9,129,1,67]),extraPages:1},
  params:{firstValid:100,lastValid:1100,genesisID:'mainnet-v1.0',genesisHash:new Uint8Array(32),minFee:1000n,consensusVersion:m.SIZE_UPDATE_PROTOCOL}}};
}
test('Depths migration preserves identity and groups schema resize with one-time initialization',async()=>{
 const [m,p]=await modules,{input}=context(m,p),result=await m.prepareDepthsMigration(input);
 const [update,init]=result.txns.map(t=>algo.decodeUnsignedTransaction(algo.encodeUnsignedTransaction(t)));
 assert.equal(update.applicationCall.appIndex,3658640544n);assert.equal(init.applicationCall.appIndex,3658640544n);
 assert.equal(update.applicationCall.onComplete,algo.OnApplicationComplete.UpdateApplicationOC);
 assert.equal(update.applicationCall.numGlobalInts,2);assert.equal(update.applicationCall.numGlobalByteSlices,1);assert.equal(update.applicationCall.extraPages,1);
 assert.equal(update.applicationCall.numLocalInts,0);assert.equal(update.applicationCall.numLocalByteSlices,0);
 assert.deepEqual(init.applicationCall.appArgs,[Buffer.from('initialize'),algo.decodeAddress(oracle).publicKey].map(b=>new Uint8Array(b)));
 assert.deepEqual(init.applicationCall.foreignAssets,[1088771340n]);assert.equal(init.applicationCall.boxes.length,1);
 assert.deepEqual(update.group,init.group);assert(result.txns.every(t=>!t.rekeyTo&&!t.payment&&!t.assetTransfer));
 assert.equal(result.summary.address,algo.getApplicationAddress(3658640544).toString());assert.equal(result.summary.startsPaused,true);
});
test('migration refuses unverified contracts, unrelated state, legacy liabilities and unsupported chain versions',async()=>{
 const [m,p]=await modules;
 for(const [change,pattern] of [
  [c=>c.input.appId=3718607904,/verified Depths/],
  [c=>c.input.app.params.approvalProgram=Buffer.from('other code'),/verified Depths/],
  [c=>c.input.sender=oracle,/creator/],
  [c=>c.input.oracleAddress='',/ORACLE_ADDRESS/],
  [c=>c.input.params.consensusVersion='old',/protocol/],
  [c=>c.input.params.genesisID='testnet-v1.0',/mainnet/],
  [c=>c.input.app.params.globalState=[{key:'version'}],/global state/],
  [c=>c.state.boxList={boxes:[{name:Buffer.from('rewards')}]},/legacy reward/],
  [c=>c.state.boxList={boxes:[],nextToken:'more'},/legacy reward/],
  [c=>c.state.account.amount=200000n,/Fund/],
 ]){const c=context(m,p);change(c);await assert.rejects(m.prepareDepthsMigration(c.input),pattern);}
});
test('simulation failure stops the migration before a transaction can be signed',async()=>{
 const [m,p]=await modules,{input}=context(m,p),{txns}=await m.prepareDepthsMigration(input);let request;
 const fake={simulateTransactions:r=>{request=r;return {do:async()=>({txnGroups:[{failureMessage:'assert failed'}]})};}};
 await assert.rejects(m.simulateDeployment(fake,txns),/Nothing was signed or submitted/);
 assert.equal(request.allowEmptySignatures,true);assert.equal(request.txnGroups[0].txns.length,2);
});
test('updateApp automatically selects migration for Depths and never submits failed simulation',async()=>{
 const [m,p]=await modules,d=await import('../contracts/deployment.js'),{input}=context(m,p);let simulations=0;
 Object.assign(input.algod,{
  getApplicationByID:()=>({do:async()=>input.app}),getTransactionParams:()=>({do:async()=>input.params}),
  compile:()=>({do:async()=>({result:Buffer.from([9,129,1,67]).toString('base64')})}),
  simulateTransactions:()=>({do:async()=>{simulations++;return {txnGroups:[{}]};}}),
  sendRawTransaction:()=>{throw new Error('Must not submit during dry run or failed simulation');},
 });
 const options={account:{addr:sender,sk:new Uint8Array(64)},algod:input.algod,dryRun:true};
 const result=await d.updateApp(m.DEPTHS_APP_ID,options);assert.equal(simulations,1);assert.equal(result.txns.length,2);
 assert.equal(result.summary.oracleAddress,sender);
 assert.deepEqual(result.txns[1].applicationCall.appArgs[1],algo.decodeAddress(sender).publicKey);
 input.algod.simulateTransactions=()=>({do:async()=>({txnGroups:[{failureMessage:'state changed'}]})});
 await assert.rejects(d.updateApp(m.DEPTHS_APP_ID,{...options,dryRun:false}),/Nothing was signed or submitted/);
});
test('retired game pages redirect without disabling the shared treasury delivery APIs',async()=>{
 const read=p=>fs.readFileSync(path.join(root,p),'utf8');
 assert(!read('functions/server.js').includes('retireDepths'));
 const redirects=await require('../next.config.js').redirects();
 for(const source of ['/arena/depths','/arena/fight']){
  assert(redirects.some(r=>r.source===source&&r.destination==='/arena'));
  assert(!read('pages/arena/index.js').includes(source));
 }
 assert(!(JSON.parse(read('firebase.json')).hosting.redirects||[]).some(r=>r.source.startsWith('/arena/depths')));
 for(const name of ['depthsState','claimDepthsReward','postDepthsBattleResult','verifyDepthsCompletion']){
  assert(read(`pages/api/arena/${name}.js`).includes(`export default ${name};`));
 }
 assert(!read('pages/arena/depths.js').includes('appArgs: [textBytes("claimReward")]'));
 assert(!read('pages/api/arena/claimDepthsReward.js').includes('Buffer.from("grantDarkCoin")'));
});
