const sdk=require('algosdk');
const {Buffer}=require('buffer');
const {protocol,u64,configKey,proposalKey,voteKey,PROPOSAL_MBR,VOTE_MBR,encodeActions,signedQuoteBytes,quoteProposal}=require('./model');
const nacl=require('tweetnacl');
async function buildCouncilGroup({config,sender,action,input={},proposals=[],votes=[],client}){
  if(!config.ready||Number(config.version)!==3)throw Error('Council v3 activation is pending.');
  if(!sdk.isValidAddress(sender))throw Error('Connect a wallet first.');
  const params=await client.getTransactionParams().do(),min=BigInt(params.minFee||1000),address=sdk.getApplicationAddress(config.appId).toString();
  const sp=(units=1)=>({...params,flatFee:true,fee:min*BigInt(units)});
  const p=proposals.find(p=>p.id===String(input.id));
  const boxes=[configKey(),...(input.id?[proposalKey(input.id),proposalKey(input.id)]:[])];
  const assets=[],accounts=[],apps=[];
  let includeAlgoResource=false;
  // Repeated budget calls (or equal funding amounts) must still have different
  // transaction IDs. Algorand rejects duplicate transactions within a group.
  let step=0;
  const note=()=>Buffer.from(`Council ${action} step ${++step}`);
  const app=(args,units=1,extra=[])=>sdk.makeApplicationNoOpTxnFromObject({sender,appIndex:config.appId,appArgs:args.map(a=>typeof a==='string'?Buffer.from(a):a),boxes:[...boxes,...extra].map(name=>({appIndex:0,name})),foreignAssets:[...new Set(assets.filter(n=>n>0||includeAlgoResource))],foreignApps:apps,accounts:[...new Set(accounts.filter(a=>a&&a!==sender&&a!==address))],note:note(),suggestedParams:sp(units)});
  const pay=(amount)=>sdk.makePaymentTxnWithSuggestedParamsFromObject({sender,receiver:address,amount:BigInt(amount),note:note(),suggestedParams:sp()});
  let txns,storage=0,paymentAmount='0',rewardAmount='0',refundAmount='0';
  if(action==='propose'){
    const {manifest,quote:q}=input,fee=quoteProposal(manifest,config);
    const digest=async(bytes)=>Array.from(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',bytes))).map(n=>n.toString(16).padStart(2,'0')).join('');
    if(q.digest!==await digest(Buffer.from(JSON.stringify(manifest)))||q.actionsHash!==await digest(encodeActions(manifest.actions))||Number(q.words)!==fee.words||Number(q.images)!==fee.images)throw Error('Proposal content changed after quoting.');
    if(q.sender!==sender||Number(q.appId)!==Number(config.appId)||String(q.revision)!==String(config.revision)||q.fee!==fee.fee||q.expires<=Date.now()/1000)throw Error('Proposal quote expired or changed. Review it again.');
    if(!nacl.sign.detached.verify(signedQuoteBytes(q),Buffer.from(q.signature,'hex'),sdk.decodeAddress(config.quoteSigner).publicKey))throw Error('Invalid proposal quote signature.');
    boxes.push(proposalKey(config.next),proposalKey(config.next));accounts.push(config.host);
    storage=PROPOSAL_MBR;paymentAmount=q.fee;
    txns=[pay(q.fee),pay(storage),app(['budget']),app(['budget']),app(['budget']),app(['propose',u64(config.next),Buffer.from(q.digest,'hex'),encodeActions(manifest.actions),u64(q.words),u64(q.images),u64(q.expires),u64(q.revision),Buffer.from(q.signature,'hex')],2)];
  }else if(action==='vote'){
    if(!p?.textVerified||p.state!==0||p.deadline<=Date.now()/1000)throw Error('Voting requires a verified open proposal.');
    const nft=input.nft;
    if(!nft||![1,2,3].includes(Number(input.choice)))throw Error('Choose a DAO NFT and vote.');
    if(!Number.isSafeInteger(nft.assetId)||nft.assetId<=0||!Number.isSafeInteger(nft.slot)||nft.slot<0||!/^(?:[a-f0-9]{64}){0,12}$/.test(nft.proof||''))throw Error('Invalid membership proof.');
    const existing=votes.some(v=>v.proposalId===p.id&&v.nftId===nft.assetId);
    storage=existing?0:VOTE_MBR;rewardAmount=existing?'0':String(p.rewardPerVote||0);assets.push(nft.assetId);
    boxes.push(voteKey(p.id,nft.assetId));
    txns=[pay(storage),app(['budget']),app(['budget']),app(['vote',u64(p.id),u64(nft.assetId),u64(input.choice),u64(nft.slot),Buffer.from(nft.proof,'hex')],existing?1:2)];
  }else if(action==='claim'||action==='finalize'){
    if(!p)throw Error('Proposal not found.');
    if(action==='claim'){boxes.push(voteKey(p.id,input.assetId));refundAmount=String(VOTE_MBR);}
    txns=[app(['budget']),app(['budget']),app([action,u64(p.id),...(action==='claim'?[u64(input.assetId)]:[])],action==='claim'?2:1)];
  }else if(action==='execute'){
    if(!p||p.state!==1||!p.textVerified||sender!==config.executor)throw Error('Only the Council executor can execute verified passed actions.');
    const index=Number(input.index),a=p.actions[index];if(!Number.isSafeInteger(index)||index<0||!a)throw Error('Action not found.');
    if(BigInt(p.executed||0)!==(1n<<BigInt(index))-1n)throw Error('Execute approved actions in order; earlier actions must finish first.');
    assets.push(Number(a.asset),Number(a.outputAsset));accounts.push(a.recipient,a.pool);
    if(Number(a.kind)===2){apps.push(Number(config.tinyman));includeAlgoResource=true;}
    txns=[app(['budget']),app(['budget']),app(['budget']),app(['execute',u64(p.id),u64(index),encodeActions(p.actions)],6)];
  }else throw Error('Unknown Council action.');
  // The signed size includes the group field. Preserve extra pooled inner fees.
  for(const tx of txns){const extra=tx.fee-min;tx.group=new Uint8Array(32).fill(1);for(let pass=0;pass<3;pass++)tx.fee=(BigInt(params.fee||0)*BigInt(tx.estimateSize())>min?BigInt(params.fee||0)*BigInt(tx.estimateSize()):min)+extra;tx.group=undefined;}
  sdk.assignGroupID(txns);return {txns,storage,paymentAmount,rewardAmount,refundAmount,networkFee:txns.reduce((s,t)=>s+t.fee,0n).toString()};
}
async function sendCouncilGroup({client,txns,signTransactions,onStatus=()=>{}}){
  const result=await client.simulateTransactions(new sdk.modelsv2.SimulateRequest({allowEmptySignatures:true,fixSigners:true,txnGroups:[new sdk.modelsv2.SimulateRequestTransactionGroup({txns:txns.map(tx=>sdk.decodeSignedTransaction(sdk.encodeUnsignedSimulateTransaction(tx)))})]})).do();
  if(!result.txnGroups?.[0]||result.txnGroups[0].failureMessage)throw Error(`Council simulation failed: ${result.txnGroups?.[0]?.failureMessage||'No result'}`);
  onStatus('Review and sign in your wallet.');const signed=await signTransactions(txns.map(t=>sdk.encodeUnsignedTransaction(t)));
  if(!signed||signed.length!==txns.length||signed.some((t,i)=>!t||sdk.decodeSignedTransaction(t).txn.txID()!==txns[i].txID()))throw Error('Wallet did not sign the expected complete group.');
  const id=txns[0].txID();onStatus(`Confirming ${id}`);
  try{await client.sendRawTransaction(signed).do();}catch(e){if(!/already in ledger|timeout|network|fetch/i.test(e.message))throw e;}
  try{await sdk.waitForConfirmation(client,id,30);}catch{throw Error(`Confirmation uncertain for ${id}. Check this ID before paying or submitting again.`);}
  onStatus('Confirmed.');return txns.at(-1).txID();
}
module.exports={buildCouncilGroup,sendCouncilGroup};

