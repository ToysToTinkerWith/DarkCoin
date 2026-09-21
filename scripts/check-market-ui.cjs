const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const algosdk = require("algosdk");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const origin = process.env.MARKET_PREVIEW_URL || "http://localhost:3011";
const output = path.resolve("output/market-release");
const seller = algosdk.encodeAddress(new Uint8Array(32).fill(1));
const fixture = {
  id: "A".repeat(52), seller, assetId: 810869644, amount: "3", originalAmount: "3", costId: 0, costAmount: "25000000", status: "active", round: 100, offset: 0,
  asset: { id: 810869644, name: "Dark Coin DAO 1035", unitName: "DCGV1035", decimals: 0, image: "https://ipfs-pera.algonode.dev/ipfs/QmfTdAnc2d9pjzCDwhMT2SFe9KuJfcS4UESyPKF2ZDkcpn" },
  currency: { name: "Algorand", unitName: "ALGO", decimals: 6 },
};
const listings = [fixture,
  { ...fixture, id: "B".repeat(52), costId: 1088771340, currency: { name: "Dark Coin", unitName: "DARKCOIN", decimals: 6 }, asset: { ...fixture.asset, name: "Dark Coin Champion With A Particularly Long Collectible Name" } },
  { ...fixture, id: "C".repeat(52), amount: "1000000", costAmount: "100", costId: 123456, asset: { ...fixture.asset, decimals: 6 }, currency: { name: "Test Token", unitName: "TEST", decimals: 6, image: "/DarkCoinLogo.png" } },
];

