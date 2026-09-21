const assert = require("node:assert/strict");
const test = require("node:test");
const algosdk = require("algosdk");
const CID = require("cids");
const { getDepthsMoveId, findDepthsReplayMove, restoreDepthsMoveIds } = require("../lib/depthsMoves");
const { IPFS_GATEWAYS, ipfsImageCandidates, assetImageUrl } = require("../lib/ipfsMedia");
const { loadFunctions, loadReplayFunctions } = require("./helpers/depths-functions.cjs");
const replay = loadReplayFunctions();
const clone = (value) => JSON.parse(JSON.stringify(value));
const cid = "QmTLwvVP1PeJ62QRReXxKXHCnipmZuVD3K4B6DnZD5gErC";
const monsterMoves = [
  { id: "0-Mire Bloom", name: "Mire Bloom", moveKind: "buff" },
  { id: "1-Doom Haze", name: "Doom Haze", moveKind: "curse" },
  { id: "2-Venom Lash", name: "Venom Lash", moveKind: "damage" },
];

test("IPFS images bypass the retired gateway and preserve CID paths", () => {
  for (const uri of [`ipfs://${cid}/image.png#arc3`, `ipfs://ipfs/${cid}/image.png`, `https://ipfs.dark-coin.io/ipfs/${cid}/image.png`]) {
    assert.deepEqual(ipfsImageCandidates(uri), IPFS_GATEWAYS.map((gateway) => `${gateway}${cid}/image.png`));
  }
  assert.deepEqual(ipfsImageCandidates("https://storage.googleapis.com/example/image.png?token=abc"), ["https://storage.googleapis.com/example/image.png?token=abc"]);
  assert.deepEqual(ipfsImageCandidates("data:image/png;base64,AAAA"), ["data:image/png;base64,AAAA"]);
  assert.deepEqual(ipfsImageCandidates("/home/marketLogo.png"), ["/home/marketLogo.png"]);
  assert.deepEqual(ipfsImageCandidates("javascript:alert(1)"), []);
});

test("ARC-19 and legacy champions resolve the actual reserve-address image", () => {
  const reserve = algosdk.encodeAddress(new CID(cid).multihash.slice(2));
  const params = { name: "Dark Coin Champion", reserve };
  assert.equal(assetImageUrl(params), IPFS_GATEWAYS[0] + cid);
  assert.equal(assetImageUrl({ reserve, url: "template-ipfs://{ipfscid:0:dag-pb:reserve:sha2-256}/image.png" }), `${IPFS_GATEWAYS[0]}${cid}/image.png`);
  assert.equal(assetImageUrl({ ...params, reserve: "invalid" }), "");
});

