import NextCors from "nextjs-cors";
import crypto from "crypto";
import admin from "../../../Firebase/FirebaseAdmin";

const db = admin.firestore();
const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;

const RUN_COLLECTION = "depthsRuns";
const BATTLE_COLLECTION = "depthsBattles";
const ENDED_RUN_STATUSES = new Set(["completed", "defeated", "abandoned"]);
const PERA_TX_EXPLORER_BASE = "https://explorer.perawallet.app/tx";

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

function requireString(value, fieldName) {
  const text = String(value || "").trim();
  if (!text) {
    const error = new Error(`${fieldName} is required.`);
    error.status = 400;
    throw error;
  }
  return text;
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

function getDepthsBattleWebhookUrl() {
  return (
    process.env.DEPTHS_BATTLE_DISCORD_WEBHOOK ||
    process.env.DEPTHS_DISCORD_WEBHOOK ||
    process.env.DISCORD_DEPTHS_BATTLE_WEBHOOK ||
    ""
  );
}

function getRequestOrigin(req) {
  const host = req.headers["x-forwarded-host"] || req.headers.host || "";
  if (!host) return "";
  const proto = String(req.headers["x-forwarded-proto"] || "https").split(",")[0];
  return `${proto}://${host}`;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function formatHp(entity = {}) {
  const hp = Math.max(0, Math.round(safeNumber(entity.hp, 0)));
  const maxHp = Math.max(1, Math.round(safeNumber(entity.maxHp, 1)));
  return `${hp}/${maxHp} HP`;
}

function extractUrl(value) {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    for (const entry of value) {
      const url = extractUrl(entry);
      if (url) return url;
    }
    return "";
  }
  if (typeof value === "object") {
    return extractUrl(value.url || value.src || value.imageUrl || value.frameUrl);
  }
  return "";
}

function normalizeUrl(value, origin) {
  const url = extractUrl(value);
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/") && origin) return `${origin}${url}`;
  return "";
}

function getEntityFrame(entity = {}, origin = "") {
  return normalizeUrl(
    entity.idleFrame ||
      entity.idleFrames ||
      entity.standingUrl ||
      entity.imageUrl ||
      entity.fallbackImageUrl,
    origin
  );
}

function getMoveFrame(killingBlow = {}, origin = "") {
  return normalizeUrl(
    killingBlow.cardFrame ||
      killingBlow.moveFrame ||
      killingBlow.cardFrames?.[2] ||
      killingBlow.moveFrames?.[2] ||
      killingBlow.cardFrames?.[0] ||
      killingBlow.moveFrames?.[0] ||
      killingBlow.cardImageUrl ||
      killingBlow.moveImageUrl,
    origin
  );
}

function pickMonsterForResult(snapshot = {}, killingBlow = {}, winner = "") {
  const monsters = asArray(snapshot.monsters);
  if (!monsters.length) return snapshot.monster || {};

  const side =
    winner === "champion"
      ? killingBlow.targetSide
      : winner === "monster"
      ? killingBlow.actorSide
      : killingBlow.targetSide || killingBlow.actorSide;

  return monsters.find((monster) => monster.side === side) || monsters.find((monster) => safeNumber(monster.hp, 0) <= 0) || monsters[0];
}

function normalizeAssetId(value) {
  const assetId = Number(value);
  return Number.isSafeInteger(assetId) && assetId > 0 ? assetId : 0;
}

function getTimestampMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  const date = new Date(value);
  const millis = date.getTime();
  return Number.isFinite(millis) ? millis : 0;
}

function getBattleSortValue(battle = {}, fallbackIndex = 0) {
  const room = safeNumber(battle.room || battle.snapshot?.room, 0);
  if (room > 0) return room * 100000 + fallbackIndex;
  return (
    getTimestampMillis(battle.completedAt) ||
    getTimestampMillis(battle.updatedAt) ||
    getTimestampMillis(battle.createdAt) ||
    fallbackIndex
  );
}

async function loadFinalRunBattle(run = {}, runId = "") {
  const lastBattleId = String(run.lastBattleId || "").trim();
  if (lastBattleId) {
    const battleSnap = await db.collection(BATTLE_COLLECTION).doc(lastBattleId).get();
    if (battleSnap.exists) {
      const battle = battleSnap.data() || {};
      if (String(battle.runId || "") === String(runId)) {
        return { id: battleSnap.id, ...battle };
      }
    }
  }

  const battlesSnap = await db.collection(BATTLE_COLLECTION).where("runId", "==", String(runId)).get();
  const battles = [];
  battlesSnap.forEach((docSnap) => {
    const battle = docSnap.data() || {};
    if (battle.status === "complete") battles.push({ id: docSnap.id, ...battle });
  });
  battles.sort((a, b) => getBattleSortValue(a) - getBattleSortValue(b));
  return battles[battles.length - 1] || null;
}

