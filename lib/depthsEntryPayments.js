const algosdk = require("algosdk");
const { Buffer } = require("buffer");

const paymentKey = (wallet, champion) => `depths-entry-payment-v1:${wallet}:${champion}`;
function readEntryPayment(storage, wallet, champion) {
  const value = storage.getItem(paymentKey(wallet, champion));
  if (!value) return null;
  const payment = JSON.parse(value);
  if (!/^[A-Z2-7]{52}$/.test(payment.txId || "") || payment.walletAddress !== wallet ||
      Number(payment.championAssetId) !== Number(champion)) {
    throw new Error("Saved Depths payment is invalid. Check the previous payment before paying again.");
  }
  return payment;
}
function rememberEntryPayment(storage, payment) {
  storage.setItem(paymentKey(payment.walletAddress, payment.championAssetId), JSON.stringify(payment));
}
function clearEntryPayment(storage, wallet, champion) {
  storage.removeItem(paymentKey(wallet, champion));
}

async function boundedRequest(promise, timeoutMs = 8000) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error("Payment status request timed out.")), timeoutMs);
    })]);
  } finally { clearTimeout(timer); }
}

async function confirmEntryPayment({ client, indexer, txId, timeoutMs = 90000,
  now = Date.now, sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) }) {
  const deadline = now() + timeoutMs;
  while (now() < deadline) {
    let poolError = "";
    try {
      const pending = await boundedRequest(client.pendingTransactionInformation(txId).do());
      if (Number(pending.confirmedRound || pending["confirmed-round"] || 0) > 0) return txId;
      poolError = pending.poolError || pending["pool-error"] || "";
    } catch { /* Another node behind the load balancer may not know this tx. */ }
    try {
      const result = await boundedRequest(indexer.lookupTransactionByID(txId).do());
      if (Number(result.transaction?.confirmedRound || result.transaction?.["confirmed-round"] || 0) > 0) return txId;
    } catch { /* The indexer may lag or temporarily be unavailable. */ }
    if (poolError && !/already in ledger/i.test(poolError)) {
      throw new Error(`Payment ${txId} was rejected: ${poolError}. Its transaction ID has been kept for checking.`);
    }
    await sleep(2000);
  }
  throw new Error(`Confirmation is still pending for ${txId}. Retry to check this same payment; do not pay again.`);
}

async function submitEntryPayment({ client, indexer, txn, signTransactions, remember, onStatus = () => {}, confirm = confirmEntryPayment }) {
  const txId = txn.txID();
  const signed = await signTransactions([algosdk.encodeUnsignedTransaction(txn)]);
  if (!signed || signed.length !== 1 || !signed[0] || algosdk.decodeSignedTransaction(signed[0]).txn.txID() !== txId) {
    throw new Error("The wallet did not sign the expected Depths payment.");
  }
  // Persist before sending: a timeout or lost response must never lose the ID.
  await remember(txId);
  onStatus("Sending Dark Coin payment");
  try { await boundedRequest(client.sendRawTransaction(signed).do(), 15000); }
  catch { /* Even a failed send response can describe an already-confirmed tx. */ }
  onStatus("Confirming Dark Coin payment");
  return confirm({ client, indexer, txId });
}

async function lookupIndexedEntryPayment(indexer, txId, sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try { return await boundedRequest(indexer.lookupTransactionByID(txId).do(), 4000); }
    catch (error) {
      const status = error.status || error.response?.status;
      if (status && status !== 404 && status !== 429 && status < 500) throw error;
      if (attempt < 4) await sleep(1000);
    }
  }
  throw Object.assign(new Error(`Payment ${txId} is not available in the indexer yet. Retry to use the same payment; do not pay again.`), { status: 503 });
}

function matchesRecoverableEntry(txn, { walletAddress, championAssetId, payment }) {
  const transfer = txn.assetTransferTransaction || txn["asset-transfer-transaction"] || {};
  let note;
  try {
    note = JSON.parse(typeof txn.note === "string" ? Buffer.from(txn.note, "base64").toString() : Buffer.from(txn.note || []).toString());
  } catch { return false; }
  return /^[A-Z2-7]{52}$/.test(txn.id || "") &&
    Number(txn.confirmedRound || txn["confirmed-round"] || 0) > 0 &&
    (txn.txType || txn["tx-type"]) === "axfer" && String(txn.sender) === walletAddress &&
    String(transfer.receiver) === payment.receiver && Number(transfer.assetId || transfer["asset-id"]) === Number(payment.assetId) &&
    Number(transfer.amount) >= Number(payment.baseAmountAtomic || payment.amountAtomic) &&
    !transfer.sender && !transfer.assetSender && !transfer["asset-sender"] &&
    !transfer.closeTo && !transfer.close && !transfer["close-to"] && !txn.rekeyTo && !txn["rekey-to"] &&
    note.kind === "darkcoin-depths-entry-payment" && Number(note.championAssetId) === Number(championAssetId);
}

async function findRecoverableEntryPayment({ indexer, walletAddress, championAssetId, payment, isUsed, now = Date.now }) {
  let nextToken;
  for (let page = 0; page < 3; page++) {
    let query = indexer.searchForTransactions().address(walletAddress).addressRole("sender")
      .assetID(Number(payment.assetId)).txType("axfer").afterTime(new Date(now() - 30 * 86400000).toISOString()).limit(100);
    if (nextToken) query = query.nextToken(nextToken);
    const response = await boundedRequest(query.do());
    for (const txn of response.transactions || []) {
      if (matchesRecoverableEntry(txn, { walletAddress, championAssetId, payment }) && !await isUsed(txn.id)) {
        return { txId: txn.id, amountAtomic: String(txn.assetTransferTransaction?.amount ?? txn["asset-transfer-transaction"]?.amount) };
      }
    }
    nextToken = response.nextToken || response["next-token"];
    if (!nextToken) return null;
  }
  throw new Error("Could not finish checking previous Depths payments. Check your payment before paying again.");
}

module.exports = { readEntryPayment, rememberEntryPayment, clearEntryPayment, confirmEntryPayment, submitEntryPayment,
  matchesRecoverableEntry, findRecoverableEntryPayment, lookupIndexedEntryPayment };
