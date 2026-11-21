const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),path=require('node:path'),http=require('node:http'),fs=require('node:fs');
const algo=require('algosdk'),root=path.resolve(__dirname,'..');
require('esbuild').buildSync({stdin:{contents:['encounters','treasury','loot','reward-publisher','simulation','room-store','realtime-room','tickets','walletProof'].map(name=>`export * from './lib/arena/${name}';`).join('\n'),resolveDir:root},bundle:true,platform:'node',outfile:path.join(root,'tmp/arena-economy-tests.cjs')});
const s={...require('../tmp/arena-economy-tests.cjs')},wallets=Array.from({length:8},()=>algo.generateAccount().addr.toString()),recipients=wallets.map((address,i)=>({address,assetId:1000+i}));
const champion=id=>({id,name:'Fixture',loadout:{skin:'Undead',weapon:'dark_sword'}}),seed='a'.repeat(64),rules=()=>JSON.parse(JSON.stringify(s.LOOT_RULES));
const token=(id=500)=>({rewardAssetId:id,available:'1000000000000',capAtomic:'0',capBps:10000,kind:'token',name:'Token',unitName:'TOK',decimals:6});
const nft=(id=501)=>({...token(id),available:'1',capAtomic:'1',kind:'nft',name:'NFT',decimals:0});
const roll=(options={})=>s.drawLoot({appId:123,hour:100,monster:'cindermaw',recipients,inventory:[token(),nft()],seed,...options});
const legacyPublisher=s.processArenaRewards;s.processArenaRewards=(db,c,deps={})=>legacyPublisher(db,c,{direct:false,...deps});
test('entry is free, playtest always uses Graveclaw, optional hourly schedule preserves DST',()=>{
 assert.equal(s.ARENA_ECONOMY.entryFee,0);assert(!('passDark' in s.ARENA_ECONOMY));
 for(const stamp of ['2026-01-12T02:00:00Z','2026-07-12T01:00:00Z']){const t=Date.parse(stamp)/1000;assert.equal(s.hourlyEncounter(t).kind,'graveclaw');assert.equal(s.hourlyEncounter(t,'hourly').kind,'cindermaw');assert.equal(s.hourlyEncounter(t-1).kind,'graveclaw');assert(!('rewardDark' in s.hourlyEncounter(t)));}
 const old=process.env.ARENA_LOOT_ENABLED;delete process.env.ARENA_LOOT_ENABLED;assert.equal(s.economyConfig().entryFee,0);assert.equal(s.economyConfig().enabled,false);if(old!==undefined)process.env.ARENA_LOOT_ENABLED=old;
});
test('presence at defeat requires damage or a healing move and excludes dead/disconnected wallets',()=>{
 const room=s.createRoom(100,1);s.activateEncounter(room,s.hourlyEncounter(100));
 for(let i=0;i<4;i++){const p=s.addPlayer(room,String(i),champion(i+1));p.rewardAddress=wallets[i];p.connected=true;p.hp=20;}
 s.recordHealingMove(room,room.players['1']);room.players['2'].connected=false;room.players['3'].hp=0;s.scaleMonster(room);room.beast.emergeUntil=0;room.beast.hp=5;s.applyStatus(room,room.players['0'],room.beast,'bleed',4,'weapon');
 for(let i=0;i<60&&room.beast.hp>0;i++)s.advance(room,room.time+1/30);
 assert.equal(room.encounter.status,'defeated');assert.deepEqual(new Set(room.encounter.recipients.map(r=>r.address)),new Set(wallets.slice(0,2)));assert(room.players['1'].hp>20);
 const snapshot=JSON.stringify(s.snapshot(room));for(const w of wallets)assert(!snapshot.includes(w));s.advance(room,111);assert.equal(room.beast.hp,0);
});
test('loot retries are deterministic, participant input ordering does not change the roll',()=>{
 assert.deepEqual(roll(),roll());assert.deepEqual(roll(),roll({recipients:[...recipients].reverse()}));
 assert.notDeepEqual(roll(),roll({seed:'b'.repeat(64)}));assert.throws(()=>roll({recipients:[recipients[0],recipients[0]]}),/unique/);
});
test('NFT can only be allocated once; percentage payouts respect available balance and per-event cap',()=>{
 const r=rules();r.monsters.cindermaw.nftChanceBps=10000;const results=roll({rules:r});assert.equal(results.filter(p=>p.kind==='nft').length,1);assert.equal(results.length,8);assert.equal(results.filter(p=>p.fallback).length,7);
 const totals=s.lootBudgets(results);assert.equal(totals.find(b=>b.assetId===501).amount,'1');assert(BigInt(totals.find(b=>b.assetId===500).amount)<=800000000000n);
 const nftOnly=roll({rules:r,inventory:[nft()]});assert.equal(nftOnly.filter(p=>p.kind==='empty').length,7);
});
test('token fixed ranges and asset-specific weights work with uint64 amounts without precision loss',()=>{
 const r=rules();r.monsters.cindermaw.nftChanceBps=0;r.assets={'500':{mode:'fixed',minTokens:'0',minAtomic:'17',maxAtomic:'23'},'502':{weight:0}};
 const results=roll({rules:r,inventory:[token(),token(502)]});for(const p of results){assert.equal(p.rewardAssetId,500);assert(BigInt(p.amount)>=17n&&BigInt(p.amount)<=23n);}
 const huge=roll({inventory:[{...token(),available:'18446744073709551615'}]});assert(s.lootBudgets(huge).every(p=>BigInt(p.amount)<=18446744073709551615n));
 assert.throws(()=>s.validateRules({...r,monsters:{...r.monsters,cindermaw:{...r.monsters.cindermaw,nftChanceBps:10001}}}));assert.throws(()=>s.validateRules({...r,tokenDefaults:{...r.tokenDefaults,minAtomic:'0'}}));
});
test('Graveclaw has 1 percent NFT odds and the dragon has 5 percent with abundant stock',()=>{
 for(const [monster,chance] of [['graveclaw',0.01],['cindermaw',0.05]]){
  assert.equal(s.economyConfig().monsterRewards[monster].nftChanceBps,chance*10000);
  let count=0;for(let i=0;i<10000;i++){const [p]=roll({monster,recipients:[recipients[0]],seed:crypto.createHash('sha256').update(String(i)).digest('hex')});if(p.kind==='nft')count++;}
  assert(Math.abs(count-10000*chance)<5*Math.sqrt(10000*chance),`${monster} NFT count ${count}`);
 }
});

