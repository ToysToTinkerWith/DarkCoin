import NextCors from "nextjs-cors";
import algosdk from "algosdk";
import crypto from "crypto";
import admin from "../../../Firebase/FirebaseAdmin";

const ALGOD_BASE = "https://mainnet-api.algonode.cloud";
const INDEXER_BASE = "https://mainnet-idx.algonode.cloud";
const DARK_COIN_ASSET_ID = 1088771340;
const DARK_COIN_DECIMALS = 6;
const DEPTHS_APP_ID = 3658640544;
const DRAGONSHORDE_APP_ID = 1870514811;
const DEPTHS_REGULAR_ENCOUNTER_XP = 1;
const DEPTHS_ELITE_ENCOUNTER_XP = 2;
const DEPTHS_COMPLETION_BONUS_XP = 5;

const db = admin.firestore();
const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;

const DARK_COIN_REWARD_TIERS = [
  { id: "small-cache", label: "Small Cache", basisPoints: 100, weight: 7000 },
  { id: "deep-cache", label: "Deep Cache", basisPoints: 250, weight: 2000 },
  { id: "vault-cache", label: "Vault Cache", basisPoints: 500, weight: 800 },
  { id: "royal-cache", label: "Royal Cache", basisPoints: 1000, weight: 180 },
  { id: "abyss-jackpot", label: "Abyss Jackpot", basisPoints: 2500, weight: 20 },
];

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload, (_key, value) =>
    typeof value === "bigint" ? value.toString() : value
  );
  res.status(status);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.send(body);
}

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  return req.body;
}

function normalizeAssetId(value) {
  const assetId = Number(value);
  return Number.isSafeInteger(assetId) && assetId > 0 ? assetId : 0;
}

function getDepthsAppId() {
  return normalizeAssetId(process.env.DEPTHS_APP_ID || process.env.NEXT_PUBLIC_DEPTHS_APP_ID) || DEPTHS_APP_ID;
}

function getApplicationAddressString(appId) {
  return String(algosdk.getApplicationAddress(appId));
}

function getDragonshordeAppId() {
  return normalizeAssetId(process.env.DRAGONSHORDE_APP_ID || process.env.NEXT_PUBLIC_DRAGONSHORDE_APP_ID) || DRAGONSHORDE_APP_ID;
}

function getDarkCoinAssetId() {
  return normalizeAssetId(process.env.DARK_COIN_ASSET_ID || process.env.NEXT_PUBLIC_DARK_COIN_ASSET_ID) || DARK_COIN_ASSET_ID;
}

