const algosdk = require("algosdk");
const CID = require("cids");
const multihashes = require("multihashes");
const { indexer, bounded } = require("./chain");
const { MARKET_ORIGIN } = require("./model");
const GATEWAY = "https://ipfs-pera.algonode.dev/ipfs/";
const FALLBACK_IMAGE = `${MARKET_ORIGIN}/home/marketLogo.png`;
const cache = new Map();

function publicImageUrl(value) {
  try {
    const url = new URL(String(value));
    if (url.protocol !== "https:" || url.username || url.password || !url.hostname.includes(".") || /^(localhost|127\.|10\.|192\.168\.|169\.254\.|\[)/i.test(url.hostname)) return "";
    return url.href;
  } catch { return ""; }
}

function mediaUrl(value, params = {}) {
  let uri = String(value || "").trim();
  const template = uri.match(/^template-ipfs:\/\/\{ipfscid:([01]):(dag-pb|raw):reserve:sha2-256\}/);
  if (template && params.reserve) {
    try {
      const hash = multihashes.encode(algosdk.decodeAddress(String(params.reserve)).publicKey, "sha2-256");
      uri = uri.replace(template[0], `ipfs://${new CID(Number(template[1]), template[2], hash).toString()}`);
    } catch { return ""; }
  }
  if (uri.startsWith("ipfs://")) return GATEWAY + uri.slice(7).replace(/^ipfs\//, "").split("#")[0];
  if (uri.startsWith("ar://")) return publicImageUrl(`https://arweave.net/${uri.slice(5)}`);
  try {
    const url = new URL(uri);
    if (url.pathname.includes("/ipfs/")) return GATEWAY + url.pathname.split("/ipfs/")[1];
  } catch { return ""; }
  return publicImageUrl(uri.split("#")[0]);
}

async function assetInfo(id) {
  if (Number(id) === 0) return { id: 0, name: "Algorand", unitName: "ALGO", decimals: 6, image: `${MARKET_ORIGIN}/AlgoWhite.svg` };
  const saved = cache.get(id);
  if (saved && saved.expires > Date.now()) return saved.value;
  const { asset } = await bounded(indexer.lookupAssetByID(Number(id)).do());
  const p = asset.params;
  let image = mediaUrl(p.url, p);
  const metadataUri = /#arc3$|\.json(?:#.*)?$/i.test(p.url || "") || String(p.name).endsWith("@arc3");
  if (metadataUri) {
    // Fetch metadata through the fixed IPFS gateway, never an arbitrary asset URL.
    if (image.startsWith(GATEWAY)) {
      try {
        const response = await fetch(image, { signal: AbortSignal.timeout(5000), redirect: "error" });
        if (response.ok) {
          const metadata = await response.json();
          image = mediaUrl(metadata.image || metadata.image_url, p);
        } else image = "";
      } catch { image = ""; }
    } else image = "";
  }
  if (!image || /\.(mp4|webm|glb|gltf)$/i.test(image)) {
    try {
      const history = await bounded(indexer.lookupAssetTransactions(Number(id)).txType("acfg").limit(100).do(), 6000);
      for (const txn of [...history.transactions].sort((a, b) => Number(b.confirmedRound) - Number(a.confirmedRound))) {
        try {
          const note = JSON.parse(Buffer.from(txn.note || []).toString());
          if (String(note.standard).toLowerCase() !== "arc69") continue;
          image = mediaUrl(note.image || note.image_url || note.properties?.image, p);
          if (image) break;
        } catch { /* Configuration notes do not always contain metadata. */ }
      }
    } catch { /* Artwork metadata is optional. */ }
  }
  const info = { id: Number(id), name: p.name || p.unitName || `Asset ${id}`, unitName: p.unitName || p.name || `ASA ${id}`, decimals: p.decimals, image: image || FALLBACK_IMAGE };
  cache.set(id, { expires: Date.now() + 600000, value: info });
  return info;
}

async function enrichListing(listing) {
  const [asset, currency] = await Promise.all([assetInfo(listing.assetId), assetInfo(listing.costId)]);
  return { ...listing, asset, currency };
}

async function enrichListings(listings) {
  const results = [];
  for (let offset = 0; offset < listings.length; offset += 6) {
    results.push(...await Promise.all(listings.slice(offset, offset + 6).map(enrichListing)));
  }
  return results;
}

module.exports = { FALLBACK_IMAGE, publicImageUrl, mediaUrl, assetInfo, enrichListing, enrichListings };
