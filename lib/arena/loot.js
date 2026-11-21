import crypto from 'node:crypto';
import defaults from './loot-rules.json';
export const LOOT_RULES=defaults;
const MAX=18446744073709551615n;
const atomic=n=>{if(!/^\d+$/.test(String(n)))throw new Error('Loot amounts must be atomic-unit integers');const v=BigInt(n);if(v>MAX)throw new Error('Loot amount exceeds uint64');return v;};
const integer=(v,min,max)=>{if(!Number.isSafeInteger(v)||v<min||v>max)throw new Error('Invalid loot odds or limits');return v;};
// Human token units are converted exactly using the ASA's decimals, never floats.
export function tokenMinimum(c,decimals){
 integer(decimals,0,19);
 const [whole,fraction='']=String(c.minTokens??'0').split('.');
 if(!/^\d+(\.\d+)?$/.test(String(c.minTokens??'0'))||fraction.length>decimals)throw new Error('Token minimum exceeds asset decimal precision');
 const human=atomic(whole+fraction.padEnd(decimals,'0')),minimum=atomic(c.minAtomic);
 return human>minimum?human:minimum;
}
export function rollTokenTier(tiers,random){
 let ticket=Number(random(10000));
 for(const tier of tiers){ticket-=tier.chanceBps;if(ticket<0)return tier.bps;}
 throw new Error('Token tier probabilities must total 10000');
}
export function validateRules(rules=defaults){
 for(const kind of ['graveclaw','cindermaw']){
  const profile=rules.monsters?.[kind];if(!profile)throw new Error('Missing monster loot profile');
  integer(profile.nftChanceBps,0,10000);integer(profile.tokenPercentageDivisor,1,10000);
 }
 for(const c of [rules.tokenDefaults,...Object.values(rules.assets||{}).map(a=>({...rules.tokenDefaults,...a}))]){
  integer(c.weight,0,1000000);integer(c.encounterCapBps,0,10000);
  if(!['fixed','percentage'].includes(c.mode))throw new Error('Unknown loot amount mode');
  if(!/^\d+(\.\d+)?$/.test(String(c.minTokens??'0')))throw new Error('Invalid token minimum');
  if(c.mode==='percentage'){
   if(!Array.isArray(c.tiers)||!c.tiers.length)throw new Error('Token percentage tiers required');
   let total=0,previous=0;for(const tier of c.tiers){integer(tier.bps,previous+1,10000);integer(tier.chanceBps,1,10000);previous=tier.bps;total+=tier.chanceBps;}
   if(total!==10000)throw new Error('Token tier probabilities must total 10000');
  }
  const min=atomic(c.minAtomic),max=atomic(c.maxAtomic);if(min<1n||max&&max<min||c.mode==='fixed'&&!max)throw new Error('Invalid loot amount bounds');
 }
 return rules;
}
// Rejection sampling avoids modulo bias; a saved seed makes retries identical.
export function seededRandom(seed,context){
 if(!/^[a-f0-9]{64}$/.test(seed))throw new Error('Expected a 256-bit random seed');let counter=0;
 return bound=>{bound=BigInt(bound);if(bound<1n||bound>1n<<256n)throw new Error('Invalid random bound');const space=1n<<256n,limit=space-space%bound;let value;
  do{value=BigInt('0x'+crypto.createHmac('sha256',Buffer.from(seed,'hex')).update(`${context}:${counter++}`).digest('hex'));}while(value>=limit);return value%bound;};
}
// Shared inventory eligibility and exact payout arithmetic for allocation and public odds.
export function lootEntries(inventory,rules=defaults){return inventory.map(item=>{
  const c={...rules.tokenDefaults,...rules.assets?.[item.rewardAssetId]},available=atomic(item.available),cap=available*BigInt(Math.min(c.encounterCapBps,item.capBps))/10000n;
  const min=item.kind==='nft'?1n:tokenMinimum(c,item.decimals),max=atomic(c.maxAtomic);
  if(item.kind==='token'&&max&&max<min)throw new Error('Token maximum is below its minimum');
  return {...item,c,min,available,left:item.kind==='nft'?available:(item.capAtomic!=='0'&&atomic(item.capAtomic)<cap?atomic(item.capAtomic):cap)};
 }).sort((a,b)=>a.rewardAssetId-b.rewardAssetId);}
