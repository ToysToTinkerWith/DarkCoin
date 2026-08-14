import NextCors from "nextjs-cors";
import algosdk from "algosdk";
import crypto from "crypto";
import admin from "../../../Firebase/FirebaseAdmin";

const INDEXER_BASE = "https://mainnet-idx.algonode.cloud";
const DEFAULT_AUTHORIZED_EMAIL = "abergquist96@gmail.com";

const db = admin.firestore();
const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;

function splitEnvList(value) {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function sendJson(res, status, payload) {
  res.status(status);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.send(JSON.stringify(payload));
}

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  return req.body;
}

function getBearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization || "";
  const [scheme, token] = String(header).split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return "";
  return token.trim();
}

function getAuthorizedFirebaseEmails() {
  return new Set(
    [
      DEFAULT_AUTHORIZED_EMAIL,
      ...splitEnvList(process.env.DEPTHS_REWARD_AUTHORIZED_EMAILS),
      ...splitEnvList(process.env.AUTHORIZED_FIREBASE_EMAILS),
    ].map((email) => email.toLowerCase())
  );
}

function getAuthorizedFirebaseUids() {
  return new Set([
    ...splitEnvList(process.env.DEPTHS_REWARD_AUTHORIZED_UIDS),
    ...splitEnvList(process.env.AUTHORIZED_FIREBASE_UIDS),
  ]);
}

async function requireAuthorizedFirebaseAccount(req) {
  const token = getBearerToken(req);
  if (!token) {
    const error = new Error("Missing Firebase bearer token.");
    error.status = 401;
    throw error;
  }

  const decoded = await admin.auth().verifyIdToken(token);
  const email = String(decoded.email || "").toLowerCase();
  const uid = String(decoded.uid || "");
  const emailAllowed = email && getAuthorizedFirebaseEmails().has(email);
  const uidAllowed = uid && getAuthorizedFirebaseUids().has(uid);

  if (!emailAllowed && !uidAllowed) {
    const error = new Error("Firebase account is not authorized to verify Depths completions.");
    error.status = 403;
    throw error;
  }

  return decoded;
}

function normalizeAssetId(value) {
  const assetId = Number(value);
  return Number.isSafeInteger(assetId) && assetId > 0 ? assetId : 0;
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

function getDepthsCreatorMnemonic() {
  return String(process.env.CREATOR_MNEMONIC || process.env.DEPTHS_CREATOR_MNEMONIC || "").trim();
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
    const holding = assets.find((asset) => Number(asset.assetId) === Number(assetId));

    if (holding && BigInt(holding.amount || 0) > 0n) return true;
    nextToken = response?.nextToken;
  } while (nextToken);

  return false;
}

async function verifyDepthsCompletion(req, res) {
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
    const decoded = await requireAuthorizedFirebaseAccount(req);
    const body = parseBody(req);
    const runId = String(body.runId || "").trim();
    if (!runId) return sendJson(res, 400, { error: "runId is required." });

    const runRef = db.collection("depthsRuns").doc(runId);
    const runSnap = await runRef.get();
    if (!runSnap.exists) return sendJson(res, 404, { error: "Depths run was not found." });

    const run = runSnap.data() || {};
    const championAssetId = normalizeAssetId(run.championAssetId);
    const walletAddress = validateAddress(run.activeAddress, "Depths run wallet address");

    if (!championAssetId) return sendJson(res, 400, { error: "Depths run is missing championAssetId." });
    if (run.status !== "completed") return sendJson(res, 400, { error: "Depths run is not completed." });
    if (!isFinalMapNode(run)) return sendJson(res, 400, { error: "Depths run did not end on the final map node." });

    await verifyLastBattle(runId, run, championAssetId);

    const stillHoldsChampion = await walletHoldsAsset(walletAddress, championAssetId);
    if (!stillHoldsChampion) {
      return sendJson(res, 403, { error: "Reward wallet no longer holds the champion NFT for this run." });
    }

    const serverRewardProof = createRewardProof({
      runId,
      championAssetId,
      walletAddress,
      lastBattleId: run.lastBattleId,
      currentNodeId: run.currentNodeId,
    });

    await runRef.update({
      serverRewardEligible: true,
      serverRewardProof,
      serverRewardVerifiedAt: serverTimestamp(),
      serverRewardVerifiedByUid: decoded.uid || null,
      serverRewardVerifiedByEmail: decoded.email || null,
      rewardStatus: run.rewardStatus || "eligible",
      updatedAt: serverTimestamp(),
    });

    return sendJson(res, 200, {
      status: "verified",
      runId,
      championAssetId,
      walletAddress,
    });
  } catch (error) {
    console.error("verifyDepthsCompletion failed:", error);
    return sendJson(res, error.status || 500, {
      error: error?.message || "Failed to verify Depths completion.",
    });
  }
}

export default verifyDepthsCompletion;
