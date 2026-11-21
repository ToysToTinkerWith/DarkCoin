// Unsigned AVM tests using temporary ledger fixtures inside simulation only.
// This file never loads secrets, signs, or submits a transaction.
const fs=require('node:fs'),path=require('node:path'),algo=require('algosdk');
const root=path.resolve(__dirname,'..');
require('esbuild').buildSync({stdin:{contents:"export * from './lib/arena/treasury'; export * from './lib/arena/reward-delivery';",resolveDir:root},bundle:true,platform:'node',outfile:path.join(root,'tmp/pickup-avm.cjs'),external:['algosdk']});
const s=require('../tmp/pickup-avm.cjs');
async function main(){
 const appId=3658640544,assetId=1088771340,client=new algo.Algodv2('','https://mainnet-api.algonode.cloud',443);
 const app=await client.getApplicationByID(appId).do(),sender=app.params.creator.toString(),params={...await client.getTransactionParams().do(),flatFee:true,fee:1000};
 const {readDeploymentPrograms,compileDeploymentBytecode}=await import('../contracts/deployment-programs.mjs');
 const bytecode=await compileDeploymentBytecode(client,readDeploymentPrograms());
 if(bytecode.extraPages>Number(app.params.extraProgramPages||0))throw new Error('Program exceeds deployed capacity');
 const hour=Math.floor(Date.now()/3600000),recipient=sender;
 const tree=s.rewardTree(appId,hour,[{address:recipient,assetId:123, rewardAssetId:assetId,amount:'1'}]),row={hour,claim:tree.claims[0],rewardWallet:recipient};
 const hex=b=>Buffer.from(b).toString('hex');
 // Install fixture code only in the simulated ledger, populate reserved reward
 // boxes, then replace it with the EXACT production approval/clear bytecode.
 const fixture=`#pragma version 9
txn Sender
global CreatorAddress
==
assert
txn OnCompletion
int UpdateApplication
==
bnz approved
byte 0x${hex(s.encounterKey(hour))}
byte 0x${tree.root}${'00'.repeat(8)}
box_put
byte 0x${hex(s.assetKey(assetId))}
byte 0x${hex(Buffer.concat([s.u64(1),s.u64(0),s.u64(10000),s.u64(0)]))}
box_put
byte 0x${hex(s.budgetKey(hour,assetId))}
byte 0x${hex(s.u64(1))}
box_put
approved:
int 1
return`;
 const fixtureCode=Buffer.from((await client.compile(fixture).do()).result,'base64');
 const update=program=>algo.makeApplicationCallTxnFromObject({sender,appIndex:appId,onComplete:algo.OnApplicationComplete.UpdateApplicationOC,approvalProgram:program,clearProgram:bytecode.clearProgram,
  numGlobalInts:2,numGlobalByteSlices:1,extraPages:Math.max(bytecode.extraPages,Number(app.params.extraProgramPages||0)),suggestedParams:params});
 const initialize=()=>algo.makeApplicationNoOpTxnFromObject({sender,appIndex:appId,boxes:[s.encounterKey(hour),s.assetKey(assetId),s.budgetKey(hour,assetId)].map(name=>({appIndex:0,name})),suggestedParams:params});
 const fixtureGroup=()=>[update(fixtureCode),initialize(),update(bytecode.approvalProgram),...s.sponsoredClaimTransactions(row,sender,params,{appId})];
 async function simulate(txns){txns.forEach(t=>t.group=undefined);algo.assignGroupID(txns);return (await client.simulateTransactions(new algo.modelsv2.SimulateRequest({allowEmptySignatures:true,txnGroups:[new algo.modelsv2.SimulateRequestTransactionGroup({txns:txns.map(t=>algo.decodeSignedTransaction(algo.encodeUnsignedSimulateTransaction(t)))})]})).do()).txnGroups[0];}
 const valid=await simulate(fixtureGroup());if(valid.failureMessage)throw new Error(valid.failureMessage);
 const paid=valid.txnResults.at(-1).txnResult.innerTxns?.[0]?.txn?.txn?.assetTransfer;
 if(!paid||paid.receiver.toString()!==recipient||paid.amount!==1n)throw new Error('Expected exact transfer to assigned recipient');
 const rejected=[];
 for(const [name,change] of [
  ['wrong recipient',txns=>txns.at(-1).applicationCall.accounts[0]=algo.getApplicationAddress(appId)],
  ['wrong amount',txns=>txns.at(-1).applicationCall.appArgs[5]=s.u64(2)],
  ['duplicate claim',txns=>txns.push(...s.sponsoredClaimTransactions(row,sender,params,{appId}))],
  ['non-oracle',txns=>txns.at(-1).sender=algo.getApplicationAddress(appId)],
 ]){const txns=fixtureGroup();change(txns);const result=await simulate(txns);if(!result.failureMessage)throw new Error(`Unsafe claim accepted: ${name}`);rejected.push(name);}
 // Manual claims must fail before pickup, even with the correct public proof.
 const manual=()=>s.sponsoredClaimTransactions(row,sender,params,{appId}).map(t=>{if(Buffer.from(t.applicationCall.appArgs[0]).toString()==='claim_for'){t.applicationCall.appArgs[0]=Buffer.from('claim');t.applicationCall.accounts=[];}return t;});
 const base=()=>[update(fixtureCode),initialize(),update(bytecode.approvalProgram)];
 const locked=await simulate([...base(),...manual()]);if(!locked.failureMessage)throw new Error('Manual claim bypassed pickup');rejected.push('manual claim before pickup');
 const unlocked=await simulate([...base(),s.pickupAuthorizationTransaction(row,sender,params,{appId}),...manual()]);if(unlocked.failureMessage)throw new Error(unlocked.failureMessage);
 const wrongPickup=s.pickupAuthorizationTransaction(row,algo.getApplicationAddress(appId),params,{appId});
 const unauthorized=await simulate([...base(),wrongPickup,...manual()]);if(!unauthorized.failureMessage)throw new Error('Non-oracle authorized pickup');rejected.push('non-oracle pickup');
 const retry=s.pickupAuthorizationTransaction(row,sender,params,{appId});retry.note=Buffer.from('retry');
 const twice=await simulate([...base(),s.pickupAuthorizationTransaction(row,sender,params,{appId}),retry,...manual()]);if(twice.failureMessage)throw new Error('Pickup retry must be idempotent: '+twice.failureMessage);
 // Funding is now a shared subroutine: exercise publication through it too.
 const clearing=fixture.replace(`byte 0x${tree.root}${'00'.repeat(8)}\nbox_put`,'box_del\npop');
 const clearingCode=Buffer.from((await client.compile(clearing).do()).result,'base64');
 const publication=s.publishTransactions({id:hour,shares:[{...row.claim}]},sender,params,{appId});
 const published=await simulate([publication.txns[0],update(clearingCode),initialize(),update(bytecode.approvalProgram),...publication.txns.slice(1)]);
 if(!published.failureMessage)throw new Error('Retired encounter publication must be rejected by v3');
 const result={appId,publication:'retired encounter publication rejected',pickupGate:'manual claim blocked until oracle pickup; retry idempotent',approvalBytes:bytecode.approvalProgram.length,extraPages:bytecode.extraPages,recipient,valid:'exact assigned transfer passed in simulated ledger',rejected,submitted:false};
 fs.writeFileSync(path.join(root,'output/arena-pickup-avm.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
