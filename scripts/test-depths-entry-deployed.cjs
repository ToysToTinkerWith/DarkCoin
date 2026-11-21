const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

(async () => {
  const site = "https://dark-coin.com";
  const expectedBuild = fs.readFileSync(path.join(__dirname, "../.next/BUILD_ID"), "utf8").trim();
  const response = await fetch(`${site}/arena/depths?release=${expectedBuild}`, { signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 200);
  const html = await response.text();
  const liveBuild = html.match(/"buildId":"([^"]+)"/)?.[1];
  assert.equal(liveBuild, expectedBuild, "Production must serve the tested build");
  const chunk = html.match(/src="([^"]*pages\/arena\/depths-[^"]+\.js)"/)?.[1];
  assert(chunk, "Depths browser bundle is present");
  const script = await fetch(new URL(chunk, site), { signal: AbortSignal.timeout(30000) });
  assert.equal(script.status, 200);
  assert((await script.text()).includes("Check Existing Payment"), "Recovery button is deployed");
  console.log(`PASS production Depths page and recovery UI (build ${liveBuild})`);

  const [activeAddress, championAssetId, txId] = process.argv.slice(2);
  if (!activeAddress || !championAssetId || !txId) return;
  // getEntryInfo only reads chain/Firestore state; it creates no run or payment.
  const entry = await fetch(`${site}/api/arena/depthsState`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "getEntryInfo", activeAddress, championAssetId: Number(championAssetId) }),
    signal: AbortSignal.timeout(45000),
  });
  const info = await entry.json();
  assert.equal(entry.status, 200, info.error);
  if (info.activeRun) console.log("PASS player already has an active run to resume");
  else {
    assert.equal(info.recoverablePayment?.txId, txId, "Live API must recover the reported unused payment");
    console.log(`PASS live API recovers payment ${txId}; no new payment submitted`);
  }
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
