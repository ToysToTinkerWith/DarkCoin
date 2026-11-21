const test = require("node:test");
const assert = require("node:assert/strict");
const algosdk = require("algosdk");
const { MARKET_APP_ID, listingBox, decodeListingBox, decodeMarketEvent, buildCatalog, parseUnits, formatUnits } = require("../functions/market/model");
const { buildAnnouncement, deliverAnnouncement } = require("../functions/market/discord");
const { mediaUrl } = require("../functions/market/media");
const { buildListing, buildPurchase, buildRemoval, sendMarketGroup } = require("../lib/marketTransactions");
const { PAYMENT_ASSETS, priceUnitSuffix, formatPriceInput, priceInputEdit, unformatPriceInput } = require("../lib/marketPricing");

const seller = algosdk.encodeAddress(new Uint8Array(32).fill(1));
const buyer = algosdk.encodeAddress(new Uint8Array(32).fill(2));
const base = { assetId: 601894079, amount: "10000000", costId: 0, costAmount: "2", seller };
const ids = ["A", "B", "C", "D"].map((c) => c.repeat(52));

function transaction(kind, listing = base, amount = listing.amount, index = 0) {
  const method = { listing: "listAsset", sale: "buyAsset", removal: "removeListing" }[kind];
  const values = kind === "listing" ? [listing.costId, listing.costAmount] : kind === "sale" ? [listing.amount, listing.costAmount, amount] : [listing.amount, listing.costId, listing.costAmount];
  return {
    id: ids[index], confirmedRound: BigInt(100 + index), intraRoundOffset: 0, roundTime: 1788654600 + index,
    sender: algosdk.Address.fromString(kind === "sale" ? buyer : seller),
    applicationTransaction: {
      applicationId: BigInt(MARKET_APP_ID), onCompletion: "noop",
      applicationArgs: [Buffer.from(method), ...values.map((v) => algosdk.encodeUint64(BigInt(v)))],
      foreignAssets: kind === "sale" ? [BigInt(listing.assetId), BigInt(listing.costId)] : [BigInt(listing.assetId)],
      accounts: kind === "sale" ? [algosdk.Address.fromString(seller)] : [],
      boxReferences: [{ app: 0, name: listingBox(listing) }],
    },
    innerTxns: kind === "sale" ? [{ sender: algosdk.getApplicationAddress(MARKET_APP_ID), assetTransferTransaction: { assetId: BigInt(listing.assetId), amount: BigInt(amount), receiver: algosdk.Address.fromString(buyer) } }] : [],
  };
}

test("listing boxes preserve uint64 amounts and reject shuffle/claim boxes", () => {
  const listing = { ...base, amount: "18446744073709551615" };
  assert.equal(decodeListingBox(listingBox(listing)).amount, listing.amount);
  assert.equal(decodeListingBox(Buffer.alloc(9)), null);
  assert.equal(decodeListingBox(Buffer.alloc(33)), null);
  assert.equal(decodeListingBox(Buffer.alloc(64)), null);
});

test("SDK 3 address objects and bigint fields decode confirmed listing and sale events", () => {
  const event = decodeMarketEvent(transaction("listing"));
  assert.equal(event.seller, seller);
  assert.equal(event.amount, base.amount);
  const sale = decodeMarketEvent(transaction("sale", base, "1000000", 1));
  assert.equal(sale.buyer, buyer);
  assert.equal(sale.costAmount, "2");
});

test("unconfirmed, foreign-app, shuffle, and unverified sale transactions cannot announce", () => {
  const unconfirmed = transaction("listing"); unconfirmed.confirmedRound = 0n;
  assert.equal(decodeMarketEvent(unconfirmed), null);
  const foreign = transaction("listing"); foreign.applicationTransaction.applicationId = 1n;
  assert.equal(decodeMarketEvent(foreign), null);
  const shuffle = transaction("listing"); shuffle.applicationTransaction.applicationArgs[0] = Buffer.from("createShuffle");
  assert.equal(decodeMarketEvent(shuffle), null);
  const malformed = transaction("listing"); malformed.applicationTransaction.applicationArgs[1] = Buffer.alloc(1);
  assert.equal(decodeMarketEvent(malformed), null);
  const missingReward = transaction("sale"); missingReward.innerTxns = [];
  assert.equal(decodeMarketEvent(missingReward), null);
});

