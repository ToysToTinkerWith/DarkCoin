const test=require('node:test'),assert=require('node:assert/strict'),sdk=require('algosdk'),Jimp=require('jimp');
const crypto=require('node:crypto');
const images=require('../functions/council/images'),m=require('../functions/council/model');
const {readCouncil}=require('../functions/council/chain'),{membershipTree}=require('../functions/council/membership');
const registry=require('../functions/council/membership.json');
const reports=require('../scripts/council-report.cjs');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');

function fakeFirebase(){
  const records=new Map(),objects=new Map(),stats={saves:0,downloads:0};
  const ref=key=>({key,get:async()=>({exists:records.has(key),data:()=>records.get(key)}),
    create:async data=>{if(records.has(key))throw Object.assign(Error('Already exists'),{code:6});records.set(key,data);},
    set:async data=>records.set(key,data)});
  const db={collection:name=>({doc:id=>ref(`${name}/${id}`)}),runTransaction:async fn=>fn({get:r=>r.get(),set:(r,data)=>records.set(r.key,data)})};
  const bucket={name:'council-tests',file:key=>({save:async(bytes,options)=>{
    stats.saves++;assert.equal(options.preconditionOpts.ifGenerationMatch,0);
    if(objects.has(key))throw Object.assign(Error('Precondition failed'),{code:412});objects.set(key,Buffer.from(bytes));
  },download:async()=>{stats.downloads++;if(!objects.has(key))throw Error('Missing object');return [Buffer.from(objects.get(key))];}})};
  return {records,objects,stats,db,bucket,storage:{bucket:name=>{assert.equal(name,bucket.name);return bucket;}}};
}
let originalImage;
async function largePng(){
  if(originalImage)return originalImage;
  const width=600,height=600,data=Buffer.alloc(width*height*4);let state=0xabcdef01;
  for(let i=0;i<data.length;i+=4){for(let j=0;j<3;j++){state^=state<<13;state^=state>>>17;state^=state<<5;data[i+j]=state&255;}data[i+3]=255;}
  originalImage=await new Jimp({data,width,height}).getBufferAsync(Jimp.MIME_PNG);return originalImage;
}
test('Firebase Storage retains complete original attachments above the old 750KB ceiling',async()=>{
  const bytes=await largePng();assert(bytes.length>750000);assert(bytes.length<images.MAX_IMAGE_BYTES);
  const f=fakeFirebase(),result=await images.storeImage({...f,bytes,sender:'wallet',now:1000});
  assert.equal(result.hash,sha(bytes));assert.equal(result.width,600);assert.equal(result.height,600);assert.equal(result.contentType,'image/png');
  assert.deepEqual(f.objects.get(`council/images/${result.hash}`),bytes);
  const metadata=f.records.get(`councilImages/${result.hash}`);assert.equal(metadata.size,bytes.length);assert.equal(metadata.bytes,undefined);
  const loaded=await images.loadImage({...f,hash:result.hash});assert.deepEqual(loaded.bytes,bytes);assert.equal(loaded.contentType,'image/png');
});
test('image references remain immutable and content corruption fails checksum verification',async()=>{
  const f=fakeFirebase(),bytes=await largePng(),args={...f,bytes,sender:'wallet',now:1000};
  const first=await images.storeImage(args);await images.storeImage({...args,now:2000});
  assert.equal(f.records.get(`councilImages/${first.hash}`).createdAt,1000);
  assert.equal(f.objects.size,1);assert.equal(f.stats.downloads,1);
  f.objects.set(`council/images/${first.hash}`,Buffer.from('replaced image'));
  await assert.rejects(images.loadImage({...f,hash:first.hash}),/checksum/);
  await assert.rejects(images.storeImage({...args,now:3000}),/checksum/);
  await assert.rejects(images.loadImage({...f,hash:'../../private'}),/hash/);
});
test('attachment quotas block the twenty-first upload and reset on the next UTC day',async()=>{
  const f=fakeFirebase(),bytes=await largePng(),now=Date.UTC(2026,10,19,12);
  for(let i=0;i<20;i++)await images.storeImage({...f,bytes,sender:'wallet',now});
  const saves=f.stats.saves;
  await assert.rejects(images.storeImage({...f,bytes,sender:'wallet',now}),/Daily attachment limit/);assert.equal(f.stats.saves,saves);
  await images.storeImage({...f,bytes,sender:'wallet',now:now+86400000});
  assert.deepEqual(f.records.get('councilUploadLimits/wallet'),{day:'2026-11-20',count:1});
});
test('image dimensions and size are rejected before allocating a decoded bitmap; legacy stored bytes still load',async()=>{
  const bytes=Buffer.from(await largePng());bytes.writeUInt32BE(100000,16);bytes.writeUInt32BE(100000,20);
  assert.throws(()=>images.inspectImage(bytes),/20 megapixels/);
  assert.throws(()=>images.inspectImage(Buffer.alloc(images.MAX_IMAGE_BYTES+1)),/6 MB/);
  assert.throws(()=>images.inspectImage(Buffer.from('<html>not an image</html>')),/valid PNG/);
  const f=fakeFirebase(),legacy=Buffer.from('legacy JPEG bytes'),hash=sha(legacy);
  f.records.set(`councilImages/${hash}`,{bytes:legacy});
  const loaded=await images.loadImage({...f,hash});assert.deepEqual(loaded.bytes,legacy);assert.equal(loaded.contentType,'image/jpeg');
});

