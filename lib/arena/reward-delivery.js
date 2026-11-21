import {processDirectPickup} from './direct-rewards';
import crypto from 'node:crypto';
import algosdk from 'algosdk';
import {economyConfig,treasuryClient,readBox,encounterKey,assetKey,budgetKey,u64} from './treasury';

export function sponsoredClaimTransactions(row,sender,params,config){
 const c=row.claim;if(c.address!==row.rewardWallet||!algosdk.isValidAddress(c.address)||!c.rewardAssetId||BigInt(c.amount)<=0n)throw new Error('Invalid assigned reward');
 const suggestedParams={...params,lastValid:BigInt(params.firstValid)+40n,flatFee:true,fee:1000};
 const txns=[algosdk.makeApplicationNoOpTxnFromObject({sender,appIndex:config.appId,appArgs:[Buffer.from('budget')],suggestedParams}),
  algosdk.makeApplicationNoOpTxnFromObject({sender,appIndex:config.appId,accounts:[c.address],
   appArgs:[Buffer.from('claim_for'),u64(row.hour),u64(c.slot),u64(c.assetId),u64(c.rewardAssetId),u64(c.amount),...c.proof.map(h=>Buffer.from(h,'hex'))],
   foreignAssets:[c.rewardAssetId],boxes:[encounterKey(row.hour),assetKey(c.rewardAssetId),budgetKey(row.hour,c.rewardAssetId)].map(name=>({appIndex:0,name})),suggestedParams:{...suggestedParams,fee:2000}})];
 algosdk.assignGroupID(txns);return txns;
}

// The oracle records pickup in bits 8..15 of the existing encounter bitmap.
// This is idempotent, uses no new box storage, and cannot transfer an asset.
export function pickupAuthorizationTransaction(row,sender,params,config){
 return algosdk.makeApplicationNoOpTxnFromObject({sender,appIndex:config.appId,
  appArgs:[Buffer.from('pickup'),u64(row.hour),u64(row.claim.slot)],
  boxes:[{appIndex:0,name:encounterKey(row.hour)}],
  suggestedParams:{...params,lastValid:BigInt(params.firstValid)+40n,flatFee:true,fee:1000}});
}
async function authorizeSavedPickup(row,config,{client,mnemonic,beforeSubmit,box}){
 if(box.readBigUInt64BE(32)&(1n<<BigInt(row.claim.slot+8)))return true;
 if(row.pickupTxid&&row.pickupLastValid){
  const status=await client.status().do();
  if(BigInt(status.lastRound)<=BigInt(row.pickupLastValid))return false;
 }
 if(!mnemonic)throw new Error('Reward delivery signer is not configured');
 const signer=algosdk.mnemonicToSecretKey(mnemonic),params=await client.getTransactionParams().do();
 const txn=pickupAuthorizationTransaction(row,signer.addr.toString(),params,config);
 const result=await client.simulateTransactions(new algosdk.modelsv2.SimulateRequest({allowEmptySignatures:true,txnGroups:[new algosdk.modelsv2.SimulateRequestTransactionGroup({txns:[algosdk.decodeSignedTransaction(algosdk.encodeUnsignedSimulateTransaction(txn))]})]})).do();
 if(result.txnGroups?.length!==1||result.txnGroups[0].failureMessage)throw new Error('Pickup authorization simulation failed');
 await beforeSubmit({pickupTxid:txn.txID(),pickupLastValid:String(txn.lastValid)});
 await client.sendRawTransaction(txn.signTxn(signer.sk)).do();
 await algosdk.waitForConfirmation(client,txn.txID(),3);return true;
}