test("partial and final sales retain a listing URL; relisting creates a distinct URL", () => {
  const events = [decodeMarketEvent(transaction("listing"))];
  events.push(decodeMarketEvent(transaction("sale", base, "1000000", 1)));
  let catalog = buildCatalog(events);
  assert.equal(catalog.listings.size, 1);
  assert.equal(catalog.listings.get(ids[0]).amount, "9000000");
  assert.equal(catalog.events[1].listingId, ids[0]);
  events.push(decodeMarketEvent(transaction("sale", { ...base, amount: "9000000" }, "9000000", 2)));
  events.push(decodeMarketEvent(transaction("listing", base, base.amount, 3)));
  catalog = buildCatalog(events);
  assert.equal(catalog.listings.size, 2);
  assert.equal(catalog.listings.get(ids[0]).status, "sold");
  assert.equal(catalog.listings.get(ids[3]).status, "active");
});

test("removing a listing preserves its archived page", () => {
  const catalog = buildCatalog([decodeMarketEvent(transaction("removal", base, base.amount, 1)), decodeMarketEvent(transaction("listing"))]);
  assert.equal(catalog.listings.get(ids[0]).status, "removed");
  assert.equal(catalog.listings.get(ids[0]).amount, "0");
});

test("display amounts are exact without floating-point rounding", () => {
  assert.equal(parseUnits("0.000001", 6), 1n);
  assert.equal(parseUnits("9007199254.740993", 6), 9007199254740993n);
  assert.equal(formatUnits("9007199254740993", 6), "9,007,199,254.740993");
  assert.throws(() => parseUnits("1.5", 0));
  assert.throws(() => parseUnits("0", 6));
  assert.throws(() => parseUnits("1e6", 6));
  assert.throws(() => parseUnits("18446744073709551616", 0));
});

test("payment shortcuts use ALGO zero and the Dark Coin ASA", () => {
  assert.deepEqual(PAYMENT_ASSETS.map(({ id }) => id), [0, 1088771340]);
});

test("each is omitted for exactly one display unit, including divisible assets", () => {
  for (const decimals of [0, 6, 19]) {
    const unit = "1" + "0".repeat(decimals);
    assert.equal(priceUnitSuffix({ amount: unit, asset: { decimals } }), "");
    assert.equal(priceUnitSuffix({ amount: String(BigInt(unit) + 1n), asset: { decimals } }), " each");
  }
  assert.equal(priceUnitSuffix({ amount: "1", asset: { decimals: 6 } }), " each");
});

test("price input groups whole digits without rounding decimals or partial entries", () => {
  for (const [input, expected] of [
    ["", ""], ["1000", "1,000"], ["1000000", "1,000,000"],
    ["1000.001000", "1,000.001000"], ["1000.", "1,000."], [".05", ".05"],
    ["9007199254740993.000001", "9,007,199,254,740,993.000001"], ["1,234.56", "1,234.56"],
  ]) assert.equal(formatPriceInput(input), expected);
  for (const input of ["1e6", "-1", "1.2.3", "NaN", "100abc", "1/2"]) assert.equal(formatPriceInput(input), null);
  assert.equal(unformatPriceInput("1,000,000.000001"), "1000000.000001");
  assert.equal(unformatPriceInput("1,000."), "1000");
  assert.equal(unformatPriceInput(".05"), "0.05");
});

test("inserting and deleting price digits keeps the cursor near the edited digit", () => {
  assert.deepEqual(priceInputEdit("1000", 4), { value: "1,000", caret: 5 });
  assert.deepEqual(priceInputEdit("19,234", 2), { value: "19,234", caret: 2 });
  assert.deepEqual(priceInputEdit("12,945.00", 4), { value: "12,945.00", caret: 4 });
  assert.deepEqual(priceInputEdit("1,34", 2), { value: "134", caret: 1 });
  assert.deepEqual(priceInputEdit("1,234.506", 8), { value: "1,234.506", caret: 8 });
  assert.equal(priceInputEdit("bad", 3), null);
});

test("formatted prices reach listing transaction arguments with exact uint64 precision", async () => {
  const price = parseUnits(unformatPriceInput("9,007,199,254.740993"), 6);
  const txns = await buildListing({ client: mockAlgod(), listing: { ...base, amount: "1", costAmount: String(price) } });
  assert.equal(algosdk.decodeUint64(txns.at(-1).applicationCall.appArgs[2], "bigint"), 9007199254740993n);
});

