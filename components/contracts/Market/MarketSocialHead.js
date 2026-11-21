import Head from "next/head";

export default function MarketSocialHead({ seo }) {
  if (!seo) return null;
  return <Head>
    <title>{seo.title}</title>
    <meta name="description" content={seo.description} />
    <meta property="og:title" content={seo.title} />
    <meta property="og:description" content={seo.description} />
    <meta property="og:image" content={seo.image} />
    <meta property="og:url" content={seo.url} />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="canonical" href={seo.url} />
  </Head>;
}
