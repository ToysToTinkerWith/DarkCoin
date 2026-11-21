import crypto from 'crypto';
import sdk from 'algosdk';
import admin from '../../../Firebase/FirebaseAdmin';
import {verifyProof} from '../../../functions/council/proof';
import {configuration} from '../../../functions/council/chain';
import {storeImage,loadImage,inspectImage,readyMediaLocation} from '../../../functions/council/images';
export const config={api:{bodyParser:{sizeLimit:'9mb'}}};
export default async function handler(req,res){
  try{
    const db=admin.firestore(),storage=admin.storage();
    if(req.method==='GET'||req.method==='HEAD'){
      const hash=String(req.query.hash||'');if(!/^[a-f0-9]{64}$/.test(hash))return res.status(400).end();
      const location=await readyMediaLocation({db,storage,hash});if(!location)return res.status(404).end();
      if(req.method==='HEAD'){
        res.setHeader('Content-Type',location.record.contentType||'image/jpeg');
        if(location.record.size)res.setHeader('Content-Length',String(location.record.size));
        res.setHeader('Accept-Ranges','bytes');return res.status(200).end();
      }
      if(location.url){res.setHeader('Cache-Control','public,max-age=300');res.setHeader('X-Content-Type-Options','nosniff');return res.redirect(307,location.url);}
      const image=await loadImage({db,storage,hash});if(!image)return res.status(404).end();
      res.setHeader('Content-Type',image.contentType);res.setHeader('Cache-Control','public,max-age=31536000,immutable');res.setHeader('X-Content-Type-Options','nosniff');return res.send(image.bytes);
    }
    if(req.method!=='POST')return res.status(405).json({error:'GET or POST required.'});
    const {sender,proof,data}=req.body;
    const bytes=Buffer.from(String(data||''),'base64');inspectImage(bytes);
    if(!sdk.isValidAddress(sender))throw Error('Connect a valid wallet.');
    const c=configuration(),wallet=await new sdk.Algodv2('',c.algodUrl,443).accountInformation(sender).do();
    verifyProof({sender,proof,kind:'council-image-upload',digest:crypto.createHash('sha256').update(bytes).digest('hex'),signer:String(wallet.authAddr||sender)});
    const bucketName=process.env.COUNCIL_IMAGE_BUCKET||process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if(!bucketName)throw Error('Council Firebase image storage is not configured.');
    return res.json(await storeImage({db,bucket:storage.bucket(bucketName),bytes,sender}));
  }catch(e){return res.status(400).json({error:e.message||'Image upload failed.'});}
}