function getRunChampionSnapshot(run = {}, battle = null) {
  return (
    battle?.snapshot?.champion ||
    battle?.championRunSnapshot ||
    run.championBattleSnapshot ||
    run.championSnapshot ||
    run.selectedChampion ||
    {}
  );
}

function getRunDarkCoinReward(run = {}) {
  const status = String(run.darkCoinRewardStatus || run.rewardStatus || "").trim();
  const amountAtomic = String(run.darkCoinRewardAmountAtomic || "").trim();
  const amountDisplay = String(run.darkCoinRewardAmountDisplay || "").trim();
  if (!amountAtomic && !amountDisplay && !status) return null;

  return {
    status,
    label: run.darkCoinRewardLabel || "",
    tierId: run.darkCoinRewardTierId || "",
    basisPoints: run.darkCoinRewardBasisPoints || null,
    percentDisplay: run.darkCoinRewardPercentDisplay || "",
    amountAtomic,
    amountDisplay,
    grantTxId: run.darkCoinRewardGrantTxId || "",
    claimTxId: run.darkCoinClaimTxId || "",
  };
}

function getRunXpReward(run = {}) {
  const amount = Number(run.depthsXpAmount || 0);
  return {
    amount: Number.isFinite(amount) ? amount : 0,
    status: run.depthsXpStatus || "",
    breakdown: run.depthsXpBreakdown || null,
    txId: run.depthsXpGrantTxId || "",
  };
}

function getPeraExplorerTxUrl(txId = "") {
  const normalized = String(txId || "").trim();
  if (!normalized) return "";
  return `${PERA_TX_EXPLORER_BASE}/${encodeURIComponent(normalized)}/`;
}

function formatTransactionLink(label, txId = "") {
  const normalized = String(txId || "").trim();
  const url = getPeraExplorerTxUrl(normalized);
  if (!url) return "";
  return `${label}: [${normalized}](${url})`;
}

function formatDarkCoinReward(reward = null) {
  if (!reward) return "None";
  const amount = reward.amountDisplay || (reward.amountAtomic ? `${reward.amountAtomic} atomic` : "");
  const label = reward.label ? ` (${reward.label})` : "";
  const percent = reward.percentDisplay ? ` | ${reward.percentDisplay} roll` : "";
  const status = reward.status ? ` | ${reward.status}` : "";
  const txLinks = [
    formatTransactionLink("Grant TX", reward.grantTxId),
    formatTransactionLink("Claim TX", reward.claimTxId),
  ].filter(Boolean);
  const summary = amount ? `${amount} Dark Coin${label}${percent}${status}` : `Dark Coin reward ${reward.status || "pending"}`;
  return txLinks.length ? `${summary}\n${txLinks.join("\n")}` : summary;
}

function formatXpReward(xp = {}) {
  const amount = Math.max(0, Math.round(safeNumber(xp.amount, 0)));
  const status = xp.status ? ` | ${xp.status}` : "";
  const txLink = formatTransactionLink("XP TX", xp.txId);
  const summary = `${amount} XP${status}`;
  return txLink ? `${summary}\n${txLink}` : summary;
}

function getRunResultTitle(status = "") {
  if (status === "completed") return "The Depths Cleared";
  if (status === "defeated") return "Champion Defeated In The Depths";
  if (status === "abandoned") return "The Depths Run Abandoned";
  return "The Depths Run Ended";
}

