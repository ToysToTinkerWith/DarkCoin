import crypto from 'crypto';
import sdk from 'algosdk';
import admin from '../../../Firebase/FirebaseAdmin';
import {configuration} from '../../../functions/council/chain';
import {verifyProof} from '../../../functions/council/proof';
import {descriptor,beginUpload,uploadStatus,verifyUpload} from '../../../functions/council/media';

export const config={api:{bodyParser:{sizeLimit:'32kb'}}};
function uploadOrigin(req){
  const origin=String(req.headers.origin||process.env.COUNCIL_SITE||'https://dark-coin.com');
  const allowed=new Set(['https://dark-coin.com','https://www.dark-coin.com','https://dark-coin-dc4a3.web.app','https://dark-coin-dc4a3.firebaseapp.com',
    'http://localhost:3015','http://127.0.0.1:3015','http://localhost:3016','http://127.0.0.1:3016']);
  if(!allowed.has(origin))throw Error('This upload origin is not authorized.');
  return origin;
}
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST')return res.status(405).json({error:'POST required.'});
  try{
    const db=admin.firestore(),storage=admin.storage(),{action,id,token}=req.body||{};
    if(action==='init'){
      const {sender,proof}=req.body,file=descriptor(req.body.file);
      if(!sdk.isValidAddress(sender))throw Error('Connect a wallet to attach media.');
      const base=configuration(),wallet=await new sdk.Algodv2('',base.algodUrl,443).accountInformation(sender).do();
      const digest=crypto.createHash('sha256').update(JSON.stringify(file)).digest('hex');
      verifyProof({sender,proof,kind:'council-media-upload',digest,signer:String(wallet.authAddr||sender)});
      const bucketName=process.env.COUNCIL_IMAGE_BUCKET||process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
      if(!bucketName)throw Error('Council Firebase media storage is not configured.');
      return res.json(await beginUpload({db,storage,bucket:storage.bucket(bucketName),sender,file,origin:uploadOrigin(req)}));
    }
    if(action==='status')return res.json(await uploadStatus({db,id,token}));
    if(action==='verify')return res.json(await verifyUpload({db,storage,id,token}));
    return res.status(400).json({error:'Choose an upload, status or verification action.'});
  }catch(error){return res.status(400).json({error:error.message||'Attachment upload failed.',
    ...(/^UPLOAD_SESSION_(?:INVALID|EXPIRED|UNAUTHORIZED)$/.test(String(error.code||''))?{code:error.code}:{})});}
}
