import React, { useMemo, useState, useEffect, useRef } from "react";
import { useWallet } from "@txnlab/use-wallet-react";
import WalletRewards,{useWalletRewards} from './WalletRewards';
import algosdk from "algosdk";

import { Typography, Grid, Popover, Divider } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

import { CID } from "multiformats/cid";
import * as mfsha2 from "multiformats/hashes/sha2";
import * as digest from "multiformats/hashes/digest";

import { getDownloadURL, ref as storageRef } from "firebase/storage";
import { storage } from "../../Firebase/FirebaseInit";

const DARK_COIN_ID = 1088771340;
const DARK_COIN_ICON = "/invDC.svg";

const DC_CREATOR_ADDR =
  "L6VIKAHGH4D7XNH3CYCWKWWOHYPS3WYQM6HMIPNBVSYZWPNQ6OTS5VERQY";

const TRAIT_CREATOR_ADDR =
  "3SKDMKVJQD7RR62DMOIXVK3CQQWSFXAM2JXMIRDOPLIW4MWWPBWYV3NZ3Y";

const DAO_GOV_CREATOR_ADDR =
  "AL6F3TFPSZPF3BSVUFDNOLMEKUCJJAA7GZ5GF3DN3Q4IVJVNUFK76PQFNE";

const DAO_GOV_PREFIX = "Dark Coin DAO";

