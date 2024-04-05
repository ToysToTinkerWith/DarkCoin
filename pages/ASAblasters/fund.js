import React, { useState } from 'react';

import { useWallet } from '@txnlab/use-wallet'

import algosdk from "algosdk"

import { Typography, Button, TextField, Grid} from "@mui/material"


export default function fund(props) {

  const { activeAccount, signTransactions, sendTransactions } = useWallet()

  const [address, setAddress] = useState("")

  const [assets, setAssets] = useState([])
  const [assetNum, setAssetNum] = useState(0)

  const [fundAsset, setFundAsset] = useState(0)
  const [fundAmount, setFundAmount] = useState(0)


  React.useEffect(() => {

    const fetchData = async () => {


      const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)

      setAssets([])

      const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)

      let contractAccount = await algosdk.getApplicationAddress(props.contracts.ASAblasters)

      setAddress(contractAccount)

      const accountInfo = await indexerClient.lookupAccountAssets(contractAccount).do();

      setAssetNum(accountInfo.assets.length)

      if (accountInfo.assets) {
        accountInfo.assets.forEach( async (asset) => {
          let assetInfo = await indexerClient.lookupAssetByID(asset["asset-id"]).do();
          let unitName = assetInfo.asset.params["unit-name"]
          let decimals = assetInfo.asset.params.decimals
          let div = 10**decimals
          setAssets(assets => [...assets, {assetId: asset["asset-id"], amount: asset.amount / div, unitName: unitName}])
          
            


          })
    }
    

    }
    fetchData();      

    }, [activeAccount])


  const handleChange = (event) => {

      
    const target = event.target;
    let value = target.type === 'checkbox' ? target.checked : target.value;
    const name = target.name;

    if (name == "amend") {
      setAmend(value)
    }
    if (name == "fundAsset") {
      setFundAsset(value)
    }
    if (name == "fundAmount") {
      setFundAmount(value)
    }
    

  }

  const fund = async () => {

    try {

    const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)

    let params = await client.getTransactionParams().do();


    let txns = []

    let ftxn

    if (Number(fundAsset) == 0) {
      ftxn = algosdk.makePaymentTxnWithSuggestedParams(
        activeAccount.address, 
        address, 
        Number(fundAmount) * 1000000, 
        undefined,
        undefined,
        params
      );

      txns.push(ftxn)
    }
    else {
      const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)

      const assetInfo = await indexerClient.lookupAssetByID(fundAsset).do();

      let decimals = assetInfo.asset.params.decimals
      let div = 10**decimals

      ftxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
        activeAccount.address, 
        address, 
        undefined,
        undefined,
        Number(fundAmount) * div, 
        undefined,
        Number(fundAsset),
        params
      );

     

      let appArgs = []
      appArgs.push(
        new Uint8Array(Buffer.from("optin"))
      )

      let accounts = []
      let foreignApps = []
        
      let foreignAssets = [Number(fundAsset)]
      
      let wtxn = algosdk.makeApplicationNoOpTxn(activeAccount.address, params, props.contracts.ASAblasters, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined);

      txns.push(wtxn)

      txns.push(ftxn)

      let txgroup = algosdk.assignGroupID(txns)

    }

    let encodedTxns= []

    txns.forEach((txn) => {
      let encoded = algosdk.encodeUnsignedTransaction(txn)
      encodedTxns.push(encoded)

    })

    props.setProgress(0)

    props.setMessage("Sign transaction...")

    const signedTransactions = await signTransactions(encodedTxns)

    props.setProgress(0)

    props.setMessage("Sending transaction...")

    const { id } = await sendTransactions(signedTransactions)

    let confirmedTxn = await algosdk.waitForConfirmation(client, id, 4);

    props.setMessage("ASAblasters funded.")

    

    }
    catch(error) {
      props.setMessage(String(error))
      props.setProgress(0)
      await props.sendDiscordMessage(error, "ASAblasters fund", activeAccount.address)
    }

  }

  let sortedAssets = []

  assets.forEach((asset) => {
    let found = false
    sortedAssets.forEach((sasset) => {
      if (asset.assetId == sasset.assetId) {
        found = true
      }
    })
    if (!found) {
      sortedAssets.push(asset)
    }
  })
 

  return (
  <React.Fragment>
        <Grid container justifyContent="center" alignItems="center" style={{display: "flex", margin: "auto", padding: 40}}>
                <Grid item xs={12} sm={12} md={12} >
                {sortedAssets.length > 0 ? 
                sortedAssets.map((asset, index) => {
                  return (
                    <Typography key={index} color="secondary" variant="h6" align="center"> {asset.unitName} | {asset.amount} </Typography>
                    )
                })
                :
                null
                }
                </Grid>
                
             
                <Grid item xs={12} sm={6}>
                
                <br />
                  
                  <TextField                
                      onChange={handleChange}
                      value={fundAsset}
                      multiline
                      type="number"
                      label={<Typography color="primary" variant="caption" align="center" style={{backgroundColor: "white", padding: 20, borderRadius: 50}}> Asset Id (Algo = 0) </Typography>}
                      name="fundAsset"
                      autoComplete="false"
                      InputProps={{ style: { color: "black" } }}
                    
                      style={{
                      color: "black",
                      background: "white",
                      borderRadius: 15,
                      display: "flex",
                      margin: "auto",
                      width: "80%"
                    
                      }}
                    />

                </Grid>
                <Grid item xs={12} sm={6}>
                
                <br />
                  
                  <TextField                
                      onChange={handleChange}
                      value={fundAmount}
                      multiline
                      type="number"
                      label={<Typography color="primary" variant="caption" align="center" style={{backgroundColor: "white", padding: 20, borderRadius: 50}}> Asset Amount </Typography>}
                      name="fundAmount"
                      autoComplete="false"
                      InputProps={{ style: { color: "black" } }}
                    
                      style={{
                      color: "black",
                      background: "white",
                      borderRadius: 15,
                      display: "flex",
                      margin: "auto",
                      width: "80%"
                    
                      }}
                    />

                </Grid>
                <Grid item xs={12} sm={6}>

                <br />
                <Button variant="contained" color="secondary" style={{display: "flex", margin: "auto"}} onClick={() => fund()}>
                  <Typography  variant="h6"> Fund </Typography>
                </Button>
                </Grid>
                </Grid>
        
    </React.Fragment>
  )

}