function getDarkCoinDecimals() {
  const decimals = Number(process.env.DARK_COIN_DECIMALS || process.env.NEXT_PUBLIC_DARK_COIN_DECIMALS);
  return Number.isInteger(decimals) && decimals >= 0 ? decimals : DARK_COIN_DECIMALS;
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

function requireRunWriteToken(run, token) {
  if (!run?.serverRunTokenHash || !tokenMatches(run.serverRunTokenHash, token)) {
    const error = new Error("Depths run write token is invalid.");
    error.status = 403;
    throw error;
  }
}

function getRewardProofSecret() {
  const secret =
    process.env.DEPTHS_REWARD_PROOF_SECRET ||
    getDepthsCreatorMnemonic();

  if (!secret) {
    const error = new Error(
      "Server misconfigured: DEPTHS_REWARD_PROOF_SECRET or CREATOR_MNEMONIC is required."
    );
    error.status = 500;
    throw error;
  }

  return secret;
}

function buildRewardProofPayload({ runId, championAssetId, walletAddress, lastBattleId, currentNodeId }) {
  return [
    String(runId || ""),
    String(championAssetId || ""),
    String(walletAddress || ""),
    String(lastBattleId || ""),
    String(currentNodeId || ""),
  ].join("|");
}

function createRewardProof(parts) {
  return crypto
    .createHmac("sha256", getRewardProofSecret())
    .update(buildRewardProofPayload(parts))
    .digest("hex");
}

function isFinalMapNode(run) {
  const map = run?.depthsMap || {};
  const nodes = Array.isArray(map.nodes) ? map.nodes : [];
  const currentNode = nodes.find((node) => String(node?.id) === String(run?.currentNodeId));
  const finalDepth = Number(map.finalDepth || 0);
  const nodeDepth = Number(currentNode?.depth || 0);
  return Boolean(currentNode && finalDepth > 0 && nodeDepth >= finalDepth);
}

async function verifyLastBattle(runId, run, championAssetId) {
  if (!run?.lastBattleId) {
    const error = new Error("Depths run is missing a final battle record.");
    error.status = 400;
    throw error;
  }

  const battleSnap = await db.collection("depthsBattles").doc(String(run.lastBattleId)).get();
  if (!battleSnap.exists) {
    const error = new Error("Final Depths battle record was not found.");
    error.status = 400;
    throw error;
  }

  const battle = battleSnap.data() || {};
  if (String(battle.runId || "") !== String(runId)) {
    const error = new Error("Final battle does not belong to this Depths run.");
    error.status = 400;
    throw error;
  }

  if (battle.status !== "complete" || battle.winner !== "champion") {
    const error = new Error("Final battle was not completed by the champion.");
    error.status = 400;
    throw error;
  }

  if (battle.serverBattleVerified !== true || battle.serverVerifiedWinner !== "champion") {
    const error = new Error("Final Depths battle has not been server verified.");
    error.status = 400;
    throw error;
  }

  if (normalizeAssetId(battle.championAssetId) !== championAssetId) {
    const error = new Error("Final battle champion does not match the Depths run champion.");
    error.status = 400;
    throw error;
  }

  return battle;
}

async function walletHoldsAsset(walletAddress, assetId) {
  const indexer = new algosdk.Indexer("", INDEXER_BASE, 443);
  let nextToken = undefined;

  do {
    let request = indexer.lookupAccountAssets(walletAddress).limit(1000);
    if (nextToken) request = request.nextToken(nextToken);

    const response = await request.do();
    const assets = Array.isArray(response?.assets) ? response.assets : [];
    const holding = assets.find((asset) => Number(asset.assetId || asset["asset-id"]) === Number(assetId));

    if (holding && BigInt(holding.amount || 0) > 0n) return true;
    nextToken = response?.nextToken;
  } while (nextToken);

  return false;
}

async function getAppAssetBalance(appId, assetId) {
  const appAddress = getApplicationAddressString(appId);
  const indexer = new algosdk.Indexer("", INDEXER_BASE, 443);
  let nextToken = undefined;

  do {
    let request = indexer.lookupAccountAssets(appAddress).limit(1000);
    if (nextToken) request = request.nextToken(nextToken);

    const response = await request.do();
    const assets = Array.isArray(response?.assets) ? response.assets : [];
    const holding = assets.find((asset) => Number(asset.assetId || asset["asset-id"]) === Number(assetId));

    if (holding) return BigInt(holding.amount || 0);
    nextToken = response?.nextToken;
  } while (nextToken);

  return 0n;
}

function pickRewardTier() {
  const totalWeight = DARK_COIN_REWARD_TIERS.reduce((total, tier) => total + tier.weight, 0);
  const ticket = crypto.randomInt(totalWeight);
  let cursor = 0;

  for (const tier of DARK_COIN_REWARD_TIERS) {
    cursor += tier.weight;
    if (ticket < cursor) return tier;
  }

  return DARK_COIN_REWARD_TIERS[0];
}

function formatAtomicAmount(value, decimals = DARK_COIN_DECIMALS) {
  const decimalsNumber = Math.max(0, Math.floor(Number(decimals) || 0));
  const raw = BigInt(String(value || "0"));
  const divisor = BigInt(`1${"0".repeat(decimalsNumber)}`);
  const whole = raw / divisor;
  const fraction = raw % divisor;
  if (!fraction) return whole.toString();

  const fractionText = fraction.toString().padStart(decimalsNumber, "0").replace(/0+$/, "");
  return `${whole.toString()}.${fractionText}`;
}

function formatBasisPoints(basisPoints) {
  const percent = Number(basisPoints || 0) / 100;
  return `${percent.toLocaleString("en-US", {
    minimumFractionDigits: percent < 1 ? 2 : 0,
    maximumFractionDigits: 2,
  })}%`;
}

function rollDarkCoinReward(contractBalanceAtomic, decimals) {
  if (contractBalanceAtomic <= 0n) {
    const error = new Error("The Depths contract has no Dark Coin available for rewards.");
    error.status = 409;
    throw error;
  }

  const tier = pickRewardTier();
  let amountAtomic = (contractBalanceAtomic * BigInt(tier.basisPoints)) / 10000n;
  if (amountAtomic <= 0n) amountAtomic = 1n;
  if (amountAtomic > contractBalanceAtomic) amountAtomic = contractBalanceAtomic;

  return {
    tierId: tier.id,
    label: tier.label,
    basisPoints: tier.basisPoints,
    percentDisplay: formatBasisPoints(tier.basisPoints),
    amountAtomic: amountAtomic.toString(),
    amountDisplay: formatAtomicAmount(amountAtomic, decimals),
    contractBalanceAtomic: contractBalanceAtomic.toString(),
  };
}

async function getDepthsRewardOdds() {
  const appId = getDepthsAppId();
  const assetId = getDarkCoinAssetId();
  const decimals = getDarkCoinDecimals();
  const contractBalanceAtomic = await getAppAssetBalance(appId, assetId);
  const totalWeight = DARK_COIN_REWARD_TIERS.reduce((total, tier) => total + Number(tier.weight || 0), 0);

  return {
    status: "ok",
    appId,
    assetId,
    decimals,
    contractBalanceAtomic: contractBalanceAtomic.toString(),
    contractBalanceDisplay: formatAtomicAmount(contractBalanceAtomic, decimals),
    rewardTiers: DARK_COIN_REWARD_TIERS.map((tier) => {
      let amountAtomic = (contractBalanceAtomic * BigInt(tier.basisPoints)) / 10000n;
      if (contractBalanceAtomic > 0n && amountAtomic <= 0n) amountAtomic = 1n;
      if (amountAtomic > contractBalanceAtomic) amountAtomic = contractBalanceAtomic;
      const chance = totalWeight > 0 ? (Number(tier.weight || 0) / totalWeight) * 100 : 0;

      return {
        id: tier.id,
        label: tier.label,
        basisPoints: tier.basisPoints,
        percentDisplay: formatBasisPoints(tier.basisPoints),
        weight: tier.weight,
        chance,
        chanceDisplay: `${chance.toLocaleString("en-US", {
          minimumFractionDigits: chance < 1 ? 2 : 1,
          maximumFractionDigits: 2,
        })}%`,
        amountAtomic: amountAtomic.toString(),
        amountDisplay: formatAtomicAmount(amountAtomic, decimals),
      };
    }),
    xp: {
      regularEncounterXp: DEPTHS_REGULAR_ENCOUNTER_XP,
      eliteEncounterXp: DEPTHS_ELITE_ENCOUNTER_XP,
      completionBonusXp: DEPTHS_COMPLETION_BONUS_XP,
    },
  };
}

function getRewardSigner() {
  const mnemonic = getDepthsCreatorMnemonic();
  if (!mnemonic) {
    const error = new Error("Server misconfigured: CREATOR_MNEMONIC is required for Depths rewards.");
    error.status = 500;
    throw error;
  }
  return algosdk.mnemonicToSecretKey(mnemonic);
}

function bytesEqual(left, right) {
  const leftBytes = left instanceof Uint8Array ? left : new Uint8Array(left || []);
  const rightBytes = right instanceof Uint8Array ? right : new Uint8Array(right || []);
  if (leftBytes.length !== rightBytes.length) return false;
  for (let index = 0; index < leftBytes.length; index += 1) {
    if (leftBytes[index] !== rightBytes[index]) return false;
  }
  return true;
}

function bytesToHex(bytes) {
  return Buffer.from(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || [])).toString("hex");
}

