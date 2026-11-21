import {arenaDatabase} from '../../../lib/arena/firebaseServer';
import {economyConfig,treasuryInventory} from '../../../lib/arena/treasury';
import {directLedgerId,subtractDirectReservations} from '../../../lib/arena/direct-rewards';
import {lootPreview} from '../../../lib/arena/loot-preview';

let cached=null,pending=null;
export async function readLootPreview(settings,db){
 const ref=db.collection('arenaPrivate').doc(directLedgerId(settings.appId));
 const before=await ref.get();
 if(before.data()?.operation)throw Error('Treasury payout in progress');
 const items=await treasuryInventory(settings,{includeImages:false});
 const after=await ref.get();
 if(after.data()?.operation||JSON.stringify(before.data())!==JSON.stringify(after.data()))throw Error('Treasury inventory changed during snapshot');
 return {enabled:true,appId:settings.appId,asOf:Date.now(),...lootPreview(subtractDirectReservations(items,after.data()))};
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Use GET'});}
 try{
  const settings=economyConfig();
  if(!settings.enabled)return res.json({enabled:false,assets:[]});
  if(cached?.appId===settings.appId&&Date.now()-cached.asOf<30000)return res.json(cached);
  // Coalesce visitors' requests: one read-only snapshot per instance per 30 seconds.
  if(!pending)pending=readLootPreview(settings,arenaDatabase()).then(d=>(cached=d)).finally(()=>{pending=null;});
  return res.json(await pending);
 }catch(e){console.error('Public loot snapshot unavailable:',e.message);return res.status(503).json({error:'Live inventory is updating. Please try again shortly.'});}
}
