// Local-computer tool. verify is read-only. execute requires an explicit action
// and digest, rechecks the live vote, simulates, and persists its ID before sending.
const fs=require('node:fs'),path=require('node:path'),sdk=require('algosdk');
require('dotenv').config({path:path.resolve(__dirname,'../.env'),quiet:true});
require('dotenv').config({path:path.resolve(__dirname,'../.env.deployment.local'),quiet:true});
const {configuration,readCouncil}=require('../functions/council/chain');
const {sha}=require('../functions/council/content');
const {verifyAttachment}=require('../functions/council/attachmentIntegrity');
const {executeAction,executionId}=require('../functions/council/execution');
function localStore(directory){
  fs.mkdirSync(directory,{recursive:true});const file=path.join(directory,'receipts.json');
  const read=()=>fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{};
  const save=records=>{const temp=file+'.tmp';fs.writeFileSync(temp,JSON.stringify(records,null,2));fs.renameSync(temp,file);};
  const ref=key=>({key,get:async()=>{const records=read();return {exists:key in records,data:()=>records[key]};},set:async value=>{const records=read();records[key]=value;save(records);},collection:name=>({doc:id=>ref(`${key}/${name}/${id}`)})});
  const db={collection:name=>({doc:id=>ref(`${name}/${id}`)}),runTransaction:async fn=>{
    const records=read(),changes=[];const value=await fn({get:async r=>({exists:r.key in records,data:()=>records[r.key]}),update:(r,patch)=>changes.push([r.key,patch])});
    for(const [key,patch]of changes)records[key]={...records[key],...patch};save(records);return value;
  }};return {db};
}
async function verifyProposal({id,digest,site='https://dark-coin.com',client,loadManifest,verifyImages=true,read=readCouncil}){
  if(!/^\d+$/.test(String(id))||!/^[a-f0-9]{64}$/.test(digest||''))throw Error('A proposal ID and its copied --digest are required.');
  const origin=new URL(site);if(origin.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(origin.hostname))throw Error('Use HTTPS for the Council site.');
  const loader=loadManifest||(async(hash)=>{const response=await fetch(new URL(`/api/council/manifest?digest=${hash}`,origin),{signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('Approved proposal content is unavailable.');const value=await response.json();if(value.digest!==hash||sha(JSON.stringify(value.manifest))!==hash)throw Error('Proposal content checksum failed.');return value.manifest;});
  const data=await read('',{proposalId:String(id),client,loadManifest:loader});
  if(!data.config.ready)throw Error('The Council v3 contract has not been activated.');
  const proposal=data.proposals.find(p=>p.id===String(id));
  if(!proposal||proposal.state!==1||!proposal.textVerified||proposal.digest!==digest)throw Error('The live chain does not show this exact proposal as approved.');
  if(verifyImages)for(const attachment of proposal.images){await verifyAttachment(new URL(`/api/council/image?hash=${attachment.hash}`,origin),{hash:attachment.hash,...(attachment.size?{size:attachment.size}:{})});}
  return {data,proposal,loader};
}
async function main(args=process.argv.slice(2)){
  const [command,id,index]=args,digestAt=args.indexOf('--digest'),digest=digestAt>=0?args[digestAt+1]:'';
  if(!['verify','execute'].includes(command))throw Error('Usage: node scripts/council-execute.cjs verify ID --digest SHA256 | execute ID ACTION_INDEX --digest SHA256');
  const base=configuration(),client=new sdk.Algodv2('',base.algodUrl,443),verified=await verifyProposal({id,digest,client,site:process.env.COUNCIL_SITE||'https://dark-coin.com'});
  const {data,proposal,loader}=verified;
  if(command==='verify'){console.log(JSON.stringify({verified:true,network:base.network,appId:base.appId,proposalId:id,digest,title:proposal.title,body:proposal.body,images:proposal.images,actions:proposal.actions,executed:proposal.executed,executor:data.config.executor},null,2));return;}
  if(!/^\d+$/.test(index||'')||Number(index)>=proposal.actions.length)throw Error('Choose an approved zero-based action index.');
  const mnemonic=process.env.COUNCIL_EXECUTOR_MNEMONIC||process.env.DEPLOYMENT_CREATOR_MNEMONIC||process.env.CREATOR_MNEMONIC;if(!mnemonic)throw Error('Configure the executor locally, or sign this action on the Council page with its executor wallet. Never post a mnemonic in chat.');
  const account=sdk.mnemonicToSecretKey(mnemonic);if(String(account.addr)!==data.config.executor)throw Error('The configured local account is not the Council executor.');
  const directory=path.resolve(process.env.COUNCIL_LOCAL_STATE||'.council-local'),key=executionId(base.network,base.appId,id);fs.mkdirSync(directory,{recursive:true});
  // All proposals share the journal, so serialize its read/modify/write updates.
  const lock=path.join(directory,'execution.lock');let fd;
  try{fd=fs.openSync(lock,'wx');fs.writeFileSync(fd,String(process.pid));}catch{throw Error('Another local execution holds the journal lock. Check it before retrying.');}
  try{const {db}=localStore(directory),ref=db.collection('councilExecutions').doc(key);if(!(await ref.get()).exists)await ref.set({proposalId:id,digest,transactionIds:[]});
    const result=await executeAction({db,ref,job:{proposalId:id,digest,appId:base.appId,network:base.network},index:Number(index),account,client,loadApprovedManifest:loader});console.log(JSON.stringify(result,null,2));
  }finally{fs.closeSync(fd);fs.unlinkSync(lock);}
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={localStore,verifyProposal,main};
