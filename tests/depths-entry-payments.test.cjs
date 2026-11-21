const test = require("node:test");
const assert = require("node:assert/strict");
const algosdk = require("algosdk");
const fs = require("node:fs");
const vm = require("node:vm");
const payments = require("../lib/depthsEntryPayments");
const TX = "ZCDLFNFBIFCAVMEOEJV72GO4EJ2GXNBGT2ITTAE54YWLB4GLJRBQ";
const { loadFunctions } = require("./helpers/depths-functions.cjs");
const store = () => {
  const records = new Map();
  return { getItem: (key) => records.get(key) || null, setItem: (key, value) => records.set(key, value), removeItem: (key) => records.delete(key) };
};
const missing = () => Promise.reject(Object.assign(new Error("not found"), { status: 404 }));
function confirmationClients(pending, indexed = missing) {
  let time = 0;
  return { txId: TX, client: { pendingTransactionInformation: () => ({ do: pending }) },
    indexer: { lookupTransactionByID: () => ({ do: indexed }) }, now: () => time, sleep: async (ms) => { time += ms; } };
}

test("confirmation waits past four rounds and tolerates node/indexer lag", async () => {
  let calls = 0;
  const context = confirmationClients(async () => ++calls > 8 ? { confirmedRound: 99n } : {});
  assert.equal(await payments.confirmEntryPayment(context), TX);
  assert.equal(calls, 9);
});

test("an indexed confirmation wins even when the node has forgotten or rejected the transaction", async () => {
  for (const pending of [missing, async () => ({ poolError: "transaction already in ledger" }), async () => ({ poolError: "stale pool error" })]) {
    assert.equal(await payments.confirmEntryPayment(confirmationClients(pending, async () => ({ transaction: { confirmedRound: 99n } }))), TX);
  }
});

test("confirmation uncertainty preserves a usable payment record across reloads", async () => {
  const storage = store();
  const payment = { txId: TX, walletAddress: "wallet", championAssetId: 123 };
  payments.rememberEntryPayment(storage, payment);
  await assert.rejects(payments.confirmEntryPayment({ ...confirmationClients(missing), timeoutMs: 5000 }), /same payment; do not pay again/);
  assert.deepEqual(payments.readEntryPayment(storage, "wallet", 123), payment);
  assert.equal(payments.readEntryPayment(storage, "other-wallet", 123), null);
  assert.equal(payments.readEntryPayment(storage, "wallet", 456), null);
  payments.clearEntryPayment(storage, "wallet", 123);
  assert.equal(payments.readEntryPayment(storage, "wallet", 123), null);
});

test("duplicate-ledger and lost submission responses check the locally derived ID without rebroadcasting", async () => {
  const account = algosdk.generateAccount();
  const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({ sender: account.addr, receiver: account.addr,
    assetIndex: 1088771340, amount: 1000000000,
    suggestedParams: { firstValid: 100, lastValid: 1100, fee: 1000, flatFee: true, genesisHash: new Uint8Array(32) } });
  for (const message of ["TransactionPool.Remember: transaction already in ledger", "Network error", "timeout"]) {
    let sends = 0, remembered;
    const id = await payments.submitEntryPayment({ txn, signTransactions: async () => [txn.signTxn(account.sk)],
      remember: (id) => { remembered = id; },
      client: { sendRawTransaction: () => ({ do: async () => { assert.equal(remembered, txn.txID()); sends++; throw new Error(message); } }) },
      confirm: async ({ txId }) => { assert.equal(txId, txn.txID()); return txId; } });
    assert.equal(id, txn.txID());
    assert.equal(sends, 1);
  }
  let sent = false;
  await assert.rejects(payments.submitEntryPayment({ txn, signTransactions: async () => [txn.signTxn(account.sk)],
    remember: () => { throw new Error("storage unavailable"); },
    client: { sendRawTransaction: () => { sent = true; } } }), /storage unavailable/);
  assert.equal(sent, false);
});

test("entry authorization retries indexer lag and fails without asking for another payment", async () => {
  let calls = 0;
  const indexer = { lookupTransactionByID: () => ({ do: async () => ++calls < 4 ? missing() : { transaction: { id: TX } } }) };
  assert.equal((await payments.lookupIndexedEntryPayment(indexer, TX, async () => {})).transaction.id, TX);
  await assert.rejects(payments.lookupIndexedEntryPayment({ lookupTransactionByID: () => ({ do: missing }) }, TX, async () => {}),
    (error) => error.status === 503 && /same payment/.test(error.message));
});

const payment = { receiver: "treasury", assetId: 1088771340, amountAtomic: 1000000000 };
function candidate(overrides = {}) {
  return { id: TX, sender: "wallet", confirmedRound: 66169257n, txType: "axfer",
    assetTransferTransaction: { receiver: "treasury", assetId: 1088771340n, amount: 1000000000n },
    note: Buffer.from(JSON.stringify({ kind: "darkcoin-depths-entry-payment", championAssetId: 1559288976 })), ...overrides };
}
function searchIndexer(pages) {
  let calls = 0;
  const query = { do: async () => pages[calls++] };
  for (const method of ["address", "addressRole", "assetID", "txType", "afterTime", "limit", "nextToken"]) query[method] = () => query;
  return { searchForTransactions: () => query };
}

