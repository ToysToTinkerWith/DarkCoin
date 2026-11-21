const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const esbuild=require('esbuild'),root=path.resolve(__dirname,'..');
esbuild.buildSync({stdin:{resolveDir:root,contents:"export * from './lib/arena/wallet-rewards';export * from './components/connect/wallet-rewards';"},bundle:true,platform:'node',outfile:path.join(root,'tmp/wallet-rewards-test.cjs')});
const s=require('../tmp/wallet-rewards-test.cjs');
const row=(hour,slot=0,id=5)=>({appId:123,hour,pickedUpAt:1,lootVersion:2,rewardWallet:'wallet',deliveryStatus:'saved',deliveryLease:'private-lease',claim:{slot,rewardAssetId:id,amount:'12345678912345678',name:'Token',decimals:6,address:'wallet',proof:['private-proof']}});
function database(rows){const docs=rows.map((r,i)=>({id:`loot-reward-123-${r.hour}-${r.claim.slot}`,data:()=>r}));return {collection:()=>({doc:id=>({get:async()=>docs.find(d=>d.id===id)||{data:()=>null}}),where:(_,__,address)=>{let limit=100,start=0;const filtered=docs.filter(d=>d.data().rewardWallet===address);const q={orderBy:()=>q,limit:n=>(limit=n,q),startAfter:doc=>(start=filtered.findIndex(d=>d.id===doc.id)+1,q),get:async()=>({docs:filtered.slice(start,start+limit)})};return q;}})};}
const bitmap=(claimed=0n)=>{const b=Buffer.alloc(40);b.writeBigUInt64BE(claimed|0xff00n,32);return b;};
test('public rewards omit claims already redeemed on chain and all private delivery/proof fields',async()=>{
 const rows=[row(1,0),row(1,1),row(2),{...row(3),rewardWallet:'other'}, {...row(4),appId:999}],reads=[];
 const result=await s.walletRewardPage(database(rows),null,{appId:123},'wallet',null,async(_,__,h)=>{reads.push(h);return h===1?bitmap(1n):null;},h=>h);
 assert.deepEqual(reads,[1,2]);assert.equal(result.rewards.length,1);assert.equal(result.rewards[0].claim.slot,1);assert.equal(result.rewards[0].claim.amount,'12345678912345678');
 assert(!JSON.stringify(result).includes('private'));assert(!JSON.stringify(result).includes('wallet'));assert.equal(result.cursor,null);
});
test('all pages contribute to a distinct-asset badge; totals retain uint64 precision',async()=>{
 const db=database(Array.from({length:101},(_,i)=>row(100+i,0,i===100?6:5))),read=async()=>bitmap();
 const first=await s.walletRewardPage(db,null,{appId:123},'wallet',null,read,h=>h);assert.equal(first.rewards.length,100);assert(first.cursor);
 const next=await s.walletRewardPage(db,null,{appId:123},'wallet',first.cursor,read,h=>h);assert.equal(next.rewards.length,1);assert.equal(next.cursor,null);
 const groups=s.groupWalletRewards([...first.rewards,...next.rewards]);assert.equal(groups.length,2);assert.equal(groups[0].amount,1234567891234567800n);assert.equal(s.rewardAmount(groups[0].amount,6),'1234567891234.5678');
 await assert.rejects(s.walletRewardPage(db,null,{appId:123},'other',first.cursor,read,h=>h),/Invalid reward cursor/);
});
test('delivered, claimed, empty and actively auto-delivering rewards do not inflate claim badge',()=>{
 const r=row(1);const groups=s.groupWalletRewards([r,{...row(2),claimed:true},{...row(3),deliveryStatus:'pending'},{...row(4),deliveryStatus:'queued'},{...row(5),deliveryStatus:'delivered'},row(6,0,0)]);
 assert.equal(groups.length,1);assert.equal(groups[0].rewards.length,1);
});

test('uncollected drops never appear as wallet rewards or badges',async()=>{
 const unpicked={...row(1),pickedUpAt:undefined},db=database([unpicked]);let reads=0;
 const result=await s.walletRewardPage(db,null,{appId:123},'wallet',null,async()=>{reads++;return bitmap();},h=>h);
 assert.deepEqual(result.rewards,[]);assert.equal(reads,0);assert.deepEqual(s.groupWalletRewards([unpicked]),[]);
 const locked=await s.walletRewardPage(database([row(2)]),null,{appId:123},'wallet',null,async()=>Buffer.alloc(40),h=>h);assert.deepEqual(locked.rewards,[]);
});

test('direct rewards need no chain boxes and preserve pickup and delivery filters',async()=>{
 const rows=[{...row(1),deliveryMode:'direct'},{...row(2),deliveryMode:'direct',deliveryStatus:'delivered'},{...row(3),deliveryMode:'direct',pickedUpAt:undefined}];
 const r=await s.walletRewardPage(database(rows),null,{appId:123},'wallet',null,async()=>{throw Error('No box reads for direct rewards');},h=>h);
 assert.equal(r.rewards.length,1);assert.equal(r.rewards[0].deliveryMode,'direct');assert(!JSON.stringify(r).includes('private'));
});
