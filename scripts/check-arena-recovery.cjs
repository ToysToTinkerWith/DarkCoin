const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const algosdk = require("algosdk");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const origin = process.env.ARENA_PREVIEW_URL || "http://localhost:3013";
const output = path.resolve("output/arena-recovery");
const assetId = 1559365777;
const dummyAddress = algosdk.encodeAddress(new Uint8Array(32).fill(1));

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const response = await fetch(`${origin}/api/getNft`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nftId: assetId }), signal: AbortSignal.timeout(30000) });
  assert.equal(response.ok, true);
  const nft = await response.json();
  const asset = nft.nft.assets[0];
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe" });
  try {
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
      const context = await browser.newContext({ viewport });
      await context.addInitScript((address) => {
        const account = { name: "Read-only UI test", address };
        localStorage.setItem("@txnlab/use-wallet:v4", JSON.stringify({ wallets: { lute: { accounts: [account], activeAccount: account } }, activeWallet: "lute", activeNetwork: "mainnet", customNetworkConfigs: {} }));
      }, dummyAddress);
      const page = await context.newPage();
      page.setDefaultTimeout(60000);
      const errors = [];
      const oldGatewayRequests = [];
      page.on("pageerror", (error) => { errors.push(error.message); console.log("Browser error:", error.message); });
      let failNft = false;
      await page.route("**/api/getDcAssets", (route) => route.fulfill({ json: [{ asset, amount: 1 }] }));
      await page.route("**/api/getNft", (route) => route.fulfill(failNft ? { status: 503, json: { error: "Champion service temporarily unavailable" } } : { json: nft }));
      await page.route("**/api/arena/depthsState", (route) => {
        assert.equal(route.request().postDataJSON().action, "getEntryInfoBatch", "UI test must never update a run");
        return route.fulfill({ json: { entries: {} } });
      });
      await page.route("**/ipfs.dark-coin.io/**", (route) => { oldGatewayRequests.push(route.request().url()); return route.abort(); });
      // Exercise the actual fallback host, not a mocked successful image.
      await page.route("**/ipfs-pera.algonode.dev/ipfs/**", (route) => route.abort());
      await page.goto(`${origin}/arena/armory`);
      const championImage = page.getByRole("img", { name: asset.params.name, exact: true });
      await championImage.waitFor();
      await page.waitForFunction((name) => [...document.images].some((img) => img.alt === name && img.complete && img.naturalWidth > 0 && img.src.includes("gateway.pinata.cloud")), asset.params.name);
      await page.screenshot({ path: path.join(output, `armory-${viewport.width}.png`), fullPage: true });

      failNft = true;
      await championImage.click();
      await page.getByRole("alert").filter({ hasText: "Champion service temporarily unavailable" }).waitFor();
      failNft = false;
      await page.getByRole("button", { name: "Retry", exact: true }).click();
      await page.getByRole("alert").filter({ hasText: "Champion service temporarily unavailable" }).waitFor({ state: "hidden" }).catch(async (error) => {
        console.log(await page.locator("body").innerText());
        await page.screenshot({ path: path.join(output, `armory-retry-error-${viewport.width}.png`), fullPage: true });
        throw error;
      });
      await page.getByRole("button", { name: "Back to Champions", exact: true }).waitFor();
      await page.getByText(nft.charObject.charObj.name, { exact: true }).first().waitFor();
      console.log(`PASS ${viewport.width}px Armory: primary gateway failure, fallback artwork, visible API error and retry`);

      // Restore the primary gateway for the independently loaded Depths champion cards.
      await page.unroute("**/ipfs-pera.algonode.dev/ipfs/**");
      await page.goto(`${origin}/arena/depths`);
      await page.getByRole("button", { name: "Enter The Depths", exact: true }).waitFor().catch(async (error) => { console.log(await page.locator("body").innerText()); throw error; });
      const depthsImage = page.getByRole("img", { name: asset.params.name, exact: true });
      await depthsImage.waitFor();
      await page.waitForFunction((name) => [...document.images].some((img) => img.alt === name && img.complete && img.naturalWidth > 0 && img.src.includes("ipfs-pera.algonode.dev")), asset.params.name);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: path.join(output, `depths-${viewport.width}.png`), fullPage: true });
      assert.equal(errors.length, 0, errors.join("\n"));
      // The shared wallet widget still has legacy media logic; affected Arena images must not use it.
      assert.equal(await depthsImage.getAttribute("src").then((src) => src.includes("ipfs.dark-coin.io")), false);
      console.log(`PASS ${viewport.width}px Depths: champion art, existing character object, no uncaught browser errors`);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
