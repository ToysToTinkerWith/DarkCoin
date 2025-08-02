import React, { useEffect, useState } from "react"

import { Grid, Typography, Button, TextField } from "@mui/material"

import { useWallet } from "@txnlab/use-wallet"

import DisplayAsset from "../../components/contracts/Market/displayAsset"

import algosdk from "algosdk"

import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

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

async function sleep(msec) {
    return new Promise(resolve => setTimeout(resolve, msec));
}



export default function List(props){

    const { activeAccount, signTransactions, sendTransactions } = useWallet()

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
                activeAccount: activeAccount.address
            }),
            headers: {
                "Content-Type": "application/json",
            }
            
        });

        const session = await response.json()

        setAssets(session.slice(listNum, listNum + 50))
        setAllAssets(session)

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

    const list = async (listAsset, listAmount, costId, costAmount) => {

        console.log(listAsset, listAmount, costId, costAmount)

        const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)
                    
        let listNft = await indexerClient.searchForAssets().index(listAsset).do();

        console.log(listNft)

        let listAtomicAmount = listAmount * (10 ** listNft.assets[0].params.decimals)

        let costNft = await indexerClient.searchForAssets().index(costId).do();

        console.log(costNft)

        let costAtomicAmount 
        
        if (costId == 0) {
            costAtomicAmount = costAmount * (10 ** 6)
        }
        else {
            costAtomicAmount = costAmount * (10 ** costNft.assets[0].params.decimals)
        }

        const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)
                
        let params = await client.getTransactionParams().do();

        let ftxn = algosdk.makePaymentTxnWithSuggestedParams(
            activeAccount.address,
            "HZ2SGTDNOACVJXJ5HP3BM7O3HVEQDH4HYRRWW6ZM5GYOCLIXNMDPN74FAY", 
            100000, 
            undefined,
            undefined,
            params
        );

        console.log(listAsset)

        let ltxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
            activeAccount.address, 
            "HZ2SGTDNOACVJXJ5HP3BM7O3HVEQDH4HYRRWW6ZM5GYOCLIXNMDPN74FAY", 
            undefined,
            undefined,
            listAtomicAmount, 
            undefined,
            listAsset,
            params
        );

        let appArgs = []
        appArgs.push(
            new Uint8Array(Buffer.from("listAsset")),
            algosdk.encodeUint64(costId),
            algosdk.encodeUint64(costAtomicAmount)
        )

        let accounts = []
        let foreignApps = []
            
        let foreignAssets = [listAsset]

        let listingAddress = algosdk.decodeAddress(activeAccount.address).publicKey

        let listBox = new Uint8Array([...longToByteArray(listAsset), ...longToByteArray(listAtomicAmount), ...longToByteArray(costId), ...longToByteArray(costAtomicAmount), ...listingAddress])

        console.log(listBox)

        let boxes = [{appIndex: 0, name: listBox}]
        
        let atxn = algosdk.makeApplicationNoOpTxn(activeAccount.address, params, props.contracts.market, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
        
        let txns = [ftxn, ltxn, atxn]

        let opted = await indexerClient.lookupAssetBalances(listAsset).do();

        let optedin = false
        
        opted.balances.forEach((account) => {
            if(account.address == "HZ2SGTDNOACVJXJ5HP3BM7O3HVEQDH4HYRRWW6ZM5GYOCLIXNMDPN74FAY") {
            optedin = true
            }
        })

        if (!optedin) {

            

            let appArgs = []
            appArgs.push(
                new Uint8Array(Buffer.from("optin"))
            )

            let accounts = []
            let foreignApps = []
                
            let foreignAssets = [listAsset]

            let boxes = []
            
            let otxn = algosdk.makeApplicationNoOpTxn(activeAccount.address, params, props.contracts.market, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);

            txns.unshift(otxn)
            
        }

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

        const { id } = await sendTransactions(signedTransactions)

        let confirmedTxn = await algosdk.waitForConfirmation(client, id, 4);

        props.setMessage("Asset listed")

        setListAsset(null)
        fetchData()

    }

  


    
        return (
            <div>
               
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
                    <DisplayAsset nftId={listAsset.id} amount={listAsset.amount} setListAsset={setListAsset} list={list} listAsset={true} />
                :
                    <Grid container>
                        {assets.length > 0 ? 
                            assets.map((asset, index) => {
                                return (
                                    <Grid id={asset["asset-id"]} item xs={4} sm={3} md={2} lg={1}>
                                        <DisplayAsset nftId={asset["asset-id"]} amount={asset.amount} setListAsset={setListAsset} search={search}/>
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