function buildRunResultPayload({ run, runId, battle, origin }) {
  const status = String(run.status || "").trim();
  const snapshot = battle?.snapshot || {};
  const winner = status === "completed" ? "champion" : status === "defeated" ? "monster" : "abandoned";
  const killingBlow = battle?.killingBlow || snapshot.killingBlow || {};
  const champion = getRunChampionSnapshot(run, battle);
  const monster = battle ? pickMonsterForResult(snapshot, killingBlow, winner) : {};
  const reward = getRunDarkCoinReward(run);
  const xp = getRunXpReward(run);

  const championName = champion.name || run.championName || `Champion #${run.championAssetId || "?"}`;
  const monsterName = monster.name || asArray(battle?.monsterNames)[0] || "Depths Monster";
  const championFrame = getEntityFrame(champion, origin);
  const monsterFrame = getEntityFrame(monster, origin);
  const moveFrame = getMoveFrame(killingBlow, origin);
  const primaryImage =
    status === "completed"
      ? moveFrame || championFrame
      : status === "defeated"
      ? moveFrame || monsterFrame
      : championFrame;
  const killingMoveName = killingBlow.moveName || killingBlow.cardName || "Unknown card";
  const encounterCount = safeNumber(run.completedEncounters || run.depthsXpBreakdown?.completedEncounters, 0);

  const description =
    status === "completed"
      ? `**${championName}** cleared The Depths.`
      : status === "defeated"
      ? `**${monsterName}** defeated **${championName}** in The Depths.`
      : `**${championName}** abandoned The Depths.`;

  const fields = [
    { name: "Champion", value: `${championName}\nAsset #${run.championAssetId || champion.assetId || "-"}`, inline: true },
    { name: "Run Result", value: getRunResultTitle(status), inline: true },
    { name: "XP Reward", value: formatXpReward(xp), inline: true },
    { name: "Dark Coin Reward", value: formatDarkCoinReward(reward), inline: false },
  ];

  if (battle && status !== "abandoned") {
    fields.push(
      { name: championName, value: formatHp(snapshot.champion || champion), inline: true },
      { name: monsterName, value: formatHp(monster), inline: true },
      { name: "Final Move", value: killingMoveName, inline: true }
    );
  }

  if (encounterCount) {
    fields.push({ name: "Encounters Cleared", value: String(Math.round(encounterCount)), inline: true });
  }

  if (xp.breakdown) {
    const breakdown = xp.breakdown;
    fields.push({
      name: "XP Breakdown",
      value: [
        `Regular: ${Math.round(safeNumber(breakdown.regularEncounterXp, 0))}`,
        `Elite: ${Math.round(safeNumber(breakdown.eliteEncounterXp, 0))}`,
        `Completion: ${Math.round(safeNumber(breakdown.completionBonusXp, 0))}`,
      ].join(" | "),
      inline: false,
    });
  }

  const embeds = [
    {
      title: getRunResultTitle(status),
      description,
      color: status === "completed" ? 0xd6ad52 : status === "defeated" ? 0x8d1f1f : 0x777777,
      fields,
      ...(primaryImage ? { image: { url: primaryImage } } : {}),
      timestamp: new Date().toISOString(),
    },
  ];

  if (status === "completed" && reward?.amountDisplay) {
    embeds.push({
      title: "Dark Coin Reward",
      description: formatDarkCoinReward(reward),
      color: 0xd6ad52,
    });
  }

  return {
    username: "The Depths",
    content: description,
    embeds,
  };
}

function buildBattleResultEmbeds({ battle, origin }) {
  const snapshot = battle.snapshot || {};
  const killingBlow = battle.killingBlow || snapshot.killingBlow || {};
  const winner = battle.winner || snapshot.winner || "draw";
  const champion = snapshot.champion || {};
  const monster = pickMonsterForResult(snapshot, killingBlow, winner);

  const championName = champion.name || battle.championName || "Champion";
  const monsterName = monster.name || asArray(battle.monsterNames)[0] || "Depths Monster";
  const room = snapshot.room || battle.room || "-";
  const killingMoveName = killingBlow.moveName || killingBlow.cardName || "Unknown card";

  const championFrame = getEntityFrame(champion, origin);
  const monsterFrame = getEntityFrame(monster, origin);
  const moveFrame = getMoveFrame(killingBlow, origin);

  const resultText =
    winner === "champion"
      ? `**${championName}** defeated **${monsterName}** in Encounter ${room}.`
      : winner === "monster"
      ? `**${monsterName}** defeated **${championName}** in Encounter ${room}.`
      : `**${championName}** and **${monsterName}** fell together in Encounter ${room}.`;

  const embeds = [
    {
      title: "The Depths Battle Result",
      description: resultText,
      color: winner === "champion" ? 0xd6ad52 : winner === "monster" ? 0x8d1f1f : 0x777777,
      fields: [
        { name: championName, value: formatHp(champion), inline: true },
        { name: monsterName, value: formatHp(monster), inline: true },
        { name: "Killing Blow", value: killingMoveName, inline: false },
      ],
      ...(championFrame ? { thumbnail: { url: championFrame } } : {}),
      timestamp: new Date().toISOString(),
    },
  ];

  if (monsterFrame) {
    embeds.push({
      title: `Monster: ${monsterName}`,
      description: formatHp(monster),
      color: 0x8d1f1f,
      image: { url: monsterFrame },
    });
  }

  if (moveFrame) {
    embeds.push({
      title: `Killing Card: ${killingMoveName}`,
      description:
        killingBlow.damage || killingBlow.critical
          ? [`Damage ${Math.max(0, Math.round(safeNumber(killingBlow.damage, 0)))}`, killingBlow.critical ? "Critical hit" : ""]
              .filter(Boolean)
              .join(" | ")
          : "Final card animation frame.",
      color: 0xd6ad52,
      image: { url: moveFrame },
    });
  }

  if (championFrame) {
    embeds.push({
      title: `Champion: ${championName}`,
      description: formatHp(champion),
      color: 0xd6ad52,
      image: { url: championFrame },
    });
  }

  return {
    username: "The Depths",
    content: resultText,
    embeds,
  };
}

