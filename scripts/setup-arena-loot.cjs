// Operator tool: private keys remain in memory/Secret Manager, never in output.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),algo=require('algosdk');
require('dotenv').config({path:path.resolve(__dirname,'../.env.deployment.local'),quiet:true});
const appId=3658640544,project='dark-coin-dc4a3',secret='ARENA_REWARD_ORACLE_MNEMONIC',mode=process.argv[2];
const client=new algo.Algodv2('','https://mainnet-api.algonode.cloud',443);
async function main(){
 if(!['status','secret','enable','pause'].includes(mode))throw Error('Use status, secret, enable, or pause');
 const app=await client.getApplicationByID(appId).do(),globals=Object.fromEntries(app.params.globalState.map(r=>[Buffer.from(r.key).toString(),Number(r.value.type)===1?algo.encodeAddress(r.value.bytes):Number(r.value.uint)]));
 const mnemonic=process.env.DEPLOYMENT_CREATOR_MNEMONIC||process.env.CREATOR_MNEMONIC;
 if(!mnemonic)throw Error('Local creator signer is missing');const signer=algo.mnemonicToSecretKey(mnemonic),address=signer.addr.toString();
 if(address!==app.params.creator.toString()||address!==globals.oracle)throw Error('Local creator must match the deployed creator and oracle');
 if(![2,3].includes(globals.version))throw Error('Expected the migrated v2 treasury');
 if(mode==='status'){const a=await client.accountInformation(address).do();console.log(JSON.stringify({appId,creator:address,oracle:globals.oracle,paused:globals.paused,approvalBytes:app.params.approvalProgram.length,oracleSpendableMicroAlgo:String(a.amount-a.minBalance)}));return;}
 if(mode==='secret'){
  const run=(args,input)=>cp.spawnSync('gcloud.cmd',args,{shell:true,input,encoding:'utf8',windowsHide:true});
  const exists=run(['secrets','describe',secret,'--project='+project,'--format=json']);
  // This setup command is only for the initial secret. Rotation is explicit.
  if(exists.status===0)throw Error('Secret already exists; no private key was replaced');
  const result=run(['secrets','create',secret,'--project='+project,'--replication-policy=automatic','--data-file=-'],mnemonic);
  if(result.status!==0)throw Error('Secret Manager creation failed; inspect service permissions');
  console.log('Configured the verified creator/oracle signer in Secret Manager.');return;
 }
 const value=mode==='enable'?0:1;if((globals.paused%2)===value){console.log('Treasury already '+(value?'paused':'enabled'));return;}
 if(mode==='enable'&&!Buffer.from(app.params.approvalProgram).includes(Buffer.from('claim_for')))throw Error('Install the sponsored pickup contract before enabling rewards');
 const params=await client.getTransactionParams().do(),arg=Buffer.alloc(8);arg.writeBigUInt64BE(BigInt(value));
 const txn=algo.makeApplicationNoOpTxnFromObject({sender:address,appIndex:appId,appArgs:[Buffer.from('pause'),arg],suggestedParams:{...params,flatFee:true,fee:1000}});
 const sim=await client.simulateTransactions(new algo.modelsv2.SimulateRequest({allowEmptySignatures:true,txnGroups:[new algo.modelsv2.SimulateRequestTransactionGroup({txns:[algo.decodeSignedTransaction(algo.encodeUnsignedSimulateTransaction(txn))]})]})).do();
 if(sim.txnGroups[0].failureMessage)throw Error('Pause setting simulation failed');
 await client.sendRawTransaction(txn.signTxn(signer.sk)).do();const confirmed=await algo.waitForConfirmation(client,txn.txID(),5);
 console.log(JSON.stringify({appId,paused:value,txid:txn.txID(),round:String(confirmed.confirmedRound)}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
