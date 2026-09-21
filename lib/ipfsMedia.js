const algosdk = require("algosdk");
const CID = require("cids");
const multihashes = require("multihashes");

const IPFS_GATEWAYS = [
  "https://ipfs-pera.algonode.dev/ipfs/",
  "https://gateway.pinata.cloud/ipfs/",
  "https://ipfs.algonode.xyz/ipfs/",
];
const CHAMPION_CREATOR = "L6VIKAHGH4D7XNH3CYCWKWWOHYPS3WYQM6HMIPNBVSYZWPNQ6OTS5VERQY";

function ipfsImageCandidates(value = "") {
  const uri = String(value || "").trim();
  if (!uri) return [];
  let path = "";
  if (uri.startsWith("ipfs://")) path = uri.slice(7).replace(/^ipfs\//, "");
  else {
    try {
      const url = new URL(uri);
      if (!["https:", "http:"].includes(url.protocol)) return uri.startsWith("data:image/") ? [uri] : [];
      const marker = url.pathname.indexOf("/ipfs/");
      if (marker >= 0) path = url.pathname.slice(marker + 6) + url.search;
    } catch { return uri.startsWith("/") && !uri.startsWith("//") ? [uri] : []; }
  }
  if (path) return IPFS_GATEWAYS.map((gateway) => gateway + path.split("#")[0]);
  return /^https?:\/\//.test(uri) ? [uri] : [];
}

function assetImageUrl(params = {}) {
  let uri = String(params.url || "");
  const template = uri.match(/^template-ipfs:\/\/\{ipfscid:([01]):(dag-pb|raw):reserve:sha2-256\}/);
  const legacyChampion = params.creator === CHAMPION_CREATOR || String(params.name || "").startsWith("Dark Coin Champion");
  if ((template || legacyChampion) && params.reserve) {
    try {
      const hash = multihashes.encode(algosdk.decodeAddress(String(params.reserve)).publicKey, "sha2-256");
      const cid = new CID(template ? Number(template[1]) : 0, template ? template[2] : "dag-pb", hash).toString();
      uri = template ? uri.replace(template[0], `ipfs://${cid}`) : `ipfs://${cid}`;
    } catch { return ""; }
  }
  return ipfsImageCandidates(uri)[0] || "";
}

module.exports = { IPFS_GATEWAYS, ipfsImageCandidates, assetImageUrl };
