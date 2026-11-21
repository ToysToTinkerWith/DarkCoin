const { unitScale } = require("../functions/market/model");

const PAYMENT_ASSETS = [
  { id: 0, name: "ALGO", image: "/AlgoWhite.svg" },
  { id: 1088771340, name: "Dark Coin", image: "/invDC.svg" },
];

function priceUnitSuffix(listing) {
  return BigInt(listing.amount) === unitScale(listing.asset.decimals) ? "" : " each";
}

function formatPriceInput(value) {
  const raw = String(value).replace(/,/g, "");
  if (!/^\d*\.?\d*$/.test(raw)) return null;
  const [whole, fraction] = raw.split(".");
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (fraction === undefined ? "" : `.${fraction}`);
}

function priceInputEdit(value, selectionStart = value.length) {
  const formatted = formatPriceInput(value);
  if (formatted === null) return null;
  // Preserve the cursor's position among digits when grouping separators move.
  const beforeCaret = value.slice(0, selectionStart).replace(/,/g, "").length;
  let caret = 0;
  let characters = 0;
  while (caret < formatted.length && characters < beforeCaret) {
    if (formatted[caret] !== ",") characters++;
    caret++;
  }
  return { value: formatted, caret };
}

function unformatPriceInput(value) {
  return String(value).replace(/,/g, "").replace(/^\./, "0.").replace(/\.$/, "");
}

module.exports = { PAYMENT_ASSETS, priceUnitSuffix, formatPriceInput, priceInputEdit, unformatPriceInput };
