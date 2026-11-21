import React, { useEffect, useState } from "react"

import { TextField } from "@mui/material"

import { useWallet } from "@txnlab/use-wallet-react"

import DisplayAsset from "../../components/contracts/Market/displayAsset"
import {
    MarketEmptyState,
    MarketPageShell,
    MarketPager,
    MarketToolbar,
    marketTextFieldSx,
} from "../../components/contracts/Market/MarketPageShell"

import algosdk from "algosdk"
import { useRouter } from "next/router"
import { listingPath, parseUnits, unitScale } from "../../functions/market/model"
import { marketAlgod, buildListing, sendMarketGroup, announceMarketTransaction } from "../../lib/marketTransactions"

const longToByteArray = (long) => {
    // we want to represent the input as a 8-bytes array
    var byteArray = [0, 0, 0, 0, 0, 0, 0, 0];

    for ( var index = byteArray.length - 1; index > 0; index -- ) {
        var byte = long & 0xff;
        byteArray [ index ] = byte;
        long = (long - byte) / 256 ;
    }

    return byteArray;
};



export default function List(props){
    const router = useRouter()
    const [busy, setBusy] = useState(false)
    const [notice, setNotice] = useState("")
    const showMessage = (message) => { setNotice(message); props.setMessage(message) }

    const {
        wallets,
        activeWallet,
        activeAddress,
        isReady,
        signTransactions,
        transactionSigner,
        algodClient,
    } = useWallet()

    const [ allAssets, setAllAssets ] = useState([])
    const [ assets, setAssets ] = useState([])

    const [ listAsset, setListAsset ] = useState(null)

    const [ search, setSearch ] = useState("")

    const [ listNum, setListNum ] = useState(0)


    
    const fetchData = async () => {

        try {

        setAssets([])

        const response = await fetch('/api/getAddrAssets', {
            method: "POST",
            body: JSON.stringify({
                activeAccount: activeAddress
            }),
            headers: {
                "Content-Type": "application/json",
            }
            
        });

        const session = await response.json()

        console.log(session)

        setAssets(session.slice(listNum, listNum + 50))
        setAllAssets(session)

        }
        catch(error) {
            console.log(error)
        }


    }

    useEffect(() => {
        
        if (activeAddress) {

            fetchData()
            
        }
        
    
    }, [listNum, activeAddress])

    const handleChange = (event) => {
        
        const target = event.target;
        let value = target.type === 'checkbox' ? target.checked : target.value;
        const name = target.name;
        if (name == "search") {
            setSearch(value)
        }

    }

    const list = async (assetId, displayAmount, currencyId, displayPrice) => {
        if (!activeAddress || busy) return
        setBusy(true)
        try {
            const client = marketAlgod()
            const indexer = new algosdk.Indexer("", "https://mainnet-idx.algonode.cloud", 443)
            const { asset } = await indexer.lookupAssetByID(assetId).do()
            const currency = currencyId === 0 ? { params: { decimals: 6 } } : (await indexer.lookupAssetByID(currencyId).do()).asset
            const amount = parseUnits(displayAmount, asset.params.decimals)
            const pricePerUnit = parseUnits(displayPrice, currency.params.decimals)
            const scale = unitScale(asset.params.decimals)
            if (pricePerUnit % scale !== 0n) throw new Error("This contract requires a price that can be divided exactly across the asset's smallest units. Increase the price or choose a payment asset with more decimals.")
            const price = pricePerUnit / scale
            const listing = { assetId, amount: String(amount), costId: currencyId, costAmount: String(price), seller: activeAddress }
            const txns = await buildListing({ client, listing })
            const txId = await sendMarketGroup({ client, txns, signTransactions, setMessage: showMessage, actionLabel: "LIST" })
            showMessage("Asset listed. Your listing now has its own shareable link.")
            await announceMarketTransaction(txId)
            await router.push(listingPath(txId))
        } catch (error) {
            showMessage(error.message || "Unable to list this asset.")
        } finally {
            setBusy(false)
        }
    }
    
        return (
            <MarketPageShell
                title="LIST"
                subtitle="Choose an NFT from your connected wallet, set the amount and price, and list it in the market contract."
            >
                <MarketToolbar
                    onBack={listAsset ? () => setListAsset(null) : null}
                    backLabel="Back to wallet assets"
                >
                    <TextField
                        color="primary"
                        variant="outlined"
                        value={search}
                        type="text"
                        label={"Search wallet"}
                        name="search"
                        onChange={handleChange}
                        fullWidth
                        sx={marketTextFieldSx}
                    />

                    <MarketPager
                        listNum={listNum}
                        total={allAssets.length}
                        onPrev={() => setListNum(prevState => prevState - 50)}
                        onNext={() => setListNum(prevState => prevState + 50)}
                    />
                </MarketToolbar>

                {notice ? <p className="marketNotice" role="status">{notice}</p> : null}
                {listAsset ? 
                    <DisplayAsset nftId={listAsset.id} amount={listAsset.amount} setListAsset={setListAsset} list={list} listAsset={true} busy={busy} />
                :
                    assets.length > 0 ? 
                        <div className="marketGrid">
                            {assets.map((asset) => {
                                console.log(asset)
                                return (
                                    <DisplayAsset key={asset.assetId} nftId={asset.assetId} amount={asset.amount} setListAsset={setListAsset} search={search}/>
                                )
                            })}
                        </div>
                    :
                        <MarketEmptyState
                            title={activeAddress ? "No wallet assets found" : "Wallet not connected"}
                            text={activeAddress ? "There are no assets available to list in this page range." : "Connect a wallet to choose NFTs for sale."}
                        />
                }
            </MarketPageShell>
        )
    
    
}
