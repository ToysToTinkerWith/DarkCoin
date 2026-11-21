import React, { useState } from "react";
import TollIcon from "@mui/icons-material/Toll";
import { PAYMENT_ASSETS } from "../../../lib/marketPricing";

function CurrencyImage({ sources, name }) {
  const [index, setIndex] = useState(0);
  const src = sources[index];
  return <span className="marketPaymentIcon" title={name}>
    {src
      ? <img src={src} alt={name} width="22" height="22" onError={() => setIndex((current) => current + 1)} />
      : <TollIcon role="img" aria-label={name} fontSize="inherit" />}
  </span>;
}

export function PaymentAssetIcon({ assetId, currency = {} }) {
  const known = PAYMENT_ASSETS.find((asset) => String(asset.id) === String(assetId));
  const sources = known ? [known.image] : [...new Set([
    currency.image && !currency.image.endsWith("/home/marketLogo.png") ? currency.image : "",
    Number(assetId) > 0 ? `https://asa-list.tinyman.org/assets/${assetId}/icon.png` : "",
  ].filter(Boolean))];
  const name = known?.name || currency.name || currency.unitName || `Asset ${assetId}`;
  return <CurrencyImage key={`${assetId}:${sources.join(",")}`} sources={sources} name={name} />;
}

export function PaymentAssetShortcuts({ value, onChange, includeAll = false, disabled = false }) {
  return <div className="marketPaymentShortcuts" role="group" aria-label={includeAll ? "Pay with" : "Payment asset shortcuts"}>
    {includeAll ? <button type="button" aria-pressed={value === ""} disabled={disabled} onClick={() => onChange("")}>All</button> : null}
    {PAYMENT_ASSETS.map((asset) => <button key={asset.id} type="button"
      aria-label={asset.name} title={`${asset.name} (asset ID ${asset.id})`}
      aria-pressed={value !== "" && value != null && Number(value) === asset.id} disabled={disabled}
      onClick={() => onChange(String(asset.id))}>
      <PaymentAssetIcon assetId={asset.id} /><span>{asset.name}</span>
    </button>)}
  </div>;
}
