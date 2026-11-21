import React from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useWallet } from "@txnlab/use-wallet-react";
import { stallPath } from "../../../functions/market/model";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

export const MARKET_APPS = [
  {
    key: "browse",
    title: "BUY",
    label: "Buy",
    href: "/market/browse",
    image: "/market/overview-buy.png",
    kicker: "Open listings",
    description:
      "Search the market's listed NFTs and purchase available assets from other stalls.",
    action: "BROWSE LISTINGS",
  },
  {
    key: "list",
    title: "LIST",
    label: "List",
    href: "/market/list",
    image: "/market/overview-sell.png",
    kicker: "Wallet assets",
    description:
      "Choose NFTs from your connected wallet and set the price for a new market listing.",
    action: "LIST AN ASSET",
  },
  {
    key: "stall",
    title: "YOUR STALL",
    label: "Stall",
    href: "/market/stall",
    image: "/market/overview-stall.png",
    kicker: "Your listings",
    description:
      "Review the NFTs you currently have listed and pull them back from the market.",
    action: "VIEW STALL",
  },
];

export const marketTextFieldSx = {
  input: {
    color: "white",
    fontFamily: 'Georgia, "Times New Roman", serif',
    letterSpacing: "0.08em",
  },
  label: {
    color: "rgba(255,255,255,0.68)",
    fontFamily: 'Georgia, "Times New Roman", serif',
    letterSpacing: "0.08em",
    "&.Mui-focused": {
      color: "white",
    },
  },
  ".MuiOutlinedInput-root": {
    backgroundColor: "rgba(0,0,0,0.48)",
    borderRadius: "5px",
    fontFamily: 'Georgia, "Times New Roman", serif',
    "& fieldset": {
      borderColor: "rgba(255,255,255,0.34)",
    },
    "&:hover fieldset": {
      borderColor: "rgba(255,255,255,0.64)",
    },
    "&.Mui-focused fieldset": {
      borderColor: "rgba(255,255,255,0.86)",
      boxShadow: "0 0 18px rgba(255,255,255,0.08)",
    },
  },
};

export function MarketPageShell({
  title,
  eyebrow = "DARK COIN MARKET",
  subtitle,
  children,
}) {
  const router = useRouter();
  const { activeAddress } = useWallet();

  return (
    <>
      <Head>
        <title>{title ? `${title} | Dark Coin Market` : "Dark Coin Market"}</title>
        <meta
          name="description"
          content="Dark Coin market for browsing, listing, and managing NFT stalls."
        />
      </Head>

      <main className="marketPage">
        <section className="marketHero">
          <div className="marketHeroOverlay" />

          <div className="marketHeroContent">
            <Link href="/market" legacyBehavior>
              <a className="marketBackLink">MARKET OVERVIEW</a>
            </Link>

            <p className="marketEyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            {subtitle ? <p className="marketSubtitle">{subtitle}</p> : null}

            <nav className="marketSubnav" aria-label="Market sections">
              {MARKET_APPS.map((app) => {
                const active = router.pathname === app.href || router.pathname.startsWith(`${app.href}/`);

                return (
                  <Link href={app.key === "stall" && activeAddress ? stallPath(activeAddress) : app.href} legacyBehavior key={app.key}>
                    <a
                      className={`marketSubnavButton ${
                        active ? "marketSubnavButtonActive" : ""
                      }`}
                      aria-current={active ? "page" : undefined}
                    >
                      <span>{app.label}</span>
                    </a>
                  </Link>
                );
              })}
            </nav>
          </div>
        </section>

        <section className="marketContent">{children}</section>
      </main>

      <MarketGlobalStyles />
    </>
  );
}