function makeAccountBoxReference(address) {
  return {
    appIndex: 0,
    name: algosdk.decodeAddress(address).publicKey,
  };
}

function getSignedApplicationCall(signedTxn) {
  try {
    return algosdk.decodeSignedTransaction(signedTxn)?.txn?.applicationCall || null;
  } catch (_error) {
    return null;
  }
}

function getBoxReferenceDebug(boxes = []) {
  return boxes.map((box) => ({
    appIndex: String(box?.appIndex ?? ""),
    name: bytesToHex(box?.name),
  }));
}

function assertAppCallHasBoxReference(txn, boxReference, context = "application call") {
  const boxes = Array.isArray(txn?.applicationCall?.boxes) ? txn.applicationCall.boxes : [];
  const hasReference = boxes.some((box) => {
    const appIndex = BigInt(box?.appIndex ?? -1);
    return appIndex === 0n && bytesEqual(box?.name, boxReference.name);
  });

  if (!hasReference) {
    const error = new Error(
      `${context} is missing required account box reference ${bytesToHex(boxReference.name)}.`
    );
    error.status = 500;
    error.boxReferences = getBoxReferenceDebug(boxes);
    throw error;
  }
}

function assertSignedTxnHasBoxReference(signedTxn, boxReference, context = "application call") {
  const applicationCall = getSignedApplicationCall(signedTxn);
  const boxes = Array.isArray(applicationCall?.boxes) ? applicationCall.boxes : [];
  const hasReference = boxes.some((box) => {
    const appIndex = BigInt(box?.appIndex ?? -1);
    return appIndex === 0n && bytesEqual(box?.name, boxReference.name);
  });

  if (!hasReference) {
    const error = new Error(
      `${context} signed transaction is missing required account box reference ${bytesToHex(boxReference.name)}.`
    );
    error.status = 500;
    error.boxReferences = getBoxReferenceDebug(boxes);
    throw error;
  }
}

function makeStrictSimulateRequest(signedTxn) {
  return new algosdk.modelsv2.SimulateRequest({
    txnGroups: [
      new algosdk.modelsv2.SimulateRequestTransactionGroup({
        txns: [algosdk.decodeSignedTransaction(signedTxn)],
      }),
    ],
    allowUnnamedResources: false,
  });
}

function getSimulationFailureMessage(result) {
  const group = result?.txnGroups?.[0] || {};
  const txnResult = group?.txnResults?.[0]?.txnResult || {};
  return String(
    group.failureMessage ||
      group["failure-message"] ||
      txnResult.poolError ||
      txnResult["pool-error"] ||
      ""
  ).trim();
}

function makeDepthsGrantSimulationError(context, detail, appId) {
  const appAddress = appId ? getApplicationAddressString(appId) : "";
  const needsMoreBalance = /balance\s+\d+\s+below\s+min\s+\d+/i.test(detail);
  const missingBoxReference = /invalid Box reference/i.test(detail);
  const message = needsMoreBalance
    ? `${context} simulation failed: the Depths contract needs more ALGO minimum-balance funding before it can create this wallet reward box. Send ALGO to ${appAddress || "the Depths app address"} and retry. Details: ${detail}`
    : missingBoxReference
    ? `${context} simulation failed: the reward transaction is missing the wallet box reference required by contracts/depths.py. Rebuild and redeploy the Firebase functions so the latest reward API is live. Details: ${detail}`
    : `${context} simulation failed: ${detail}`;

  const error = new Error(message);
  error.status = 500;
  error.appAddress = appAddress || null;
  throw error;
}

async function simulateSignedTransactionOrThrow(algod, signedTxn, context) {
  try {
    const appId = Number(getSignedApplicationCall(signedTxn)?.appIndex || 0);
    const result = await algod.simulateTransactions(makeStrictSimulateRequest(signedTxn)).do();
    const failureMessage = getSimulationFailureMessage(result);

    if (failureMessage) {
      makeDepthsGrantSimulationError(context, failureMessage, appId);
    }

    return result;
  } catch (error) {
    if (error?.status) throw error;
    const detail =
      error?.response?.body?.message ||
      error?.response?.text ||
      error?.message ||
      String(error);
    const wrapped = new Error(`${context} simulation failed: ${detail}`);
    wrapped.status = 500;
    throw wrapped;
  }
}

async function assertDepthsRewardAppSupportsMethods(algod, appId) {
  try {
    const app = await algod.getApplicationByID(appId).do();
    const approvalProgram = app?.params?.approvalProgram || app?.params?.["approval-program"];
    const approvalBytes =
      approvalProgram instanceof Uint8Array
        ? approvalProgram
        : typeof approvalProgram === "string"
        ? new Uint8Array(Buffer.from(approvalProgram, "base64"))
        : null;

    if (!approvalBytes?.length) {
      throw new Error("approval program was not returned");
    }

    const disassembled = await algod.disassemble(approvalBytes).do();
    const teal = String(disassembled?.result || "");
    if (!teal.includes("grantDarkCoin") || !teal.includes("claimReward")) {
      const error = new Error(
        `Configured Depths app ${appId} is not the Depths reward contract. Deploy contracts/depths.py and set DEPTHS_APP_ID / NEXT_PUBLIC_DEPTHS_APP_ID to that app id.`
      );
      error.status = 500;
      throw error;
    }
  } catch (error) {
    if (error?.status) throw error;
    const wrapped = new Error(
      `Could not verify Depths reward contract ${appId}: ${error?.message || String(error)}`
    );
    wrapped.status = 500;
    throw wrapped;
  }
}

