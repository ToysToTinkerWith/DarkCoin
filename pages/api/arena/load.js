import {loaderStatus,inspectLoadAsset,prepareLoad} from '../../../lib/arena/treasury-loader';
export const config={api:{bodyParser:{sizeLimit:'4kb'}}};
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 try{
  if(req.method==='GET')return res.json(await loaderStatus());
  if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return res.status(405).json({error:'Use GET or POST.'});}
  const {op,address,assetId,amount}=req.body||{};
  if(op==='asset')return res.json(await inspectLoadAsset(address,Number(assetId)));
  if(op==='prepare')return res.json(await prepareLoad(address,Number(assetId),amount));
  return res.status(400).json({error:'Unknown loading operation.'});
 }catch(e){return res.status(400).json({error:e.message||'Unable to load the treasury.'});}
}
