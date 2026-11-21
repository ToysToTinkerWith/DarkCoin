import crypto from 'node:crypto';
import algosdk from 'algosdk';
import {arenaDatabase} from './arena/firebaseServer';
import {CHAMPION_TRAITS} from '../components/contracts/Arena/traitsData';
import {CHAMPION_CREATOR} from './playground';
import {normalizeAndValidateGenerationBuild} from './legacy-champion-build';
import {normalizeChampionName,validChampionId,currentChampionOwner} from './champion-names';

export const GENERATION_FEE={assetId:1088771340,amount:'10000000000',receiver:'VWYCYQ3H3PPNIGON4H363DIH7BP33TTZWUUUNMTDXCIHRCDPFOMU7VJ5HM'};
export const GENERATION_SLOTS=['Background','Skin','Weapon','Magic','Head','Armour','Extra'];
const algod=()=>new algosdk.Algodv2('','https://mainnet-api.algonode.cloud',443);
const indexer=()=>new algosdk.Indexer('','https://mainnet-idx.algonode.cloud',443);
const ref=(db,id)=>db.collection('arenaPrivate').doc('legacy-generation-'+id);

export function validateGenerationSelection(selection,current,holdings){
 const properties={},traitAssetIds={};
 for(const slot of GENERATION_SLOTS){
  const chosen=selection?.[slot];
  if(slot==='Skin'){properties.Skin=current.Skin.name;traitAssetIds.Skin=null;continue;}
  if(chosen==null||chosen===0){properties[slot]='None';traitAssetIds[slot]=0;continue;}
  const id=validChampionId(chosen),trait=CHAMPION_TRAITS[slot]?.find(t=>Number(t.assetId)===id);
  if(!trait)throw Error(`Choose a valid ${slot.toLowerCase()} trait.`);
  if(id!==current[slot]?.assetId&&!holdings.has(id))throw Error(`Your wallet does not own ${trait.trait}.`);
  properties[slot]=trait.trait;traitAssetIds[slot]=id;
 }
 return {properties,traitAssetIds};
}

export async function generationEquipment(address,champId,client=algod(),idx=indexer()){
 const [asset,account]=await Promise.all([client.getAssetByID(champId).do(),client.accountInformation(address).do()]);
 const holdings=new Set((account.assets||[]).filter(a=>BigInt(a.amount)>0n).map(a=>Number(a.assetId)));
 if(String(asset.params.creator)!==CHAMPION_CREATOR||BigInt(asset.params.total)!==1n||!holdings.has(champId))throw Error('Only the current champion owner can generate this character.');
 let metadata,next;
 for(let page=0;page<10&&!metadata;page++){
  let query=idx.lookupAssetTransactions(champId).txType('acfg').limit(100);if(next)query=query.nextToken(next);
  const result=await query.do();
  for(const tx of [...(result.transactions||[])].sort((a,b)=>Number(b.confirmedRound)-Number(a.confirmedRound))){try{const value=JSON.parse(Buffer.from(tx.note||[]).toString());if(value.properties?.Skin){metadata=value.properties;break;}}catch{}}
  next=result.nextToken;if(!next)break;
 }
 if(!metadata?.Skin||!CHAMPION_TRAITS.Skin.some(t=>t.trait===metadata.Skin))throw Error('The champion skin could not be verified.');
 const current={Skin:{name:metadata.Skin}};
 await Promise.all(Object.entries({Background:'B',Weapon:'W',Magic:'M',Head:'H',Armour:'A',Extra:'E'}).map(async([slot,suffix])=>{
  let id;const key=Buffer.alloc(9);key.writeBigUInt64BE(BigInt(champId));key[8]=suffix.charCodeAt(0);
  try{const box=await client.getApplicationBoxByName(1632253886,key).do();id=Number(Buffer.from(box.value).readBigUInt64BE());}
  catch(e){if(e.status!==404&&e.response?.status!==404)throw e;id=CHAMPION_TRAITS[slot].find(t=>t.trait===metadata[slot])?.assetId||0;}
  current[slot]={assetId:id,name:CHAMPION_TRAITS[slot].find(t=>t.assetId===id)?.trait||'None'};
 }));
 return {current,holdings};
}

export async function prepareLegacyGeneration(body,{db=arenaDatabase(),client=algod(),equipment=generationEquipment,now=Date.now()}={}){
 const champId=validChampionId(body.champId),address=String(body.address||'');
 if(!algosdk.isValidAddress(address))throw Error('Connect your wallet.');
 const championName=normalizeChampionName(body.championName);if([...championName].length>32)throw Error('Use no more than 32 characters for the 2D name.');
 const generationBuild=normalizeAndValidateGenerationBuild(body.generationBuild);
 const {current,holdings}=await equipment(address,champId);
 const snapshot=validateGenerationSelection(body.selection,current,holdings);
 // The unchanged standalone listener reads equipped NFT metadata and artwork.
 // Reject draft-only changes before asking for a payment it cannot honor.
 for(const slot of GENERATION_SLOTS){
  if(slot!=='Skin'&&snapshot.traitAssetIds[slot]!==Number(current[slot]?.assetId||0))throw Error('Apply your trait swaps before generating a Chronicles character. The generation server uses your equipped NFT traits.');
 }
 const char=(await db.collection('chars').doc(champId+'object').get()).data();
 if(char?.generationJobId&&!['completed','error','failed'].includes(char.status))throw Error('This champion already has a generation in progress.');
 const id=crypto.randomBytes(24).toString('hex'),expiresAt=now+30*60*1000;
 const intent={schemaVersion:2,generationQueue:'queuedChars',address,champId,championName,generationBuild,...snapshot};
 const digest=crypto.createHash('sha256').update(JSON.stringify(intent)).digest('hex');
 const note=`DarkCoin 2D build:${id}:${digest}`;
 const txn=algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({sender:address,receiver:GENERATION_FEE.receiver,assetIndex:GENERATION_FEE.assetId,amount:BigInt(GENERATION_FEE.amount),note:Buffer.from(note),suggestedParams:await client.getTransactionParams().do()});
 const paymentTxnId=txn.txID();
 await ref(db,id).create({...intent,note,paymentTxnId,lastValid:Number(txn.lastValid),createdAt:now,expiresAt,status:'prepared'});
 return {requestId:id,paymentTxnId,unsigned:Buffer.from(algosdk.encodeUnsignedTransaction(txn)).toString('base64'),feeDark:10000,properties:snapshot.properties};
}

