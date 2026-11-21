// Mainnet Council activation. Mutation commands verify a concrete review first.
// Local private credentials never enter reviews, receipts, arguments or stdout.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process'),sdk=require('algosdk'),nacl=require('tweetnacl');
const model=require('../functions/council/model'),{membershipTree}=require('../functions/council/membership');
const ROOT=path.resolve(__dirname,'..');
const LEGACY_CREATOR='NSPLIQLVYV7US34UDYGYPZD7QGSHWND7AWSWPD4FTLRGW5IF2P2R3IF3EQ';
const LEGACY_APPROVAL_SHA256='d99c759b9df48195755ff0ed52b7a8f672af710ccc017447723466a52f9aa4d3';
const SOURCE_FILES=['contracts/CouncilDAO.py','contracts/council-dao/approval.teal','contracts/council-dao/clear.teal',
  'functions/council/protocol.json','functions/council/model.js','functions/council/membership.json','functions/council/hosting.json'];
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const json=value=>JSON.stringify(value,(_,v)=>typeof v==='bigint'?String(v):v,2)+'\n';
const writeJson=(file,value)=>fs.writeFileSync(file,json(value),{mode:0o600});
const sourceHashes=()=>Object.fromEntries(SOURCE_FILES.map(file=>[file,sha(fs.readFileSync(path.join(ROOT,file)))]));
const client=()=>new sdk.Algodv2('','https://mainnet-api.algonode.cloud',443);
const missing=e=>Number(e.status||e.response?.status)===404;
const intendedSchema={globalInts:1,globalBytes:0,localInts:0,localBytes:0};

async function snapshot(algod=client()){
  const appId=model.protocol.legacyAppId,app=await algod.getApplicationByID(appId).do();
  const creator=String(app.params.creator),address=String(sdk.getApplicationAddress(appId));
  const [treasury,owner,status,boxes]=await Promise.all([algod.accountInformation(address).do(),
    algod.accountInformation(creator).do(),algod.status().do(),algod.getApplicationBoxes(appId).do()]);
  let config=null;
  try{config=model.decodeConfig((await algod.getApplicationBoxByName(appId,model.configKey()).do()).value);}
  catch(e){if(!missing(e))throw e;}
  const legacyBoxes=[];
  for(const box of boxes.boxes||[]){
    const name=Buffer.from(box.name);if(name.subarray(0,2).toString()==='C3')continue;
    const value=Buffer.from((await algod.getApplicationBoxByName(appId,name).do()).value);
    legacyBoxes.push({nameBase64:name.toString('base64'),valueSha256:sha(value),bytes:value.length});
  }
  legacyBoxes.sort((a,b)=>a.nameBase64.localeCompare(b.nameBase64));
  const p=app.params;
  return {network:'mainnet',appId,address,creator,creatorAuthAddress:String(owner.authAddr||creator),
    observedAt:new Date().toISOString(),round:String(status.lastRound),consensus:status.lastVersion,
    approvalSha256:sha(p.approvalProgram),clearSha256:sha(p.clearStateProgram),approvalBytes:p.approvalProgram.length,
    extraPages:Number(p.extraProgramPages||0),schema:{globalInts:Number(p.globalStateSchema?.numUint||0),
      globalBytes:Number(p.globalStateSchema?.numByteSlice||0),localInts:Number(p.localStateSchema?.numUint||0),localBytes:Number(p.localStateSchema?.numByteSlice||0)},
    config,legacyBoxes,treasury:{amount:String(treasury.amount),minimumBalance:String(treasury.minBalance),
      available:String(treasury.amount-treasury.minBalance),assets:(treasury.assets||[]).map(a=>({id:String(a.assetId),amount:String(a.amount),frozen:Boolean(a.isFrozen)}))},
    creatorAvailable:String(owner.amount-owner.minBalance)};
}

function assertLegacy(state){
  if(state.appId!==model.protocol.legacyAppId||state.creator!==LEGACY_CREATOR||state.approvalSha256!==LEGACY_APPROVAL_SHA256||
    state.config||state.extraPages!==0||JSON.stringify(state.schema)!==JSON.stringify(intendedSchema)){
    throw Error('The app is not the reviewed legacy Council. Refusing migration.');
  }
}
function initialConfig(review){return model.encode(model.protocol.configFields,{...model.protocol.defaults,version:3,next:1,
  revision:1,paused:1,members:review.members,depth:review.depth,root:review.root,host:review.host,
  quoteSigner:review.quoteSigner,executor:review.executor,tinyman:model.protocol.tinyman.mainnet});}
