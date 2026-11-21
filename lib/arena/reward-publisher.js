import {lootAssetImage} from './loot-images';
import {directLedgerId,subtractDirectReservations,settleDirectOperation} from './direct-rewards';
import crypto from 'node:crypto';
import {economyConfig,publishReward,treasuryInventory,rewardTree,verifyTreasury,treasuryClient,readBox,encounterKey} from './treasury';
import {drawLoot,LOOT_RULES} from './loot';
import {dropPosition} from './loot-drops';
// A treasury-wide lease serializes inventory snapshots across scheduler retries.
// The persisted draw is immutable: never reroll a failed/uncertain publication.
export async function processArenaRewards(db,config=economyConfig(),dependencies={}){
 if(!config.enabled)return {published:0};
 const inventory=dependencies.inventory||treasuryInventory,publish=dependencies.publish||publishReward,clock=dependencies.clock||(()=>Date.now()),randomSeed=dependencies.randomSeed||(()=>crypto.randomBytes(32).toString('hex'));
 const collection=db.collection('arenaPrivate'),lock=collection.doc(`loot-publisher-${config.appId}`),owner=crypto.randomUUID();
 const locked=await db.runTransaction(async tx=>{const old=await tx.get(lock);if(old.data()?.until>clock())return false;tx.set(lock,{owner,until:clock()+120000});return true;});
 if(!locked)return {published:0,busy:true};
 const fenced=async(tx)=>{const d=await tx.get(lock);if(d.data()?.owner!==owner||d.data().until<=clock())throw new Error('Loot publication lease expired');};
 try{
  const direct=dependencies.direct??((await verifyTreasury(config)).version===3n);
  if(direct&&!await (dependencies.maintain||settleDirectOperation)(db,config,fenced))return {published:0,busy:true};
  const ledgerRef=collection.doc(directLedgerId(config.appId));
  // Complete the oldest pending draw before allocating any more inventory.
  const docs=await collection.where('lootQueue','==',`pending-${config.appId}`).orderBy('__name__').limit(1).get();if(!docs.docs.length)return {published:0};
  const doc=docs.docs[0];let row=doc.data();if(row.lootVersion!==2||row.status!=='defeated'||!row.recipients?.length)throw new Error('Invalid pending loot encounter');
  if(!row.draw){
   const raw=await inventory(config,{includeImages:false}),items=direct?subtractDirectReservations(raw,(await ledgerRef.get()).data()):raw,seed=randomSeed(),rules=JSON.parse(JSON.stringify(LOOT_RULES)),shares=drawLoot({appId:config.appId,hour:row.id,monster:row.kind,recipients:row.recipients,inventory:items,seed,rules});
   // Resolve off-chain images only for assets actually awarded, never the entire treasury.
   const images=new Map();
   await Promise.all([...new Set(shares.map(c=>c.rewardAssetId).filter(Boolean))].map(async id=>{const item=items.find(i=>i.rewardAssetId===id);if(item?.imageParams)images.set(id,await lootAssetImage(id,item.imageParams));}));
   for(const share of shares)if(images.has(share.rewardAssetId))share.image=images.get(share.rewardAssetId);
   const draw={seed,rules,monster:row.kind,inventory:items,createdAt:clock(),algorithm:'DCL2-HMAC-SHA256-monster-tiers-v3'};
   row=await db.runTransaction(async tx=>{await fenced(tx);const fresh=(await tx.get(doc.ref)).data();if(fresh.draw)return fresh;tx.update(doc.ref,{draw,shares});return {...fresh,draw,shares};});
  }
  await db.runTransaction(fenced);
  // A v2 allocation already published before the upgrade keeps its old claim path.
  const legacyBox=direct?await (dependencies.legacyBox||readBox)(treasuryClient(config),config.appId,encounterKey(row.id)):null;
  const isDirect=direct&&!legacyBox;
  const hasRewards=row.shares.some(c=>c.rewardAssetId&&BigInt(c.amount)>0n),tree=hasRewards&&!isDirect?await publish(row,config):rewardTree(config.appId,row.id,row.shares);
  await db.runTransaction(async tx=>{await fenced(tx);const fresh=await tx.get(doc.ref);if(fresh.data()?.publishStatus==='published')return;
   if(isDirect){const ledger=(await tx.get(ledgerRef)).data()||{reserved:{}};const reserved={...ledger.reserved};for(const claim of tree.claims)if(claim.rewardAssetId)reserved[claim.rewardAssetId]=String(BigInt(reserved[claim.rewardAssetId]||0)+BigInt(claim.amount));tx.set(ledgerRef,{...ledger,reserved});}
   tx.update(doc.ref,{publishStatus:hasRewards?'published':'empty',lootQueue:null,deliveryMode:isDirect?'direct':'legacy',root:tree.root,txid:tree.txid||null});
   for(const claim of tree.claims)tx.set(collection.doc(`loot-reward-${config.appId}-${row.id}-${claim.slot}`),{rewardWallet:claim.address,appId:config.appId,hour:row.id,claim,lootVersion:2,deliveryMode:isDirect?'direct':'legacy',
    dropEncounter:`${config.appId}-${row.id}`,drop:dropPosition(row,claim.slot),deliveryStatus:claim.rewardAssetId?'available':'empty'});
  });return {published:hasRewards?1:0,empty:hasRewards?0:1};
 }catch(e){console.error('arena_loot_pending',e.message);throw e;}
 finally{await db.runTransaction(async tx=>{const d=await tx.get(lock);if(d.data()?.owner===owner)tx.set(lock,{owner,until:0});});}
}
