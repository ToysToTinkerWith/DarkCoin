import React, { useEffect, useState } from "react"

import { Grid, Typography, Button, TextField } from "@mui/material"

import { useWallet } from "@txnlab/use-wallet"

import DisplayAsset from "../../components/contracts/Market/displayAsset"

import algosdk from "algosdk"

import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const byteArrayToLong = (byteArray) => {
    var value = 0;
    for ( var i = 0; i < byteArray.length; i++) {
        value = (value * 256) + byteArray[i];
    }

    return value;
};

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


export default function Stall(props){

    const { activeAccount, signTransactions, sendTransactions } = useWallet()

    const [ assets, setAssets ] = useState([])

    const [ listAsset, setListAsset ] = useState(null)
    const [ allAssets, setAllAssets ] = useState([])
    

    const [ search, setSearch ] = useState("")

    const [ listNum, setListNum ] = useState(0)
    
    
    const fetchData = async () => {

        try {

            setAssets([])
            setAllAssets([])

        const response = await fetch('/api/council/getBoxes', {
            method: "POST",
            body: JSON.stringify({
                contract: 3069960875
            }),
            headers: {
                "Content-Type": "application/json",
            }
            
        });

        const session = await response.json()

        console.log(session)

        let assets = []

        session.boxes.forEach((listing) => {
            console.log(listing)
            let address = algosdk.encodeAddress(Object.values(listing.name).slice(32))
            console.log(address)
            if (activeAccount.address == address) {
                assets.push(listing)
            }
        })

        setAssets(assets.slice(listNum, listNum + 50))
        setAllAssets(assets)

        }
        catch(error) {
            console.log(error)
        }


    }

    useEffect(() => {

        if (activeAccount) {
            fetchData()
        }
    
    }, [listNum, activeAccount])

    const handleChange = (event) => {
        
        const target = event.target;
        let value = target.type === 'checkbox' ? target.checked : target.value;
        const name = target.name;
        if (name == "search") {
            setSearch(value)
        }

    }

    const removeListing = async (id, amount, costId, costAmount, address) => {

        console.log(id, amount, costId, costAmount, address)

        const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)
                    
        const stringAddress = algosdk.encodeAddress(address)

        let txns = []

        let opted = await indexerClient.lookupAssetBalances(id).do();

        let optedin = false
        
        opted.balances.forEach((account) => {
            if(account.address == activeAccount.address) {
            optedin = true
            }
        })

        if (!optedin) {

            let otxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
                activeAccount.address, 
                activeAccount.address, 
                undefined,
                undefined,
                0, 
                undefined,
                id,
                params
            );

            txns.push(otxn)
            
        }

        const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)
                
        let params = await client.getTransactionParams().do();

        let appArgs = []
        appArgs.push(
            new Uint8Array(Buffer.from("removeListing")),
            algosdk.encodeUint64(amount),
            algosdk.encodeUint64(costId),
            algosdk.encodeUint64(costAmount)
        )

        let accounts = []
        let foreignApps = []
            
        let foreignAssets = [id]

    
        let listBox = new Uint8Array([...longToByteArray(id), ...longToByteArray(amount), ...longToByteArray(costId), ...longToByteArray(costAmount), ...address])

        console.log(listBox)

        let boxes = [{appIndex: 0, name: listBox}]
        
        let atxn = algosdk.makeApplicationNoOpTxn(activeAccount.address, params, props.contracts.market, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);

        txns.push(atxn)

        let txgroup = algosdk.assignGroupID(txns)

        let encodedTxns= []

        txns.forEach((txn) => {
            let encoded = algosdk.encodeUnsignedTransaction(txn)
            encodedTxns.push(encoded)
    
        })

        console.log(txns)

        props.setMessage("Sign transaction...")
    
        const signedTransactions = await signTransactions(encodedTxns)

        props.setMessage("Sending transaction...")

        const { txId } = await sendTransactions(signedTransactions)

        let confirmedTxn = await algosdk.waitForConfirmation(client, txId, 4);

        props.setMessage("Asset delisted")

        setListAsset(null)
        fetchData()

    }
        console.log(listAsset)
    
        return (
            <div >
                <Grid container>
                    <Grid item xs={12}>
                        <TextField
                            color="primary"
                            variant="outlined"
                            value={search}
                            type="text"
                            label={"Search"}
                            name="search"
                            onChange={handleChange}
                            sx={{
                                width: '90%',
                                display: 'flex',
                                margin: 'auto',
                                input: { color: 'white' },                    
                                label: { 
                                color: 'white',                              
                                '&.Mui-focused': {
                                    color: 'white'                          
                                }
                                },
                                '.MuiOutlinedInput-root': {
                                '& fieldset': {
                                    borderColor: 'white',
                                },
                                '&:hover fieldset': {
                                    borderColor: 'white',
                                },
                                '&.Mui-focused fieldset': {
                                    borderColor: 'white',
                                },
                                }
                            }}
                        />
                    </Grid>
                </Grid>
                <Grid container align="center">
                    <Grid item xs={4}>
                        <Button style={{}} onClick={() => listNum - 50 >= 0 ? setListNum(prevState => prevState - 50) : null}>
                            <ArrowBackIcon style={{color: "#FFFFFF"}} />
                        </Button>
                    </Grid>
                    <Grid item xs={4}>
                        <Typography variant="h6" color="secondary"> Showing assets {listNum + 1} - {listNum + 50 > allAssets.length ? allAssets.length : listNum + 51} ({allAssets.length}) </Typography>
                    </Grid>
                    <Grid item xs={4}>
                        <Button style={{}} onClick={() => listNum + 50 < allAssets.length ? setListNum(prevState => prevState + 50) : null}>
                            <ArrowForwardIcon style={{color: "#FFFFFF"}} />
                        </Button>
                    </Grid>
                </Grid>
                {listAsset ? 
                    <DisplayAsset nftId={listAsset.id} amount={listAsset.amount} costId={listAsset.costId} costAmount={listAsset.costAmount} listingAddress={listAsset.listingAddress} setListAsset={setListAsset} remove={true} removeListing={removeListing}  />
                :
                    <Grid container>
                        {assets.length > 0 ? 
                            assets.map((asset, index) => {
                                return (
                                    <Grid id={index} item xs={6} sm={4} md={3} lg={2}>
                                        <DisplayAsset nftId={byteArrayToLong(Object.values(asset.name).slice(0,8))} amount={byteArrayToLong(Object.values(asset.name).slice(8,16))} costId={byteArrayToLong(Object.values(asset.name).slice(16,24))} costAmount={byteArrayToLong(Object.values(asset.name).slice(24,32))} listingAddress={Object.values(asset.name).slice(32,64)} listing={true} setListAsset={setListAsset} search={search}/>
                                    </Grid>
                                )
                            })
                        :
                            null
                        }
                        
                    </Grid>
                }
                
                

                

             
                
                
            </div>
        )
    
    
}