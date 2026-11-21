const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
require('esbuild').buildSync({stdin:{contents:"export * from './lib/arena/loot-preview';export * from './lib/arena/loot';export * from './lib/arena/direct-rewards';export * from './components/arena/playground/loot-amount';",resolveDir:path.resolve(__dirname,'..')},bundle:true,platform:'node',outfile:path.resolve(__dirname,'../tmp/loot-preview-tests.cjs')});
const {lootPreview,drawLoot,LOOT_RULES,subtractDirectReservations,previewTokenAmount}=require('../tmp/loot-preview-tests.cjs');
const token=(id=1088771340)=>({rewardAssetId:id,available:'100000000000',capAtomic:'0',capBps:10000,kind:'token',name:'Dark Coin',unitName:'DARK',decimals:6});
const nft=(id=10)=>({...token(id),kind:'nft',available:'1',decimals:0});
test('DARK only gets all selection rolls, with exact quartered Graveclaw tiers',()=>{const p=lootPreview([token()]);assert.equal(p.nftChance,0);assert.equal(p.tokenChance,1);assert.equal(p.configuredNftChance,.01);assert.equal(p.assets[0].selectionChance,1);assert.deepEqual(p.assets[0].tiers.map(t=>[t.percent,t.chance,t.amount]),[[.025,.6,'25000000'],[.125,.25,'125000000'],[.25,.1,'250000000'],[1.25,.04,'1250000000'],[2.5,.01,'2500000000']]);assert.equal(p.emptyChance,0);});
test('Mixed inventory uses weighted selection inside 1% NFT / 99% token branch',()=>{const rules=structuredClone(LOOT_RULES);rules.assets[11]={weight:3};const p=lootPreview([token(),token(11),nft()], 'graveclaw',rules);assert.equal(p.nftChance,.01);assert.equal(p.assets.find(a=>a.id===11).selectionChance,.99*.75);assert.equal(p.assets.find(a=>a.id===10).selectionChance,.01);});
test('Only NFTs falls back to NFTs; no eligible inventory returns no-payout odds',()=>{assert.equal(lootPreview([nft()]).nftChance,1);assert.equal(lootPreview([]).emptyChance,1);assert.equal(lootPreview([{...token(),available:'999999'}]).emptyChance,1);});
test('Reservations, minimum, and encounter budget reflected without invented payouts',()=>{const rows=subtractDirectReservations([token()],{reserved:{1088771340:'99998000000'}}),p=lootPreview(rows);assert.equal(p.assets[0].available,'2000000');assert(p.assets[0].tiers.every(t=>t.amount==='1000000'));const limited=lootPreview([{...token(),capBps:10}]);assert.equal(limited.assets[0].tiers[0].payable,true);assert(limited.assets[0].tiers.slice(1).every(t=>!t.payable));assert(Math.abs(limited.emptyChance-.4)<1e-10);});
test('Preview amounts match actual seeded reward allocations including minimum/max clamps',()=>{const rules=structuredClone(LOOT_RULES);rules.assets[1088771340]={maxAtomic:'130000000'};const inventory=[token()],p=lootPreview(inventory,'graveclaw',rules);for(let i=0;i<100;i++){const r=drawLoot({appId:1,hour:1,monster:'graveclaw',recipients:[{address:'test',assetId:1}],inventory,seed:i.toString(16).padStart(64,'0'),rules})[0];assert.equal(r.amount,p.assets[0].tiers.find(t=>t.percent===r.percentageBps/100).amount);}});
test('Fixed-mode odds respect a partial payout budget',()=>{const rules=structuredClone(LOOT_RULES);rules.assets[1088771340]={mode:'fixed',minTokens:'0',minAtomic:'1',maxAtomic:'10'};const p=lootPreview([{...token(),available:'100',capAtomic:'5'}],'graveclaw',rules);assert.equal(p.assets[0].rewardChance,.5);assert.equal(p.emptyChance,.5);});
test('Public response exposes no internal reservation metadata',()=>{const p=lootPreview([{...token(),reserved:'123',rewardWallet:'private',imageParams:{secret:'private'}}]);const raw=JSON.stringify(p);assert(!raw.includes('private'));assert(!raw.includes('reserved'));});

test('DARK preview rounds up exactly without altering payout amounts or uint64 precision',()=>{
 const asset={id:1088771340,decimals:6};
 for(const [atomic,expected] of [['0','0'],['1','1'],['1000000','1'],['1000001','2'],['123456123456','123,457'],['18446744073709551615','18,446,744,073,710']])assert.equal(previewTokenAmount(asset,atomic),expected);
 const p=lootPreview([{...token(),available:'123456123456'}]);
 assert.deepEqual(p.assets[0].tiers.map(t=>previewTokenAmount(p.assets[0],t.amount)),['31','155','309','1,544','3,087']);
 assert.equal(p.assets[0].tiers[0].amount,'30864030');
});
test('non-DARK assets keep their original decimal precision',()=>{
 assert.equal(previewTokenAmount({id:11,decimals:6},'1234567'),'1.234567');
 assert.equal(previewTokenAmount({id:12,decimals:0},'1'),'1');
});
