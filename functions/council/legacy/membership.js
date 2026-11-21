const crypto = require('node:crypto');
const { protocol, u64 } = require('./model');
const hash = (b) => crypto.createHash('sha256').update(b).digest();
function membershipTree(ids) {
  const assetIds = [...ids].map(Number).sort((a, b) => a - b);
  if (!assetIds.length || assetIds.length > protocol.maxMembers || new Set(assetIds).size !== assetIds.length || assetIds.some((id) => !Number.isSafeInteger(id) || id <= 0)) throw new Error('A unique, nonempty DAO NFT registry is required (maximum 4096).');
  let count = 1; while (count < assetIds.length) count *= 2;
  const levels = [Array.from({ length: count }, (_, i) => hash(Buffer.concat([Buffer.from('DCDAO1'), Buffer.from(u64(assetIds[i] || 0))])))];
  while (levels.at(-1).length > 1) {
    const previous = levels.at(-1);
    levels.push(Array.from({ length: previous.length / 2 }, (_, i) => hash(Buffer.concat([previous[i * 2], previous[i * 2 + 1]]))));
  }
  return { root: levels.at(-1)[0].toString('hex'), assetIds, depth: levels.length - 1,
    proof(assetId) { const slot = assetIds.indexOf(Number(assetId)); if (slot < 0) throw new Error('Not a registered DAO NFT.'); return { assetId: Number(assetId), slot, proof: levels.slice(0, -1).map((level, i) => level[(slot >> i) ^ 1].toString('hex')).join('') }; } };
}
module.exports = { membershipTree };
