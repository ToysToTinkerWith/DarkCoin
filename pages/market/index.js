import React from "react";
import Head from "next/head";
import Link from "next/link";
import { motion } from "framer-motion";
import { useWallet } from "@txnlab/use-wallet-react";
import { MARKET_APPS } from "../../components/contracts/Market/MarketPageShell";
import ShareLink from "../../components/contracts/Market/ShareLink";
import { stallPath } from "../../functions/market/model";

export default function Market() {
  const { activeAddress } = useWallet();
  return (
    <>
      <Head>
        <title>Dark Coin Market</title>
        <meta
          name="description"
          content="Browse, list, and manage NFTs in the Dark Coin market."
        />
      </Head>

      <main className="marketOverviewPage">
        <section className="marketSplash">
          <div className="marketSplashOverlay" />

          <div className="marketSplashContent">
            <motion.div
              className="marketSeal"
              initial={{ opacity: 0, y: 30, scale: 0.82 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <img src="/home/marketLogo.png" alt="" className="marketSealImg" />
            </motion.div>

            <div className="marketSplashText">
              <p className="marketWelcome">ENTER THE</p>
              <h1>MARKET</h1>
              <p className="marketSubtitle">
                LISTED NFTS, WALLET GOODS, AND YOUR OWN STALL.
              </p>
            </div>
          </div>
        </section>

        <section className="marketCardsSection">
          <div className="marketCardsGrid">
            {MARKET_APPS.map((app, index) => (
              <motion.article
                className="marketAppCard"
                key={app.key}
                initial={{ opacity: 0, y: 26 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.7,
                  delay: 0.12 * index,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <div className="floatingIcon">
                  <img src="/home/marketLogo.png" alt="" />
                </div>

                <div className="cardShell">
                  <div
                    className="cardImage"
                    style={{ backgroundImage: `url(${app.image})` }}
                  />
                  <div className="cardFade" />

                  <div className="cardContent">
                    <p className="cardKicker">{app.kicker}</p>
                    <h2>{app.title}</h2>

                    <div className="smallDivider">
                      <span />
                      <b>◇</b>
                      <span />
                    </div>

                    <p className="cardText">{app.description}</p>

                    <Link href={app.key === "stall" && activeAddress ? stallPath(activeAddress) : app.href} legacyBehavior>
                      <a className="cardButton">
                        <span className="cardButtonText">{app.action}</span>
                        <span className="cardButtonArrow">›</span>
                      </a>
                    </Link>
                    {app.key === "stall" && activeAddress ? (
                      <div className="marketCardShare">
                        <ShareLink path={stallPath(activeAddress)} label="Copy your stall link" showLabel />
                      </div>
                    ) : null}
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </section>
      </main>

      <style jsx>{`
        .marketCardShare { display: flex; justify-content: center; margin-top: 12px; }
        .marketOverviewPage {
          min-height: 100vh;
          background: #030303;
          color: #f2f2f2;
          font-family: Georgia, "Times New Roman", serif;
          letter-spacing: 0.12em;
          overflow-x: hidden;
        }

        .marketSplash {
          position: relative;
          min-height: 540px;
          background-image: url("/hubbook/home/market.PNG"), url("/home/market.png");
          background-size: cover;
          background-position: center 44%;
          border-bottom: 1px solid rgba(255, 255, 255, 0.12);
        }

        .marketSplashOverlay {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(
              to bottom,
              rgba(0, 0, 0, 0.12),
              rgba(0, 0, 0, 0.56) 62%,
              rgba(0, 0, 0, 0.95)
            ),
            linear-gradient(
              to right,
              rgba(0, 0, 0, 0.92),
              rgba(0, 0, 0, 0.22) 28%,
              rgba(0, 0, 0, 0.24) 72%,
              rgba(0, 0, 0, 0.92)
            );
        }

        .marketSplashContent {
          position: relative;
          z-index: 2;
          min-height: 420px;
          max-width: 1260px;
          margin: 0 auto;
          padding: 74px 38px 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 46px;
        }

        .marketSeal {
          width: 150px;
          height: 150px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.54);
          background: rgba(0, 0, 0, 0.84);
          box-shadow:
            0 0 0 8px rgba(0, 0, 0, 0.68),
            inset 0 0 28px rgba(255, 255, 255, 0.1),
            0 0 42px rgba(255, 255, 255, 0.12);
          flex: 0 0 auto;
        }

        .marketSealImg {
          width: 86px;
          height: 86px;
          object-fit: contain;
          filter: grayscale(1) brightness(1.35) contrast(1.12);
        }

        .marketSplashText {
          min-width: 0;
        }

        .marketWelcome {
          margin: 0 0 8px;
          font-size: clamp(18px, 2vw, 32px);
          letter-spacing: 0.32em;
          color: rgba(255, 255, 255, 0.94);
        }

        h1 {
          margin: 0;
          font-size: clamp(48px, 8vw, 112px);
          line-height: 0.95;
          font-weight: 400;
          letter-spacing: 0.16em;
          text-shadow: 0 0 24px rgba(255, 255, 255, 0.18);
          white-space: nowrap;
        }

        .marketSubtitle {
          margin: 14px 0 0;
          font-size: clamp(11px, 1.1vw, 18px);
          line-height: 1.6;
          letter-spacing: 0.28em;
          color: rgba(255, 255, 255, 0.78);
        }

        .marketCardsSection {
          position: relative;
          z-index: 3;
          margin-top: -72px;
          padding: 24px 36px 54px;
        }

        .marketCardsGrid {
          max-width: 1440px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 22px;
          align-items: start;
        }

        .marketAppCard {
          position: relative;
          padding-top: 34px;
        }

        .cardShell {
          position: relative;
          min-height: 470px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.42);
          border-radius: 5px;
          background: #050505;
          box-shadow:
            inset 0 0 40px rgba(255, 255, 255, 0.04),
            0 18px 44px rgba(0, 0, 0, 0.62),
            0 0 18px rgba(255, 255, 255, 0.04);
        }

        .cardShell::before {
          content: "";
          position: absolute;
          inset: 0;
          margin: 8px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          pointer-events: none;
          z-index: 4;
        }

        .floatingIcon {
          position: absolute;
          z-index: 8;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 72px;
          height: 72px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.55);
          background: rgba(0, 0, 0, 0.92);
          display: grid;
          place-items: center;
          box-shadow:
            0 0 0 5px rgba(0, 0, 0, 0.85),
            inset 0 0 18px rgba(255, 255, 255, 0.12);
        }

        .floatingIcon img {
          width: 40px;
          height: 40px;
          object-fit: contain;
          filter: grayscale(1) brightness(1.25) contrast(1.1);
        }

        .cardImage {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          filter: grayscale(1) contrast(1.08) brightness(0.74);
          transform: scale(1.02);
          transition:
            transform 260ms ease,
            filter 260ms ease;
        }

        .marketAppCard:hover .cardImage {
          transform: scale(1.055);
          filter: grayscale(1) contrast(1.12) brightness(0.82);
        }

        .cardFade {
          position: absolute;
          inset: 0;
          z-index: 2;
          background:
            linear-gradient(
              to bottom,
              rgba(0, 0, 0, 0.02),
              rgba(0, 0, 0, 0.28) 42%,
              rgba(0, 0, 0, 0.95) 78%
            ),
            radial-gradient(
              circle at 50% 16%,
              transparent,
              rgba(0, 0, 0, 0.66) 74%
            );
        }

        .cardContent {
          position: absolute;
          z-index: 5;
          left: 24px;
          right: 24px;
          bottom: 28px;
          text-align: center;
        }

        .cardKicker {
          margin: 0 0 8px;
          color: rgba(255, 255, 255, 0.58);
          font-size: 10px;
          letter-spacing: 0.24em;
          text-transform: uppercase;
        }

        .cardContent h2 {
          margin: 0;
          font-size: clamp(26px, 2.5vw, 38px);
          font-weight: 400;
          letter-spacing: 0.22em;
          text-shadow: 0 0 18px rgba(255, 255, 255, 0.22);
        }

        .smallDivider {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin: 10px auto 14px;
          color: rgba(255, 255, 255, 0.75);
        }

        .smallDivider span {
          width: 72px;
          height: 1px;
          background: linear-gradient(
            to right,
            transparent,
            rgba(255, 255, 255, 0.55),
            transparent
          );
        }

        .smallDivider b {
          font-size: 12px;
          font-weight: 400;
        }

        .cardText {
          min-height: 78px;
          margin: 0 auto 20px;
          max-width: 310px;
          color: rgba(255, 255, 255, 0.78);
          font-size: 13px;
          line-height: 1.55;
          letter-spacing: 0.09em;
        }

        .cardButton {
          width: 235px;
          min-height: 42px;
          padding: 10px 18px;
          border-radius: 3px;
          font-size: 12px;
          line-height: 1.2;
          color: #f4f4f4;
          background: rgba(0, 0, 0, 0.62);
          border: 1px solid rgba(255, 255, 255, 0.55);
          box-shadow:
            inset 0 0 16px rgba(255, 255, 255, 0.08),
            0 0 18px rgba(255, 255, 255, 0.08);
          font-family: inherit;
          letter-spacing: 0.2em;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          transition: 180ms ease;
          white-space: nowrap;
          text-decoration: none;
        }

        .cardButton:hover {
          background: rgba(255, 255, 255, 0.08);
          box-shadow:
            inset 0 0 20px rgba(255, 255, 255, 0.12),
            0 0 24px rgba(255, 255, 255, 0.14);
        }

        .cardButtonArrow {
          display: inline-block;
          font-size: 24px;
          line-height: 1;
          transform: translateY(-1px);
        }

        @media (max-width: 1220px) {
          .marketCardsGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 980px) {
          .marketCardsGrid {
            grid-template-columns: 1fr;
          }

          .marketSplashContent {
            gap: 30px;
          }

          .marketSeal {
            width: 124px;
            height: 124px;
          }

          .marketSealImg {
            width: 72px;
            height: 72px;
          }
        }

        @media (max-width: 720px) {
          .marketSplash {
            min-height: 500px;
          }

          .marketSplashContent {
            min-height: 390px;
            padding: 54px 20px 36px;
            flex-direction: column;
            text-align: center;
            justify-content: center;
          }

          h1 {
            font-size: clamp(42px, 14vw, 68px);
            letter-spacing: 0.1em;
          }

          .marketWelcome {
            letter-spacing: 0.18em;
          }

          .marketSubtitle {
            letter-spacing: 0.15em;
          }

          .marketCardsSection {
            margin-top: -44px;
            padding: 24px 16px 42px;
          }

          .cardButton {
            width: 100%;
            max-width: 235px;
          }
        }
      `}</style>
    </>
  );
}