test("recovery finds an unused confirmed payment for this wallet and champion", async () => {
  const result = await payments.findRecoverableEntryPayment({ indexer: searchIndexer([{ transactions: [] , nextToken: "page2" }, { transactions: [candidate()] }]),
    walletAddress: "wallet", championAssetId: 1559288976, payment, isUsed: async () => false });
  assert.deepEqual(result, { txId: TX, amountAtomic: "1000000000" });
  const used = await payments.findRecoverableEntryPayment({ indexer: searchIndexer([{ transactions: [candidate()] }]),
    walletAddress: "wallet", championAssetId: 1559288976, payment, isUsed: async () => true });
  assert.equal(used, null);
});

test("recovery rejects unconfirmed, unrelated, clawback, close-out, and rekey payments", () => {
  const context = { walletAddress: "wallet", championAssetId: 1559288976, payment };
  assert(payments.matchesRecoverableEntry(candidate(), context));
  for (const overrides of [ { sender: "other" }, { confirmedRound: 0 }, { txType: "pay" }, { note: Buffer.from("bad") },
    { note: Buffer.from(JSON.stringify({ kind: "darkcoin-depths-entry-payment", championAssetId: 9 })) }, { rekeyTo: "other" },
    ...[{ receiver: "wrong" }, { assetId: 9 }, { amount: 1 }, { sender: "clawback" }, { closeTo: "close" }]
      .map((change) => ({ assetTransferTransaction: { ...candidate().assetTransferTransaction, ...change } })) ]) {
    assert.equal(payments.matchesRecoverableEntry(candidate(overrides), context), false);
  }
});

test("the actual payment verifier still checks sender, asset, receiver and reuse prerequisites", async () => {
  const api = loadFunctions("pages/api/arena/depthsState.js", ["verifyDepthsEntryPayment", "getTransactionFromIndexerResponse",
    "getAssetTransfer", "getConfirmedRound", "getTransactionSender"], {
    algosdk: { Indexer: class {} }, INDEXER_BASE: "test", lookupIndexedEntryPayment: async () => ({ transaction: candidate() }),
  });
  const verified = await api.verifyDepthsEntryPayment({ txId: TX, walletAddress: "wallet", expectedPayment: payment });
  assert.equal(verified.confirmedRound, 66169257);
  await assert.rejects(api.verifyDepthsEntryPayment({ txId: TX, walletAddress: "other", expectedPayment: payment }), /sender/);
  await assert.rejects(api.verifyDepthsEntryPayment({ txId: TX, walletAddress: "wallet", expectedPayment: { ...payment, receiver: "wrong" } }), /receiver/);
});

test("the real entry handler retries a saved payment after createRun fails without signing or submitting again", async () => {
  const source = fs.readFileSync(require.resolve("../pages/arena/depths.js"), "utf8");
  const start = source.indexOf("const confirmDepthsEntryPayment = async () =>");
  const end = source.indexOf("\n  useEffect(", start);
  const storage = store();
  let creates = 0, submits = 0, checks = 0;
  const context = { ...payments, window: { localStorage: storage }, activeAddress: "wallet",
    entryPaymentPrompt: { record: { assetId: 123 }, payment }, entryPaymentSubmitting: false, entryPaymentLockRef: { current: false },
    setEntryPaymentSubmitting() {}, setEntryPaymentError() {}, setEntryPaymentStatus() {}, setEntryPaymentPrompt() {},
    postDepthsState: async ({ action }) => {
      if (action === "getEntryInfo") return { payment };
      creates++;
      if (creates === 1) throw new Error("lost createRun response");
      return { id: "new-run" };
    },
    normalizeAtomicAmountString: String, submitDepthsEntryPayment: async () => {
      submits++; payments.rememberEntryPayment(storage, { txId: TX, walletAddress: "wallet", championAssetId: 123 }); return TX;
    },
    confirmEntryPayment: async ({ txId }) => { checks++; return txId; },
    buildDepthsCreatePayload: (record, cards, artifacts, txId) => { assert.equal(txId, TX); return { action: "createRun" }; },
    applyCreatedDepthsRun: (created) => created,
    algosdk: { Algodv2: class {}, Indexer: class {} }, ALGOD_BASE: "test", INDEXER_BASE: "test", console: { warn() {} },
  };
  const retry = vm.runInNewContext(`${source.slice(start, end)}\nconfirmDepthsEntryPayment`, context);
  assert.equal(await retry(), null);
  assert.deepEqual(await retry(), { id: "new-run" });
  assert.equal(submits, 1);
  assert.equal(checks, 1);
  assert.equal(payments.readEntryPayment(storage, "wallet", 123), null);
  assert.equal(context.entryPaymentLockRef.current, false);
});
