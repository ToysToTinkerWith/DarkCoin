// Public reward summaries contain only display data. Claim proofs, delivery
// leases and oracle metadata stay on the server. Possessing a summary does not
// authorize redirecting a transfer: legacy claims require the wallet signature;
// direct rewards always use the recorded recipient after server-verified pickup.
export function rewardSummary(row,claimed){
 const c=row.claim;
 return {source:row.source==='depths'?'depths':'arena',hour:row.hour,claimed,deliveryStatus:row.deliveryStatus,deliveryMode:row.deliveryMode||'legacy',pickedUpAt:row.pickedUpAt,claim:{
  slot:c.slot,rewardAssetId:c.rewardAssetId,amount:String(c.amount),
  decimals:c.decimals,name:c.name,kind:c.kind,image:c.image||null
 }};
}
export async function walletRewardPage(db,client,settings,address,cursor,readBox,encounterKey){
 const collection=db.collection('arenaPrivate');
 let query=collection.where('rewardWallet','==',address).orderBy('__name__').limit(100);
 if(cursor){
  if(!/^loot-reward-\d+-\d+-[0-7]$/.test(cursor))throw new Error('Invalid reward cursor');
  const doc=await collection.doc(cursor).get();
  if(doc.data()?.rewardWallet!==address)throw new Error('Invalid reward cursor');
  query=query.startAfter(doc);
 }
 const docs=await query.get(),boxes=new Map(),rewards=[];
 const rows=docs.docs.map(d=>d.data()).filter(r=>r.appId===settings.appId&&r.lootVersion===2&&Number.isFinite(r.pickedUpAt)&&r.pickedUpAt>0&&r.claim?.rewardAssetId>0&&BigInt(r.claim.amount)>0n);
 // Read each encounter bitmap once, with bounded RPC concurrency.
 const hours=[...new Set(rows.filter(r=>r.deliveryMode!=='direct').map(r=>r.hour))];
 for(let i=0;i<hours.length;i+=8)await Promise.all(hours.slice(i,i+8).map(async hour=>boxes.set(hour,await readBox(client,settings.appId,encounterKey(hour)))));
 for(const row of rows){
  if(row.deliveryMode==='direct'){if(row.deliveryStatus!=='delivered')rewards.push(rewardSummary(row,false));continue;}
  const box=boxes.get(row.hour);
  // Never show an uncommitted allocation as claimable.
  if(!box||box.length<40)continue;
  const claimed=!!(box.readBigUInt64BE(32)&(1n<<BigInt(row.claim.slot)));
  const pickedUpOnChain=!!(box.readBigUInt64BE(32)&(1n<<BigInt(row.claim.slot+8)));
  if(!claimed&&pickedUpOnChain)rewards.push(rewardSummary(row,false));
 }
 return {rewards,cursor:docs.docs.length===100?docs.docs.at(-1).id:null};
}
