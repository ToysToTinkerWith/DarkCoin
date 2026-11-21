const crypto = require("node:crypto");

// Store replay bytes separately: even compact before/after snapshots grow with
// every turn. Leave ample room below Firestore's per-document size limit.
const CHUNK_BYTES = 256 * 1024;
const CHUNKS_PER_BATCH = 16;
const COLLECTION = "replayChunks";
const hash = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

function encodeReplay(actionLog) {
  if (!Array.isArray(actionLog)) throw new Error("Depths replay must be an array.");
  const bytes = Buffer.from(JSON.stringify(actionLog), "utf8");
  const chunks = [];
  for (let offset = 0; offset < bytes.length; offset += CHUNK_BYTES) {
    const data = bytes.subarray(offset, offset + CHUNK_BYTES);
    chunks.push({ id: hash(data), data });
  }
  return {
    chunks,
    manifest: {
      version: 1,
      chunks: chunks.map((chunk) => chunk.id),
      byteLength: bytes.length,
      actionCount: actionLog.length,
      sha256: hash(bytes),
    },
  };
}

async function loadBattleReplay(battleRef, battle) {
  const manifest = battle.serverReplayStorage;
  if (!manifest) return battle; // Existing battles still have an inline log.
  if (manifest.version !== 1 || !Array.isArray(manifest.chunks) || !manifest.chunks.length ||
      !manifest.chunks.every((id) => typeof id === "string" && /^[a-f0-9]{64}$/.test(id))) {
    throw new Error("Depths battle replay storage is invalid.");
  }
  const buffers = [];
  for (let start = 0; start < manifest.chunks.length; start += CHUNKS_PER_BATCH) {
    const ids = manifest.chunks.slice(start, start + CHUNKS_PER_BATCH);
    const snapshots = await battleRef.firestore.getAll(...ids.map((id) => battleRef.collection(COLLECTION).doc(id)));
    snapshots.forEach((snapshot, index) => {
      const data = snapshot.exists ? snapshot.data().data : null;
      if (!Buffer.isBuffer(data) || data.length > CHUNK_BYTES || hash(data) !== ids[index]) {
        throw new Error("Depths battle replay is missing or damaged. Retry loading the saved battle.");
      }
      buffers.push(data);
    });
  }
  const bytes = Buffer.concat(buffers);
  if (bytes.length !== manifest.byteLength || hash(bytes) !== manifest.sha256) {
    throw new Error("Depths battle replay failed its storage integrity check.");
  }
  const actionLog = JSON.parse(bytes.toString("utf8"));
  if (!Array.isArray(actionLog) || actionLog.length !== manifest.actionCount) {
    throw new Error("Depths battle replay action count does not match its saved history.");
  }
  return { ...battle, actionLog };
}

async function saveBattleReplay(battleRef, data, { existingBattle = {}, creating = false, deleteField } = {}) {
  const stored = { ...data };
  if (Array.isArray(data.actionLog)) {
    const { chunks, manifest } = encodeReplay(data.actionLog);
    const existingIds = new Set(existingBattle.serverReplayStorage?.chunks || []);
    const pending = [...new Map(chunks.map((chunk) => [chunk.id, chunk])).values()]
      .filter((chunk) => !existingIds.has(chunk.id));
    // Content-addressed chunks are immutable. Publish the manifest and battle
    // result together only after every chunk exists. A failed upload leaves the
    // previous save readable; retrying safely reuses the same chunk IDs.
    for (let start = 0; start < pending.length; start += CHUNKS_PER_BATCH) {
      const batch = battleRef.firestore.batch();
      for (const chunk of pending.slice(start, start + CHUNKS_PER_BATCH)) {
        batch.set(battleRef.collection(COLLECTION).doc(chunk.id), { data: chunk.data });
      }
      await batch.commit();
    }
    stored.serverReplayStorage = manifest;
    if (creating) delete stored.actionLog;
    else stored.actionLog = deleteField();
  }
  if (creating) await battleRef.create(stored);
  else await battleRef.set(stored, { merge: true });
}

module.exports = { CHUNK_BYTES, encodeReplay, loadBattleReplay, saveBattleReplay };
