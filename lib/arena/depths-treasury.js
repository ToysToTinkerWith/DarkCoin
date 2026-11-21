import {economyConfig, treasuryInventory, verifyTreasury} from './treasury';
import {withTreasuryLease, directLedgerId, subtractDirectReservations} from './direct-rewards';

// Keep numeric reward identifiers compatible with the wallet claim UI. Arena
// encounters use epoch seconds; classic runs use a disjoint, durable sequence.
const DEPTHS_REWARD_BASE = 4000000000000000;
export function depthsTreasuryConfig() {
 const config = economyConfig();
 if (!config.enabled || !config.appId) throw Object.assign(new Error('Shared Arena Treasury rewards are unavailable. Please try again later.'), {status:503});
 return config;
}
const busy = () => Object.assign(new Error('The treasury is processing another reward. Please retry shortly; your run is saved.'), {status:503});

export function depthsPayoutAmount(item, basisPoints) {
 const available = BigInt(item.available);
 let amount = available * BigInt(basisPoints) / 10000n;
 if (available > 0n && amount === 0n) amount = 1n;
 // Honor the asset's configured payout limits as well as pending obligations.
 const percentCap = available * BigInt(item.capBps) / 10000n;
 const absoluteCap = BigInt(item.capAtomic || '0');
 amount = amount > percentCap ? percentCap : amount;
 if (absoluteCap > 0n && amount > absoluteCap) amount = absoluteCap;
 return amount;
}

async function availableItem(db, config, assetId, dependencies) {
 const ledger = (await db.collection('arenaPrivate').doc(directLedgerId(config.appId)).get()).data() || {reserved:{}};
 // An unconfirmed transfer can make the chain balance ambiguous. The shared
// worker reconciles it before either game allocates another reward.
 if (ledger.operation) throw busy();
 const raw = await (dependencies.inventory || treasuryInventory)(config, {includeImages:false});
 return {ledger, item:subtractDirectReservations(raw, ledger).find(i => i.rewardAssetId === assetId)};
}

export async function depthsAvailableBalance(db, config, assetId, dependencies={}) {
 const result = await withTreasuryLease(db, config, async fence => {
  if ((await (dependencies.verify || verifyTreasury)(config)).version !== 3n) throw new Error('Depths requires the current direct-payout Arena Treasury.');
  const value = await availableItem(db, config, assetId, dependencies);
  await db.runTransaction(fence);
  return value.item || {rewardAssetId:assetId, available:'0', capBps:0, capAtomic:'0'};
 });
 if (result.busy) throw busy();
 return result;
}

// Caller must validate the run token, completed final battle, and current NFT
// ownership. Recheck the resulting server proof inside the reservation commit.
export async function reserveDepthsReward(db, config, eligible, options, dependencies={}) {
 const {runRef, championAssetId, walletAddress, serverRewardProof} = eligible;
 const {assetId, rollReward, formatAmount} = options;
 const collection = db.collection('arenaPrivate'), ledgerRef = collection.doc(directLedgerId(config.appId));
 const result = await withTreasuryLease(db, config, async fence => {
  const previous = (await runRef.get()).data();
  if (previous?.serverDepthsRewardId) {
   const row = (await collection.doc(previous.serverDepthsRewardId).get()).data();
   if (!row || row.appId !== config.appId || row.sourceRunId !== runRef.id || row.rewardWallet !== walletAddress) throw new Error('Saved Depths reward requires reconciliation.');
   return row;
  }
  // Never pay an old, already-granted run a second time during migration.
  if (previous?.darkCoinRewardAmountAtomic || previous?.darkCoinRewardGrantTxId || previous?.darkCoinClaimTxId || ['granting','granted','claimed'].includes(previous?.darkCoinRewardStatus)) {
   throw Object.assign(new Error('This run has an existing legacy reward. It will not be paid again.'), {status:409});
  }
  if ((await (dependencies.verify || verifyTreasury)(config)).version !== 3n) throw new Error('Depths requires the current direct-payout Arena Treasury.');
  const {ledger, item} = await availableItem(db, config, assetId, dependencies);
  if (!item || BigInt(item.available) <= 0n) throw Object.assign(new Error('No unreserved DARK is available. Your completed run is saved; retry later.'), {status:409});
  const roll = rollReward(BigInt(item.available), item.decimals);
  const amount = depthsPayoutAmount(item, roll.basisPoints);
  if (amount <= 0n) throw Object.assign(new Error('The treasury payout limit currently leaves no DARK available.'), {status:409});
  const sequence = Number(ledger.depthsRewardSequence || 0) + 1, hour = DEPTHS_REWARD_BASE + sequence;
  if (!Number.isSafeInteger(hour) || sequence < 1) throw new Error('Depths reward sequence exhausted.');
  const id = `loot-reward-${config.appId}-${hour}-0`, now = (dependencies.clock || Date.now)();
  const row = {source:'depths', sourceRunId:runRef.id, appId:config.appId, hour, lootVersion:2, deliveryMode:'direct', rewardWallet:walletAddress,
   // Completion is the classic game's collection event; no world pickup needed.
   pickedUpAt:now, deliveryStatus:'queued', deliveryQueue:`pickup-${config.appId}`,
   depthRoll:{...roll, amountAtomic:String(amount), amountDisplay:formatAmount(amount, item.decimals), capped:amount < BigInt(roll.amountAtomic)},
   claim:{slot:0, address:walletAddress, assetId:championAssetId, rewardAssetId:assetId, amount:String(amount), name:item.name, decimals:item.decimals, kind:'token', image:'/DarkCoinLogo.png'}};
  await db.runTransaction(async tx => {
   await fence(tx);
   const fresh = (await tx.get(runRef)).data(), current = (await tx.get(ledgerRef)).data() || {reserved:{}};
   const occupied = await tx.get(collection.doc(id));
   if (occupied.exists || fresh?.serverDepthsRewardId || current.operation || Number(current.depthsRewardSequence || 0) !== sequence - 1) throw busy();
   if (fresh?.status !== 'completed' || fresh.serverRewardEligible !== true || fresh.serverRewardProof !== serverRewardProof || fresh.activeAddress !== walletAddress || Number(fresh.championAssetId) !== championAssetId) throw new Error('Depths run is no longer eligible for a reward.');
   const reserved = {...current.reserved, [assetId]:String(BigInt(current.reserved?.[assetId] || 0) + amount)};
   tx.set(ledgerRef, {...current, reserved, depthsRewardSequence:sequence});
   tx.create(collection.doc(id), row);
   tx.update(runRef, {serverDepthsRewardId:id, darkCoinRewardStatus:'reserved', darkCoinRewardAppId:config.appId, darkCoinRewardAssetId:assetId, darkCoinRewardAmountAtomic:String(amount), darkCoinRewardAmountDisplay:row.depthRoll.amountDisplay, rewardStatus:'darkcoin_reserved'});
   tx.create(db.collection('arenaPrivate/loot-jobs/jobs').doc(`${id}-depths`), {kind:'pickup', appId:config.appId, rewardId:id});
  });
  return row;
 });
 if (result.busy) throw busy();
 return result;
}

export function depthsRewardView(row) {
 return { ...row.depthRoll, status:row.deliveryStatus === 'delivered' ? 'claimed' : 'granted', deliveryStatus:row.deliveryStatus,
  deliveryMode:'direct', hour:row.hour, slot:row.claim.slot, appId:row.appId, assetId:row.claim.rewardAssetId,
  walletAddress:row.rewardWallet, decimals:row.claim.decimals, amountAtomic:row.claim.amount,
  claimTxId:row.deliveryTxid || null, grantTxId:null };
}
