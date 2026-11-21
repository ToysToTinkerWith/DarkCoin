const algosdk = require('algosdk');
const crypto = require('node:crypto');
const membership = require('./membership.json');
const { membershipTree } = require('./membership');
const { protocol, decodeProposal, proposalKey, tally } = require('./model');
const { bounded } = require('../market/chain');
let cached, pending;
function configuration() {
  const network = process.env.COUNCIL_NETWORK || membership.network;
  if (!['mainnet', 'testnet'].includes(network)) throw new Error('Unsupported council network.');
  const appId = Number(process.env.COUNCIL_APP_ID || 0);
  if (!Number.isSafeInteger(appId) || appId < 0) throw new Error('Invalid council application ID.');
  return { network, appId, algodUrl: `https://${network}-api.algonode.cloud`, indexerUrl: `https://${network}-idx.algonode.cloud` };
}
function clients(config) {
  return { algod: new algosdk.Algodv2('', config.algodUrl, 443), indexer: new algosdk.Indexer('', config.indexerUrl, 443) };
}
function noteObject(note) { try { const data = JSON.parse(Buffer.from(note || []).toString()); return data.v === 1 ? data : {}; } catch { return {}; } }
async function catalog(config, algod, indexer) {
  const app = await bounded(algod.getApplicationByID(config.appId).do());
  const globals = Object.fromEntries((app.params.globalState || []).map((row) => [Buffer.from(row.key).toString(), Number(row.value.type) === 1 ? Buffer.from(row.value.bytes).toString('hex') : String(row.value.uint)]));
  const tree = membershipTree(membership.assetIds);
  const checksum = crypto.createHash('sha256').update(app.params.approvalProgram).digest('hex');
  if (!process.env.COUNCIL_APPROVAL_SHA256 || checksum !== process.env.COUNCIL_APPROVAL_SHA256) throw new Error('Council contract checksum is not verified. Actions are disabled.');
  if (globals.version !== String(protocol.version) || globals.currency !== '0' || globals.fee !== protocol.fee || globals.minimum !== protocol.minOffering) throw new Error('The council contract does not use the current 10 ALGO reward policy.');
  if (globals.root !== tree.root || Number(globals.members) !== tree.assetIds.length || Number(globals.depth) !== tree.depth || membership.network !== config.network) throw new Error('The DAO membership registry does not match the contract.');
  const params = Number(globals.currency) ? (await bounded(algod.getAssetByID(Number(globals.currency)).do())).params : { decimals: 6, unitName: 'ALGO', name: 'Algorand' };
  const transactions = []; let next;
  do {
    let request = indexer.searchForTransactions().applicationID(config.appId).txType('appl').limit(1000);
    if (next) request = request.nextToken(next);
    const page = await bounded(request.do()); transactions.push(...page.transactions); next = page.nextToken;
    if (transactions.length > 100000) throw new Error('Council history requires archival indexing before more records can be loaded.');
  } while (next);
  transactions.sort((a, b) => Number(a.confirmedRound) - Number(b.confirmedRound) || Number(a.intraRoundOffset) - Number(b.intraRoundOffset));
  const metadata = new Map(), votes = new Map();
  for (const tx of transactions) {
    const call = tx.applicationTransaction;
    if (!tx.confirmedRound || !call || Number(call.applicationId) !== config.appId || call.onCompletion !== 'noop') continue;
    const args = (call.applicationArgs || []).map((a) => Buffer.from(a));
    const method = args[0]?.toString();
    if (!args[1] || args[1].length !== 8) continue;
    const id = args[1].readBigUInt64BE().toString(), note = noteObject(tx.note);
    if (method === 'propose') metadata.set(id, { title: typeof note.title === 'string' ? note.title.slice(0, 100) : '', body: typeof note.body === 'string' ? note.body.slice(0, 600) : '', digest: crypto.createHash('sha256').update(tx.note || []).digest('hex'), txId: tx.id });
    if (args[2]?.length === 8 && method === 'vote') {
      const nftId = Number(args[2].readBigUInt64BE());
      votes.set(`${id}:${nftId}`, { proposalId: id, nftId, address: String(tx.sender), choice: Number(args[3].readBigUInt64BE()), reason: typeof note.reason === 'string' ? note.reason.slice(0, 280) : '', claimed: false, txId: tx.id });
    }
    if (args[2]?.length === 8 && method === 'claim') { const vote = votes.get(`${id}:${Number(args[2].readBigUInt64BE())}`); if (vote) vote.claimed = true; }
  }
  const count = Number(globals.next) - 1;
  if (count > 10000) throw new Error('Council proposal indexing capacity exceeded.');
  const proposals = [];
  for (let start = 1; start <= count; start += 6) {
    // Read only a bounded number of boxes concurrently, and fail rather than omit records.
    const rows = await Promise.all(Array.from({ length: Math.min(6, count - start + 1) }, async (_, index) => {
      const id = start + index;
      const box = await bounded(algod.getApplicationBoxByName(config.appId, proposalKey(id)).do());
      const record = decodeProposal(box.value, id), text = metadata.get(String(id));
      const verified = text && text.digest === record.digest && text.title && text.body;
      return { ...record, title: verified ? text.title : `Proposal #${id} (text indexing)`, body: verified ? text.body : '', textVerified: Boolean(verified), txId: text?.txId || '', ...tally(record, globals.members, globals.quorum) };
    }));
    proposals.push(...rows);
  }
  return { config: { ...config, ready: true, version: Number(globals.version), fee: globals.fee, minOffering: globals.minimum, duration: Number(globals.duration), quorumBps: Number(globals.quorum), members: Number(globals.members), next: globals.next, treasury: globals.treasury, reserved: globals.reserved, currency: { id: Number(globals.currency), decimals: Number(params.decimals), unitName: params.unitName || params.name || `ASA ${globals.currency}` }, address: algosdk.getApplicationAddress(config.appId).toString() }, proposals, votes: [...votes.values()], tree };
}
async function readCouncil(address) {
  const config = configuration();
  if (address && !algosdk.isValidAddress(address)) throw new Error('Invalid wallet address.');
  if (!config.appId) return { config: { ...config, ready: false, version: protocol.version, fee: protocol.fee, minOffering: protocol.minOffering, duration: protocol.duration, quorumBps: protocol.quorumBps, members: membership.assetIds.length, treasury: '0', reserved: '0', currency: { id: protocol.currencyId, decimals: 6, unitName: 'ALGO' } }, proposals: [], votes: [], owned: [] };
  const { algod, indexer } = clients(config);
  if (!cached || Date.now() - cached.time > 10000 || cached.appId !== config.appId) {
    if (!pending) pending = catalog(config, algod, indexer).then((data) => { cached = { time: Date.now(), appId: config.appId, data }; return data; }).finally(() => { pending = null; });
    await pending;
  }
  const { tree, ...data } = cached.data;
  let owned = [];
  if (address) {
    const account = await bounded(algod.accountInformation(address).do());
    const eligible = new Set(tree.assetIds);
    owned = (account.assets || []).filter((holding) => BigInt(holding.amount) === 1n && eligible.has(Number(holding.assetId))).map((holding) => tree.proof(Number(holding.assetId)));
  }
  return { ...data, now: Math.floor(Date.now() / 1000), owned };
}
module.exports = { configuration, readCouncil, catalog };
