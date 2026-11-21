const sdk = require('algosdk');
const crypto = require('node:crypto');
const membership = require('./membership.json');
const hosting = require('./hosting.json');
const { membershipTree } = require('./membership');
const { protocol, configKey, proposalKey, voteKey, decodeConfig, decodeProposal, tally, encodeActions } = require('./model');
const { bounded } = require('../market/chain');
const { councilAssetMetadata } = require('./assets');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const missing = error => Number(error.status || error.response?.status) === 404;
const assetCache = new Map();

function configuration() {
  const network = process.env.COUNCIL_NETWORK || membership.network;
  if (!['mainnet', 'testnet'].includes(network)) throw Error('Unsupported Council network.');
  const appId = Number(process.env.COUNCIL_APP_ID || (network === 'mainnet' ? protocol.legacyAppId : 0));
  if (!Number.isSafeInteger(appId) || appId < 0) throw Error('Invalid Council application ID.');
  return { network, appId, algodUrl: `https://${network}-api.algonode.cloud`, indexerUrl: `https://${network}-idx.algonode.cloud` };
}

async function concurrent(items, fn, concurrency = 8) {
  const result = new Array(items.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) { const index = cursor++; result[index] = await fn(items[index]); }
  }));
  return result;
}

async function assetMetadata(indexer, network, id, cache = true) {
  const key = `${network}-${id}`, saved = assetCache.get(key);
  if (cache && saved && saved.expires > Date.now()) return saved.value;
  const response = await bounded(indexer.lookupAssetByID(id).do()), p = response.asset.params;
  const value = councilAssetMetadata(id, p);
  if (cache) {
    if (assetCache.size > 1000) assetCache.clear();
    assetCache.set(key, { value, expires: Date.now() + 3600000 });
  }
  return value;
}

function ballotIdentity(args) {
  if (!args || args.length < 3 || args[1]?.length !== 8 || args[2]?.length !== 8) return null;
  const method = Buffer.from(args[0]).toString();
  if ((method !== 'vote' || args.length !== 6) && (method !== 'claim' || args.length !== 3)) return null;
  const proposalId = Buffer.from(args[1]).readBigUInt64BE().toString();
  const nftId = Number(Buffer.from(args[2]).readBigUInt64BE());
  if (!Number.isSafeInteger(nftId)) return null;
  return { method, proposalId, nftId, key: `${proposalId}-${nftId}` };
}

async function walletHistory(indexer, appId, address, appAddress) {
  const pairs = new Map(), history = new Map();
  let next, seen = 0;
  do {
    let query = indexer.searchForTransactions().applicationID(appId).address(address).addressRole('sender').txType('appl').limit(1000);
    if (next) query = query.nextToken(next);
    const page = await bounded(query.do());
    next = page.nextToken;
    seen += (page.transactions || []).length;
    if (seen > 100000) throw Error('Council wallet history requires archival indexing.');
    for (const tx of page.transactions || []) {
      const identity = ballotIdentity(tx.applicationTransaction?.applicationArgs);
      if (!identity) continue;
      pairs.set(identity.key, identity);
      const item = history.get(identity.key) || { proposalId: identity.proposalId, nftId: identity.nftId, paidReward: '0', depositReturned: false };
      if (identity.method === 'claim') item.depositReturned = true;
      const paid = (tx.innerTxns || []).filter(inner => String(inner.sender) === appAddress && String(inner.paymentTransaction?.receiver) === address)
        .reduce((sum, inner) => sum + BigInt(inner.paymentTransaction.amount), 0n);
      if (identity.method === 'vote' && paid > 0n) Object.assign(item, { paidReward: paid.toString(), txid: tx.id, paidAt: Number(tx.roundTime || 0) });
      history.set(identity.key, item);
    }
  } while (next);
  return { pairs, history };
}