function richEvent(kind = "sale") {
  return { ...decodeMarketEvent(transaction(kind, base, kind === "sale" ? "1000000" : base.amount, kind === "sale" ? 1 : 0)), listingId: ids[0], remaining: "9000000", asset: { name: "Dark Coin", decimals: 6, image: "https://dark-coin.com/home/marketLogo.png" }, currency: { decimals: 6, unitName: "ALGO" } };
}

test("Discord embeds show display quantities, correct sale totals, artwork, and permanent links", () => {
  const payload = buildAnnouncement(richEvent());
  assert.equal(payload.embeds[0].fields.find((f) => f.name === "Purchased").value, "1");
  assert.equal(payload.embeds[0].author.name, "Price per unit: 2 ALGO");
  assert.equal(payload.embeds[0].author.icon_url, "https://asa-list.tinyman.org/assets/0/icon.png");
  assert.equal(payload.embeds[0].fields.find((f) => f.name === "Sale total").value, "**2 ALGO**");
  assert.match(payload.embeds[0].url, new RegExp(ids[0]));
  assert.ok(payload.embeds[0].image.url.startsWith("https://"));
  assert.deepEqual(payload.allowed_mentions.parse, []);
  assert.equal(payload.components[0].components.length, 3);
  const listing = buildAnnouncement(richEvent("listing"));
  assert.notEqual(listing.embeds[0].color, payload.embeds[0].color);
  assert.equal(listing.embeds[0].fields.some((f) => f.name === "Total listed value"), false);
  assert.equal(listing.embeds[0].fields.some((f) => f.name === "Sale total"), false);
  assert.equal(listing.embeds[0].author.name, "Price per unit: 2 ALGO");
  assert.equal(listing.embeds[0].description, "**NEW LISTING**");
});

test("single-unit Discord listings omit per unit for NFTs and divisible assets", () => {
  for (const decimals of [0, 6, 19]) {
    const event = richEvent("listing");
    event.amount = "1" + "0".repeat(decimals);
    event.asset.decimals = decimals;
    const message = buildAnnouncement(event);
    assert.match(message.embeds[0].author.name, /^Price: /);
    assert.doesNotMatch(JSON.stringify(message), /per unit|Total listed value/);
    event.amount = String(BigInt(event.amount) + 1n);
    assert.match(buildAnnouncement(event).embeds[0].author.name, /^Price per unit: /);
  }
});

test("sale price labels use listed quantity, not just the quantity purchased", () => {
  const event = richEvent();
  assert.equal(event.amount, "1000000");
  assert.equal(buildAnnouncement(event).embeds[0].author.name, "Price per unit: 2 ALGO");
  event.originalAmount = "1000000";
  const embed = buildAnnouncement(event).embeds[0];
  assert.equal(embed.author.name, "Price: 2 ALGO");
  assert.equal(embed.fields.find((field) => field.name === "Sale total").value, "**2 ALGO**");
});

test("listing and sale price headers pair the amount with the correct payment artwork", () => {
  for (const kind of ["listing", "sale"]) {
    const event = richEvent(kind);
    event.costId = 1088771340;
    event.currency = { decimals: 6, unitName: "DARKCOIN", image: "https://example.com/wrong.svg" };
    const embed = buildAnnouncement(event).embeds[0];
    assert.equal(embed.author.name, "Price per unit: 2 DARKCOIN");
    assert.equal(embed.author.icon_url, "https://dark-coin.com/DarkCoinLogo.png");
    assert.equal(embed.image.url, event.asset.image);
    event.costId = 123456;
    event.currency = { decimals: 6, unitName: "TEST", image: "https://example.com/token.png" };
    assert.equal(buildAnnouncement(event).embeds[0].author.icon_url, event.currency.image);
    for (const image of [undefined, "javascript:alert(1)", "http://127.0.0.1/icon.png", "https://example.com/icon.svg", "https://example.com/metadata.json", "https://dark-coin.com/home/marketLogo.png"]) {
      event.currency.image = image;
      assert.equal(buildAnnouncement(event).embeds[0].author.icon_url, "https://asa-list.tinyman.org/assets/123456/icon.png");
    }
  }
});

