const fs = require("node:fs");
const path = require("node:path");
const algosdk = require("algosdk");
const { marked } = require(process.env.MARKED_MODULE || "marked");
const { buildAnnouncement } = require("../functions/market/discord");
const seller = algosdk.encodeAddress(new Uint8Array(32).fill(1));
const buyer = algosdk.encodeAddress(new Uint8Array(32).fill(2));
const base = {
  seller, buyer, assetId: 810869644, amount: "3", costId: 0, costAmount: "25000000", listingId: "A".repeat(52), txId: "B".repeat(52), remaining: "2", round: 64768069, time: 1788654600,
  asset: { name: "Dark Coin DAO 1035", decimals: 0, image: "https://ipfs-pera.algonode.dev/ipfs/QmfTdAnc2d9pjzCDwhMT2SFe9KuJfcS4UESyPKF2ZDkcpn" },
  currency: { unitName: "ALGO", decimals: 6 },
};
const payloads = [buildAnnouncement({ ...base, kind: "listing" }), buildAnnouncement({ ...base, kind: "sale", amount: "1" })];
const escape = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const messages = payloads.map((payload, i) => {
  const embed = payload.embeds[0];
  return `<section><h2># market-${i ? "sales" : "listings"}</h2><div class="message"><img class="avatar" src="${payload.avatar_url}" alt=""/><div class="body"><div class="username">Dark Coin Market <span>APP</span><small>Today at 5:30 PM</small></div><article style="border-left-color:#${embed.color.toString(16)}"><div class="author"><img src="${embed.author.icon_url}" alt=""/>${escape(embed.author.name)}</div><a class="title" href="${embed.url}">${marked.parseInline(embed.title)}</a><p class="description">${marked.parseInline(embed.description)}</p><dl>${embed.fields.map((field) => `<div><dt>${escape(field.name)}</dt><dd>${marked.parseInline(field.value)}</dd></div>`).join("")}</dl><img class="art" src="${embed.image.url}" alt="Dark Coin DAO 1035"/><footer>${escape(embed.footer.text)}<span>09/05/2026</span></footer></article><nav>${payload.components[0].components.map((button) => `<a href="${button.url}">${escape(button.label)} <span aria-hidden="true">&#8599;</span></a>`).join("")}</nav></div></div></section>`;
}).join("");
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Market Discord previews</title><style>
*{box-sizing:border-box}body{margin:0;background:#313338;color:#f2f3f5;font:14px/1.4 Arial,sans-serif}header{padding:22px 28px;border-bottom:1px solid #42444b}header h1{font-size:20px;margin:0 0 5px}header p{color:#b5bac1;margin:0}main{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:36px;padding:24px;max-width:1360px;margin:auto}section{min-width:0}h2{font-size:15px;margin:0 0 26px;color:#b5bac1}.message{display:flex;gap:14px}.avatar{width:40px;height:40px;border-radius:50%;object-fit:contain;background:#090909;flex-shrink:0}.body{min-width:0;flex:1}.username{display:flex;align-items:center;gap:8px;font-weight:600;margin-bottom:8px;flex-wrap:wrap}.username span{font-size:10px;background:#5865f2;border-radius:3px;padding:1px 4px}.username small{font-size:11px;font-weight:400;color:#949ba4}article{background:#2b2d31;border-radius:4px;border-left:4px solid;padding:16px;max-width:520px}.author{display:flex;align-items:center;gap:8px;font-size:11px;font-weight:700;margin-bottom:12px}.author img{width:22px;height:22px;border-radius:50%;object-fit:contain}.title{font-size:17px;font-weight:700;color:#00a8fc;text-decoration:none}a{color:#00a8fc;text-decoration:none}a:hover{text-decoration:underline}.description{margin:10px 0 18px;line-height:1.5;color:#dbdee1}dl{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px 16px;margin:0 0 22px}dt{font-size:12px;font-weight:700;margin-bottom:4px}dd{margin:0;font-size:13px;color:#dbdee1;overflow-wrap:anywhere}.art{display:block;max-width:100%;width:100%;max-height:360px;object-fit:contain;object-position:left;border-radius:4px}footer{font-size:11px;color:#b5bac1;margin-top:16px;display:flex;gap:12px;flex-wrap:wrap}nav{display:flex;gap:8px;margin-top:8px;flex-wrap:wrap}nav a{display:flex;gap:12px;align-items:center;background:#4e5058;color:#fff;font-size:12px;padding:8px 12px;border-radius:3px}nav span{font-size:17px}@media(max-width:850px){main{grid-template-columns:minmax(0,1fr);padding:20px 12px;gap:40px}.message{gap:10px}.avatar{width:30px;height:30px}article{padding:12px}dl{gap:14px 10px}.author{font-size:10px}.username small{display:none}header{padding:18px}}
</style><header><h1>Dark Coin Market / Discord</h1><p>Sample listing and sale messages. No messages were posted.</p></header><main>${messages}</main></html>`;
const dir = path.resolve("output/market-release");
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "discord-preview.html"), html);
fs.writeFileSync(path.join(dir, "discord-preview.json"), JSON.stringify(payloads, null, 2));
console.log("Created Discord preview HTML and payloads.");