function getDragonshordeSigner() {
  const mnemonic =
    process.env.DRAGONSHORDE_ADMIN_MNEMONIC ||
    process.env.DEPTHS_XP_ADMIN_MNEMONIC ||
    process.env.DC_WALLET;

  if (!mnemonic) {
    const error = new Error(
      "Server misconfigured: DRAGONSHORDE_ADMIN_MNEMONIC, DEPTHS_XP_ADMIN_MNEMONIC, or DC_WALLET is required for Dragonshorde XP."
    );
    error.status = 500;
    throw error;
  }

  return algosdk.mnemonicToSecretKey(mnemonic);
}

function getExistingDarkCoinReward(run, { appId, assetId, decimals, walletAddress }) {
  const amountAtomic = run?.darkCoinRewardAmountAtomic;
  if (!amountAtomic) return null;

  return {
    status: run.darkCoinRewardStatus || "granted",
    appId,
    assetId,
    decimals,
    walletAddress,
    amountAtomic: String(amountAtomic),
    amountDisplay: run.darkCoinRewardAmountDisplay || formatAtomicAmount(amountAtomic, decimals),
    tierId: run.darkCoinRewardTierId || "",
    label: run.darkCoinRewardLabel || "Depths Reward",
    basisPoints: Number(run.darkCoinRewardBasisPoints || 0),
    percentDisplay: run.darkCoinRewardPercentDisplay || formatBasisPoints(run.darkCoinRewardBasisPoints || 0),
    contractBalanceAtomic: String(run.darkCoinRewardContractBalanceAtomic || "0"),
    grantTxId: run.darkCoinRewardGrantTxId || null,
    claimTxId: run.darkCoinClaimTxId || null,
  };
}