async function readCouncil(address = '', options = {}) {
  const { loadManifest = async () => null, loadExecution = async () => null, loadDiscussion = async () => null, client, indexer, proposalId, before, view = 'list' } = options;
  const limit = Number(options.limit ?? 20);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw Error('Choose a Council page size from 1 to 100.');
  if (address && !sdk.isValidAddress(address)) throw Error('Invalid wallet address.');
  for (const value of [proposalId, before]) if (value !== undefined && !/^[1-9]\d*$/.test(String(value))) throw Error('Invalid proposal identifier.');
  if (!['list', 'config', 'rewards'].includes(view)) throw Error('Invalid Council view.');
  const base = configuration(), algod = client || new sdk.Algodv2('', base.algodUrl, 443), idx = indexer || new sdk.Indexer('', base.indexerUrl, 443);
  const appAddress = base.appId ? sdk.getApplicationAddress(base.appId).toString() : '';
  const config = { ...protocol.defaults, ...base, version: 3, ready: false, host: hosting.address, members: membership.assetIds.length, next: '1', revision: '1', address: appAddress, treasury: '0', rewardReserved: '0', currency: { id: 0, decimals: 6, unitName: 'ALGO' } };
  const data = { config, proposals: [], votes: [], owned: [], assets: [], walletHistory: [], pagination: { total: 0, hasMore: false, nextBefore: null }, now: Math.floor(Date.now() / 1000) };
  if (!base.appId) return data;
  const account = await bounded(algod.accountInformation(appAddress).do());
  data.assets = [{ ...councilAssetMetadata(0), amount: String(account.amount), available: String(BigInt(account.amount) - BigInt(account.minBalance)), minimumBalance: String(account.minBalance) }];
  data.assets.push(...await concurrent(account.assets || [], async holding => ({ ...await assetMetadata(idx, base.network, holding.assetId, !indexer), amount: String(holding.amount), frozen: Boolean(holding.isFrozen) })));
  let record;
  try { record = await bounded(algod.getApplicationBoxByName(base.appId, configKey()).do()); }
  catch (error) { if (!missing(error)) throw error; config.treasury = data.assets[0].available; return data; }
  Object.assign(config, decodeConfig(record.value));
  const app = await bounded(algod.getApplicationByID(base.appId).do());
  if (Number(config.version) !== 3 || !process.env.COUNCIL_APPROVAL_SHA256 || sha(app.params.approvalProgram) !== process.env.COUNCIL_APPROVAL_SHA256) throw Error('Council program verification failed. Transactions are disabled.');
  const tree = membershipTree(membership.assetIds);
  if (config.root !== tree.root || Number(config.members) !== tree.assetIds.length || Number(config.depth) !== tree.depth || base.network !== membership.network) throw Error('Council membership does not match the contract.');
  config.ready = true;
  config.treasury = (BigInt(data.assets[0].available) - BigInt(config.rewardReserved)).toString();
  data.assets[0].available = config.treasury;
  const count = Number(config.next) - 1;
  if (!Number.isSafeInteger(count) || count < 0) throw Error('Invalid Council proposal counter.');
  data.pagination.total = count;
  if (view === 'config') return data;
  let walletRecords = { pairs: new Map(), history: new Map() };
  if (address) {
    let wallet;
    try { wallet = await bounded(algod.accountInformation(address).do()); }
    catch (error) { if (!missing(error)) throw error; wallet = { assets: [] }; }
    const eligible = new Set(tree.assetIds);
    data.owned = (wallet.assets || []).filter(holding => BigInt(holding.amount) === 1n && eligible.has(Number(holding.assetId))).map(holding => tree.proof(Number(holding.assetId)));
    if (proposalId || view === 'rewards') walletRecords = await walletHistory(idx, base.appId, address, appAddress);
  }
  let ids;
  if (proposalId) ids = Number(proposalId) <= count ? [Number(proposalId)] : [];
  else if (view === 'rewards') ids = [...new Set([...walletRecords.pairs.values()].map(pair => Number(pair.proposalId)))].filter(id => id <= count).sort((a, b) => b - a);
  else {
    const top = Math.min(count, before ? Number(before) - 1 : count);
    ids = Array.from({ length: Math.min(limit, Math.max(top, 0)) }, (_, index) => top - index);
    data.pagination.hasMore = top > ids.length;
    data.pagination.nextBefore = data.pagination.hasMore ? String(ids.at(-1)) : null;
  }
  data.proposals = await concurrent(ids, async id => {
    const box = await bounded(algod.getApplicationBoxByName(base.appId, proposalKey(id)).do());
    const p = decodeProposal(box.value, id), manifest = await loadManifest(p.digest);
    let verified = false;
    try { verified = Boolean(manifest && sha(JSON.stringify(manifest)) === p.digest && manifest.actions.length === p.actionCount && sha(encodeActions(manifest.actions)) === p.actionsHash); } catch { /* Corrupt Firebase content never authorizes a transaction. */ }
    const content = verified ? { title: manifest.title, body: manifest.body, images: manifest.images, actions: manifest.actions } : { title: `Proposal #${id}`, body: 'Verified proposal content is unavailable. Please contact the Council operator.', images: [], actions: [] };
    const discussion = await loadDiscussion(id);
    const discussionUrl = discussion && discussion.digest === p.digest && /^\d{15,22}$/.test(String(discussion.guildId || '')) && /^\d{15,22}$/.test(String(discussion.channelId || ''))
      ? `https://discord.com/channels/${discussion.guildId}/${discussion.channelId}` : '';
    return { ...p, ...content, textVerified: verified, ...tally(p), execution: await loadExecution(id), discussionUrl };
  });
  const visible = new Set(data.proposals.map(p => p.id)), pairs = new Map();
  for (const pair of walletRecords.pairs.values()) if (visible.has(pair.proposalId)) pairs.set(pair.key, pair);
  // Lists need no ballots. Detail reads one proposal; refunds use actual history.
  if (proposalId && address) for (const nft of data.owned) pairs.set(`${proposalId}-${nft.assetId}`, { proposalId: String(proposalId), nftId: nft.assetId });
  data.votes = (await concurrent([...pairs.values()], async pair => {
    try {
      const bytes = Buffer.from((await bounded(algod.getApplicationBoxByName(base.appId, voteKey(pair.proposalId, pair.nftId)).do())).value);
      if (bytes.length !== protocol.voteSize) throw Error('Invalid Council ballot.');
      return { proposalId: pair.proposalId, nftId: pair.nftId, address: sdk.encodeAddress(bytes.subarray(0, 32)), choice: Number(bytes.readBigUInt64BE(32)), paidReward: bytes.readBigUInt64BE(40).toString(), claimed: false };
    } catch (error) { if (!missing(error)) throw error; return null; }
  })).filter(Boolean);
  const own = new Set(data.votes.filter(vote => vote.address === address).map(vote => `${vote.proposalId}-${vote.nftId}`));
  data.walletHistory = [...walletRecords.history.entries()].filter(([key, value]) => value.paidReward !== '0' || value.depositReturned || own.has(key)).map(([, value]) => value);
  return data;
}
module.exports = { configuration, readCouncil, concurrent, ballotIdentity };
