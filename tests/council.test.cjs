const test=require('node:test'),assert=require('node:assert/strict'),sdk=require('algosdk'),nacl=require('tweetnacl');
const m=require('../functions/council/model'),{makeQuote,sha}=require('../functions/council/content'),{membershipTree}=require('../functions/council/membership');
const {buildCouncilGroup,sendCouncilGroup}=require('../lib/councilTransactions');
const account=sdk.generateAccount(),sender=String(account.addr),signer=nacl.sign.keyPair.fromSeed(new Uint8Array(32).fill(2));
const config={...m.protocol.defaults,appId:1234,version:3,ready:true,next:'1',revision:'1',network:'testnet',quoteSigner:sdk.encodeAddress(signer.publicKey),host:sender,executor:sender};
const params={minFee:1000n,fee:0n,firstValid:100n,lastValid:1100n,genesisHash:new Uint8Array(32)};
const client={getTransactionParams:()=>({do:async()=>params})};
const proposal={id:'1',state:0,deadline:Math.floor(Date.now()/1000)+1000,textVerified:true,rewardPerVote:'7181',actions:[]};
const input={title:'Improve the marketplace',body:'Add a button that hides listings owned by the connected wallet.',images:[],actions:[]};
const build=(action,input,extra={})=>buildCouncilGroup({config,sender,action,input,client,proposals:[proposal],...extra});
test('pricing allocates 40/40/20 in microALGO and respects every duration boundary',()=>{
  const p={title:'',body:Array(400).fill('word').join(' '),images:[{}]};
  assert.deepEqual(m.quoteProposal(p),{words:400,images:1,effectiveWords:650,days:14,duration:1209600,fee:'20000000',host:'8000000',voters:'8000000',treasury:'4000000'});
  for(const [words,days]of [[1,7],[250,7],[251,14],[1000,14],[1001,30]])assert.equal(m.quoteProposal({body:Array(words).fill('x').join(' ')}).days,days);
  assert.equal(m.quoteProposal({body:'x',images:[{caption:'caption words'}]}).words,3);
  assert.equal(m.quoteProposal({body:'x',images:[{}]}).days,14);
  for(let words=0;words<10000;words+=127){const q=m.quoteProposal({body:Array(words).fill('x').join(' ')});assert.equal(BigInt(q.host)+BigInt(q.voters)+BigInt(q.treasury),BigInt(q.fee));}
});
test('60 percent and 50 distinct NFT turnout use exact integer arithmetic; all abstain never passes',()=>{
  const p={yes:30,no:20,abstain:0,minVotes:50,approvalBps:6000,rewardPool:'8000000',rewardPerVote:'7181',rewardPaid:'359050',eligibleMembers:'1114',deadline:0};
  assert.equal(m.tally(p).passes,true);assert.equal(m.tally({...p,yes:29}).passes,false);
  assert.equal(m.tally({...p,yes:3,no:2,abstain:45}).passes,true);
  assert.equal(m.tally({...p,yes:0,no:0,abstain:50}).passes,false);
  assert.equal(m.tally(p).reward,'7181');assert.equal(m.tally({...p,yes:60,no:40}).reward,'7181');
  for(let turnout=1;turnout<1115;turnout++){const paid=7181n*BigInt(turnout),t=m.tally({...p,yes:turnout,no:0,rewardPaid:String(paid)});assert.equal(paid+BigInt(t.rewardRemaining)+BigInt(t.dust),8000000n);}
});
test('canonical manifests preserve original instructions and bind image captions and treasury actions',()=>{
  const p=m.normalizeProposal({...input,images:[{hash:'a'.repeat(64),caption:'Use this image.'}],actions:[{kind:0,asset:1088771340,amount:'25000000000',recipient:sender}]});
  assert.equal(p.body,input.body);assert.equal(p.actions[0].amount,'25000000000');assert.notEqual(sha(JSON.stringify(p)),sha(JSON.stringify({...p,images:[]})));
  for(const actions of [[{kind:0,amount:0,recipient:sender}],[{kind:1,asset:0}],[{kind:2,asset:1,outputAsset:1,amount:1,pool:sender}],[{kind:9}]])assert.throws(()=>m.normalizeProposal({...input,actions}));
});
test('quote signatures bind the app, sender, content, fee and policy revision',async()=>{
  const q=makeQuote(input,{config,sender,secretKey:signer.secretKey});
  assert(nacl.sign.detached.verify(m.signedQuoteBytes(q.quote),Buffer.from(q.quote.signature,'hex'),signer.publicKey));
  for(const change of [{appId:999},{sender:String(sdk.generateAccount().addr)},{revision:'2'},{fee:'1'},{words:999},{digest:'f'.repeat(64)}])assert(!nacl.sign.detached.verify(m.signedQuoteBytes({...q.quote,...change}),Buffer.from(q.quote.signature,'hex'),signer.publicKey));
  const group=await build('propose',q);assert.equal(group.txns.length,6);assert.equal(group.paymentAmount,q.quote.fee);
  assert.equal(group.txns[0].payment.amount,BigInt(q.quote.fee));assert.equal(group.txns[1].payment.amount,BigInt(m.PROPOSAL_MBR));
  await assert.rejects(build('propose',{...q,manifest:{...q.manifest,body:q.manifest.body+' hacked'}}),/content changed/);
  await assert.rejects(build('propose',q,{config:{...config,revision:'2'}}),/quote expired or changed/);
});
test('multiple NFT ballots are individually canonical; changes do not fund a second ballot box',async()=>{
  const tree=membershipTree([101,102,103]),nft=tree.proof(101);
  const first=await build('vote',{id:'1',nft,choice:1});assert.equal(first.storage,m.VOTE_MBR);assert.equal(first.txns.length,4);
  assert.equal(first.rewardAmount,'7181');assert.equal(first.txns.at(-1).fee,2000n);assert.equal(first.networkFee,'5000');
  const change=await build('vote',{id:'1',nft,choice:2},{votes:[{proposalId:'1',nftId:101}]});assert.equal(change.storage,0);assert.equal(change.txns[0].payment.amount,0n);
  assert.equal(change.rewardAmount,'0');assert.equal(change.networkFee,'4000');
  assert.equal(first.txns.at(-1).applicationCall.appArgs[1].length,8);
  assert.equal(first.txns.at(-1).applicationCall.appArgs[2].length,8);
  assert.throws(()=>membershipTree([1,1]));
});
test('claims use proposal and NFT keys and no action may execute on an unpassed proposal',async()=>{
  const group=await build('claim',{id:'1',assetId:101});assert.equal(group.txns.length,3);
  assert.equal(group.rewardAmount,'0');assert.equal(group.refundAmount,String(m.VOTE_MBR));
  assert.equal(group.txns.at(-1).applicationCall.appArgs[0].toString(),Buffer.from('claim').toString());
  await assert.rejects(build('execute',{id:'1',index:0}),/passed actions/);
  const passed={...proposal,state:1,actions:[m.normalizeAction({kind:0,asset:1088771340,amount:1,recipient:sender})]};
  const payment=await build('execute',{id:'1',index:0},{proposals:[passed]});assert.equal(payment.txns.length,4);
  assert.deepEqual(Buffer.from(payment.txns.at(-1).applicationCall.appArgs[3]),m.encodeActions(passed.actions));
  await assert.rejects(build('execute',{id:'1',index:0},{proposals:[passed],config:{...config,executor:String(sdk.generateAccount().addr)}}),/executor/);
});
test('network simulation failure prevents a wallet signature and mismatched signatures prevent broadcasting',async()=>{
  const group=await build('propose',makeQuote(input,{config,sender,secretKey:signer.secretKey}));let signatures=0;
  await assert.rejects(sendCouncilGroup({...group,client:{simulateTransactions:()=>({do:async()=>({txnGroups:[{failureMessage:'assert failed'}]})})},signTransactions:()=>{signatures++;}}),/simulation failed/);assert.equal(signatures,0);
  await assert.rejects(sendCouncilGroup({...group,client:{simulateTransactions:()=>({do:async()=>({txnGroups:[{}]})})},signTransactions:async()=>[]}),/expected complete group/);
});
module.exports={config,sender,account};
test('unexecutable Council rule changes are rejected before charging the proposer',()=>{
  const config={...m.protocol.defaults,members:1114};
  const change=(setting,value)=>({kind:3,setting:m.protocol.settings.indexOf(setting),value});
  assert.throws(()=>m.validatePolicyActions([change('minVotes',0)],config),/bounds/);
  assert.throws(()=>m.validatePolicyActions([change('hostBps',7000)],config),/bounds/);
  assert.equal(m.validatePolicyActions([change('rewardBps',2000),change('hostBps',7000)],config).hostBps,'7000');
});
test('proposal storage contains only the header and action commitments',()=>{
  assert.equal(m.PROPOSAL_SIZE,m.P.size);
  const p=m.encode(m.protocol.proposalFields,{owner:sender,digest:'a'.repeat(64),actionsHash:'b'.repeat(64),actionCount:8,rewardPerVote:7181,rewardPaid:14362,eligibleMembers:1114});
  const decoded=m.decodeProposal(p,1);assert.equal(decoded.actionCount,8);assert.deepEqual(decoded.actions,[]);assert.equal(decoded.rewardPerVote,'7181');assert.equal(decoded.rewardPaid,'14362');
  assert.equal(m.PROPOSAL_MBR,2500+400*(11+m.P.size));
});
test('dependent actions execute in order and executor rotation must be last',async()=>{
  const actions=[m.normalizeAction({kind:0,amount:1,recipient:sender}),m.normalizeAction({kind:0,amount:2,recipient:sender})];
  const passed={...proposal,state:1,executed:'0',actions};
  await assert.rejects(build('execute',{id:'1',index:1},{proposals:[passed]}),/in order/);
  await build('execute',{id:'1',index:1},{proposals:[{...passed,executed:'1'}]});
  await assert.rejects(build('execute',{id:'1',index:0},{proposals:[{...passed,executed:'1'}]}),/in order/);
  const rotation={kind:4,setting:2,recipient:sender};
  assert.throws(()=>m.validatePolicyActions([rotation,...actions],{...config,members:1114}),/last action/);
  assert.doesNotThrow(()=>m.validatePolicyActions([...actions,rotation],{...config,members:1114}));
});
test('every atomic group has unique transaction IDs including repeated budget calls and equal payments',async()=>{
  const tree=membershipTree([101]),nft=tree.proof(101);
  const passed={...proposal,state:1,actions:[m.normalizeAction({kind:0,amount:1,recipient:sender})]};
  const equalFunding={...config,baseFee:String(m.PROPOSAL_MBR),wordFee:'0',imageFee:'0'};
  const cases=[
    await build('propose',makeQuote(input,{config,sender,secretKey:signer.secretKey})),
    await build('propose',makeQuote(input,{config:equalFunding,sender,secretKey:signer.secretKey}),{config:equalFunding}),
    await build('vote',{id:'1',nft,choice:1}),
    await build('claim',{id:'1',assetId:101}),
    await build('finalize',{id:'1'}),
    await build('execute',{id:'1',index:0},{proposals:[passed]})
  ];
  for(const {txns} of cases){
    assert.equal(new Set(txns.map(tx=>tx.txID())).size,txns.length,'each transaction identity is distinct');
    const group=Buffer.from(txns[0].group);assert(txns.every(tx=>group.equals(Buffer.from(tx.group))),'every transaction belongs to the same atomic group');
    const unsigned=txns.map(tx=>{const copy=sdk.decodeUnsignedTransaction(sdk.encodeUnsignedTransaction(tx));copy.group=undefined;return copy;});
    assert.deepEqual(Buffer.from(sdk.computeGroupID(unsigned)),group);
  }
});
test('ALGO Tinyman swaps explicitly make asset zero available to the inner validator call',async()=>{
  for(const [asset,outputAsset]of [[0,5002],[5002,0],[5002,5001]]){
    const action=m.normalizeAction({kind:2,asset,outputAsset,amount:10000,pool:sender});
    const passed={...proposal,state:1,actions:[action]};
    const group=await build('execute',{id:'1',index:0},{config:{...config,tinyman:148607000},proposals:[passed]});
    assert.deepEqual(group.txns.at(-1).applicationCall.foreignAssets,[BigInt(asset),BigInt(outputAsset)]);
    assert.deepEqual(group.txns.at(-1).applicationCall.foreignApps,[148607000n]);
  }
});