export default function DarkCoinWalletConnect({
  wallet = [],
  fetchDcAssets = () => {},
}) {
  const { wallets, activeWallet, activeAddress, isReady } = useWallet();

  const [connectAnchorEl, setConnectAnchorEl] = useState(null);
  const [assetsAnchorEl, setAssetsAnchorEl] = useState(null);
  const [assetImgById, setAssetImgById] = useState({});

  const [assetsLoading, setAssetsLoading] = useState(false);
  const [connectingWalletId, setConnectingWalletId] = useState(null);
  const [connectError, setConnectError] = useState("");

  const fetchedAddressRef = useRef(null);
  const walletButtonRef = useRef(null);
  useEffect(()=>{const open=()=>{setConnectAnchorEl(activeAddress?null:walletButtonRef.current);setAssetsAnchorEl(activeAddress?walletButtonRef.current:null);};window.addEventListener('darkcoin-connect-wallet',open);return()=>window.removeEventListener('darkcoin-connect-wallet',open);},[activeAddress]);
  useEffect(()=>{const changed=()=>{if(activeAddress)fetchDcAssets(activeAddress,true);};window.addEventListener('champion-name-changed',changed);return()=>window.removeEventListener('champion-name-changed',changed);},[activeAddress,fetchDcAssets]);


  const walletAssets = Array.isArray(wallet) ? wallet : [];
  const connectPopoverOpen = Boolean(connectAnchorEl);
  const assetsPopoverOpen = Boolean(assetsAnchorEl);
  const rewards=useWalletRewards(assetsPopoverOpen,fetchDcAssets);

  useEffect(() => {
    if (!activeAddress) {
      fetchedAddressRef.current = null;
      setAssetsLoading(false);
      setAssetImgById({});
      return;
    }

    if (fetchedAddressRef.current === activeAddress) return;

    let cancelled = false;

    async function run() {
      fetchedAddressRef.current = activeAddress;
      setAssetsLoading(true);
      setAssetImgById({});

      try {
        await Promise.resolve(fetchDcAssets(activeAddress));
      } catch (error) {
        fetchedAddressRef.current = null;
        console.log(error?.toString?.() || error);
      } finally {
        if (!cancelled) {
          setAssetsLoading(false);
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [activeAddress, fetchDcAssets]);

  useEffect(() => {
    if (!activeAddress) return;
    if (!connectPopoverOpen) return;
    if (!walletButtonRef.current) return;

    setConnectAnchorEl(null);

    requestAnimationFrame(() => {
      setAssetsAnchorEl(walletButtonRef.current);
    });
  }, [activeAddress, connectPopoverOpen]);

  function shortenAddress(address) {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  function formatHoldingAmount(asset) {
    if (!asset) return "0";

    let decimals = 0;

    if (Number(asset?.asset?.index) === DARK_COIN_ID) {
      decimals = 6;
    } else if (typeof asset?.asset?.params?.decimals === "number") {
      decimals = asset.asset.params.decimals;
    }

    const raw = asset?.amount ?? 0;

    if (typeof raw === "bigint") {
      if (decimals === 0) return raw.toString();

      const s = raw.toString().padStart(decimals + 1, "0");
      const whole = s.slice(0, -decimals);
      const frac = s.slice(-decimals).replace(/0+$/, "");
      const wholeFmt = Number(whole).toLocaleString();

      return frac ? `${wholeFmt}.${frac}` : wholeFmt;
    }

    const n = Number(raw);

    if (!Number.isFinite(n)) return "0";
    if (decimals === 0) return n.toLocaleString();

    const scaled = n / Math.pow(10, decimals);

    return scaled.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: Math.min(decimals, 6),
    });
  }

  function getArc19IpfsUrlFromReserve(reserve) {
    if (!reserve) return null;

    try {
      const addr = algosdk.decodeAddress(reserve);
      const mhdigest = digest.create(mfsha2.sha256.code, addr.publicKey);
      const cid = CID.create(0, 0x70, mhdigest);

      return "https://ipfs-pera.algonode.dev/ipfs/" + cid.toString();
    } catch (error) {
      console.log(error?.toString?.() || error);
      return null;
    }
  }

  function getDarkCoinTemplateIpfsUrl(params) {
    if (!params?.reserve) return null;
    if (params.creator !== DC_CREATOR_ADDR) return null;

    try {
      const addr = algosdk.decodeAddress(params.reserve);
      const mhdigest = digest.create(mfsha2.sha256.code, addr.publicKey);
      const cid = CID.create(0, 0x70, mhdigest);

      return "https://ipfs.dark-coin.io/ipfs/" + cid.toString();
    } catch (error) {
      console.log(error?.toString?.() || error);
      return null;
    }
  }

  function getTraitTypeFromAssetId(assetId) {
    const id = Number(assetId);
    if (!Number.isFinite(id)) return null;

    if (
      (id >= 1631153255 && id <= 1631178480) ||
      id === 1792634314 ||
      id === 2311097594
    ) {
      return "Background";
    }

    if (
      (id >= 1631181322 && id <= 1631207955) ||
      id === 1792635942 ||
      id === 1792636565
    ) {
      return "Weapon";
    }

    if (
      (id >= 1631208827 && id <= 1631217677) ||
      id === 1631233542
    ) {
      return "Magic";
    }

    if (
      id === 1631224831 ||
      (id >= 1631236045 && id <= 1631275042) ||
      id === 1792637776 ||
      id === 1792640216 ||
      id === 1935442966 ||
      id === 2156520475 ||
      id === 2311097574 ||
      id === 2311097577 ||
      id === 2311097585
    ) {
      return "Head";
    }

    if (
      (id >= 1631281879 && id <= 1631305105) ||
      id === 1642179694 ||
      id === 1792660153 ||
      id === 1792645489 ||
      id === 1806077922 ||
      id === 2311097589
    ) {
      return "Armour";
    }

    if (
      (id >= 1631307699 && id <= 1631309418) ||
      id === 2156520477 ||
      id === 2311097583
    ) {
      return "Extra";
    }

    return null;
  }

  function traitStoragePath(type, name) {
    if (!type || !name) return null;

    if (type === "Background") {
      const base = name.slice(0, Math.max(0, name.length - 11));
      return `warriors/Background/${base}.png`;
    }

    return `warriors/${type}/${name}.png`;
  }

  function getDirectAssetImageFromParams(assetData, tinymanAssetMap) {
    const params = assetData?.asset?.params;
    const assetId = Number(assetData?.asset?.index);

    if (!params || !Number.isFinite(assetId)) return null;

    if (assetId === DARK_COIN_ID) {
      return DARK_COIN_ICON;
    }

    if (tinymanAssetMap && tinymanAssetMap[assetId]) {
      return `https://asa-list.tinyman.org/assets/${String(assetId)}/icon.png`;
    }

    if (typeof params.url === "string") {
      if (params.url.startsWith("ipfs://")) {
        return "https://ipfs-pera.algonode.dev/ipfs/" + params.url.slice(7);
      }

      if (params.url.startsWith("https://ipfs.io/ipfs/")) {
        return "https://ipfs-pera.algonode.dev/ipfs/" + params.url.slice(21);
      }

      if (params.url.startsWith("https://gateway.ipfs.io/ipfs/")) {
        return "https://ipfs-pera.algonode.dev/ipfs/" + params.url.slice(29);
      }

      if (
        params.url ===
        "template-ipfs://{ipfscid:0:dag-pb:reserve:sha2-256}"
      ) {
        return getArc19IpfsUrlFromReserve(params.reserve);
      }
    }

    const darkCoinTemplate = getDarkCoinTemplateIpfsUrl(params);
    if (darkCoinTemplate) return darkCoinTemplate;

    return null;
  }

  useEffect(() => {
    if (!Array.isArray(walletAssets) || walletAssets.length === 0) return;

    let cancelled = false;

    async function run() {
      try {

        // Immediately seed Dark Coin icon so balance chip never shows broken image
    setAssetImgById((prev) => ({
      ...prev,
      [DARK_COIN_ID]: DARK_COIN_ICON,
    }))
        const tinymanResponse = await fetch(
          "https://asa-list.tinyman.org/assets.json"
        );

        let tinymanAssetMap = null;

        if (tinymanResponse.ok) {
          tinymanAssetMap = await tinymanResponse.json();
        }

        const targets = walletAssets
          .map((asset) => {
            const id = Number(asset?.asset?.index);
            const creator = asset?.asset?.params?.creator;
            const name =
              asset?.asset?.params?.name ||
              asset?.asset?.params?.unitName ||
              "";

            const traitType =
              creator === TRAIT_CREATOR_ADDR
                ? getTraitTypeFromAssetId(id)
                : null;

            const traitPath =
              creator === TRAIT_CREATOR_ADDR
                ? traitStoragePath(traitType, name)
                : null;

            const fallbackUrl = getDirectAssetImageFromParams(
              asset,
              tinymanAssetMap
            );

            return {
              id,
              creator,
              traitPath,
              fallbackUrl,
            };
          })
          .filter((x) => Number.isFinite(x.id));

        const results = await Promise.all(
          targets.map(async ({ id, creator, traitPath, fallbackUrl }) => {
            if (creator === TRAIT_CREATOR_ADDR && traitPath && storage) {
              try {
                const url = await getDownloadURL(storageRef(storage, traitPath));
                return [id, url];
              } catch (error) {
                console.log(
                  `Trait image not found for ${id} at ${traitPath}:`,
                  error?.message || error
                );
              }
            }

            return [id, fallbackUrl || null];
          })
        );

        if (cancelled) return;

        setAssetImgById((prev) => {
          const next = { ...prev };

          for (const [id, url] of results) {
            if (!(id in next)) {
              next[id] = url;
            }
          }

          return next;
        });
      } catch (error) {
        console.log(error);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [walletAssets]);

  const daoGovernanceAssets = useMemo(() => {
    return walletAssets.filter((asset) => {
      const creator = asset?.asset?.params?.creator;
      const name = asset?.asset?.params?.name || "";
      const amount = Number(asset?.amount ?? 0);

      return (
        creator === DAO_GOV_CREATOR_ADDR &&
        name.startsWith(DAO_GOV_PREFIX) &&
        amount > 0
      );
    });
  }, [walletAssets]);

  const regularWalletAssets = useMemo(() => {
    return walletAssets.filter((asset) => {
      const creator = asset?.asset?.params?.creator;
      const name = asset?.asset?.params?.name || "";
      const amount = Number(asset?.amount ?? 0);

      const isDaoGovernance =
        creator === DAO_GOV_CREATOR_ADDR &&
        name.startsWith(DAO_GOV_PREFIX) &&
        amount > 0;

      return !isDaoGovernance;
    });
  }, [walletAssets]);

  const darkCoinHolding = useMemo(() => {
    return walletAssets.find(
      (asset) => Number(asset?.asset?.index) === DARK_COIN_ID
    );
  }, [walletAssets]);

  async function disconnectCurrentWallet() {
    try {
      const providerToDisconnect =
        activeWallet ||
        wallets?.find((provider) => provider?.isActive) ||
        wallets?.find((provider) => provider?.isConnected);

      if (providerToDisconnect?.disconnect) {
        await providerToDisconnect.disconnect();
      }

      setAssetsAnchorEl(null);
      setConnectAnchorEl(null);
      setAssetsLoading(false);
      setAssetImgById({});
      fetchedAddressRef.current = null;
    } catch (error) {
      console.log("Failed to disconnect wallet:", error?.toString?.() || error);
    }
  }

  function getProviderId(provider) {
    return String(provider?.id || provider?.metadata?.id || "").toLowerCase();
  }

  function isPeraProvider(provider) {
    return (
      getProviderId(provider) === "pera" ||
      String(provider?.metadata?.name || "").toLowerCase().includes("pera")
    );
  }

  function isStalePeraSessionError(error) {
    const message = String(error?.message || error?.toString?.() || error || "");
    return message.toLowerCase().includes("session currently connected");
  }

  function clearPeraSessionStorage() {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.removeItem("PeraWallet.Wallet");
      window.localStorage.removeItem("walletconnect");
      window.sessionStorage?.removeItem("PeraWallet.Wallet");
      window.sessionStorage?.removeItem("walletconnect");
    } catch (error) {
      console.log("Failed to clear stale Pera session:", error?.toString?.() || error);
    }
  }

  async function connectProvider(provider) {
    if (!provider?.connect || connectingWalletId) return;

    const providerId = getProviderId(provider) || provider?.metadata?.name;

    setConnectError("");
    setConnectingWalletId(providerId);

    try {
      await provider.connect();
    } catch (error) {
      if (!isPeraProvider(provider) || !isStalePeraSessionError(error)) {
        console.log("Failed to connect wallet:", error?.toString?.() || error);
        setConnectError("Could not connect wallet. Try again in a moment.");
        return;
      }

      try {
        await provider.disconnect?.();
      } catch (_disconnectError) {
        // The SDK can be half-connected here, so clearing storage below is the real recovery.
      }

      clearPeraSessionStorage();
      await new Promise((resolve) => setTimeout(resolve, 250));

      try {
        await provider.connect();
      } catch (retryError) {
        console.log("Failed to reconnect Pera wallet:", retryError?.toString?.() || retryError);
        setConnectError("Pera had a stale session. I cleared it, so try Connect once more.");
      }
    } finally {
      setConnectingWalletId(null);
    }
  }

  function handleWalletButtonClick(event) {
    event.preventDefault();
    event.stopPropagation();

    const anchor = walletButtonRef.current || event.currentTarget;

    if (connectPopoverOpen || assetsPopoverOpen) {
      setConnectAnchorEl(null);
      setAssetsAnchorEl(null);
      return;
    }

    if (activeAddress) {
      setConnectAnchorEl(null);
      setAssetsAnchorEl(anchor);
      return;
    }

    setAssetsAnchorEl(null);
    setConnectAnchorEl(anchor);
  }

  function renderAssetRow(asset, options = {}) {
    const idNum = Number(asset?.asset?.index);
    const isDc = idNum === DARK_COIN_ID;
    const isTraitCreator = asset?.asset?.params?.creator === TRAIT_CREATOR_ADDR;
    const isDaoGovernance =
      asset?.asset?.params?.creator === DAO_GOV_CREATOR_ADDR;

    const name = isDc
      ? "Dark Coin"
      : asset?.asset?.params?.name ||
        asset?.asset?.params?.unitName ||
        `ASA ${asset?.asset?.index}`;

    const imgSrc = assetImgById[idNum] || null;
    const amountText = formatHoldingAmount(asset);

    const traitType = isTraitCreator
      ? getTraitTypeFromAssetId(asset?.asset?.index)
      : null;

    return (
      <div key={`${options.section || "asset"}-${asset?.asset?.index}`}>
        <Grid container spacing={1} alignItems="center" className="assetRow">
          <Grid item>
            <div className="assetImgShell">
              {imgSrc ? (
                <img src={imgSrc} alt={name} className="assetImg" />
              ) : (
                <div className="assetImgLoading" />
              )}
            </div>
          </Grid>

          <Grid item xs>
            <Typography className="assetName">{name}</Typography>

            <Typography variant="caption" className="assetMeta">
              ID: {asset?.asset?.index}
              {isTraitCreator && traitType ? ` • ${traitType}` : ""}
              {isDaoGovernance ? " • DAO Governance NFT" : ""}
            </Typography>
          </Grid>

          <Grid item>
            <Typography className="assetAmount">{amountText}</Typography>
          </Grid>
        </Grid>

        <Divider className="assetDivider" />
      </div>
    );
  }

  return (
    <>
      <button
        ref={walletButtonRef}
        type="button"
        className="navWalletButton"
        onClick={handleWalletButtonClick}
        aria-label={activeAddress ? 'Open wallet assets' : 'Connect Wallet'}
        aria-haspopup="dialog"
        aria-expanded={connectPopoverOpen || assetsPopoverOpen}
        aria-controls={assetsPopoverOpen ? 'wallet-assets-popover' : connectPopoverOpen ? 'wallet-connect-popover' : undefined}
        title={activeAddress || undefined}
      >
        <span>{activeAddress ? shortenAddress(activeAddress) : 'Connect Wallet'}</span>
        {rewards.count>0&&<span className="walletRewardBadge" role="status" aria-label={`${rewards.count} unique reward assets to claim`}>{rewards.count}</span>}
      </button>

      <Popover
        id="wallet-connect-popover"
        open={connectPopoverOpen}
        anchorEl={connectAnchorEl}
        onClose={() => setConnectAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          className: "walletConnectPopoverPaper",
        }}
      >
        <div className="walletConnectPopover" role="dialog" aria-label="Wallet connection">
          <div className="walletPanelScroll">
            <div className="walletPanelHeader">
              <div>
                <p className="walletPanelKicker">DARK COIN WALLET</p>
                <h3>{activeWallet ? "CONNECTED" : "SELECT WALLET"}</h3>
              </div>

              <button
                type="button"
                className="panelClose"
                onClick={() => setConnectAnchorEl(null)}
              >
                ×
              </button>
            </div>

            {activeWallet && activeAddress ? (
              <div className="activeWalletBox">
                <div className="addressLine">
                  <span>{shortenAddress(activeAddress)}</span>

                  <button
                    type="button"
                    className="copyButton"
                    onClick={() => navigator.clipboard.writeText(activeAddress)}
                  >
                    <ContentCopyIcon fontSize="small" />
                  </button>
                </div>

                <div className="walletStats">
                  <button
                    type="button"
                    className="assetsButton"
                    onClick={() => {
                      setConnectAnchorEl(null);
                      setAssetsAnchorEl(walletButtonRef.current);
                    }}
                  >
                    {assetsLoading
                      ? "LOADING ASSETS..."
                      : `ASSETS (${walletAssets.length})`}
                  </button>

                  {darkCoinHolding ? (
  <div className="darkCoinBalance" >
    <img
      src={assetImgById[DARK_COIN_ID] || DARK_COIN_ICON}
      alt="Dark Coin"
      onError={(e) => { e.currentTarget.src = DARK_COIN_ICON }}
    />
    <span>{formatHoldingAmount(darkCoinHolding)}</span>
  </div>
) : null}
                </div>

                <button
                  type="button"
                  className="disconnectButton"
                  onClick={disconnectCurrentWallet}
                >
                  DISCONNECT WALLET
                </button>
              </div>
            ) : null}

            <div className="providerList">
              {!isReady ? (
                <p className="emptyText">Wallet manager loading...</p>
              ) : null}

              {connectError ? <p className="emptyText">{connectError}</p> : null}

              {wallets?.map((provider) => (
                <div
                  key={`provider-${provider.metadata.id}`}
                  className="providerCard"
                >
                  <div className="providerTitle">
                    <img
                      src={provider.metadata.icon}
                      alt=""
                      className="providerIcon"
                    />

                    <div>
                      <p>{provider.metadata.name}</p>

                      <span>
                        {provider.isActive
                          ? "ACTIVE PROVIDER"
                          : provider.isConnected
                            ? "CONNECTED"
                            : "NOT CONNECTED"}
                      </span>
                    </div>
                  </div>

                  <div className="providerActions">
                    {!provider.isConnected ? (
                      <button
                        type="button"
                        className="providerButton"
                        disabled={Boolean(connectingWalletId)}
                        onClick={() => connectProvider(provider)}
                      >
                        {connectingWalletId === (getProviderId(provider) || provider?.metadata?.name)
                          ? "CONNECTING..."
                          : "CONNECT"}
                      </button>
                    ) : null}

                    {provider.isConnected && !provider.isActive ? (
                      <button
                        type="button"
                        className="providerButton"
                        onClick={provider.setActive}
                      >
                        SET ACTIVE
                      </button>
                    ) : null}

                    {provider.isConnected ? (
                      <button
                        type="button"
                        className="providerButton ghost"
                        onClick={provider.disconnect}
                      >
                        DISCONNECT
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Popover>

      <Popover
        id="wallet-assets-popover"
        open={assetsPopoverOpen}
        anchorEl={assetsAnchorEl}
        onClose={() => setAssetsAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          className: "assetsPopoverPaper",
        }}
      >
        <div className="assetsPopover" role="dialog" aria-label="Wallet assets">
          <div className="assetsHeader">
            <div>
              <p>WALLET ASSETS</p>
              <span>
                {assetsLoading ? "LOADING" : `${walletAssets.length} TOTAL`}
              </span>
            </div>

            <button
              type="button"
              className="disconnectButton compact"
              onClick={disconnectCurrentWallet}
            >
              DISCONNECT
            </button>
          </div>

          <div className="assetsScroll">
            <WalletRewards rewards={rewards}/>
            {assetsLoading ? (
              <div className="assetsLoadingBox">
                <div className="assetSkeletonRow" />
                <div className="assetSkeletonRow" />
                <div className="assetSkeletonRow" />
                <div className="assetSkeletonRow" />
              </div>
            ) : (
              <>
                {daoGovernanceAssets.length > 0 ? (
                  <div className="assetsSection">
                    <h4>DARK COIN DAO GOVERNANCE NFTS</h4>

                    <div className="assetsFrame">
                      {daoGovernanceAssets.map((asset) =>
                        renderAssetRow(asset, { section: "dao-gov" })
                      )}
                    </div>
                  </div>
                ) : null}

                {regularWalletAssets.length === 0 &&
                daoGovernanceAssets.length === 0 ? (
                  <Typography className="emptyText">
                    No assets found in this wallet.
                  </Typography>
                ) : null}

                {regularWalletAssets.length > 0 ? (
                  <div className="assetsSection">
                    {daoGovernanceAssets.length > 0 ? (
                      <h4>OTHER WALLET ASSETS</h4>
                    ) : null}

                    <div className="assetsFrame">
                      {regularWalletAssets.map((asset) =>
                        renderAssetRow(asset, { section: "regular" })
                      )}
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </Popover>

      <style jsx>{`
        .navWalletButton {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
          padding: 11px 19px;
          border: 1px solid #f2efe7;
          border-radius: 4px;
          background: #f2efe7;
          color: #171613;
          font: 700 13px/1.4 Georgia, "Times New Roman", serif;
          letter-spacing: .035em;
          white-space: nowrap;
          cursor: pointer;
          transition: background 150ms ease, box-shadow 150ms ease;
        }
        .navWalletButton:hover { background: #fffdf7; box-shadow: 0 0 18px #f2efe722; }
        .navWalletButton:focus-visible { outline: 2px solid #f2efe7; outline-offset: 4px; }
        .walletRewardBadge { position:absolute; top:-8px; right:-8px; min-width:22px; height:22px; padding:2px 5px; border:2px solid #f2efe7; border-radius:20px; background:#24211c; color:#f2efe7; font:bold 11px/14px Arial,sans-serif; }
        @media(max-width:760px) { .navWalletButton { font-size:12px; padding:10px 12px; } }

        .walletPanelScroll {
          max-height: min(680px, calc(100vh - 120px));
          overflow-y: auto;
          overflow-x: hidden;
          padding: 16px;
        }

        .walletPanelHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          padding-bottom: 14px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.16);
        }

        .walletPanelKicker {
          margin: 0 0 8px;
          color: rgba(255, 255, 255, 0.54);
          font-size: 10px;
          letter-spacing: 0.24em;
        }

        .walletPanelHeader h3 {
          margin: 0;
          color: rgba(255, 255, 255, 0.92);
          font-size: 20px;
          font-weight: 400;
          letter-spacing: 0.24em;
        }

        .panelClose {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.24);
          color: rgba(255, 255, 255, 0.82);
          background: rgba(255, 255, 255, 0.04);
          cursor: pointer;
          font-size: 24px;
          line-height: 1;
          transition: 180ms ease;
        }

        .panelClose:hover {
          border-color: rgba(255, 255, 255, 0.54);
          color: white;
          background: rgba(255, 255, 255, 0.08);
        }

        .activeWalletBox {
          margin-top: 14px;
          padding: 14px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 5px;
          background:
            radial-gradient(
              circle at top left,
              rgba(255, 255, 255, 0.075),
              transparent 42%
            ),
            rgba(255, 255, 255, 0.025);
        }

        .addressLine {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          color: rgba(255, 255, 255, 0.88);
          font-size: 13px;
          letter-spacing: 0.16em;
        }

        .copyButton {
          width: 34px;
          height: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.28);
          background: rgba(0, 0, 0, 0.45);
          border-radius: 4px;
          cursor: pointer;
        }

        .walletStats {
          margin-top: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .assetsButton {
          min-height: 36px;
          padding: 0 14px;
          border-radius: 3px;
          border: 1px solid rgba(255, 255, 255, 0.44);
          background: rgba(0, 0, 0, 0.55);
          color: rgba(255, 255, 255, 0.86);
          font-family: inherit;
          font-size: 10px;
          letter-spacing: 0.18em;
          cursor: pointer;
        }

        .darkCoinBalance {
          display: inline-flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          color: rgba(255, 255, 255, 0.9);
          font-size: 12px;
          letter-spacing: 0.12em;
        }

        .darkCoinBalance img {
          width: 22px;
          height: 22px;
          object-fit: contain;
          
        }

        .disconnectButton {
          width: 100%;
          min-height: 36px;
          margin-top: 12px;
          padding: 0 14px;
          border-radius: 3px;
          border: 1px solid rgba(255, 255, 255, 0.44);
          background: rgba(0, 0, 0, 0.62);
          color: rgba(255, 255, 255, 0.88);
          box-shadow:
            inset 0 0 14px rgba(255, 255, 255, 0.06),
            0 0 14px rgba(255, 255, 255, 0.04);
          font-family: Georgia, "Times New Roman", serif;
          font-size: 10px;
          letter-spacing: 0.18em;
          cursor: pointer;
          transition: 180ms ease;
        }

        .disconnectButton:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.7);
          color: white;
        }

        .disconnectButton.compact {
          width: auto;
          min-height: 34px;
          margin-top: 0;
          white-space: nowrap;
        }

        .providerList {
          display: grid;
          gap: 12px;
          margin-top: 14px;
        }

        .providerCard {
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 5px;
          padding: 12px;
          background:
            linear-gradient(
              to bottom,
              rgba(255, 255, 255, 0.035),
              rgba(255, 255, 255, 0.012)
            );
        }

        .providerTitle {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .providerIcon {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          object-fit: cover;
          border: 1px solid rgba(255, 255, 255, 0.22);
        }

        .providerTitle p {
          margin: 0 0 4px;
          font-size: 14px;
          letter-spacing: 0.14em;
          color: rgba(255, 255, 255, 0.94);
        }

        .providerTitle span {
          display: block;
          font-size: 9px;
          letter-spacing: 0.18em;
          color: rgba(255, 255, 255, 0.48);
        }

        .providerActions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .providerButton {
          min-height: 34px;
          padding: 0 13px;
          border-radius: 3px;
          border: 1px solid rgba(255, 255, 255, 0.44);
          color: rgba(255, 255, 255, 0.9);
          background: rgba(0, 0, 0, 0.5);
          font-family: inherit;
          font-size: 10px;
          letter-spacing: 0.16em;
          cursor: pointer;
          transition: 180ms ease;
        }

        .providerButton:hover {
          border-color: rgba(255, 255, 255, 0.72);
          background: rgba(255, 255, 255, 0.075);
        }

        .providerButton.ghost {
          color: rgba(255, 255, 255, 0.62);
        }

        .emptyText {
          color: rgba(255, 255, 255, 0.58);
          font-size: 13px;
          letter-spacing: 0.08em;
          margin: 8px 0;
        }

        .assetsLoadingBox {
          display: grid;
          gap: 10px;
        }

        .assetSkeletonRow {
          height: 72px;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background:
            linear-gradient(
              90deg,
              rgba(255, 255, 255, 0.035),
              rgba(255, 255, 255, 0.09),
              rgba(255, 255, 255, 0.035)
            );
          background-size: 220% 100%;
          animation: assetSkeletonShimmer 1.1s ease-in-out infinite;
        }

        @keyframes assetSkeletonShimmer {
          0% {
            background-position: 120% 0;
          }

          100% {
            background-position: -120% 0;
          }
        }

      `}</style>

      <style jsx global>{`
        .walletConnectPopoverPaper,
        .assetsPopoverPaper {
          background: transparent !important;
          box-shadow: none !important;
          overflow: visible !important;
          z-index: 100004 !important;
        }

        .walletConnectPopover,
        .assetsPopover {
          width: 460px;
          max-width: calc(100vw - 32px);
          max-height: min(680px, calc(100vh - 120px));
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.34);
          border-radius: 6px;
          background:
            linear-gradient(
              to bottom,
              rgba(12, 12, 12, 0.98),
              rgba(0, 0, 0, 0.98)
            );
          box-shadow:
            0 26px 70px rgba(0, 0, 0, 0.82),
            0 0 34px rgba(255, 255, 255, 0.08),
            inset 0 0 38px rgba(255, 255, 255, 0.035);
          color: #fff;
          font-family: Georgia, "Times New Roman", serif;
        }

        .assetsPopover { display:flex; flex-direction:column; }

        .assetsHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.16);
        }

        .assetsHeader p {
          margin: 0 0 6px;
          font-size: 16px;
          letter-spacing: 0.22em;
          color: rgba(255, 255, 255, 0.92);
        }

        .assetsHeader span {
          color: rgba(255, 255, 255, 0.52);
          font-size: 10px;
          letter-spacing: 0.2em;
        }

        .assetsScroll {
          min-height:0;
          flex:1;
          max-height: min(590px, calc(100vh - 210px));
          overflow-y: auto;
          padding: 16px;
        }

        .assetsSection {
          margin-bottom: 18px;
        }

        .assetsSection h4 {
          margin: 0 0 10px;
          font-size: 13px;
          font-weight: 400;
          letter-spacing: 0.2em;
          color: rgba(255, 255, 255, 0.74);
        }

        .assetsFrame {
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 5px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.025);
        }

        .assetRow {
          padding: 10px 8px;
        }

        .assetImgShell {
          width: 52px;
          height: 52px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.24);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.04);
          flex-shrink: 0;
        }



        .assetImg {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .assetImgLoading {
          width: 100%;
          height: 100%;
          background:
            radial-gradient(
              circle at 35% 25%,
              rgba(255, 255, 255, 0.12),
              transparent 35%
            ),
            rgba(255, 255, 255, 0.045);
          animation: assetPulse 1.1s ease-in-out infinite alternate;
        }

        @keyframes assetPulse {
          from {
            opacity: 0.45;
          }

          to {
            opacity: 0.9;
          }
        }

        .assetImgFallback {
          color: rgba(255, 255, 255, 0.55) !important;
        }

        .assetName {
          color: #fff !important;
          line-height: 1.2 !important;
          font-family: Georgia, "Times New Roman", serif !important;
          letter-spacing: 0.08em !important;
        }

        .assetMeta {
          color: rgba(255, 255, 255, 0.62) !important;
          font-family: Georgia, "Times New Roman", serif !important;
        }

        .assetAmount {
          color: #fff !important;
          font-family: Georgia, "Times New Roman", serif !important;
          letter-spacing: 0.08em !important;
        }

        .assetDivider {
          background: rgba(255, 255, 255, 0.12) !important;
        }

        @media (max-width: 680px) {
          .walletConnectPopover,
          .assetsPopover {
            width: 420px;
            max-width: calc(100vw - 32px);
          }
        }

        @media (max-width: 520px) {
          .walletConnectPopover,
          .assetsPopover {
            width: 340px;
            max-width: calc(100vw - 40px);
            max-height: calc(100vh - 170px);
          }

          .assetsPopover { display:flex; flex-direction:column; }

        .assetsHeader {
            align-items: flex-start;
            flex-direction: column;
          }

          .disconnectButton.compact {
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}
