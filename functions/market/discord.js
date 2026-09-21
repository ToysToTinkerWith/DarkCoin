const { MARKET_ORIGIN, listingPath, stallPath, shortAddress, formatUnits, unitScale } = require("./model");
const { publicImageUrl, FALLBACK_IMAGE, enrichListing } = require("./media");

function escapeText(text, limit = 180) {
  return String(text || "").replace(/[\r\n\t]/g, " ").replace(/([\\`*_{}\[\]()<>|~])/g, "\\$1").slice(0, limit);
}

function paymentIconUrl(event) {
  if (Number(event.costId) === 0) return "https://asa-list.tinyman.org/assets/0/icon.png";
  if (Number(event.costId) === 1088771340) return `${MARKET_ORIGIN}/DarkCoinLogo.png`;
  const image = publicImageUrl(event.currency.image);
  if (image && image !== FALLBACK_IMAGE && !/\.(svg|json|html?|mp4|webm|glb|gltf)$/i.test(new URL(image).pathname)) return image;
  return `https://asa-list.tinyman.org/assets/${event.costId}/icon.png`;
}

function buildAnnouncement(event) {
  const sale = event.kind === "sale";
  const { asset, currency } = event;
  const unit = escapeText(currency.unitName, 70);
  const quantity = formatUnits(event.amount, asset.decimals);
  const price = formatUnits(BigInt(event.costAmount) * unitScale(asset.decimals), currency.decimals);
  const listedAmount = sale ? event.originalAmount ?? event.amount : event.amount;
  const priceLabel = BigInt(listedAmount) === unitScale(asset.decimals) ? "Price" : "Price per unit";
  const priceUnitName = String(currency.unitName || "").replace(/[\r\n\t]/g, " ").slice(0, 70);
  const total = formatUnits(BigInt(event.amount) * BigInt(event.costAmount), currency.decimals);
  const listingUrl = `${MARKET_ORIGIN}${listingPath(event.listingId)}`;
  const stallUrl = `${MARKET_ORIGIN}${stallPath(event.seller)}`;
  const transactionUrl = `https://explorer.perawallet.app/tx/${event.txId}`;
  const fields = [
    { name: sale ? "Purchased" : "Quantity", value: quantity, inline: true },
    ...(sale ? [{ name: "Sale total", value: `**${total} ${unit}**`, inline: true }] : []),
    { name: "Seller", value: `[${shortAddress(event.seller)}](${stallUrl})`, inline: true },
  ];
  if (sale) fields.push({ name: "Buyer", value: `[${shortAddress(event.buyer)}](https://explorer.perawallet.app/address/${event.buyer})`, inline: true });
  fields.push({ name: "Asset", value: `[${event.assetId}](https://explorer.perawallet.app/asset/${event.assetId})`, inline: true });
  if (sale) fields.push({ name: "Listing status", value: event.remaining === "0" ? "Sold out" : `${formatUnits(event.remaining, asset.decimals)} remaining`, inline: true });
  return {
    username: "Dark Coin Market",
    avatar_url: FALLBACK_IMAGE,
    allowed_mentions: { parse: [] },
    embeds: [{
      // Embed fields cannot pair text with an image; the author row supports a real inline icon.
      author: { name: `${priceLabel}: ${price} ${priceUnitName}`, icon_url: paymentIconUrl(event), url: listingUrl },
      title: escapeText(asset.name), url: listingUrl,
      description: sale ? `**SALE CONFIRMED**\n**${quantity} ${escapeText(asset.name, 100)}** purchased for **${total} ${unit}**.` : "**NEW LISTING**",
      color: sale ? 0x53c493 : 0xd5bd78,
      fields,
      image: { url: publicImageUrl(asset.image) || FALLBACK_IMAGE },
      footer: { text: `Algorand Mainnet | Round ${event.round.toLocaleString("en-US")}` },
      timestamp: new Date(event.time * 1000).toISOString(),
    }],
    components: [{ type: 1, components: [
      { type: 2, style: 5, label: "View listing", url: listingUrl },
      { type: 2, style: 5, label: "Visit stall", url: stallUrl },
      { type: 2, style: 5, label: "View transaction", url: transactionUrl },
    ] }],
  };
}

function announcementStartTime() {
  const timestamp = Date.parse(process.env.MARKET_ANNOUNCEMENTS_START_TIME || "");
  if (!Number.isFinite(timestamp)) throw new Error("MARKET_ANNOUNCEMENTS_START_TIME is required.");
  return timestamp / 1000;
}

async function deliverAnnouncement(db, event, fetchImpl = fetch, enrich = enrichListing) {
  if (!["listing", "sale"].includes(event.kind) || event.time < announcementStartTime()) return { skipped: true };
  const webhook = event.kind === "sale" ? process.env.MARKET_SALES_WEBHOOK : process.env.MARKET_LISTINGS_WEBHOOK;
  if (!webhook) throw new Error("Market webhook is not configured.");
  const ref = db.collection("marketAnnouncements").doc(event.txId);
  const lease = `${Date.now()}-${require("crypto").randomUUID()}`;
  const decision = await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(ref);
    const state = doc.data() || {};
    if (state.status === "posted") return "posted";
    if (state.leaseUntil > Date.now() || state.nextAttemptAt > Date.now()) return "busy";
    transaction.set(ref, { status: "posting", lease, leaseUntil: Date.now() + 90000, kind: event.kind, attempts: (state.attempts || 0) + 1 }, { merge: true });
    return "send";
  });
  if (decision !== "send") return { posted: decision === "posted", pending: decision === "busy" };
  try {
    const payload = buildAnnouncement(await enrich(event));
    const url = new URL(webhook);
    url.searchParams.set("wait", "true");
    url.searchParams.set("with_components", "true");
    const response = await fetchImpl(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(12000) });
    if (!response.ok) {
      let retry = 60;
      if (response.status === 429) {
        const body = await response.json().catch(() => ({}));
        retry = Math.max(1, Number(body.retry_after) || 60);
      }
      throw Object.assign(new Error(`Discord returned HTTP ${response.status}.`), { retry });
    }
    const message = await response.json();
    if (!message.id) throw new Error("Discord did not acknowledge the message.");
    await ref.set({ status: "posted", messageId: message.id, postedAt: Date.now(), leaseUntil: 0, nextAttemptAt: 0 }, { merge: true });
    return { posted: true };
  } catch (error) {
    // Store a redacted error; webhook tokens and response bodies never enter logs or Firestore.
    await ref.set({ status: "retry", leaseUntil: 0, nextAttemptAt: Date.now() + (error.retry || 60) * 1000 }, { merge: true });
    return { pending: true };
  }
}

module.exports = { buildAnnouncement, deliverAnnouncement, announcementStartTime };
