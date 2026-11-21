import {LOOT_RULES,validateRules,lootEntries,tokenTierAmount} from './loot';

// The first eligible wallet's odds against a snapshot, before other rolls spend it.
// Return public asset metadata only; never expose the reservation ledger or wallets.
export function lootPreview(inventory,monster='graveclaw',rules=LOOT_RULES){
 validateRules(rules);
 const profile=rules.monsters[monster];if(!profile)throw Error('Unknown monster');
 const entries=lootEntries(inventory,rules),viable=entries.filter(e=>e.c.weight>0&&e.left>=e.min);
 const weights={nft:0,token:0};for(const e of viable)weights[e.kind]+=e.c.weight;
 const nftChance=weights.nft?(weights.token?profile.nftChanceBps/10000:1):0;
 const tokenChance=weights.token?1-nftChance:0;
 return {monster,configuredNftChance:profile.nftChanceBps/10000,nftChance,tokenChance,assets:entries.map(e=>{
  const eligible=viable.includes(e),selectionChance=eligible?(e.kind==='nft'?nftChance:tokenChance)*e.c.weight/weights[e.kind]:0;
  const tiers=e.kind==='token'&&e.c.mode==='percentage'?e.c.tiers.map(t=>{
   const amount=tokenTierAmount(e,t.bps,profile.tokenPercentageDivisor),payable=eligible&&amount<=e.left;
   return {percent:t.bps/profile.tokenPercentageDivisor/100,chance:t.chanceBps/10000,amount:String(amount),payable,rewardChance:payable?selectionChance*t.chanceBps/10000:0};
  }):[];
  // Fixed rewards draw uniformly from the inclusive atomic-unit interval.
  const maximum=BigInt(e.c.maxAtomic),fixedPayable=e.left<maximum?e.left:maximum;
  const fixedChance=e.kind==='token'&&e.c.mode==='fixed'&&eligible?Number(fixedPayable-e.min+1n)/Number(maximum-e.min+1n):0;
  const rewardChance=e.kind==='nft'?selectionChance:tiers.length?tiers.reduce((n,t)=>n+t.rewardChance,0):selectionChance*fixedChance;
  return {id:e.rewardAssetId,name:e.name,unitName:e.unitName,kind:e.kind,decimals:e.decimals,image:e.image||'',available:String(e.available),budget:String(e.left),minimum:String(e.min),maximum:String(maximum),mode:e.c.mode,eligible,selectionChance,rewardChance,tiers};
 }),emptyChance:Math.max(0,1-viable.reduce((n,e)=>{
  const chance=(e.kind==='nft'?nftChance:tokenChance)*e.c.weight/weights[e.kind];
  if(e.kind==='nft')return n+chance;
  if(e.c.mode==='fixed'){const max=BigInt(e.c.maxAtomic),end=e.left<max?e.left:max;return n+chance*Number(end-e.min+1n)/Number(max-e.min+1n);}
  return n+chance*e.c.tiers.reduce((sum,t)=>sum+(tokenTierAmount(e,t.bps,profile.tokenPercentageDivisor)<=e.left?t.chanceBps/10000:0),0);
 },0))};
}
