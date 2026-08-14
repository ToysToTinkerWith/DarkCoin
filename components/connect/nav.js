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
    key: "council",
    label: "COUNCIL",
    href: "/council",
    icon: "/home/councilLogo.png",
  },
  {
    key: "market",
    label: "MARKET",
    href: "/market",
    icon: "/home/marketLogo.png",
  },
];

export default function DarkCoinNavBar() {
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
              <a className="navLogo" aria-label="Dark Coin home">
                <img src="/invDC.svg" alt="Dark Coin" className="navLogoImg" />
              </a>
            </Link>
          </motion.div>

          {/* Nav items — right side */}
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
          display: flex;
          align-items: center;
          justify-content: space-between;
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
        .navLogoSlot {
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
          gap: clamp(22px, 4vw, 64px);
          height: var(--nav-height);
          padding-right: 48px;
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

        @media (max-width: 980px) {
          .dcNavWrap {
            --nav-height: 78px;
          }

          .dcNav {
            padding: 0 18px;
          }

          .navRight {
            gap: 24px;
            padding-right: 24px;
          }

          .navButton {
            font-size: 11px;
            gap: 8px;
          }

          .navIconShell {
            width: 24px;
            height: 24px;
          }

          .navIcon {
            width: 21px;
            height: 21px;
          }
        }

        @media (max-width: 680px) {
          .dcNavWrap {
            --nav-height: 70px;
          }

          .dcNav {
            height: var(--nav-height);
            padding: 0 14px;
          }

          .navLogoImg {
            width: 32px;
            height: 32px;
          }

          .navRight {
            gap: 8px;
            padding-right: 0;
          }

          .navButton {
            min-height: var(--nav-height);
            flex-direction: column;
            gap: 5px;
            font-size: 9px;
            letter-spacing: 0.12em;
          }

          .navButton::after {
            bottom: 8px;
          }

          .navButtonActive::after {
            width: 78%;
          }
        }
      `}</style>
    </>
  );
}