async function loadEligibleRun({ runId, runToken, requestedChampionAssetId }) {
  const runRef = db.collection("depthsRuns").doc(String(runId));
  const runSnap = await runRef.get();

  if (!runSnap.exists) {
    const error = new Error("Depths run was not found.");
    error.status = 404;
    throw error;
  }

  const run = runSnap.data() || {};
  requireRunWriteToken(run, runToken);

  const championAssetId = normalizeAssetId(run.championAssetId);
  const requestChampionAssetId = requestedChampionAssetId
    ? normalizeAssetId(requestedChampionAssetId)
    : championAssetId;

  if (!championAssetId || !requestChampionAssetId || championAssetId !== requestChampionAssetId) {
    const error = new Error("Champion asset id does not match this Depths run.");
    error.status = 400;
    throw error;
  }

  if (run.status !== "completed") {
    const error = new Error("Depths run is not marked completed.");
    error.status = 400;
    throw error;
  }

  if (!isFinalMapNode(run)) {
    const error = new Error("Depths run did not end on the final map node.");
    error.status = 400;
    throw error;
  }

  await verifyLastBattle(runId, run, championAssetId);

  const walletAddress = validateAddress(run.activeAddress, "Depths run wallet address");
  const stillHoldsChampion = await walletHoldsAsset(walletAddress, championAssetId);

  if (!stillHoldsChampion) {
    const error = new Error("Reward wallet no longer holds the champion NFT for this run.");
    error.status = 403;
    throw error;
  }

  const serverRewardProof = createRewardProof({
    runId,
    championAssetId,
    walletAddress,
    lastBattleId: run.lastBattleId,
    currentNodeId: run.currentNodeId,
  });

  if (run.serverRewardEligible !== true || run.serverRewardProof !== serverRewardProof) {
    await runRef.update({
      serverRewardEligible: true,
      serverRewardProof,
      serverRewardVerifiedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  return { runRef, run, championAssetId, walletAddress, serverRewardProof };
}

async function lockDarkCoinGrant({
  runRef,
  runId,
  roll,
  appId,
  assetId,
  decimals,
  walletAddress,
  championAssetId,
  serverRewardProof,
}) {
  let existingReward = null;
  let grantRoll = roll;

  await db.runTransaction(async (transaction) => {
    const freshSnap = await transaction.get(runRef);
    if (!freshSnap.exists) {
      const error = new Error("Depths run was not found during reward lock.");
      error.status = 404;
      throw error;
    }

    const fresh = freshSnap.data() || {};
    existingReward = getExistingDarkCoinReward(fresh, { appId, assetId, decimals, walletAddress });

    if (fresh.darkCoinRewardStatus === "claimed" || fresh.darkCoinClaimTxId) return;
    if (fresh.darkCoinRewardStatus === "granted" || fresh.darkCoinRewardGrantTxId) return;

    if (fresh.darkCoinRewardStatus === "granting") {
      const error = new Error("Depths Dark Coin reward is already being granted.");
      error.status = 409;
      throw error;
    }

    if (
      fresh.status !== "completed" ||
      fresh.serverRewardEligible !== true ||
      fresh.serverRewardProof !== serverRewardProof
    ) {
      const error = new Error("Depths run is no longer reward eligible.");
      error.status = 400;
      throw error;
    }

    if (existingReward) {
      grantRoll = {
        tierId: existingReward.tierId,
        label: existingReward.label,
        basisPoints: existingReward.basisPoints,
        percentDisplay: existingReward.percentDisplay,
        amountAtomic: existingReward.amountAtomic,
        amountDisplay: existingReward.amountDisplay,
        contractBalanceAtomic: existingReward.contractBalanceAtomic,
      };
    } else {
      existingReward = null;
    }

    transaction.update(runRef, {
      darkCoinRewardStatus: "granting",
      darkCoinRewardAssetId: assetId,
      darkCoinRewardAppId: appId,
      darkCoinRewardWalletAddress: walletAddress,
      darkCoinRewardTierId: grantRoll.tierId,
      darkCoinRewardLabel: grantRoll.label,
      darkCoinRewardBasisPoints: grantRoll.basisPoints,
      darkCoinRewardPercentDisplay: grantRoll.percentDisplay,
      darkCoinRewardAmountAtomic: grantRoll.amountAtomic,
      darkCoinRewardAmountDisplay: grantRoll.amountDisplay,
      darkCoinRewardContractBalanceAtomic: grantRoll.contractBalanceAtomic,
      darkCoinRewardGrantStartedAt: serverTimestamp(),
      rewardStatus: "darkcoin_granting",
      updatedAt: serverTimestamp(),
    });

    transaction.set(
      db.collection("depthsRewardClaims").doc(String(runId)),
      {
        runId: String(runId),
        status: "darkcoin_granting",
        championAssetId,
        walletAddress,
        appId,
        assetId,
        reward: grantRoll,
        requestedAt: serverTimestamp(),
      },
      { merge: true }
    );
  });

  return { existingReward, grantRoll };
}

async function submitGrantDarkCoinCall({ appId, walletAddress, assetId, amountAtomic }) {
  const amountNumber = Number(amountAtomic);
  if (!Number.isSafeInteger(amountNumber) || BigInt(amountNumber) !== BigInt(String(amountAtomic))) {
    const error = new Error("Depths Dark Coin reward amount is too large to encode safely.");
    error.status = 500;
    throw error;
  }

  const algod = new algosdk.Algodv2("", ALGOD_BASE, 443);
  await assertDepthsRewardAppSupportsMethods(algod, appId);

  const signer = getRewardSigner();
  const signerAddress = String(signer.addr);
  const suggestedParams = await algod.getTransactionParams().do();
  const appArgs = [
    new Uint8Array(Buffer.from("grantDarkCoin")),
    algosdk.encodeUint64(amountNumber),
  ];
  const walletBoxReference = makeAccountBoxReference(walletAddress);

  const txn = algosdk.makeApplicationNoOpTxnFromObject({
    sender: signerAddress,
    appIndex: appId,
    suggestedParams,
    appArgs,
    accounts: [walletAddress],
    foreignAssets: [assetId],
    boxes: [walletBoxReference],
    convertToAccess: false,
  });
  assertAppCallHasBoxReference(txn, walletBoxReference, "Depths Dark Coin grant");

  const signedTxn = txn.signTxn(signer.sk);
  assertSignedTxnHasBoxReference(signedTxn, walletBoxReference, "Depths Dark Coin grant");
  let txId = null;

  try {
    await simulateSignedTransactionOrThrow(algod, signedTxn, "Depths Dark Coin grant");
    const sendResult = await algod.sendRawTransaction(signedTxn).do();
    txId = sendResult?.txid || sendResult?.txId || txn.txID();
    const confirmed = await algosdk.waitForConfirmation(algod, txId, 4);

    return {
      txId,
      confirmedRound: Number(confirmed?.confirmedRound || confirmed?.["confirmed-round"] || 0) || null,
      signer: signerAddress,
    };
  } catch (error) {
    error.txId = txId;
    error.signer = signerAddress;
    throw error;
  }
}

async function recordDarkCoinClaim(body) {
  const runId = String(body.runId || "").trim();
  const runToken = String(body.runToken || "").trim();
  const txId = String(body.txId || body.claimTxId || "").trim();

  if (!runId) {
    const error = new Error("runId is required.");
    error.status = 400;
    throw error;
  }
  if (!txId) {
    const error = new Error("claim txId is required.");
    error.status = 400;
    throw error;
  }

  const runRef = db.collection("depthsRuns").doc(runId);
  const runSnap = await runRef.get();
  if (!runSnap.exists) {
    const error = new Error("Depths run was not found.");
    error.status = 404;
    throw error;
  }

  const run = runSnap.data() || {};
  requireRunWriteToken(run, runToken);

  const walletAddress = validateAddress(run.activeAddress, "Depths run wallet address");

  await runRef.update({
    darkCoinRewardStatus: "claimed",
    darkCoinClaimTxId: txId,
    darkCoinClaimedAt: serverTimestamp(),
    rewardStatus: "darkcoin_claimed",
    rewardTxId: txId,
    updatedAt: serverTimestamp(),
  });

  await db.collection("depthsRewardClaims").doc(runId).set(
    {
      runId,
      status: "darkcoin_claimed",
      walletAddress,
      claimTxId: txId,
      claimedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return {
    status: "claimed",
    runId,
    walletAddress,
    claimTxId: txId,
  };
}

async function loadRunForXpFinalization({ runId, runToken, requestedChampionAssetId }) {
  const runRef = db.collection("depthsRuns").doc(String(runId));
  const runSnap = await runRef.get();

  if (!runSnap.exists) {
    const error = new Error("Depths run was not found.");
    error.status = 404;
    throw error;
  }

  const run = runSnap.data() || {};
  requireRunWriteToken(run, runToken);

  const championAssetId = normalizeAssetId(run.championAssetId);
  const requestChampionAssetId = requestedChampionAssetId
    ? normalizeAssetId(requestedChampionAssetId)
    : championAssetId;

  if (!championAssetId || !requestChampionAssetId || championAssetId !== requestChampionAssetId) {
    const error = new Error("Champion asset id does not match this Depths run.");
    error.status = 400;
    throw error;
  }

  if (!["completed", "defeated", "abandoned"].includes(String(run.status || ""))) {
    const error = new Error("Depths run is not ended yet.");
    error.status = 400;
    throw error;
  }

  const walletAddress = validateAddress(run.activeAddress, "Depths run wallet address");
  const stillHoldsChampion = await walletHoldsAsset(walletAddress, championAssetId);

  if (!stillHoldsChampion) {
    const error = new Error("Depths XP wallet no longer holds the champion NFT for this run.");
    error.status = 403;
    throw error;
  }

  return { runRef, run, championAssetId, walletAddress };
}

function normalizeDepthsBattleNodeType(type) {
  const value = String(type || "").trim().toLowerCase();
  if (value === "elite") return "elite";
  if (value === "basic" || value === "encounter") return "basic";
  return "";
}

function getDepthsBattleNodeQueue(run = {}) {
  const nodes = Array.isArray(run?.depthsMap?.nodes) ? run.depthsMap.nodes : [];
  const visited = new Set(Array.isArray(run?.visitedNodeIds) ? run.visitedNodeIds.map(String) : []);
  return nodes
    .filter((node) => visited.has(String(node?.id || "")))
    .filter((node) => normalizeDepthsBattleNodeType(node?.type))
    .sort((a, b) => {
      const depthA = Number(a?.depth || 0);
      const depthB = Number(b?.depth || 0);
      if (depthA !== depthB) return depthA - depthB;
      return String(a?.id || "").localeCompare(String(b?.id || ""));
    });
}

function getBattleSortValue(battle = {}, fallbackIndex = 0) {
  const room = Number(battle.room || battle.snapshot?.room || 0);
  if (Number.isFinite(room) && room > 0) return room * 100000 + fallbackIndex;
  const createdAt = battle.createdAt || battle.startedAt || battle.updatedAt || null;
  if (createdAt && typeof createdAt.toMillis === "function") return createdAt.toMillis();
  return fallbackIndex;
}

function getBattleNodeTypeForXp(battle = {}, nodeQueue = [], usedNodeIds = new Set()) {
  const explicitType = normalizeDepthsBattleNodeType(
    battle.currentNodeType || battle.nodeType || battle.snapshot?.currentNodeType
  );
  if (explicitType) return explicitType;

  const explicitNodeId = String(battle.currentNodeId || battle.nodeId || battle.snapshot?.currentNodeId || "").trim();
  if (explicitNodeId) {
    const node = nodeQueue.find((entry) => String(entry?.id || "") === explicitNodeId);
    const nodeType = normalizeDepthsBattleNodeType(node?.type);
    if (nodeType) {
      usedNodeIds.add(explicitNodeId);
      return nodeType;
    }
  }

  const room = Math.max(0, Math.round(Number(battle.room || battle.snapshot?.room || 0)));
  const byRoom = room ? nodeQueue[room - 1] : null;
  const byRoomType = normalizeDepthsBattleNodeType(byRoom?.type);
  if (byRoomType) {
    usedNodeIds.add(String(byRoom?.id || ""));
    return byRoomType;
  }

  const nextUnused = nodeQueue.find((node) => !usedNodeIds.has(String(node?.id || "")));
  const nextType = normalizeDepthsBattleNodeType(nextUnused?.type);
  if (nextType) {
    usedNodeIds.add(String(nextUnused?.id || ""));
    return nextType;
  }

  return "basic";
}

async function getDepthsXpBreakdown(runId, championAssetId, run = {}) {
  const battlesSnap = await db.collection("depthsBattles").where("runId", "==", String(runId)).get();
  const completedBattles = [];

  battlesSnap.forEach((docSnap) => {
    const battle = docSnap.data() || {};
    if (battle.status !== "complete") return;
    if (battle.winner !== "champion") return;
    if (battle.serverBattleVerified !== true) return;
    if (battle.serverVerifiedWinner !== "champion") return;
    if (normalizeAssetId(battle.championAssetId) !== championAssetId) return;
    completedBattles.push({ id: docSnap.id, battle });
  });

  completedBattles.sort((a, b) => getBattleSortValue(a.battle) - getBattleSortValue(b.battle));

  const nodeQueue = getDepthsBattleNodeQueue(run);
  const usedNodeIds = new Set();
  let regularEncounters = 0;
  let eliteEncounters = 0;

  completedBattles.forEach(({ battle }) => {
    const nodeType = getBattleNodeTypeForXp(battle, nodeQueue, usedNodeIds);
    if (nodeType === "elite") eliteEncounters += 1;
    else regularEncounters += 1;
  });

  const regularEncounterXp = regularEncounters * DEPTHS_REGULAR_ENCOUNTER_XP;
  const eliteEncounterXp = eliteEncounters * DEPTHS_ELITE_ENCOUNTER_XP;
  const completionBonusXp = String(run?.status || "") === "completed" ? DEPTHS_COMPLETION_BONUS_XP : 0;
  const totalXp = regularEncounterXp + eliteEncounterXp + completionBonusXp;

  return {
    regularEncounters,
    eliteEncounters,
    regularEncounterXp,
    eliteEncounterXp,
    completionBonusXp,
    totalXp,
    completedEncounters: regularEncounters + eliteEncounters,
    regularEncounterXpEach: DEPTHS_REGULAR_ENCOUNTER_XP,
    eliteEncounterXpEach: DEPTHS_ELITE_ENCOUNTER_XP,
    completionBonusXpEach: DEPTHS_COMPLETION_BONUS_XP,
  };
}

function buildDragonshordeXpBoxName(championAssetId) {
  return new Uint8Array([
    ...algosdk.encodeUint64(Number(championAssetId)),
    ...new Uint8Array(Buffer.from("xp")),
  ]);
}

async function submitDragonshordeXpCall({ championAssetId, xpAmount }) {
  const amount = Number(xpAmount);
  const appId = getDragonshordeAppId();

  if (!appId) {
    const error = new Error("Server misconfigured: Dragonshorde app id is required.");
    error.status = 500;
    throw error;
  }

  if (!Number.isSafeInteger(amount) || amount <= 0) {
    return null;
  }

  const algod = new algosdk.Algodv2("", ALGOD_BASE, 443);
  const signer = getDragonshordeSigner();
  const signerAddress = String(signer.addr);
  const suggestedParams = await algod.getTransactionParams().do();
  const txn = algosdk.makeApplicationNoOpTxnFromObject({
    sender: signerAddress,
    appIndex: appId,
    suggestedParams,
    appArgs: [
      new Uint8Array(Buffer.from("grantXp")),
      algosdk.encodeUint64(amount),
    ],
    foreignAssets: [Number(championAssetId)],
    boxes: [{ appIndex: 0, name: buildDragonshordeXpBoxName(championAssetId) }],
  });

  const signedTxn = txn.signTxn(signer.sk);
  let txId = null;

  try {
    const sendResult = await algod.sendRawTransaction(signedTxn).do();
    txId = sendResult?.txid || sendResult?.txId || txn.txID();
    const confirmed = await algosdk.waitForConfirmation(algod, txId, 4);

    return {
      txId,
      confirmedRound: Number(confirmed?.confirmedRound || confirmed?.["confirmed-round"] || 0) || null,
      signer: signerAddress,
      appId,
    };
  } catch (error) {
    error.txId = txId;
    error.signer = signerAddress;
    throw error;
  }
}

async function finalizeDepthsRunXp(body) {
  const runId = String(body.runId || "").trim();
  const runToken = String(body.runToken || "").trim();

  if (!runId) {
    const error = new Error("runId is required.");
    error.status = 400;
    throw error;
  }
  if (!runToken) {
    const error = new Error("runToken is required.");
    error.status = 400;
    throw error;
  }

  const { runRef, run, championAssetId, walletAddress } = await loadRunForXpFinalization({
    runId,
    runToken,
    requestedChampionAssetId: body.championAssetId,
  });

  if (run.depthsXpStatus === "granted" || run.depthsXpGrantTxId) {
    return {
      status: run.depthsXpStatus || "granted",
      runId,
      championAssetId,
      walletAddress,
      xpAmount: Number(run.depthsXpAmount || 0),
      xpBreakdown: run.depthsXpBreakdown || null,
      breakdown: run.depthsXpBreakdown || null,
      xpTxId: run.depthsXpGrantTxId || null,
    };
  }

  const xpBreakdown = await getDepthsXpBreakdown(runId, championAssetId, run);
  const xpAmount = xpBreakdown.totalXp;

  if (xpAmount <= 0) {
    await runRef.update({
      depthsXpStatus: "none",
      depthsXpAmount: 0,
      depthsXpBreakdown: xpBreakdown,
      updatedAt: serverTimestamp(),
    });
    return {
      status: "none",
      runId,
      championAssetId,
      walletAddress,
      xpAmount: 0,
      xpBreakdown,
      breakdown: xpBreakdown,
    };
  }

  let alreadyGranted = null;

  await db.runTransaction(async (transaction) => {
    const freshSnap = await transaction.get(runRef);
    if (!freshSnap.exists) {
      const error = new Error("Depths run was not found during XP lock.");
      error.status = 404;
      throw error;
    }

    const fresh = freshSnap.data() || {};
    if (fresh.depthsXpStatus === "granted" || fresh.depthsXpGrantTxId) {
      alreadyGranted = {
        xpAmount: Number(fresh.depthsXpAmount || 0),
        xpBreakdown: fresh.depthsXpBreakdown || null,
        xpTxId: fresh.depthsXpGrantTxId || null,
      };
      return;
    }

    if (fresh.depthsXpStatus === "granting") {
      const error = new Error("Depths XP is already being granted for this run.");
      error.status = 409;
      throw error;
    }

    transaction.update(runRef, {
      depthsXpStatus: "granting",
      depthsXpAmount: xpAmount,
      depthsXpBreakdown: xpBreakdown,
      depthsXpGrantStartedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  if (alreadyGranted) {
    return {
      status: "granted",
      runId,
      championAssetId,
      walletAddress,
      xpAmount: alreadyGranted.xpAmount,
      xpBreakdown: alreadyGranted.xpBreakdown,
      breakdown: alreadyGranted.xpBreakdown,
      xpTxId: alreadyGranted.xpTxId,
    };
  }

  try {
    const xpTx = await submitDragonshordeXpCall({ championAssetId, xpAmount });

    await runRef.update({
      depthsXpStatus: "granted",
      depthsXpAmount: xpAmount,
      depthsXpBreakdown: xpBreakdown,
      depthsXpGrantTxId: xpTx?.txId || null,
      depthsXpGrantConfirmedRound: xpTx?.confirmedRound || null,
      depthsXpSigner: xpTx?.signer || null,
      depthsXpGrantedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      status: "granted",
      runId,
      championAssetId,
      walletAddress,
      xpAmount,
      xpBreakdown,
      breakdown: xpBreakdown,
      xpTxId: xpTx?.txId || null,
      xpConfirmedRound: xpTx?.confirmedRound || null,
    };
  } catch (error) {
    await runRef.update({
      depthsXpStatus: "grant_failed",
      depthsXpAmount: xpAmount,
      depthsXpBreakdown: xpBreakdown,
      depthsXpError: error?.message || "Depths XP grant failed.",
      depthsXpFailedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    throw error;
  }
}

async function grantDarkCoinReward(body) {
  const runId = String(body.runId || "").trim();
  const runToken = String(body.runToken || "").trim();
  const appId = getDepthsAppId();
  const assetId = getDarkCoinAssetId();
  const decimals = getDarkCoinDecimals();

  if (!runId) {
    const error = new Error("runId is required.");
    error.status = 400;
    throw error;
  }
  if (!runToken) {
    const error = new Error("runToken is required.");
    error.status = 400;
    throw error;
  }
  if (!appId) {
    const error = new Error("Server misconfigured: DEPTHS_APP_ID or NEXT_PUBLIC_DEPTHS_APP_ID is required.");
    error.status = 500;
    throw error;
  }

  const { runRef, run, championAssetId, walletAddress, serverRewardProof } = await loadEligibleRun({
    runId,
    runToken,
    requestedChampionAssetId: body.championAssetId,
  });

  const existingReward = getExistingDarkCoinReward(run, { appId, assetId, decimals, walletAddress });
  if (
    existingReward &&
    (existingReward.status === "granted" ||
      existingReward.status === "claimed" ||
      existingReward.grantTxId ||
      existingReward.claimTxId)
  ) {
    return {
      status: existingReward.status || "granted",
      runId,
      championAssetId,
      walletAddress,
      darkCoinReward: existingReward,
    };
  }

  const contractBalanceAtomic = await getAppAssetBalance(appId, assetId);
  const roll = existingReward
    ? {
        tierId: existingReward.tierId,
        label: existingReward.label,
        basisPoints: existingReward.basisPoints,
        percentDisplay: existingReward.percentDisplay,
        amountAtomic: existingReward.amountAtomic,
        amountDisplay: existingReward.amountDisplay,
        contractBalanceAtomic: existingReward.contractBalanceAtomic,
      }
    : rollDarkCoinReward(contractBalanceAtomic, decimals);

  const locked = await lockDarkCoinGrant({
    runRef,
    runId,
    roll,
    appId,
    assetId,
    decimals,
    walletAddress,
    championAssetId,
    serverRewardProof,
  });

  if (
    locked.existingReward &&
    (locked.existingReward.status === "granted" ||
      locked.existingReward.status === "claimed" ||
      locked.existingReward.grantTxId ||
      locked.existingReward.claimTxId)
  ) {
    return {
      status: locked.existingReward.status || "granted",
      runId,
      championAssetId,
      walletAddress,
      darkCoinReward: locked.existingReward,
    };
  }

  try {
    const grantTx = await submitGrantDarkCoinCall({
      appId,
      walletAddress,
      assetId,
      amountAtomic: locked.grantRoll.amountAtomic,
    });

    const darkCoinReward = {
      status: "granted",
      appId,
      assetId,
      decimals,
      walletAddress,
      ...locked.grantRoll,
      grantTxId: grantTx.txId,
      grantConfirmedRound: grantTx.confirmedRound,
    };

    await runRef.update({
      darkCoinRewardStatus: "granted",
      darkCoinRewardGrantTxId: grantTx.txId,
      darkCoinRewardGrantConfirmedRound: grantTx.confirmedRound,
      darkCoinRewardSigner: grantTx.signer,
      darkCoinRewardGrantedAt: serverTimestamp(),
      rewardStatus: "darkcoin_granted",
      updatedAt: serverTimestamp(),
    });

    await db.collection("depthsRewardClaims").doc(String(runId)).set(
      {
        runId,
        status: "darkcoin_granted",
        championAssetId,
        walletAddress,
        appId,
        assetId,
        reward: locked.grantRoll,
        grantTxId: grantTx.txId,
        grantConfirmedRound: grantTx.confirmedRound,
        rewardSigner: grantTx.signer,
        grantedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return {
      status: "granted",
      runId,
      championAssetId,
      walletAddress,
      darkCoinReward,
    };
  } catch (error) {
    await runRef.update({
      darkCoinRewardStatus: "grant_failed",
      darkCoinRewardError: error?.message || "Depths Dark Coin reward grant failed.",
      darkCoinRewardFailedAt: serverTimestamp(),
      rewardStatus: "darkcoin_grant_failed",
      updatedAt: serverTimestamp(),
    });

    await db.collection("depthsRewardClaims").doc(String(runId)).set(
      {
        runId,
        status: "darkcoin_grant_failed",
        championAssetId,
        walletAddress,
        appId,
        assetId,
        reward: locked.grantRoll,
        grantTxId: error?.txId || null,
        rewardSigner: error?.signer || null,
        error: error?.message || "Depths Dark Coin reward grant failed.",
        failedAt: serverTimestamp(),
      },
      { merge: true }
    );

    throw error;
  }
}

async function claimDepthsReward(req, res) {
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
    const action = String(body.action || "grantDarkCoin").trim();

    if (action === "recordDarkCoinClaim") {
      return sendJson(res, 200, await recordDarkCoinClaim(body));
    }

    if (action === "finalizeRunXp") {
      return sendJson(res, 200, await finalizeDepthsRunXp(body));
    }

    if (action === "getRewardOdds") {
      return sendJson(res, 200, await getDepthsRewardOdds());
    }

    if (action !== "grantDarkCoin") {
      return sendJson(res, 400, { error: "Invalid Depths reward action." });
    }

    return sendJson(res, 200, await grantDarkCoinReward(body));
  } catch (error) {
    console.error("claimDepthsReward failed:", error);
    return sendJson(res, error.status || 500, {
      error: error?.message || "Failed to process Depths reward.",
    });
  }
}

export default claimDepthsReward;
