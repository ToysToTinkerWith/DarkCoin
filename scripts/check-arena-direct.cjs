const fs=require('fs'),path=require('path'),algo=require('algosdk');const root=path.resolve(__dirname,'..');
require('esbuild').buildSync({stdin:{contents:"export * from './lib/arena/treasury';export * from './lib/arena/direct-rewards';export * from './lib/arena/reward-delivery';",resolveDir:root},bundle:true,platform:'node',external:['algosdk'],outfile:path.join(root,'tmp/direct-avm.cjs')});const s=require('../tmp/direct-avm.cjs');
(async()=>{
 const appId=3658640544,assetId=1088771340,c=new algo.Algodv2('','https://mainnet-api.algonode.cloud',443),app=await c.getApplicationByID(appId).do(),sender=app.params.creator.toString(),params={...await c.getTransactionParams().do(),fee:1000,flatFee:true};
 const {readDeploymentPrograms,compileDeploymentBytecode}=await import('../contracts/deployment-programs.mjs');const bytecode=await compileDeploymentBytecode(c,readDeploymentPrograms());if(bytecode.extraPages>Number(app.params.extraProgramPages||0))throw Error('Program exceeds capacity');
 const hour=Math.floor(Date.now()/3600000),tree=s.rewardTree(appId,hour,[{address:sender,assetId:123,rewardAssetId:assetId,amount:'1'}]);const hex=b=>Buffer.from(b).toString('hex');
 const fixture=`#pragma version 9
txn Sender
global CreatorAddress
==
assert
txn OnCompletion
int UpdateApplication
==
bnz done
byte "version"
int 3
app_global_put
byte "paused"
int 0
app_global_put
byte 0x${hex(s.assetKey(assetId))}
byte 0x${hex(Buffer.concat([s.u64(1),s.u64(0),s.u64(10000),s.u64(0)]))}
box_put
byte 0x${hex(s.encounterKey(hour))}
byte 0x${tree.root}${'00'.repeat(8)}
box_put
byte 0x${hex(s.budgetKey(hour,assetId))}
byte 0x${hex(s.u64(1))}
box_put
DRAIN
done:
int 1
return`;
 const compile=async src=>Buffer.from((await c.compile(src).do()).result,'base64');const normal=await compile(fixture.replace('DRAIN',''));
 const drain=await compile(fixture.replace('DRAIN',`itxn_begin
int pay
itxn_field TypeEnum
global CreatorAddress
itxn_field Receiver
global CurrentApplicationAddress
balance
global CurrentApplicationAddress
min_balance
-
int 500000
-
itxn_field Amount
int 0
itxn_field Fee
itxn_submit`));
 const update=p=>algo.makeApplicationUpdateTxnFromObject({sender,appIndex:appId,approvalProgram:p,clearProgram:bytecode.clearProgram,suggestedParams:params});
 const base=(low=false)=>[update(low?drain:normal),algo.makeApplicationNoOpTxnFromObject({sender,appIndex:appId,boxes:[s.assetKey(assetId),s.encounterKey(hour),s.budgetKey(hour,assetId)].map(name=>({appIndex:0,name})),suggestedParams:{...params,fee:low?2000:1000}}),update(bytecode.approvalProgram)];
 const pay=(sequence='0',amount='1')=>s.directTransactions({kind:'reward',sequence,assetId,amount,address:sender},sender,params,{appId});
 const simulate=async txns=>{txns.forEach(t=>t.group=undefined);algo.assignGroupID(txns);return (await c.simulateTransactions(new algo.modelsv2.SimulateRequest({allowEmptySignatures:true,txnGroups:[new algo.modelsv2.SimulateRequestTransactionGroup({txns:txns.map(t=>algo.decodeSignedTransaction(algo.encodeUnsignedSimulateTransaction(t)))})]})).do()).txnGroups[0];};
 const valid=await simulate([...base(),...pay()]);if(valid.failureMessage)throw Error(valid.failureMessage);const inner=valid.txnResults.at(-1).txnResult.innerTxns[0].txn.txn; if(inner.assetTransfer.amount!==1n||inner.fee!==1000n)throw Error('Wrong direct transfer');
 const treasury=await c.accountInformation(algo.getApplicationAddress(appId)).do(),holding=treasury.assets.find(a=>Number(a.assetId)===assetId);
 const failures=[];for(const [name,make]of [
 ['duplicate sequence',()=>[...base(),...pay(),...pay()]],
 ['skipped sequence',()=>[...base(),...pay('1')]],
 ['unauthorized sender',()=>{const tx=pay();tx[0].sender=algo.getApplicationAddress(appId);return [...base(),...tx];}],
 ['rekey',()=>{const tx=pay();tx[0].rekeyTo=algo.getApplicationAddress(appId);return [...base(),...tx];}],
 ['high-balance refill',()=>[...base(),...s.directTransactions({kind:'refill',sequence:'0'},sender,params,{appId})]],
 ['legacy funds protected',()=>[...base(),...pay('0',String(holding.amount))]],
 ['zero reward',()=>[...base(),...pay('0','0')]],
 ['publish retired',()=>[...base(),algo.makeApplicationNoOpTxnFromObject({sender,appIndex:appId,appArgs:[Buffer.from('publish')],suggestedParams:params})]],
 ]){const r=await simulate(make());if(!r.failureMessage)throw Error('Unsafe operation accepted: '+name);failures.push(name);}
 const refill=await simulate([...base(true),...s.directTransactions({kind:'refill',sequence:'0'},sender,params,{appId}),...pay('1')]);if(refill.failureMessage)throw Error('Refill: '+refill.failureMessage);
 const pause=value=>algo.makeApplicationNoOpTxnFromObject({sender,appIndex:appId,appArgs:[Buffer.from('pause'),s.u64(value)],suggestedParams:params});
 const paused=await simulate([...base(),pause(1),...pay()]);if(!paused.failureMessage)throw Error('Paused payout accepted');failures.push('paused payout');
 const resumed=await simulate([...base(),...pay(),pause(1),pause(0),...pay('1')]);if(resumed.failureMessage)throw Error('Pause reset the payout sequence: '+resumed.failureMessage);
 const legacy=await simulate([...base(),...s.sponsoredClaimTransactions({hour,claim:tree.claims[0],rewardWallet:sender},sender,params,{appId})]);if(legacy.failureMessage)throw Error('Legacy claim: '+legacy.failureMessage);
 const result={submitted:false,approvalBytes:bytecode.approvalProgram.length,extraPages:bytecode.extraPages,direct:'exact transfer with treasury paying inner fee',refill:'10 ALGO only below 1 spendable ALGO',legacy:'existing claim remains valid',rejected:failures};fs.writeFileSync(path.join(root,'output/arena-direct-avm.json'),JSON.stringify(result,null,2));console.log(result);
})().catch(e=>{console.error(e.message);process.exitCode=1;});
