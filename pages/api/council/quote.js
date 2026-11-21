import sdk from 'algosdk';
import admin from '../../../Firebase/FirebaseAdmin';
import {readCouncil} from '../../../functions/council/chain';
import {makeQuote,storeManifest,signingKey,sha} from '../../../functions/council/content';
import {resolveSwap} from '../../../functions/council/tinyman';
import {verifyProof} from '../../../functions/council/proof';
import {readyAttachments} from '../../../functions/council/media';
export const config={api:{bodyParser:{sizeLimit:'1mb'}}};
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');if(req.method!=='POST')return res.status(405).json({error:'POST required.'});
  try {
    const {sender,proposal,proof}=req.body;if(!sdk.isValidAddress(sender))throw Error('Connect a wallet to submit.');
    const {config:policy}=await readCouncil('',{view:'config'});if(!policy.ready)throw Error('Council contract setup is pending.');
    if(Number(policy.paused))throw Error('Council submissions are temporarily paused.');
    const key=signingKey();if(sdk.encodeAddress(key.publicKey)!==policy.quoteSigner)throw Error('Council quote signer does not match the contract.');
    const db=admin.firestore(),client=new sdk.Algodv2('',policy.algodUrl,443),wallet=await client.accountInformation(sender).do();
    verifyProof({sender,proof,kind:'council-proposal-quote',digest:sha(JSON.stringify(proposal)),signer:String(wallet.authAddr||sender)});
    await db.runTransaction(async tx=>{const ref=db.collection('councilQuoteLimits').doc(sender),snap=await tx.get(ref),old=snap.data()||{},day=new Date().toISOString().slice(0,10),count=old.day===day?Number(old.count):0;if(count>=20)throw Error('Daily proposal quote limit reached.');tx.set(ref,{day,count:count+1});});
    const images=await readyAttachments(db,proposal.images||[],admin.storage());
    const indexer=new sdk.Indexer('',policy.indexerUrl,443),actions=[];
    for(const action of proposal.actions||[])actions.push(await resolveSwap(indexer,policy.network,action));
    const result=makeQuote({...proposal,images,actions},{config:policy,sender,secretKey:key.secretKey});await storeManifest(db,result.manifest,result.quote.digest);
    return res.json(result);
  }catch(e){return res.status(400).json({error:e.message});}
}
