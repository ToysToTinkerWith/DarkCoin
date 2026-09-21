const algosdk = require("algosdk");
const { MARKET_APP_ID, buildCatalog, decodeMarketEvent } = require("./model");
const indexer = new algosdk.Indexer("", "https://mainnet-idx.algonode.cloud", 443);
const algod = new algosdk.Algodv2("", "https://mainnet-api.algonode.cloud", 443);
let cache = { events: [], round: 0, time: 0, catalog: null };
let pending;

async function bounded(promise, ms = 15000) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("Algorand request timed out. Please retry.")), ms); })]);
  } finally { clearTimeout(timer); }
}

async function loadCatalog({ fresh = false } = {}) {
  if (!fresh && cache.catalog && Date.now() - cache.time < 15000) return cache.catalog;
  if (pending) return pending;
  pending = (async () => {
    const events = [...cache.events];
    let next;
    let round;
    do {
      let request = indexer.searchForTransactions().applicationID(MARKET_APP_ID).txType("appl").limit(1000);
      if (cache.round) request = request.minRound(cache.round + 1);
      if (next) request = request.nextToken(next);
      const result = await bounded(request.do());
      // Keep the first response's snapshot so pagination cannot skip newly indexed rounds.
      if (round === undefined) round = Number(result.currentRound);
      for (const txn of result.transactions) {
        if (Number(txn.confirmedRound) > round) continue;
        const event = decodeMarketEvent(txn);
        if (event) events.push(event);
      }
      next = result.nextToken;
    } while (next);
    const unique = [...new Map(events.map((event) => [event.txId, event])).values()];
    const catalog = buildCatalog(unique);
    cache = { events: unique, round, time: Date.now(), catalog };
    return catalog;
  })().finally(() => { pending = null; });
  return pending;
}

async function getListing(id, options) {
  if (!/^(?:[A-Z2-7]{52}|[a-f0-9]{128})$/.test(id || "")) return null;
  const catalog = await loadCatalog(options);
  return catalog.listings.get(id) || catalog.listings.get(catalog.aliases.get(id)) || null;
}

module.exports = { indexer, algod, bounded, loadCatalog, getListing };