function migrationGroup(review,params){
  const sender=review.creator,suggestedParams={...params,fee:1000n,flatFee:true};
  const txns=[sdk.makeApplicationCallTxnFromObject({sender,appIndex:review.appId,onComplete:sdk.OnApplicationComplete.UpdateApplicationOC,
    approvalProgram:Buffer.from(review.approvalProgram,'base64'),clearProgram:Buffer.from(review.clearProgram,'base64'),
    numGlobalInts:1,numGlobalByteSlices:0,numLocalInts:0,numLocalByteSlices:0,extraPages:review.extraPages,suggestedParams}),
    sdk.makePaymentTxnWithSuggestedParamsFromObject({sender,receiver:sdk.getApplicationAddress(review.appId),amount:model.CONFIG_MBR,suggestedParams}),
    sdk.makeApplicationNoOpTxnFromObject({sender,appIndex:review.appId,appArgs:[Buffer.from('initialize'),initialConfig(review)],
      boxes:[{appIndex:0,name:model.configKey()}],suggestedParams})];
  sdk.assignGroupID(txns);return txns;
}
async function simulate(algod,group,signed=false){
  const result=await algod.simulateTransactions(new sdk.modelsv2.SimulateRequest({allowEmptySignatures:!signed,fixSigners:!signed,
    txnGroups:[new sdk.modelsv2.SimulateRequestTransactionGroup({txns:group.map(tx=>sdk.decodeSignedTransaction(signed?tx:sdk.encodeUnsignedSimulateTransaction(tx)))})]})).do();
  const value=result.txnGroups?.[0];
  if(!value||value.failureMessage)throw Error(`Council simulation failed: ${value?.failureMessage||'No result'}`);
  return {passed:true,atRound:String(result.lastRound),appBudgetAdded:String(value.appBudgetAdded||0),
    appBudgetConsumed:String(value.appBudgetConsumed||0),simulatedAt:new Date().toISOString()};
}
function assertReview(review,registry,hashes=sourceHashes(),{operational=false}={}){
  if(review.format!=='dark-coin-council-mainnet-activation-v1'||review.network!=='mainnet'||review.appId!==model.protocol.legacyAppId||
    review.creator!==LEGACY_CREATOR||review.legacy?.approvalSha256!==LEGACY_APPROVAL_SHA256||registry.network!=='mainnet')throw Error('Invalid Council mainnet review identity.');
  if(JSON.stringify(review.schema)!==JSON.stringify(intendedSchema)||JSON.stringify(review.defaults)!==JSON.stringify(model.protocol.defaults))throw Error('Review schema or rules differ from the compiled configuration.');
  // An off-chain manifest/media change must not disable the existing emergency
  // pause control. Operations still pin every contract, protocol and registry
  // source and verify the actual deployed bytecode before signing anything.
  const reviewedHashes={...review.sourceSha256},currentHashes={...hashes};
  if(operational&&/^[a-f0-9]{64}$/.test(reviewedHashes['functions/council/model.js']||'')){
    delete reviewedHashes['functions/council/model.js'];delete currentHashes['functions/council/model.js'];
  }
  if(JSON.stringify(reviewedHashes)!==JSON.stringify(currentHashes))throw Error('Council source changed after preparation. Regenerate the review.');
  const tree=membershipTree(registry.assetIds),active=require('../functions/council/membership.json');
  if(tree.root!==review.root||tree.assetIds.length!==review.members||tree.depth!==review.depth||
    tree.root!==membershipTree(active.assetIds).root||active.network!=='mainnet')throw Error('Review and bundled NFT registries differ.');
  if(review.host!==require('../functions/council/hosting.json').address||!sdk.isValidAddress(review.quoteSigner)||!sdk.isValidAddress(review.executor)||
    review.quoteSigner===model.ZERO||review.executor===model.ZERO)throw Error('Invalid Council service addresses.');
  const approval=Buffer.from(review.approvalProgram,'base64'),clear=Buffer.from(review.clearProgram,'base64');
  if(sha(approval)!==review.approvalSha256||sha(clear)!==review.clearSha256||approval.length!==review.approvalBytes||clear.length!==review.clearBytes||
    Math.max(0,Math.ceil((approval.length+clear.length)/2048)-1)!==review.extraPages||review.extraPages>3||
    initialConfig(review).toString('base64')!==review.initialConfigBase64)throw Error('Review program/configuration checksum failed.');
  assertLegacy(review.legacy);return review;
}
function loadReview(file,options){
  const absolute=path.resolve(file),review=JSON.parse(fs.readFileSync(absolute,'utf8'));
  const registry=JSON.parse(fs.readFileSync(path.join(path.dirname(absolute),'membership.review.json'),'utf8'));
  return assertReview(review,registry,sourceHashes(),options);
}
function reviewedGroup(review){
  if(!Array.isArray(review.unsignedMigration)||review.unsignedMigration.length!==3)throw Error('Missing reviewed migration group.');
  const txns=review.unsignedMigration.map(v=>sdk.decodeUnsignedTransaction(Buffer.from(v,'base64'))),first=txns[0];
  const rebuilt=migrationGroup(review,{firstValid:first.firstValid,lastValid:first.lastValid,genesisID:first.genesisID,
    genesisHash:first.genesisHash,minFee:1000n,fee:0n});
  if(rebuilt.some((tx,i)=>tx.txID()!==txns[i].txID()))throw Error('Unsigned migration differs from the reviewed update, funding or initialization.');
  return txns;
}
async function verifyLiveReview(review,algod=client()){
  const state=await snapshot(algod);assertLegacy(state);
  if(JSON.stringify(state.legacyBoxes)!==JSON.stringify(review.legacy.legacyBoxes))throw Error('Legacy proposals changed. Regenerate the review.');
  const [approval,clear]=await Promise.all([algod.compile(fs.readFileSync(path.join(ROOT,'contracts/council-dao/approval.teal'))).do(),
    algod.compile(fs.readFileSync(path.join(ROOT,'contracts/council-dao/clear.teal'))).do()]);
  if(approval.result!==review.approvalProgram||clear.result!==review.clearProgram)throw Error('Reviewed programs do not match compiled local source.');
  return state;
}
async function prepareReview({network='mainnet',registryFile,quoteSigner=process.env.COUNCIL_QUOTE_ADDRESS,
  executor=process.env.COUNCIL_EXECUTOR_ADDRESS||LEGACY_CREATOR,algod=client(),indexer,compile=true,outputDirectory}={}){
  if(network!=='mainnet')throw Error('This activation tool targets the existing mainnet Council only.');
  if(!quoteSigner||!sdk.isValidAddress(quoteSigner)||!sdk.isValidAddress(executor))throw Error('Set valid COUNCIL_QUOTE_ADDRESS and COUNCIL_EXECUTOR_ADDRESS public addresses.');
  const legacy=await snapshot(algod);assertLegacy(legacy);let ids=[];
  if(registryFile){const registry=JSON.parse(fs.readFileSync(path.resolve(registryFile),'utf8'));if(registry.network!==network)throw Error('Registry network mismatch.');ids=registry.assetIds;}
  else{
    const idx=indexer||new sdk.Indexer('','https://mainnet-idx.algonode.cloud',443);let next;
    do{let query=idx.searchForAssets().creator(model.protocol.creator).limit(1000);if(next)query=query.nextToken(next);
      const response=await query.do();next=response.nextToken;
      for(const asset of response.assets||[])if(!asset.deleted&&/^DCGV\d+$/.test(asset.params.unitName||'')&&BigInt(asset.params.total)===1n&&Number(asset.params.decimals)===0)ids.push(Number(asset.index));
    }while(next);
  }
  const tree=membershipTree(ids);if(tree.assetIds.length<50)throw Error('At least 50 eligible NFTs required.');
  if(compile)execFileSync(process.env.PYTHON||'python',['contracts/CouncilDAO.py'],{cwd:ROOT,stdio:'inherit',windowsHide:true});
  const [ap,cp]=await Promise.all([algod.compile(fs.readFileSync(path.join(ROOT,'contracts/council-dao/approval.teal'))).do(),
    algod.compile(fs.readFileSync(path.join(ROOT,'contracts/council-dao/clear.teal'))).do()]);
  const approval=Buffer.from(ap.result,'base64'),clear=Buffer.from(cp.result,'base64');
  const review={format:'dark-coin-council-mainnet-activation-v1',status:'SIMULATED; CREATOR SIGNATURE REQUIRED',network,
    appId:model.protocol.legacyAppId,creator:LEGACY_CREATOR,address:legacy.address,preparedAt:new Date().toISOString(),sourceSha256:sourceHashes(),legacy,
    quoteSigner,executor,host:require('../functions/council/hosting.json').address,approvalProgram:ap.result,clearProgram:cp.result,
    approvalSha256:sha(approval),clearSha256:sha(clear),approvalBytes:approval.length,clearBytes:clear.length,
    extraPages:Math.max(0,Math.ceil((approval.length+clear.length)/2048)-1),schema:intendedSchema,
    root:tree.root,members:tree.assetIds.length,depth:tree.depth,defaults:model.protocol.defaults,startsPaused:true,storageMicroAlgos:model.CONFIG_MBR,
    notes:['Text, images and action details live in Firebase; chain state contains commitments and vote accounting.',
      'Rewards pay once in each NFT first voting transaction. Vote changes and transfers never pay again.',
      'Starts paused. Resume after the matching backend and signing secret are deployed.',
      'Legacy proposals, treasury assets and the application address are retained.']};
  review.initialConfigBase64=initialConfig(review).toString('base64');
  const registry={network,assetIds:tree.assetIds};assertReview(review,registry);
  const group=migrationGroup(review,await algod.getTransactionParams().do());
  review.unsignedMigration=group.map(tx=>Buffer.from(sdk.encodeUnsignedTransaction(tx)).toString('base64'));
  review.simulation=await simulate(algod,group);
  const directory=path.resolve(outputDirectory||path.join(ROOT,'output/council',`mainnet-instant-${Date.now()}`));fs.mkdirSync(directory,{recursive:true});
  writeJson(path.join(directory,'membership.review.json'),registry);writeJson(path.join(directory,'migration.review.json'),review);
  writeJson(path.join(directory,'runtime.public.json'),{COUNCIL_NETWORK:'mainnet',COUNCIL_APP_ID:String(review.appId),COUNCIL_APPROVAL_SHA256:review.approvalSha256,
    COUNCIL_QUOTE_ADDRESS:review.quoteSigner,COUNCIL_EXECUTOR_ADDRESS:review.executor});
  return {directory,review:path.join(directory,'migration.review.json'),appId:review.appId,approvalSha256:review.approvalSha256,
    members:review.members,extraPages:review.extraPages,simulation:review.simulation,startsPaused:true,lastValid:String(group[0].lastValid),submitted:false};
}
function signingAccount(args){
  const envAt=args.indexOf('--env-file'),keyAt=args.indexOf('--key-variable'),key=keyAt>=0?args[keyAt+1]:'COUNCIL_CREATOR_MNEMONIC';
  if(!/^[A-Z][A-Z0-9_]*$/.test(key||''))throw Error('Use a valid local mnemonic variable name.');
  const values=envAt>=0?require('dotenv').parse(fs.readFileSync(path.resolve(args[envAt+1]))):{},value=process.env[key]||values[key];
  if(!value)throw Error(`Local signing needs ${key}, or sign the reviewed group with the creator wallet.`);
  try{return sdk.mnemonicToSecretKey(value);}catch{throw Error('Configured creator mnemonic is invalid.');}
}
function validateSignedGroup(txns,signed,signer){
  if(!Array.isArray(signed)||signed.length!==txns.length)throw Error('Sign every transaction in the reviewed group.');
  return signed.map((bytes,i)=>{const value=typeof bytes==='string'?Buffer.from(bytes,'base64'):bytes,decoded=sdk.decodeSignedTransaction(value);
    if(decoded.txn.txID()!==txns[i].txID()||!decoded.sig||!nacl.sign.detached.verify(decoded.txn.bytesToSign(),decoded.sig,sdk.decodeAddress(signer).publicKey))throw Error('A signature does not authorize the exact reviewed transaction.');
    return value;});
}
async function verifyActivated(review,algod=client(),{serviceAddresses=true}={}){
  const state=await snapshot(algod),config=state.config;
  if(state.approvalSha256!==review.approvalSha256||state.clearSha256!==review.clearSha256||state.creator!==review.creator||state.extraPages!==review.extraPages||
    JSON.stringify(state.schema)!==JSON.stringify(intendedSchema)||!config||config.root!==review.root||Number(config.members)!==review.members||Number(config.depth)!==review.depth||
    (serviceAddresses&&(config.quoteSigner!==review.quoteSigner||config.executor!==review.executor||config.host!==review.host))||
    JSON.stringify(state.legacyBoxes)!==JSON.stringify(review.legacy.legacyBoxes)){
    throw Error('Activated Council does not match reviewed programs, service addresses, registry or legacy proposals.');
  }
  return state;
}
async function broadcastOnce({algod,txns,signed,receiptFile}){
  fs.mkdirSync(path.dirname(receiptFile),{recursive:true});const lock=receiptFile+'.lock';let fd;
  try{fd=fs.openSync(lock,'wx');}catch{throw Error('Another Council operation holds the local receipt lock.');}
  try{
    const txid=txns[0].txID(),old=fs.existsSync(receiptFile)?JSON.parse(fs.readFileSync(receiptFile,'utf8')):null;
    if(old){
      try{const pending=await algod.pendingTransactionInformation(old.txid).do();if(pending.confirmedRound>0n)return {txid:old.txid,confirmedRound:String(pending.confirmedRound),alreadyConfirmed:true};}
      catch(e){if(!missing(e))throw e;}
      if(BigInt((await algod.status().do()).lastRound)<=BigInt(old.lastValid)&&old.txid!==txid)throw Error(`Previous submission ${old.txid} is uncertain. Check it before preparing another group.`);
    }
    const receipt={txid,transactionIds:txns.map(tx=>tx.txID()),lastValid:String(txns[0].lastValid),submittedAt:new Date().toISOString()};
    writeJson(receiptFile,receipt); // Durable identity before the first broadcast.
    try{await algod.sendRawTransaction(signed).do();}catch(e){if(!/already in ledger|timeout|network|fetch/i.test(e.message))throw e;}
    try{const result=await sdk.waitForConfirmation(algod,txid,30),confirmed={...receipt,confirmedRound:String(result.confirmedRound)};writeJson(receiptFile,confirmed);return confirmed;}
    catch{throw Error(`Confirmation uncertain for ${txid}. Keep the receipt and check this ID before retrying.`);}
  }finally{fs.closeSync(fd);fs.unlinkSync(lock);}
}
async function main(args=process.argv.slice(2)){
  const [command,file]=args,algod=client();
  if(command==='status'){console.log(json(await snapshot(algod)));return;}
  if(!['verify','refresh','sign','submit','resume','pause'].includes(command)||!file)throw Error('Usage: council-activation.cjs status | verify REVIEW | refresh REVIEW | sign REVIEW --out SIGNED [--env-file FILE --key-variable NAME] | submit REVIEW SIGNED | resume REVIEW [local signing options] | pause REVIEW [local signing options]');
  const review=loadReview(file,{operational:command==='resume'||command==='pause'}),receiptRoot=path.resolve(process.env.COUNCIL_LOCAL_STATE||path.join(ROOT,'.council-local'));
  if(command==='refresh'){
    console.log(json(await prepareReview({quoteSigner:review.quoteSigner,executor:review.executor,
      registryFile:path.join(path.dirname(path.resolve(file)),'membership.review.json'),algod})));return;
  }
  if(command==='resume'||command==='pause'){
    const state=await verifyActivated(review,algod,{serviceAddresses:false});
    const pauseValue=command==='pause'?1:0;
    if(Number(state.config.paused)===pauseValue){console.log(json({active:pauseValue===0,alreadyConfigured:true,appId:review.appId}));return;}
    if(command==='resume'){
      const site=new URL(process.env.COUNCIL_SITE||'https://dark-coin.com');
      if(site.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(site.hostname))throw Error('Council site must use HTTPS.');
      const response=await fetch(new URL('/api/council/dao',site),{signal:AbortSignal.timeout(20000)}),data=await response.json();
      if(!response.ok||!data.config?.ready||data.config.network!=='mainnet'||Number(data.config.appId)!==review.appId||
        data.config.root!==review.root||data.config.quoteSigner!==state.config.quoteSigner)throw Error('Matching production Council backend is not ready. Council remains paused.');
    }
    const account=signingAccount(args);if(String(account.addr)!==state.creatorAuthAddress)throw Error('Local key does not control the creator account.');
    const tx=sdk.makeApplicationNoOpTxnFromObject({sender:review.creator,appIndex:review.appId,appArgs:[Buffer.from('pause'),model.u64(pauseValue)],
      boxes:[{appIndex:0,name:model.configKey()}],suggestedParams:{...await algod.getTransactionParams().do(),flatFee:true,fee:1000n}});
    const signed=validateSignedGroup([tx],[tx.signTxn(account.sk)],state.creatorAuthAddress);await simulate(algod,signed,true);
    const result=await broadcastOnce({algod,txns:[tx],signed,receiptFile:path.join(receiptRoot,`mainnet-${command}-${String(tx.firstValid)}.json`)});
    const current=await verifyActivated(review,algod,{serviceAddresses:false});if(Number(current.config.paused)!==pauseValue)throw Error('Pause update confirmed but live state differs.');
    console.log(json({...result,active:pauseValue===0,appId:review.appId}));return;
  }
  // A repeat submit after a confirmed activation is read-only and idempotent.
  if(command==='submit'){
    const current=await snapshot(algod);
    if(current.config){await verifyActivated(review,algod);console.log(json({initialized:true,alreadyActivated:true,paused:Number(current.config.paused)===1,appId:review.appId}));return;}
  }
  const live=await verifyLiveReview(review,algod),txns=reviewedGroup(review);
  if(BigInt(live.round)>txns[0].lastValid)throw Error('Migration transactions expired. Prepare a fresh review.');
  await simulate(algod,txns);
  if(command==='verify'){console.log(json({verified:true,submitted:false,appId:review.appId,approvalSha256:review.approvalSha256,transactionIds:txns.map(tx=>tx.txID())}));return;}
  if(command==='sign'){
    const at=args.indexOf('--out');if(at<0||!args[at+1])throw Error('Choose --out for the signed public transaction group.');
    const account=signingAccount(args);if(String(account.addr)!==live.creatorAuthAddress)throw Error('Local key does not control the creator account.');
    const signed=validateSignedGroup(txns,txns.map(tx=>tx.signTxn(account.sk)),live.creatorAuthAddress);await simulate(algod,signed,true);
    const output=path.resolve(args[at+1]);writeJson(output,{reviewSha256:sha(fs.readFileSync(path.resolve(file))),signedTransactions:signed.map(b=>Buffer.from(b).toString('base64'))});
    console.log(json({signed:true,submitted:false,output,transactionIds:txns.map(tx=>tx.txID())}));return;
  }
  const bundle=JSON.parse(fs.readFileSync(path.resolve(args[2]),'utf8'));
  if(bundle.reviewSha256!==sha(fs.readFileSync(path.resolve(file))))throw Error('Signed group belongs to a different review file.');
  const signed=validateSignedGroup(txns,bundle.signedTransactions,live.creatorAuthAddress);await simulate(algod,signed,true);
  const result=await broadcastOnce({algod,txns,signed,receiptFile:path.join(receiptRoot,'mainnet-activation.json')});
  const state=await verifyActivated(review,algod);console.log(json({...result,initialized:true,paused:Number(state.config.paused)===1,appId:review.appId,approvalSha256:review.approvalSha256}));
}
if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={LEGACY_CREATOR,LEGACY_APPROVAL_SHA256,SOURCE_FILES,sourceHashes,snapshot,assertLegacy,initialConfig,migrationGroup,
  simulate,assertReview,loadReview,reviewedGroup,verifyLiveReview,prepareReview,validateSignedGroup,verifyActivated,broadcastOnce,main};
