const algosdk = require("algosdk");
const { Buffer } = require("buffer");

const MARKET_APP_ID = 3690496091;
const MARKET_ORIGIN = "https://dark-coin.com";
const MAX_UINT64 = (1n << 64n) - 1n;
const listingPath = (id) => `/market/listing/${id}`;
const stallPath = (address) => `/market/stall/${address}`;
const shortAddress = (address) => `${address.slice(0, 6)}...${address.slice(-6)}`;

function unitScale(decimals = 0) {
  let scale = 1n;
  for (let i = 0; i < decimals; i++) scale *= 10n;
  return scale;
}

function parseUnits(value, decimals = 0) {
  const text = String(value).trim();
  if (!/^\d+(\.\d+)?$/.test(text)) throw new Error("Enter a positive amount.");
  const [whole, fraction = ""] = text.split(".");
  if (fraction.length > decimals) throw new Error(`This asset allows ${decimals} decimal places.`);
  const amount = BigInt(whole) * unitScale(decimals) + BigInt(fraction.padEnd(decimals, "0") || "0");
  if (amount <= 0n || amount > MAX_UINT64) throw new Error("Amount is outside the allowed range.");
  return amount;
}

function formatUnits(value, decimals = 0) {
  const amount = BigInt(value || 0);
  const scale = unitScale(decimals);
  const whole = (amount / scale).toLocaleString("en-US");
  const fraction = (amount % scale).toString().padStart(decimals, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
}

function listingBox(listing, amount = listing.amount) {
  return new Uint8Array(Buffer.concat([
    ...[listing.assetId, amount, listing.costId, listing.costAmount].map((v) => Buffer.from(algosdk.encodeUint64(BigInt(v)))),
    Buffer.from(algosdk.decodeAddress(listing.seller).publicKey),
  ]));
}

function decodeListingBox(bytes) {
  const box = Buffer.from(bytes || []);
  if (box.length !== 64) return null;
  const values = [0, 8, 16, 24].map((offset) => box.readBigUInt64BE(offset));
  if (!values[0] || !values[1] || values[0] > BigInt(Number.MAX_SAFE_INTEGER) || values[2] > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  return {
    assetId: Number(values[0]), amount: String(values[1]), costId: Number(values[2]),
    costAmount: String(values[3]), seller: algosdk.encodeAddress(box.subarray(32)), boxKey: box.toString("hex"),
  };
}

// Only confirmed calls to this market can become announcements or catalog entries.
function decodeMarketEvent(txn) {
  const app = txn.applicationTransaction;
  if (!txn.id || !txn.confirmedRound || !app || Number(app.applicationId) !== MARKET_APP_ID || app.onCompletion !== "noop") return null;
  const args = app.applicationArgs || [];
  const method = Buffer.from(args[0] || []).toString();
  if (!["listAsset", "buyAsset", "removeListing"].includes(method)) return null;
  const required = method === "listAsset" ? 2 : 3;
  if (args.length < required + 1 || args.slice(1, required + 1).some((arg) => arg.length !== 8)) return null;
  const uint = (index) => {
    if (args[index]?.length !== 8) throw new Error("Invalid market argument.");
    return String(algosdk.decodeUint64(args[index], "bigint"));
  };
  const boxes = (app.boxReferences || []).filter((b) => Number(b.app || 0) === 0).map((b) => decodeListingBox(b.name)).filter(Boolean);
  const seller = String(method === "buyAsset" ? app.accounts?.[0] : txn.sender);
  const costId = method === "listAsset" ? Number(uint(1)) : method === "buyAsset" ? Number(app.foreignAssets?.[1]) : Number(uint(2));
  const costAmount = uint(method === "listAsset" ? 2 : method === "buyAsset" ? 2 : 3);
  const listing = boxes.find((b) => b.assetId === Number(app.foreignAssets?.[0]) && b.seller === seller && b.costId === costId && b.costAmount === costAmount && (method === "listAsset" || b.amount === uint(1)));
  if (!listing) return null;
  const amount = method === "buyAsset" ? uint(3) : listing.amount;
  if (BigInt(amount) <= 0n || BigInt(amount) > BigInt(listing.amount)) return null;
  if (method === "buyAsset" && !(txn.innerTxns || []).some((inner) => {
    const transfer = inner.assetTransferTransaction;
    return String(inner.sender) === algosdk.getApplicationAddress(MARKET_APP_ID).toString() && String(transfer?.receiver) === String(txn.sender) && Number(transfer.assetId) === listing.assetId && String(transfer.amount) === amount;
  })) return null;
  return {
    ...listing, txId: txn.id, kind: method === "listAsset" ? "listing" : method === "buyAsset" ? "sale" : "removal",
    amount, originalAmount: listing.amount, buyer: method === "buyAsset" ? String(txn.sender) : null,
    round: Number(txn.confirmedRound), offset: Number(txn.intraRoundOffset || 0), time: Number(txn.roundTime),
  };
}

function buildCatalog(events) {
  const listings = new Map();
  const current = new Map();
  const aliases = new Map();
  const ordered = [...events].sort((a, b) => a.round - b.round || a.offset - b.offset);
  const resolvedEvents = [];
  for (const event of ordered) {
    const id = event.kind === "listing" ? event.txId : current.get(event.boxKey);
    if (!id) continue;
    const previous = listings.get(id);
    const remaining = event.kind === "listing" ? event.amount : event.kind === "removal" ? "0" : String(BigInt(event.originalAmount) - BigInt(event.amount));
    const listing = {
      ...(previous || event), id, amount: remaining, originalAmount: previous?.originalAmount || event.amount,
      status: event.kind === "removal" ? "removed" : remaining === "0" ? "sold" : "active",
      lastTxId: event.txId,
    };
    current.delete(event.boxKey);
    aliases.set(event.boxKey, id);
    listing.boxKey = Buffer.from(listingBox(listing)).toString("hex");
    if (remaining !== "0") {
      current.set(listing.boxKey, id);
      aliases.set(listing.boxKey, id);
    }
    listings.set(id, listing);
    resolvedEvents.push({ ...event, listingId: id, remaining });
  }
  return { listings, aliases, events: resolvedEvents };
}

module.exports = { MARKET_APP_ID, MARKET_ORIGIN, MAX_UINT64, listingPath, stallPath, shortAddress, unitScale, parseUnits, formatUnits, listingBox, decodeListingBox, decodeMarketEvent, buildCatalog };
