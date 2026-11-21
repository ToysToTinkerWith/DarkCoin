import crypto from 'node:crypto';
import algosdk from 'algosdk';
import {lootBudgets,LOOT_RULES} from './loot';
import {lootAssetImage} from './loot-images';
export const u64=value=>{const b=Buffer.alloc(8);b.writeBigUInt64BE(BigInt(value));return b;};
export const encounterKey=hour=>Buffer.concat([Buffer.from('e'),u64(hour)]);
export const assetKey=assetId=>Buffer.concat([Buffer.from('a'),u64(assetId)]);
export const budgetKey=(hour,assetId)=>Buffer.concat([Buffer.from('b'),u64(hour),u64(assetId)]);
const digest=data=>crypto.createHash('sha256').update(data).digest();
export function rewardLeaf(appId,hour,slot,p){return digest(Buffer.concat([Buffer.from('DCL2'),u64(appId),u64(hour),u64(slot),Buffer.from(algosdk.decodeAddress(p.address).publicKey),u64(p.assetId),u64(p.rewardAssetId),u64(p.amount)]));}
export function rewardTree(appId,hour,shares){
 if(shares.length>8)throw new Error('Too many encounter recipients');
 const levels=[Array.from({length:64},(_,i)=>i<shares.length?rewardLeaf(appId,hour,i,shares[i]):digest(Buffer.from('DCL2-empty-'+i)))];
 while(levels.at(-1).length>1){const a=levels.at(-1);levels.push(Array.from({length:a.length/2},(_,i)=>digest(Buffer.concat([a[i*2],a[i*2+1]]))));}
 return {root:levels.at(-1)[0].toString('hex'),claims:shares.map((p,slot)=>({...p,slot,proof:levels.slice(0,-1).map((l,i)=>l[(slot>>i)^1].toString('hex'))}))};
}
export function economyConfig(){
 const enabled=process.env.ARENA_LOOT_ENABLED==='true',appId=Number(process.env.ARENA_TREASURY_APP_ID||0),algodUrl=process.env.ARENA_ALGOD_URL||'https://mainnet-api.algonode.cloud';
 if(enabled&&(!Number.isSafeInteger(appId)||appId<1))throw new Error('Arena loot treasury is not configured');
 const monsterRewards=Object.fromEntries(Object.entries(LOOT_RULES.monsters).map(([kind,p])=>[kind,{nftChanceBps:p.nftChanceBps,tokenTiers:LOOT_RULES.tokenDefaults.tiers.map(t=>({...t,bps:t.bps/p.tokenPercentageDivisor}))}]));
 return {enabled,appId,algodUrl,entryFee:0,monsterRewards,tokenMinimum:LOOT_RULES.tokenDefaults.minTokens};
}
export function treasuryClient(config=economyConfig()){return new algosdk.Algodv2(process.env.ARENA_ALGOD_TOKEN||'',config.algodUrl,new URL(config.algodUrl).port);}
export async function verifyTreasury(config=economyConfig()){
 const app=await treasuryClient(config).getApplicationByID(config.appId).do();
 const globals=Object.fromEntries((app.params.globalState||[]).map(r=>[Buffer.from(r.key).toString(),Number(r.value.type)===1?Buffer.from(r.value.bytes):BigInt(r.value.uint)]));
 if(![2n,3n].includes(globals.version))throw new Error('The arena requires a v2 multi-asset loot treasury');
 if((globals.paused&1n)!==0n)throw new Error('New loot publication is paused');return globals;
}
export async function readBox(client,appId,name){try{return Buffer.from((await client.getApplicationBoxByName(appId,name).do()).value);}catch(e){if(e.status===404||e.response?.status===404)return null;throw e;}}
export async function treasuryInventory(config=economyConfig(),{includeImages=true}={}){
 await verifyTreasury(config);const client=treasuryClient(config),address=algosdk.getApplicationAddress(config.appId).toString(),account=await client.accountInformation(address).do(),inventory=[];
 const holdings=(account.assets||[]).filter(h=>!h.isFrozen&&BigInt(h.amount)>0n);
 async function inspect(holding){
  const rewardAssetId=Number(holding.assetId),box=await readBox(client,config.appId,assetKey(rewardAssetId));if(!box||box.length!==32)return null;
  const reserved=box.readBigUInt64BE(0);if(BigInt(holding.amount)<=reserved)return null;
  const asset=await client.getAssetByID(rewardAssetId).do(),kind=box.readBigUInt64BE(8)===1n?'nft':'token';
  if(kind==='nft'&&(BigInt(asset.params.total)!==1n||Number(asset.params.decimals)!==0))throw new Error('Invalid NFT registry entry');
  return {rewardAssetId,available:(BigInt(holding.amount)-reserved).toString(),reserved:reserved.toString(),kind,capBps:Number(box.readBigUInt64BE(16)),capAtomic:box.readBigUInt64BE(24).toString(),name:asset.params.name||`Asset ${rewardAssetId}`,unitName:asset.params.unitName||'',decimals:Number(asset.params.decimals),image:includeImages?await lootAssetImage(rewardAssetId,asset.params):'',...(!includeImages?{imageParams:{url:asset.params.url||'',reserve:asset.params.reserve?.toString()||'',creator:asset.params.creator?.toString()||'',name:asset.params.name||''}}:{})};
 }
 // Bound concurrency: large NFT collections must not become a serial RPC queue
 // or flood the node. Any failed read aborts the draw instead of implying empty stock.
 for(let i=0;i<holdings.length;i+=8)inventory.push(...(await Promise.all(holdings.slice(i,i+8).map(inspect))).filter(Boolean));
 return inventory;
}
const encoded=txns=>{if(txns.length>1)algosdk.assignGroupID(txns);return txns.map(t=>Buffer.from(algosdk.encodeUnsignedTransaction(t)).toString('base64'));};
export async function claimTransaction(address,hour,claim,config=economyConfig()){
 if(claim.address!==address||!claim.rewardAssetId||BigInt(claim.amount)<=0n)throw new Error('No asset reward belongs to this wallet');
 const client=treasuryClient(config),params=await client.getTransactionParams().do();let optedIn=true;
 try{await client.accountAssetInformation(address,claim.rewardAssetId).do();}catch(e){if(e.status===404||e.response?.status===404)optedIn=false;else throw e;}
 const txns=[algosdk.makeApplicationNoOpTxnFromObject({sender:address,appIndex:config.appId,appArgs:[Buffer.from('budget')],suggestedParams:{...params,flatFee:true,fee:1000}})];if(!optedIn)txns.push(algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({sender:address,receiver:address,assetIndex:claim.rewardAssetId,amount:0,suggestedParams:{...params,flatFee:true,fee:1000}}));
 txns.push(algosdk.makeApplicationNoOpTxnFromObject({sender:address,appIndex:config.appId,appArgs:[Buffer.from('claim'),u64(hour),u64(claim.slot),u64(claim.assetId),u64(claim.rewardAssetId),u64(claim.amount),...claim.proof.map(s=>Buffer.from(s,'hex'))],foreignAssets:[claim.rewardAssetId],boxes:[encounterKey(hour),assetKey(claim.rewardAssetId),budgetKey(hour,claim.rewardAssetId)].map(name=>({appIndex:0,name})),suggestedParams:{...params,flatFee:true,fee:2000}}));
 return {transactions:encoded(txns),requiresOptIn:!optedIn,feeMicroAlgo:optedIn?3000:4000,minBalanceIncreaseMicroAlgo:optedIn?0:100000};
}
export function publishTransactions(result,sender,params,config){
 const tree=rewardTree(config.appId,result.id,result.shares),budgets=lootBudgets(tree.claims);if(!budgets.length)throw new Error('Empty loot allocation');
 const fee={...params,flatFee:true,fee:1000},txns=[algosdk.makePaymentTxnWithSuggestedParamsFromObject({sender,receiver:algosdk.getApplicationAddress(config.appId),amount:22100+12500*budgets.length,suggestedParams:fee})];
 // AVM v9 shares these references and opcode budget with the final publish.
 for(const b of budgets)txns.push(algosdk.makeApplicationNoOpTxnFromObject({sender,appIndex:config.appId,appArgs:[Buffer.from('budget')],foreignAssets:[b.assetId],boxes:[assetKey(b.assetId),budgetKey(result.id,b.assetId)].map(name=>({appIndex:0,name})),suggestedParams:fee}));
 txns.push(algosdk.makeApplicationNoOpTxnFromObject({sender,appIndex:config.appId,appArgs:[Buffer.from('publish'),u64(result.id),Buffer.from(tree.root,'hex'),Buffer.concat(budgets.flatMap(b=>[u64(b.assetId),u64(b.amount)]))],boxes:[{appIndex:0,name:encounterKey(result.id)}],suggestedParams:fee}));
 algosdk.assignGroupID(txns);return {txns,tree};
}
// Only consumes a persisted draw. Retrying never generates new randomness.
export async function publishReward(result,config=economyConfig()){
 const client=treasuryClient(config),tree=rewardTree(config.appId,result.id,result.shares),existing=await readBox(client,config.appId,encounterKey(result.id));
 if(existing){if(existing.subarray(0,32).toString('hex')!==tree.root)throw new Error('Encounter root mismatch; manual investigation required');return tree;}
 await verifyTreasury(config);
 if(!process.env.ARENA_REWARD_ORACLE_MNEMONIC)throw new Error('Loot publisher signer is not configured');
 const account=algosdk.mnemonicToSecretKey(process.env.ARENA_REWARD_ORACLE_MNEMONIC),params=await client.getTransactionParams().do(),{txns}=publishTransactions(result,account.addr.toString(),params,config);
 const {txid}=await client.sendRawTransaction(txns.map(t=>t.signTxn(account.sk))).do();await algosdk.waitForConfirmation(client,txid,6);return {...tree,txid};
}