test('Graveclaw quarters each percentage with exact integer arithmetic and keeps the minimum',()=>{
 const r=rules();r.monsters.graveclaw.nftChanceBps=0;r.monsters.cindermaw.nftChanceBps=0;
 assert.deepEqual(s.economyConfig().monsterRewards.graveclaw.tokenTiers.map(t=>t.bps/100),[0.025,0.125,0.25,1.25,2.5]);
 for(const bps of [10,50,100,500,1000]){
  r.tokenDefaults.tiers=[{bps,chanceBps:10000}];
  const options={rules:r,recipients:[recipients[0]],inventory:[{...token(),available:'18446744073709551615'}]};
  const [g]=roll({...options,monster:'graveclaw'}),[d]=roll({...options,monster:'cindermaw'});
  assert.equal(BigInt(g.amount),18446744073709551615n*BigInt(bps)/40000n);assert.equal(g.percentageBps,bps/4);
  assert.equal(BigInt(d.amount),18446744073709551615n*BigInt(bps)/10000n);
 }
 r.tokenDefaults.tiers=[{bps:10,chanceBps:10000}];
 const [minimum]=roll({rules:r,monster:'graveclaw',inventory:[{...token(),available:'100000000'}],recipients:[recipients[0]]});assert.equal(minimum.amount,'1000000');
 assert.throws(()=>roll({monster:'unknown'}),/Unknown monster/);
 assert.throws(()=>s.validateRules({...r,monsters:{...r.monsters,graveclaw:{nftChanceBps:100,tokenPercentageDivisor:0}}}),/Invalid/);
});

