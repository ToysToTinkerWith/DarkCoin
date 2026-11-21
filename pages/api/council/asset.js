import sdk from 'algosdk';
import {configuration} from '../../../functions/council/chain';
import {councilAssetMetadata} from '../../../functions/council/assets';
export default async function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({error:'GET required.'});
  const id=Number(req.query.id);if(!Number.isSafeInteger(id)||id<0)return res.status(400).json({error:'Invalid asset ID.'});
  if(id===0)return res.json(councilAssetMetadata(0));
  try{const c=configuration(),idx=new sdk.Indexer('',c.indexerUrl,443),r=await idx.lookupAssetByID(id).do();if(r.asset.deleted)throw Error('Asset was deleted.');res.setHeader('Cache-Control','public,max-age=300');return res.json(councilAssetMetadata(id,r.asset.params));}catch(e){return res.status(400).json({error:e.message});}
}
