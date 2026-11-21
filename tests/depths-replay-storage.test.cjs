const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const vm = require("node:vm");
const { parse } = require("@babel/parser");
const storage = require("../lib/depthsReplayStorage");
const { loadReplayFunctions } = require("./helpers/depths-functions.cjs");
const replay = loadReplayFunctions();
const { Serializer } = require("@google-cloud/firestore/build/src/serializer");
const clone = (value) => JSON.parse(JSON.stringify(value));
const DELETE = Symbol("delete");
const options = { deleteField: () => DELETE };

function fakeFirestore(initial = {}) {
  const records = new Map(Object.entries(initial));
  let commits = 0, chunkWrites = 0, failCommit = 0, failRoot = false;
  function put(ref, value, merge = false) {
    // Blobs are measured as bytes, not their JSON array representation.
    const size = Buffer.isBuffer(value.data) ? value.data.length + 256 : Buffer.byteLength(JSON.stringify(value)) + 256;
    if (size > 1048576) throw new Error("document exceeds maximum allowed size");
    const next = { ...(merge ? records.get(ref.path) : {}), ...value };
    for (const key of Object.keys(next)) if (next[key] === DELETE) delete next[key];
    records.set(ref.path, next);
  }
  function ref(path) {
    return {
      path, id: path.split("/").at(-1), firestore: db,
      collection: (name) => ({ doc: (id) => ref(`${path}/${name}/${id}`) }),
      get: async () => ({ exists: records.has(path), data: () => records.get(path), ref: ref(path) }),
      set: async (data, opts) => { if (failRoot) throw new Error("root write failed"); put(ref(path), data, opts?.merge); },
      create: async (data) => { assert(!records.has(path)); put(ref(path), data); },
    };
  }
  const db = {
    collection: (name) => ({ doc: (id = "new-battle") => ref(`${name}/${id}`) }),
    getAll: async (...refs) => Promise.all(refs.map((ref) => ref.get())),
    runTransaction: async (callback) => callback({ get: (ref) => ref.get(), set: (ref, data, opts) => put(ref, data, opts?.merge) }),
    batch: () => {
      const writes = [];
      return {
        set: (ref, data) => writes.push([ref, data]),
        commit: async () => {
          commits++;
          if (commits === failCommit) throw new Error("chunk upload failed");
          assert(writes.length <= 16);
          for (const [ref, data] of writes) { put(ref, data); chunkWrites++; }
        },
      };
    },
  };
  return { db, records, ref: ref("depthsBattles/battle"),
    failBatch: (number) => { failCommit = number; }, failRoot: (value) => { failRoot = value; },
    get chunkWrites() { return chunkWrites; },
  };
}

function longBattle(count = 1600) {
  const initial = { status: "active", winner: null, round: 0,
    champion: { side: "A", role: "champion", assetId: 123, name: "Kaito Shadowbane", hp: 216, maxHp: 232,
      moves: [{ id: "0-Strike", name: "Strike", moveKind: "damage" }] },
    monsters: [{ side: "B", role: "monster", name: "Long fight monster", hp: count, maxHp: count }],
  };
  let before = clone(initial);
  const actionLog = [];
  for (let index = 0; index < count; index++) {
    const after = clone(before);
    after.round++;
    after.monsters[0].hp--;
    if (index === count - 1) { after.status = "complete"; after.winner = "champion"; }
    actionLog.push({ index, actorSide: "A", targetSide: "B", moveId: "0-Strike", moveKind: "damage",
      beforeSnapshot: clone(replay.reduceBattleSnapshotForVerification(before)),
      afterSnapshot: clone(replay.reduceBattleSnapshotForVerification(after)) });
    before = after;
  }
  return { runId: "run", room: 1, championAssetId: 123, serverInitialSnapshot: initial,
    status: "complete", winner: "champion", snapshot: before, actionLog };
}

test("replay chunks round-trip through the installed Firestore blob serializer", async () => {
  const serializer = new Serializer({ _settings: {} });
  const store = fakeFirestore();
  const actionLog = [{ text: "🐉".repeat(150000) }];
  await storage.saveBattleReplay(store.ref, { actionLog }, { creating: true });
  for (const [path, value] of store.records) {
    if (!Buffer.isBuffer(value.data)) continue;
    assert(value.data.length <= storage.CHUNK_BYTES);
    const encoded = serializer.encodeFields(value);
    assert.equal(encoded.data.bytesValue.length, value.data.length);
    store.records.set(path, { data: serializer.decodeValue(encoded.data) });
  }
  assert.deepEqual((await storage.loadBattleReplay(store.ref, store.records.get(store.ref.path))).actionLog, actionLog);
});

