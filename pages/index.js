import React from "react";
import Head from "next/head";
import Link from "next/link";
import { motion } from "framer-motion";

const REALM_CARDS = [
  {
    key: "arena",
    title: "ARENA",
    href: "/arena",
    image: "/home/arena.png",
    icon: "/home/arenaLogo.png",
    text: "Explore real-time 3D combat and customize your champion in the Armory.",
    button: "ENTER ARENA",
  },
  {
    key: "market",
    title: "MARKET",
    href: "/market",
    image: "/home/market.png",
    icon: "/home/marketLogo.png",
    text: "Trade resources, equipment, and rare goods with players across the realm.",
    button: "ENTER MARKET",
  },
];

export default function DarkCoinHome() {
  return (
    <>
      <Head>
        <title>DarkCoin | A community on Algorand</title>
        <meta name="description" content="DarkCoin is a crypto community on Algorand. Use tokens and NFTs in your wallet to play in the 3D Arena, customize champions, and trade in the marketplace." />
      </Head>

      <main className="dcPage">
        <section className="hero">
          <div className="heroOverlay" />

          <div className="heroContent">
            <div className="heroInner">
              <motion.div
                className="heroLogoSide"
                initial={{ opacity: 0, y: 42, scale: 0.76 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  duration: 1.2,
                  ease: [0.16, 1, 0.3, 1],
                  delay: 0.2,
                }}
              >
                <img
                  src="/invDC.svg"
                  alt="Dark Coin Logo"
                  className="mainLogo"
                />
              </motion.div>

              <div className="heroTextSide">
                <p className="welcome">COMMUNITY ON ALGORAND</p>
                <h1>DarkCoin</h1>
                <p className="subtitle">DarkCoin is a crypto community built on the Algorand blockchain. Connect your wallet to use your tokens and NFTs in the Arena, customize your champion in the Armory, and trade in the marketplace.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="cardsSection">
          <div className="cardsGrid">
            {REALM_CARDS.map((card) => (
              <article className="realmCard" key={card.key}>
                <div className="floatingIcon">
                  <img src={card.icon} alt={`${card.title} icon`} />
                </div>

                <div className="cardShell">
                  <div
                    className="cardImage"
                    style={{ backgroundImage: `url(${card.image})` }}
                  />

                  <div className="cardFade" />

                  <div className="cardContent">
                    <h2>{card.title}</h2>

                    <div className="smallDivider">
                      <span />
                      <b>◇</b>
                      <span />
                    </div>

                    <p>{card.text}</p>

                    <Link href={card.href} legacyBehavior>
                      <a className="cardButton">
                        <span className="cardButtonText">{card.button}</span>
                        <span className="cardButtonArrow">›</span>
                      </a>
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <footer className="footerLinks">
          <a href="https://discord.gg/F6xEUfZGT" target="_blank" rel="noopener noreferrer">
            DISCORD
          </a>
          <a href="https://dark-coin.io" target="_blank" rel="noopener noreferrer">DARK PAPER</a>
          <a href="https://github.com/ToysToTinkerWith/" target="_blank" rel="noopener noreferrer">
            GITHUB
          </a>
        </footer>
      </main>

      <style jsx>{`
        .dcPage {
          min-height: 100vh;
          background: #030303;
          color: #f2f2f2;
          font-family: Georgia, "Times New Roman", serif;
          letter-spacing: 0.12em;
          overflow-x: hidden;
        }

        .hero {
          position: relative;
          min-height: 460px;
          background-image: url("/home/background.png");
          background-size: cover;
          background-position: center top;
          border-bottom: 1px solid rgba(255, 255, 255, 0.12);
        }

        .heroOverlay {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(
              to bottom,
              rgba(0, 0, 0, 0.2),
              rgba(0, 0, 0, 0.6) 65%,
              rgba(0, 0, 0, 0.92)
            ),
            linear-gradient(
              to right,
              rgba(0, 0, 0, 0.9),
              transparent 24%,
              transparent 76%,
              rgba(0, 0, 0, 0.9)
            );
        }

        .heroContent {
          position: relative;
          z-index: 2;
          max-width: 1380px;
          margin: 0 auto;
          padding: 58px 40px 46px;
        }

        .heroInner {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 48px;
          min-height: 300px;
        }

        :global(.heroLogoSide) {
          flex: 0 0 230px;
          display: flex;
          align-items: center;
          justify-content: center;
          will-change: transform, opacity;
        }

        .mainLogo {
          width: 190px;
          max-width: 100%;
          height: auto;
          filter: drop-shadow(0 0 20px rgba(255, 255, 255, 0.22));
        }

        .heroTextSide {
          flex: 1 1 auto;
          min-width: 0;
          text-align: left;
          max-width: 670px;
        }

        .welcome {
          margin: 0 0 8px;
          font-size: 13px;
          letter-spacing: 0.2em;
          color: rgba(255, 255, 255, 0.95);
        }

        h1 {
          margin: 0;
          font-size: clamp(46px, 6.5vw, 86px);
          line-height: 0.95;
          font-weight: 400;
          letter-spacing: 0.035em;
          text-shadow: 0 0 24px rgba(255, 255, 255, 0.18);
          white-space: nowrap;
        }

        .subtitle {
          margin: 12px 0 0;
          max-width: 640px;
          font-size: clamp(16px, 1.45vw, 19px);
          line-height: 1.7;
          letter-spacing: 0.015em;
          color: rgba(255, 255, 255, 0.78);
        }

        .cardsSection {
          position: relative;
          z-index: 3;
          margin-top: -8px;
          padding: 24px 36px 24px;
        }

        .cardsGrid {
          max-width: 1120px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 22px;
          align-items: start;
        }

        .realmCard {
          position: relative;
          padding-top: 34px;
        }

        .cardShell {
          position: relative;
          min-height: 420px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.42);
          border-radius: 5px;
          background: #050505;
          box-shadow:
            inset 0 0 40px rgba(255, 255, 255, 0.04),
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
          width: 34px;
          height: 34px;
          object-fit: contain;
          filter: brightness(1.25) contrast(1.1);
        }

        .cardImage {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          filter: grayscale(1) contrast(1.08) brightness(0.72);
          transform: scale(1.02);
        }

        .cardFade {
          position: absolute;
          inset: 0;
          z-index: 2;
          background:
            linear-gradient(
              to bottom,
              rgba(0, 0, 0, 0.05),
              rgba(0, 0, 0, 0.3) 40%,
              rgba(0, 0, 0, 0.95) 78%
            ),
            radial-gradient(
              circle at 50% 15%,
              transparent,
              rgba(0, 0, 0, 0.68) 72%
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

        .cardContent h2 {
          margin: 0;
          font-size: clamp(28px, 2.7vw, 40px);
          font-weight: 400;
          letter-spacing: 0.24em;
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

        .cardContent p {
          min-height: 74px;
          margin: 0 auto 20px;
          max-width: 265px;
          color: rgba(255, 255, 255, 0.78);
          font-size: 14px;
          line-height: 1.55;
          letter-spacing: 0.1em;
        }

        .cardButton {
          width: 225px;
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
          letter-spacing: 0.24em;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
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

        .cardButtonText {
          display: inline-block;
        }

        .cardButtonArrow {
          display: inline-block;
          font-size: 24px;
          line-height: 1;
          transform: translateY(-1px);
        }

        .footerLinks {
          max-width: 1340px;
          margin: 18px auto 26px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          background: rgba(0, 0, 0, 0.72);
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          min-height: 48px;
        }

        .footerLinks a {
          color: rgba(255, 255, 255, 0.82);
          display: grid;
          place-items: center;
          text-decoration: none;
          font-size: 13px;
          letter-spacing: 0.28em;
          border-right: 1px solid rgba(255, 255, 255, 0.13);
          transition: 180ms ease;
        }

        .footerLinks a:last-child {
          border-right: 0;
        }

        .footerLinks a:hover {
          background: rgba(255, 255, 255, 0.07);
          color: white;
        }

        /* ── Responsive ── */

        @media (max-width: 900px) {
          .cardsGrid {
            grid-template-columns: 1fr;
          }

          .heroInner {
            gap: 24px;
          }

          :global(.heroLogoSide) {
            flex-basis: 190px;
          }

          .mainLogo {
            width: 180px;
          }

          h1 {
            font-size: clamp(46px, 6vw, 72px);
            letter-spacing: 0.035em;
          }
        }

        @media (max-width: 760px) {
          .hero {
            min-height: 460px;
          }

          .heroContent {
            padding: 34px 24px 38px;
          }

          .heroInner {
            flex-direction: column;
            text-align: center;
          }

          :global(.heroLogoSide) { flex: 0 0 auto; }
          .mainLogo { width: 108px; }
          .heroTextSide {
            text-align: center;
          }

          h1 {
            font-size: clamp(44px, 11vw, 62px);
            letter-spacing: 0.035em;
            white-space: nowrap;
          }

          .welcome {
            letter-spacing: 0.18em;
          }

          .subtitle {
            letter-spacing: .015em;
            font-size: 16px;
          }

          .cardsSection {
            padding: 24px 16px 20px;
          }

          .cardButton {
            width: 100%;
            max-width: 225px;
          }

          .footerLinks {
            margin: 18px 16px 24px;
            grid-template-columns: 1fr;
          }

          .footerLinks a {
            min-height: 46px;
            border-right: 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.13);
          }

          .footerLinks a:last-child {
            border-bottom: 0;
          }
        }
      `}</style>
    </>
  );
}