export function MarketToolbar({ children, onBack, backLabel = "Back to assets" }) {
  return (
    <div className={`marketToolbar ${onBack ? "marketToolbarWithBack" : ""}`}>
      {onBack ? (
        <button
          type="button"
          className="marketSelectionBackButton"
          onClick={onBack}
          aria-label={backLabel}
          title={backLabel}
        >
          <ArrowBackIcon fontSize="small" />
        </button>
      ) : null}
      {children}
    </div>
  );
}

export function MarketPager({
  listNum,
  total,
  pageSize = 50,
  onPrev,
  onNext,
}) {
  const hasAssets = total > 0;
  const start = hasAssets ? listNum + 1 : 0;
  const end = hasAssets ? Math.min(total, listNum + pageSize) : 0;
  const canPrev = listNum - pageSize >= 0;
  const canNext = listNum + pageSize < total;

  return (
    <div className="marketPager">
      <button
        type="button"
        className="marketIconButton"
        onClick={canPrev ? onPrev : undefined}
        disabled={!canPrev}
        aria-label="Previous page"
        title="Previous page"
      >
        <ArrowBackIcon fontSize="small" />
      </button>

      <p>
        Showing assets <span>{start}</span> - <span>{end}</span> of{" "}
        <span>{total}</span>
      </p>

      <button
        type="button"
        className="marketIconButton"
        onClick={canNext ? onNext : undefined}
        disabled={!canNext}
        aria-label="Next page"
        title="Next page"
      >
        <ArrowForwardIcon fontSize="small" />
      </button>
    </div>
  );
}

export function MarketEmptyState({ title, text }) {
  return (
    <div className="marketEmptyState">
      <img src="/home/marketLogo.png" alt="" />
      <h2>{title}</h2>
      {text ? <p>{text}</p> : null}
    </div>
  );
}

