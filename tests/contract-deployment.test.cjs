const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{pathToFileURL}=require('node:url'),algo=require('algosdk');
const root=path.resolve(__dirname,'..'),moduleUrl=name=>pathToFileURL(path.join(root,'contracts',name)).href;
const modules=Promise.all([import(moduleUrl('deployment-programs.mjs')),import(moduleUrl('deployment.js'))]);
const account=algo.generateAccount(),oracle=algo.generateAccount().addr.toString();
const python=process.env.PYTHON||'C:/Python312/python.exe';process.env.PYTHON=python;
const schema={localInts:0,localBytes:0,globalInts:2,globalBytes:1};
const accountState=()=>({params:{creator:account.addr,extraProgramPages:3,globalStateSchema:{numUint:2,numByteSlice:1},localStateSchema:{numUint:0,numByteSlice:0},globalState:[{key:Buffer.from('version'),value:{uint:2n}},{key:Buffer.from('oracle'),value:{bytes:new Uint8Array(32)}}]}});
function fakeClient(app=accountState()){
 const sources=[];return {sources,simulateTransactions:()=>({do:async()=>({txnGroups:[{}]})}),
  compile:bytes=>({do:async()=>{sources.push(new TextDecoder().decode(bytes));return {result:Buffer.from([9,129,1,67]).toString('base64')};}}),
  getTransactionParams:()=>({do:async()=>({firstValid:100,lastValid:1100,genesisID:'testnet-v1.0',genesisHash:new Uint8Array(32),minFee:1000n})}),
  getApplicationByID:()=>({do:async()=>app}),
  sendRawTransaction:()=>{throw new Error('TEST MUST NOT SIGN OR BROADCAST');}
 };
}
test('generic compilation follows the selected Python source and rejects stale or mixed files',async()=>{
 const [m]=await modules,dir=fs.mkdtempSync(path.join(os.tmpdir(),'darkcoin-compile-'));
 const cfg={source:'One.py',avmVersion:9,schema,creationArgs:'none'};
 fs.writeFileSync(path.join(dir,'deployment.config.json'),JSON.stringify(cfg));
 fs.writeFileSync(path.join(dir,'One.py'),'from pyteal import *\ndef approval_program(): return Seq(Pop(Int(73)),Approve())\ndef clear_state_program(): return Reject()\n');
 fs.writeFileSync(path.join(dir,'vote_approval.teal'),'OLD MARKETPLACE FILE MUST NEVER BE READ');
 const one=m.compileContract({directory:dir,python});assert(one.approvalSource.includes('int 73'));assert(one.clearSource.includes('int 0'));assert.equal(one.source,'One.py');
 fs.writeFileSync(path.join(dir,'approval.teal'),'stale other contract');assert.throws(()=>m.readDeploymentPrograms(dir),/stale/);
 cfg.source='Two.py';fs.writeFileSync(path.join(dir,'deployment.config.json'),JSON.stringify(cfg));fs.writeFileSync(path.join(dir,'Two.py'),'from pyteal import *\ndef approval_program(): return Seq(Pop(Int(99)),Approve())\ndef clear_state_program(): return Approve()\n');
 const two=m.compileContract({directory:dir,python});assert(two.approvalSource.includes('int 99'));assert(!two.approvalSource.includes('int 73'));assert(two.clearSource.includes('int 1'));
 fs.appendFileSync(path.join(dir,'Two.py'),'this is invalid python !');assert.throws(()=>m.compileContract({directory:dir,python}),/compilation failed/);assert.throws(()=>m.readDeploymentPrograms(dir),/stale/);
 // Temporary fixtures intentionally contain no wallet credentials.
});
test('treasury compiler metadata rejects the old marketplace state schema',async()=>{
 const [m]=await modules,dir=fs.mkdtempSync(path.join(os.tmpdir(),'darkcoin-schema-'));
 fs.copyFileSync(path.join(root,'contracts/ArenaTreasury.py'),path.join(dir,'ArenaTreasury.py'));
 fs.writeFileSync(path.join(dir,'deployment.config.json'),JSON.stringify({source:'ArenaTreasury.py',avmVersion:9,schema:{localInts:16,localBytes:0,globalInts:64,globalBytes:0},creationArgs:'oracle'}));
 assert.throws(()=>m.compileContract({directory:dir,python}),/DEPLOYMENT_SCHEMA/);
 assert(!fs.existsSync(path.join(dir,'approval.teal')));
});
test('running the contract Python file directly writes deployable TEAL without config selection',async()=>{
 const [m]=await modules,dir=fs.mkdtempSync(path.join(os.tmpdir(),'darkcoin-direct-'));
 for(const name of ['ArenaTreasury.py','compile_contract.py'])fs.copyFileSync(path.join(root,'contracts',name),path.join(dir,name));
 // Deliberately no deployment.config.json. The executed contract is the selection.
 const result=require('node:child_process').spawnSync(python,[path.join(dir,'ArenaTreasury.py')],{cwd:os.tmpdir(),encoding:'utf8',windowsHide:true});
 assert.equal(result.status,0,result.stderr);
 const programs=m.readDeploymentPrograms(dir);assert.equal(programs.source,'ArenaTreasury.py');assert.deepEqual(programs.schema,schema);
 assert.equal(programs.approvalSource,fs.readFileSync(path.join(dir,'arena-treasury/approval.teal'),'utf8').replace(/\r\n/g,'\n'));
});

