import React from "react";
import Link from "next/link";
import { formatUnits, unitScale, listingPath, stallPath, shortAddress } from "../../../functions/market/model";
import ShareLink from "./ShareLink";
import { PaymentAssetIcon } from "./PaymentAsset";
import { priceUnitSuffix } from "../../../lib/marketPricing";

export default function ListingCard({ listing }) {
  const { asset, currency } = listing;
  const price = formatUnits(BigInt(listing.costAmount) * unitScale(asset.decimals), currency.decimals);
  return <article className="marketListingCard">
    <Link href={listingPath(listing.id)} legacyBehavior><a className="marketListingArtwork">
      <img src={asset.image} alt={asset.name} loading="lazy" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/home/marketLogo.png"; }} />
    </a></Link>
    <div className="marketListingCardBody">
      <Link href={listingPath(listing.id)} legacyBehavior><a className="marketListingTitle">{asset.name}</a></Link>
      <p className="marketListingPrice"><PaymentAssetIcon assetId={listing.costId} currency={currency} /><span className="marketPriceAmount">{price} <small>{currency.unitName}{priceUnitSuffix(listing)}</small></span></p>
      <p>{formatUnits(listing.amount, asset.decimals)} available</p>
      <div className="marketListingCardFooter">
        <Link href={stallPath(listing.seller)} legacyBehavior><a title={listing.seller}>{shortAddress(listing.seller)}</a></Link>
        <ShareLink path={listingPath(listing.id)} label="Copy listing link" />
      </div>
    </div>
  </article>;
}
