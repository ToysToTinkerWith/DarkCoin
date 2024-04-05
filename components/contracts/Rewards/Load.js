import React, {useState, useEffect} from "react"

import algosdk, { assignGroupID } from "algosdk"

import { useWallet } from '@txnlab/use-wallet'

import { Card, Typography, Button, Grid, TextField, Link } from "@mui/material"

export default function Load(props) {

  const { activeAccount, signTransactions, sendTransactions } = useWallet()

  const [credits, setCredits] = useState([])
  const [loadAmount, setLoadAmount] = useState("")
  const [loadAsset, setLoadAsset] = useState("")
  const [numSend, setNumSend] = useState(0)

  React.useEffect(() => {

    const fetchData = async () => {

        // if (activeAccount) {
        //     let response = await fetch('/api/rewards/getCredits', {
        //         method: "POST",
        //         headers: {
        //             "Content-Type": "application/json",
        //         },
        //         body: JSON.stringify({
        //             activeAddress: activeAccount.address,
        //             contract: props.contract
        //           }),
                
                    
        //         });
            
        //     let session = await response.json()
        
        
        //     setCredits(session)
        // }


    }
    try {
    fetchData();
    }
    catch(error) {
      props.sendDiscordMessage(error, "Fetch Load", activeAccount.address)
     }

        

    }, [activeAccount])


  
    //   const load = async () => {

    //     try {

    //       const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)
      
    //     let params = await client.getTransactionParams().do()
    
    //     const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)
    
    
    //     let accountAppLocalStates = await indexerClient.lookupAccountAppLocalStates(activeAccount.address).do();
        
    //     let contractAccount = await algosdk.getApplicationAddress(props.contract)
    
    //     const accountAssets = await indexerClient.lookupAccountAssets(contractAccount).do();
    
    //     let contractOpt = false
    
    //     accountAssets.assets.forEach(async (asset) => {
    //     if (asset["asset-id"] == loadAsset) {
    //         contractOpt = true
    //     }
        
    //     })
    
    
    //     let opted = false
    
    //     let txns = []
    
    
    //     accountAppLocalStates["apps-local-states"].forEach((app) => {
    //     if (app.id == props.contract) {
    //         opted = true
    //     }
    //     })
    
    //     let otxn = algosdk.makeApplicationOptInTxn(activeAccount.address, params, props.contract)
    
    //     if (!opted) {
    //     txns.push(otxn)
    //     }
    
    //     let appArgs = []
        
    //     appArgs.push(
    //         new Uint8Array(Buffer.from("optin"))
            
            
    //     )
        
    //     let accounts = []
    //     let foreignApps = []
    
    //     let foreignAssets = [Number(loadAsset)]
    
    //     if (!contractOpt) {
    //     let ftxn = algosdk.makePaymentTxnWithSuggestedParams(
    //         activeAccount.address, 
    //         contractAccount, 
    //         100000, 
    //         undefined,
    //         undefined,
    //         params
    //     );
    
    //     txns.push(ftxn)
        
    //     let aotxn = algosdk.makeApplicationNoOpTxn(activeAccount.address, params, props.contract, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined);
    
    //     txns.push(aotxn)
    //     }
    
    
    //     const assetInfo = await indexerClient.lookupAssetByID(loadAsset).do();
    
    //     let decimals = assetInfo.asset.params.decimals
    //     let div = 10**decimals
    
        
    
    //     let stxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
    //     activeAccount.address, 
    //     contractAccount, 
    //     undefined, 
    //     undefined,
    //     Number(loadAmount) * div,  
    //     undefined, 
    //     Number(loadAsset), 
    //     params
    //     );
    
    //     txns.push(stxn)
    
    //     appArgs = []
        
    //     appArgs.push(
    //     new Uint8Array(Buffer.from("load"))
        
        
    //     )
    
    //     accounts = []
    //     foreignApps = []
        
    //     foreignAssets = [Number(loadAsset)]
    
        
    //     let atxn = algosdk.makeApplicationNoOpTxn(activeAccount.address, params, props.contract, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined);
    
    //     txns.push(atxn)
    
    //     let txgroup = algosdk.assignGroupID(txns)
    
    //     let encodedTxns= []

    //     txns.forEach((txn) => {
    //         let encoded = algosdk.encodeUnsignedTransaction(txn)
    //         encodedTxns.push(encoded)
    
    //     })

    //     props.setMessage("Sign Transaction...")

    
    //     const signedTransactions = await signTransactions(encodedTxns)

    //     props.setMessage("Sending Transaction...")
        
    //     const { id } = await sendTransactions(signedTransactions)

    //     let confirmedTxn = await algosdk.waitForConfirmation(client, id, 4);


    //     props.setMessage("Transaction Confirmed, " + loadAmount + " of Asset " + loadAsset + " has been added for your account.")
  
        
  
    //     setCredits([])
  
    //     let res = await fetch('/api/rewards/getCredits', {
    //       method: "POST",
    //       headers: {
    //           "Content-Type": "application/json",
    //       },
    //       body: JSON.stringify({
    //           activeAddress: activeAccount.address,
    //           contract: props.contract
    //         }),
          
              
    //       });
      
    //   let sess = await res.json()
      
    //   setCredits(sess)
    //   }
    //   catch(error) {
    //     await props.sendDiscordMessage(error, "Load Credits", activeAccount.address)
    //     }
      
      
    // }

      const sendQuote = async () => {

        try {

        const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)
    
        let params = await client.getTransactionParams().do()
    
        
        let ftxns = []

        props.setMessage("Sign Fee Transaction...")
    
        let ftxn = algosdk.makePaymentTxnWithSuggestedParams(
          activeAccount.address, 
          "AL6F3TFPSZPF3BSVUFDNOLMEKUCJJAA7GZ5GF3DN3Q4IVJVNUFK76PQFNE", 
          props.notify ? Number(props.quote.length * 50000) : Number(props.quote.length * 20000), 
          undefined,
          undefined,
          params
        );
    
        ftxns.push(ftxn)

        console.log(props.assetSendInfo)
        console.log(Math.ceil(props.quoteTotal))
        console.log(props.sendAsset)

        let mult = 10 ** props.assetSendInfo.params.decimals

        let aftxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
          activeAccount.address, 
          "66YD7UICVBBL6QG2THOIOPRONTNPYNJ7EUAFRBY4PCKTVV6MQIMMYTAHFE", 
          undefined, 
          undefined,
          Number(Math.ceil(props.quoteTotal) * mult),  
          undefined, 
          Number(props.sendAsset), 
          params
        );
    
        ftxns.push(aftxn)

        const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)
            
        let contractAccount = await algosdk.getApplicationAddress(props.contract)
    
        const accountAssets = await indexerClient.lookupAccountAssets(contractAccount).do();
    
        let contractOpt = false
    
        accountAssets.assets.forEach(async (asset) => {
          console.log(asset)
        if (asset["asset-id"] == props.sendAsset) {
            contractOpt = true
        }
        
        })

        let appArgs = []
        
        appArgs.push(
            new Uint8Array(Buffer.from("optin"))
            
            
        )
        
        let accounts = []
        let foreignApps = []
    
        let foreignAssets = [Number(loadAsset)]
    
        if (!contractOpt) {
        let ftxn = algosdk.makePaymentTxnWithSuggestedParams(
            activeAccount.address, 
            contractAccount, 
            100000, 
            undefined,
            undefined,
            params
        );
    
        ftxns.push(ftxn)
        
        let aotxn = algosdk.makeApplicationNoOpTxn(activeAccount.address, params, props.contract, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined);
    
        ftxns.push(aotxn)
        }

        let txGroup = algosdk.assignGroupID(ftxns)
    
        let encodedTxns= []
  
        ftxns.forEach((txn) => {
          let encoded = algosdk.encodeUnsignedTransaction(txn)
          encodedTxns.push(encoded)
  
        })
  
        const signedTransactions = await signTransactions(encodedTxns)

        setNumSend(0)

        props.setMessage("Sending Transaction...")
        
        const { id } = await sendTransactions(signedTransactions)

        let confirmedTxn = await algosdk.waitForConfirmation(client, id, 4);

        console.log(confirmedTxn)

        props.setMessage("Fee Transaction confirmed, sending airdrop....")


        let response = await fetch('/api/rewards/sendAirdrop', {
          method: "POST",
          headers: {
              "Content-Type": "application/json",
          },
          body: JSON.stringify({
              quote: props.quote,
              note: props.note,
              sendAsset: props.sendAsset,
              basedAsset: props.basedAsset,
              contract: props.contract
            }),
          
              
          });
      
      let session = await response.json()

      console.log(session)
        
        props.setMessage("Airdrop complete")
    
        setNumSend(0)
        props.resetQuote()

      //   let res = await fetch('/api/rewards/getCredits', {
      //     method: "POST",
      //     headers: {
      //         "Content-Type": "application/json",
      //     },
      //     body: JSON.stringify({
      //         activeAddress: activeAccount.address,
      //         contract: props.contract
      //       }),
          
              
      //     });
      
      // let sess = await res.json()
    
      // setCredits(sess)
      }
      catch(error) {
        props.setMessage(String(error))
        await props.sendDiscordMessage(error, "Send Quote", activeAccount.address)
       }
    
        
      }

      const handleChange = (event) => {

      
        const target = event.target;
        let value = target.type === 'checkbox' ? target.checked : target.value;
        const name = target.name;

        if (name == "loadAmount") {
          setLoadAmount(value)
        }
        if (name == "loadAsset") {
        setLoadAsset(value)
        }

       
        
      }

      if (props.sendAmount && props.sendAsset && props.freq && props.quote.length && props.assetSendInfo && props.quoteTotal > 0) {

          return (
            <div>
              {numSend == 0 ?
              <div>
                <br />
                <Button variant="contained" color="secondary" style={{display: "flex", margin: "auto"}} onClick={() => sendQuote()}>
                  <Typography align="center" color="primary" variant="h6" > Send quote </Typography>
                  <Typography style={{margin: 10}} variant="h6"> {props.notify ? Number(props.quote.length * 0.05).toFixed(2) : Number(props.quote.length * 0.02).toFixed(2)}</Typography>
                  <img src="/AlgoBlack.svg" style={{display: "flex", margin: "auto", width: 40, padding: 10}} />
                  
                  <Typography align="center" color="primary" variant="h6" style={{display: "grid"}}> +  {Math.ceil(props.quoteTotal)} {props.assetSendInfo.params["unit-name"]} </Typography>
                  
                </Button>
                </div>
                :
                null}
            
            {/* <Grid container spacing={3} align="center" style={{padding: 20, borderRadius: 15}}>
            
          <Grid item xs={12} sm={12} md={12} >

          <Typography color="secondary" variant="h6" align="center"> Account Credits:  </Typography>
            <br />
            {credits.length > 0 ? 
            credits.map((credit, index) => {
              return (
                <Typography key={index} color="secondary" variant="h6" align="center"> Asset <Link onClick={() => window.open("https://algoexplorer.io/asset/" + credit.assetId)} style={{color: "#FFFFFF"}}>{credit.assetId}</Link> | Amount {credit.assetAmount} </Typography>
                )
            })
            :
            null
            }
            </Grid>
            <Grid item xs={12} sm={12} md={12} >
            <TextField                
              onChange={handleChange}
              value={loadAsset}
              multiline
              type="number"
              label="Load Asset ID"
              name="loadAsset"
              autoComplete="false"
              InputProps={{ style: { color: "white", borderBottom: "1px solid white", marginRight: 20 } }}
              InputLabelProps={{ style: { color: "white" } }}
            
              style={{
              color: "black",
              background: "black",
              borderRadius: 15,
              margin: "auto",
              width: "30%"
            
              }}
            />
            <TextField                
              onChange={handleChange}
              value={loadAmount}
              multiline
              type="number"
              label="Load Amount"
              name="loadAmount"
              autoComplete="false"
              InputProps={{ style: { color: "white", borderBottom: "1px solid white", marginRight: 20 } }}
              InputLabelProps={{ style: { color: "white"} }}
            
              style={{
              color: "black",
              background: "black",
              borderRadius: 15,
              margin: "auto",
              width: "30%"
            
              }}
            />
            

            </Grid>
            <Grid item xs={12} sm={12} md={12} >
            {loadAmount && loadAsset ? 
                <Button variant="contained" color="secondary" style={{display: "flex", margin: "auto"}} onClick={() => load()}>
                  <Typography align="center" color="primary" variant="h6" > Load Assets </Typography>
                </Button>
                :
                null
              }
              </Grid>
          </Grid> */}
            </div>
          )
        
        
          
        
      }
      else {
        return (

          
                
          <Grid container spacing={3} align="center" style={{padding: 20, borderRadius: 15}}>
            {props.sendAmount && props.sendAsset && props.freq && props.quote.length && props.assetSendInfo && props.quoteTotal > 0 ? 
            <div>
            
            <br />
            <Button variant="contained" color="secondary" style={{display: "flex", margin: "auto"}} onClick={() => sendQuote()}>
              <Typography align="center" color="primary" variant="h6" > Send quote </Typography>
              <Typography style={{margin: 10}} variant="h6"> {props.notify ? Number(props.quote.length * 0.05).toFixed(2) : Number(props.quote.length * 0.02).toFixed(2)}</Typography>
              <img src="/AlgoBlack.svg" style={{display: "flex", margin: "auto", width: 40, padding: 10}} />
              <Typography align="center" color="secondary" variant="h6" > Credits cost: {Math.ceil(props.quoteTotal)} {props.assetSendInfo.params["unit-name"]} </Typography>
              
            </Button>
            </div>
          :
          null
          }
          {/* <Grid item xs={12} sm={12} md={12} >

          <Typography color="secondary" variant="h6" align="center"> Account Credits:  </Typography>
            <br />
            {credits.length > 0 ? 
            credits.map((credit, index) => {
              return (
                <Typography key={index} color="secondary" variant="h6" align="center"> Asset <Link onClick={() => window.open("https://algoexplorer.io/asset/" + credit.assetId)} style={{color: "#FFFFFF"}}>{credit.unit}</Link> | Amount {credit.assetAmount} </Typography>
                )
            })
            :
            null
            }
            </Grid>
            <Grid item xs={12} sm={12} md={12} >

            
            <TextField                
              onChange={handleChange}
              value={loadAsset}
              multiline
              type="number"
              label="Load Asset ID"
              name="loadAsset"
              autoComplete="false"
              InputProps={{ style: { color: "white", borderBottom: "1px solid white", marginRight: 20 } }}
              InputLabelProps={{ style: { color: "white" } }}
            
              style={{
              color: "black",
              background: "black",
              borderRadius: 15,
              margin: "auto",
              width: "30%"
            
              }}
            />
            <TextField                
              onChange={handleChange}
              value={loadAmount}
              multiline
              type="number"
              label="Load Amount"
              name="loadAmount"
              autoComplete="false"
              InputProps={{ style: { color: "white", borderBottom: "1px solid white", marginRight: 20 } }}
              InputLabelProps={{ style: { color: "white"} }}
            
              style={{
              color: "black",
              background: "black",
              borderRadius: 15,
              margin: "auto",
              width: "30%"
            
              }}
            />

            </Grid>
            <Grid item xs={12} sm={12} md={12} >
            {loadAmount && loadAsset ? 
                <Button variant="contained" color="secondary" style={{display: "flex", margin: "auto"}} onClick={() => load()}>
                  <Typography align="center" color="primary" variant="h6" > Load Assets </Typography>
                </Button>
                :
                null
              }
              </Grid> */}
          </Grid>
          
         
      )
      }
       
            
    
    
}