function chainFixture({count=100,owned=registry.assetIds,history=[],votes=new Map(),manifestMutation}={}){
  const account=sdk.generateAccount(),wallet=String(account.addr),appId=1234,appAddress=String(sdk.getApplicationAddress(appId));
  const tree=membershipTree(registry.assetIds),program=Buffer.from('backend-test-program');
  const policy=m.encode(m.protocol.configFields,{...m.protocol.defaults,version:3,next:count+1,revision:1,members:tree.assetIds.length,
    depth:tree.depth,root:tree.root,host:wallet,quoteSigner:wallet,executor:wallet,tinyman:m.protocol.tinyman.mainnet});
  const manifest=m.normalizeProposal({title:'A verified Council proposal',body:'Preserve the complete prompt and execute this approved payment.',images:[],
    actions:[{kind:0,asset:0,amount:'10000',recipient:wallet}]}),digest=sha(JSON.stringify(manifest));
  const header=m.encode(m.protocol.proposalFields,{owner:wallet,digest,actionsHash:sha(m.encodeActions(manifest.actions)),state:1,deadline:1000,
    minVotes:50,approvalBps:6000,rewardPool:8000000,rewardPerVote:7181,rewardPaid:7181,eligibleMembers:1114,actionCount:1});
  const calls={boxes:[],manifests:0,history:0,walletAccounts:0};
  const algod={accountInformation:address=>({do:async()=>address===appAddress?{amount:100000000n,minBalance:100000n,assets:[]}:
    (calls.walletAccounts++,{amount:1000000n,minBalance:100000n,assets:owned.map(id=>({assetId:BigInt(id),amount:1n}))})}),
    getApplicationByID:()=>({do:async()=>({params:{approvalProgram:program}})}),
    getApplicationBoxByName:(_,key)=>({do:async()=>{const name=Buffer.from(key);calls.boxes.push(name);
      if(name.toString()==='C3C')return {value:policy};if(name.subarray(0,3).toString()==='C3P')return {value:header};
      const ballot=votes.get(name.toString('hex'));if(ballot)return {value:ballot};throw Object.assign(Error('Missing ballot'),{status:404});}})};
  const query={do:async()=>{calls.history++;return {transactions:history.map(tx=>typeof tx==='function'?tx({wallet,appAddress}):tx)};}};
  for(const name of ['applicationID','address','addressRole','txType','limit','nextToken'])query[name]=()=>query;
  const indexer={searchForTransactions:()=>query};
  const loadManifest=async()=>{calls.manifests++;return manifestMutation?manifestMutation(manifest):manifest;};
  return {wallet,appId,appAddress,program,manifest,digest,calls,client:algod,indexer,loadManifest};
}
async function readFixture(f,options={}){
  const keys=['COUNCIL_NETWORK','COUNCIL_APP_ID','COUNCIL_APPROVAL_SHA256'],old=keys.map(key=>process.env[key]);
  Object.assign(process.env,{COUNCIL_NETWORK:'mainnet',COUNCIL_APP_ID:String(f.appId),COUNCIL_APPROVAL_SHA256:sha(f.program)});
  try{return await readCouncil(options.address||'',{client:f.client,indexer:f.indexer,loadManifest:f.loadManifest,...options});}
  finally{keys.forEach((key,i)=>old[i]===undefined?delete process.env[key]:process.env[key]=old[i]);}
}
test('configuration reads skip proposal content and wallet ballot/history work entirely',async()=>{
  const f=chainFixture({count:1000}),data=await readFixture(f,{view:'config',address:f.wallet});
  assert.equal(data.config.ready,true);assert.equal(data.pagination.total,1000);assert.equal(f.calls.boxes.length,1);
  assert.equal(f.calls.manifests,0);assert.equal(f.calls.history,0);assert.equal(f.calls.walletAccounts,0);
});
test('proposal list reads one page and no NFT-by-proposal cross product',async()=>{
  const f=chainFixture({count:1000}),data=await readFixture(f,{address:f.wallet});
  assert.equal(data.proposals.length,20);assert.equal(data.proposals[0].id,'1000');assert.equal(data.pagination.nextBefore,'981');assert.equal(data.pagination.hasMore,true);
  assert.equal(f.calls.boxes.length,21);assert.equal(f.calls.history,0);assert.equal(data.owned.length,1114);assert.equal(f.calls.manifests,20);
  const next=await readFixture(f,{before:'981',limit:5});assert.deepEqual(next.proposals.map(p=>p.id),['980','979','978','977','976']);
});
test('a proposal detail verifies Firebase action bytes against its immutable header hash',async()=>{
  const f=chainFixture(),data=await readFixture(f,{proposalId:'40'});
  assert.equal(data.proposals.length,1);assert.equal(data.proposals[0].textVerified,true);assert.deepEqual(data.proposals[0].actions,f.manifest.actions);
  assert.equal(data.proposals[0].body,f.manifest.body);assert.equal(f.calls.boxes.length,2);
  const changed=chainFixture({manifestMutation:p=>({...p,actions:[{...p.actions[0],amount:'999999'}]})});
  const corrupt=await readFixture(changed,{proposalId:'40'});assert.equal(corrupt.proposals[0].textVerified,false);assert.deepEqual(corrupt.proposals[0].actions,[]);
});
test('discussion links require the same immutable proposal digest and valid Discord identifiers',async()=>{
  const f=chainFixture(),mapping={digest:f.digest,guildId:'950116008855744533',channelId:'1573150373198299266'};
  const read=loadDiscussion=>readFixture(f,{proposalId:'40',loadDiscussion});
  const data=await read(async()=>mapping);
  assert.equal(data.proposals[0].discussionUrl,'https://discord.com/channels/950116008855744533/1573150373198299266');
  assert.equal((await read(async()=>({...mapping,digest:'f'.repeat(64)}))).proposals[0].discussionUrl,'');
  assert.equal((await read(async()=>({...mapping,channelId:'https://attacker.example/'}))).proposals[0].discussionUrl,'');
  assert.equal((await read(async()=>null)).proposals[0].discussionUrl,'');
});
test('reward history targets actual voted pairs and preserves payment evidence after NFT transfer and storage refund',async()=>{
  const nft=registry.assetIds[0],args=method=>[Buffer.from(method),m.u64(7),m.u64(nft),...(method==='vote'?[m.u64(1),m.u64(0),Buffer.alloc(0)]:[])];
  const history=[({wallet,appAddress})=>({id:'first-vote',roundTime:1000,applicationTransaction:{applicationArgs:args('vote')},
    innerTxns:[{sender:appAddress,paymentTransaction:{receiver:wallet,amount:7181n}}]}),
    ()=>({id:'changed-vote',applicationTransaction:{applicationArgs:args('vote')},innerTxns:[]}),
    ({wallet,appAddress})=>({id:'storage-refund',applicationTransaction:{applicationArgs:args('claim')},
      innerTxns:[{sender:appAddress,paymentTransaction:{receiver:wallet,amount:29300n}}]})];
  const f=chainFixture({count:1000,owned:[],history}),data=await readFixture(f,{address:f.wallet,view:'rewards'});
  assert.equal(data.owned.length,0);assert.equal(data.proposals.length,1);assert.equal(data.proposals[0].id,'7');
  assert.equal(f.calls.boxes.length,3);assert.equal(data.votes.length,0);assert.equal(data.walletHistory.length,1);
  assert.equal(data.walletHistory[0].paidReward,'7181');assert.equal(data.walletHistory[0].depositReturned,true);assert.equal(data.walletHistory[0].txid,'first-vote');
});

