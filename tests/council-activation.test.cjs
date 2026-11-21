const test=require('node:test'),assert=require('node:assert/strict'),sdk=require('algosdk');
const crypto=require('node:crypto'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const a=require('../scripts/council-activation.cjs'),m=require('../functions/council/model');
const {membershipTree}=require('../functions/council/membership');
const registry=require('../functions/council/membership.json');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function fixture(){
  const tree=membershipTree(registry.assetIds),approval=Buffer.from([10,1,1]),clear=Buffer.from([10,1,0]);
  const review={format:'dark-coin-council-mainnet-activation-v1',network:'mainnet',appId:m.protocol.legacyAppId,creator:a.LEGACY_CREATOR,
    legacy:{appId:m.protocol.legacyAppId,creator:a.LEGACY_CREATOR,approvalSha256:a.LEGACY_APPROVAL_SHA256,
      config:null,extraPages:0,schema:{globalInts:1,globalBytes:0,localInts:0,localBytes:0}},
    sourceSha256:a.sourceHashes(),schema:{globalInts:1,globalBytes:0,localInts:0,localBytes:0},defaults:m.protocol.defaults,
    root:tree.root,members:tree.assetIds.length,depth:tree.depth,
    host:require('../functions/council/hosting.json').address,quoteSigner:a.LEGACY_CREATOR,executor:a.LEGACY_CREATOR,
    approvalProgram:approval.toString('base64'),clearProgram:clear.toString('base64'),approvalSha256:sha(approval),clearSha256:sha(clear),
    approvalBytes:approval.length,clearBytes:clear.length,extraPages:0};
  review.initialConfigBase64=a.initialConfig(review).toString('base64');
  const group=a.migrationGroup(review,{firstValid:100n,lastValid:1100n,genesisID:'mainnet-v1.0',genesisHash:new Uint8Array(32),fee:0n});
  review.unsignedMigration=group.map(tx=>Buffer.from(sdk.encodeUnsignedTransaction(tx)).toString('base64'));
  return {review,group};
}
test('mainnet review rejects changed source, foreign programs and mismatched NFT membership',()=>{
  const {review}=fixture();assert.equal(a.assertReview(review,registry),review);
  assert.throws(()=>a.assertReview({...review,sourceSha256:{}},registry),/source changed/);
  assert.throws(()=>a.assertReview({...review,appId:999},registry),/identity/);
  assert.throws(()=>a.assertReview({...review,approvalProgram:Buffer.from([10,2,1]).toString('base64')},registry),/checksum/);
  assert.throws(()=>a.assertReview(review,{network:'mainnet',assetIds:registry.assetIds.slice(1)}),/registries/);
  assert.throws(()=>a.assertReview({...review,legacy:{...review.legacy,config:{version:3}}},registry),/legacy Council/);
});
test('unsigned migration is restricted to reviewed update, exact configuration funding and paused initialization',()=>{
  const {review,group}=fixture();assert.equal(a.reviewedGroup(review).length,3);
  const config=m.decodeConfig(group[2].applicationCall.appArgs[1]);assert.equal(config.paused,'1');assert.equal(config.executor,a.LEGACY_CREATOR);
  assert.equal(group[1].payment.amount,BigInt(m.CONFIG_MBR));
  const tampered=a.migrationGroup(review,{firstValid:100n,lastValid:1100n,genesisID:'mainnet-v1.0',genesisHash:new Uint8Array(32),fee:0n});
  tampered[1].payment.amount+=1n;for(const tx of tampered)tx.group=undefined;sdk.assignGroupID(tampered);
  assert.throws(()=>a.reviewedGroup({...review,unsignedMigration:tampered.map(tx=>Buffer.from(sdk.encodeUnsignedTransaction(tx)).toString('base64'))}),/differs/);
});
test('pause operations allow off-chain media normalization changes while retaining contract and registry pins',()=>{
  const {review}=fixture(),hashes={...a.sourceHashes(),'functions/council/model.js':'a'.repeat(64)};
  assert.throws(()=>a.assertReview(review,registry,hashes),/source changed/);
  assert.equal(a.assertReview(review,registry,hashes,{operational:true}),review);
  assert.throws(()=>a.assertReview(review,registry,{...hashes,'contracts/CouncilDAO.py':'b'.repeat(64)},{operational:true}),/source changed/);
  assert.throws(()=>a.assertReview(review,registry,{...hashes,'functions/council/protocol.json':'b'.repeat(64)},{operational:true}),/source changed/);
});
test('signed-group validation rejects another signer and changed or incomplete transactions',()=>{
  const {group}=fixture(),signer=sdk.generateAccount(),other=sdk.generateAccount();
  const signed=group.map(tx=>tx.signTxn(signer.sk));assert.equal(a.validateSignedGroup(group,signed,String(signer.addr)).length,3);
  assert.throws(()=>a.validateSignedGroup(group,signed,String(other.addr)),/signature/);
  assert.throws(()=>a.validateSignedGroup(group,signed.slice(1),String(signer.addr)),/every transaction/);
  const replaced=group.map(tx=>tx.signTxn(signer.sk));replaced[0]=group[1].signTxn(signer.sk);
  assert.throws(()=>a.validateSignedGroup(group,replaced,String(signer.addr)),/signature/);
});
test('migration simulation fails closed instead of accepting partial or rejected groups',async()=>{
  await assert.rejects(a.simulate({simulateTransactions:()=>({do:async()=>({txnGroups:[{failureMessage:'assert failed'}]})})},fixture().group),/assert failed/);
  await assert.rejects(a.simulate({simulateTransactions:()=>({do:async()=>({txnGroups:[]})})},fixture().group),/No result/);
});
test('activation submission records identity before broadcast and refuses a different uncertain group',async()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'council-activation-')),receiptFile=path.join(directory,'activation.json');
  const {group}=fixture();let sends=0;
  const algod={sendRawTransaction:()=>({do:async()=>{assert(fs.existsSync(receiptFile));assert.equal(JSON.parse(fs.readFileSync(receiptFile)).txid,group[0].txID());sends++;return {};}}),
    status:()=>({do:async()=>({lastRound:101n})}),pendingTransactionInformation:()=>({do:async()=>({confirmedRound:102n})})};
  const result=await a.broadcastOnce({algod,txns:group,signed:[],receiptFile});assert.equal(result.confirmedRound,'102');assert.equal(sends,1);
  const again=await a.broadcastOnce({algod,txns:group,signed:[],receiptFile});assert.equal(again.alreadyConfirmed,true);assert.equal(sends,1);
  fs.writeFileSync(receiptFile,JSON.stringify({txid:'previous-uncertain',lastValid:'1100'}));
  algod.pendingTransactionInformation=()=>({do:async()=>({confirmedRound:0n})});
  await assert.rejects(a.broadcastOnce({algod,txns:group,signed:[],receiptFile}),/uncertain/);assert.equal(sends,1);
});
