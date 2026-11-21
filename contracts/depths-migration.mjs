import algosdk from 'algosdk';
import crypto from 'node:crypto';

export const DEPTHS_APP_ID=3658640544;
export const DEPTHS_APPROVAL_SHA256='fa7f6744859316acfcdc15b0e99f1af77231b33ca18e77781ba5f20dfd304786';
export const SIZE_UPDATE_PROTOCOL='https://github.com/algorandfoundation/specs/tree/268b63433a907455d439995bf916f6b296018f4f';
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const u64=n=>{const b=Buffer.alloc(8);b.writeBigUInt64BE(BigInt(n));return b;};

export function isDepthsMigration(appId,programs,app){
 return appId===DEPTHS_APP_ID&&programs.source==='ArenaTreasury.py'&&sha(app.params.approvalProgram)===DEPTHS_APPROVAL_SHA256;
}

export async function prepareDepthsMigration({algod,appId,programs,app,sender,oracleAddress,bytecode,params}){
 if(!isDepthsMigration(appId,programs,app))throw new Error('Migration only supports the verified Depths contract at 3658640544.');
 if(String(app.params.creator)!==String(sender))throw new Error('Only the Depths creator can migrate this application.');
 if(params.genesisID!=='mainnet-v1.0')throw new Error('The verified Depths migration requires mainnet.');
 if(params.consensusVersion!==SIZE_UPDATE_PROTOCOL)throw new Error('Unverified network protocol: this migration requires the verified v42 size-update rules.');
 if(!algosdk.isValidAddress(oracleAddress)||oracleAddress===algosdk.encodeAddress(new Uint8Array(32)))throw new Error('Set ARENA_REWARD_ORACLE_ADDRESS to the reward publisher public address before migrating.');
 if((app.params.globalState||[]).length)throw new Error('Depths now has global state; inspect it before migrating.');
 const address=algosdk.getApplicationAddress(appId).toString();
 const [account,boxList]=await Promise.all([algod.accountInformation(address).do(),algod.getApplicationBoxes(appId).max(1000).do()]);
 if(boxList.boxes?.length||boxList.nextToken)throw new Error('Depths contains legacy reward records. Settle or explicitly migrate them before replacing its code.');
 const assets=(account.assets||[]).map(h=>Number(h.assetId));
 if(assets.length>4)throw new Error('More than four existing asset holdings require a reviewed multi-batch registry migration.');
 if(assets.some(a=>!Number.isSafeInteger(a)||a<1))throw new Error('Invalid existing asset ID.');
 const required=BigInt(account.minBalance)+18900n*BigInt(assets.length);
 if(BigInt(account.amount)<required)throw new Error(`Fund the existing app with ${required-BigInt(account.amount)} microALGO for registry storage before migrating.`);
 // Use the generic application-call constructor: the SDK update helper discards
 // schema/page fields. Local schema stays unchanged; v42 only resizes globals.
 const suggestedParams={...params,flatFee:true,fee:Number(params.minFee||1000)};
 const update=algosdk.makeApplicationCallTxnFromObject({sender:String(sender),appIndex:appId,onComplete:algosdk.OnApplicationComplete.UpdateApplicationOC,
  approvalProgram:bytecode.approvalProgram,clearProgram:bytecode.clearProgram,numGlobalInts:programs.schema.globalInts,numGlobalByteSlices:programs.schema.globalBytes,
  extraPages:Math.max(Number(app.params.extraProgramPages||0),bytecode.extraPages),suggestedParams});
 const initialize=algosdk.makeApplicationNoOpTxnFromObject({sender:String(sender),appIndex:appId,appArgs:[Buffer.from('initialize'),algosdk.decodeAddress(oracleAddress).publicKey],foreignAssets:assets,
  boxes:assets.map(id=>({appIndex:0,name:Buffer.concat([Buffer.from('a'),u64(id)])})),suggestedParams});
 const txns=[update,initialize];algosdk.assignGroupID(txns);
 return {txns,summary:{appId,address,oracleAddress,assets,registryStorageMicroAlgo:String(18900n*BigInt(assets.length)),feeMicroAlgo:2*suggestedParams.fee,startsPaused:true}};
}

export async function simulateDeployment(algod,txns){
 const request=new algosdk.modelsv2.SimulateRequest({allowEmptySignatures:true,txnGroups:[new algosdk.modelsv2.SimulateRequestTransactionGroup({txns:txns.map(txn=>algosdk.decodeSignedTransaction(algosdk.encodeUnsignedSimulateTransaction(txn)))})]});
 const result=await algod.simulateTransactions(request).do();
 if(result.txnGroups?.length!==1||result.txnGroups[0].failureMessage)throw new Error(`Deployment simulation failed: ${result.txnGroups?.[0]?.failureMessage||'no result'}. Nothing was signed or submitted.`);
 return result;
}
