import NextCors from "nextjs-cors";
import crypto from "crypto";
import algosdk from "algosdk";
import nacl from "tweetnacl";
import admin from "../../../Firebase/FirebaseAdmin";
import { getDepthsMoveId, findDepthsReplayMove } from "../../../lib/depthsMoves";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

const db = admin.firestore();
const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;

const RUN_COLLECTION = "depthsRuns";
const BATTLE_COLLECTION = "depthsBattles";
const DAILY_ENTRY_COLLECTION = "depthsDailyEntries";
const ENTRY_PAYMENT_COLLECTION = "depthsEntryPayments";
const CHAMPION_ENTRY_COLLECTION = "depthsChampionEntries";
const INDEXER_BASE = "https://mainnet-idx.algonode.cloud";
const DARK_COIN_ASSET_ID = 1088771340;
const DARK_COIN_DECIMALS = 6;
const DEPTHS_APP_ID = 3658640544;
const DEPTHS_ENTRY_BASE_DARK_COIN = 1000;
const CHAMPION_CREATOR = "L6VIKAHGH4D7XNH3CYCWKWWOHYPS3WYQM6HMIPNBVSYZWPNQ6OTS5VERQY";
const ENTRY_PROOF_MAX_AGE_MS = 10 * 60 * 1000;

const RUN_STATUSES = new Set([
  "choosingLoadout",
  "map",
  "choosingCard",
  "choosingCardUpgrade",
  "choosingArtifact",
  "removingCard",
  "quest",
  "questResolved",
  "questRewardPending",
  "nodeReward",
  "active",
  "roomCleared",
  "defeated",
  "abandoned",
  "completed",
]);

const BATTLE_STATUSES = new Set(["active", "complete"]);
const ENDED_RUN_STATUSES = new Set(["defeated", "abandoned", "completed"]);
const ACTIVE_RUN_STATUSES = new Set(
  [...RUN_STATUSES].filter((status) => !ENDED_RUN_STATUSES.has(status))
);
const TERMINAL_RUN_UPDATE_STATUSES = new Set(["defeated", "abandoned", "completed"]);

const PROTECTED_EXACT_KEYS = new Set([
  "rewardEligible",
  "rewardStatus",
  "rewardTxId",
  "rewardConfirmedRound",
  "rewardWalletAddress",
  "rewardSigner",
  "rewardRequestedAt",
  "rewardRequestedByUid",
  "rewardRequestedByEmail",
  "rewardClaimedAt",
  "rewardError",
  "rewardFailedAt",
  "serverRewardEligible",
  "serverRewardProof",
  "serverRewardVerifiedAt",
  "serverRewardVerifiedByUid",
  "serverRewardVerifiedByEmail",
  "darkCoinRewardStatus",
  "darkCoinRewardAssetId",
  "darkCoinRewardAppId",
  "darkCoinRewardWalletAddress",
  "darkCoinRewardTierId",
  "darkCoinRewardLabel",
  "darkCoinRewardBasisPoints",
  "darkCoinRewardPercentDisplay",
  "darkCoinRewardWeight",
  "darkCoinRewardTotalWeight",
  "darkCoinRewardChance",
  "darkCoinRewardChanceDisplay",
  "darkCoinRewardAmountAtomic",
  "darkCoinRewardAmountDisplay",
  "darkCoinRewardContractBalanceAtomic",
  "darkCoinRewardGrantStartedAt",
  "darkCoinRewardGrantTxId",
  "darkCoinRewardGrantConfirmedRound",
  "darkCoinRewardSigner",
  "darkCoinRewardGrantedAt",
  "darkCoinRewardError",
  "darkCoinRewardFailedAt",
  "darkCoinClaimTxId",
  "darkCoinClaimedAt",
  "entryType",
  "entryDailyKey",
  "entryRunNumber",
  "entryCountBefore",
  "entryDailyCountBefore",
  "entryLifetimeCountBefore",
  "entryPaymentTxId",
  "entryPaymentAssetId",
  "entryPaymentAmountAtomic",
  "entryPaymentAmountDisplay",
  "entryPaymentReceiver",
  "entryPaymentRequiredAmountAtomic",
  "entryPaymentRequiredAmountDisplay",
  "entryPaymentBaseAmountAtomic",
  "entryPaymentBaseAmountDisplay",
  "entryAuthorizedAt",
  "entryAuthorizedBy",
  "entryPaymentConfirmedRound",
  "entryPaymentRoundTime",
  "entryWalletProofHash",
  "entryWalletProofType",
  "entryWalletProofIssuedAt",
  "entryWalletProofVerifiedAt",
  "depthsXpStatus",
  "depthsXpAmount",
  "depthsXpBreakdown",
  "depthsXpGrantStartedAt",
  "depthsXpGrantTxId",
  "depthsXpGrantConfirmedRound",
  "depthsXpSigner",
  "depthsXpGrantedAt",
  "depthsXpError",
  "depthsXpFailedAt",
  "serverBattleVerified",
  "serverBattleVerifiedAt",
  "serverBattleVerifiedHash",
  "serverBattleVerificationError",
  "serverVerifiedWinner",
  "serverVerifiedChampionHp",
  "serverVerifiedMonsterHp",
  "serverInitialIntegrityHash",
  "serverInitialIntegrityAt",
  "serverInitialSnapshot",
  "serverBattleReplayVersion",
  "serverBattleActionChainHash",
  "depthsRunDiscordPostStatus",
  "depthsRunDiscordPostRequestedAt",
  "depthsRunDiscordPostedAt",
  "depthsRunDiscordMessageId",
  "depthsRunDiscordPostSkippedReason",
  "depthsRunDiscordPostSkippedAt",
  "depthsRunDiscordPostError",
  "depthsRunDiscordPostFailedAt",
]);

const CLIENT_RUN_SERVER_KEYS = new Set([
  "serverWriteVersion",
  "serverUpdatedAt",
  "serverBattleVerified",
  "serverBattleVerifiedAt",
  "serverVerifiedWinner",
  "serverVerifiedChampionHp",
  "serverVerifiedMonsterHp",
  "serverBattleVerificationError",
]);

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  return req.body;
}

function sendJson(res, status, payload) {
  res.status(status);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.send(JSON.stringify(payload));
}

function isProtectedKey(key) {
  const value = String(key || "");
  return PROTECTED_EXACT_KEYS.has(value) || value.startsWith("server");
}

function uniqueSecrets(values = []) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

function getDepthsCreatorMnemonic() {
  return String(process.env.CREATOR_MNEMONIC || process.env.DEPTHS_CREATOR_MNEMONIC || "").trim();
}

function getStateTokenSecrets() {
  return uniqueSecrets([
    process.env.DEPTHS_STATE_TOKEN_SECRET,
    process.env.DEPTHS_REWARD_PROOF_SECRET,
    getDepthsCreatorMnemonic(),
    process.env.DC_WALLET,
    "depths-local-development-token-secret",
  ]);
}

function getStateTokenSecret() {
  return getStateTokenSecrets()[0];
}

function createRunWriteToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashRunWriteToken(token, secret = getStateTokenSecret()) {
  return crypto
    .createHmac("sha256", secret)
    .update(String(token || ""))
    .digest("hex");
}

function tokenMatches(expectedHash, token) {
  const expected = Buffer.from(String(expectedHash || ""), "hex");
  if (!expected.length) return false;

  return getStateTokenSecrets().some((secret) => {
    const actual = Buffer.from(hashRunWriteToken(token, secret), "hex");
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  });
}

async function requireRunWriteToken(runId, token) {
  const runRef = db.collection(RUN_COLLECTION).doc(runId);
  const runSnap = await runRef.get();

  if (!runSnap.exists) {
    const error = new Error("Depths run was not found.");
    error.status = 404;
    throw error;
  }

  const run = runSnap.data() || {};
  if (!tokenMatches(run.serverRunTokenHash, token)) {
    const error = new Error("Depths run write token is invalid.");
    error.status = 403;
    throw error;
  }

  return { runRef, run };
}

function cleanValue(value) {
  if (value === undefined || typeof value === "function") return undefined;
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(cleanValue).filter((entry) => entry !== undefined);
  }
  if (typeof value === "object") {
    const out = {};
    Object.entries(value).forEach(([key, item]) => {
      if (isProtectedKey(key)) return;
      const clean = cleanValue(item);
      if (clean !== undefined) out[key] = clean;
    });
    return out;
  }
  return String(value);
}

