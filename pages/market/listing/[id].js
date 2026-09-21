import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useWallet } from "@txnlab/use-wallet-react";
import { TextField } from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { MarketPageShell, MarketEmptyState, marketTextFieldSx } from "../../../components/contracts/Market/MarketPageShell";
import ShareLink from "../../../components/contracts/Market/ShareLink";
import { PaymentAssetIcon } from "../../../components/contracts/Market/PaymentAsset";
import { priceUnitSuffix } from "../../../lib/marketPricing";
import { MARKET_ORIGIN, listingPath, stallPath, shortAddress, formatUnits, parseUnits, unitScale } from "../../../functions/market/model";
import { marketAlgod, buildPurchase, buildRemoval, sendMarketGroup, announceMarketTransaction } from "../../../lib/marketTransactions";

export default function ListingPage({ initialListing, loadError, setMessage }) {
  const router = useRouter();
  const { activeAddress, signTransactions } = useWallet();
  const [listing, setListing] = useState(initialListing);
  const [amount, setAmount] = useState("1");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(loadError || "");
  function showMessage(message) { setNotice(message); setMessage(message); }
  useEffect(() => { setListing(initialListing); setNotice(loadError || ""); }, [initialListing, loadError]);
  async function refresh() {
    const response = await fetch(`/api/market/listings?id=${router.query.id}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    setListing(data.listing);
    return data.listing;
  }
  async function transact(remove = false) {
    if (!activeAddress || busy) return;
    if (remove && !window.confirm("Remove this listing? All remaining assets will be returned to your wallet. This listing's link will show it as removed.")) return;
    setBusy(true); setNotice("");
    try {
      const current = await refresh();
      if (current.status !== "active") throw new Error("This listing is no longer available.");
      const client = marketAlgod();
      const txns = remove ? await buildRemoval({ client, listing: current, sender: activeAddress }) : await buildPurchase({ client, listing: current, buyer: activeAddress, amount: parseUnits(amount, current.asset.decimals) });
      const txId = await sendMarketGroup({ client, txns, signTransactions, setMessage: showMessage });
      const remaining = remove ? 0n : BigInt(current.amount) - parseUnits(amount, current.asset.decimals);
      setListing({ ...current, amount: String(remaining), status: remove ? "removed" : remaining === 0n ? "sold" : "active" });
      setMessage(remove ? "Listing removed. Assets returned to your wallet." : "Purchase confirmed. Assets received in your wallet.");
      setNotice(remove ? "Listing removed. Assets returned to your wallet." : "Purchase confirmed. Assets received in your wallet.");
      await announceMarketTransaction(txId);
    } catch (e) { setNotice(e.message); setMessage(e.message); }
    finally { setBusy(false); }
  }
  if (!listing) return <MarketPageShell title="LISTING"><MarketEmptyState title="Listing unavailable" text={notice || "This listing may still be indexing. Please retry in a moment."} /><button className="marketSecondaryButton" onClick={() => router.replace(router.asPath)}>Retry</button></MarketPageShell>;
  const { asset, currency } = listing;
  const isOwner = listing.seller === activeAddress;
  const available = listing.status === "active";
  const price = formatUnits(BigInt(listing.costAmount) * unitScale(asset.decimals), currency.decimals);
  let total = "";
  let valid = false;
  try { const quantity = parseUnits(amount, asset.decimals); valid = quantity <= BigInt(listing.amount); total = formatUnits(quantity * BigInt(listing.costAmount), currency.decimals); } catch { /* An incomplete quantity is not actionable. */ }
  const description = `${formatUnits(listing.amount, asset.decimals)} available at ${price} ${currency.unitName}${priceUnitSuffix(listing)}. Sold by ${shortAddress(listing.seller)} on Dark Coin Market.`;
  const url = `${MARKET_ORIGIN}${listingPath(listing.id)}`;
  return <MarketPageShell title="LISTING">
    <Head>
      <title>{asset.name} | Dark Coin Market</title>
      <meta name="description" content={description} key="description" />
      <meta property="og:title" content={`${asset.name} | Dark Coin Market`} />
      <meta property="og:description" content={available ? description : `This listing has been ${listing.status}. View the seller's stall for more assets.`} />
      <meta property="og:image" content={asset.image} /><meta property="og:url" content={url} /><meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" /><link rel="canonical" href={url} />
    </Head>
    <div className="marketListingNavigation"><Link href="/market/browse" legacyBehavior><a>All listings</a></Link><ShareLink path={listingPath(listing.id)} label="Copy listing link" /></div>
    <div className="marketListingDetail">
      <div className="marketListingDetailArt"><img src={asset.image} alt={asset.name} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/home/marketLogo.png"; }} /></div>
      <section className="marketListingInfo">
        <p className="marketListingStatus">{available ? isOwner ? "Your listing" : "Available" : listing.status === "sold" ? "Sold out" : "Removed"}</p>
        <h2>{asset.name}</h2>
        <a className="marketAssetExplorer" href={`https://explorer.perawallet.app/asset/${listing.assetId}`} target="_blank" rel="noreferrer">Asset {listing.assetId} <OpenInNewIcon fontSize="inherit" /></a>
        <dl>
          <div><dt>Price per unit</dt><dd className="marketListingDetailPrice"><PaymentAssetIcon assetId={listing.costId} currency={currency} /><span>{price} {currency.unitName}</span></dd></div>
          <div><dt>Available</dt><dd>{formatUnits(listing.amount, asset.decimals)}</dd></div>
          <div><dt>Seller</dt><dd><Link href={stallPath(listing.seller)} legacyBehavior><a title={listing.seller}>{shortAddress(listing.seller)}</a></Link></dd></div>
        </dl>
        {available && !isOwner ? <>
          <TextField label="Quantity" value={amount} onChange={(e) => setAmount(e.target.value)} inputProps={{ inputMode: "decimal" }} disabled={busy} fullWidth sx={marketTextFieldSx} />
          <button type="button" className="marketActionButton marketBuyButton" disabled={busy || !activeAddress || !valid} onClick={() => transact()}>{busy ? "Processing..." : !activeAddress ? "Connect wallet to buy" : `Buy for ${total || "0"} ${currency.unitName}`}</button>
        </> : null}
        {available && isOwner ? <button className="marketSecondaryButton" disabled={busy} onClick={() => transact(true)}>{busy ? "Processing..." : "Remove listing"}</button> : null}
        <div className="marketActionRow"><Link href={stallPath(listing.seller)} legacyBehavior><a className="marketSecondaryButton marketTextLink">View seller's stall</a></Link></div>
        {notice ? <p className="marketNotice" role="status">{notice}</p> : null}
      </section>
    </div>
  </MarketPageShell>;
}

export async function getServerSideProps({ params, res }) {
  if (!/^(?:[A-Z2-7]{52}|[a-f0-9]{128})$/.test(params.id)) return { notFound: true };
  const { getListing } = require("../../../functions/market/chain");
  const { enrichListing } = require("../../../functions/market/media");
  res.setHeader("Cache-Control", "no-store");
  try {
    const listing = await getListing(params.id, { fresh: true });
    if (!listing) return { props: { initialListing: null } };
    const enriched = await enrichListing(listing);
    const price = formatUnits(BigInt(listing.costAmount) * unitScale(enriched.asset.decimals), enriched.currency.decimals);
    return { props: { initialListing: enriched, marketSeo: {
      title: `${enriched.asset.name} | Dark Coin Market`,
      description: listing.status === "active" ? `${formatUnits(listing.amount, enriched.asset.decimals)} available at ${price} ${enriched.currency.unitName}${priceUnitSuffix(enriched)}.` : `This listing has been ${listing.status}. View the seller's stall for more assets.`,
      image: enriched.asset.image, url: `${MARKET_ORIGIN}${listingPath(listing.id)}`,
    } } };
  } catch {
    res.statusCode = 503;
    return { props: { initialListing: null, loadError: "The market could not load from Algorand. Please retry." } };
  }
}
