import {championNames,createNameChallenge,saveChampionName} from '../../../lib/champion-names';
export const config={api:{bodyParser:{sizeLimit:'16kb'}}};
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 try{
  if(req.method==='GET'){const ids=String(req.query.ids||'').split(',').filter(Boolean);return res.json({names:await championNames(ids,undefined,req.query.game||'3d')});}
  if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return res.status(405).json({error:'Use GET or POST.'});}
  if(req.body?.op==='challenge')return res.json(await createNameChallenge(req.body));
  if(req.body?.op==='save')return res.json(await saveChampionName(req.body));
  return res.status(400).json({error:'Unknown name request.'});
 }catch(e){return res.status(400).json({error:e.message||'Unable to save champion name.'});}
}
