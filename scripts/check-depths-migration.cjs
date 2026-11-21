// Public read/compile/simulate only. No secret loading, signing, or broadcasting.
const fs=require('node:fs'),path=require('node:path');
async function main(){
 const {default:algosdk}=await import('algosdk');
 const {readDeploymentPrograms,compileDeploymentBytecode}=await import('../contracts/deployment-programs.mjs');
 const {prepareDepthsMigration,simulateDeployment,DEPTHS_APP_ID}=await import('../contracts/depths-migration.mjs');
 const oracleAddress=process.argv[2];if(!algosdk.isValidAddress(oracleAddress))throw new Error('Usage: node scripts/check-depths-migration.cjs PUBLIC_ORACLE_ADDRESS');
 const algod=new algosdk.Algodv2('','https://mainnet-api.algonode.cloud',443),programs=readDeploymentPrograms();
 const app=await algod.getApplicationByID(DEPTHS_APP_ID).do(),params=await algod.getTransactionParams().do();
 const bytecode=await compileDeploymentBytecode(algod,programs);
 const migration=await prepareDepthsMigration({algod,appId:DEPTHS_APP_ID,programs,app,sender:String(app.params.creator),oracleAddress,bytecode,params});
 const simulation=await simulateDeployment(algod,migration.txns);
 // Exercise the initialization guards against the real AVM without submitting.
 const rejected=[];
 for(const [name,mutate] of [
  ['invalid oracle length',txns=>txns[1].applicationCall.appArgs[1]=new Uint8Array(31)],
  ['omitted existing asset registry',txns=>{txns[1].applicationCall.foreignAssets=[];txns[1].applicationCall.boxes=[];}],
  ['extra initialization call',txns=>txns.push(algosdk.decodeUnsignedTransaction(algosdk.encodeUnsignedTransaction(txns[1])))],
 ]){
  const txns=migration.txns.map(t=>algosdk.decodeUnsignedTransaction(algosdk.encodeUnsignedTransaction(t)));
  mutate(txns);txns.forEach(t=>t.group=undefined);algosdk.assignGroupID(txns);
  try{await simulateDeployment(algod,txns);}catch(error){if(!error.message.startsWith('Deployment simulation failed:'))throw error;rejected.push(name);continue;}
  throw new Error(`Unsafe simulation accepted: ${name}`);
 }
 const output={summary:migration.summary,rejected,approvalBytes:bytecode.approvalProgram.length,clearBytes:bytecode.clearProgram.length,extraPages:bytecode.extraPages,simulation};
 fs.writeFileSync(path.resolve('output/depths-migration-simulation.json'),JSON.stringify(output,(_k,v)=>typeof v==='bigint'?String(v):v,2));
 console.log(JSON.stringify({summary:migration.summary,rejected,approvalBytes:bytecode.approvalProgram.length,extraPages:bytecode.extraPages,simulation:'passed',submitted:false},null,2));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