export function tokenTierAmount(entry,baseBps,divisor){
 let amount=entry.available*BigInt(baseBps)/(10000n*BigInt(divisor));
 const max=atomic(entry.c.maxAtomic);
 if(amount<entry.min)amount=entry.min;if(max&&amount>max)amount=max;
 return amount;
}
export function drawLoot({appId,hour,monster,recipients,inventory,seed,rules=defaults}){
 validateRules(rules);if(recipients.length>8||new Set(recipients.map(r=>r.address)).size!==recipients.length)throw new Error('Loot supports eight unique wallets per victory');
 if(!['graveclaw','cindermaw'].includes(monster))throw new Error('Unknown monster loot profile');
 const profile=rules.monsters[monster];
 const random=seededRandom(seed,`DCL2:${appId}:${hour}`),entries=lootEntries(inventory,rules);
 const people=[...recipients].sort((a,b)=>a.address.localeCompare(b.address));
 // Random priority avoids always giving the alphabetically first wallet scarce NFTs.
 for(let i=people.length-1;i>0;i--){const j=Number(random(i+1));[people[i],people[j]]=[people[j],people[i]];}
 const results=[];
 for(const person of people){
  const viable=e=>e.c.weight>0&&e.left>=e.min;
  const wanted=Number(random(10000))<profile.nftChanceBps?'nft':'token';let pool=entries.filter(e=>e.kind===wanted&&viable(e)),fallback=false;
  if(!pool.length){fallback=true;pool=entries.filter(e=>e.kind!==wanted&&viable(e));}
  if(!pool.length){results.push({...person,amount:'0',rewardAssetId:0,kind:'empty',reason:'Treasury inventory is exhausted or below its configured payout minimum.'});continue;}
  let pick=Number(random(pool.reduce((n,e)=>n+e.c.weight,0))),selected;
  for(const e of pool){pick-=e.c.weight;if(pick<0){selected=e;break;}}
  let amount=1n,percentageBps=null;
  if(selected.kind==='token'){
   const c=selected.c,min=selected.min,max=atomic(c.maxAtomic);
   if(c.mode==='fixed')amount=min+random(max-min+1n);
   else{
    const baseBps=rollTokenTier(c.tiers,random);
    // Divide with integers before rounding to atomic units: 10 bps / 4 is 0.025%.
    amount=tokenTierAmount(selected,baseBps,profile.tokenPercentageDivisor);
    percentageBps=baseBps/profile.tokenPercentageDivisor;
   }
   if(amount<min)amount=min;if(max&&amount>max)amount=max;
   // Do not silently turn a rare large roll into a smaller tier or sub-minimum payout.
   if(amount>selected.left){results.push({...person,amount:'0',rewardAssetId:0,kind:'empty',percentageBps,selectedRewardAssetId:selected.rewardAssetId,reason:'The rolled reward exceeds the remaining treasury payout budget. No smaller payout or reroll was substituted.'});continue;}
  }
  selected.left-=amount;
  results.push({...person,rewardAssetId:selected.rewardAssetId,amount:amount.toString(),kind:selected.kind,name:selected.name,unitName:selected.unitName,decimals:selected.decimals,image:selected.image||'',fallback,percentageBps});
 }
 return results.sort((a,b)=>a.address.localeCompare(b.address));
}
export function lootBudgets(claims){
 const totals=new Map();for(const c of claims)if(c.rewardAssetId&&BigInt(c.amount)>0n)totals.set(c.rewardAssetId,(totals.get(c.rewardAssetId)||0n)+BigInt(c.amount));
 return [...totals].sort((a,b)=>a[0]-b[0]).map(([assetId,amount])=>({assetId,amount:amount.toString()}));
}