test('weighted token tiers have exact probability boundaries and integrate with saved percentage amounts',()=>{
 const r=rules();r.monsters.cindermaw.nftChanceBps=0;const counts=new Map();
 for(let ticket=0;ticket<10000;ticket++){const bps=s.rollTokenTier(r.tokenDefaults.tiers,bound=>{assert.equal(bound,10000);return BigInt(ticket);});counts.set(bps,(counts.get(bps)||0)+1);}
 assert.deepEqual([...counts],[[10,6000],[50,2500],[100,1000],[500,400],[1000,100]]);
 const observed=new Map();for(let i=0;i<5000;i++){
  const [p]=roll({rules:r,recipients:[recipients[0]],inventory:[token()],seed:crypto.createHash('sha256').update('tiers-'+i).digest('hex')});
  assert.equal(BigInt(p.amount),BigInt(token().available)*BigInt(p.percentageBps)/10000n);observed.set(p.percentageBps,(observed.get(p.percentageBps)||0)+1);
 }
 for(const {bps,chanceBps} of r.tokenDefaults.tiers){const expected=5000*chanceBps/10000;assert(Math.abs(observed.get(bps)-expected)<6*Math.sqrt(expected),`Tier ${bps}: ${observed.get(bps)}`);}
 const bad=rules();bad.tokenDefaults.tiers[0].chanceBps--;assert.throws(()=>s.validateRules(bad),/total/);
});

test('minimum uses whole token units, supports per-asset overrides, and is never paid partially',()=>{
 const r=rules();r.monsters.cindermaw.nftChanceBps=0;r.tokenDefaults.tiers=[{bps:10,chanceBps:10000}];
 for(const decimals of [0,6,19]){const unit=10n**BigInt(decimals),available=decimals===19?unit:8n*unit;
  const results=roll({rules:r,inventory:[{...token(),available:String(available),decimals}]});
  assert(results.filter(p=>p.kind==='token').every(p=>BigInt(p.amount)===unit));
  assert.equal(results.filter(p=>p.kind==='token').length,decimals===19?1:8);
 }
 r.assets={'500':{minTokens:'2.5'}};
 const results=roll({rules:r,inventory:[{...token(),available:'9000000'}]});assert.equal(results.filter(p=>p.kind==='token').length,3);assert(results.filter(p=>p.kind==='token').every(p=>p.amount==='2500000'));
 assert.equal(s.tokenMinimum({...r.tokenDefaults,minTokens:'0',minAtomic:'17'},6),17n);
 assert.throws(()=>s.tokenMinimum({...r.tokenDefaults,minTokens:'0.1'},0),/precision/);
 assert.throws(()=>roll({rules:{...r,assets:{500:{maxAtomic:'1'}}}}),/maximum/);
});

