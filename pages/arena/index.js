import React from "react";
import Head from "next/head";
import Link from "next/link";
import { motion } from "framer-motion";
import {PLAYGROUND_JOIN_ENABLED} from '../../lib/arena/availability';

const ARENA_APPS = [
  ...(PLAYGROUND_JOIN_ENABLED ? [{key:'playground',title:'PLAYGROUND',href:'/arena/playground',image:'/home/arena.png',kicker:'3D practice arena',description:'Preview your champion and test real-time multiplayer combat in the 3D arena.',action:'ENTER PLAYGROUND'}] : []),
  {
    key: "fight",
    title: "FIGHT",
    href: "/arena/fight",
    image: "/home/arena.png",
    kicker: "Bounties",
    description:
      "Send Dark Coin Champions into active arena bounties and challenge the fighters already waiting there.",
    action: "ENTER FIGHTS",
  },
  {
    key: "depths",
    title: "THE DEPTHS",
    href: "/arena/depths",
    image: "/arena/depths/depths-button.png",
    kicker: "Dungeon runs",
    description:
      "Build a loadout, battle through nodes, gather artifacts, and push for cache rewards.",
    action: "DESCEND",
  },
  {
    key: "armory",
    title: "ARMORY",
    href: "/arena/armory",
    image: "/arena/overview-armory.png",
    kicker: "Champion gear",
    description:
      "Review your Champion assets and tune the trait loadout that shapes how they fight.",
    action: "OPEN ARMORY",
  },
];