test("asset metadata cannot create mentions or break embed size limits", () => {
  const event = richEvent(); event.asset.name = "@everyone **[fake](https://evil.test)**".repeat(20);
  const payload = buildAnnouncement(event);
  assert.ok(payload.embeds[0].title.length <= 256);
  assert.ok(payload.embeds[0].description.length <= 4096);
  assert.deepEqual(payload.allowed_mentions, { parse: [] });
  assert.match(payload.embeds[0].title, /\\\[/);
});

test("IPFS and ARC-19 media resolve to HTTPS images", () => {
  assert.equal(mediaUrl("ipfs://ipfs/bafy/example.png"), "https://ipfs-pera.algonode.dev/ipfs/bafy/example.png");
  assert.ok(mediaUrl("template-ipfs://{ipfscid:1:raw:reserve:sha2-256}", { reserve: seller }).startsWith("https://ipfs-pera.algonode.dev/ipfs/baf"));
  assert.equal(mediaUrl("javascript:alert(1)"), "");
});

function fakeDb() {
  let data = {};
  let lock = Promise.resolve();
  const ref = { async set(update) { data = { ...data, ...update }; } };
  return {
    collection() { return { doc() { return ref; } }; },
    runTransaction(callback) {
      const result = lock.then(() => callback({ get: async () => ({ data: () => data }), set: (_ref, update) => { data = { ...data, ...update }; } }));
      lock = result.catch(() => {}); return result;
    },
    state: () => data,
    resetRetry: () => { data.nextAttemptAt = 0; },
  };
}

test("concurrent and replayed events post only once; wait=true acknowledges delivery", async () => {
  process.env.MARKET_ANNOUNCEMENTS_START_TIME = "2026-01-01T00:00:00Z";
  process.env.MARKET_SALES_WEBHOOK = "https://discord.com/api/webhooks/test/test";
  const db = fakeDb(); let calls = 0;
  const post = async (url) => { calls++; assert.equal(url.searchParams.get("wait"), "true"); assert.equal(url.searchParams.get("with_components"), "true"); return { ok: true, json: async () => ({ id: "123" }) }; };
  const enrich = async (event) => event;
  await Promise.all([deliverAnnouncement(db, richEvent(), post, enrich), deliverAnnouncement(db, richEvent(), post, enrich)]);
  await deliverAnnouncement(db, richEvent(), post, enrich);
  assert.equal(calls, 1);
  assert.equal(db.state().status, "posted");
});

test("rate limits remain retryable and never expose webhook secrets", async () => {
  const db = fakeDb();
  await deliverAnnouncement(db, richEvent(), async () => ({ ok: false, status: 429, json: async () => ({ retry_after: 4 }) }), async (e) => e);
  assert.equal(db.state().status, "retry");
  assert.ok(db.state().nextAttemptAt >= Date.now() + 3000);
  assert.equal(JSON.stringify(db.state()).includes("webhooks"), false);
  db.resetRetry();
  await deliverAnnouncement(db, richEvent(), async () => ({ ok: true, json: async () => ({ id: "124" }) }), async (e) => e);
  assert.equal(db.state().status, "posted");
});

test("both webhook channels receive the updated icon-enabled price payload", async () => {
  process.env.MARKET_ANNOUNCEMENTS_START_TIME = "2026-01-01T00:00:00Z";
  process.env.MARKET_LISTINGS_WEBHOOK = "https://discord.com/api/webhooks/test/listings";
  process.env.MARKET_SALES_WEBHOOK = "https://discord.com/api/webhooks/test/sales";
  for (const kind of ["listing", "sale"]) {
    const event = richEvent(kind);
    event.costId = 1088771340;
    event.amount = "1000000";
    const enrich = async (value) => ({ ...value, currency: { decimals: 6, unitName: "DARKCOIN" } });
    const db = fakeDb();
    let sent = false;
    const result = await deliverAnnouncement(db, event, async (url, options) => {
      sent = true;
      assert.equal(url.pathname.split("/").at(-1), kind === "listing" ? "listings" : "sales");
      assert.equal(options.method, "POST");
      const payload = JSON.parse(options.body);
      const embed = payload.embeds[0];
      assert.equal(embed.author.name, kind === "listing" ? "Price: 2 DARKCOIN" : "Price per unit: 2 DARKCOIN");
      assert.equal(embed.author.icon_url, "https://dark-coin.com/DarkCoinLogo.png");
      assert.equal(embed.fields.some((field) => field.name === "Total listed value"), false);
      assert.equal(embed.fields.some((field) => field.name === "Sale total"), kind === "sale");
      assert.deepEqual(payload.allowed_mentions, { parse: [] });
      return { ok: true, json: async () => ({ id: "test-message" }) };
    }, enrich);
    assert.equal(sent, true);
    assert.deepEqual(result, { posted: true });
  }
});

function mockAlgod(opted = true) {
  const params = { fee: 0n, minFee: 1000n, firstValid: 1000n, lastValid: 2000n, genesisID: "mainnet-v1.0", genesisHash: new Uint8Array(32) };
  return {
    getTransactionParams: () => ({ do: async () => params }),
    getApplicationBoxByName: () => ({ do: async () => ({ value: new Uint8Array(32) }) }),
    accountAssetInformation: () => ({ do: async () => { if (!opted) throw Object.assign(new Error("not found"), { status: 404 }); return {}; } }),
  };
}

test("LIST wallet requests retain listing semantics and label every encoded transaction", async () => {
  for (const opted of [true, false]) {
    const listing = { ...base, costId: 1088771340 };
    const txns = await buildListing({ client: mockAlgod(opted), listing });
    algosdk.assignGroupID(txns);
    assert.equal(txns.length, opted ? 3 : 5);
    const decoded = txns.map((txn) => algosdk.decodeUnsignedTransaction(algosdk.encodeUnsignedTransaction(txn)));
    for (const txn of decoded) {
      assert.match(Buffer.from(txn.note).toString(), /^Dark Coin Market \| LIST asset 601894079 \| /);
      assert.doesNotMatch(Buffer.from(txn.note).toString(), /shuffle/i);
    }
    const create = decoded.at(-1);
    assert.equal(Buffer.from(create.applicationCall.appArgs[0]).toString(), "listAsset");
    assert.equal(create.applicationCall.appIndex, BigInt(MARKET_APP_ID));
    assert.equal(decoded.at(-3).payment.amount, 100000n);
    assert.equal(decoded.at(-2).assetTransfer.amount, BigInt(base.amount));
    assert.equal(decodeListingBox(create.applicationCall.boxes[0].name).seller, seller);
  }
});

test("purchase pays the seller and requests exact atomic quantities with pooled inner fees", async () => {
  const txns = await buildPurchase({ client: mockAlgod(), listing: base, buyer, amount: 1000000n });
  assert.equal(txns.length, 2);
  assert.equal(txns[0].payment.receiver.toString(), seller);
  assert.equal(txns[0].payment.amount, 2000000n);
  assert.equal(txns[1].fee, 2000n);
  assert.equal(algosdk.decodeUint64(txns[1].applicationCall.appArgs[3], "bigint"), 1000000n);
  assert.equal(decodeListingBox(txns[1].applicationCall.boxes[1].name).amount, "9000000");
  const optin = await buildPurchase({ client: mockAlgod(false), listing: base, buyer, amount: 1n });
  assert.equal(optin.length, 3);
  assert.equal(optin[0].assetTransfer.amount, 0n);
  const asa = await buildPurchase({ client: mockAlgod(), listing: { ...base, costId: 1088771340 }, buyer, amount: 1n });
  assert.equal(asa[0].assetTransfer.assetIndex, 1088771340n);
});

test("removal enforces creator ownership and can opt the seller back in", async () => {
  await assert.rejects(buildRemoval({ client: mockAlgod(), listing: base, sender: buyer }), /Only the seller/);
  const txns = await buildRemoval({ client: mockAlgod(false), listing: base, sender: seller });
  assert.equal(txns.length, 2);
  assert.equal(txns[0].assetTransfer.receiver.toString(), seller);
  assert.equal(txns[1].fee, 2000n);
});

test("SDK 3 confirmation uses confirmedRound and returns the application transaction ID", async () => {
  for (const key of ["txid", "txId"]) {
    const client = mockAlgod();
    const txns = await buildPurchase({ client, listing: base, buyer, amount: 1n });
    let queried;
    client.sendRawTransaction = () => ({ do: async () => ({ [key]: txns[0].txID() }) });
    client.pendingTransactionInformation = (id) => ({ do: async () => { queried = id; return { confirmedRound: 1234n, poolError: "" }; } });
    const txId = await sendMarketGroup({ client, txns, signTransactions: async (encoded) => encoded, setMessage: () => {} });
    assert.equal(queried, txns[0].txID());
    assert.equal(txId, txns[1].txID());
  }
});

test("a pool rejection is surfaced without announcing success", async () => {
  const client = mockAlgod();
  const txns = await buildPurchase({ client, listing: base, buyer, amount: 1n });
  client.sendRawTransaction = () => ({ do: async () => ({ txid: txns[0].txID() }) });
  client.pendingTransactionInformation = () => ({ do: async () => ({ confirmedRound: 0n, poolError: "overspend" }) });
  await assert.rejects(sendMarketGroup({ client, txns, signTransactions: async (encoded) => encoded, setMessage: () => {} }), /overspend/);
});