test('createApp and updateApp read the precompiled pair without running Python or rewriting TEAL',async()=>{
 const [m,d]=await modules,client=fakeClient();
 const files=['approval.teal','clear_state.teal','deployment-manifest.json'].map(name=>path.join(root,'contracts',name));
 const before=files.map(file=>({content:fs.readFileSync(file,'utf8'),mtime:fs.statSync(file).mtimeMs}));
 const oldPython=process.env.PYTHON;process.env.PYTHON='nonexistent-python-deployment-must-not-run';
 try {
 const created=await d.createApp({account,oracleAddress:oracle,algod:client,dryRun:true}),updated=await d.updateApp(999,{account,algod:client,dryRun:true});
 const generic=m.readDeploymentPrograms();
 assert.deepEqual(client.sources,[generic.approvalSource,generic.clearSource,generic.approvalSource,generic.clearSource]);
 assert.equal(created.txn.applicationCall.numGlobalInts,2);assert.equal(created.txn.applicationCall.numGlobalByteSlices,1);assert.equal(created.txn.applicationCall.numLocalInts,0);assert.equal(created.txn.applicationCall.numLocalByteSlices,0);
 assert.equal(created.txn.applicationCall.appArgs.length,1);assert.deepEqual(created.txn.applicationCall.appArgs[0],algo.decodeAddress(oracle).publicKey);
 assert.equal(updated.txns.length,2);assert.equal(Buffer.from(updated.txns[1].applicationCall.appArgs[0]).toString(),'activate_direct');
 assert.equal(updated.txn.applicationCall.onComplete,algo.OnApplicationComplete.UpdateApplicationOC);assert.equal(updated.txn.applicationCall.appIndex,999n);
 assert.deepEqual(created.txn.applicationCall.approvalProgram,updated.txn.applicationCall.approvalProgram);assert.deepEqual(created.txn.applicationCall.clearProgram,updated.txn.applicationCall.clearProgram);
 assert(!created.txn.rekeyTo);assert(!updated.txn.rekeyTo);
 assert.deepEqual(files.map(file=>({content:fs.readFileSync(file,'utf8'),mtime:fs.statSync(file).mtimeMs})),before);
 } finally {process.env.PYTHON=oldPython;}
});
test('creation defaults to the creator oracle, ignoring an old separate-oracle environment value',async()=>{
 const [,d]=await modules,client=fakeClient(),old=process.env.ARENA_REWARD_ORACLE_ADDRESS;
 process.env.ARENA_REWARD_ORACLE_ADDRESS=oracle;
 try {
  const result=await d.createApp({account,algod:client,dryRun:true});
  assert.deepEqual(result.txn.applicationCall.appArgs[0],algo.decodeAddress(String(account.addr)).publicKey);
 } finally {if(old===undefined)delete process.env.ARENA_REWARD_ORACLE_ADDRESS;else process.env.ARENA_REWARD_ORACLE_ADDRESS=old;}
});

test('wrong target app, wrong creator and invalid explicit oracle stop before node compilation',async()=>{
 const [,d]=await modules,bad=accountState();bad.params.globalStateSchema={numUint:64,numByteSlice:0};bad.params.globalState=[];
 const wrongApp=fakeClient(bad);await assert.rejects(d.updateApp(3718607904,{account,algod:wrongApp,dryRun:true}),/incompatible/);assert.equal(wrongApp.sources.length,0);
 const wrongCreator=accountState();wrongCreator.params.creator=algo.generateAccount().addr;
 const wrongWallet=fakeClient(wrongCreator);await assert.rejects(d.updateApp(999,{account,algod:wrongWallet,dryRun:true}),/creator/);assert.equal(wrongWallet.sources.length,0);
 const noOracle=fakeClient();await assert.rejects(d.createApp({account,oracleAddress:'invalid',algod:noOracle,dryRun:true}),/ORACLE_ADDRESS/);assert.equal(noOracle.sources.length,0);
 const uninitialized=accountState();uninitialized.params.globalState=[];const blank=fakeClient(uninitialized);await assert.rejects(d.updateApp(999,{account,algod:blank,dryRun:true}),/initialized/);
});
