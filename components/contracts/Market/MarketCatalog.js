import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useWallet } from "@txnlab/use-wallet-react";
import { TextField } from "@mui/material";
import { MarketPageShell, MarketToolbar, MarketPager, MarketEmptyState, marketTextFieldSx } from "./MarketPageShell";
import { MARKET_ORIGIN, stallPath, shortAddress } from "../../../functions/market/model";
import ListingCard from "./ListingCard";
import ShareLink from "./ShareLink";
import { PaymentAssetShortcuts } from "./PaymentAsset";

export default function MarketCatalog({ seller, ownStall = false }) {
  const { activeAddress } = useWallet();
  const address = ownStall ? activeAddress : seller;
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [costId, setCostId] = useState("");
  const [offset, setOffset] = useState(0);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setListings([]); setError(""); setOffset(0);
    if (ownStall && !address) { setLoading(false); return () => controller.abort(); }
    setLoading(true);
    fetch(`/api/market/listings${address ? `?seller=${address}` : ""}`, { signal: controller.signal })
      .then(async (res) => { const data = await res.json(); if (!res.ok) throw new Error(data.error); return data.listings; })
      .then(setListings).catch((e) => { if (e.name !== "AbortError") setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [address, ownStall, refresh]);
  const filtered = listings.filter((l) => (costId === "" || BigInt(l.costId) === BigInt(costId)) && `${l.asset.name} ${l.assetId} ${l.seller} ${l.currency.unitName}`.toLowerCase().includes(search.toLowerCase()));
  function changeCostId(value) {
    if (!/^\d*$/.test(value)) return;
    setCostId(value); setOffset(0);
  }
  const title = ownStall || (address && address === activeAddress) ? "YOUR STALL" : address ? "SELLER STALL" : "BUY";
  return <MarketPageShell title={title}>
    {address ? <Head>
      <title>{shortAddress(address)}'s Stall | Dark Coin Market</title>
      <link rel="canonical" href={`${MARKET_ORIGIN}${stallPath(address)}`} />
    </Head> : null}
    {address ? <div className="marketStallHeading">
      <div><p>Seller</p><code>{address}</code></div>
      <ShareLink path={stallPath(address)} label={address === activeAddress ? "Copy your stall link" : "Copy stall link"} showLabel />
    </div> : null}
    <MarketToolbar>
      <TextField label={address || ownStall ? "Search stall" : "Search listings"} value={search} onChange={(e) => { setSearch(e.target.value); setOffset(0); }} fullWidth sx={marketTextFieldSx} />
      <MarketPager listNum={offset} total={filtered.length} onPrev={() => setOffset(offset - 50)} onNext={() => setOffset(offset + 50)} />
    </MarketToolbar>
    <div className="marketPaymentFilter">
      <span className="marketPaymentFilterLabel">Pay with</span>
      <PaymentAssetShortcuts value={costId} onChange={changeCostId} includeAll />
      <TextField label="Cost asset ID" value={costId} onChange={(e) => changeCostId(e.target.value)} inputProps={{ inputMode: "numeric" }} size="small" sx={marketTextFieldSx} />
    </div>
    {error ? <div className="marketNotice" role="alert"><p>{error}</p><button className="marketSecondaryButton" onClick={() => setRefresh(refresh + 1)}>Retry</button></div>
      : loading ? <div className="marketListingsGrid" aria-label="Loading listings">{Array.from({ length: 6 }, (_, i) => <div key={i} className="marketAssetSkeleton" />)}</div>
      : filtered.length ? <div className="marketListingsGrid">{filtered.slice(offset, offset + 50).map((listing) => <ListingCard key={listing.id} listing={listing} />)}</div>
      : <MarketEmptyState title={ownStall && !address ? "Wallet not connected" : search || costId !== "" ? "No matching listings" : address ? "This stall is empty" : "No listings yet"} text={ownStall && !address ? "Connect your wallet to view your stall." : undefined} />}
    {address === activeAddress && address ? <div className="marketActionRow"><Link href="/market/list" legacyBehavior><a className="marketSecondaryButton marketTextLink">List an asset</a></Link></div> : null}
  </MarketPageShell>;
}
