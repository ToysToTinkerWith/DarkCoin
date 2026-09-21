const algosdk = require("algosdk");
const { MARKET_APP_ID, listingBox, MAX_UINT64 } = require("../functions/market/model");

const marketAlgod = () => new algosdk.Algodv2("", "https://mainnet-api.algonode.cloud", 443);

async function isOptedIn(client, address, assetId) {
  try { await client.accountAssetInformation(address, assetId).do(); return true; }
  catch (error) {
    if (error.status === 404 || error.response?.status === 404) return false;
    throw error;
  }
}

function feeParams(params, units = 1) {
  const minimum = BigInt(params.minFee || 1000);
  return { ...params, flatFee: true, fee: minimum * BigInt(units) };
}

async function timed(promise, ms) {
  let timer;
  try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("Request timed out.")), ms); })]); }
  finally { clearTimeout(timer); }
}

async function sendMarketGroup({ client, txns, signTransactions, setMessage, actionLabel = "" }) {
  algosdk.assignGroupID(txns);
  const firstId = txns[0].txID();
  const appTxId = txns[txns.length - 1].txID();
  setMessage(actionLabel ? `Sign ${actionLabel} transaction...` : "Sign transaction...");
  const signed = await signTransactions(txns.map((txn) => algosdk.encodeUnsignedTransaction(txn)));
  if (!signed || signed.length !== txns.length || signed.some((txn) => !txn)) throw new Error("The wallet did not sign the complete transaction group.");
  setMessage(actionLabel ? `Sending ${actionLabel} transaction...` : "Sending transaction...");
  try {
    const response = await timed(client.sendRawTransaction(signed).do(), 15000);
    const submitted = response.txid || response.txId;
    if (submitted && submitted !== firstId) throw new Error("Unexpected transaction ID returned by Algorand.");
  } catch (error) {
    // A lost HTTP response can occur after submission. Query the locally derived ID.
    if (!/timeout|fetch failed|network|already in ledger/i.test(error.message)) throw error;
  }
  setMessage(`Waiting for confirmation: ${firstId}`);
  const deadline = Date.now() + 90000;
  const indexer = new algosdk.Indexer("", "https://mainnet-idx.algonode.cloud", 443);
  let confirmed = false;
  while (Date.now() < deadline) {
    try {
      const pending = await timed(client.pendingTransactionInformation(firstId).do(), 8000);
      if (pending.poolError) throw Object.assign(new Error(pending.poolError), { rejected: true });
      if (Number(pending.confirmedRound || 0) > 0) { confirmed = true; break; }
    } catch (error) { if (error.rejected) throw error; }
    try {
      const result = await timed(indexer.lookupTransactionByID(firstId).do(), 5000);
      if (Number(result.transaction?.confirmedRound || 0) > 0) { confirmed = true; break; }
    } catch { /* The indexer can lag behind algod. */ }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  if (!confirmed) throw new Error(`Confirmation is still pending for ${firstId}. Check this transaction before submitting again.`);
  return appTxId;
}

async function announceMarketTransaction(txId) {
  try {
    await fetch("/api/market/announce", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ txId }), signal: AbortSignal.timeout(12000),
    });
  } catch { /* The scheduled server worker retries confirmed market announcements. */ }
}