export async function deliverPickup(row,config,{beforeSubmit,client=treasuryClient(config),mnemonic=process.env.ARENA_REWARD_ORACLE_MNEMONIC}={}){
 if(!Number.isFinite(row.pickedUpAt)||row.pickedUpAt<=0)throw new Error('Reward has not been picked up');
 const c=row.claim,box=await readBox(client,config.appId,encounterKey(row.hour));
 if(!box||box.length!==40)throw new Error('Reward has not been published on chain');
 if(box.readBigUInt64BE(32)&(1n<<BigInt(c.slot)))return {status:'delivered',txid:row.deliveryTxid||null};
 // Never replace an uncertain, still-valid transaction. It can still land.
 if(row.deliveryTxid&&row.deliveryLastValid){
  const status=await client.status().do();
  if(BigInt(status.lastRound)<=BigInt(row.deliveryLastValid))return {status:'pending',txid:row.deliveryTxid};
 }
 let holding,savedReason;
 try{holding=(await client.accountAssetInformation(c.address,c.rewardAssetId).do()).assetHolding;}
 catch(e){if(e.status===404||e.response?.status===404)savedReason='opt_in_required';else throw e;}
 if(holding?.isFrozen)savedReason='asset_frozen';
 if(savedReason){
  const authorized=await authorizeSavedPickup(row,config,{client,mnemonic,beforeSubmit,box});
  return authorized?{status:'saved',reason:savedReason}:{status:'pending',reason:'pickup_confirmation'};
 }
 if(!mnemonic)throw new Error('Reward delivery signer is not configured');
 const signer=algosdk.mnemonicToSecretKey(mnemonic),params=await client.getTransactionParams().do();
 const txns=sponsoredClaimTransactions(row,signer.addr.toString(),params,config);
 const request=new algosdk.modelsv2.SimulateRequest({allowEmptySignatures:true,txnGroups:[new algosdk.modelsv2.SimulateRequestTransactionGroup({txns:txns.map(t=>algosdk.decodeSignedTransaction(algosdk.encodeUnsignedSimulateTransaction(t)))})]});
 const result=await client.simulateTransactions(request).do();if(result.txnGroups?.length!==1||result.txnGroups[0].failureMessage)throw new Error('Reward delivery simulation failed');
 const txid=txns[0].txID();await beforeSubmit({deliveryTxid:txid,deliveryLastValid:String(txns[0].lastValid)});
 await client.sendRawTransaction(txns.map(t=>t.signTxn(signer.sk))).do();
 await algosdk.waitForConfirmation(client,txid,3);return {status:'delivered',txid};
}

export async function processArenaPickup(db,id,config=economyConfig(),dependencies={}){
 if(!config.enabled||!/^loot-reward-\d+-\d+-[0-7]$/.test(id))return;
 const direct=(await db.collection('arenaPrivate').doc(id).get()).data();
 if(direct?.deliveryMode==='direct')return processDirectPickup(db,id,config,dependencies);
 const clock=dependencies.clock||Date.now,owner=crypto.randomUUID(),ref=db.collection('arenaPrivate').doc(id);
 const row=await db.runTransaction(async tx=>{
  const row=(await tx.get(ref)).data();
  if(!row||row.appId!==config.appId||row.lootVersion!==2||!row.pickedUpAt||row.deliveryQueue!==`pickup-${config.appId}`||row.deliveryUntil>clock())return null;
  tx.update(ref,{deliveryLease:owner,deliveryUntil:clock()+90000});return row;
 });if(!row)return;
 const fenced=async fields=>db.runTransaction(async tx=>{const current=(await tx.get(ref)).data();if(current?.deliveryLease!==owner||current.deliveryUntil<=clock())throw new Error('Delivery lease expired');tx.update(ref,fields);});
 try{
  const result=await (dependencies.deliver||deliverPickup)(row,config,{beforeSubmit:fields=>fenced(fields)});
  await fenced({deliveryStatus:result.status,deliveryReason:result.reason||null,deliveryTxid:result.txid||row.deliveryTxid||null,
   deliveryQueue:result.status==='pending'?`pickup-${config.appId}`:null,deliveryUntil:0});return result;
 }catch(e){
  // Keep the persisted claim and pending tx ID. The scheduled retry reconciles
  // the on-chain claim bit before attempting another submission.
  await fenced({deliveryStatus:'pending',deliveryUntil:0}).catch(()=>{});throw e;
 }
}
export async function retryArenaPickups(db,config=economyConfig()){
 if(!config.enabled)return;
 const docs=await db.collection('arenaPrivate').where('deliveryQueue','==',`pickup-${config.appId}`).limit(8).get();
 for(const doc of docs.docs)try{await processArenaPickup(db,doc.id,config);}catch(e){console.error('arena_pickup_pending',doc.id,e.message);}
}