test("a long battle exceeding 1 MiB saves every action and retains the same verified victory", async () => {
  const battle = longBattle();
  assert(Buffer.byteLength(JSON.stringify(battle)) > 1048576);
  const expected = replay.buildBattleVerificationFields({ battleId: "battle", existingBattle: battle, data: battle });
  const store = fakeFirestore();
  await storage.saveBattleReplay(store.ref, { ...battle, ...expected }, { creating: true });
  const saved = store.records.get(store.ref.path);
  assert.equal(saved.actionLog, undefined);
  assert(Buffer.byteLength(JSON.stringify(saved)) < 20000);
  assert.equal(saved.serverVerifiedWinner, "champion");
  const restored = await storage.loadBattleReplay(store.ref, saved);
  assert.deepEqual(restored.actionLog, battle.actionLog);
  const actual = replay.buildBattleVerificationFields({ battleId: "battle", existingBattle: restored, data: restored });
  assert.equal(actual.serverBattleVerifiedHash, expected.serverBattleVerifiedHash);
  restored.actionLog[100].moveId = "unowned-move";
  assert.throws(() => replay.buildBattleVerificationFields({ battleId: "battle", existingBattle: restored, data: restored }), /does not have/);
});

test("legacy inline battles migrate on save and repeat saves reuse chunks", async () => {
  const battle = longBattle(5);
  const store = fakeFirestore({ "depthsBattles/battle": battle });
  assert.equal(await storage.loadBattleReplay(store.ref, battle), battle);
  await storage.saveBattleReplay(store.ref, battle, { ...options, existingBattle: battle });
  const saved = store.records.get(store.ref.path);
  assert.equal(saved.actionLog, undefined);
  const writes = store.chunkWrites;
  await storage.saveBattleReplay(store.ref, battle, { ...options, existingBattle: saved });
  assert.equal(store.chunkWrites, writes);
  assert.deepEqual((await storage.loadBattleReplay(store.ref, saved)).actionLog, battle.actionLog);
  await storage.saveBattleReplay(store.ref, { status: "complete" }, options);
  assert.deepEqual((await storage.loadBattleReplay(store.ref, store.records.get(store.ref.path))).actionLog, battle.actionLog);
});

test("partial chunk uploads and failed result writes leave the prior save usable; retries recover", async () => {
  for (const failure of ["chunks", "root"]) {
    const old = { status: "active", actionLog: [{ index: 0 }] };
    const store = fakeFirestore({ "depthsBattles/battle": old });
    // Exceeds one batch and splits multi-byte characters across byte boundaries.
    const actionLog = Array.from({ length: 8000 }, (_, index) => ({ index, text: "🐉é".repeat(100) }));
    if (failure === "chunks") store.failBatch(2); else store.failRoot(true);
    await assert.rejects(storage.saveBattleReplay(store.ref, { status: "complete", actionLog }, options), /failed/);
    assert.equal(store.records.get(store.ref.path), old);
    assert.deepEqual((await storage.loadBattleReplay(store.ref, old)).actionLog, old.actionLog);
    store.failBatch(0); store.failRoot(false);
    await storage.saveBattleReplay(store.ref, { status: "complete", actionLog }, options);
    assert.deepEqual((await storage.loadBattleReplay(store.ref, store.records.get(store.ref.path))).actionLog, actionLog);
  }
});

test("missing, corrupted and misordered replay storage fails closed", async () => {
  for (const damage of ["missing", "bytes", "order", "count", "length", "version"]) {
    const store = fakeFirestore();
    await storage.saveBattleReplay(store.ref, longBattle(), { creating: true });
    const saved = clone(store.records.get(store.ref.path));
    const path = `${store.ref.path}/replayChunks/${saved.serverReplayStorage.chunks[0]}`;
    if (damage === "missing") store.records.delete(path);
    if (damage === "bytes") store.records.set(path, { data: Buffer.from("corrupt") });
    if (damage === "order") saved.serverReplayStorage.chunks.reverse();
    if (damage === "count") saved.serverReplayStorage.actionCount++;
    if (damage === "length") saved.serverReplayStorage.byteLength++;
    if (damage === "version") saved.serverReplayStorage.version++;
    await assert.rejects(storage.loadBattleReplay(store.ref, saved), /replay/i);
  }
});

