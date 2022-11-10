import React from "react";
import Script from "next/script"
import Document, { Html, Head, Main, NextScript } from "next/document";
import theme from "../../theme";

export default class MyDocument extends Document {

  static async getInitialProps(ctx) {
    const initialProps = await Document.getInitialProps(ctx)
    return { ...initialProps }
  }

  render() {
    return (
      <Html lang="en">
        <Head>

        <Script type="application/ld+json">
        
         "@context": "https://schema.org",
          "@type": "NewsArticle",
          "headline": "Analyzing Google Search traffic drops",
          "datePublished": "2021-07-20T08:00:00+08:00",
          "dateModified": "2021-07-20T09:20:00+08:00"
        
        </Script>
     
          <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
          <meta name="title" content="Dark Coin | Algorand" />
          <meta name="description" content="Dark Coin is a community-driven Algorand Standard Asset." />
          <meta name="keywords" content="Dark Coin, Algorand, Asset, Rewards, Blockchain" />

          <meta name="theme-color" content={theme.palette.primary.main} />

          
          
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap"
          />

          <link rel="icon" href="/images/favicon.ico"/>
          <link rel="shortcut icon" href="/images/favicon.ico"/>


          
          
        </Head>
        <body style={{backgroundColor: "#000000"}}>

          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