async function buildListing({ client, listing }) {
  const { seller: sender, assetId, costId, amount, costAmount } = listing;
  const params = feeParams(await client.getTransactionParams().do());
  const appAddress = algosdk.getApplicationAddress(MARKET_APP_ID).toString();
  const note = (step) => new TextEncoder().encode(`Dark Coin Market | LIST asset ${assetId} | ${step}`);
  const txns = [];
  if (costId > 0 && !await isOptedIn(client, sender, costId)) {
    txns.push(algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({ sender, receiver: sender, amount: 0, assetIndex: costId, suggestedParams: params, note: note("Payment asset opt-in") }));
  }
  if (!await isOptedIn(client, appAddress, assetId)) {
    txns.push(algosdk.makeApplicationNoOpTxnFromObject({ sender, appIndex: MARKET_APP_ID, suggestedParams: feeParams(params, 2), appArgs: [new TextEncoder().encode("optin")], foreignAssets: [assetId], note: note("Market asset opt-in") }));
  }
  txns.push(algosdk.makePaymentTxnWithSuggestedParamsFromObject({ sender, receiver: appAddress, amount: 100000, suggestedParams: params, note: note("Listing storage funding") }));
  txns.push(algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({ sender, receiver: appAddress, assetIndex: assetId, amount: BigInt(amount), suggestedParams: params, note: note("Deposit listed assets") }));
  txns.push(algosdk.makeApplicationNoOpTxnFromObject({
    sender, appIndex: MARKET_APP_ID, suggestedParams: params,
    appArgs: [new TextEncoder().encode("listAsset"), algosdk.encodeUint64(costId), algosdk.encodeUint64(BigInt(costAmount))],
    foreignAssets: [assetId], boxes: [{ appIndex: 0, name: listingBox(listing) }], note: note("Create listing"),
  }));
  return txns;
}

async function buildPurchase({ client, listing, buyer, amount }) {
  const total = BigInt(listing.costAmount) * amount;
  if (amount <= 0n || amount > BigInt(listing.amount) || total > MAX_UINT64) throw new Error("Choose an amount within the available quantity.");
  await client.getApplicationBoxByName(MARKET_APP_ID, listingBox(listing)).do();
  const params = feeParams(await client.getTransactionParams().do());
  const txns = [];
  if (!await isOptedIn(client, buyer, listing.assetId)) {
    txns.push(algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({ sender: buyer, receiver: buyer, amount: 0, assetIndex: listing.assetId, suggestedParams: params }));
  }
  const payment = { sender: buyer, receiver: listing.seller, amount: total, suggestedParams: params };
  txns.push(listing.costId === 0 ? algosdk.makePaymentTxnWithSuggestedParamsFromObject(payment) : algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({ ...payment, assetIndex: listing.costId }));
  txns.push(algosdk.makeApplicationNoOpTxnFromObject({
    sender: buyer, appIndex: MARKET_APP_ID, suggestedParams: feeParams(params, 2),
    appArgs: [new TextEncoder().encode("buyAsset"), ...[listing.amount, listing.costAmount, amount].map((n) => algosdk.encodeUint64(BigInt(n)))],
    accounts: [listing.seller], foreignAssets: [listing.assetId, listing.costId],
    boxes: [{ appIndex: 0, name: listingBox(listing) }, { appIndex: 0, name: listingBox(listing, BigInt(listing.amount) - amount) }],
  }));
  return txns;
}

async function buildRemoval({ client, listing, sender }) {
  if (sender !== listing.seller) throw new Error("Only the seller can remove this listing.");
  await client.getApplicationBoxByName(MARKET_APP_ID, listingBox(listing)).do();
  const params = feeParams(await client.getTransactionParams().do());
  const txns = [];
  if (!await isOptedIn(client, sender, listing.assetId)) txns.push(algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({ sender, receiver: sender, amount: 0, assetIndex: listing.assetId, suggestedParams: params }));
  txns.push(algosdk.makeApplicationNoOpTxnFromObject({
    sender, appIndex: MARKET_APP_ID, suggestedParams: feeParams(params, 2),
    appArgs: [new TextEncoder().encode("removeListing"), ...[listing.amount, listing.costId, listing.costAmount].map((v) => algosdk.encodeUint64(BigInt(v)))],
    foreignAssets: [listing.assetId], boxes: [{ appIndex: 0, name: listingBox(listing) }],
  }));
  return txns;
}

module.exports = { marketAlgod, isOptedIn, feeParams, sendMarketGroup, announceMarketTransaction, buildListing, buildPurchase, buildRemoval };
