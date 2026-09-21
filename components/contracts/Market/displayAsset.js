import React, { useEffect, useRef, useState } from "react"
import algosdk from "algosdk"
import { TextField } from "@mui/material"
import { marketTextFieldSx } from "./MarketPageShell"
import { PaymentAssetShortcuts } from "./PaymentAsset"
import { priceInputEdit, unformatPriceInput } from "../../../lib/marketPricing"
import {
    getAssetDecimals,
    getAssetDisplayName,
    getAssetParams,
    resolveAssetImageUrls,
} from "./nftMedia"

function formatNumber(num) {
  if (num >= 1e15) return (num / 1e15).toFixed(2).replace(/\.00$/, '') + 'Q';
  if (num >= 1e12) return (num / 1e12).toFixed(2).replace(/\.00$/, '') + 'T';
  if (num >= 1e9)  return (num / 1e9).toFixed(2).replace(/\.00$/, '') + 'B';
  if (num >= 1e6)  return (num / 1e6).toFixed(2).replace(/\.00$/, '') + 'M';
  return num.toLocaleString();
}

function formatExactNumber(num) {
    const value = Number(num)

    if (!Number.isFinite(value)) return "0"

    return value.toLocaleString(undefined, {
        maximumFractionDigits: 6,
    })
}

export default function DisplayAsset(props) {

    const [ nft, setNft ] = useState(null)
    const [ nftUrls, setNftUrls ] = useState([])
    const [ nftUrlIndex, setNftUrlIndex ] = useState(0)

    const [ listAmount, setListAmount ] = useState(null)

    const [ costId, setCostId ] = useState(null)
    const [ costAmount, setCostAmount ] = useState(null)
    const priceInputRef = useRef(null)
    const priceCaretRef = useRef(null)

    useEffect(() => {
        if (priceCaretRef.current !== null && document.activeElement === priceInputRef.current) {
            priceInputRef.current.setSelectionRange(priceCaretRef.current, priceCaretRef.current)
        }
        priceCaretRef.current = null
    }, [costAmount])

    const [ costNft, setCostNft ] = useState(null)
    const [ costNftUrls, setCostNftUrls ] = useState([])
    const [ costNftUrlIndex, setCostNftUrlIndex ] = useState(0)

    const [ listingAddress, setListingAddress ] = useState(null)

    const [ buyAmount, setBuyAmount ] = useState(null)

    const [ display, setDisplay ] = useState(false)
  

    const fetchData = async (isCurrent = () => true) => {

        try {

            setDisplay(false)
            setNft(null)
            setNftUrls([])
            setNftUrlIndex(0)
            setCostNft(null)
            setCostNftUrls([])
            setCostNftUrlIndex(0)
            setListingAddress(null)

            const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)
            if (props.listingAddress) {
                const stringAddress = algosdk.encodeAddress(Uint8Array.from(props.listingAddress));
                if (!isCurrent()) return
                setListingAddress(stringAddress)
            }

            if (props.costId == 0) {
                if (!isCurrent()) return
                setCostNft({name: "ALGO", decimals: 6})
                setCostNftUrls(["/AlgoWhite.svg"])

            }
            else if (props.costId > 0) {

                let costNft = await indexerClient.searchForAssets().index(props.costId).do();
                const costAsset = costNft.assets?.[0]
                const costParams = getAssetParams(costAsset)
                const costImageUrls = await resolveAssetImageUrls({
                    asset: costAsset,
                    assetId: props.costId,
                    indexerClient,
                    preferAsaIcon: true,
                })

                if (!isCurrent()) return
                setCostNft({
                    name: getAssetDisplayName(costParams, `Asset ${props.costId}`),
                    decimals: getAssetDecimals(costParams),
                })
                setCostNftUrls(costImageUrls)

            }
            
            let nft = await indexerClient.searchForAssets().index(props.nftId).limit(1).do();
            const asset = nft.assets?.[0]
            const resolvedNftUrls = await resolveAssetImageUrls({
                asset,
                assetId: props.nftId,
                indexerClient,
            })

            if (!isCurrent()) return
            setNft(nft)
            setNftUrls(resolvedNftUrls)
            setDisplay(true)

        }
        
        catch(error) {
            console.log(error)
        }

        }
    

    useEffect(() => {

        let current = true
        fetchData(() => current);

        return () => {
            current = false
        }

    }, [props.nftId, props.amount, props.costId, props.costAmount, props.listingAddress])

    const handleChange = (event) => {
        
        const target = event.target;
        let value = target.type === 'checkbox' ? target.checked : target.value;
        const name = target.name;
        if (name == "listAmount") {
            setListAmount(value)
        }
        if (name == "costId") {
            if (/^\d*$/.test(value)) setCostId(value)
        }
        if (name == "costAmount") {
            const edit = priceInputEdit(value, target.selectionStart)
            if (edit) {
                priceCaretRef.current = edit.caret
                setCostAmount(edit.value)
            }
        }
        if (name == "buyAmount") {
            if (value == "" || value <= props.amount && value >= 0) {
                setBuyAmount(value)
            }
        }

    }

    function matchesSearch(query, target) {
        return target.toLowerCase().includes(query.toLowerCase());
    }

    function openExplorer(assetId) {
        if (typeof window === "undefined") return
        window.open("https://explorer.perawallet.app/asset/" + assetId)
    }

    if (!display || !nft?.assets?.[0]?.params) {
        return <div className="marketAssetSkeleton" />
    }

    const params = nft.assets[0].params
    const name = getAssetDisplayName(params, `Asset ${props.nftId}`)
    const decimals = getAssetDecimals(params)
    const amount = props.amount / (10 ** decimals)
    const imageUrl = nftUrls[nftUrlIndex] || "/market/empty.png"
    const costNftUrl = costNftUrls[costNftUrlIndex] || ""
    const priceLabel = costNft
        ? `${formatExactNumber(props.costAmount / (10 ** costNft.decimals))} ${costNft.name}`
        : null
    const buyTotal = costNft && buyAmount
        ? `${formatExactNumber(Number(buyAmount) * (props.costAmount / (10 ** costNft.decimals)))} ${costNft.name}`
        : "Enter Amount"
    const listReady = listAmount && costAmount && costId !== null && costId !== ""
    const buyReady = buyAmount && Number(buyAmount) > 0

    function handleAssetImageError() {
        if (nftUrlIndex < nftUrls.length - 1) {
            setNftUrlIndex((current) => current + 1)
        }
    }

    function handleCostImageError() {
        if (costNftUrlIndex < costNftUrls.length - 1) {
            setCostNftUrlIndex((current) => current + 1)
        }
    }

    function AssetArtwork({ focus = false, onClick }) {
        const Tag = onClick ? "button" : "div"

        return (
            <Tag
                type={onClick ? "button" : undefined}
                className={focus ? "marketFocusArt" : "marketAssetCard"}
                onClick={onClick}
            >
                <img src={imageUrl} alt={name} className="marketAssetImage" loading="lazy" onError={handleAssetImageError} />
                <span className="marketBadge marketBadgeTopRight">
                    {focus ? amount.toLocaleString() : formatNumber(amount)}
                </span>
                {priceLabel ? (
                    <span className="marketBadge marketBadgeTopLeft">
                        <PriceValue compact />
                    </span>
                ) : null}
                <span className="marketAssetName">{name}</span>
            </Tag>
        )
    }

    function PriceValue({ compact = false }) {
        if (!priceLabel) return null

        return (
            <span className={compact ? "marketPriceValue marketPriceValueCompact" : "marketPriceValue"}>
                {costNftUrl ? <img src={costNftUrl} alt="" loading="lazy" onError={handleCostImageError} /> : null}
                <span>{priceLabel}</span>
            </span>
        )
    }

    if (props.remove) {
        return (
            <div className="marketFocusGrid">
                <AssetArtwork focus onClick={() => props.setListAsset(null)} />

                <section className="marketFocusPanel">
                    <p className="marketFocusPanelKicker">YOUR LISTING</p>
                    <h2>{name}</h2>

                    <div className="marketFocusMeta">
                        <div className="marketMetaRow">
                            <span>Amount</span>
                            <span>{amount.toLocaleString()}</span>
                        </div>
                        {priceLabel ? (
                            <div className="marketMetaRow">
                                <span>Price each</span>
                                <PriceValue />
                            </div>
                        ) : null}
                        {listingAddress ? (
                            <div className="marketMetaRow">
                                <span>Seller</span>
                                <span>{listingAddress.slice(0, 6)}...{listingAddress.slice(-4)}</span>
                            </div>
                        ) : null}
                    </div>

                    <div className="marketActionRow">
                        <button
                            type="button"
                            className="marketActionButton"
                            onClick={() => props.removeListing(props.nftId, props.amount, props.costId, props.costAmount, props.listingAddress)}
                        >
                            REMOVE LISTING
                        </button>
                        <button
                            type="button"
                            className="marketSecondaryButton"
                            onClick={() => props.setListAsset(null)}
                        >
                            BACK TO STALL
                        </button>
                    </div>
                </section>
            </div>
        )
    }

    if (props.buy) {
        return (
            <div className="marketFocusGrid">
                <AssetArtwork focus onClick={() => props.setListAsset(null)} />

                <section className="marketFocusPanel">
                    <p className="marketFocusPanelKicker">MARKET LISTING</p>
                    <h2>{name}</h2>

                    <div className="marketFocusMeta">
                        <div className="marketMetaRow">
                            <span>Available</span>
                            <span>{amount.toLocaleString()}</span>
                        </div>
                        {priceLabel ? (
                            <div className="marketMetaRow">
                                <span>Price each</span>
                                <PriceValue />
                            </div>
                        ) : null}
                        {listingAddress ? (
                            <div className="marketMetaRow">
                                <span>Seller</span>
                                <span>{listingAddress.slice(0, 6)}...{listingAddress.slice(-4)}</span>
                            </div>
                        ) : null}
                    </div>

                    <div className="marketActionRow">
                        <button
                            type="button"
                            className="marketSecondaryButton"
                            onClick={() => openExplorer(props.nftId)}
                        >
                            NFT ID
                        </button>
                        {props.costId > 0 ? (
                            <button
                                type="button"
                                className="marketSecondaryButton"
                                onClick={() => openExplorer(props.costId)}
                            >
                                COST ID
                            </button>
                        ) : null}
                    </div>

                    <div className="marketFormGrid">
                        <TextField
                            color="primary"
                            variant="outlined"
                            value={buyAmount || ""}
                            type="number"
                            label={"Amount"}
                            name="buyAmount"
                            onChange={handleChange}
                            sx={marketTextFieldSx}
                            className="marketFormFull"
                            fullWidth
                        />
                    </div>

                    <div className="marketActionRow">
                        <button
                            type="button"
                            className="marketActionButton"
                            disabled={!buyReady}
                            onClick={() => props.buyAsset(Number(buyAmount), props.nftId, props.amount, props.costId, props.costAmount, props.listingAddress)}
                        >
                            BUY FOR {buyTotal}
                        </button>
                        <button
                            type="button"
                            className="marketSecondaryButton"
                            onClick={() => props.setListAsset(null)}
                        >
                            BACK TO LISTINGS
                        </button>
                    </div>
                </section>
            </div>
        )
    }

    if (props.listAsset) {
        return (
            <div className="marketFocusGrid">
                <AssetArtwork focus onClick={() => props.setListAsset(null)} />

                <section className="marketFocusPanel">
                    <p className="marketFocusPanelKicker">WALLET ASSET</p>
                    <h2>{name}</h2>

                    <div className="marketFocusMeta">
                        <div className="marketMetaRow">
                            <span>Held</span>
                            <span>{amount.toLocaleString()}</span>
                        </div>
                        <div className="marketMetaRow">
                            <span>Asset ID</span>
                            <span>{props.nftId}</span>
                        </div>
                    </div>

                    <div className="marketFormGrid">
                        <TextField
                            color="primary"
                            variant="outlined"
                            value={listAmount || ""}
                            type="number"
                            label={"Amount to list"}
                            name="listAmount"
                            onChange={handleChange}
                            sx={marketTextFieldSx}
                            className="marketFormFull"
                            fullWidth
                        />
                        <div className="marketCostAssetField marketFormFull">
                        <TextField
                            color="primary"
                            variant="outlined"
                            value={costId ?? ""}
                            inputProps={{ inputMode: "numeric" }}
                            label={"Cost asset ID (0 = ALGO)"}
                            name="costId"
                            onChange={handleChange}
                            disabled={props.busy}
                            sx={marketTextFieldSx}
                            fullWidth
                        />
                        <PaymentAssetShortcuts value={costId} onChange={setCostId} disabled={props.busy} />
                        </div>
                        <TextField
                            color="primary"
                            variant="outlined"
                            value={costAmount || ""}
                            type="text"
                            inputProps={{ inputMode: "decimal" }}
                            inputRef={priceInputRef}
                            label={"Price per whole unit"}
                            name="costAmount"
                            onChange={handleChange}
                            onKeyDown={(event) => {
                                const input = priceInputRef.current
                                const start = input.selectionStart
                                if (start !== input.selectionEnd) return
                                if (event.key === "Backspace" && input.value[start - 1] === ",") input.setSelectionRange(start - 1, start - 1)
                                if (event.key === "Delete" && input.value[start] === ",") input.setSelectionRange(start + 1, start + 1)
                            }}
                            disabled={props.busy}
                            className="marketFormFull"
                            sx={marketTextFieldSx}
                            fullWidth
                        />
                    </div>
                    
                    <div className="marketActionRow">
                        <button
                            type="button"
                            className="marketActionButton"
                            disabled={!listReady || props.busy}
                            onClick={() => props.list(props.nftId, listAmount, Number(costId), unformatPriceInput(costAmount))}
                        >
                            {props.busy ? "PROCESSING..." : "LIST ASSET"}
                        </button>
                        <button
                            type="button"
                            className="marketSecondaryButton"
                            onClick={() => props.setListAsset(null)}
                        >
                            BACK TO WALLET
                        </button>
                    </div>
                </section>
            </div>
        )

    }

    if (props.search == "" || matchesSearch(props.search, name)) {
        return (
            <AssetArtwork
                onClick={() => props.setListAsset({id: props.nftId, amount: props.amount, costId: props.costId, costAmount: props.costAmount, listingAddress: props.listingAddress})}
            />
        )
    }

    return null
}