function reportFixture(fields={}){
  const f=fakeFirebase(),digest='a'.repeat(64),proposal={id:'7',digest,state:1,textVerified:true,actions:[],executed:'0',...fields};
  const verify=async()=>({data:{config:{ready:true,network:'mainnet',appId:1234}},proposal});
  return {...f,id:'7',digest,status:'running',summary:'Implementing the approved proposal.',verify};
}
test('public progress is bound to a verified passed manifest and can be reviewed without a write',async()=>{
  const f=reportFixture(),preview=await reports.publishReport({...f,dryRun:true,now:1000});
  assert.equal(preview.written,false);assert.equal(f.records.size,0);assert.equal(preview.key,'mainnet-1234-7');
  await reports.publishReport({...f,now:1000});const stored=f.records.get('councilProgress/mainnet-1234-7');
  assert.equal(stored.digest,f.digest);assert.equal(stored.status,'running');assert.equal(stored.revision,1);
  const unpassed=reportFixture({state:0});await assert.rejects(reports.publishReport(unpassed),/passed proposal/);assert.equal(unpassed.records.size,0);
  const substitution=reportFixture({digest:'b'.repeat(64)});await assert.rejects(reports.publishReport(substitution),/passed proposal/);
});
test('completion reports cannot hide unexecuted treasury actions or overwrite another manifest identity',async()=>{
  const f=reportFixture({actions:[{},{}],executed:'1'});
  await assert.rejects(reports.publishReport({...f,status:'complete'}),/remain unexecuted/);assert.equal(f.records.size,0);
  await reports.publishReport({...f,status:'blocked'});assert.equal(f.records.get('councilProgress/mainnet-1234-7').status,'blocked');
  f.records.set('councilProgress/mainnet-1234-7',{digest:'b'.repeat(64)});
  await assert.rejects(reports.publishReport(f),/different approved manifest/);
  const done=reportFixture({actions:[{},{}],executed:'3'});
  await reports.publishReport({...done,status:'complete',release:'https://dark-coin.com/council'});
  assert.equal(done.records.get('councilProgress/mainnet-1234-7').status,'complete');
});
test('public reports reject common credential dumps, private release URLs and malformed transaction IDs',()=>{
  assert.throws(()=>reports.publicSummary('access_token=do-not-publish-this'),/credential/);
  const mnemonic=sdk.secretKeyToMnemonic(sdk.generateAccount().sk);assert.throws(()=>reports.publicSummary(mnemonic),/mnemonic/);
  for(const url of ['http://dark-coin.com','https://localhost/release','https://192.168.1.10/release',
    'https://user:password@dark-coin.com','https://dark-coin.com/release?access_token=private'])assert.throws(()=>reports.publicRelease(url),/HTTPS|private hosts/);
  assert.equal(reports.publicRelease('https://dark-coin.com/arena'),'https://dark-coin.com/arena');
  assert.throws(()=>reports.transactionIds(['bad-id']),/valid Algorand/);
});
test('progress transaction receipts must resolve to a confirmed execution of the same approved proposal',async()=>{
  const group=new Uint8Array(32).fill(1),txid='A'.repeat(52),executionId='B'.repeat(52),sender=String(sdk.generateAccount().addr);
  const execution={id:executionId,group,confirmedRound:100n,applicationTransaction:{applicationId:1234n,
    applicationArgs:[Buffer.from('execute'),m.u64(7),m.u64(0)]}};
  const query={do:async()=>({transactions:[execution]})};for(const method of ['address','minRound','maxRound','txType','limit'])query[method]=()=>query;
  const indexer={lookupTransactionByID:()=>({do:async()=>({transaction:{id:txid,group,sender,confirmedRound:100n,
    applicationTransaction:{applicationId:1234n,applicationArgs:[Buffer.from('budget')]}}})}),searchForTransactions:()=>query};
  assert.equal(await reports.confirmedExecution(indexer,txid,1234,'7'),executionId);
  const f=reportFixture({actions:[{}],executed:'1'});
  await reports.publishReport({...f,status:'complete',transactionIds:[txid],indexer});
  assert.deepEqual(f.records.get('councilProgress/mainnet-1234-7').transactionIds,[executionId]);
  await assert.rejects(reports.confirmedExecution(indexer,txid,1234,'8'),/unrelated/);
  indexer.lookupTransactionByID=()=>({do:async()=>({transaction:{...execution,confirmedRound:0n}})});
  await assert.rejects(reports.confirmedExecution(indexer,txid,1234,'7'),/not confirmed/);
});
