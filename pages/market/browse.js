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

function generateId(length = 10) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}


export default function Browse(props){

    const { activeAccount, signTransactions, sendTransactions } = useWallet()

    const [ assets, setAssets ] = useState([])
    const [ allAssets, setAllAssets ] = useState([])
    

    const [ listAsset, setListAsset ] = useState(null)

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

        let parsedAssets = []

        session.boxes.forEach((box) => {

            parsedAssets.push({id: generateId(), assetId: byteArrayToLong(Object.values(box.name).slice(0,8)), amount: byteArrayToLong(Object.values(box.name).slice(8,16)), costId: byteArrayToLong(Object.values(box.name).slice(16,24)), costAmount: byteArrayToLong(Object.values(box.name).slice(24,32)), listingAddress: Object.values(box.name).slice(32,64)})

        })

        console.log(parsedAssets)
        setAssets(parsedAssets.slice(listNum, listNum + 50))
        setAllAssets(parsedAssets)

        }
        catch(error) {
            console.log(error)
        }


    }

    useEffect(() => {
        
            fetchData()
        
    
    }, [listNum, activeAccount])

    const handleChange = (event) => {
        
        const target = event.target;
        let value = target.type === 'checkbox' ? target.checked : target.value;
        const name = target.name;
        if (name == "search") {
            setSearch(value)
        }
        

    }

    const buyAsset = async (buyAmount, id, amount, costId, costAmount, address) => {

        console.log(buyAmount, id, amount, costId, costAmount, address)

        const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)

        const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)
                
        let params = await client.getTransactionParams().do();
                    
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

            console.log(activeAccount.address, 
                activeAccount.address, 
                undefined,
                undefined,
                0, 
                undefined,
                Number(id),
                params
            );

            let otxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
                activeAccount.address, 
                activeAccount.address, 
                undefined,
                undefined,
                0, 
                undefined,
                Number(id),
                params
            );

            txns.push(otxn)
            
        }

        

        console.log(listAsset)

        let ptxn

        if (costId == 0) {
            ptxn = algosdk.makePaymentTxnWithSuggestedParams(
                activeAccount.address,
                stringAddress, 
                costAmount * buyAmount, 
                undefined,
                undefined,
                params
            );
        }
        else {
            ptxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
                activeAccount.address, 
                stringAddress, 
                undefined,
                undefined,
                costAmount * buyAmount, 
                undefined,
                costId,
                params
            );
        }


        txns.push(ptxn)

        let appArgs = []
        appArgs.push(
            new Uint8Array(Buffer.from("buyAsset")),
            algosdk.encodeUint64(amount),
            algosdk.encodeUint64(costAmount),
            algosdk.encodeUint64(buyAmount)
        )

        let accounts = [stringAddress]
        let foreignApps = []
            
        let foreignAssets = [id, costId]

    

        let listBox = new Uint8Array([...longToByteArray(id), ...longToByteArray(amount), ...longToByteArray(costId), ...longToByteArray(costAmount), ...address])
        let newListBox = new Uint8Array([...longToByteArray(id), ...longToByteArray(amount - buyAmount), ...longToByteArray(costId), ...longToByteArray(costAmount), ...address])

        console.log(listBox)

        let boxes = [{appIndex: 0, name: listBox}, {appIndex: 0, name: newListBox}]
        
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

        props.setMessage("Asset bought")

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
                    <DisplayAsset nftId={listAsset.id} amount={listAsset.amount} costId={listAsset.costId} costAmount={listAsset.costAmount} listingAddress={listAsset.listingAddress} setListAsset={setListAsset} buy={true} buyAsset={buyAsset}  />
                :
                    <Grid container>
                        {assets.length > 0 ? 
                            assets.map((asset) => {
                                console.log(asset)
                                return (
                                    <Grid key={asset.id} item xs={6} sm={4} md={3} lg={2}>
                                        <DisplayAsset nftId={asset.assetId} amount={asset.amount} costId={asset.costId} costAmount={asset.costAmount} listingAddress={asset.listingAddress} listing={true} setListAsset={setListAsset} search={search}/>
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