test("move IDs survive the real client and server run compaction functions", () => {
  const client = loadFunctions("pages/arena/depths.js", ["compactDepthsMoveForRun"], { finiteNumber: (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback });
  const server = loadFunctions("pages/api/arena/depthsState.js", ["compactRunMonsterForStorage", "normalizeVerificationMove", "asArray", "safeNumber"], {
    RUN_COMPACT_STAT_KEYS: [], RUN_COMPACT_EFFECT_KEYS: [],
  });
  const raw = monsterMoves.map(({ id, ...move }) => move);
  const compacted = raw.map(client.compactDepthsMoveForRun);
  assert.deepEqual(compacted.map((move) => move.id), monsterMoves.map((move) => move.id));
  assert.deepEqual(clone(server.compactRunMonsterForStorage({ name: "Marrowmire Warden", moves: raw })).moves.map((move) => move.id), monsterMoves.map((move) => move.id));
  assert.equal(getDepthsMoveId({ id: "depths-card-123", name: "Card" }, 5), "depths-card-123");
  assert.equal(getDepthsMoveId(null, 5), "5-move");
});

test("existing Doom Haze actions resolve only against the actor's saved catalog", () => {
  assert.equal(findDepthsReplayMove(monsterMoves, "Doom Haze"), monsterMoves[1]);
  assert.equal(findDepthsReplayMove(monsterMoves, "1-Doom Haze"), monsterMoves[1]);
  assert.equal(findDepthsReplayMove(monsterMoves, "99-Doom Haze"), null);
  assert.equal(findDepthsReplayMove(monsterMoves, "Invented Move"), null);
  assert.equal(findDepthsReplayMove([{ id: "custom-id", name: "Doom Haze" }], "Doom Haze"), null);
  assert.equal(findDepthsReplayMove([{ id: "1-Doom Haze", name: "Doom Haze" }, { id: "2-Doom Haze", name: "Doom Haze" }], "Doom Haze"), null);
  assert.equal(findDepthsReplayMove([{ id: "1-Doom Haze", name: "Doom Haze" }, { id: "custom-id", name: "Doom Haze" }], "Doom Haze"), null);
});

test("hydrating old move catalogs restores canonical IDs without mutating or adding moves", () => {
  const old = monsterMoves.map((move) => ({ ...move, id: move.name, animationFrames: ["frame.png"] }));
  const restored = restoreDepthsMoveIds(old, monsterMoves);
  assert.deepEqual(restored.map((move) => move.id), monsterMoves.map((move) => move.id));
  assert.equal(old[1].id, "Doom Haze");
  assert.deepEqual(restored[1].animationFrames, ["frame.png"]);
  assert.equal(restoreDepthsMoveIds([], monsterMoves).length, 0);
});

test("the actual battle hydration restores saved IDs and resolves an in-flight legacy animation", () => {
  const client = loadFunctions("components/contracts/Arena/DepthsBattle.js", ["mergeFighterSnapshot", "hydrateAnimationMoveFromFighter", "safeNumber"], {
    asArray: (value) => Array.isArray(value) ? value : [],
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    recomputeCooldown: (value) => value,
  });
  const fighter = { hp: 100, maxHp: 100, moves: monsterMoves.map((move) => ({ ...move, id: move.name, animationFrames: ["frame.png"] })) };
  const restored = client.mergeFighterSnapshot(fighter, { hp: 45, maxHp: 100 }, { moves: monsterMoves });
  assert.deepEqual(restored.moves.map((move) => move.id), monsterMoves.map((move) => move.id));
  assert.equal(restored.hp, 45);
  const battle = { fighters: { B: restored }, animation: { actorSide: "B", move: { id: "Doom Haze" } } };
  client.hydrateAnimationMoveFromFighter(battle);
  assert.equal(battle.animation.move.id, "1-Doom Haze");
  assert.deepEqual(battle.animation.move.animationFrames, ["frame.png"]);
});

function battleFixture() {
  const before = { status: "active", winner: null, round: 0,
    champion: { side: "A", role: "champion", assetId: 1559365777, name: "Emberclad Valiant", hp: 20, maxHp: 100, moves: [{ id: "0-Blazing Slash", name: "Blazing Slash", moveKind: "damage" }] },
    monsters: [{ side: "B", role: "monster", name: "Marrowmire Warden", hp: 100, maxHp: 100, moves: monsterMoves }],
  };
  const after = { ...clone(before), status: "complete", winner: "monster", champion: { ...before.champion, hp: 0 } };
  const action = { index: 0, actorSide: "B", targetSide: "A", moveId: "Doom Haze", moveKind: "curse", beforeSnapshot: before, afterSnapshot: after };
  const existingBattle = { runId: "test-run", room: 5, championAssetId: 1559365777, serverInitialSnapshot: before };
  existingBattle.serverInitialIntegrityHash = replay.createIntegrityHash({ runId: existingBattle.runId, room: 5, championAssetId: 1559365777, monsterIds: [], monsterNames: [], snapshot: before });
  return { battleId: "test-battle", existingBattle, data: { status: "complete", winner: "monster", snapshot: after, actionLog: [action] } };
}

test("an already-stuck legacy battle can complete through the real server verifier", () => {
  const result = replay.buildBattleVerificationFields(battleFixture());
  assert.equal(result.serverBattleVerified, true);
  assert.equal(result.serverVerifiedWinner, "monster");
  assert.equal(result.serverVerifiedChampionHp, 0);
});

test("recovery still rejects unowned moves, wrong targets, broken chains and altered integrity hashes", () => {
  for (const [mutate, message] of [
    [(f) => f.data.actionLog[0].moveId = "Invented Move", /actor does not have/],
    [(f) => f.data.actionLog[0].actorSide = "A", /actor does not have/],
    [(f) => f.data.actionLog[0].targetSide = "B", /wrong side/],
    [(f) => { f.data.actionLog[0].beforeSnapshot = clone(f.data.actionLog[0].beforeSnapshot); f.data.actionLog[0].beforeSnapshot.champion.hp = 99; }, /prior state/],
    [(f) => f.existingBattle.serverInitialIntegrityHash = "altered", /integrity hash/],
  ]) {
    const fixture = battleFixture(); mutate(fixture);
    assert.throws(() => replay.buildBattleVerificationFields(fixture), message);
  }
});
