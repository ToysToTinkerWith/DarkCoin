import React from "react";
import Head from "next/head";
import algosdk from "algosdk";
import MarketCatalog from "../../../components/contracts/Market/MarketCatalog";
import { MARKET_ORIGIN, shortAddress, stallPath } from "../../../functions/market/model";

export default function PublicStall({ address }) {
  const title = `${shortAddress(address)}'s Stall | Dark Coin Market`;
  return <>
    <Head>
      <meta property="og:title" content={title} />
      <meta property="og:description" content="Browse this seller's available assets on Dark Coin Market." />
      <meta property="og:image" content={`${MARKET_ORIGIN}/market/overview-stall.png`} />
      <meta property="og:url" content={`${MARKET_ORIGIN}${stallPath(address)}`} />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
    </Head>
    <MarketCatalog seller={address} />
  </>;
}

export function getServerSideProps({ params }) {
  if (!algosdk.isValidAddress(params.address)) return { notFound: true };
  return { props: { address: params.address, marketSeo: {
    title: `${shortAddress(params.address)}'s Stall | Dark Coin Market`,
    description: "Browse this seller's available assets on Dark Coin Market.",
    image: `${MARKET_ORIGIN}/market/overview-stall.png`,
    url: `${MARKET_ORIGIN}${stallPath(params.address)}`,
  } } };
}