export function MarketGlobalStyles() {
  return (
    <style jsx global>{`
      .marketListingsGrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(245px, 100%), 1fr)); gap: 20px; }
      .marketListingCard { min-width: 0; border: 1px solid #333; border-radius: 5px; overflow: hidden; background: #101010; letter-spacing: 0; }
      .marketListingArtwork { display: block; aspect-ratio: 1; background: #080808; }
      .marketListingArtwork img, .marketListingDetailArt img { width: 100%; height: 100%; object-fit: contain; }
      .marketListingCardBody { padding: 16px; }
      .marketListingTitle { display: block; font-size: 20px; color: #fff; line-height: 1.3; overflow-wrap: anywhere; text-decoration: none; }
      .marketListingCardBody p { color: #b5b5b5; font-size: 13px; margin: 10px 0; overflow-wrap: anywhere; }
      .marketListingCardBody .marketListingPrice { display: flex; align-items: center; gap: 8px; font-size: 17px; color: #e5f1ea; }
      .marketPriceAmount { min-width: 0; }
      .marketListingPrice small { font-size: 12px; color: #aaa; }
      .marketPaymentIcon { width: 22px; height: 22px; flex: 0 0 22px; display: inline-grid; place-items: center; font-size: 22px; vertical-align: middle; }
      .marketPaymentIcon img { width: 22px; height: 22px; object-fit: contain; }
      .marketListingDetailPrice { display: flex; align-items: center; justify-content: flex-end; gap: 8px; }
      .marketListingDetailPrice > span:last-child { min-width: 0; }
      .marketPaymentFilter { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; padding: 0 0 20px; letter-spacing: 0; }
      .marketPaymentFilterLabel { font-size: 14px; color: #bbb; }
      .marketPaymentFilter > .MuiTextField-root { width: 220px; max-width: 100%; }
      .marketPaymentShortcuts { display: inline-flex; max-width: 100%; min-width: 0; }
      .marketPaymentShortcuts button { min-height: 42px; display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 8px 12px; border: 1px solid #555; border-radius: 0; background: #101010; color: #ddd; font: 13px Georgia, serif; letter-spacing: 0; cursor: pointer; }
      .marketPaymentShortcuts button + button { border-left: 0; }
      .marketPaymentShortcuts button:first-child { border-radius: 4px 0 0 4px; }
      .marketPaymentShortcuts button:last-child { border-radius: 0 4px 4px 0; }
      .marketPaymentShortcuts button[aria-pressed="true"] { background: #303a34; color: #fff; box-shadow: inset 0 -2px #9fdab5; }
      .marketPaymentShortcuts button:hover:not(:disabled) { background: #303030; color: #fff; }
      .marketPaymentShortcuts button:focus-visible { outline: 2px solid #fff; outline-offset: 2px; z-index: 1; }
      .marketPaymentShortcuts button:disabled { opacity: 0.5; cursor: default; }
      .marketCostAssetField { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; min-width: 0; }
      .marketCostAssetField > .MuiTextField-root { flex: 1 1 240px; min-width: 0; }
      .marketPaymentFilter input, .marketPaymentFilter label, .marketCostAssetField input, .marketCostAssetField label, .marketFormGrid input[name="costAmount"], .marketFormGrid label[for] { letter-spacing: 0; }
      .marketListingCardFooter, .marketListingNavigation, .marketStallHeading { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-width: 0; }
      .marketListingCardFooter { border-top: 1px solid #333; padding-top: 12px; margin-top: 16px; }
      .marketListingCardFooter a, .marketListingNavigation a { color: #bfc9c3; font-size: 13px; }
      .marketListingNavigation { margin: 12px 0 22px; letter-spacing: 0; }
      .marketStallHeading { padding: 20px 0 28px; letter-spacing: 0; flex-wrap: wrap; }
      .marketStallHeading > div:first-child { min-width: 0; flex: 1 1 260px; }
      .marketStallHeading p { margin: 0 0 8px; color: #a5a5a5; }
      .marketStallHeading code { overflow-wrap: anywhere; font-size: 14px; }
      .marketShare { position: relative; flex-shrink: 0; }
      .marketShare input { position: absolute; right: 0; z-index: 10; width: min(280px, 70vw); padding: 8px; }
      .marketSrOnly { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); }
      .marketListingDetail { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); gap: 40px; letter-spacing: 0; }
      .marketListingDetailArt { aspect-ratio: 1; min-width: 0; background: #080808; }
      .marketListingInfo { min-width: 0; padding: 8px 0; }
      .marketListingInfo h2 { margin: 12px 0; font-size: 32px; line-height: 1.25; font-weight: 400; overflow-wrap: anywhere; }
      .marketListingStatus { color: #9fdab5; margin: 0; font-size: 14px; }
      .marketAssetExplorer { display: inline-flex; gap: 6px; color: #b0b0b0; font-size: 13px; align-items: center; }
      .marketListingInfo dl { margin: 28px 0; }
      .marketListingInfo dl > div { display: flex; justify-content: space-between; gap: 20px; padding: 14px 0; border-bottom: 1px solid #333; }
      .marketListingInfo dt { color: #aaa; font-size: 14px; }
      .marketListingInfo dd { margin: 0; text-align: right; overflow-wrap: anywhere; min-width: 0; }
      .marketListingInfo dd a { color: #e4ece7; }
      .marketListingInfo .marketActionButton, .marketListingInfo .marketSecondaryButton { letter-spacing: 0; font-size: 14px; padding: 12px 18px; overflow-wrap: anywhere; }
      .marketBuyButton { width: 100%; margin-top: 14px; }
      .marketNotice { overflow-wrap: anywhere; line-height: 1.6; font-size: 14px; letter-spacing: 0; padding: 16px 0; }
      .marketTextLink { display: inline-flex; align-items: center; text-decoration: none; }
      @media (max-width: 760px) {
        .marketListingDetail { grid-template-columns: minmax(0, 1fr); gap: 24px; }
        .marketListingInfo h2 { font-size: 28px; }
        .marketListingInfo dl > div { gap: 12px; }
      }
      .marketPage {
        min-height: 100vh;
        background: #030303;
        color: #f2f2f2;
        font-family: Georgia, "Times New Roman", serif;
        letter-spacing: 0.12em;
        overflow-x: hidden;
      }

      .marketHero {
        position: relative;
        min-height: 390px;
        background-image: url("/hubbook/home/market.PNG"), url("/home/market.png");
        background-size: cover;
        background-position: center 44%;
        border-bottom: 1px solid rgba(255, 255, 255, 0.14);
      }

      .marketHeroOverlay {
        position: absolute;
        inset: 0;
        background:
          linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0.2),
            rgba(0, 0, 0, 0.62) 58%,
            rgba(0, 0, 0, 0.96)
          ),
          linear-gradient(
            to right,
            rgba(0, 0, 0, 0.92),
            rgba(0, 0, 0, 0.28) 36%,
            rgba(0, 0, 0, 0.28) 64%,
            rgba(0, 0, 0, 0.92)
          );
      }

      .marketHeroContent {
        position: relative;
        z-index: 2;
        max-width: 1260px;
        margin: 0 auto;
        padding: 72px 36px 38px;
      }

      .marketBackLink {
        display: inline-flex;
        align-items: center;
        min-height: 34px;
        padding: 0 14px;
        color: rgba(255, 255, 255, 0.72);
        text-decoration: none;
        border: 1px solid rgba(255, 255, 255, 0.26);
        background: rgba(0, 0, 0, 0.58);
        border-radius: 3px;
        font-size: 10px;
        letter-spacing: 0.2em;
        transition: 180ms ease;
      }

      .marketBackLink:hover {
        color: white;
        border-color: rgba(255, 255, 255, 0.62);
        background: rgba(255, 255, 255, 0.08);
      }

      .marketEyebrow {
        margin: 34px 0 10px;
        color: rgba(255, 255, 255, 0.78);
        font-size: clamp(12px, 1vw, 16px);
        letter-spacing: 0.32em;
      }

      .marketHero h1 {
        margin: 0;
        font-size: clamp(38px, 6vw, 86px);
        line-height: 0.98;
        font-weight: 400;
        letter-spacing: 0.16em;
        text-shadow: 0 0 24px rgba(255, 255, 255, 0.2);
      }

      .marketSubtitle {
        max-width: 650px;
        margin: 16px 0 0;
        color: rgba(255, 255, 255, 0.76);
        font-size: clamp(13px, 1.2vw, 17px);
        line-height: 1.65;
        letter-spacing: 0.12em;
      }

      .marketSubnav {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 26px;
      }

      .marketSubnavButton {
        min-height: 40px;
        padding: 0 18px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: rgba(255, 255, 255, 0.7);
        background: rgba(0, 0, 0, 0.58);
        border: 1px solid rgba(255, 255, 255, 0.25);
        border-radius: 3px;
        text-decoration: none;
        font-size: 11px;
        letter-spacing: 0.22em;
        transition: 180ms ease;
      }

      .marketSubnavButton:hover,
      .marketSubnavButtonActive {
        color: #fff;
        border-color: rgba(255, 255, 255, 0.66);
        background: rgba(255, 255, 255, 0.075);
        box-shadow:
          inset 0 0 14px rgba(255, 255, 255, 0.07),
          0 0 18px rgba(255, 255, 255, 0.08);
      }

      .marketContent {
        max-width: 1360px;
        margin: -18px auto 0;
        padding: 0 36px 52px;
        position: relative;
        z-index: 3;
      }

      .marketToolbar {
        display: grid;
        grid-template-columns: minmax(260px, 1fr) auto;
        gap: 16px;
        align-items: center;
        margin-bottom: 20px;
        padding: 18px;
        border: 1px solid rgba(255, 255, 255, 0.18);
        border-radius: 5px;
        background:
          radial-gradient(
            circle at top left,
            rgba(255, 255, 255, 0.07),
            transparent 38%
          ),
          rgba(0, 0, 0, 0.76);
        box-shadow:
          inset 0 0 28px rgba(255, 255, 255, 0.035),
          0 18px 40px rgba(0, 0, 0, 0.5);
      }

      .marketToolbarWithBack {
        grid-template-columns: 42px minmax(260px, 1fr) auto;
      }

      .marketSelectionBackButton {
        width: 42px;
        height: 42px;
        display: inline-grid;
        place-items: center;
        align-self: center;
        color: rgba(255, 255, 255, 0.94);
        background: rgba(0, 0, 0, 0.58);
        border: 1px solid rgba(255, 255, 255, 0.42);
        border-radius: 50%;
        cursor: pointer;
        transition: 180ms ease;
      }

      .marketSelectionBackButton:hover {
        color: white;
        border-color: rgba(255, 255, 255, 0.74);
        background: rgba(255, 255, 255, 0.09);
        transform: translateY(-1px);
        box-shadow: 0 0 18px rgba(255, 255, 255, 0.12);
      }

      .marketPager {
        display: grid;
        grid-template-columns: 42px minmax(190px, auto) 42px;
        gap: 10px;
        align-items: center;
        justify-content: end;
      }

      .marketPager p {
        margin: 0;
        color: rgba(255, 255, 255, 0.7);
        font-size: 11px;
        letter-spacing: 0.12em;
        text-align: center;
      }

      .marketPager span {
        color: white;
      }

      .marketIconButton {
        width: 42px;
        height: 42px;
        display: inline-grid;
        place-items: center;
        color: rgba(255, 255, 255, 0.92);
        background: rgba(0, 0, 0, 0.56);
        border: 1px solid rgba(255, 255, 255, 0.36);
        border-radius: 50%;
        cursor: pointer;
        transition: 180ms ease;
      }

      .marketIconButton:hover:not(:disabled) {
        border-color: rgba(255, 255, 255, 0.7);
        background: rgba(255, 255, 255, 0.08);
        transform: translateY(-1px);
      }

      .marketIconButton:disabled {
        cursor: default;
        opacity: 0.35;
      }

      .marketGrid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(168px, 1fr));
        gap: 16px;
      }

      .marketAssetSkeleton {
        aspect-ratio: 1 / 1.28;
        min-height: 220px;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 5px;
        background:
          linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.035),
            rgba(255, 255, 255, 0.09),
            rgba(255, 255, 255, 0.035)
          ),
          #050505;
        background-size: 220% 100%;
        animation: marketShimmer 1.1s ease-in-out infinite;
      }

      .marketAssetCard {
        position: relative;
        width: 100%;
        aspect-ratio: 1 / 1.28;
        min-height: 220px;
        padding: 0;
        display: block;
        color: #fff;
        background: #050505;
        border: 1px solid rgba(255, 255, 255, 0.32);
        border-radius: 5px;
        overflow: hidden;
        cursor: pointer;
        box-shadow:
          inset 0 0 24px rgba(255, 255, 255, 0.035),
          0 12px 26px rgba(0, 0, 0, 0.48);
        transition:
          transform 180ms ease,
          border-color 180ms ease,
          box-shadow 180ms ease;
      }

      .marketAssetCard::before,
      .marketFocusArt::before {
        content: "";
        position: absolute;
        inset: 0;
        margin: 7px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        pointer-events: none;
        z-index: 4;
      }

      .marketAssetCard:hover {
        transform: translateY(-4px);
        border-color: rgba(255, 255, 255, 0.7);
        box-shadow:
          inset 0 0 26px rgba(255, 255, 255, 0.06),
          0 18px 34px rgba(0, 0, 0, 0.58),
          0 0 22px rgba(255, 255, 255, 0.1);
      }

      .marketAssetImage {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .marketAssetName {
        position: absolute;
        z-index: 5;
        left: 12px;
        right: 12px;
        bottom: 13px;
        min-height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: rgba(255, 255, 255, 0.96);
        background: rgba(0, 0, 0, 0.62);
        border: 1px solid rgba(255, 255, 255, 0.28);
        border-radius: 3px;
        padding: 7px 8px;
        font-size: 11px;
        line-height: 1.25;
        letter-spacing: 0.08em;
        text-align: center;
        word-break: break-word;
      }

      .marketBadge {
        position: absolute;
        z-index: 5;
        max-width: calc(100% - 24px);
        padding: 7px 9px;
        color: rgba(255, 255, 255, 0.94);
        background: rgba(0, 0, 0, 0.68);
        border: 1px solid rgba(255, 255, 255, 0.28);
        border-radius: 3px;
        font-size: 10px;
        line-height: 1.2;
        letter-spacing: 0.08em;
        box-shadow: 0 0 14px rgba(0, 0, 0, 0.75);
      }

      .marketBadgeTopRight {
        top: 12px;
        right: 12px;
      }

      .marketBadgeTopLeft {
        top: 12px;
        left: 12px;
      }

      .marketFocusGrid {
        display: grid;
        grid-template-columns: minmax(280px, 500px) minmax(280px, 1fr);
        gap: 24px;
        align-items: start;
      }

      .marketFocusArt {
        position: relative;
        width: 100%;
        min-height: 520px;
        padding: 0;
        color: #fff;
        background: #050505;
        border: 1px solid rgba(255, 255, 255, 0.38);
        border-radius: 5px;
        overflow: hidden;
        cursor: pointer;
        box-shadow:
          inset 0 0 28px rgba(255, 255, 255, 0.04),
          0 18px 40px rgba(0, 0, 0, 0.6);
      }

      .marketFocusPanel {
        min-height: 520px;
        padding: 26px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 5px;
        background:
          radial-gradient(
            circle at top left,
            rgba(255, 255, 255, 0.075),
            transparent 36%
          ),
          rgba(0, 0, 0, 0.78);
        box-shadow:
          inset 0 0 34px rgba(255, 255, 255, 0.035),
          0 18px 40px rgba(0, 0, 0, 0.48);
      }

      .marketFocusPanelKicker {
        margin: 0 0 10px;
        color: rgba(255, 255, 255, 0.52);
        font-size: 11px;
        letter-spacing: 0.28em;
      }

      .marketFocusPanel h2 {
        margin: 0;
        color: #fff;
        font-size: clamp(28px, 4vw, 48px);
        font-weight: 400;
        letter-spacing: 0.18em;
        line-height: 1.1;
      }

      .marketFocusMeta {
        display: grid;
        gap: 10px;
        margin: 22px 0;
      }

      .marketMetaRow {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        padding-bottom: 10px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.12);
        color: rgba(255, 255, 255, 0.7);
        font-size: 12px;
        letter-spacing: 0.12em;
      }

      .marketMetaRow span:last-child {
        color: white;
        text-align: right;
      }

      .marketPriceValue {
        display: inline-flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        min-width: 0;
      }

      .marketPriceValue img {
        width: 23px;
        height: 23px;
        flex: 0 0 auto;
        object-fit: contain;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.22);
      }

      .marketPriceValue span {
        min-width: 0;
      }

      .marketPriceValueCompact {
        justify-content: flex-start;
        gap: 6px;
      }

      .marketPriceValueCompact img {
        width: 18px;
        height: 18px;
      }

      .marketFormGrid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
        margin: 18px 0;
      }

      .marketFormFull {
        grid-column: 1 / -1;
      }

      .marketActionRow {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 18px;
      }

      .marketActionButton,
      .marketSecondaryButton {
        min-height: 42px;
        padding: 0 18px;
        border-radius: 3px;
        font-family: Georgia, "Times New Roman", serif;
        font-size: 11px;
        letter-spacing: 0.2em;
        cursor: pointer;
        transition: 180ms ease;
      }

      .marketActionButton {
        color: #050505;
        background: rgba(255, 255, 255, 0.9);
        border: 1px solid rgba(255, 255, 255, 0.92);
        box-shadow:
          inset 0 0 14px rgba(0, 0, 0, 0.14),
          0 0 18px rgba(255, 255, 255, 0.12);
      }

      .marketActionButton:hover:not(:disabled) {
        background: white;
        transform: translateY(-1px);
        box-shadow:
          inset 0 0 14px rgba(0, 0, 0, 0.08),
          0 0 24px rgba(255, 255, 255, 0.2);
      }

      .marketActionButton:disabled {
        cursor: default;
        opacity: 0.45;
      }

      .marketSecondaryButton {
        color: rgba(255, 255, 255, 0.86);
        background: rgba(0, 0, 0, 0.54);
        border: 1px solid rgba(255, 255, 255, 0.36);
      }

      .marketSecondaryButton:hover {
        color: white;
        border-color: rgba(255, 255, 255, 0.66);
        background: rgba(255, 255, 255, 0.075);
      }

      .marketEmptyState {
        min-height: 320px;
        display: grid;
        place-items: center;
        align-content: center;
        gap: 12px;
        padding: 34px;
        border: 1px solid rgba(255, 255, 255, 0.17);
        border-radius: 5px;
        background:
          radial-gradient(
            circle at 50% 0%,
            rgba(255, 255, 255, 0.08),
            transparent 38%
          ),
          rgba(0, 0, 0, 0.72);
        text-align: center;
      }

      .marketEmptyState img {
        width: 58px;
        height: 58px;
        object-fit: contain;
        filter: grayscale(1) brightness(1.25) contrast(1.1);
      }

      .marketEmptyState h2 {
        margin: 8px 0 0;
        color: white;
        font-size: 24px;
        font-weight: 400;
        letter-spacing: 0.18em;
      }

      .marketEmptyState p {
        max-width: 520px;
        margin: 0;
        color: rgba(255, 255, 255, 0.66);
        font-size: 13px;
        line-height: 1.6;
        letter-spacing: 0.1em;
      }

      @keyframes marketShimmer {
        0% {
          background-position: 120% 0;
        }

        100% {
          background-position: -120% 0;
        }
      }

      @media (max-width: 960px) {
        .marketToolbar,
        .marketFocusGrid {
          grid-template-columns: 1fr;
        }

        .marketToolbarWithBack {
          grid-template-columns: 42px minmax(0, 1fr);
        }

        .marketToolbarWithBack .marketPager {
          grid-column: 1 / -1;
        }

        .marketPager {
          justify-content: stretch;
        }
      }

      @media (max-width: 680px) {
        .marketHero {
          min-height: 360px;
        }

        .marketHeroContent {
          padding: 52px 18px 30px;
        }

        .marketHero h1 {
          letter-spacing: 0.1em;
        }

        .marketSubnav {
          display: grid;
          grid-template-columns: 1fr;
        }

        .marketContent {
          margin-top: -10px;
          padding: 0 16px 40px;
        }

        .marketToolbar {
          padding: 14px;
        }

        .marketToolbarWithBack {
          grid-template-columns: 38px minmax(0, 1fr);
        }

        .marketPager {
          grid-template-columns: 38px 1fr 38px;
        }

        .marketIconButton,
        .marketSelectionBackButton {
          width: 38px;
          height: 38px;
        }

        .marketGrid {
          grid-template-columns: repeat(auto-fill, minmax(138px, 1fr));
          gap: 12px;
        }

        .marketAssetName {
          font-size: 10px;
        }

        .marketFocusArt {
          min-height: 420px;
        }

        .marketFocusPanel {
          min-height: 0;
          padding: 20px;
        }

        .marketFormGrid {
          grid-template-columns: 1fr;
        }
      }
    `}</style>
  );
}
