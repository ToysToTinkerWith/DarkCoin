import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { motion } from "framer-motion";

const NAV_ITEMS = [
  {
    key: "arena",
    label: "ARENA",
    href: "/arena",
    icon: "/home/arenaLogo.png",
  },
  {
    key: "market",
    label: "MARKET",
    href: "/market",
    icon: "/home/marketLogo.png",
  },
  ...(process.env.NEXT_PUBLIC_COUNCIL_ENABLED === 'true' ? [{
    key: "council",
    label: "COUNCIL",
    href: "/council",
    icon: "/home/councilLogo.png",
  }] : []),
];

export default function DarkCoinNavBar({walletControl}) {
  const router = useRouter();

  const isActiveNavItem = (href) => {
    if (!router?.pathname) return false;
    if (router.pathname === href) return true;
    return router.pathname.startsWith(`${href}/`);
  };

  return (
    <>
      <header className="dcNavWrap">
        <nav className="dcNav">

          {/* Logo — left side */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="navLogoSlot"
          >
            <Link href="/" legacyBehavior>
              <a className="navLogo" aria-label="DarkCoin home">
                <img src="/invDC.svg" alt="" className="navLogoImg" /><span className="navWordmark">DarkCoin</span>
              </a>
            </Link>
          </motion.div>

          {/* Section links */}
          <div className="navRight">
            {NAV_ITEMS.map((item, index) => {
              const isActive = isActiveNavItem(item.href);

              return (
                <motion.div
                  key={item.key}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.55,
                    delay: index * 0.08,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <Link href={item.href} legacyBehavior>
                    <a
                      className={`navButton ${isActive ? "navButtonActive" : ""}`}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <span className="navIconShell">
                        <img src={item.icon} alt="" className="navIcon" />
                      </span>

                      <span className="navLabel">{item.label}</span>
                    </a>
                  </Link>
                </motion.div>
              );
            })}
          </div>

          <div className="navWallet">{walletControl}</div>
        </nav>
      </header>

      <style jsx>{`
        .dcNavWrap {
          --nav-height: 78px;

          position: sticky;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          height: var(--nav-height);
          background: transparent;
          font-family: Georgia, "Times New Roman", serif;
          letter-spacing: 0.18em;
        }

        .dcNav {
          position: relative;
          height: var(--nav-height);
          max-width: 1440px;
          margin: 0 auto;
          padding: 0 36px;
          display: grid;
          grid-template-columns: 1fr auto auto;
          align-items: center;
          gap: 32px;
          background:
            linear-gradient(
              to bottom,
              rgba(0, 0, 0, 0.98),
              rgba(0, 0, 0, 0.9)
            ),
            radial-gradient(
              circle at 50% 0%,
              rgba(255, 255, 255, 0.08),
              transparent 44%
            );
          border-bottom: 1px solid rgba(255, 255, 255, 0.14);
          box-shadow:
            0 10px 35px rgba(0, 0, 0, 0.72),
            inset 0 -1px 0 rgba(255, 255, 255, 0.04);
        }

        .dcNav::before {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 1px;
          background: linear-gradient(
            to right,
            transparent,
            rgba(255, 255, 255, 0.4),
            transparent
          );
          pointer-events: none;
        }

        /* ── Logo ── */
        :global(.navLogoSlot) {
          flex: 0 0 auto;
          display: flex;
          align-items: center;
          height: var(--nav-height);
        }

        .navLogo {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: var(--nav-height);
          padding: 0 4px;
          text-decoration: none;
          transition:
            filter 180ms ease,
            transform 180ms ease;
        }

        .navLogo:hover {
          filter: drop-shadow(0 0 14px rgba(255, 255, 255, 0.38));
          transform: translateY(-1px);
        }

        .navLogoImg {
          width: 38px;
          height: 38px;
          object-fit: contain;
          filter: brightness(1.2) contrast(1.1);
          display: block;
        }

        /* ── Right group ── */
        .navRight {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: clamp(16px, 2.4vw, 36px);
          height: var(--nav-height);
          padding-right: 0;
        }

        /* ── Nav buttons ── */
        .navButton {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          min-height: var(--nav-height);
          color: rgba(255, 255, 255, 0.8);
          text-decoration: none;
          font-size: 13px;
          line-height: 1;
          white-space: nowrap;
          transition:
            color 180ms ease,
            text-shadow 180ms ease,
            transform 180ms ease;
        }

        .navButton::after {
          content: "";
          position: absolute;
          left: 50%;
          bottom: 14px;
          width: 0;
          height: 1px;
          transform: translateX(-50%);
          background: linear-gradient(
            to right,
            transparent,
            rgba(255, 255, 255, 0.86),
            transparent
          );
          opacity: 0;
          transition:
            width 180ms ease,
            opacity 180ms ease,
            height 180ms ease;
        }

        .navButton:hover {
          color: #fff;
          text-shadow: 0 0 16px rgba(255, 255, 255, 0.35);
          transform: translateY(-1px);
        }

        .navButton:hover::after {
          width: 100%;
          opacity: 1;
        }

        .navButtonActive {
          color: #fff;
          text-shadow:
            0 0 14px rgba(255, 255, 255, 0.42),
            0 0 28px rgba(255, 255, 255, 0.16);
        }

        .navButtonActive::after {
          width: 100%;
          height: 2px;
          opacity: 1;
          background: linear-gradient(
            to right,
            transparent,
            rgba(255, 255, 255, 1),
            rgba(255, 255, 255, 0.78),
            transparent
          );
          box-shadow: 0 0 10px rgba(255, 255, 255, 0.45);
        }

        .navButtonActive .navIconShell {
          opacity: 1;
          filter:
            drop-shadow(0 0 8px rgba(255, 255, 255, 0.3))
            drop-shadow(0 0 18px rgba(255, 255, 255, 0.16));
        }

        .navButtonActive .navIcon {
          filter: grayscale(1) brightness(1.85) contrast(1.2);
        }

        .navIconShell {
          width: 28px;
          height: 28px;
          display: inline-grid;
          place-items: center;
          flex: 0 0 auto;
          opacity: 0.92;
          filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.18));
          transition:
            opacity 180ms ease,
            filter 180ms ease;
        }

        .navIcon {
          width: 25px;
          height: 25px;
          object-fit: contain;
          filter: grayscale(1) brightness(1.45) contrast(1.12);
          transition: filter 180ms ease;
        }

        .navLabel {
          transform: translateY(1px);
        }

        .navLogo { gap: 11px; color: #f2efe7; }
        .navWordmark { font-size: 25px; font-weight: 400; letter-spacing: .025em; }
        .navWallet { display:flex; justify-content:flex-end; align-items:center; }
        .navLogo:focus-visible, .navButton:focus-visible { outline:2px solid #f2efe7; outline-offset:3px; }
        @media(max-width:1050px) {
          .dcNav { padding:0 20px; gap:22px; }
          .navRight { gap:20px; }
          .navButton { font-size:11px; gap:7px; letter-spacing:.12em; }
          .navIconShell { width:24px; height:24px; }
          .navIcon { width:22px; height:22px; }
        }
        @media(max-width:760px) {
          .dcNavWrap { --nav-height:114px; }
          .dcNav { grid-template-columns:1fr auto; grid-template-rows:64px 50px; grid-template-areas:"brand wallet" "links links"; gap:0 12px; padding:0 16px; }
          :global(.navLogoSlot) { grid-area:brand; height:64px; }
          .navLogo { height:64px; padding:0; gap:8px; }
          .navLogoImg { width:30px; height:30px; }
          .navWordmark { font-size:21px; }
          .navWallet { grid-area:wallet; }
          .navRight { grid-area:links; height:50px; justify-content:center; gap:38px; padding:0; border-top:1px solid #ffffff12; }
          .navButton { min-height:46px; gap:7px; font-size:10px; }
          .navButton::after { bottom:3px; }
          .navIconShell { width:21px; height:21px; }
          .navIcon { width:20px; height:20px; }
        }
        @media(max-width:360px) {
          .dcNav { padding:0 12px; }
          .navRight { gap:24px; }
          .navWordmark { font-size:20px; }
        }
      `}</style>
    </>
  );
}