async function postDiscordWebhook(webhookUrl, payload) {
  const separator = webhookUrl.includes("?") ? "&" : "?";
  const response = await fetch(`${webhookUrl}${separator}wait=true`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  if (!response.ok) {
    const error = new Error(text || `Discord webhook failed with status ${response.status}`);
    error.status = response.status;
    throw error;
  }
  try {
    return JSON.parse(text || "{}");
  } catch {
    return {};
  }
}

async function postDepthsBattleResult(req, res) {
  await NextCors(req, res, {
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
    origin: "*",
    optionsSuccessStatus: 200,
  });

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return sendJson(res, 405, { error: "Method Not Allowed" });
  }

  let runId = "";

  try {
    const body = parseBody(req);
    runId = requireString(body.runId || body.battleRunId, "runId");
    const runToken = body.runToken;
    const webhookUrl = getDepthsBattleWebhookUrl();
    const { runRef, run } = await requireRunWriteToken(runId, runToken);

    if (!ENDED_RUN_STATUSES.has(String(run.status || ""))) {
      return sendJson(res, 400, { error: "Depths run is not ended yet." });
    }

    let shouldPost = true;
    await db.runTransaction(async (transaction) => {
      const freshSnap = await transaction.get(runRef);
      const fresh = freshSnap.data() || {};
      if (fresh.depthsRunDiscordPostStatus === "posted" || fresh.depthsRunDiscordPostedAt) {
        shouldPost = false;
        return;
      }
      transaction.set(
        runRef,
        {
          depthsRunDiscordPostStatus: "posting",
          depthsRunDiscordPostRequestedAt: serverTimestamp(),
        },
        { merge: true }
      );
    });

    if (!shouldPost) return sendJson(res, 200, { id: runId, posted: false, skipped: "already-posted" });

    if (!webhookUrl) {
      await runRef.set(
        {
          depthsRunDiscordPostStatus: "skipped",
          depthsRunDiscordPostSkippedReason: "missing-webhook-url",
          depthsRunDiscordPostSkippedAt: serverTimestamp(),
        },
        { merge: true }
      );
      return sendJson(res, 200, { id: runId, posted: false, skipped: "missing-webhook-url" });
    }

    const latestRunSnap = await runRef.get();
    const latestRun = latestRunSnap.exists ? latestRunSnap.data() || run : run;
    const battle = await loadFinalRunBattle(latestRun, runId);
    const payload = buildRunResultPayload({ run: latestRun, runId, battle, origin: getRequestOrigin(req) });
    const discordMessage = await postDiscordWebhook(webhookUrl, payload);

    await runRef.set(
      {
        depthsRunDiscordPostStatus: "posted",
        depthsRunDiscordPostedAt: serverTimestamp(),
        depthsRunDiscordMessageId: discordMessage.id || null,
      },
      { merge: true }
    );

    return sendJson(res, 200, { id: runId, posted: true, discordMessageId: discordMessage.id || null });
  } catch (error) {
    try {
      if (runId) {
        await db.collection(RUN_COLLECTION).doc(runId).set(
          {
            depthsRunDiscordPostStatus: "failed",
            depthsRunDiscordPostError: error.message || String(error),
            depthsRunDiscordPostFailedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }
    } catch {
      // Ignore secondary logging failures.
    }
    const status = error.status && Number.isInteger(error.status) ? error.status : 500;
    return sendJson(res, status, { error: error.message || "Failed to post Depths run result." });
  }
}

export default postDepthsBattleResult;
