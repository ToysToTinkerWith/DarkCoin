export function rewardKey(r){return `${r.hour}-${r.claim.slot}`;}
export function groupWalletRewards(rows){
 const groups=new Map();
 for(const r of rows){
  const c=r.claim;
  if(!Number.isFinite(r.pickedUpAt)||r.pickedUpAt<=0||r.claimed||!c?.rewardAssetId||BigInt(c.amount)<=0n||['queued','pending','delivered'].includes(r.deliveryStatus))continue;
  let g=groups.get(c.rewardAssetId);
  if(!g){g={...c,amount:0n,rewards:[]};groups.set(c.rewardAssetId,g);}
  g.amount+=BigInt(c.amount);g.rewards.push(r);
 }
 return [...groups.values()];
}
export function rewardAmount(atomic,decimals=0){
 const raw=String(atomic).padStart(decimals+1,'0');
 if(!decimals)return raw;
 const fraction=raw.slice(-decimals).replace(/0+$/,'');
 return raw.slice(0,-decimals)+(fraction?'.'+fraction:'');
}