export function verifyGenerationPayment(tx,request){
 const transfer=tx?.assetTransferTransaction;
 if(!tx?.confirmedRound||tx.id!==request.paymentTxnId||tx.sender!==request.address||!transfer||Number(transfer.assetId)!==GENERATION_FEE.assetId||transfer.receiver!==GENERATION_FEE.receiver||BigInt(transfer.amount)!==BigInt(GENERATION_FEE.amount)||Buffer.from(tx.note||[]).toString()!==request.note||tx.rekeyTo||transfer.closeTo||transfer.sender)throw Error('The confirmed payment does not match this 2D build.');
 if(!Number.isFinite(Number(tx.roundTime))||Number(tx.roundTime)*1000>request.expiresAt)throw Error('This build payment was made after the request expired.');
}

export function generationJobPayload(request,transaction,now){
 verifyGenerationPayment(transaction,request);
 const transfer=transaction.assetTransferTransaction;
 // Retain the old queue's payment fields, using confirmed chain data rather than client hints.
 return {...request,status:'queued',queuedAt:now,createdAt:now,randomName:false,
  txnId:transaction.id,paymentTxnId:transaction.id,darkcoinTransferTxId:transaction.id,
  champId:request.champId,configTargetAssetId:request.champId,
  sender:transaction.sender,receiver:transfer.receiver,assetId:Number(transfer.assetId),
  amount:Number(transfer.amount),amountString:BigInt(transfer.amount).toString(),
  confirmedRound:Number(transaction.confirmedRound),noteBase64:Buffer.from(transaction.note).toString('base64'),
  groupTxId:transaction.id,groupId:transaction.group?Buffer.from(transaction.group).toString('base64'):null,
  // Generation pays once without reconfiguring the NFT; do not invent an asset-config transaction.
  assetConfigTxId:null};
}

export async function queueLegacyGeneration({requestId},{db=arenaDatabase(),idx=indexer(),owner=currentChampionOwner,now=Date.now()}={}){
 if(!/^[a-f0-9]{48}$/.test(requestId||''))throw Error('Invalid generation request.');
 const requestRef=ref(db,requestId),request=(await requestRef.get()).data();
 if(!request)throw Error('Generation request not found.');
 if(request.status==='queued')return {status:'queued',requestId,paymentTxnId:request.paymentTxnId};
 let transaction;try{transaction=(await idx.lookupTransactionByID(request.paymentTxnId).do()).transaction;}catch(e){
  if((e.status===404||e.response?.status===404)&&request.lastValid){
   const health=await idx.makeHealthCheck().do();
   if(Number(health.round)>request.lastValid)throw Object.assign(Error('The payment expired without confirming. You can start a new build.'),{code:'UNPAID_EXPIRED'});
  }
  throw Error('Payment is not indexed yet. Retry queueing this payment; do not pay again.');
 }
 const job=generationJobPayload(request,transaction,now);
 await owner(request.address,request.champId);
 // Pin dispatch to the prepared request. Existing cloud-worker purchases must
 // never be replayed into the standalone listener during a rollout or retry.
 const queue=request.generationQueue||'legacyGenerationJobs';
 if(!['queuedChars','legacyGenerationJobs'].includes(queue))throw Error('Unsupported generation queue.');
 const jobRef=db.collection(queue).doc(queue==='queuedChars'?request.paymentTxnId:requestId),paymentRef=db.collection('txns').doc(request.paymentTxnId),charRef=db.collection('chars').doc(request.champId+'object');
 await db.runTransaction(async tx=>{
  const [fresh,used,char]=await Promise.all([tx.get(requestRef),tx.get(paymentRef),tx.get(charRef)]);
  if(fresh.data()?.status==='queued')return;
  if(used.exists)throw Error('This payment was already used.');
  const previous=char.data();if(previous?.generationJobId&&!['completed','error','failed'].includes(previous.status))throw Error('A build is in progress. Keep this payment and retry queueing after it finishes.');
  tx.create(jobRef,{...job,requestId,generationQueue:queue});tx.create(paymentRef,{status:'generation_queued',requestId,generationQueue:queue,champId:request.champId,createdAt:now});
  tx.update(requestRef,{status:'queued',generationQueue:queue,queuedAt:now});
  tx.set(charRef,{status:'queued',stage:'queued',progress:0,generationJobId:requestId,generationQueue:queue,errorMessage:null},{merge:true});
 });
 return {status:'queued',requestId,paymentTxnId:request.paymentTxnId};
}