function cleanPayload(payload = {}) {
  const cleaned = cleanValue(payload);
  return cleaned && typeof cleaned === "object" && !Array.isArray(cleaned) ? cleaned : {};
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(",")}}`;
}

function createIntegrityHash(value) {
  return crypto
    .createHmac("sha256", getStateTokenSecret())
    .update(stableStringify(value))
    .digest("hex");
}

function requireString(value, fieldName) {
  const text = String(value || "").trim();
  if (!text) {
    const error = new Error(`${fieldName} is required.`);
    error.status = 400;
    throw error;
  }
  return text;
}

function normalizeAssetId(value) {
  const assetId = Number(value);
  return Number.isSafeInteger(assetId) && assetId > 0 ? assetId : 0;
}

function getChampionAssetIdQueryValues(championAssetId) {
  const assetId = normalizeAssetId(championAssetId);
  if (!assetId) return [];
  return [...new Set([assetId, String(assetId)])];
}

function safeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function getBattleSnapshotWinner(snapshot = {}) {
  const championHp = safeNumber(snapshot?.champion?.hp, 0);
  const monsters = asArray(snapshot?.monsters);
  const monsterAlive = monsters.some((monster) => safeNumber(monster?.hp, 0) > 0);

  if (championHp <= 0 && !monsterAlive) return "draw";
  if (championHp <= 0) return "monster";
  if (!monsterAlive && monsters.length > 0) return "champion";
  return null;
}

function normalizeVerificationNumberMap(map = {}) {
  return Object.keys(map || {})
    .sort()
    .reduce((acc, key) => {
      const amount = safeNumber(map[key], 0);
      if (amount) acc[key] = Math.round(amount * 1000) / 1000;
      return acc;
    }, {});
}

const RUN_COMPACT_STAT_KEYS = [
  "health",
  "speed",
  "resist",
  "strength",
  "dexterity",
  "intelligence",
  "accuracy",
  "critChance",
  "critDamage",
];

const RUN_COMPACT_EFFECT_KEYS = [
  "poison",
  "bleed",
  "burn",
  "freeze",
  "slow",
  "drown",
  "paralyze",
  "doom",
  "shield",
  "strengthen",
  "focus",
  "empower",
  "nurture",
  "bless",
  "hasten",
  "cleanse",
];

function normalizeVerificationMove(move = {}) {
  const moveId = String(move?.id || move?.moveId || move?.cardId || move?.name || "");
  return {
    id: moveId,
    name: String(move?.name || moveId || "Unknown card"),
    type: String(move?.type || move?.category || ""),
    moveKind: String(move?.moveKind || ""),
    target: String(move?.target || ""),
    power: Math.round(safeNumber(move?.power ?? move?.basePower, 0) * 1000) / 1000,
    accuracy: Math.round(safeNumber(move?.accuracy, 0) * 1000) / 1000,
    cooldown: Math.round(safeNumber(move?.cooldown ?? move?.cooldown_seconds, 0) * 1000) / 1000,
    effect: String(move?.effect || move?.effect_name || ""),
    effectAmount:
      Math.round(safeNumber(move?.effectAmount ?? move?.effect_potency ?? move?.effect_potency_base, 0) * 1000) /
      1000,
    effects: asArray(move?.effects).map((effect) => ({
      effect: String(effect?.effect || effect?.effectName || "").toLowerCase(),
      amount: Math.round(safeNumber(effect?.amount, 0) * 1000) / 1000,
      target: String(effect?.target || ""),
    })),
  };
}

function compactRunCardForStorage(card = {}) {
  const move = card?.move || card || {};
  const cardId = String(card?.cardId || move?.cardId || move?.depthsCardId || card?.id || move?.id || "");
  return {
    id: String(card?.id || move?.id || cardId || ""),
    cardId,
    name: String(card?.name || move?.name || "Depths Card"),
    type: String(card?.type || move?.type || move?.category || ""),
    range: String(card?.range || ""),
    class: String(card?.class || ""),
    rarity: String(card?.rarity || move?.rarity || "common"),
    power: Math.round(safeNumber(card?.power ?? move?.power, 0) * 1000) / 1000,
    accuracy: Math.round(safeNumber(card?.accuracy ?? move?.accuracy, 0) * 1000) / 1000,
    cooldown: Math.round(safeNumber(card?.cooldown ?? move?.cooldown ?? move?.cooldown_seconds, 0) * 1000) / 1000,
    effects: asArray(card?.effects || move?.effects).map((effect) => ({
      effect: String(effect?.effect || effect?.effectName || "").toLowerCase(),
      amount: Math.round(safeNumber(effect?.amount, 0) * 1000) / 1000,
      target: String(effect?.target || ""),
    })),
    deckCopies: Math.max(0, Math.round(safeNumber(card?.deckCopies ?? move?.deckCopies, 1))),
    room: card?.room ?? null,
    cardPowerScore: safeNumber(card?.cardPowerScore ?? move?.cardPowerScore, 0),
    move: normalizeVerificationMove({
      ...move,
      cardId,
      depthsCardId: move?.depthsCardId || cardId || null,
      depthsCardSource: move?.depthsCardSource || "firebase",
      deckCopies: card?.deckCopies ?? move?.deckCopies ?? 1,
    }),
  };
}

function compactRunArtifactForStorage(artifact = {}) {
  return {
    id: String(artifact?.id || ""),
    name: String(artifact?.name || ""),
    rarity: String(artifact?.rarity || ""),
    imageUrl: String(artifact?.imageUrl || artifact?.iconUrl || ""),
    room: artifact?.room ?? null,
    description: artifact?.description || "",
    effect: artifact?.effect || "",
    statBonuses: artifact?.statBonuses || {},
    moveAccuracy: artifact?.moveAccuracy || {},
    artifactMeta: artifact?.artifactMeta || {},
    depthsAbilityMeta: artifact?.depthsAbilityMeta || {},
    battleOnly: asArray(artifact?.battleOnly).map((entry) => ({
      type: String(entry?.type || ""),
      attackType: String(entry?.attackType || ""),
      effectKey: String(entry?.effectKey || ""),
      sourceEffectKey: String(entry?.sourceEffectKey || ""),
      amount: safeNumber(entry?.amount, 0),
      trigger: String(entry?.trigger || ""),
    })),
  };
}

function compactRunUpgradeForStorage(upgrade = {}) {
  return {
    id: String(upgrade?.id || ""),
    upgradeId: String(upgrade?.upgradeId || upgrade?.id || ""),
    name: String(upgrade?.name || ""),
    description: upgrade?.description || "",
    moveIndex: Number.isSafeInteger(Number(upgrade?.moveIndex)) ? Number(upgrade.moveIndex) : null,
    moveKey: String(upgrade?.moveKey || ""),
    moveFamilyKey: String(upgrade?.moveFamilyKey || ""),
    room: upgrade?.room ?? null,
    powerDelta: safeNumber(upgrade?.powerDelta, 0),
    powerMultiplier: upgrade?.powerMultiplier || null,
    accuracyDelta: safeNumber(upgrade?.accuracyDelta, 0),
    cooldownDelta: safeNumber(upgrade?.cooldownDelta, 0),
    effectPotencyBonus: safeNumber(upgrade?.effectPotencyBonus, 0),
    effectPotencyMultiplier: upgrade?.effectPotencyMultiplier || null,
    repeatCount: upgrade?.repeatCount || null,
    multiTarget: Boolean(upgrade?.multiTarget),
    critChanceBonus: safeNumber(upgrade?.critChanceBonus, 0),
    secondaryEffects: asArray(upgrade?.secondaryEffects).map((effect) => ({
      target: String(effect?.target || ""),
      effectKey: String(effect?.effectKey || ""),
      amount: safeNumber(effect?.amount, 0),
      trigger: String(effect?.trigger || ""),
    })),
  };
}

function compactRunRemovalForStorage(removal = {}) {
  return {
    id: String(removal?.id || ""),
    cardId: String(removal?.cardId || ""),
    moveKey: String(removal?.moveKey || ""),
    moveFamilyKey: String(removal?.moveFamilyKey || ""),
    removedCopies: Math.max(1, Math.round(safeNumber(removal?.removedCopies, 1))),
    room: removal?.room ?? null,
  };
}

function compactRunMonsterForStorage(monster = {}) {
  if (!monster || typeof monster !== "object") return null;
  const monsterId = String(monster?.docId || monster?.monsterId || monster?.id || "");
  const compact = {
    docId: monster?.docId || null,
    id: monster?.id || monsterId,
    monsterId: monster?.monsterId || monsterId,
    name: String(monster?.name || monster?.displayName || monsterId || "Monster"),
    monsterType: String(monster?.monsterType || monster?.type || "Monster"),
    description: String(monster?.description || ""),
    status: String(monster?.status || ""),
    depthsWorlds: asArray(monster?.depthsWorlds),
    baseStats: RUN_COMPACT_STAT_KEYS.reduce((acc, key) => {
      const value = monster?.baseStats?.[key] ?? monster?.[key];
      if (value !== undefined && value !== null) acc[key] = Math.round(safeNumber(value, 0) * 1000) / 1000;
      return acc;
    }, {}),
    effectPotencies: RUN_COMPACT_EFFECT_KEYS.reduce((acc, key) => {
      const value =
        monster?.effectPotencies?.[key] ??
        monster?.itemEffectPotencies?.[key] ??
        monster?.[key];
      if (value !== undefined && value !== null && safeNumber(value, 0)) {
        acc[key] = Math.round(safeNumber(value, 0) * 1000) / 1000;
      }
      return acc;
    }, {}),
    moves: asArray(monster?.moves).map((move, index) => normalizeVerificationMove({ ...move, id: getDepthsMoveId(move, index) })),
    _depthsScaling: monster?._depthsScaling || monster?.depthsScaling || null,
    idleFrame:
      asArray(monster?.idleFrames).find(Boolean) ||
      monster?.idleFrame ||
      "",
    imageUrl:
      monster?.imageUrl ||
      monster?.standingUrl ||
      monster?.idleFrame ||
      asArray(monster?.idleFrames).find(Boolean) ||
      "",
    standingUrl: monster?.standingUrl || monster?.imageUrl || "",
  };

  RUN_COMPACT_STAT_KEYS.forEach((key) => {
    if (monster?.[key] !== undefined && monster?.[key] !== null) {
      compact[key] = Math.round(safeNumber(monster[key], 0) * 1000) / 1000;
    }
  });
  RUN_COMPACT_EFFECT_KEYS.forEach((key) => {
    if (monster?.[key] !== undefined && monster?.[key] !== null && safeNumber(monster[key], 0)) {
      compact[key] = Math.round(safeNumber(monster[key], 0) * 1000) / 1000;
    }
  });

  Object.keys(compact).forEach((key) => {
    if (compact[key] === null || compact[key] === undefined || compact[key] === "") delete compact[key];
  });
  return compact;
}

function compactRunChampionSnapshotForStorage(charObj = null) {
  if (!charObj || typeof charObj !== "object") return null;
  const snapshot = {
    assetId: charObj.assetId || null,
    name: String(charObj.name || ""),
    description: String(charObj.description || ""),
    health: safeNumber(charObj.health, 0),
    speed: safeNumber(charObj.speed, 0),
    resist: safeNumber(charObj.resist, 0),
    strength: safeNumber(charObj.strength, 0),
    dexterity: safeNumber(charObj.dexterity, 0),
    intelligence: safeNumber(charObj.intelligence, 0),
    critChance: safeNumber(charObj.critChance, 0),
    critDamage: safeNumber(charObj.critDamage, 0),
    baseStats: charObj.baseStats || null,
    statBonuses: charObj.statBonuses || {},
    skillStatBonuses: charObj.skillStatBonuses || {},
    traitStatBonuses: charObj.traitStatBonuses || {},
    effectPotencies: normalizeVerificationNumberMap(charObj.effectPotencies || {}),
    itemEffectPotencies: normalizeVerificationNumberMap(charObj.itemEffectPotencies || {}),
    skillEffectBonuses: normalizeVerificationNumberMap(charObj.skillEffectBonuses || {}),
    gainedEffectsMeta: charObj.gainedEffectsMeta || {},
    triggerEffects: asArray(charObj.triggerEffects),
    passiveEffects: asArray(charObj.passiveEffects),
    moves: asArray(charObj.moves).map((move, index) => normalizeVerificationMove({ ...move, id: getDepthsMoveId(move, index) })),
    depthsCurrentHp:
      charObj.depthsCurrentHp === undefined || charObj.depthsCurrentHp === null
        ? null
        : Math.round(safeNumber(charObj.depthsCurrentHp, 0) * 1000) / 1000,
    depthsAbilityMeta: charObj.depthsAbilityMeta || {},
    depthsArtifactMeta: charObj.depthsArtifactMeta || {},
    backgroundImageUrl: charObj.backgroundImageUrl || charObj.backgroundUrl || "",
    standingUrl: charObj.standingUrl || charObj.imageUrl || "",
    imageUrl: charObj.imageUrl || charObj.standingUrl || "",
  };

  Object.keys(snapshot).forEach((key) => {
    if (snapshot[key] === null || snapshot[key] === undefined || snapshot[key] === "") delete snapshot[key];
  });
  return snapshot;
}

function compactRunFighterSnapshotForStorage(fighter = null) {
  if (!fighter || typeof fighter !== "object") return null;
  return normalizeVerificationFighter(fighter, fighter?.side || "A", { includeMoves: true });
}

function clearInactiveRunChoiceFields(data = {}) {
  const status = String(data.status || "");
  if (!status) return data;

  if (!["choosingLoadout", "choosingCard"].includes(status) && data.cardChoices === undefined) {
    data.cardChoices = [];
  }
  if (!["choosingLoadout", "choosingArtifact"].includes(status) && data.artifactChoices === undefined) {
    data.artifactChoices = [];
  }
  if (status !== "choosingCardUpgrade" && data.cardUpgradeChoices === undefined) {
    data.cardUpgradeChoices = [];
  }
  if (status !== "choosingLoadout") {
    if (data.selectedCardPreview === undefined) data.selectedCardPreview = null;
    if (data.selectedArtifactPreview === undefined) data.selectedArtifactPreview = null;
  }

  return data;
}

function compactRunStorageFields(data = {}) {
  clearInactiveRunChoiceFields(data);
  if (Array.isArray(data.artifacts)) data.artifacts = data.artifacts.map(compactRunArtifactForStorage);
  if (Array.isArray(data.artifactChoices)) data.artifactChoices = data.artifactChoices.map(compactRunArtifactForStorage);
  if (Array.isArray(data.cards)) data.cards = data.cards.map(compactRunCardForStorage);
  if (Array.isArray(data.cardChoices)) data.cardChoices = data.cardChoices.map(compactRunCardForStorage);
  if (Array.isArray(data.cardUpgrades)) data.cardUpgrades = data.cardUpgrades.map(compactRunUpgradeForStorage);
  if (Array.isArray(data.cardUpgradeChoices)) data.cardUpgradeChoices = data.cardUpgradeChoices.map(compactRunUpgradeForStorage);
  if (Array.isArray(data.cardRemovals)) data.cardRemovals = data.cardRemovals.map(compactRunRemovalForStorage);
  if (data.selectedCardPreview) data.selectedCardPreview = compactRunCardForStorage(data.selectedCardPreview);
  if (data.selectedArtifactPreview) data.selectedArtifactPreview = compactRunArtifactForStorage(data.selectedArtifactPreview);
  if (data.championSnapshot) data.championSnapshot = compactRunChampionSnapshotForStorage(data.championSnapshot);
  if (data.championBattleSnapshot) data.championBattleSnapshot = compactRunFighterSnapshotForStorage(data.championBattleSnapshot);
  if (Array.isArray(data.currentMonsters)) data.currentMonsters = data.currentMonsters.map(compactRunMonsterForStorage).filter(Boolean);
  if (data.nodeResult && typeof data.nodeResult === "object") {
    data.nodeResult = {
      room: data.nodeResult.room ?? data.room ?? null,
      type: data.nodeResult.type || null,
      title: data.nodeResult.title || "",
      text: data.nodeResult.text || "",
      detail: data.nodeResult.detail || null,
      completed: Boolean(data.nodeResult.completed),
      defeated: Boolean(data.nodeResult.defeated),
      ended: Boolean(data.nodeResult.ended),
      completedEncounters: data.nodeResult.completedEncounters ?? null,
      finalNodeType: data.nodeResult.finalNodeType || null,
      finalNodeLabel: data.nodeResult.finalNodeLabel || null,
      championAssetId: data.nodeResult.championAssetId || null,
      currentNodeId: data.nodeResult.currentNodeId || null,
      visitedNodeIds: Array.isArray(data.nodeResult.visitedNodeIds) ? data.nodeResult.visitedNodeIds : [],
    };
  }
  return data;
}

function normalizeVerificationFighter(fighter = {}, fallbackSide = "", options = {}) {
  const includeMoves = options.includeMoves === true;
  const summary = {
    side: String(fighter?.side || fallbackSide || ""),
    role: String(fighter?.role || ""),
    assetId: fighter?.assetId ?? null,
    name: String(fighter?.name || ""),
    hp: Math.round(safeNumber(fighter?.hp, 0) * 1000) / 1000,
    maxHp: Math.round(safeNumber(fighter?.maxHp, 0) * 1000) / 1000,
    stats: normalizeVerificationNumberMap(fighter?.stats || {}),
    effectPotencies: normalizeVerificationNumberMap(fighter?.effectPotencies || {}),
    effects: normalizeVerificationNumberMap(fighter?.effects || {}),
  };

  if (includeMoves) {
    summary.moves = asArray(fighter?.moves).map(normalizeVerificationMove);
  }

  return summary;
}

function reduceBattleSnapshotForVerification(snapshot = {}, options = {}) {
  const includeMoves = options.includeMoves === true;
  const champion = snapshot?.champion || snapshot?.fighters?.A || {};
  const monsters = asArray(snapshot?.monsters).length
    ? asArray(snapshot.monsters)
    : snapshot?.monster
    ? [{ ...snapshot.monster, side: snapshot.monster.side || "B", role: snapshot.monster.role || "monster" }]
    : [];

  return {
    status: String(snapshot?.status || ""),
    winner: snapshot?.winner || null,
    round: Math.max(0, Math.round(safeNumber(snapshot?.round, 0))),
    champion: normalizeVerificationFighter(
      { ...champion, side: "A", role: champion?.role || "champion" },
      "A",
      { includeMoves }
    ),
    monsters: monsters.map((monster, index) =>
      normalizeVerificationFighter(
        {
          ...monster,
          side: monster?.side || String.fromCharCode("B".charCodeAt(0) + index),
          role: monster?.role || "monster",
        },
        String.fromCharCode("B".charCodeAt(0) + index),
        { includeMoves }
      )
    ),
  };
}

function createReplaySnapshotHash(snapshot = {}) {
  return createIntegrityHash(reduceBattleSnapshotForVerification(snapshot));
}

function getReplayFighter(snapshot = {}, side = "") {
  if (side === "A") return snapshot.champion || null;
  return asArray(snapshot.monsters).find((monster) => String(monster?.side || "") === String(side)) || null;
}

function findReplayMove(fighter = {}, moveId = "") {
  return findDepthsReplayMove(asArray(fighter?.moves), moveId);
}

function throwBattleReplayError(message) {
  const error = new Error(message);
  error.status = 400;
  throw error;
}

function validateReplayActionTarget({ action, beforeSnapshot, actionNumber, moveCatalogSnapshot = null }) {
  const actorSide = String(action?.actorSide || "");
  const targetSide = String(action?.targetSide || "");
  const moveId = String(action?.moveId || action?.moveName || "");

  if (!targetSide || !getReplayFighter(beforeSnapshot, targetSide)) {
    throwBattleReplayError(`Depths battle replay action ${actionNumber} has an invalid target.`);
  }

  if (moveId === "ongoing-effects" || actorSide === "effects") {
    if (moveId !== "ongoing-effects") {
      throwBattleReplayError(`Depths battle replay action ${actionNumber} has an invalid system action.`);
    }
    return;
  }

  const actor = getReplayFighter(beforeSnapshot, actorSide);
  if (!actor) {
    throwBattleReplayError(`Depths battle replay action ${actionNumber} has an invalid actor.`);
  }

  if (safeNumber(actor.hp, 0) <= 0) {
    throwBattleReplayError(`Depths battle replay action ${actionNumber} was made by a defeated fighter.`);
  }

  const catalogActor = moveCatalogSnapshot ? getReplayFighter(moveCatalogSnapshot, actorSide) : null;
  const move = findReplayMove(actor, moveId) || findReplayMove(catalogActor, moveId);
  if (!move) {
    throwBattleReplayError(`Depths battle replay action ${actionNumber} uses a move the actor does not have.`);
  }

  const target = getReplayFighter(beforeSnapshot, targetSide);
  const moveKind = String(action?.moveKind || move.moveKind || "").toLowerCase();
  const actorIsChampion = actorSide === "A";
  const targetIsChampion = targetSide === "A";

  if (moveKind === "buff" && actorIsChampion !== targetIsChampion) {
    throwBattleReplayError(`Depths battle replay action ${actionNumber} targets the wrong side for a buff.`);
  }

  if (moveKind !== "buff" && actorIsChampion === targetIsChampion) {
    throwBattleReplayError(`Depths battle replay action ${actionNumber} targets the wrong side for an attack.`);
  }

  if (!target || safeNumber(target.maxHp, 0) <= 0) {
    throwBattleReplayError(`Depths battle replay action ${actionNumber} has an invalid target snapshot.`);
  }
}

function replaySnapshotsEqual(left, right) {
  if (!left || !right || typeof left !== "object" || typeof right !== "object") return false;
  return (
    stableStringify(reduceBattleSnapshotForVerification(left)) ===
    stableStringify(reduceBattleSnapshotForVerification(right))
  );
}

function getLastReplayAfterSnapshot(actions = []) {
  for (let index = asArray(actions).length - 1; index >= 0; index -= 1) {
    const afterSnapshot = actions[index]?.afterSnapshot;
    if (afterSnapshot && typeof afterSnapshot === "object") return afterSnapshot;
  }
  return null;
}

function compactReplaySnapshotForStorage(snapshot = null) {
  if (!snapshot || typeof snapshot !== "object") return snapshot || null;
  return reduceBattleSnapshotForVerification(snapshot);
}

function compactBattleCooldown(cooldown = {}) {
  const compact = {};
  ["base", "progress", "remaining", "total"].forEach((key) => {
    const value = cooldown?.[key];
    if (value !== undefined && value !== null) {
      compact[key] = Math.round(safeNumber(value, 0) * 1000) / 1000;
    }
  });
  return compact;
}

function compactBattleCardEntry(card = {}) {
  if (!card || typeof card !== "object") return null;
  const cardId = String(card?.cardId || "");
  const moveId = String(card?.moveId || card?.id || "");
  if (!cardId && !moveId) return null;
  return {
    cardId,
    moveId,
    moveName: String(card?.moveName || card?.name || ""),
  };
}

function compactBattleChampionCardState(cardState = null) {
  if (!cardState || typeof cardState !== "object") return null;
  return {
    signature: String(cardState.signature || ""),
    drawPile: asArray(cardState.drawPile).map(compactBattleCardEntry).filter(Boolean),
    hand: asArray(cardState.hand).map(compactBattleCardEntry).filter(Boolean),
    discardPile: asArray(cardState.discardPile).map(compactBattleCardEntry).filter(Boolean),
  };
}

function getBattleSnapshotFighterSource(snapshot = {}, side = "A", index = 0) {
  if (side === "A") return snapshot?.champion || snapshot?.fighters?.A || {};
  const monsters = asArray(snapshot?.monsters);
  return (
    monsters.find((monster) => String(monster?.side || "") === String(side)) ||
    monsters[index] ||
    snapshot?.fighters?.[side] ||
    (side === "B" ? snapshot?.monster : null) ||
    {}
  );
}

function compactBattleFighterSnapshotForStorage(fighter = {}, fallbackSide = "", options = {}) {
  if (!fighter || typeof fighter !== "object") return null;
  const summary = normalizeVerificationFighter(fighter, fallbackSide, options);
  const idleFrame =
    String(fighter?.idleFrame || "") ||
    asArray(fighter?.idleFrames).find((frame) => typeof frame === "string" && frame.trim()) ||
    String(fighter?.standingUrl || fighter?.imageUrl || "");

  const compact = {
    ...summary,
    cooldown: compactBattleCooldown(fighter?.cooldown || {}),
    idleFrame,
    standingUrl: String(fighter?.standingUrl || ""),
    imageUrl: String(fighter?.imageUrl || fighter?.standingUrl || idleFrame || ""),
  };

  if (fallbackSide !== "A") {
    compact.visualScale = Math.round(safeNumber(fighter?.visualScale, 1) * 1000) / 1000;
    if (fighter?.depthsScaling || fighter?._depthsScaling) compact.depthsScaling = fighter.depthsScaling || fighter._depthsScaling;
  }

  Object.keys(compact).forEach((key) => {
    const value = compact[key];
    if (key === "effects") return;
    if (
      value === null ||
      value === undefined ||
      value === "" ||
      (typeof value === "object" && !Array.isArray(value) && !Object.keys(value).length)
    ) {
      delete compact[key];
    }
  });
  return compact;
}

function compactBattleAnimationForStorage(animation = null) {
  if (!animation || typeof animation !== "object") return null;
  return {
    id: String(animation.id || ""),
    actorSide: String(animation.actorSide || ""),
    targetSide: String(animation.targetSide || ""),
    targetSides: asArray(animation.targetSides).map((side) => String(side || "")).filter(Boolean),
    move: animation.move ? normalizeVerificationMove(animation.move) : null,
    moveKind: String(animation.moveKind || ""),
    timings: animation.timings || null,
    startedAt: animation.startedAt || null,
    durationMs: animation.durationMs || null,
  };
}

function compactBattleKillingBlowForStorage(killingBlow = null) {
  if (!killingBlow || typeof killingBlow !== "object") return null;
  return {
    actorSide: String(killingBlow.actorSide || ""),
    targetSide: String(killingBlow.targetSide || ""),
    actorName: String(killingBlow.actorName || ""),
    targetName: String(killingBlow.targetName || ""),
    actorRole: String(killingBlow.actorRole || ""),
    targetRole: String(killingBlow.targetRole || ""),
    moveId: String(killingBlow.moveId || ""),
    moveName: String(killingBlow.moveName || killingBlow.cardName || ""),
    moveType: String(killingBlow.moveType || ""),
    moveKind: String(killingBlow.moveKind || ""),
    isDepthsCard: Boolean(killingBlow.isDepthsCard),
    cardFrame: String(killingBlow.cardFrame || killingBlow.moveFrame || ""),
    damage: Math.max(0, Math.round(safeNumber(killingBlow.damage, 0))),
    critical: Boolean(killingBlow.critical),
    room: killingBlow.room ?? null,
    recordedAt: killingBlow.recordedAt || null,
  };
}

function compactBattleSnapshotForStorage(snapshot = null, options = {}) {
  if (!snapshot || typeof snapshot !== "object") return null;
  const includeMoves = options.includeMoves === true;
  const monsterSources = asArray(snapshot?.monsters).length
    ? asArray(snapshot.monsters)
    : snapshot?.monster
    ? [{ ...snapshot.monster, side: snapshot.monster.side || "B" }]
    : [];
  const championSource = getBattleSnapshotFighterSource(snapshot, "A");
  const monsters = monsterSources
    .map((monster, index) =>
      compactBattleFighterSnapshotForStorage(
        {
          ...monster,
          side: monster?.side || String.fromCharCode("B".charCodeAt(0) + index),
          role: monster?.role || "monster",
        },
        String.fromCharCode("B".charCodeAt(0) + index),
        { includeMoves }
      )
    )
    .filter(Boolean);

  const compact = {
    battleId: snapshot.battleId || null,
    runId: snapshot.runId || null,
    room: snapshot.room ?? null,
    currentNodeId: String(snapshot.currentNodeId || ""),
    currentNodeType: String(snapshot.currentNodeType || ""),
    backgroundImageUrl: String(snapshot.backgroundImageUrl || ""),
    status: String(snapshot.status || ""),
    phase: String(snapshot.phase || ""),
    activeSide: snapshot.activeSide || null,
    winner: snapshot.winner || null,
    round: Math.max(0, Math.round(safeNumber(snapshot.round, 0))),
    animation: compactBattleAnimationForStorage(snapshot.animation),
    champion: compactBattleFighterSnapshotForStorage(
      { ...championSource, side: "A", role: championSource?.role || "champion" },
      "A",
      { includeMoves }
    ),
    championCards: compactBattleChampionCardState(snapshot.championCards),
    monsters,
    killingBlow: compactBattleKillingBlowForStorage(snapshot.killingBlow),
  };

  Object.keys(compact).forEach((key) => {
    const value = compact[key];
    if (
      value === null ||
      value === undefined ||
      value === "" ||
      (Array.isArray(value) && !value.length) ||
      (typeof value === "object" && !Array.isArray(value) && !Object.keys(value).length)
    ) {
      delete compact[key];
    }
  });
  return compact;
}

function normalizeReplayActionIndexes(actions = [], startIndex = 0) {
  return asArray(actions).map((action, index) => ({
    index: startIndex + index,
    actorSide: String(action?.actorSide || ""),
    targetSide: String(action?.targetSide || ""),
    actorRole: String(action?.actorRole || ""),
    targetRole: String(action?.targetRole || ""),
    moveId: String(action?.moveId || ""),
    moveName: String(action?.moveName || ""),
    moveType: String(action?.moveType || ""),
    moveKind: String(action?.moveKind || ""),
    targetMode: String(action?.targetMode || ""),
    room: action?.room ?? null,
    recordedAt: action?.recordedAt || null,
    beforeSnapshot: compactReplaySnapshotForStorage(action?.beforeSnapshot),
    afterSnapshot: compactReplaySnapshotForStorage(action?.afterSnapshot),
    afterRecordedAt: action?.afterRecordedAt || null,
  }));
}

function mergeBattleActionLog(existingBattle = {}, incomingLog = []) {
  const existingActions = asArray(existingBattle.actionLog);
  const incomingActions = asArray(incomingLog);

  if (!incomingActions.length) return existingActions;
  if (!existingActions.length) return normalizeReplayActionIndexes(incomingActions, 0);

  const incomingFirstBefore = incomingActions[0]?.beforeSnapshot;
  if (
    incomingFirstBefore &&
    existingBattle.serverInitialSnapshot &&
    replaySnapshotsEqual(incomingFirstBefore, existingBattle.serverInitialSnapshot)
  ) {
    return normalizeReplayActionIndexes(incomingActions, 0);
  }

  const existingTailSnapshot =
    getLastReplayAfterSnapshot(existingActions) || existingBattle.snapshot || null;
  if (incomingFirstBefore && existingTailSnapshot && replaySnapshotsEqual(incomingFirstBefore, existingTailSnapshot)) {
    return [
      ...normalizeReplayActionIndexes(existingActions, 0),
      ...normalizeReplayActionIndexes(incomingActions, existingActions.length),
    ];
  }

  const incomingFirstIndex = Number(incomingActions[0]?.index);
  if (
    Number.isSafeInteger(incomingFirstIndex) &&
    incomingFirstIndex > 0 &&
    incomingFirstIndex <= existingActions.length
  ) {
    return [
      ...normalizeReplayActionIndexes(existingActions.slice(0, incomingFirstIndex), 0),
      ...normalizeReplayActionIndexes(incomingActions, incomingFirstIndex),
    ];
  }

  return normalizeReplayActionIndexes(incomingActions, 0);
}

function validateBattleActionReplay({ battleId, existingBattle, actionLog = [], finalSnapshot = {}, computedWinner }) {
  const rawActions = asArray(actionLog);
  const initialSnapshot = existingBattle.serverInitialSnapshot || null;
  const hasServerInitialSnapshot = initialSnapshot && typeof initialSnapshot === "object";
  let replayStartIndex = 0;

  const firstReplayableIndex = rawActions.findIndex(
    (action) => action?.beforeSnapshot && typeof action.beforeSnapshot === "object" && action?.afterSnapshot && typeof action.afterSnapshot === "object"
  );

  if (rawActions.length && firstReplayableIndex < 0) {
    throwBattleReplayError("Depths battle replay action log does not contain replayable snapshots.");
  }

  if (hasServerInitialSnapshot) {
    const expectedInitialHash = createIntegrityHash({
      runId: existingBattle.runId,
      room: existingBattle.room || null,
      championAssetId: existingBattle.championAssetId || null,
      monsterIds: existingBattle.monsterIds || [],
      monsterNames: existingBattle.monsterNames || [],
      snapshot: initialSnapshot,
    });

    if (existingBattle.serverInitialIntegrityHash && existingBattle.serverInitialIntegrityHash !== expectedInitialHash) {
      throwBattleReplayError("Depths battle initial snapshot no longer matches the server integrity hash.");
    }

    if (firstReplayableIndex > 0) {
      replayStartIndex = firstReplayableIndex;
    }
  } else {
    replayStartIndex = firstReplayableIndex;
    if (replayStartIndex < 0) {
      throwBattleReplayError("Depths battle was created before server replay tracking was enabled. Start a new battle.");
    }
  }

  const actions = rawActions.slice(replayStartIndex);
  const moveCatalogSnapshot = initialSnapshot || finalSnapshot || {};
  let previousReduced = hasServerInitialSnapshot && replayStartIndex === 0
    ? reduceBattleSnapshotForVerification(initialSnapshot)
    : reduceBattleSnapshotForVerification(actions[0]?.beforeSnapshot || {});
  const replayActions = [];

  actions.forEach((action, index) => {
    const originalIndex = replayStartIndex + index;
    const actionNumber = originalIndex + 1;
    const beforeSnapshot = action?.beforeSnapshot;
    const afterSnapshot = action?.afterSnapshot;
    if (!beforeSnapshot || typeof beforeSnapshot !== "object" || !afterSnapshot || typeof afterSnapshot !== "object") {
      throwBattleReplayError(`Depths battle replay action ${actionNumber} is missing before/after snapshots.`);
    }

    const actionIndex = Number(action?.index);
    if (Number.isSafeInteger(actionIndex) && actionIndex !== originalIndex) {
      throwBattleReplayError(`Depths battle replay action ${actionNumber} is out of order.`);
    }

    const beforeReduced = reduceBattleSnapshotForVerification(beforeSnapshot);
    const afterReduced = reduceBattleSnapshotForVerification(afterSnapshot);

    if (stableStringify(beforeReduced) !== stableStringify(previousReduced)) {
      throwBattleReplayError(`Depths battle replay action ${actionNumber} does not continue from the prior state.`);
    }

    validateReplayActionTarget({
      action,
      beforeSnapshot: beforeReduced,
      actionNumber,
      moveCatalogSnapshot,
    });
    previousReduced = afterReduced;
    replayActions.push({
      index: originalIndex,
      actorSide: String(action?.actorSide || ""),
      targetSide: String(action?.targetSide || ""),
      moveId: String(action?.moveId || ""),
      moveKind: String(action?.moveKind || ""),
      beforeHash: createIntegrityHash(beforeReduced),
      afterHash: createIntegrityHash(afterReduced),
    });
  });

  const finalReduced = reduceBattleSnapshotForVerification(finalSnapshot);
  if (actions.length && stableStringify(previousReduced) !== stableStringify(finalReduced)) {
    throwBattleReplayError("Depths battle final snapshot does not match the replayed action chain.");
  }

  if (computedWinner === "champion" && actions.length <= 0) {
    throwBattleReplayError("Champion victories must include a replayable Depths battle action log.");
  }

  return {
    actionLog: actions,
    finalReduced,
    replayStartIndex,
    legacyReplayStart: !hasServerInitialSnapshot || replayStartIndex > 0,
    actionChainHash: createIntegrityHash({
      battleId,
      initialHash: hasServerInitialSnapshot && replayStartIndex === 0
        ? createReplaySnapshotHash(initialSnapshot)
        : createIntegrityHash(reduceBattleSnapshotForVerification(actions[0]?.beforeSnapshot || {})),
      finalHash: createIntegrityHash(finalReduced),
      actions: replayActions,
    }),
  };
}

function buildBattleVerificationFields({ battleId, existingBattle, data }) {
  if (data.status !== "complete") return {};

  const snapshot = data.snapshot || existingBattle.snapshot || null;
  if (!snapshot || typeof snapshot !== "object") {
    const error = new Error("Completed Depths battles must include a replay snapshot.");
    error.status = 400;
    throw error;
  }

  const requestedWinner = String(data.winner || snapshot.winner || "");
  const computedWinner = getBattleSnapshotWinner(snapshot);
  if (!computedWinner || requestedWinner !== computedWinner) {
    const error = new Error("Depths battle winner does not match the final replay snapshot.");
    error.status = 400;
    throw error;
  }

  const championAssetId = normalizeAssetId(data.championAssetId || existingBattle.championAssetId);
  const snapshotChampionAssetId = normalizeAssetId(snapshot?.champion?.assetId);
  if (championAssetId && snapshotChampionAssetId && championAssetId !== snapshotChampionAssetId) {
    const error = new Error("Depths battle champion snapshot does not match the battle record.");
    error.status = 400;
    throw error;
  }

  const replay = validateBattleActionReplay({
    battleId,
    existingBattle,
    actionLog: data.actionLog || existingBattle.actionLog || [],
    finalSnapshot: snapshot,
    computedWinner,
  });

  const serverBattleVerifiedHash = createIntegrityHash({
    battleId,
    runId: existingBattle.runId,
    room: existingBattle.room,
    championAssetId,
    winner: computedWinner,
    finalSnapshot: replay.finalReduced,
    actionChainHash: replay.actionChainHash,
    serverInitialIntegrityHash: existingBattle.serverInitialIntegrityHash || "",
  });

  const monsterHpTotal = asArray(snapshot?.monsters).reduce(
    (total, monster) => total + Math.max(0, safeNumber(monster?.hp, 0)),
    0
  );

  return {
    serverBattleVerified: true,
    serverBattleVerifiedAt: serverTimestamp(),
    serverBattleVerifiedHash,
    serverBattleActionChainHash: replay.actionChainHash,
    serverBattleReplayVersion: 1,
    serverVerifiedWinner: computedWinner,
    serverVerifiedChampionHp: safeNumber(snapshot?.champion?.hp, 0),
    serverVerifiedMonsterHp: monsterHpTotal,
  };
}

function compactBattleRunArtifact(artifact = {}) {
  return {
    id: String(artifact?.id || ""),
    name: String(artifact?.name || ""),
    rarity: String(artifact?.rarity || ""),
    imageUrl: String(artifact?.imageUrl || artifact?.iconUrl || ""),
    statBonuses: artifact?.statBonuses || {},
    artifactMeta: artifact?.artifactMeta || {},
    battleOnly: asArray(artifact?.battleOnly).map((entry) => ({
      type: String(entry?.type || ""),
      attackType: String(entry?.attackType || ""),
      effectKey: String(entry?.effectKey || ""),
      sourceEffectKey: String(entry?.sourceEffectKey || ""),
      amount: safeNumber(entry?.amount, 0),
      trigger: String(entry?.trigger || ""),
    })),
  };
}

function compactBattleRunCard(card = {}) {
  const move = card?.move || card || {};
  return {
    id: String(card?.id || move?.id || ""),
    cardId: String(card?.cardId || move?.cardId || move?.depthsCardId || ""),
    name: String(card?.name || move?.name || ""),
    rarity: String(card?.rarity || move?.rarity || ""),
    deckCopies: safeNumber(card?.deckCopies ?? move?.deckCopies, 1),
    move: normalizeVerificationMove(move),
  };
}

function compactBattleRunUpgrade(upgrade = {}) {
  return {
    id: String(upgrade?.id || ""),
    upgradeId: String(upgrade?.upgradeId || upgrade?.id || ""),
    name: String(upgrade?.name || ""),
    moveIndex: Number.isSafeInteger(Number(upgrade?.moveIndex)) ? Number(upgrade.moveIndex) : null,
    moveKey: String(upgrade?.moveKey || ""),
    moveFamilyKey: String(upgrade?.moveFamilyKey || ""),
    room: upgrade?.room ?? null,
    powerDelta: safeNumber(upgrade?.powerDelta, 0),
    powerMultiplier: upgrade?.powerMultiplier || null,
    accuracyDelta: safeNumber(upgrade?.accuracyDelta, 0),
    cooldownDelta: safeNumber(upgrade?.cooldownDelta, 0),
    effectPotencyBonus: safeNumber(upgrade?.effectPotencyBonus, 0),
    effectPotencyMultiplier: upgrade?.effectPotencyMultiplier || null,
    repeatCount: upgrade?.repeatCount || null,
    multiTarget: Boolean(upgrade?.multiTarget),
    critChanceBonus: safeNumber(upgrade?.critChanceBonus, 0),
    secondaryEffects: asArray(upgrade?.secondaryEffects).map((effect) => ({
      target: String(effect?.target || ""),
      effectKey: String(effect?.effectKey || ""),
      amount: safeNumber(effect?.amount, 0),
      trigger: String(effect?.trigger || ""),
    })),
  };
}

function buildBattleRootCompactionFields(data = {}) {
  const snapshot = data.snapshot && typeof data.snapshot === "object" ? data.snapshot : null;
  if (!snapshot) return {};

  const fields = {};
  if (snapshot.champion) {
    fields.championRunSnapshot = normalizeVerificationFighter(snapshot.champion, "A", { includeMoves: true });
  }

  return fields;
}

function getBattleCurrentNodeId(battle = {}) {
  return String(
    battle.currentNodeId ||
      battle.snapshot?.currentNodeId ||
      battle.resolvedSnapshot?.currentNodeId ||
      battle.resumeSnapshot?.currentNodeId ||
      ""
  );
}

function getBattleRoomNumber(battle = {}) {
  const room = Number(battle.room || battle.snapshot?.room || battle.resolvedSnapshot?.room || battle.resumeSnapshot?.room || 0);
  return Number.isFinite(room) ? room : 0;
}

async function requireServerVerifiedBattleForRunUpdate({ runId, updates = {}, existingRun = null }) {
  const nextStatus = String(updates.status || "");
  if (!["roomCleared", "completed", "defeated"].includes(nextStatus)) return;

  const battleId = String(updates.lastBattleId || "").trim();
  if (!battleId) {
    const error = new Error("Depths run progress requires a server-verified battle id.");
    error.status = 400;
    throw error;
  }

  const battleSnap = await db.collection(BATTLE_COLLECTION).doc(battleId).get();
  if (!battleSnap.exists) {
    const error = new Error("Depths battle was not found for run progress verification.");
    error.status = 404;
    throw error;
  }

  const battle = battleSnap.data() || {};
  if (String(battle.runId || "") !== String(runId)) {
    const error = new Error("Depths battle does not belong to this run.");
    error.status = 400;
    throw error;
  }

  if (battle.serverBattleVerified !== true) {
    const error = new Error("Depths battle has not been server verified yet.");
    error.status = 409;
    throw error;
  }

  const winner = String(battle.serverVerifiedWinner || battle.winner || "");
  if ((nextStatus === "roomCleared" || nextStatus === "completed") && winner !== "champion") {
    const error = new Error("Only champion victories can advance or complete The Depths.");
    error.status = 400;
    throw error;
  }

  if (nextStatus === "defeated" && winner === "champion") {
    const error = new Error("A champion victory cannot mark The Depths run as defeated.");
    error.status = 400;
    throw error;
  }

  const expectedNodeId = String(updates.currentNodeId || existingRun?.currentNodeId || "");
  const battleNodeId = getBattleCurrentNodeId(battle);
  if (expectedNodeId && battleNodeId && battleNodeId !== expectedNodeId) {
    const error = new Error("Depths verified battle does not match the current encounter.");
    error.status = 409;
    throw error;
  }

  return battle;
}

function getRunArrayLength(run = {}, key) {
  return Array.isArray(run?.[key]) ? run[key].length : 0;
}

function validateNonDecreasingArray(existingRun = {}, updates = {}, key, label = key) {
  if (!Array.isArray(updates[key])) return;
  const currentLength = getRunArrayLength(existingRun, key);
  if (updates[key].length < currentLength) {
    const error = new Error(`Depths run cannot rewind ${label}.`);
    error.status = 409;
    throw error;
  }
}

function validateVisitedNodesProgress(existingRun = {}, updates = {}) {
  if (!Array.isArray(updates.visitedNodeIds)) return;
  const currentVisited = new Set(Array.isArray(existingRun.visitedNodeIds) ? existingRun.visitedNodeIds : []);
  const nextVisited = new Set(updates.visitedNodeIds);

  for (const nodeId of currentVisited) {
    if (!nextVisited.has(nodeId)) {
      const error = new Error("Depths map progress cannot rewind visited nodes.");
      error.status = 409;
      throw error;
    }
  }
}

function getDepthsMapNode(map = {}, nodeId = "") {
  return (Array.isArray(map.nodes) ? map.nodes : []).find((node) => String(node?.id || "") === String(nodeId || "")) || null;
}

function validateMapNodeProgress(existingRun = {}, updates = {}) {
  const nextNodeId = String(updates.currentNodeId || "");
  if (!nextNodeId) return;

  const currentNodeId = String(existingRun.currentNodeId || "");
  if (!currentNodeId || nextNodeId === currentNodeId) return;

  const map = updates.depthsMap || existingRun.depthsMap || {};
  const currentNode = getDepthsMapNode(map, currentNodeId);
  const nextVisited = new Set(Array.isArray(updates.visitedNodeIds) ? updates.visitedNodeIds : existingRun.visitedNodeIds || []);
  const existingVisited = new Set(Array.isArray(existingRun.visitedNodeIds) ? existingRun.visitedNodeIds : []);

  if (existingVisited.has(nextNodeId)) {
    const error = new Error("Depths map current node cannot rewind to an already visited node.");
    error.status = 409;
    throw error;
  }

  if (currentNode && Array.isArray(currentNode.links) && !currentNode.links.includes(nextNodeId)) {
    const error = new Error("Depths map current node can only move to a connected node.");
    error.status = 409;
    throw error;
  }

  if (!nextVisited.has(nextNodeId)) {
    const error = new Error("Depths map current node must be included in visited nodes.");
    error.status = 409;
    throw error;
  }
}

function validateRunUpdateProgression(existingRun = {}, updates = {}) {
  const existingStatus = String(existingRun.status || "");
  const nextStatus = String(updates.status || existingStatus || "");

  if (ENDED_RUN_STATUSES.has(existingStatus) && nextStatus !== existingStatus) {
    const error = new Error("Ended Depths runs cannot be resumed or rewound.");
    error.status = 409;
    throw error;
  }

  if (
    existingStatus === "active" &&
    nextStatus &&
    !["active", "roomCleared", "defeated", "completed", "abandoned"].includes(nextStatus)
  ) {
    const error = new Error("Active Depths battles must resolve before the run can change screens.");
    error.status = 409;
    throw error;
  }

  const currentRoom = Number(existingRun.room || 1);
  const nextRoom = Number(updates.room || currentRoom);
  if (Number.isFinite(currentRoom) && Number.isFinite(nextRoom) && nextRoom < currentRoom) {
    const error = new Error("Depths encounter number cannot rewind.");
    error.status = 409;
    throw error;
  }

  validateNonDecreasingArray(existingRun, updates, "artifacts", "artifacts");
  validateNonDecreasingArray(existingRun, updates, "cards", "cards");
  validateNonDecreasingArray(existingRun, updates, "cardUpgrades", "card upgrades");
  validateNonDecreasingArray(existingRun, updates, "cardRemovals", "card removals");
  validateVisitedNodesProgress(existingRun, updates);
  validateMapNodeProgress(existingRun, updates);
}

function mergeProgressArray(existing = [], incoming = []) {
  const out = [];
  const seen = new Set();
  [...(Array.isArray(existing) ? existing : []), ...(Array.isArray(incoming) ? incoming : [])].forEach((value) => {
    const key = String(value || "");
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(value);
  });
  return out;
}

function reconcileTerminalRunUpdateWithServerProgress(existingRun = {}, updates = {}) {
  const nextStatus = String(updates.status || "");
  if (!TERMINAL_RUN_UPDATE_STATUSES.has(nextStatus)) return updates;

  const data = { ...(updates || {}) };
  const currentRoom = Number(existingRun.room || 1);
  const nextRoom = Number(data.room || currentRoom);
  if (Number.isFinite(currentRoom) && Number.isFinite(nextRoom) && nextRoom < currentRoom) {
    data.room = currentRoom;
  }

  if (Array.isArray(data.visitedNodeIds)) {
    data.visitedNodeIds = mergeProgressArray(existingRun.visitedNodeIds, data.visitedNodeIds);
  }

  const currentNodeId = String(existingRun.currentNodeId || "");
  const nextNodeId = String(data.currentNodeId || "");
  if (currentNodeId && (!nextNodeId || nextNodeId !== currentNodeId)) {
    data.currentNodeId = currentNodeId;
  }

  return data;
}

function getDarkCoinAssetId() {
  return normalizeAssetId(process.env.DARK_COIN_ASSET_ID || process.env.NEXT_PUBLIC_DARK_COIN_ASSET_ID) || DARK_COIN_ASSET_ID;
}

function getDarkCoinDecimals() {
  const decimals = Number(process.env.DARK_COIN_DECIMALS || process.env.NEXT_PUBLIC_DARK_COIN_DECIMALS);
  return Number.isInteger(decimals) && decimals >= 0 ? decimals : DARK_COIN_DECIMALS;
}

function getDepthsEntryBaseAmountAtomic() {
  const displayAmount = Number(process.env.DEPTHS_ENTRY_BASE_DARK_COIN || DEPTHS_ENTRY_BASE_DARK_COIN);
  const decimals = getDarkCoinDecimals();
  const amountAtomic = Math.round(displayAmount * 10 ** decimals);
  if (!Number.isSafeInteger(amountAtomic) || amountAtomic <= 0) {
    const error = new Error("Server misconfigured: Depths entry Dark Coin amount is invalid.");
    error.status = 500;
    throw error;
  }
  return amountAtomic;
}

function getDepthsEntryRunNumber(entryCount = 0) {
  const count = Math.max(0, Math.floor(Number(entryCount || 0)));
  return count + 1;
}

function getDepthsAppId() {
  return normalizeAssetId(process.env.DEPTHS_APP_ID || process.env.NEXT_PUBLIC_DEPTHS_APP_ID) || DEPTHS_APP_ID;
}

function getApplicationAddressString(appId) {
  return String(algosdk.getApplicationAddress(appId));
}

function getDepthsEntryPaymentReceiver() {
  const appId = getDepthsAppId();
  if (!appId) {
    const error = new Error("Server misconfigured: DEPTHS_APP_ID is required for paid Depths runs.");
    error.status = 500;
    throw error;
  }

  return getApplicationAddressString(appId);
}

function getDepthsDailyKey(date = new Date()) {
  const timeZone = process.env.DEPTHS_FREE_RUN_TIME_ZONE || "America/Los_Angeles";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function getEntryProofMaxAgeMs() {
  const configured = Number(process.env.DEPTHS_ENTRY_PROOF_MAX_AGE_MS || 0);
  return Number.isFinite(configured) && configured > 0 ? configured : ENTRY_PROOF_MAX_AGE_MS;
}

function getDepthsEntryProofKind() {
  return "darkcoin-depths-entry-proof";
}

function getDepthsResumeProofKind() {
  return "darkcoin-depths-resume-proof";
}

function hashEntryWalletProof(bytes) {
  return crypto.createHash("sha256").update(Buffer.from(bytes)).digest("hex");
}

function decodeProofNote(noteBytes) {
  try {
    const text = Buffer.from(noteBytes || new Uint8Array()).toString("utf8");
    return JSON.parse(text || "{}");
  } catch (_error) {
    return null;
  }
}

function rejectInvalidEntryProof(message = "Depths entry wallet proof is invalid.") {
  const error = new Error(message);
  error.status = 403;
  throw error;
}

function rejectInvalidResumeProof(message = "Depths resume wallet proof is invalid.") {
  const error = new Error(message);
  error.status = 403;
  throw error;
}

async function verifyDepthsEntryWalletProof({ walletProof, walletAddress, championAssetId, dailyKey }) {
  const signedTxnBase64 = String(
    walletProof?.signedTxn ||
      walletProof?.signedTransaction ||
      walletProof?.signedTransactionBase64 ||
      ""
  ).trim();

  if (!signedTxnBase64) {
    rejectInvalidEntryProof("Sign the Depths entry proof with the connected wallet before starting a free run.");
  }

  let signedTxnBytes;
  let signedTxn;

  try {
    signedTxnBytes = new Uint8Array(Buffer.from(signedTxnBase64, "base64"));
    signedTxn = algosdk.decodeSignedTransaction(signedTxnBytes);
  } catch (_error) {
    rejectInvalidEntryProof();
  }

  const txn = signedTxn?.txn;
  if (!txn || !signedTxn?.sig || signedTxn?.msig || signedTxn?.lsig) {
    rejectInvalidEntryProof();
  }

  const sender = String(txn.sender || "").trim();
  const receiver = String(txn.payment?.receiver || "").trim();
  const amount = BigInt(txn.payment?.amount || 0);

  if (txn.type !== "pay" || !txn.payment) {
    rejectInvalidEntryProof("Depths entry proof must be a signed 0 ALGO self-payment.");
  }

  if (sender !== walletAddress || receiver !== walletAddress || amount !== 0n) {
    rejectInvalidEntryProof("Depths entry proof wallet does not match the connected wallet.");
  }

  if (txn.payment.closeRemainderTo || txn.rekeyTo) {
    rejectInvalidEntryProof();
  }

  const signerAddress = await verifySignedProofSignature({
    txn,
    signedTxn,
    walletAddress,
    reject: rejectInvalidEntryProof,
  });

  const proofNote = decodeProofNote(txn.note);
  const issuedAt = Number(proofNote?.issuedAt || 0);
  const now = Date.now();
  const maxAge = getEntryProofMaxAgeMs();

  if (proofNote?.kind !== getDepthsEntryProofKind()) {
    rejectInvalidEntryProof();
  }
  if (String(proofNote.walletAddress || "") !== walletAddress) {
    rejectInvalidEntryProof();
  }
  if (normalizeAssetId(proofNote.championAssetId) !== championAssetId) {
    rejectInvalidEntryProof("Depths entry proof was signed for a different champion.");
  }
  if (String(proofNote.dailyKey || "") !== dailyKey) {
    rejectInvalidEntryProof("Depths entry proof was signed for a different daily run window.");
  }
  if (!Number.isFinite(issuedAt) || issuedAt <= 0 || Math.abs(now - issuedAt) > maxAge) {
    rejectInvalidEntryProof("Depths entry proof expired. Try entering The Depths again.");
  }

  return {
    proofHash: hashEntryWalletProof(signedTxnBytes),
    proofType: "signed_self_payment",
    signerAddress,
    issuedAt,
  };
}

async function verifyDepthsResumeWalletProof({ walletProof, walletAddress, championAssetId }) {
  const signedTxnBase64 = String(
    walletProof?.signedTxn ||
      walletProof?.signedTransaction ||
      walletProof?.signedTransactionBase64 ||
      ""
  ).trim();

  if (!signedTxnBase64) {
    rejectInvalidResumeProof("Sign the Depths resume proof with the connected wallet before resuming this run.");
  }

  let signedTxnBytes;
  let signedTxn;

  try {
    signedTxnBytes = new Uint8Array(Buffer.from(signedTxnBase64, "base64"));
    signedTxn = algosdk.decodeSignedTransaction(signedTxnBytes);
  } catch (_error) {
    rejectInvalidResumeProof();
  }

  const txn = signedTxn?.txn;
  if (!txn || !signedTxn?.sig || signedTxn?.msig || signedTxn?.lsig) {
    rejectInvalidResumeProof();
  }

  const sender = String(txn.sender || "").trim();
  const receiver = String(txn.payment?.receiver || "").trim();
  const amount = BigInt(txn.payment?.amount || 0);

  if (txn.type !== "pay" || !txn.payment) {
    rejectInvalidResumeProof("Depths resume proof must be a signed 0 ALGO self-payment.");
  }

  if (sender !== walletAddress || receiver !== walletAddress || amount !== 0n) {
    rejectInvalidResumeProof("Depths resume proof wallet does not match the connected wallet.");
  }

  if (txn.payment.closeRemainderTo || txn.rekeyTo) {
    rejectInvalidResumeProof();
  }

  const signerAddress = await verifySignedProofSignature({
    txn,
    signedTxn,
    walletAddress,
    reject: rejectInvalidResumeProof,
  });

  const proofNote = decodeProofNote(txn.note);
  const issuedAt = Number(proofNote?.issuedAt || 0);
  const now = Date.now();
  const maxAge = getEntryProofMaxAgeMs();

  if (proofNote?.kind !== getDepthsResumeProofKind()) {
    rejectInvalidResumeProof();
  }
  if (String(proofNote.walletAddress || "") !== walletAddress) {
    rejectInvalidResumeProof();
  }
  if (normalizeAssetId(proofNote.championAssetId) !== championAssetId) {
    rejectInvalidResumeProof("Depths resume proof was signed for a different champion.");
  }
  if (!Number.isFinite(issuedAt) || issuedAt <= 0 || Math.abs(now - issuedAt) > maxAge) {
    rejectInvalidResumeProof("Depths resume proof expired. Try resuming The Depths again.");
  }

  return {
    proofHash: hashEntryWalletProof(signedTxnBytes),
    proofType: "signed_self_payment",
    signerAddress,
    issuedAt,
  };
}

function getEntryPaymentPayload({ championAssetId = 0, entryCount = 0 } = {}) {
  const baseAmountAtomic = getDepthsEntryBaseAmountAtomic();
  const decimals = getDarkCoinDecimals();
  const runNumber = getDepthsEntryRunNumber(entryCount);
  const amountAtomic = baseAmountAtomic * runNumber;
  const appId = getDepthsAppId();
  const dailyKey = getDepthsDailyKey();
  if (!Number.isSafeInteger(amountAtomic) || amountAtomic <= 0) {
    const error = new Error("Server misconfigured: Depths entry payment amount is too large.");
    error.status = 500;
    throw error;
  }
  const amountDisplay = String(amountAtomic / 10 ** decimals);
  const baseAmountDisplay = String(baseAmountAtomic / 10 ** decimals);
  return {
    championAssetId: normalizeAssetId(championAssetId) || null,
    assetId: getDarkCoinAssetId(),
    appId,
    amountAtomic,
    amountDisplay,
    baseAmountAtomic,
    baseAmountDisplay,
    decimals,
    receiver: getDepthsEntryPaymentReceiver(),
    runNumber,
    entryCount,
    runsToday: entryCount,
    dailyKey,
  };
}

function validateAddress(address, fieldName) {
  const normalized = String(address || "").trim();
  if (!normalized || !algosdk.isValidAddress(normalized)) {
    const error = new Error(`${fieldName} is not a valid Algorand address.`);
    error.status = 400;
    throw error;
  }
  return normalized;
}

function normalizeAddressString(addressLike) {
  const value = String(addressLike || "").trim();
  return algosdk.isValidAddress(value) ? value : "";
}

async function getAuthorizedSignerAddress(walletAddress) {
  const indexer = new algosdk.Indexer("", INDEXER_BASE, 443);
  const accountInfo = await indexer.lookupAccountByID(walletAddress).do();
  const account = accountInfo?.account || {};
  const authAddress = normalizeAddressString(account.authAddr || account["auth-addr"]);
  return authAddress || walletAddress;
}

async function verifySignedProofSignature({ txn, signedTxn, walletAddress, reject }) {
  const expectedSignerAddress = await getAuthorizedSignerAddress(walletAddress);
  const signerAddress = normalizeAddressString(signedTxn?.sgnr) || walletAddress;

  if (signerAddress !== expectedSignerAddress) {
    reject("Depths proof was not signed by the wallet's current authorized signer.");
  }

  const publicKey = algosdk.decodeAddress(signerAddress).publicKey;
  const signatureValid = nacl.sign.detached.verify(txn.bytesToSign(), signedTxn.sig, publicKey);
  if (!signatureValid) {
    reject("Depths proof signature does not match the connected wallet.");
  }

  return signerAddress;
}

function getTransactionFromIndexerResponse(response = {}) {
  return response.transaction || response;
}

function getTransactionSender(txn = {}) {
  return String(txn.sender || txn.senderAddress || "").trim();
}

function getAssetTransfer(txn = {}) {
  return txn["asset-transfer-transaction"] || txn.assetTransferTransaction || txn.assetTransfer || {};
}

function getConfirmedRound(txn = {}) {
  return Number(txn["confirmed-round"] || txn.confirmedRound || 0);
}

async function walletHoldsChampion(walletAddress, championAssetId) {
  const indexer = new algosdk.Indexer("", INDEXER_BASE, 443);
  const holdings = await indexer
    .lookupAccountAssets(walletAddress)
    .assetId(championAssetId)
    .limit(1)
    .do()
    .catch(() => null);
  const holding =
    holdings?.assetHolding ||
    holdings?.["asset-holding"] ||
    (Array.isArray(holdings?.assets) ? holdings.assets[0] : null);
  const amount = BigInt(holding?.amount || 0);
  if (amount <= 0n) return false;

  const assetInfo = await indexer.lookupAssetByID(championAssetId).do();
  const creator = assetInfo?.asset?.params?.creator || "";
  return creator === CHAMPION_CREATOR;
}

function timestampMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const seconds = Number(value.seconds ?? value._seconds ?? 0);
  const nanoseconds = Number(value.nanoseconds ?? value._nanoseconds ?? 0);
  return seconds ? seconds * 1000 + Math.floor(nanoseconds / 1000000) : 0;
}

function cleanClientValue(value) {
  if (value === undefined || typeof value === "function") return undefined;
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(cleanClientValue).filter((entry) => entry !== undefined);
  }
  if (typeof value === "object") {
    if (typeof value.toDate === "function" && typeof value.toMillis === "function") {
      return {
        seconds: Math.floor(value.toMillis() / 1000),
        milliseconds: value.toMillis(),
      };
    }

    const out = {};
    Object.entries(value).forEach(([key, item]) => {
      if (key === "serverRunTokenHash" || key === "serverRewardProof") return;
      if (String(key).startsWith("server") && !CLIENT_RUN_SERVER_KEYS.has(key)) return;
      const clean = cleanClientValue(item);
      if (clean !== undefined) out[key] = clean;
    });
    return out;
  }
  return String(value);
}

function redactRunForClient(id, run = {}) {
  const clean = cleanClientValue(run) || {};
  delete clean.serverRunTokenHash;
  delete clean.serverRewardProof;
  return {
    id,
    ...clean,
    serverWriteVersion: Number(run.serverWriteVersion || clean.serverWriteVersion || 1),
  };
}

function redactRunSummaryForClient(id, run = {}) {
  return cleanClientValue({
    id,
    status: run.status || "",
    room: run.room || 1,
    championAssetId: run.championAssetId || null,
    championName: run.championName || run.championSnapshot?.name || "",
    activeAddress: run.activeAddress || run.walletAddress || "",
    currentNodeId: run.currentNodeId || "",
    visitedNodeIds: Array.isArray(run.visitedNodeIds) ? run.visitedNodeIds : [],
    depthsMap: run.depthsMap || null,
    currentMonsters: Array.isArray(run.currentMonsters)
      ? run.currentMonsters.map((monster) => ({
          id: monster?.id || monster?.monsterId || monster?.docId || "",
          monsterId: monster?.monsterId || monster?.id || monster?.docId || "",
          name: monster?.name || monster?.displayName || "",
          displayName: monster?.displayName || monster?.name || "",
        }))
      : [],
    nodeResult: run.nodeResult || null,
    artifactChoiceContext: run.artifactChoiceContext || null,
    entryRunNumber: run.entryRunNumber || null,
    serverWriteVersion: Number(run.serverWriteVersion || 1),
    updatedAt: run.updatedAt || null,
    serverUpdatedAt: run.serverUpdatedAt || null,
  });
}

function redactBattleForClient(id, battle = {}) {
  const clean = cleanClientValue(battle) || {};
  return {
    id,
    ...clean,
  };
}

function buildActiveDepthsRunCandidate(docSnap, { walletAddress, championAssetId }) {
  if (!docSnap?.exists) return null;

  const run = docSnap.data() || {};
  if (normalizeAssetId(run.championAssetId) !== championAssetId) return null;
  if (!ACTIVE_RUN_STATUSES.has(String(run.status || ""))) return null;

  const runWalletAddress = String(run.activeAddress || run.walletAddress || "").trim();
  if (runWalletAddress && runWalletAddress !== walletAddress) return null;

  return {
    id: docSnap.id,
    ref: docSnap.ref,
    run,
    updatedAtMs: Math.max(
      timestampMillis(run.serverUpdatedAt),
      timestampMillis(run.updatedAt),
      timestampMillis(run.startedAt),
      timestampMillis(run.createdAt)
    ),
  };
}

async function findActiveDepthsRun({ walletAddress, championAssetId }) {
  const entryState = await getChampionEntryState(championAssetId).catch(() => null);
  const activeRunId = String(entryState?.data?.activeRunId || "").trim();

  if (activeRunId) {
    const activeRunSnap = await db.collection(RUN_COLLECTION).doc(activeRunId).get();
    const activeRun = buildActiveDepthsRunCandidate(activeRunSnap, {
      walletAddress,
      championAssetId,
    });
    if (activeRun) return activeRun;
  }

  const queryValues = getChampionAssetIdQueryValues(championAssetId);
  if (!queryValues.length) return null;

  const runsQuery =
    queryValues.length === 1
      ? db.collection(RUN_COLLECTION).where("championAssetId", "==", queryValues[0])
      : db.collection(RUN_COLLECTION).where("championAssetId", "in", queryValues);
  const runsSnap = await runsQuery.get();

  const activeRuns = [];
  runsSnap.forEach((docSnap) => {
    const activeRun = buildActiveDepthsRunCandidate(docSnap, {
      walletAddress,
      championAssetId,
    });
    if (activeRun) activeRuns.push(activeRun);
  });

  activeRuns.sort((a, b) => b.updatedAtMs - a.updatedAtMs);
  return activeRuns[0] || null;
}

async function findLatestBattleForRun(runId, status = "") {
  const battlesSnap = await db.collection(BATTLE_COLLECTION).where("runId", "==", String(runId)).get();
  const battles = [];

  battlesSnap.forEach((docSnap) => {
    const battle = docSnap.data() || {};
    if (status && String(battle.status || "") !== status) return;
    battles.push({
      id: docSnap.id,
      battle,
      updatedAtMs: Math.max(
        timestampMillis(battle.serverUpdatedAt),
        timestampMillis(battle.updatedAt),
        timestampMillis(battle.completedAt),
        timestampMillis(battle.startedAt)
      ),
    });
  });

  battles.sort((a, b) => b.updatedAtMs - a.updatedAtMs);
  return battles[0] || null;
}

async function findBestResumeBattleForRun(runId, run = {}) {
  const battlesSnap = await db.collection(BATTLE_COLLECTION).where("runId", "==", String(runId)).get();
  const battles = [];
  const currentNodeId = String(run.currentNodeId || "");

  battlesSnap.forEach((docSnap) => {
    const battle = docSnap.data() || {};
    const battleNodeId = getBattleCurrentNodeId(battle);
    const room = getBattleRoomNumber(battle);
    battles.push({
      id: docSnap.id,
      battle,
      battleNodeId,
      room,
      updatedAtMs: Math.max(
        timestampMillis(battle.serverUpdatedAt),
        timestampMillis(battle.updatedAt),
        timestampMillis(battle.completedAt),
        timestampMillis(battle.startedAt)
      ),
    });
  });

  const sameNodeBattles = currentNodeId
    ? battles.filter((entry) => !entry.battleNodeId || entry.battleNodeId === currentNodeId)
    : battles;
  const pool = sameNodeBattles.length ? sameNodeBattles : battles;

  pool.sort((a, b) => {
    const aVerifiedComplete = a.battle.status === "complete" && a.battle.serverBattleVerified === true ? 1 : 0;
    const bVerifiedComplete = b.battle.status === "complete" && b.battle.serverBattleVerified === true ? 1 : 0;
    if (aVerifiedComplete !== bVerifiedComplete) return bVerifiedComplete - aVerifiedComplete;
    if (a.room !== b.room) return b.room - a.room;
    return b.updatedAtMs - a.updatedAtMs;
  });

  return pool[0] || null;
}

async function getChampionEntryState(championAssetId) {
  const assetId = normalizeAssetId(championAssetId);
  const ref = db.collection(CHAMPION_ENTRY_COLLECTION).doc(String(assetId));
  const snap = await ref.get();
  const data = snap.exists ? snap.data() || {} : {};
  const runCount = Math.max(0, Math.floor(Number(data.runCount || 0)));
  return { ref, data, runCount };
}

async function getChampionDailyEntryState(championAssetId, dailyKey = getDepthsDailyKey()) {
  const assetId = normalizeAssetId(championAssetId);
  const ref = db.collection(DAILY_ENTRY_COLLECTION).doc(`${assetId}_${dailyKey}`);
  const snap = await ref.get();
  const data = snap.exists ? snap.data() || {} : {};
  const runCount = Math.max(0, Math.floor(Number(data.runCount || 0)));
  return { ref, data, runCount, dailyKey };
}

async function verifyDepthsEntryPayment({ txId, walletAddress, expectedPayment = null }) {
  const normalizedTxId = String(txId || "").trim();
  if (!normalizedTxId) {
    const error = new Error("paymentTxId is required for paid Depths runs.");
    error.status = 400;
    throw error;
  }

  const payment = expectedPayment || getEntryPaymentPayload();
  const indexer = new algosdk.Indexer("", INDEXER_BASE, 443);
  const response = await indexer.lookupTransactionByID(normalizedTxId).do();
  const txn = getTransactionFromIndexerResponse(response);
  const transfer = getAssetTransfer(txn);
  const confirmedRound = getConfirmedRound(txn);
  const sender = getTransactionSender(txn);
  const receiver = String(transfer.receiver || transfer.assetReceiver || "").trim();
  const assetId = Number(transfer["asset-id"] || transfer.assetId || 0);
  const amount = Number(transfer.amount || 0);
  const assetSender = String(transfer.sender || transfer.assetSender || transfer["asset-sender"] || "").trim();
  const closeTo = String(transfer.closeTo || transfer.close || transfer["close-to"] || "").trim();
  const rekeyTo = String(txn.rekeyTo || txn["rekey-to"] || "").trim();

  if (!confirmedRound) {
    const error = new Error("Depths entry payment transaction is not confirmed yet.");
    error.status = 400;
    throw error;
  }

  if (String(txn["tx-type"] || txn.txType || "") !== "axfer") {
    const error = new Error("Depths entry payment must be an asset transfer.");
    error.status = 400;
    throw error;
  }

  if (sender !== walletAddress) {
    const error = new Error("Depths entry payment sender does not match the connected wallet.");
    error.status = 403;
    throw error;
  }

  if (receiver !== payment.receiver) {
    const error = new Error("Depths entry payment was sent to the wrong receiver.");
    error.status = 400;
    throw error;
  }

  if (assetId !== payment.assetId) {
    const error = new Error("Depths entry payment used the wrong asset.");
    error.status = 400;
    throw error;
  }

  if (amount < payment.amountAtomic) {
    const error = new Error("Depths entry payment amount is too low.");
    error.status = 400;
    throw error;
  }

  if (assetSender || closeTo || rekeyTo) {
    const error = new Error("Depths entry payment cannot use clawback, close-out, or rekey fields.");
    error.status = 400;
    throw error;
  }

  return {
    txId: normalizedTxId,
    sender,
    receiver,
    assetId,
    amountAtomic: amount,
    confirmedRound,
    roundTime: Number(txn["round-time"] || txn.roundTime || 0) || null,
  };
}

async function getDepthsEntryInfo({ activeAddress, championAssetId }) {
  const assetId = normalizeAssetId(championAssetId);
  const walletAddress = validateAddress(activeAddress, "Depths run wallet address");

  if (!assetId) {
    const error = new Error("championAssetId is required to check The Depths entry.");
    error.status = 400;
    throw error;
  }

  const holdsChampion = await walletHoldsChampion(walletAddress, assetId);
  if (!holdsChampion) {
    const error = new Error("Connected wallet does not hold this Dark Coin champion NFT.");
    error.status = 403;
    throw error;
  }

  const entryState = await getChampionEntryState(assetId);
  const dailyKey = getDepthsDailyKey();
  const dailyEntryState = await getChampionDailyEntryState(assetId, dailyKey);
  const payment = getEntryPaymentPayload({ championAssetId: assetId, entryCount: dailyEntryState.runCount });
  const activeRun = await findActiveDepthsRun({ walletAddress, championAssetId: assetId });

  return {
    championAssetId: assetId,
    walletAddress,
    dailyKey,
    freeRunAvailable: false,
    requiresPayment: true,
    entryCount: dailyEntryState.runCount,
    runsToday: dailyEntryState.runCount,
    lifetimeEntryCount: entryState.runCount,
    nextRunNumber: payment.runNumber,
    activeRun: activeRun ? redactRunSummaryForClient(activeRun.id, activeRun.run) : null,
    payment,
    entryProofKind: null,
    resumeProofKind: getDepthsResumeProofKind(),
  };
}

async function getDepthsEntryInfoBatch({ activeAddress, championAssetIds }) {
  const walletAddress = validateAddress(activeAddress, "Depths run wallet address");
  const assetIds = [
    ...new Set(asArray(championAssetIds).map(normalizeAssetId).filter(Boolean)),
  ].slice(0, 100);
  const dailyKey = getDepthsDailyKey();

  if (!assetIds.length) {
    return {
      walletAddress,
      dailyKey,
      entries: {},
      resumeProofKind: getDepthsResumeProofKind(),
    };
  }

  const entryRefs = assetIds.map((assetId) => db.collection(CHAMPION_ENTRY_COLLECTION).doc(String(assetId)));
  const dailyRefs = assetIds.map((assetId) => db.collection(DAILY_ENTRY_COLLECTION).doc(`${assetId}_${dailyKey}`));
  const entrySnaps = await db.getAll(...entryRefs);
  const dailySnaps = await db.getAll(...dailyRefs);
  const entryByAssetId = new Map();
  const dailyByAssetId = new Map();

  entrySnaps.forEach((snap, index) => {
    entryByAssetId.set(assetIds[index], snap.exists ? snap.data() || {} : {});
  });
  dailySnaps.forEach((snap, index) => {
    dailyByAssetId.set(assetIds[index], snap.exists ? snap.data() || {} : {});
  });

  const activeRunRefsById = new Map();
  assetIds.forEach((assetId) => {
    const entryData = entryByAssetId.get(assetId) || {};
    const activeRunId = String(entryData.activeRunId || "").trim();
    const activeRunStatus = String(entryData.activeRunStatus || "");
    if (activeRunId && (!activeRunStatus || ACTIVE_RUN_STATUSES.has(activeRunStatus))) {
      activeRunRefsById.set(activeRunId, db.collection(RUN_COLLECTION).doc(activeRunId));
    }
  });

  const activeRunsByAssetId = new Map();
  if (activeRunRefsById.size) {
    const runSnaps = await db.getAll(...activeRunRefsById.values());
    runSnaps.forEach((snap) => {
      const run = snap.exists ? snap.data() || {} : null;
      const activeRun = buildActiveDepthsRunCandidate(snap, {
        walletAddress,
        championAssetId: normalizeAssetId(run?.championAssetId),
      });
      if (activeRun) {
        activeRunsByAssetId.set(normalizeAssetId(activeRun.run.championAssetId), activeRun);
      }
    });
  }

  const entries = {};
  assetIds.forEach((assetId) => {
    const entryData = entryByAssetId.get(assetId) || {};
    const dailyData = dailyByAssetId.get(assetId) || {};
    const lifetimeEntryCount = Math.max(0, Math.floor(Number(entryData.runCount || 0)));
    const runsToday = Math.max(0, Math.floor(Number(dailyData.runCount || 0)));
    const payment = getEntryPaymentPayload({ championAssetId: assetId, entryCount: runsToday });
    const activeRun = activeRunsByAssetId.get(assetId) || null;

    entries[String(assetId)] = {
      championAssetId: assetId,
      walletAddress,
      dailyKey,
      freeRunAvailable: false,
      requiresPayment: true,
      entryCount: runsToday,
      runsToday,
      lifetimeEntryCount,
      nextRunNumber: payment.runNumber,
      activeRun: activeRun ? redactRunSummaryForClient(activeRun.id, activeRun.run) : null,
      payment,
      entryProofKind: null,
      resumeProofKind: getDepthsResumeProofKind(),
      ownershipVerified: false,
    };
  });

  return {
    walletAddress,
    dailyKey,
    entries,
    resumeProofKind: getDepthsResumeProofKind(),
  };
}

async function authorizeDepthsRunEntry({ data, paymentTxId, walletProof }) {
  const championAssetId = normalizeAssetId(data.championAssetId);
  const walletAddress = validateAddress(data.activeAddress, "Depths run wallet address");

  if (!championAssetId) {
    const error = new Error("championAssetId is required to start The Depths.");
    error.status = 400;
    throw error;
  }

  const holdsChampion = await walletHoldsChampion(walletAddress, championAssetId);
  if (!holdsChampion) {
    const error = new Error("Connected wallet does not hold this Dark Coin champion NFT.");
    error.status = 403;
    throw error;
  }

  const activeRun = await findActiveDepthsRun({ walletAddress, championAssetId });
  if (activeRun) {
    const error = new Error("This champion already has an active Depths run.");
    error.status = 409;
    error.activeRunExists = true;
    error.activeRun = redactRunForClient(activeRun.id, activeRun.run);
    throw error;
  }

  const runToken = createRunWriteToken();
  const serverFields = {
    serverRunTokenHash: hashRunWriteToken(runToken),
    entryAuthorizedAt: serverTimestamp(),
  };

  if (!paymentTxId) {
    const dailyEntryState = await getChampionDailyEntryState(championAssetId);
    const error = new Error("A Dark Coin entry payment is required before starting The Depths.");
    error.status = 402;
    error.requiresPayment = true;
    error.payment = getEntryPaymentPayload({
      championAssetId,
      entryCount: dailyEntryState.runCount,
    });
    throw error;
  }

  const payment = await verifyDepthsEntryPayment({
    txId: paymentTxId,
    walletAddress,
    expectedPayment: getEntryPaymentPayload({ championAssetId, entryCount: 0 }),
  });
  const paymentRef = db.collection(ENTRY_PAYMENT_COLLECTION).doc(payment.txId);
  const runRef = db.collection(RUN_COLLECTION).doc();
  const entryRef = db.collection(CHAMPION_ENTRY_COLLECTION).doc(String(championAssetId));
  const dailyKey = getDepthsDailyKey();
  const dailyEntryRef = db.collection(DAILY_ENTRY_COLLECTION).doc(`${championAssetId}_${dailyKey}`);
  let acceptedPayment = null;
  let acceptedDailyCount = 0;
  let acceptedLifetimeCount = 0;

  await db.runTransaction(async (transaction) => {
    const paymentSnap = await transaction.get(paymentRef);
    const entrySnap = await transaction.get(entryRef);
    const dailyEntrySnap = await transaction.get(dailyEntryRef);
    if (paymentSnap.exists) {
      const error = new Error("This Depths entry payment has already been used.");
      error.status = 409;
      throw error;
    }

    const entryData = entrySnap.exists ? entrySnap.data() || {} : {};
    const dailyEntryData = dailyEntrySnap.exists ? dailyEntrySnap.data() || {} : {};
    if (entryData.activeRunId && ACTIVE_RUN_STATUSES.has(String(entryData.activeRunStatus || ""))) {
      const error = new Error("This champion already has an active Depths run.");
      error.status = 409;
      error.activeRunExists = true;
      throw error;
    }

    const entryCount = Math.max(0, Math.floor(Number(dailyEntryData.runCount || 0)));
    const lifetimeEntryCount = Math.max(0, Math.floor(Number(entryData.runCount || 0)));
    const expectedPayment = getEntryPaymentPayload({ championAssetId, entryCount });
    if (payment.amountAtomic < expectedPayment.amountAtomic) {
      const error = new Error(
        `Depths entry payment amount is too low. Run ${expectedPayment.runNumber} requires ${expectedPayment.amountDisplay} Dark Coin.`
      );
      error.status = 400;
      error.requiresPayment = true;
      error.payment = expectedPayment;
      throw error;
    }

    acceptedPayment = expectedPayment;
    acceptedDailyCount = entryCount;
    acceptedLifetimeCount = lifetimeEntryCount;

    transaction.set(paymentRef, {
      ...payment,
      championAssetId,
      dailyKey,
      runId: runRef.id,
      entryRunNumber: expectedPayment.runNumber,
      entryCountBefore: entryCount,
      entryDailyCountBefore: entryCount,
      entryLifetimeCountBefore: lifetimeEntryCount,
      requiredAmountAtomic: expectedPayment.amountAtomic,
      requiredAmountDisplay: expectedPayment.amountDisplay,
      usedAt: serverTimestamp(),
    });

    transaction.set(runRef, {
      ...data,
      ...serverFields,
      entryType: "paid",
      entryDailyKey: dailyKey,
      entryRunNumber: expectedPayment.runNumber,
      entryCountBefore: entryCount,
      entryDailyCountBefore: entryCount,
      entryLifetimeCountBefore: lifetimeEntryCount,
      entryAuthorizedBy: "dark_coin_payment",
      entryPaymentTxId: payment.txId,
      entryPaymentAssetId: payment.assetId,
      entryPaymentAmountAtomic: payment.amountAtomic,
      entryPaymentAmountDisplay: String(payment.amountAtomic / 10 ** expectedPayment.decimals),
      entryPaymentRequiredAmountAtomic: expectedPayment.amountAtomic,
      entryPaymentRequiredAmountDisplay: expectedPayment.amountDisplay,
      entryPaymentBaseAmountAtomic: expectedPayment.baseAmountAtomic,
      entryPaymentBaseAmountDisplay: expectedPayment.baseAmountDisplay,
      entryPaymentReceiver: payment.receiver,
      entryPaymentConfirmedRound: payment.confirmedRound,
      entryPaymentRoundTime: payment.roundTime,
    });

    transaction.set(
      entryRef,
      {
        championAssetId,
        walletAddress,
        runCount: lifetimeEntryCount + 1,
        activeRunId: runRef.id,
        activeRunStatus: "choosingLoadout",
        lastRunId: runRef.id,
        lastRunNumber: lifetimeEntryCount + 1,
        lastDailyKey: dailyKey,
        lastDailyRunNumber: expectedPayment.runNumber,
        lastEntryAmountAtomic: expectedPayment.amountAtomic,
        lastEntryAmountDisplay: expectedPayment.amountDisplay,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    transaction.set(
      dailyEntryRef,
      {
        championAssetId,
        walletAddress,
        dailyKey,
        runCount: entryCount + 1,
        lastRunId: runRef.id,
        lastRunNumber: expectedPayment.runNumber,
        lastEntryAmountAtomic: expectedPayment.amountAtomic,
        lastEntryAmountDisplay: expectedPayment.amountDisplay,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  });

  return {
    id: runRef.id,
    runToken,
    entryType: "paid",
    entryRunNumber: acceptedPayment?.runNumber || null,
    entryCountBefore: acceptedDailyCount,
    entryDailyCountBefore: acceptedDailyCount,
    entryLifetimeCountBefore: acceptedLifetimeCount,
    entryDailyKey: dailyKey,
    paymentTxId: payment.txId,
    serverWriteVersion: 1,
  };
}

async function resumeDepthsRun({ activeAddress, championAssetId, walletProof }) {
  const assetId = normalizeAssetId(championAssetId);
  const walletAddress = validateAddress(activeAddress, "Depths run wallet address");

  if (!assetId) {
    const error = new Error("championAssetId is required to resume The Depths.");
    error.status = 400;
    throw error;
  }

  const holdsChampion = await walletHoldsChampion(walletAddress, assetId);
  if (!holdsChampion) {
    const error = new Error("Connected wallet does not hold this Dark Coin champion NFT.");
    error.status = 403;
    throw error;
  }

  const resumeProof = await verifyDepthsResumeWalletProof({
    walletProof,
    walletAddress,
    championAssetId: assetId,
  });
  const activeRun = await findActiveDepthsRun({ walletAddress, championAssetId: assetId });

  if (!activeRun) {
    const error = new Error("No active Depths run was found for this champion.");
    error.status = 404;
    throw error;
  }

  const runToken = createRunWriteToken();
  let resumedRun = null;

  await db.runTransaction(async (transaction) => {
    const runSnap = await transaction.get(activeRun.ref);
    if (!runSnap.exists) {
      const error = new Error("Depths run was not found while resuming.");
      error.status = 404;
      throw error;
    }

    const freshRun = runSnap.data() || {};
    if (!ACTIVE_RUN_STATUSES.has(String(freshRun.status || ""))) {
      const error = new Error("This Depths run has already ended.");
      error.status = 409;
      throw error;
    }
    const freshRunWalletAddress = String(freshRun.activeAddress || freshRun.walletAddress || "").trim();
    if (normalizeAssetId(freshRun.championAssetId) !== assetId || (freshRunWalletAddress && freshRunWalletAddress !== walletAddress)) {
      const error = new Error("Depths run does not match this wallet and champion.");
      error.status = 403;
      throw error;
    }

    const nextVersion = Number(freshRun.serverWriteVersion || 1) + 1;
    const serverFields = {
      serverRunTokenHash: hashRunWriteToken(runToken),
      serverWriteVersion: nextVersion,
      serverResumedAt: serverTimestamp(),
      serverResumeProofHash: resumeProof.proofHash,
      serverResumeProofType: resumeProof.proofType,
      serverResumeProofIssuedAt: resumeProof.issuedAt,
      activeAddress: walletAddress,
      updatedAt: serverTimestamp(),
      serverUpdatedAt: serverTimestamp(),
    };

    transaction.set(activeRun.ref, serverFields, { merge: true });
    resumedRun = {
      ...freshRun,
      ...serverFields,
      serverWriteVersion: nextVersion,
    };
  });

  const latestBattle = await findBestResumeBattleForRun(activeRun.id, resumedRun || activeRun.run);

  return {
    id: activeRun.id,
    runToken,
    resumed: true,
    run: redactRunForClient(activeRun.id, resumedRun || activeRun.run),
    latestBattle: latestBattle ? redactBattleForClient(latestBattle.id, latestBattle.battle) : null,
  };
}

function normalizeRunPayload(payload = {}, { creating = false } = {}) {
  const data = compactRunStorageFields(cleanPayload(payload));

  if (data.status && !RUN_STATUSES.has(String(data.status))) {
    const error = new Error(`Invalid Depths run status: ${data.status}`);
    error.status = 400;
    throw error;
  }

  if (data.status === "completed") {
    data.clientCompleted = true;
    data.clientCompletionPendingVerification = true;
  }

  delete data.createdAt;
  delete data.updatedAt;
  delete data.expectedServerWriteVersion;
  delete data.serverWriteVersion;
  if (data.completedAt) data.completedAt = serverTimestamp();
  if (data.endedAt) data.endedAt = serverTimestamp();

  if (creating) {
    data.createdAt = serverTimestamp();
    data.startedAt = serverTimestamp();
    data.serverWriteVersion = 1;
  }

  data.updatedAt = serverTimestamp();
  data.serverUpdatedAt = serverTimestamp();
  return data;
}

function normalizeBattlePayload(payload = {}, { creating = false } = {}) {
  const data = cleanPayload(payload);

  if (data.status && !BATTLE_STATUSES.has(String(data.status))) {
    const error = new Error(`Invalid Depths battle status: ${data.status}`);
    error.status = 400;
    throw error;
  }

  delete data.createdAt;
  delete data.updatedAt;
  delete data.runArtifacts;
  delete data.runCards;
  delete data.runCardUpgrades;
  if (data.completedAt) data.completedAt = serverTimestamp();

  if (creating) {
    data.startedAt = serverTimestamp();
    data.serverWriteVersion = 1;
  }

  data.updatedAt = serverTimestamp();
  data.serverUpdatedAt = serverTimestamp();
  return data;
}

async function depthsState(req, res) {
  await NextCors(req, res, {
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
    origin: "*",
    optionsSuccessStatus: 200,
  });

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return sendJson(res, 405, { error: "Method Not Allowed" });
  }

  try {
    const body = parseBody(req);
    const action = String(body.action || "").trim();

    if (action === "getEntryInfo") {
      const entryInfo = await getDepthsEntryInfo({
        activeAddress: body.activeAddress,
        championAssetId: body.championAssetId,
      });
      return sendJson(res, 200, entryInfo);
    }

    if (action === "getEntryInfoBatch") {
      const entryInfoBatch = await getDepthsEntryInfoBatch({
        activeAddress: body.activeAddress,
        championAssetIds: body.championAssetIds,
      });
      return sendJson(res, 200, entryInfoBatch);
    }

    if (action === "createRun") {
      const data = normalizeRunPayload(body.data || {}, { creating: true });
      const created = await authorizeDepthsRunEntry({
        data,
        paymentTxId: body.paymentTxId,
        walletProof: body.walletProof,
      });
      return sendJson(res, 200, created);
    }

    if (action === "resumeRun") {
      const resumed = await resumeDepthsRun({
        activeAddress: body.activeAddress,
        championAssetId: body.championAssetId,
        walletProof: body.walletProof,
      });
      return sendJson(res, 200, resumed);
    }

    if (action === "updateRun") {
      const runId = requireString(body.runId, "runId");
      const expectedServerWriteVersion = Number(
        body.expectedServerWriteVersion ?? body.updates?.expectedServerWriteVersion ?? 0
      );
      const { runRef, run } = await requireRunWriteToken(runId, body.runToken);
      const normalizedData = normalizeRunPayload(body.updates || {});
      const data = reconcileTerminalRunUpdateWithServerProgress(run, normalizedData);
      await requireServerVerifiedBattleForRunUpdate({ runId, updates: data, existingRun: run });
      validateRunUpdateProgression(run, data);

      let serverWriteVersion = 0;
      await db.runTransaction(async (transaction) => {
        const freshSnap = await transaction.get(runRef);
        if (!freshSnap.exists) {
          const error = new Error("Depths run was not found during update.");
          error.status = 404;
          throw error;
        }

        const freshRun = freshSnap.data() || {};
        if (!tokenMatches(freshRun.serverRunTokenHash, body.runToken)) {
          const error = new Error("Depths run write token is invalid.");
          error.status = 403;
          throw error;
        }

        const currentVersion = Number(freshRun.serverWriteVersion || 1);
        if (!Number.isSafeInteger(expectedServerWriteVersion) || expectedServerWriteVersion !== currentVersion) {
          const error = new Error("Depths run update is stale. Reload or resume the latest run state.");
          error.status = 409;
          error.staleRunUpdate = true;
          error.serverWriteVersion = currentVersion;
          throw error;
        }

        const transactionData = reconcileTerminalRunUpdateWithServerProgress(freshRun, normalizedData);
        validateRunUpdateProgression(freshRun, transactionData);
        serverWriteVersion = currentVersion + 1;
        transaction.set(
          runRef,
          {
            ...transactionData,
            serverWriteVersion,
          },
          { merge: true }
        );

        const nextStatus = String(transactionData.status || freshRun.status || "");
        const championAssetId = normalizeAssetId(freshRun.championAssetId || transactionData.championAssetId);
        if (championAssetId && nextStatus) {
          const entryRef = db.collection(CHAMPION_ENTRY_COLLECTION).doc(String(championAssetId));
          const entryUpdate = {
            activeRunStatus: nextStatus,
            lastRunId: runId,
            lastRunStatus: nextStatus,
            updatedAt: serverTimestamp(),
          };

          if (ACTIVE_RUN_STATUSES.has(nextStatus)) {
            entryUpdate.activeRunId = runId;
          } else if (ENDED_RUN_STATUSES.has(nextStatus)) {
            entryUpdate.activeRunId = admin.firestore.FieldValue.delete();
            entryUpdate.activeRunEndedAt = serverTimestamp();
          }

          transaction.set(entryRef, entryUpdate, { merge: true });
        }
      });

      return sendJson(res, 200, { id: runId, serverWriteVersion });
    }

    if (action === "createBattle") {
      const data = normalizeBattlePayload(body.data || {}, { creating: true });
      const runId = requireString(data.runId || body.runId, "runId");
      await requireRunWriteToken(runId, body.runToken);
      data.runId = runId;
      const rawInitialSnapshot = data.snapshot || null;
      const initialSnapshot = rawInitialSnapshot
        ? reduceBattleSnapshotForVerification(rawInitialSnapshot, { includeMoves: true })
        : null;
      data.snapshot = compactBattleSnapshotForStorage(rawInitialSnapshot);
      data.serverInitialIntegrityHash = createIntegrityHash({
        runId,
        room: data.room || null,
        championAssetId: data.championAssetId || null,
        monsterIds: data.monsterIds || [],
        monsterNames: data.monsterNames || [],
        snapshot: initialSnapshot,
      });
      data.serverInitialIntegrityAt = serverTimestamp();
      data.serverInitialSnapshot = initialSnapshot;
      data.serverBattleReplayVersion = 1;
      Object.assign(data, buildBattleRootCompactionFields({ ...data, snapshot: rawInitialSnapshot }));
      if (data.championRunSnapshot) {
        data.championRunSnapshot = normalizeVerificationFighter(data.championRunSnapshot, "A", {
          includeMoves: true,
        });
      }
      const docRef = await db.collection(BATTLE_COLLECTION).add(data);
      return sendJson(res, 200, { id: docRef.id });
    }

    if (action === "updateBattle") {
      const battleId = requireString(body.battleId, "battleId");
      const battleSnap = await db.collection(BATTLE_COLLECTION).doc(battleId).get();
      if (!battleSnap.exists) return sendJson(res, 404, { error: "Depths battle was not found." });
      const existingBattle = battleSnap.data() || {};
      const runId = requireString(existingBattle.runId, "battle runId");
      await requireRunWriteToken(runId, body.runToken);
      const data = normalizeBattlePayload(body.updates || {});
      const rawSnapshot = data.snapshot || null;
      if (Array.isArray(data.actionLog)) {
        data.actionLog = mergeBattleActionLog(existingBattle, data.actionLog);
      }
      if (rawSnapshot) {
        data.snapshot = compactBattleSnapshotForStorage(rawSnapshot);
      }
      const verificationFields = buildBattleVerificationFields({
        battleId,
        existingBattle,
        data,
      });
      const compactionFields = buildBattleRootCompactionFields({
        ...data,
        snapshot: rawSnapshot || data.snapshot || existingBattle.snapshot || null,
      });
      await db.collection(BATTLE_COLLECTION).doc(battleId).set(
        {
          ...data,
          ...compactionFields,
          ...verificationFields,
        },
        { merge: true }
      );
      return sendJson(res, 200, {
        id: battleId,
        serverBattleVerified: Boolean(verificationFields.serverBattleVerified),
        serverVerifiedWinner: verificationFields.serverVerifiedWinner || null,
      });
    }

    return sendJson(res, 400, { error: "Invalid Depths state action." });
  } catch (error) {
    console.error("depthsState failed:", error);
    return sendJson(res, error.status || 500, {
      error: error?.message || "Failed to update Depths state.",
      requiresPayment: Boolean(error?.requiresPayment),
      payment: error?.payment || null,
      activeRunExists: Boolean(error?.activeRunExists),
      activeRun: error?.activeRun || null,
      staleRunUpdate: Boolean(error?.staleRunUpdate),
      serverWriteVersion: error?.serverWriteVersion || null,
    });
  }
}

export default depthsState;
