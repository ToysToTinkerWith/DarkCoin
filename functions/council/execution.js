const sdk=require('algosdk');
const crypto=require('node:crypto');
const {readCouncil,configuration}=require('./chain');
const {loadManifest}=require('./content');
const {buildCouncilGroup,sendCouncilGroup}=require('./transactions');
const {proposalKey,decodeProposal}=require('./model');
const executionId=(network,appId,id)=>`${network}-${appId}-${id}`;
async function syncQueue(db){
  const data=await readCouncil('',{loadManifest:d=>loadManifest(db,d)});if(!data.config.ready)return;
  for(const p of data.proposals){
    const ref=db.collection('councilExecutions').doc(executionId(data.config.network,data.config.appId,p.id));
    if(p.state===1&&p.textVerified){try{await ref.create({proposalId:p.id,appId:data.config.appId,network:data.config.network,digest:p.digest,status:'queued',attempt:0,updatedAt:Date.now(),transactionIds:[]});}catch(e){if(e.code!==6)throw e;}}
  }
}
async function finalizeExpired(db,account){
  const data=await readCouncil('',{loadManifest:d=>loadManifest(db,d)});if(!data.config.ready)return;
  const client=new sdk.Algodv2('',data.config.algodUrl,443);
  for(const p of data.proposals.filter(p=>p.state===0&&p.ended).slice(0,25)){
    const group=await buildCouncilGroup({config:data.config,sender:String(account.addr),action:'finalize',input:{id:p.id},proposals:data.proposals,client});
    const ref=db.collection('councilFinalizations').doc(executionId(data.config.network,data.config.appId,p.id)),old=(await ref.get()).data();
    const round=Number((await client.status().do()).lastRound);
    if(old&&old.lastValid>=round)continue;
    await ref.set({txid:group.txns[0].txID(),lastValid:Number(group.txns[0].lastValid),updatedAt:Date.now()});
    await sendCouncilGroup({...group,client,signTransactions:async bytes=>bytes.map(b=>sdk.decodeUnsignedTransaction(b).signTxn(account.sk))});
  }
}
async function acquire(db,ref,workerId,now=Date.now()){
  return db.runTransaction(async tx=>{const snap=await tx.get(ref);if(!snap.exists)return null;const job=snap.data();
    if(['complete','needs_clarification'].includes(job.status)||(job.leaseUntil||0)>now)return null;
    const lease=crypto.randomUUID();tx.update(ref,{status:'running',lease,workerId,leaseUntil:now+180000,attempt:Number(job.attempt||0)+1,updatedAt:now});return {...job,lease};});
}
async function leasedUpdate(db,ref,lease,patch){return db.runTransaction(async tx=>{const snap=await tx.get(ref);if(snap.data()?.lease!==lease)throw Error('Council execution lease lost.');tx.update(ref,{...patch,updatedAt:Date.now()});});}
async function executeAction({db,ref,job,index,account,client,now=Date.now,loadApprovedManifest}){
  const base=configuration();if(job.network!==base.network||Number(job.appId)!==base.appId)throw Error('Execution job belongs to another Council.');
  const data=await readCouncil('',{proposalId:String(job.proposalId),loadManifest:loadApprovedManifest||((d)=>loadManifest(db,d)),client});
  const p=data.proposals.find(p=>p.id===String(job.proposalId));
  if(!p||!p.textVerified||p.state!==1||p.digest!==job.digest)throw Error('Approved proposal integrity check failed.');
  if((BigInt(p.executed)&(1n<<BigInt(index)))!==0n)return {alreadyExecuted:true,index};
  if(String(account.addr)!==data.config.executor)throw Error('Local signing account is not the voted executor.');
  const opRef=ref.collection('transactions').doc(String(index));let pending=(await opRef.get()).data();
  if(pending?.txid){
    try{const info=await client.pendingTransactionInformation(pending.txid).do();if(info.confirmedRound)return {txid:pending.txid,index};}catch{}
    const status=await client.status().do();
    if(Number(status.lastRound)<=Number(pending.lastValid))throw Error(`Previous execution ${pending.txid} is still uncertain; no duplicate was sent.`);
    // After expiry, the authoritative action bit is checked again below.
    const current=decodeProposal((await client.getApplicationBoxByName(base.appId,proposalKey(p.id)).do()).value,p.id);
    if((BigInt(current.executed)&(1n<<BigInt(index)))!==0n)return {alreadyExecuted:true,index};
  }
  const group=await buildCouncilGroup({config:data.config,sender:String(account.addr),action:'execute',input:{id:p.id,index},proposals:data.proposals,client});
  const result=await client.simulateTransactions(new sdk.modelsv2.SimulateRequest({allowEmptySignatures:true,fixSigners:true,txnGroups:[new sdk.modelsv2.SimulateRequestTransactionGroup({txns:group.txns.map(t=>sdk.decodeSignedTransaction(sdk.encodeUnsignedSimulateTransaction(t)))})]})).do();
  if(result.txnGroups?.[0]?.failureMessage||!result.txnGroups?.length)throw Error(`Execution simulation failed: ${result.txnGroups?.[0]?.failureMessage||'no result'}`);
  const txid=group.txns[0].txID();
  // Save identity BEFORE broadcasting. Contract bit and durable identity protect
  // against crashes between broadcasting and recording its confirmation.
  await opRef.set({txid,lastValid:String(group.txns[0].lastValid),submittedAt:now()});
  try{await client.sendRawTransaction(group.txns.map(t=>t.signTxn(account.sk))).do();}catch(e){if(!/already in ledger|timeout|network|fetch/i.test(e.message))throw e;}
  await sdk.waitForConfirmation(client,txid,30);
  await db.runTransaction(async tx=>{const snap=await tx.get(ref),value=snap.data()||{};tx.update(ref,{transactionIds:[...new Set([...(value.transactionIds||[]),txid])],updatedAt:now()});});
  return {txid,index};
}
module.exports={executionId,syncQueue,finalizeExpired,acquire,leasedUpdate,executeAction};