// Evaluate the actual API module with mocked infrastructure; retain its real
// payload cleanup, compaction, merging, replay verification and write path.
function loadApi(db, overrides = {}) {
  const source = fs.readFileSync(require.resolve("../pages/api/arena/depthsState.js"), "utf8");
  const ast = parse(source, { sourceType: "module" });
  const code = ast.program.body.filter((node) => !node.type.startsWith("Import") && !node.type.startsWith("Export"))
    .map((node) => source.slice(node.start, node.end)).join("\n");
  const firestore = () => db;
  firestore.FieldValue = { serverTimestamp: () => "timestamp", delete: () => DELETE };
  const setup = Object.keys(overrides).map((name) => `${name} = overrides.${name};`).join("\n");
  return vm.runInNewContext(`${code}\n${setup}\n({ depthsState, hashRunWriteToken, mergeBattleActionLog, resumeDepthsRun })`, {
    admin: { firestore }, crypto: require("node:crypto"), Buffer,
    process: { env: { DEPTHS_STATE_TOKEN_SECRET: "test-secret" } },
    console: { error() {} }, NextCors: async () => {},
    ...require("../lib/depthsMoves"), ...storage, overrides,
  });
}

test("the real update API completes an oversized legacy fight and verifies a retry from chunked history", async () => {
  const battle = longBattle();
  const initial = { ...battle, actionLog: battle.actionLog.slice(0, 5), status: "active", snapshot: battle.serverInitialSnapshot };
  const store = fakeFirestore({ "depthsBattles/battle": initial });
  const api = loadApi(store.db);
  store.records.set("depthsRuns/run", { serverRunTokenHash: api.hashRunWriteToken("token") });
  async function update(updates, runToken = "token") {
    const result = {};
    const res = { status: (code) => { result.status = code; }, setHeader() {}, send: (body) => { result.body = JSON.parse(body); } };
    await api.depthsState({ method: "POST", body: { action: "updateBattle", battleId: "battle", runToken, updates } }, res);
    return result;
  }
  const rejected = await update(battle, "wrong-token");
  assert.equal(rejected.status, 403);
  assert.equal(store.chunkWrites, 0);
  const result = await update({ ...battle, serverReplayStorage: { version: 999 } });
  assert.equal(result.status, 200, JSON.stringify(result.body));
  assert.equal(result.body.serverBattleVerified, true);
  assert.equal(result.body.serverVerifiedWinner, "champion");
  const saved = store.records.get(store.ref.path);
  assert.equal(saved.actionLog, undefined);
  assert.equal(saved.serverReplayStorage.version, 1);
  const retry = await update({ status: "complete", winner: "champion" });
  assert.equal(retry.status, 200, JSON.stringify(retry.body));
  assert.equal(retry.body.serverBattleVerified, true);
  assert.deepEqual((await storage.loadBattleReplay(store.ref, store.records.get(store.ref.path))).actionLog,
    clone(api.mergeBattleActionLog(initial, battle.actionLog)));
});

test("resume returns the full chunked history and an unfinished fight can then finish", async () => {
  const battle = longBattle();
  const inProgress = { ...battle, status: "active", winner: null,
    actionLog: battle.actionLog.slice(0, -1), snapshot: battle.actionLog.at(-1).beforeSnapshot };
  const store = fakeFirestore();
  await storage.saveBattleReplay(store.ref, inProgress, { creating: true });
  const run = { status: "active", championAssetId: 123, activeAddress: "wallet" };
  const runRef = store.db.collection("depthsRuns").doc("run");
  store.records.set(runRef.path, run);
  const api = loadApi(store.db, {
    validateAddress: (address) => address,
    walletHoldsChampion: async () => true,
    verifyDepthsResumeWalletProof: async () => ({}),
    findActiveDepthsRun: async () => ({ id: "run", ref: runRef, run }),
    findBestResumeBattleForRun: async () => ({ id: "battle", battle: store.records.get(store.ref.path) }),
  });
  const resumed = await api.resumeDepthsRun({ activeAddress: "wallet", championAssetId: 123 });
  assert.deepEqual(clone(resumed.latestBattle.actionLog), inProgress.actionLog);
  const merged = api.mergeBattleActionLog(resumed.latestBattle, [battle.actionLog.at(-1)]);
  assert.equal(merged.length, battle.actionLog.length);
  const verified = replay.buildBattleVerificationFields({ battleId: "battle", existingBattle: inProgress,
    data: { ...battle, actionLog: merged } });
  assert.equal(verified.serverBattleVerified, true);
});
