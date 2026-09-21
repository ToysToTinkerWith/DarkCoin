import React, { useEffect, useRef, useState } from "react";
import { ipfsImageCandidates } from "../lib/ipfsMedia";

export default function NftImage({ src, alt = "", onLoad, onError, ...props }) {
  // A new source gets a fresh retry sequence, including after a trait preview changes.
  return <ImageAttempt key={src || "empty"} src={src} alt={alt} onLoad={onLoad} onError={onError} {...props} />;
}

function ImageAttempt({ src, onLoad, onError, ...props }) {
  const candidates = ipfsImageCandidates(src);
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef(null);
  const current = candidates[attempt] || "/home/marketLogo.png";
  const advance = () => setAttempt((value) => value === attempt ? Math.min(value + 1, candidates.length) : value);

  useEffect(() => {
    if (loaded || candidates.length < 2 || attempt >= candidates.length) return undefined;
    const timer = setTimeout(() => {
      if (!imgRef.current?.naturalWidth) advance();
    }, 8000);
    return () => clearTimeout(timer);
  }, [attempt, loaded, src]);

  return <img {...props} ref={imgRef} src={current} onLoad={(event) => { setLoaded(true); onLoad?.(event); }} onError={(event) => {
    if (attempt < candidates.length) advance();
    else onError?.(event);
  }} />;
}
