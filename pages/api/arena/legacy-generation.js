import {prepareLegacyGeneration,queueLegacyGeneration} from '../../../lib/legacy-generation';
export const config={api:{bodyParser:{sizeLimit:'24kb'}}};
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'Use POST.'});
 try{
  if(req.body?.op==='prepare'){
   if(process.env.LEGACY_GENERATION_ENABLED!=='true')return res.status(503).json({error:'2D generation is not online yet. No payment has been requested.'});
   return res.json(await prepareLegacyGeneration(req.body));
  }
  if(req.body?.op==='queue')return res.json(await queueLegacyGeneration(req.body));
  return res.status(400).json({error:'Unknown generation request.'});
 }catch(e){return res.status(400).json({error:e.message||'Unable to generate the 2D character.',...(e.code?{code:e.code}:{})});}
}
