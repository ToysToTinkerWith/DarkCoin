// Publish an operator's public implementation report after verifying live approval.
// Run locally with existing Firebase Admin credentials; never paste keys into a report.
const fs=require('node:fs'),path=require('node:path'),sdk=require('algosdk');
const {verifyProposal}=require('./council-execute.cjs');
const {loadManifest}=require('../functions/council/content');
const ROOT=path.resolve(__dirname,'..'),STATUSES=new Set(['running','complete','blocked']);
const TXID=/^[A-Z2-7]{52}$/;

function publicSummary(value){
  const text=String(value||'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').trim();
  if(text.length<8||text.length>4000)throw Error('Use a public summary of 8–4,000 characters.');
  if(/-----BEGIN|ya29\.|AIza[\w-]{20,}|\bsk-[\w-]{15,}|(?:mnemonic|private[_ -]?key|secret[_ -]?seed|refresh[_ -]?token|access[_ -]?token|password)\s*[:=]\s*\S+/i.test(text)){
    throw Error('The summary appears to contain a credential. Use a public description without secrets.');
  }
  try{sdk.mnemonicToSecretKey(text);throw Error('Do not publish a wallet mnemonic.');}
  catch(error){if(error.message==='Do not publish a wallet mnemonic.')throw error;}
  return text;
}
function publicRelease(value){
  if(!value)return '';
  let url;try{url=new URL(String(value));}catch{throw Error('Use a public HTTPS release URL.');}
  const host=url.hostname.toLowerCase(),ipv4=host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if(url.protocol!=='https:'||url.username||url.password||host==='localhost'||!host.includes('.')||
    host.endsWith('.local')||host.endsWith('.internal')||host.startsWith('[')||
    (ipv4&&(Number(ipv4[1])===10||Number(ipv4[1])===127||Number(ipv4[1])===0||Number(ipv4[1])>=224||
      (Number(ipv4[1])===192&&Number(ipv4[2])===168)||(Number(ipv4[1])===169&&Number(ipv4[2])===254)||
      (Number(ipv4[1])===172&&Number(ipv4[2])>=16&&Number(ipv4[2])<=31)))||
    [...url.searchParams.keys()].some(key=>/token|key|secret|signature|password|auth|credential/i.test(key))){
    throw Error('Release links must be public HTTPS URLs without private hosts or access credentials.');
  }
  return url.toString();
}
function transactionIds(values){
  const ids=[...new Set((values||[]).map(String))];
  if(ids.length>32||ids.some(id=>!TXID.test(id)))throw Error('Use at most 32 valid Algorand transaction IDs.');
  return ids;
}
function isExecution(tx,appId,id){
  const app=tx.applicationTransaction,args=app?.applicationArgs||[];
  return Number(app?.applicationId)===Number(appId)&&Buffer.from(args[0]||[]).toString()==='execute'&&
    args[1]?.length===8&&Buffer.from(args[1]).readBigUInt64BE()===BigInt(id);
}
async function confirmedExecution(indexer,txid,appId,id){
  const tx=(await indexer.lookupTransactionByID(txid).do()).transaction;
  if(!tx||!tx.confirmedRound)throw Error(`Transaction ${txid} is not confirmed.`);
  if(isExecution(tx,appId,id))return txid;
  // Local execution receipts identify their group's first budget call. Resolve
  // the same sender/round/group to its actual execute call before publishing it.
  if(Number(tx.applicationTransaction?.applicationId)!==Number(appId)||!tx.group?.length)throw Error(`Transaction ${txid} is unrelated to this Council proposal.`);
  const page=await indexer.searchForTransactions().address(String(tx.sender)).minRound(tx.confirmedRound)
    .maxRound(tx.confirmedRound).txType('appl').limit(1000).do();
  const execution=(page.transactions||[]).find(candidate=>candidate.group&&Buffer.from(candidate.group).equals(Buffer.from(tx.group))&&isExecution(candidate,appId,id));
  if(!execution)throw Error(`Transaction ${txid} is unrelated to this Council proposal.`);
  return execution.id;
}
async function publishReport({id,digest,status,summary,release='',transactionIds:inputIds=[],db,client,indexer,
  verify=verifyProposal,now=Date.now(),site=process.env.COUNCIL_SITE||'https://dark-coin.com',dryRun=false}){
  if(!/^[1-9]\d*$/.test(String(id))||BigInt(id)>BigInt(Number.MAX_SAFE_INTEGER)||!/^[a-f0-9]{64}$/.test(digest||''))throw Error('Provide the approved proposal ID and exact --digest.');
  if(!STATUSES.has(status))throw Error('Report status must be running, complete or blocked.');
  const cleanSummary=publicSummary(summary),cleanRelease=publicRelease(release),ids=transactionIds(inputIds);
  const {data,proposal}=await verify({id:String(id),digest,site,client,loadManifest:hash=>loadManifest(db,hash)});
  if(!data.config.ready||proposal.state!==1||!proposal.textVerified||proposal.digest!==digest)throw Error('Only the exact live, verified, passed proposal may receive a report.');
  const mask=(1n<<BigInt(proposal.actions.length))-1n;
  if(status==='complete'&&(BigInt(proposal.executed)&mask)!==mask)throw Error('Approved treasury actions remain unexecuted. Report running or blocked.');
  const idx=indexer||new sdk.Indexer('',data.config.indexerUrl||`https://${data.config.network}-idx.algonode.cloud`,443);
  const confirmed=[];
  for(const txid of ids)confirmed.push(await confirmedExecution(idx,txid,data.config.appId,id));
  const key=`${data.config.network}-${data.config.appId}-${id}`;
  const report={proposalId:String(id),appId:Number(data.config.appId),network:data.config.network,digest,status,
    summary:cleanSummary,release:cleanRelease,transactionIds:[...new Set(confirmed)],updatedAt:now};
  if(dryRun)return {key,report,written:false};
  const ref=db.collection('councilProgress').doc(key);
  await db.runTransaction(async tx=>{
    const old=(await tx.get(ref)).data()||{};
    if(old.digest&&old.digest!==digest)throw Error('Existing report belongs to a different approved manifest.');
    tx.set(ref,{...report,createdAt:old.createdAt||now,revision:Number(old.revision||0)+1,
      transactionIds:[...new Set([...(old.transactionIds||[]),...report.transactionIds])]});
  });
  return {key,report,written:true};
}
function localEnvironment(args){
  const allowed=new Set(['COUNCIL_NETWORK','COUNCIL_APP_ID','COUNCIL_APPROVAL_SHA256','COUNCIL_SITE',
    'GOOGLE_APPLICATION_CREDENTIALS','FIREBASE_PROJECT_ID','GCLOUD_PROJECT']);
  for(const file of ['.env','.env.deployment.local']){
    const name=path.join(ROOT,file);if(!fs.existsSync(name))continue;
    for(const [key,value]of Object.entries(require('dotenv').parse(fs.readFileSync(name))))if(allowed.has(key)&&!process.env[key])process.env[key]=value;
  }
  const at=args.indexOf('--runtime'),runtime=at>=0?path.resolve(args[at+1]):path.join(ROOT,'.council-local/runtime.public.json');
  if(at>=0||fs.existsSync(runtime))for(const [key,value]of Object.entries(JSON.parse(fs.readFileSync(runtime,'utf8')))){
    if(allowed.has(key))process.env[key]=String(value);
  }
}
async function main(args=process.argv.slice(2)){
  const [id,status]=args,option=name=>{const at=args.indexOf(name);return at>=0?args[at+1]:undefined;};
  if(!id||!STATUSES.has(status))throw Error('Usage: council-report.cjs ID running|complete|blocked --digest SHA --summary TEXT [--summary-file FILE] [--release HTTPS_URL] [--tx TXID] [--runtime PUBLIC_CONFIG_JSON] [--dry-run]');
  localEnvironment(args);
  const admin=require('firebase-admin'),options={};
  if(!process.env.GOOGLE_APPLICATION_CREDENTIALS&&fs.existsSync(path.join(ROOT,'service.json'))){
    const service=JSON.parse(fs.readFileSync(path.join(ROOT,'service.json'),'utf8'));options.credential=admin.credential.cert(service);options.projectId=service.project_id;
  }else options.credential=admin.credential.applicationDefault();
  const app=admin.initializeApp(options,`council-report-${process.pid}`);
  try{
    const summaryFile=option('--summary-file');
    if(summaryFile&&fs.statSync(path.resolve(summaryFile)).size>16000)throw Error('Public summary file is too large.');
    const txids=[];for(let i=0;i<args.length;i++)if(args[i]==='--tx')txids.push(args[i+1]);
    const result=await publishReport({id,digest:option('--digest'),status,summary:summaryFile?fs.readFileSync(path.resolve(summaryFile),'utf8'):option('--summary'),
      release:option('--release'),transactionIds:txids,db:admin.firestore(app),dryRun:args.includes('--dry-run')});
    console.log(JSON.stringify(result,null,2));
  }finally{await app.delete();}
}
if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={publicSummary,publicRelease,transactionIds,isExecution,confirmedExecution,publishReport,localEnvironment,main};