export default function Arena() {
  return (
    <>
      <Head>
        <title>Dark Coin Arena</title>
        <meta
          name="description"
          content="Enter the Dark Coin Arena to fight, descend into the Depths, manage Champions, and inspect arena systems."
        />
      </Head>

      <main className="arenaOverviewPage">
        <section className="arenaSplash">
          <div className="arenaSplashOverlay" />

          <div className="arenaSplashContent">
            <motion.div
              className="arenaSeal"
              initial={{ opacity: 0, y: 30, scale: 0.82 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <img src="/home/arenaLogo.png" alt="" className="arenaSealImg" />
            </motion.div>

            <div className="arenaSplashText">
              <p className="arenaWelcome">ENTER THE</p>
              <h1>ARENA</h1>
              <p className="arenaSubtitle">
                FIGHTS, DEPTHS RUNS, AND CHAMPION ARMORY.
              </p>
            </div>
          </div>
        </section>

        <section className="arenaCardsSection">
          <div className="arenaCardsGrid">
            {ARENA_APPS.map((app, index) => (
              <motion.article
                className="arenaAppCard"
                key={app.key}
                initial={{ opacity: 0, y: 26 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.7,
                  delay: 0.08 * index,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <div className="floatingIcon">
                  <img src="/home/arenaLogo.png" alt="" />
                </div>

                <div className="cardShell">
                  <div
                    className="cardImage"
                    style={{
                      backgroundImage: `url(${app.image})`,
                      backgroundSize: app.fit || "cover",
                      backgroundRepeat: "no-repeat",
                    }}
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

                    <Link href={app.href} legacyBehavior>
                      <a className="cardButton">
                        <span className="cardButtonText">{app.action}</span>
                        <span className="cardButtonArrow">&gt;</span>
                      </a>
                    </Link>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </section>
      </main>

      <style jsx>{`
        .arenaOverviewPage {
          min-height: 100vh;
          background: #030303;
          color: #f2f2f2;
          font-family: Georgia, "Times New Roman", serif;
          letter-spacing: 0.12em;
          overflow-x: hidden;
        }

        .arenaSplash {
          position: relative;
          min-height: 560px;
          background-image: url("/home/arena.png"), url("/home/background.png");
          background-size: cover;
          background-position: center 46%;
          border-bottom: 1px solid rgba(255, 255, 255, 0.12);
        }

        .arenaSplashOverlay {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(
              to bottom,
              rgba(0, 0, 0, 0.12),
              rgba(0, 0, 0, 0.58) 60%,
              rgba(0, 0, 0, 0.96)
            ),
            linear-gradient(
              to right,
              rgba(0, 0, 0, 0.92),
              rgba(0, 0, 0, 0.24) 30%,
              rgba(0, 0, 0, 0.24) 70%,
              rgba(0, 0, 0, 0.92)
            );
        }

        .arenaSplashContent {
          position: relative;
          z-index: 2;
          min-height: 430px;
          max-width: 1260px;
          margin: 0 auto;
          padding: 76px 38px 46px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 46px;
        }

        .arenaSeal {
          width: 156px;
          height: 156px;
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

        .arenaSealImg {
          width: 92px;
          height: 92px;
          object-fit: contain;
          filter: grayscale(1) brightness(1.32) contrast(1.12);
        }

        .arenaSplashText {
          min-width: 0;
        }

        .arenaWelcome {
          margin: 0 0 8px;
          font-size: clamp(18px, 2vw, 32px);
          letter-spacing: 0.32em;
          color: rgba(255, 255, 255, 0.94);
        }

        h1 {
          margin: 0;
          font-size: clamp(50px, 8vw, 116px);
          line-height: 0.95;
          font-weight: 400;
          letter-spacing: 0.16em;
          text-shadow: 0 0 24px rgba(255, 255, 255, 0.18);
          white-space: nowrap;
        }

        .arenaSubtitle {
          max-width: 860px;
          margin: 14px 0 0;
          font-size: clamp(11px, 1.1vw, 18px);
          line-height: 1.6;
          letter-spacing: 0.25em;
          color: rgba(255, 255, 255, 0.78);
        }

        .arenaCardsSection {
          position: relative;
          z-index: 3;
          margin-top: -78px;
          padding: 24px 36px 58px;
        }

        .arenaCardsGrid {
          max-width: 1440px;
          margin: 0 auto;
          display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 22px;
          align-items: start;
        }

        .arenaAppCard {
          position: relative;
          padding-top: 34px;
        }

        .cardShell {
          position: relative;
          min-height: 455px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.42);
          border-radius: 5px;
          background:
            radial-gradient(circle at 50% 20%, rgba(255, 255, 255, 0.09), transparent 44%),
            #050505;
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
          width: 42px;
          height: 42px;
          object-fit: contain;
          filter: grayscale(1) brightness(1.28) contrast(1.1);
        }

        .cardImage {
          position: absolute;
          inset: 0;
          background-position: center;
          filter: grayscale(1) contrast(1.08) brightness(0.74);
          transform: scale(1.02);
          transition:
            transform 260ms ease,
            filter 260ms ease;
        }

        .arenaAppCard:hover .cardImage {
          transform: scale(1.055);
          filter: grayscale(1) contrast(1.14) brightness(0.84);
        }

        .cardFade {
          position: absolute;
          inset: 0;
          z-index: 2;
          background:
            linear-gradient(
              to bottom,
              rgba(0, 0, 0, 0.04),
              rgba(0, 0, 0, 0.28) 40%,
              rgba(0, 0, 0, 0.95) 78%
            ),
            radial-gradient(
              circle at 50% 16%,
              transparent,
              rgba(0, 0, 0, 0.68) 74%
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
          font-size: clamp(24px, 2.3vw, 38px);
          font-weight: 400;
          letter-spacing: 0.2em;
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
          max-width: 330px;
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
          font-size: 18px;
          line-height: 1;
          transform: translateY(-1px);
        }

        @media (max-width: 1220px) {
          .arenaCardsGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 980px) {
          .arenaSplashContent {
            gap: 30px;
          }

          .arenaSeal {
            width: 124px;
            height: 124px;
          }

          .arenaSealImg {
            width: 74px;
            height: 74px;
          }
        }

        @media (max-width: 720px) {
          .arenaSplash {
            min-height: 520px;
          }

          .arenaSplashContent {
            min-height: 400px;
            padding: 54px 20px 36px;
            flex-direction: column;
            text-align: center;
            justify-content: center;
          }

          h1 {
            font-size: clamp(42px, 14vw, 70px);
            letter-spacing: 0.1em;
          }

          .arenaWelcome {
            letter-spacing: 0.18em;
          }

          .arenaSubtitle {
            letter-spacing: 0.14em;
          }

          .arenaCardsSection {
            margin-top: -48px;
            padding: 24px 16px 44px;
          }

          .arenaCardsGrid {
            grid-template-columns: 1fr;
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
