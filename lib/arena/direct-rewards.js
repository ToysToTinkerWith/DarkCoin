import {queueNotice} from './encounter-schedule';
import crypto from 'node:crypto';
import algosdk from 'algosdk';
import {treasuryClient,assetKey,u64} from './treasury';

export const REFILL_THRESHOLD=1000000n,REFILL_AMOUNT=10000000n;
export const directLedgerId=appId=>`loot-direct-ledger-${appId}`;
export async function directState(client,appId){
 const app=await client.getApplicationByID(appId).do();
 const g=Object.fromEntries((app.params.globalState||[]).map(r=>[Buffer.from(r.key).toString(),Number(r.value.type)===1?Buffer.from(r.value.bytes):BigInt(r.value.uint)]));
 return {version:g.version,paused:!!(g.paused&1n),sequence:g.paused>>1n,creator:app.params.creator.toString(),oracle:algosdk.encodeAddress(g.oracle)};
}
// One shared lease protects inventory snapshots, reservations and direct payouts.
export async function withTreasuryLease(db,config,fn,clock=Date.now){
 const ref=db.collection('arenaPrivate').doc(`loot-publisher-${config.appId}`),owner=crypto.randomUUID();
 const ok=await db.runTransaction(async tx=>{const d=(await tx.get(ref)).data();if(d?.until>clock())return false;tx.set(ref,{owner,until:clock()+120000});return true;});
 if(!ok)return {busy:true};
 const fence=async tx=>{const d=(await tx.get(ref)).data();if(d?.owner!==owner||d.until<=clock())throw Error('Treasury lease expired');};
 try{return await fn(fence);}finally{await db.runTransaction(async tx=>{if((await tx.get(ref)).data()?.owner===owner)tx.set(ref,{owner,until:0});});}
}
export function subtractDirectReservations(items,ledger){
 for(const [id,amount] of Object.entries(ledger?.reserved||{}))if(BigInt(amount)>0n&&!items.some(i=>String(i.rewardAssetId)===id))throw Error('Reserved reward asset missing from treasury inventory');
 return items.map(item=>{const reserved=BigInt(ledger?.reserved?.[item.rewardAssetId]||0),available=BigInt(item.available);if(reserved>available)throw Error('Treasury inventory is below pending reward obligations');return {...item,available:String(available-reserved)};}).filter(i=>BigInt(i.available)>0n);
}
export function directTransactions(op,sender,params,config){
 const fee=Number(params.minFee||1000),suggestedParams={...params,lastValid:BigInt(params.firstValid)+40n,flatFee:true,fee};
 if(op.kind==='refill'){
  const txns=[algosdk.makePaymentTxnWithSuggestedParamsFromObject({sender,receiver:algosdk.getApplicationAddress(config.appId),amount:REFILL_AMOUNT,suggestedParams}),algosdk.makeApplicationNoOpTxnFromObject({sender,appIndex:config.appId,appArgs:[Buffer.from('refill'),u64(op.sequence)],suggestedParams})];algosdk.assignGroupID(txns);return txns;
 }
 return [algosdk.makeApplicationNoOpTxnFromObject({sender,appIndex:config.appId,appArgs:[Buffer.from('pay_direct'),u64(op.sequence),u64(op.assetId),u64(op.amount)],accounts:[op.address],foreignAssets:[op.assetId],boxes:[{appIndex:0,name:assetKey(op.assetId)}],suggestedParams})];
}
async function simulate(client,txns){
 const r=await client.simulateTransactions(new algosdk.modelsv2.SimulateRequest({allowEmptySignatures:true,txnGroups:[new algosdk.modelsv2.SimulateRequestTransactionGroup({txns:txns.map(t=>algosdk.decodeSignedTransaction(algosdk.encodeUnsignedSimulateTransaction(t)))})]})).do();
 if(r.txnGroups?.length!==1||r.txnGroups[0].failureMessage)throw Error('Direct treasury simulation failed: '+(r.txnGroups?.[0]?.failureMessage||'missing result'));
}
// Durable single-operation outbox. Its sequence can succeed on-chain only once,
// even if a worker expires, a confirmation is lost, or a signed retry is delayed.
export async function settleDirectOperation(db,config,fence,{client=treasuryClient(config),mnemonic=process.env.ARENA_REWARD_ORACLE_MNEMONIC}={}){
 const collection=db.collection('arenaPrivate'),ref=collection.doc(directLedgerId(config.appId));
 let ledger=(await ref.get()).data()||{reserved:{}};let op=ledger.operation;if(!op)return true;
 let state=await directState(client,config.appId);const sequence=BigInt(op.sequence);
 if(state.version!==3n)throw Error('Direct treasury contract is not activated');
 if(state.sequence!==sequence&&state.sequence!==sequence+1n)throw Error('Treasury sequence mismatch; operator reconciliation required');
 if(state.sequence===sequence+1n&&!op.txid)throw Error('Unrecognized treasury sequence advance');
 if(state.sequence===sequence){
  if(!mnemonic)throw Error('Reward signer is not configured');const signer=algosdk.mnemonicToSecretKey(mnemonic);
  if(signer.addr.toString()!==state.oracle||(op.kind==='refill'&&state.creator!==state.oracle))throw Error('Treasury signer mismatch');
  const status=await client.status().do();
  if(op.kind==='refill'&&(!op.transactions||BigInt(status.lastRound)>BigInt(op.lastValid))){
   const account=await client.accountInformation(algosdk.getApplicationAddress(config.appId)).do();
   if(BigInt(account.amount)-BigInt(account.minBalance)>=REFILL_THRESHOLD){
    // An operator may have funded it meanwhile. Once old signed txns expire,
    // discard the unnecessary refill instead of blocking reward delivery.
    await db.runTransaction(async tx=>{await fence(tx);const current=(await tx.get(ref)).data();if(current?.operation?.sequence!==op.sequence)throw Error('Outbox changed');tx.update(ref,{operation:null});});return true;
   }
  }
  if(!op.transactions||BigInt(status.lastRound)>BigInt(op.lastValid)){
   const params=await client.getTransactionParams().do(),txns=directTransactions(op,signer.addr.toString(),params,config);await simulate(client,txns);
   op={...op,transactions:txns.map(t=>Buffer.from(algosdk.encodeUnsignedTransaction(t)).toString('base64')),txid:txns[0].txID(),lastValid:String(txns[0].lastValid)};
   await db.runTransaction(async tx=>{await fence(tx);const fresh=(await tx.get(ref)).data();if(fresh?.operation?.sequence!==op.sequence)throw Error('Outbox changed');tx.update(ref,{operation:op});});
  }
  await db.runTransaction(fence);
  const txns=op.transactions.map(t=>algosdk.decodeUnsignedTransaction(Buffer.from(t,'base64')));
  try{await client.sendRawTransaction(txns.map(t=>t.signTxn(signer.sk))).do();await algosdk.waitForConfirmation(client,op.txid,3);}catch(e){
   state=await directState(client,config.appId);if(state.sequence===sequence)return false;if(state.sequence!==sequence+1n)throw e;
  }
  state=await directState(client,config.appId);if(state.sequence!==sequence+1n)return false;
 }
 await db.runTransaction(async tx=>{
  await fence(tx);const current=(await tx.get(ref)).data();if(!current?.operation)return;if(current.operation.sequence!==op.sequence)throw Error('Outbox changed');
  const reserved={...current.reserved};let rewardRef,reward;
  if(op.kind==='reward'){
   rewardRef=collection.doc(op.rewardId);reward=(await tx.get(rewardRef)).data();
   if(!reward||reward.deliveryMode!=='direct'||reward.claim.amount!==op.amount||reward.rewardWallet!==op.address||!reward.pickedUpAt)throw Error('Reward/outbox mismatch');
   const remaining=BigInt(reserved[op.assetId]||0)-BigInt(op.amount);if(remaining<0n)throw Error('Negative reward reservation');reserved[op.assetId]=String(remaining);
  }
  tx.update(ref,{reserved,operation:null,lastSequence:String(sequence+1n),lastTxid:op.txid||null});
  if(rewardRef)queueNotice(tx,db,op.rewardId+'-delivered',{kind:'reward',source:reward.source==='depths'?'depths':'arena',address:op.address,assetId:op.assetId,amount:op.amount,name:reward.claim.name||'Asset',decimals:reward.claim.decimals||0,txid:op.txid});
  if(rewardRef)tx.update(rewardRef,{deliveryStatus:'delivered',deliveryQueue:null,deliveryUntil:0,deliveryTxid:op.txid||null,deliveredAt:Date.now()});
 });return true;
}
export async function maintainDirectTreasury(db,config,fence,deps={}){
 const client=deps.client||treasuryClient(config);
 if(!await settleDirectOperation(db,config,fence,{...deps,client}))return false;
 const state=await directState(client,config.appId);if(state.version!==3n)return true;
 const account=await client.accountInformation(algosdk.getApplicationAddress(config.appId)).do();
 if(BigInt(account.amount)-BigInt(account.minBalance)>=REFILL_THRESHOLD)return true;
 const ref=db.collection('arenaPrivate').doc(directLedgerId(config.appId));
 await db.runTransaction(async tx=>{await fence(tx);const ledger=(await tx.get(ref)).data()||{reserved:{}};if(ledger.operation)throw Error('Pending treasury operation');tx.set(ref,{...ledger,operation:{kind:'refill',sequence:String(state.sequence),amount:String(REFILL_AMOUNT)}});});
 return settleDirectOperation(db,config,fence,{...deps,client});
}
export async function processDirectPickup(db,id,config,deps={}){
 return withTreasuryLease(db,config,async fence=>{
  const client=deps.client||treasuryClient(config),ref=db.collection('arenaPrivate').doc(id);
  // Reconcile older operations before considering another reward or a refill.
  if(!await settleDirectOperation(db,config,fence,{...deps,client}))return {status:'pending'};
  const row=(await ref.get()).data();if(!row||row.appId!==config.appId||row.deliveryMode!=='direct'||!row.pickedUpAt)return;
  if(row.deliveryStatus==='delivered')return {status:'delivered'};
  const c=row.claim;if(c.address!==row.rewardWallet||!algosdk.isValidAddress(c.address)||BigInt(c.amount)<=0n)throw Error('Invalid direct reward');
  let reason;
  try{if((await client.accountAssetInformation(c.address,c.rewardAssetId).do()).assetHolding.isFrozen)reason='asset_frozen';}catch(e){if(e.status===404||e.response?.status===404)reason='opt_in_required';else throw e;}
  if(reason){await db.runTransaction(async tx=>{await fence(tx);tx.update(ref,{deliveryStatus:'saved',deliveryReason:reason,deliveryQueue:null});});return {status:'saved',reason};}
  if(!await maintainDirectTreasury(db,config,fence,{...deps,client}))return {status:'pending'};
  const state=await directState(client,config.appId);if(state.version!==3n||state.paused)throw Error('Direct rewards are paused or not activated');
  const ledgerRef=db.collection('arenaPrivate').doc(directLedgerId(config.appId));
  await db.runTransaction(async tx=>{await fence(tx);const ledger=(await tx.get(ledgerRef)).data();const reward=(await tx.get(ref)).data();if(ledger?.operation||reward.deliveryStatus==='delivered')throw Error('Reward state changed');if(BigInt(ledger?.reserved?.[c.rewardAssetId]||0)<BigInt(c.amount))throw Error('Missing reward reservation');tx.update(ledgerRef,{operation:{kind:'reward',sequence:String(state.sequence),rewardId:id,assetId:c.rewardAssetId,amount:String(c.amount),address:c.address}});});
  return {status:await settleDirectOperation(db,config,fence,{...deps,client})?'delivered':'pending'};
 },deps.clock||Date.now);
}
