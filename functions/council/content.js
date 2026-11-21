const crypto = require('node:crypto');
const nacl = require('tweetnacl');
const { normalizeProposal, encodeActions, signedQuoteBytes, quoteProposal, validatePolicyActions } = require('./model');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
function signingKey() {
  const value = process.env.COUNCIL_QUOTE_SEED || '';
  if (!/^[a-fA-F0-9]{64}$/.test(value)) throw Error('Council submission signing is not configured.');
  const seed = Buffer.from(value, 'hex');
  return nacl.sign.keyPair.fromSeed(seed);
}
function makeQuote(input, { config, sender, now = Math.floor(Date.now()/1000), secretKey = signingKey().secretKey }) {
  const manifest = normalizeProposal(input), digest = sha(JSON.stringify(manifest)), actionsHash = sha(encodeActions(manifest.actions));
  validatePolicyActions(manifest.actions,config);
  const quote = { ...quoteProposal(manifest,config), digest, actionsHash, sender, appId:config.appId, revision:String(config.revision), expires:now+1800 };
  quote.signature=Buffer.from(nacl.sign.detached(signedQuoteBytes(quote),secretKey)).toString('hex');
  return { manifest, quote };
}
async function storeManifest(db, manifest, digest) {
  if (sha(JSON.stringify(manifest))!==digest) throw Error('Proposal content hash mismatch.');
  const ref = db.collection('councilManifests').doc(digest);
  try { await ref.create({ manifest, createdAt:Date.now() }); }
  catch (error) { if (error.code!==6) throw error; }
}
async function loadManifest(db, digest) {
  const snap = await db.collection('councilManifests').doc(digest).get();
  if (!snap.exists) return null;
  const m=snap.data().manifest;
  return sha(JSON.stringify(m))===digest ? m : null;
}
module.exports={sha,makeQuote,storeManifest,loadManifest,signingKey};
