import React, { useState } from "react";
import LinkIcon from "@mui/icons-material/Link";
import CheckIcon from "@mui/icons-material/Check";

export default function ShareLink({ path, label = "Copy link", showLabel = false }) {
  const [copied, setCopied] = useState(false);
  const [fallback, setFallback] = useState("");
  async function copy() {
    const url = new URL(path, window.location.origin).href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { setFallback(url); }
  }
  return <div className="marketShare">
    <button type="button" className={showLabel ? "marketShareButton" : "marketIconButton"} aria-label={copied ? "Link copied" : label} title={copied ? "Link copied" : label} onClick={copy}>
      {copied ? <CheckIcon fontSize="small" /> : <LinkIcon fontSize="small" />}
      {showLabel ? <span>{copied ? "Link copied" : label}</span> : null}
    </button>
    <span className="marketSrOnly" role="status">{copied ? "Link copied" : ""}</span>
    {fallback ? <input aria-label="Share URL" readOnly value={fallback} onFocus={(e) => e.target.select()} /> : null}
    <style jsx>{`
      .marketShare { position: relative; max-width: 100%; }
      .marketShareButton { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 42px; width: 210px; max-width: 100%; padding: 8px 12px; border: 1px solid #707070; border-radius: 3px; color: #f2f2f2; background: #111; font: 13px Georgia, serif; letter-spacing: 0; cursor: pointer; }
      .marketShareButton:hover { background: #242424; border-color: #ddd; }
      .marketShareButton:focus-visible { outline: 2px solid white; outline-offset: 3px; }
      .marketShareButton span { min-width: 0; overflow-wrap: anywhere; }
      .marketSrOnly { position: absolute; left: 0; top: 0; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); }
      input { position: absolute; right: 0; z-index: 10; width: min(280px, 70vw); padding: 8px; }
    `}</style>
  </div>;
}
