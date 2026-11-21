import admin from '../../../Firebase/FirebaseAdmin';
import { readCouncil } from '../../../functions/council/chain';
import { loadManifest } from '../../../functions/council/content';
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET')return res.status(405).json({error:'GET required.'});
  try {const db=admin.firestore();const result=await readCouncil(String(req.query.address||''),{
    proposalId:req.query.proposalId,before:req.query.before,limit:req.query.limit,view:req.query.view||'list',
    loadManifest:(digest)=>loadManifest(db,digest),
    loadExecution:async(id)=>{const snap=await db.collection('councilProgress').doc(`${process.env.COUNCIL_NETWORK||'mainnet'}-${process.env.COUNCIL_APP_ID||1239236238}-${id}`).get();return snap.exists?snap.data():null;},
    loadDiscussion:async(id)=>{const snap=await db.collection('councilDiscordProposals').doc(`${process.env.COUNCIL_NETWORK||'mainnet'}-${process.env.COUNCIL_APP_ID||1239236238}-${id}`).get();return snap.exists?snap.data():null;}
  });return res.json(result);}catch(e){return res.status(503).json({error:e.message});}
}