async function screenshot(page, filename) {
  for (const artwork of await page.locator(".marketListingArtwork img").all()) {
    await artwork.scrollIntoViewIfNeeded();
    await artwork.evaluate((img) => img.decode());
  }
  await page.waitForFunction(() => [...document.querySelectorAll(".marketAppCard")].every((card) => Number(getComputedStyle(card).opacity) === 1));
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: path.join(output, filename), fullPage: true });
}

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe" });
  try {
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
      const context = await browser.newContext({ viewport, permissions: ["clipboard-read", "clipboard-write"] });
      const page = await context.newPage();
      const errors = [];
      let catalog = listings;
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => { if (message.type() === "error") console.log(message.text().slice(0, 600)); });
      await page.route("**/api/market/listings*", (route) => route.fulfill({ json: route.request().url().includes("?id=") ? { listing: fixture } : { listings: catalog } }));
      await page.route("**/_next/data/**/market/listing/*.json*", (route) => route.fulfill({ json: { pageProps: { initialListing: fixture }, __N_SSP: true } }));
      await page.goto(`${origin}/market/browse`);
      await page.locator(".marketListingCard").first().waitFor().catch(async (error) => { console.log(await page.locator("body").innerText()); console.log(errors); throw error; });
      await page.waitForFunction(() => document.querySelectorAll(".marketListingCard").length === 3);
      assert.equal(await page.getByRole("link", { name: "Shuffle", exact: true }).count(), 0);
      await page.getByLabel("Search listings").fill("particularly");
      await page.waitForFunction(() => document.querySelectorAll(".marketListingCard").length === 1);
      await page.getByLabel("Search listings").fill("");
      const payWith = page.getByRole("group", { name: "Pay with" });
      const costId = page.getByLabel("Cost asset ID", { exact: true });
      await payWith.getByRole("button", { name: "ALGO", exact: true }).click();
      assert.equal(await costId.inputValue(), "0");
      await page.waitForFunction(() => document.querySelectorAll(".marketListingCard").length === 1);
      assert.match(await page.locator(".marketListingPrice").innerText(), /25 ALGO each/);
      await payWith.getByRole("button", { name: "Dark Coin", exact: true }).click();
      assert.equal(await costId.inputValue(), "1088771340");
      assert.match(await page.locator(".marketListingPrice").innerText(), /DARKCOIN each/);
      assert.equal(await page.locator(".marketListingPrice img").getAttribute("src"), "/invDC.svg");
      await page.getByLabel("Search listings").fill("no such listing");
      await page.getByRole("heading", { name: "No matching listings" }).waitFor();
      await page.getByLabel("Search listings").fill("");
      await costId.fill("000123456");
      assert.equal(await page.locator(".marketListingPrice").innerText(), "100 TEST");
      assert.equal(await page.locator(".marketListingPrice img").getAttribute("src"), "/DarkCoinLogo.png");
      await page.route("https://asa-list.tinyman.org/assets/123456/icon.png", (route) => route.fulfill({ status: 404, body: "" }));
      await page.locator(".marketListingPrice img").dispatchEvent("error");
      await page.locator(".marketListingPrice svg[aria-label='Test Token']").waitFor();
      await costId.fill("999999");
      await page.getByRole("heading", { name: "No matching listings" }).waitFor();
      await payWith.getByRole("button", { name: "All", exact: true }).click();
      assert.equal(await costId.inputValue(), "");
      await page.waitForFunction(() => document.querySelectorAll(".marketListingCard").length === 3);
      assert.equal(await page.locator(".marketPaymentFilter").evaluate((el) => el.scrollWidth <= el.clientWidth), true);
      catalog = Array.from({ length: 60 }, (_, index) => ({ ...listings[index % 3], id: String(index).padStart(52, "A") }));
      await page.reload();
      await page.getByRole("button", { name: "Next page", exact: true }).click();
      await page.waitForFunction(() => document.querySelectorAll(".marketListingCard").length === 10);
      await payWith.getByRole("button", { name: "Dark Coin", exact: true }).click();
      await page.waitForFunction(() => document.querySelectorAll(".marketListingCard").length === 20);
      assert.equal(await page.getByRole("button", { name: "Previous page", exact: true }).isDisabled(), true);
      assert.match(await page.locator(".marketPager p").innerText(), /1\s*-\s*20\s*of\s*20/);
      catalog = listings;
      await page.reload();
      await page.waitForFunction(() => document.querySelectorAll(".marketListingCard").length === 3);
      await screenshot(page, `listings-${viewport.width}.png`);
      await page.locator(".marketListingTitle").first().click();
      await page.locator(".marketListingInfo h2").waitFor();
      await page.waitForFunction(() => [...document.querySelectorAll(".marketListingDetailArt img")].every((img) => img.complete && img.naturalWidth > 0));
      assert.equal(await page.locator(".marketListingInfo h2").innerText(), fixture.asset.name);
      assert.equal(await page.locator(".marketListingDetailPrice img").getAttribute("src"), "/AlgoWhite.svg");
      assert.equal(await page.locator(".marketListingDetailPrice").innerText(), "25 ALGO");
      assert.equal(await page.getByRole("button", { name: "Connect wallet to buy" }).isDisabled(), true);
      await page.getByRole("button", { name: "Copy listing link" }).click();
      assert.equal(await page.evaluate(() => navigator.clipboard.readText()), `${origin}/market/listing/${fixture.id}`);
      assert.equal(await page.locator(".marketListingInfo").evaluate((el) => el.scrollWidth <= el.clientWidth), true);
      await page.screenshot({ path: path.join(output, `listing-${viewport.width}.png`), fullPage: true });
      await page.getByRole("link", { name: "View seller's stall" }).click();
      await page.locator(".marketStallHeading code").waitFor();
      await page.locator(".marketListingCard").first().waitFor();
      assert.equal(await page.locator(".marketStallHeading code").innerText(), seller);
      await page.waitForFunction(() => document.querySelectorAll(".marketListingCard").length === 3);
      await page.getByRole("button", { name: "Copy stall link" }).click();
      assert.equal(await page.evaluate(() => navigator.clipboard.readText()), `${origin}/market/stall/${seller}`);
      assert.equal(await page.locator("main.marketPage").evaluate((el) => el.scrollWidth <= el.clientWidth), true);
      await screenshot(page, `stall-${viewport.width}.png`);
      await page.goto(`${origin}/market/shuffle`);
      await page.waitForURL(`${origin}/market`);
      await page.waitForFunction(() => document.querySelectorAll(".marketAppCard").length === 3);
      assert.equal((await page.locator("main").innerText()).toLowerCase().includes("shuffle"), false);
      assert.equal(await page.getByRole("heading", { name: "LIST", exact: true }).count(), 1);
      assert.equal(await page.getByRole("heading", { name: "SELL", exact: true }).count(), 0);
      assert.equal(await page.getByRole("link", { name: /VIEW STALL/ }).getAttribute("href"), "/market/stall");
      assert.equal(await page.getByRole("button", { name: "Copy your stall link" }).count(), 0);
      assert.equal(await page.locator('meta[name="name"]').getAttribute("content"), "Dark Coin");
      await screenshot(page, `overview-${viewport.width}.png`);
      await page.getByRole("link", { name: /VIEW STALL/ }).click();
      await page.getByRole("heading", { name: "Wallet not connected" }).waitFor();
      assert.equal(new URL(page.url()).pathname, "/market/stall");
      assert.equal(errors.filter((message) => /hydration|TypeError|ReferenceError/.test(message)).length, 0, errors.join("\n"));
      console.log(`PASS ${viewport.width}px: listing links, seller stalls, search, clipboard, disconnected wallet, shuffle redirect, layout`);
      await context.close();

      // This isolated, dummy Lute session exercises navigation only. No wallet signing is invoked.
      const connected = await browser.newContext({ viewport, permissions: ["clipboard-read", "clipboard-write"] });
      await connected.addInitScript((address) => {
        const account = { name: "Navigation test", address };
        localStorage.setItem("@txnlab/use-wallet:v4", JSON.stringify({
          wallets: { lute: { accounts: [account], activeAccount: account } },
          activeWallet: "lute", activeNetwork: "mainnet", customNetworkConfigs: {},
        }));
      }, seller);
      const ownPage = await connected.newPage();
      const ownErrors = [];
      ownPage.on("pageerror", (error) => ownErrors.push(error.message));
      await ownPage.route("**/api/getAddrAssets", (route) => route.fulfill({ json: [{ assetId: fixture.assetId, amount: 3 }] }));
      await ownPage.route("https://asa-list.tinyman.org/assets.json", (route) => route.fulfill({ json: {} }));
      await ownPage.route("https://mainnet-idx.algonode.cloud/v2/assets**", (route) => {
        const url = new URL(route.request().url());
        if (url.pathname.endsWith("/transactions")) return route.fulfill({ json: { transactions: [], "current-round": 1000 } });
        const asset = { index: fixture.assetId, params: { name: fixture.asset.name, "unit-name": "DCGV1035", decimals: 0, total: 3, creator: seller, url: `${origin}/home/marketLogo.png` } };
        return route.fulfill({ json: url.pathname === "/v2/assets" ? { assets: [asset], "current-round": 1000 } : { asset, "current-round": 1000 } });
      });
      await ownPage.route("**/api/market/listings*", (route) => route.fulfill({ json: { listings } }));
      await ownPage.route("**/_next/data/**/market/stall/*.json*", (route) => {
        const address = new URL(route.request().url()).pathname.split("/").pop().replace(/\.json$/, "");
        return route.fulfill({ json: { pageProps: { address }, __N_SSP: true } });
      });
      await ownPage.goto(`${origin}/market`);
      await ownPage.getByRole("button", { name: "Copy your stall link" }).waitFor();
      assert.equal(await ownPage.getByRole("link", { name: /VIEW STALL/ }).getAttribute("href"), `/market/stall/${seller}`);
      await ownPage.getByRole("button", { name: "Copy your stall link" }).click();
      assert.equal(await ownPage.evaluate(() => navigator.clipboard.readText()), `${origin}/market/stall/${seller}`);
      assert.equal(await ownPage.locator(".cardShell").evaluateAll((cards) => cards.every((card) => {
        const outer = card.getBoundingClientRect();
        const inner = card.querySelector(".cardContent").getBoundingClientRect();
        return inner.top >= outer.top && inner.bottom <= outer.bottom && inner.left >= outer.left && inner.right <= outer.right;
      })), true);
      await screenshot(ownPage, `own-overview-${viewport.width}.png`);
      await ownPage.getByRole("link", { name: /VIEW STALL/ }).click();
      await ownPage.waitForURL(`${origin}/market/stall/${seller}`);
      await ownPage.getByRole("heading", { name: "YOUR STALL", exact: true }).waitFor();
      assert.equal(new URL(ownPage.url()).pathname, `/market/stall/${seller}`);
      await ownPage.getByRole("button", { name: "Copy your stall link" }).click();
      assert.equal(await ownPage.evaluate(() => navigator.clipboard.readText()), `${origin}/market/stall/${seller}`);
      await ownPage.locator(".marketListingCard").first().waitFor();
      await screenshot(ownPage, `own-stall-${viewport.width}.png`);
      const stallBounds = await ownPage.locator(".marketStallHeading").evaluate((el) => ({
        scrollWidth: el.scrollWidth, clientWidth: el.clientWidth,
        children: [...el.querySelectorAll("*")].map((child) => ({ tag: child.tagName, className: child.className, width: child.getBoundingClientRect().width, left: child.getBoundingClientRect().left })),
      }));
      assert.equal(stallBounds.scrollWidth <= stallBounds.clientWidth, true, JSON.stringify(stallBounds));
      await ownPage.goto(`${origin}/market/stall`);
      await ownPage.waitForURL(`${origin}/market/stall/${seller}`);
      await ownPage.getByRole("heading", { name: "YOUR STALL", exact: true }).waitFor();
      const otherSeller = algosdk.encodeAddress(new Uint8Array(32).fill(2));
      await ownPage.goto(`${origin}/market/stall/${otherSeller}`);
      await ownPage.getByRole("heading", { name: "SELLER STALL", exact: true }).waitFor();
      assert.equal(await ownPage.locator(".marketStallHeading code").innerText(), otherSeller);
      assert.equal(await ownPage.getByRole("link", { name: "Stall", exact: true }).getAttribute("href"), `/market/stall/${seller}`);
      await ownPage.getByRole("link", { name: "List", exact: true }).click();
      await ownPage.getByRole("heading", { name: "LIST", exact: true }).waitFor();
      await ownPage.locator(".marketAssetCard").first().click();
      await ownPage.getByLabel("Amount to list").fill("1");
      const shortcuts = ownPage.getByRole("group", { name: "Payment asset shortcuts" });
      const listingCostId = ownPage.getByLabel("Cost asset ID (0 = ALGO)");
      await shortcuts.getByRole("button", { name: "ALGO", exact: true }).click();
      assert.equal(await listingCostId.inputValue(), "0");
      await shortcuts.getByRole("button", { name: "Dark Coin", exact: true }).click();
      assert.equal(await listingCostId.inputValue(), "1088771340");
      await listingCostId.fill("123456");
      assert.equal(await shortcuts.locator('[aria-pressed="true"]').count(), 0);
      const price = ownPage.getByLabel("Price per whole unit");
      await price.pressSequentially("1000000.001000");
      assert.equal(await price.inputValue(), "1,000,000.001000");
      await price.fill("1000.");
      await price.pressSequentially("05");
      assert.equal(await price.inputValue(), "1,000.05");
      await price.fill("1234.56");
      await price.evaluate((el) => el.setSelectionRange(1, 1));
      await price.pressSequentially("9");
      assert.equal(await price.inputValue(), "19,234.56");
      assert.equal(await price.evaluate((el) => el.selectionStart), 2);
      await price.fill("1234.56");
      await price.evaluate((el) => el.setSelectionRange(2, 2));
      await price.press("Backspace");
      assert.equal(await price.inputValue(), "234.56");
      await price.fill("1234.56");
      await price.evaluate((el) => el.setSelectionRange(1, 1));
      await price.press("Delete");
      assert.equal(await price.inputValue(), "134.56");
      await price.fill("9007199254.740993");
      assert.equal(await price.inputValue(), "9,007,199,254.740993");
      await price.fill("1,000,000.000001");
      assert.equal(await price.inputValue(), "1,000,000.000001");
      assert.equal(await ownPage.getByRole("button", { name: "LIST ASSET", exact: true }).isEnabled(), true);
      await shortcuts.getByRole("button", { name: "Dark Coin", exact: true }).click();
      assert.equal(await ownPage.locator(".marketCostAssetField").evaluate((el) => el.scrollWidth <= el.clientWidth), true);
      await screenshot(ownPage, `list-form-${viewport.width}.png`);
      assert.equal(ownErrors.filter((message) => /hydration|TypeError|ReferenceError/.test(message)).length, 0, ownErrors.join("\n"));
      console.log(`PASS ${viewport.width}px: own stall links, clipboard, LIST labels, payment filters and icons, price grouping, precision, caret edits`);
      await connected.close();
    }
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
