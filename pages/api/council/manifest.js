import admin from '../../../Firebase/FirebaseAdmin';
import {loadManifest} from '../../../functions/council/content';
export default async function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({error:'GET required.'});
  const digest=String(req.query.digest||'');if(!/^[a-f0-9]{64}$/.test(digest))return res.status(400).json({error:'Invalid proposal digest.'});
  try{const manifest=await loadManifest(admin.firestore(),digest);if(!manifest)return res.status(404).json({error:'Verified proposal content not found.'});res.setHeader('Cache-Control','public,max-age=31536000,immutable');return res.json({digest,manifest});}catch(e){return res.status(503).json({error:e.message});}
}
