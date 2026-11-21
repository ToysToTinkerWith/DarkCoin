import {arenaDatabase} from '../../../lib/arena/firebaseServer';
import {economyConfig,claimTransaction,treasuryClient,readBox,encounterKey} from '../../../lib/arena/treasury';
import algosdk from 'algosdk';
import {walletRewardPage} from '../../../lib/arena/wallet-rewards';
import {scheduleRef} from '../../../lib/arena/encounter-schedule';
export const config={api:{bodyParser:{sizeLimit:'24kb'}}};
const attempts=new Map();
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 try{
  const settings=economyConfig();
  if(req.method==='GET'){
   const db=arenaDatabase(),pointer=(await scheduleRef(db,settings.appId).get()).data();
   const current=pointer?(await db.collection('arenaPrivate').doc(`loot-encounter-${settings.appId}-${pointer.encounterId}`).get()).data():null;
   return res.json({...settings,schedule:current?[{id:current.id,name:current.name,kind:current.kind,status:current.status,startsAt:current.startsAt,nextSpawnAt:current.nextSpawnAt||null}]:[],respawnSeconds:3600});
  }
  if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return res.status(405).json({error:'Use GET or POST'});}
  if(bannedPurchase(req.body?.op))return res.status(410).json({error:'Arena entry is free. Subscription purchases have been removed.'});
  if(!settings.enabled)return res.status(409).json({error:'Inventory loot is not enabled yet'});
  const b=req.body||{},address=String(b.address||'');
  if(!algosdk.isValidAddress(address))throw new Error('Connect your wallet to view rewards');
  const db=arenaDatabase();
  // Read-only public summaries / unsigned preparation. No sign-in transaction.
  // The claim itself is authorized by the recipient's on-chain signature.
  if(b.op==='rewards'){
   const key=`${settings.appId}:${address}:${b.cursor||''}`,now=Date.now();
   const old=attempts.get(key);if(old&&old.until>now)return res.json(await old.result);
   if(attempts.size>500)attempts.clear();
   const result=walletRewardPage(db,treasuryClient(settings),settings,address,b.cursor,readBox,encounterKey);
   attempts.set(key,{until:now+10000,result});
   try{return res.json(await result);}catch(e){attempts.delete(key);throw e;}
  }
  if(b.op==='claim'||b.op==='deliver'){
   const hour=Number(b.hour);if(!Number.isSafeInteger(hour)||hour<1)throw new Error('Invalid encounter');
   const slot=Number(b.slot);if(!Number.isInteger(slot)||slot<0||slot>7)throw new Error('Invalid reward slot');
   const row=(await db.collection('arenaPrivate').doc(`loot-reward-${settings.appId}-${hour}-${slot}`).get()).data();
   if(!row||row.rewardWallet!==address||row.lootVersion!==2)throw new Error('No published reward found');
   if(!Number.isFinite(row.pickedUpAt)||row.pickedUpAt<=0)throw new Error('Pick up this drop with your champion before claiming it');
   if(row.deliveryMode==='direct'){
    if(row.deliveryStatus==='delivered')throw new Error('This reward has already been delivered');
    const client=treasuryClient(settings);let optedIn=true;
    try{const holding=(await client.accountAssetInformation(address,row.claim.rewardAssetId).do()).assetHolding;if(holding.isFrozen)throw new Error('This reward asset is frozen for your wallet');}catch(e){if(e.status===404||e.response?.status===404)optedIn=false;else throw e;}
    if(b.op==='deliver'){
     if(!optedIn)throw new Error('Opt into the reward asset first');
     const id=`loot-reward-${settings.appId}-${hour}-${slot}`,ref=db.collection('arenaPrivate').doc(id);
     await db.runTransaction(async tx=>{const current=(await tx.get(ref)).data();if(!current?.pickedUpAt||current.rewardWallet!==address||current.deliveryMode!=='direct')throw new Error('Invalid reward');if(current.deliveryStatus==='delivered'||current.deliveryQueue)return;tx.update(ref,{deliveryStatus:'queued',deliveryQueue:`pickup-${settings.appId}`});tx.set(db.collection('arenaPrivate/loot-jobs/jobs').doc(`${id}-claim-${Date.now()}`),{kind:'pickup',appId:settings.appId,rewardId:id});});
     attempts.clear();return res.json({queued:true});
    }
    const params=await client.getTransactionParams().do(),fee=Number(params.minFee||1000);
    const transactions=optedIn?[]:[Buffer.from(algosdk.encodeUnsignedTransaction(algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({sender:address,receiver:address,assetIndex:row.claim.rewardAssetId,amount:0,suggestedParams:{...params,flatFee:true,fee}}))).toString('base64')];
    return res.json({deliveryMode:'direct',transactions,requiresOptIn:!optedIn,feeMicroAlgo:optedIn?0:fee,minBalanceIncreaseMicroAlgo:optedIn?0:100000});
   }
   if(b.op==='deliver')throw new Error('Use the original on-chain claim for this reward');
   const box=await readBox(treasuryClient(settings),settings.appId,encounterKey(hour));
   if(!box||box.length<40)throw new Error('Reward publication is not confirmed yet');
   if(box.readBigUInt64BE(32)&(1n<<BigInt(slot)))throw new Error('This reward has already been claimed');
   if(!(box.readBigUInt64BE(32)&(1n<<BigInt(slot+8))))throw new Error('Your pickup is being confirmed. Please try again shortly.');
   return res.json(await claimTransaction(address,hour,row.claim,settings));
  }
  return res.status(400).json({error:'Unknown request'});
 }catch(e){return res.status(400).json({error:e.message});}
}
const bannedPurchase=op=>op==='purchase';