test('ten percent jackpots pay in full; lower admin budgets cannot silently clip or reroll them',()=>{
 const r=rules();r.monsters.cindermaw.nftChanceBps=0;r.tokenDefaults.tiers=[{bps:1000,chanceBps:10000}];
 const results=roll({rules:r,inventory:[token()]});assert.equal(results.length,8);assert(results.every(p=>p.amount==='100000000000'));assert.equal(s.lootBudgets(results)[0].amount,'800000000000');
 const limited=roll({rules:r,inventory:[{...token(),capBps:100}]});assert(limited.every(p=>p.kind==='empty'&&p.percentageBps===1000));
 const absolute=roll({rules:r,inventory:[{...token(),capAtomic:'100000000000'}]});assert.equal(absolute.filter(p=>p.kind==='token').length,1);assert.equal(s.lootBudgets(absolute)[0].amount,'100000000000');
});
test('empty and below-minimum treasuries do not promise nonexistent rewards',()=>{
 assert(roll({inventory:[]}).every(p=>p.kind==='empty'));
 assert(roll({inventory:[{...token(),available:'3'}]}).every(p=>p.kind==='empty'));
 const r=rules();r.tokenDefaults.minAtomic='100';assert(roll({inventory:[{...token(),available:'5000'}],rules:r}).every(p=>p.kind==='empty'));
});
test('Merkle claim binds reward asset as well as recipient, champion, hour and amount',()=>{
 const shares=roll(),tree=s.rewardTree(123,100,shares);
 for(const p of tree.claims){let hash=s.rewardLeaf(123,100,p.slot,p);for(let j=0;j<6;j++){const sibling=Buffer.from(p.proof[j],'hex');hash=crypto.createHash('sha256').update(Buffer.concat((p.slot>>j)&1?[sibling,hash]:[hash,sibling])).digest();}assert.equal(hash.toString('hex'),tree.root);}
 for(const change of [{rewardAssetId:999},{amount:'999'},{assetId:999},{address:wallets.find(w=>w!==shares[0].address)}])assert.notEqual(s.rewardLeaf(123,100,0,{...shares[0],...change}).toString('hex'),s.rewardLeaf(123,100,0,shares[0]).toString('hex'));
 assert.notEqual(s.rewardTree(124,100,shares).root,tree.root);
});
function database(){const data=new Map();let queue=Promise.resolve();const doc=id=>({id,ref:ref(id),exists:data.has(id),data:()=>data.get(id),readTime:{toMillis:()=>100000}}),ref=id=>({id,get:async()=>doc(id)});
 const collection={doc:ref,where:(key,op,value)=>{let limit=Infinity;const query={orderBy:()=>query,limit:n=>(limit=n,query),get:async()=>({docs:[...data.keys()].sort().filter(id=>data.get(id)[key]===value).slice(0,limit).map(doc)})};return query;}};
 return {data,collection:()=>collection,runTransaction(fn){const run=queue.then(async()=>{const writes=[];const result=await fn({get:async r=>doc(r.id),set:(r,v)=>writes.push([r.id,v]),create:(r,v)=>{assert(!data.has(r.id));writes.push([r.id,v]);},update:(r,v)=>writes.push([r.id,{...data.get(r.id),...v}])});for(const [k,v] of writes)data.set(k,v);return result;});queue=run.catch(()=>{});return run;}};
}
test('victory recipient set survives restart and stale checkpoints cannot resurrect monster',async()=>{
 const db=database(),store=new s.FirestoreRoomStore(db,{economy:{enabled:true,appId:123},clock:()=>0});await store.acquire();const hour=s.hourlyEncounter(100);await store.encounter(hour);
 const room=s.createRoom(100,1);s.activateEncounter(room,hour);const old=JSON.parse(JSON.stringify(room));room.encounter.status='defeated';room.encounter.recipients=recipients;await store.checkpoint(room);await store.checkpoint(old);
 const saved=await store.encounter(hour);assert.deepEqual(saved.recipients,recipients);assert.equal(saved.lootQueue,'pending-123');assert.equal(saved.status,'defeated');assert(!saved.shares);
});
test('publication persists rolls before submission and never rerolls an uncertain result',async()=>{
 const db=database(),id='loot-encounter-123-100';db.data.set(id,{id:100,kind:'graveclaw',lootVersion:2,status:'defeated',publishStatus:'pending',lootQueue:'pending-123',recipients});let inventoryCalls=0,attempts=0,first;
 const deps={inventory:async()=>{inventoryCalls++;return [token(),nft()];},randomSeed:()=>seed,publish:async row=>{attempts++;if(!first)first=row.shares;assert.deepEqual(row.shares,first);if(attempts===1)throw new Error('simulated confirmation timeout');return s.rewardTree(123,100,row.shares);}};
 await assert.rejects(s.processArenaRewards(db,{enabled:true,appId:123},deps),/timeout/);assert.equal(db.data.get(id).draw.monster,'graveclaw');assert.deepEqual(first,roll({monster:'graveclaw'}));await s.processArenaRewards(db,{enabled:true,appId:123},deps);assert.equal(inventoryCalls,1);assert.equal(db.data.get(id).publishStatus,'published');assert.equal([...db.data.values()].filter(v=>v.rewardWallet).length,8);
 await s.processArenaRewards(db,{enabled:true,appId:123},deps);assert.equal(attempts,2);
});
test('publisher lease excludes concurrent inventory allocation',async()=>{
 const db=database();db.data.set('loot-encounter-123-100',{id:100,kind:'graveclaw',lootVersion:2,status:'defeated',lootQueue:'pending-123',recipients});let release,started;
 const wait=new Promise(r=>release=r),begun=new Promise(r=>started=r),deps={inventory:async()=>{started();await wait;return [];},randomSeed:()=>seed};
 const first=s.processArenaRewards(db,{enabled:true,appId:123},deps);await begun;assert.equal((await s.processArenaRewards(db,{enabled:true,appId:123},deps)).busy,true);release();await first;assert.equal([...db.data.values()].filter(v=>v.rewardWallet).length,8);
});
test('free reward admission requires server-checked NFT ownership, never a wallet signature or pass',async()=>{
 const {EventEmitter}=require('node:events');class Socket extends EventEmitter{constructor(){super();this.readyState=1;this.bufferedAmount=0;this.messages=[];}send(m){this.messages.push(JSON.parse(m));}close(){this.readyState=3;this.emit('close');}}
 const secret='test-only-secret-'.repeat(4),store={valid:()=>true,epoch:1,claim:async()=>{},checkpoint:async()=>{},results:async()=>{},release:async()=>{}};
 const room=new s.RealtimeRoom({store,secret,economy:{enabled:true},wall:()=>100,clock:()=>0});room.state=s.createRoom(100,1);s.activateEncounter(room.state,{...s.hourlyEncounter(100),status:'waiting',nextSpawnAt:400});store.currentEncounter=async()=>({...s.hourlyEncounter(100),status:'waiting',nextSpawnAt:400,endsAt:400});
 const bad=new Socket();await room.authenticate(room.connect(bad),{ticket:s.issueTicket(champion(1),wallets[0],secret,100)});assert(bad.messages.some(m=>m.type==='fatal'));
 const ticketClaims=s.verifyTicket(s.issueTicket(champion(1),wallets[0],secret,100,undefined,true),secret,100);assert.equal(ticketClaims.ownershipChecked,true);assert(!('walletVerified' in ticketClaims));
 const good=new Socket();await room.authenticate(room.connect(good),{ticket:s.issueTicket(champion(1),wallets[0],secret,100,undefined,true)});assert(good.messages.some(m=>m.type==='welcome'));const p=Object.values(room.state.players)[0];assert.equal(p.rewardAddress,wallets[0]);assert(!('accessUntil' in p));good.close();assert.equal(p.connected,false);
});
test('unsigned treasury creation has no price; registration funds ASA opt-in and storage',()=>{
 const {prepare}=require('../scripts/prepare-arena-treasury.cjs'),params={genesisID:'testnet-v1.0',genesisHash:Buffer.alloc(32).toString('base64'),firstValid:100,lastValid:1100};
 const created=prepare({operation:'create',sender:wallets[0],oracle:wallets[1],params,approvalBase64:'CAE=',clearBase64:'CAE='}),txn=algo.decodeUnsignedTransaction(Buffer.from(created.transactions[0],'base64'));assert.equal(txn.applicationCall.appArgs.length,1);assert.equal(txn.applicationCall.numGlobalInts,2);
 const reg=prepare({operation:'register',sender:wallets[0],appId:123,assetId:501,kind:'nft',params}),txns=reg.transactions.map(t=>algo.decodeUnsignedTransaction(Buffer.from(t,'base64')));assert.equal(txns[0].payment.amount,118900n);assert.equal(Buffer.from(txns[1].applicationCall.appArgs[4]).readBigUInt64BE(),1n);
 assert.equal(Buffer.from(txns[1].applicationCall.appArgs[3]).readBigUInt64BE(),10000n);
 const update={operation:'update',sender:wallets[0],appId:123,params,approvalBase64:'CAE=',clearBase64:'CAE=',existingExtraPages:0};
 const changed=prepare(update),utxn=algo.decodeUnsignedTransaction(Buffer.from(changed.transactions[0],'base64'));
 assert.equal(changed.transactions.length,1);assert.equal(utxn.applicationCall.onComplete,algo.OnApplicationComplete.UpdateApplicationOC);assert.equal(utxn.sender.toString(),wallets[0]);assert.equal(utxn.applicationCall.appIndex,123n);assert(!utxn.rekeyTo);
 assert.deepEqual(Buffer.from(utxn.applicationCall.approvalProgram),Buffer.from('CAE=','base64'));
 assert.throws(()=>prepare({...update,existingExtraPages:undefined}),/existingExtraPages/);
 assert.throws(()=>prepare({...update,approvalBase64:Buffer.alloc(2048).toString('base64')}),/capacity/);
 assert.throws(()=>prepare({operation:'buy',sender:wallets[0],appId:123,params}),/removed/);
});
test('publication provides resources for every reward ASA with exact event storage funding',()=>{
 const shares=roll(),params={genesisID:'testnet-v1.0',genesisHash:new Uint8Array(32),firstValid:100,lastValid:1100},budgets=s.lootBudgets(shares),{txns}=s.publishTransactions({id:100,shares},wallets[0],params,{appId:123});
 assert.equal(txns.length,budgets.length+2);assert.equal(txns[0].payment.amount,BigInt(22100+12500*budgets.length));assert.equal(txns.at(-1).applicationCall.appArgs[3].length,budgets.length*16);for(const t of txns)assert(!t.rekeyTo);
});

test('compiled TEAL update gate permits only creator without rekey; deletion remains denied',()=>{
 // Limited control-flow harness for the emitted admin gate, not an AVM/ledger test.
 const lines=fs.readFileSync(path.join(root,'contracts/arena-treasury/approval.teal'),'utf8').split(/\r?\n/).map(l=>l.split('//')[0].trim()).filter(l=>l&&!l.startsWith('#'));
 const labels=new Map(lines.map((line,index)=>[line.replace(/:$/,''),index]));
 const allowed=(sender,onCompletion='UpdateApplication',rekey='zero')=>{
  const stack=[],constants=[],txn={ApplicationID:123,OnCompletion:({UpdateApplication:4,DeleteApplication:5,NoOp:0})[onCompletion],Sender:sender,RekeyTo:rekey},globals={CreatorAddress:wallets[0],ZeroAddress:'zero'};
  for(let pc=0,steps=0;steps++<100;pc++){
   const [op,arg]=lines[pc].split(' ');if(op.endsWith(':'))continue;
   if(op==='txn')stack.push(txn[arg]);else if(op==='global')stack.push(globals[arg]);else if(op==='int'||op==='pushint')stack.push(/^\d+$/.test(arg)?Number(arg):({UpdateApplication:4,DeleteApplication:5,NoOp:0})[arg]);
   else if(op==='intcblock')constants.push(...lines[pc].split(' ').slice(1).map(Number));
   else if(op==='bytecblock')continue;
   else if(op==='intc'||op.startsWith('intc_'))stack.push(constants[op==='intc'?Number(arg):Number(op.slice(5))]);
   else if(op==='=='){const b=stack.pop(),a=stack.pop();stack.push(Number(a===b));}
   else if(op==='&&'){const b=stack.pop(),a=stack.pop();stack.push(Number(!!a&&!!b));}
   else if(op==='bnz'){if(stack.pop())pc=labels.get(arg);}
   else if(op==='b')pc=labels.get(arg);
   else if(op==='assert'){if(!stack.pop())return false;}
   else if(op==='err')return false;else if(op==='return')return !!stack.pop();
   else throw new Error('Unhandled admin-gate opcode: '+lines[pc]);
  }throw new Error('Admin gate did not terminate');
 };
 assert.equal(allowed(wallets[0]),true);
 for(const other of wallets.slice(1))assert.equal(allowed(other),false);
 assert.equal(allowed(wallets[0],'UpdateApplication',wallets[1]),false);
 assert.equal(allowed(wallets[0],'DeleteApplication'),false);
});
test('inventory excludes reserved/frozen/unregistered assets; claim adds opt-in only when needed',async()=>{
 let opted=false;const server=http.createServer((req,res)=>{res.setHeader('Content-Type','application/json');const notFound=()=>{res.statusCode=404;res.end('{}');};
  if(req.url.startsWith('/v2/applications/123/box')){const raw=Buffer.from(new URL(req.url,'http://local').searchParams.get('name').slice(4),'base64');if(raw[0]!==97)return notFound();const id=Number(raw.readBigUInt64BE(1));if(id===504)return notFound();const value=Buffer.concat([s.u64(id===501?1:100),s.u64(id===501?1:0),s.u64(100),s.u64(id===501?1:0)]);return res.end(JSON.stringify({name:raw.toString('base64'),value:value.toString('base64'),round:100}));}
  if(req.url.startsWith('/v2/applications/'))return res.end(JSON.stringify({id:123,params:{creator:wallets[0],'global-state':['version','paused'].map((key,i)=>({key:Buffer.from(key).toString('base64'),value:{type:2,uint:i?0:2}}))}}));
  if(/\/assets\/500/.test(req.url)&&req.url.startsWith('/v2/accounts/')){if(!opted)return notFound();return res.end(JSON.stringify({'asset-holding':{'asset-id':500,amount:0,'is-frozen':false},round:100}));}
  if(req.url.startsWith('/v2/accounts/'))return res.end(JSON.stringify({address:wallets[0],amount:1000000,'amount-without-pending-rewards':1000000,'min-balance':100000,'pending-rewards':0,rewards:0,round:100,status:'Offline','total-apps-opted-in':0,'total-assets-opted-in':4,'total-created-apps':0,'total-created-assets':0,'apps-total-schema':{'num-byte-slice':0,'num-uint':0},assets:[{ 'asset-id':500,amount:1000,'is-frozen':false},{'asset-id':501,amount:1,'is-frozen':false},{'asset-id':503,amount:1000,'is-frozen':true},{'asset-id':504,amount:1000,'is-frozen':false}]}));
  if(req.url.startsWith('/v2/assets/'))return res.end(JSON.stringify({index:500,params:{creator:wallets[0],decimals:6,total:1000000,name:'Token', 'unit-name':'TOK'}}));
  return res.end(JSON.stringify({'consensus-version':'future',fee:1000,'genesis-hash':Buffer.alloc(32).toString('base64'),'genesis-id':'testnet-v1.0','last-round':1000,'min-fee':1000}));
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{const config={enabled:true,appId:123,algodUrl:`http://127.0.0.1:${server.address().port}`},inventory=await s.treasuryInventory(config);assert.equal(inventory.length,1);assert.equal(inventory[0].available,'900');
  const deferred=await s.treasuryInventory(config,{includeImages:false});assert.equal(deferred[0].available,inventory[0].available);assert.equal(deferred[0].image,'');assert.equal(deferred[0].imageParams.name,'Token');assert.equal(deferred[0].imageParams.creator,wallets[0]);assert.doesNotThrow(()=>JSON.stringify(deferred));
  const claim=s.rewardTree(123,100,[{...recipients[0],rewardAssetId:500,amount:'12'}]).claims[0];let built=await s.claimTransaction(wallets[0],100,claim,config),txns=built.transactions.map(t=>algo.decodeUnsignedTransaction(Buffer.from(t,'base64')));assert.equal(built.requiresOptIn,true);assert.equal(txns.length,3);assert.equal(txns[1].assetTransfer.amount,0n);assert.equal(txns[1].assetTransfer.receiver.toString(),wallets[0]);assert.equal(built.feeMicroAlgo,4000);assert.equal(txns.at(-1).applicationCall.appArgs.length,12);assert(txns.every(t=>!t.rekeyTo));
  opted=true;built=await s.claimTransaction(wallets[0],100,claim,config);assert.equal(built.transactions.length,2);assert.equal(built.minBalanceIncreaseMicroAlgo,0);
 }finally{await new Promise(r=>server.close(r));}
});
