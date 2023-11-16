import React, {useState, useEffect} from "react"

import algosdk from "algosdk"

import { useWallet } from '@txnlab/use-wallet'

import { Card, Typography, Button, Grid, TextField, Link, CircularProgress } from "@mui/material"

export default function Load(props) {

  const { activeAccount, signTransactions, sendTransactions } = useWallet()

  const [credits, setCredits] = useState([])
  const [loadAmount, setLoadAmount] = useState("")
  const [loadAsset, setLoadAsset] = useState("")
  const [numSend, setNumSend] = useState(0)

  React.useEffect(() => {

    const fetchData = async () => {

        if (activeAccount) {
            let response = await fetch('/api/rewards/getCredits', {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    activeAddress: activeAccount.address,
                    contract: props.contract
                  }),
                
                    
                });
            
            let session = await response.json()
        
        
            setCredits(session)
        }


    }
    try {
    fetchData();
    }
    catch(error) {
      props.sendDiscordMessage(error, "Fetch Load", activeAccount.address)
     }

        

    }, [activeAccount])


  
      const load = async () => {

        try {
          
        const token = {
            'X-API-Key': process.env.indexerKey
          }
      
          const client = new algosdk.Algodv2(token, 'https://mainnet-algorand.api.purestake.io/ps2', '')
      
          let params = await client.getTransactionParams().do()
      
          const indexerClient = new algosdk.Indexer(token, 'https://mainnet-algorand.api.purestake.io/idx2', '');
      
      
          let accountAppLocalStates = await indexerClient.lookupAccountAppLocalStates(activeAccount.address).do();
            
          let contractAccount = await algosdk.getApplicationAddress(props.contract)
      
          const accountAssets = await indexerClient.lookupAccountAssets(contractAccount).do();
      
          let contractOpt = false
      
          accountAssets.assets.forEach(async (asset) => {
            if (asset["asset-id"] == loadAsset) {
              contractOpt = true
            }
            
          })
      
          const houseAssets = await indexerClient.lookupAccountAssets("YRVK422KP65SU4TBAHY34R7YT3OYFOL4DUSFR4UADQEQHS2HMXKORIC6TE").do();
      
          let houseOpt = false
      
          houseAssets.assets.forEach(async (asset) => {
            if (asset["asset-id"] == loadAsset) {
              houseOpt = true
            }
            
          })
      
      
          let opted = false
      
          let txns = []
      
      
          accountAppLocalStates["apps-local-states"].forEach((app) => {
            if (app.id == props.contract) {
              opted = true
            }
          })
      
          let otxn = algosdk.makeApplicationOptInTxn(activeAccount.address, params, props.contract)
      
          if (!opted) {
            txns.push(otxn)
          }
      
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
        
            txns.push(ftxn)
            
            let aotxn = algosdk.makeApplicationNoOpTxn(activeAccount.address, params, props.contract, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined);
        
            txns.push(aotxn)
          }
      
      
          const assetInfo = await indexerClient.lookupAssetByID(loadAsset).do();
      
          let decimals = assetInfo.asset.params.decimals
          let div = 10**decimals
      
          
      
          let stxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
            activeAccount.address, 
            contractAccount, 
            undefined, 
            undefined,
            Number(loadAmount) * div,  
            undefined, 
            Number(loadAsset), 
            params
          );
      
            txns.push(stxn)
      
          appArgs = []
          
          appArgs.push(
            new Uint8Array(Buffer.from("load"))
            
            
          )
        
          accounts = []
          foreignApps = []
            
          foreignAssets = [Number(loadAsset)]
        
          
          let atxn = algosdk.makeApplicationNoOpTxn(activeAccount.address, params, props.contract, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined);
      
          txns.push(atxn)
      
          let txgroup = algosdk.assignGroupID(txns)
      
          let encodedTxns= []
  
            txns.forEach((txn) => {
              let encoded = algosdk.encodeUnsignedTransaction(txn)
              encodedTxns.push(encoded)
      
            })

            props.setMessage("Sign Transaction...")

      
            const signedTransactions = await signTransactions(encodedTxns)

            props.setMessage("Sending Transaction...")
            
            const { id } = await sendTransactions(signedTransactions)

            let confirmedTxn = await algosdk.waitForConfirmation(client, id, 4);

    
          if (!houseOpt) {
            let htxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
              "YRVK422KP65SU4TBAHY34R7YT3OYFOL4DUSFR4UADQEQHS2HMXKORIC6TE", 
              "YRVK422KP65SU4TBAHY34R7YT3OYFOL4DUSFR4UADQEQHS2HMXKORIC6TE", 
              undefined, 
              undefined,
              0,  
              undefined,
              Number(loadAsset), 
              params
            );
    
            const DCMnemonic = process.env.DCwallet
            const DCAccount =  algosdk.mnemonicToSecretKey(DCMnemonic)
        
            const signedOptTxn = htxn.signTxn(DCAccount.sk);
                
            let { txId } = await client.sendRawTransaction(signedOptTxn).do()
    
            let confirmedTxn = await algosdk.waitForConfirmation(client, txId, 4);
      
          }

          props.setMessage("Transaction Confirmed, " + loadAmount + " of Asset " + loadAsset + " has been added for your account.")
    
          
    
          setCredits([])
    
          let response = await fetch('/api/rewards/getCredits', {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                activeAddress: activeAccount.address,
                contract: props.contract
              }),
            
                
            });
        
        let session = await response.json()
        
        setCredits(session)
        }
        catch(error) {
          await props.sendDiscordMessage(error, "Load Credits", activeAccount.address)
         }
      
      
      }

      const sendQuote = async () => {

        try {

        const token = {
          'X-API-Key': process.env.indexerKey
        }
    
        const client = new algosdk.Algodv2(token, 'https://mainnet-algorand.api.purestake.io/ps2', '')
    
        let params = await client.getTransactionParams().do()
    
        
        let ftxns = []

        props.setMessage("Sign Fee Transaction...")
    
        let ftxn = algosdk.makePaymentTxnWithSuggestedParams(
          activeAccount.address, 
          "AL6F3TFPSZPF3BSVUFDNOLMEKUCJJAA7GZ5GF3DN3Q4IVJVNUFK76PQFNE", 
          props.notify ? Number(props.quote.length * 100000) : Number(props.quote.length * 50000), 
          undefined,
          undefined,
          params
        );
    
        ftxns.push(ftxn)
    
        if (props.notify) {
          let fatxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
            activeAccount.address, 
            "YRVK422KP65SU4TBAHY34R7YT3OYFOL4DUSFR4UADQEQHS2HMXKORIC6TE", 
            undefined, 
            undefined,
            Math.ceil(Number(props.maxAmount)) * (10**props.assetSendInfo.params.decimals),  
            undefined,
            Number(props.sendAsset), 
            params
          );
    
          ftxns.push(fatxn)
    
          let txgroup = algosdk.assignGroupID(ftxns)
    
    
        }
    
    
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

        props.setMessage("Fee Transaction confirmed, sending airdrop....")
        
        let quote = props.quote
    
    
        let appArgs = []
    
        if (props.notify) {
          appArgs.push(
            new Uint8Array(Buffer.from("sendNoti")),
            new Uint8Array(Buffer.from(props.note)),
          )
        }
        else {
          appArgs.push(
            new Uint8Array(Buffer.from("send")),
            new Uint8Array(Buffer.from(props.note)),
          )
        }
        
    
        let accounts = [activeAccount.address]
    
        let foreignAssets = [Number(props.sendAsset), Number(props.basedAsset)]
    
        let foreignApps = []
    
        let stxn
    
        let txns = []
        let signedTxns = []
    
        const DCMnemonic = process.env.DCwallet
        const DCAccount =  algosdk.mnemonicToSecretKey(DCMnemonic)
    
        let tally = 0
    
        if (props.notify) {
    
        let stxn1
    
          while (quote.length > 0) {
    
            appArgs.push(algosdk.encodeUint64(quote[0].sendAmount))
            accounts.push(quote[0].address)
            
            tally++
        
         
            stxn = algosdk.makeApplicationNoOpTxn("YRVK422KP65SU4TBAHY34R7YT3OYFOL4DUSFR4UADQEQHS2HMXKORIC6TE", params, props.contract, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined);
            stxn1 = algosdk.makeAssetTransferTxnWithSuggestedParams(
              "YRVK422KP65SU4TBAHY34R7YT3OYFOL4DUSFR4UADQEQHS2HMXKORIC6TE", 
              quote[0].address, 
              undefined, 
              undefined,
              quote[0].sendAmount,  
              new Uint8Array(Buffer.from(props.note)),
              Number(props.sendAsset), 
              params
            );
            txns.push(stxn)
            txns.push(stxn1)
            
            appArgs = []
            appArgs.push(
              new Uint8Array(Buffer.from("sendNoti")),
              new Uint8Array(Buffer.from(props.note)),
            )
            accounts = [activeAccount.address]
            if (txns.length > 15) {
              let txgroup = algosdk.assignGroupID(txns)
              let signedTxn
              txns.forEach((txn) => {
                signedTxn = txn.signTxn(DCAccount.sk);
                signedTxns.push(signedTxn)
              })
              const { txId } = await client.sendRawTransaction(signedTxns).do()
      
              let confirmedTxn = await algosdk.waitForConfirmation(client, txId, 4);
      
              props.setMessage("Accounts sent to: " + String(tally))

              setNumSend(Number(tally))
      
              txns = []
              signedTxns = []
            }
        
            
        
            quote.shift()
        
        
            }
        
            props.setMessage("Airdrop complete")
    
        }
    
        else {
          while (quote.length > 0) {
    
            appArgs.push(algosdk.encodeUint64(quote[0].sendAmount))
            accounts.push(quote[0].address)
            
            tally++
        
        
            if (tally % 3 == 0) {
              
              stxn = algosdk.makeApplicationNoOpTxn("YRVK422KP65SU4TBAHY34R7YT3OYFOL4DUSFR4UADQEQHS2HMXKORIC6TE", params, props.contract, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined);
              txns.unshift(stxn)
             
              appArgs = []
              appArgs.push(
                new Uint8Array(Buffer.from("send")),
                new Uint8Array(Buffer.from(props.note)),
              )
              accounts = [activeAccount.address]
              if (txns.length > 15) {
                let txgroup = algosdk.assignGroupID(txns)
                let signedTxn
                txns.forEach((txn) => {
                  signedTxn = txn.signTxn(DCAccount.sk);
                  signedTxns.push(signedTxn)
                })
                const { txId } = await client.sendRawTransaction(signedTxns).do()
        
                let confirmedTxn = await algosdk.waitForConfirmation(client, txId, 4);
        
                props.setMessage("Accounts sent to: " + String(tally))
                setNumSend(Number(tally))
        
                txns = []
                signedTxns = []
              }
        
            }
        
            quote.shift()
        
        
            }
        
            stxn = algosdk.makeApplicationNoOpTxn("YRVK422KP65SU4TBAHY34R7YT3OYFOL4DUSFR4UADQEQHS2HMXKORIC6TE", params, props.contract, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined);
            txns.unshift(stxn)
        
            let txgroup = algosdk.assignGroupID(txns)
            let signedTxn
            txns.forEach((txn) => {
              signedTxn = txn.signTxn(DCAccount.sk);
              signedTxns.push(signedTxn)
            })
            const { txId } = await client.sendRawTransaction(signedTxns).do()
        
            let confirmedTxn = await algosdk.waitForConfirmation(client, txId, 4);
        
            props.setMessage("Airdrop complete")
            
        }
    
        setNumSend(0)

    
        let response = await fetch('/api/rewards/getCredits', {
          method: "POST",
          headers: {
              "Content-Type": "application/json",
          },
          body: JSON.stringify({
              activeAddress: activeAccount.address,
              contract: props.contract
            }),
          
              
          });
      
      let session = await response.json()
    
      setCredits(session)
      }
      catch(error) {
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
                <Typography align="center" color="secondary" variant="h6" > Credits cost: {Math.ceil(props.quoteTotal)} {props.assetSendInfo.params["unit-name"]} </Typography>
                <br />
                <Button variant="contained" color="secondary" style={{display: "flex", margin: "auto"}} onClick={() => sendQuote()}>
                  <Typography align="center" color="primary" variant="h6" > Send quote </Typography>
                  <Typography style={{margin: 10}} variant="h6"> {props.notify ? Number(props.quote.length * 0.1).toFixed(2) : Number(props.quote.length * 0.05).toFixed(2)}</Typography>
                  <img src="/AlgoBlack.svg" style={{display: "flex", margin: "auto", width: 40, padding: 10}} />
                  {props.notify ?
                  <div style={{display: "flex", margin: "auto"}}>
                  <Typography style={{margin: 10}} variant="h6"> {Math.ceil(Number(props.maxAmount))}</Typography>
                  <Typography style={{margin: 10}} variant="h6"> {props.assetSendInfo.params["unit-name"]}</Typography>
      
                  </div>
                  :
                  null
                  }
                  
                </Button>
                </div>
                :
                null}
            
            <Grid container spacing={3} align="center" style={{padding: 20, borderRadius: 15}}>
            
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
          </Grid>
            </div>
          )
        
        
          
        
      }
      else {
        return (

          
                
          <Grid container spacing={3} align="center" style={{padding: 20, borderRadius: 15}}>
            {props.sendAmount && props.sendAsset && props.freq && props.quote.length && props.assetSendInfo && props.quoteTotal > 0 ? 
            <div>
            <Typography align="center" color="secondary" variant="h6" > Credits cost: {Math.ceil(props.quoteTotal)} {props.assetSendInfo.params["unit-name"]} </Typography>
            <br />
            <Button variant="contained" color="secondary" style={{display: "flex", margin: "auto"}} onClick={() => sendQuote()}>
              <Typography align="center" color="primary" variant="h6" > Send quote </Typography>
              <Typography style={{margin: 10}} variant="h6"> {props.notify ? Number(props.quote.length * 0.1).toFixed(2) : Number(props.quote.length * 0.05).toFixed(2)}</Typography>
              <img src="/AlgoBlack.svg" style={{display: "flex", margin: "auto", width: 40, padding: 10}} />
              {props.notify ?
              <div style={{display: "flex", margin: "auto"}}>
              <Typography style={{margin: 10}} variant="h6"> {Math.ceil(Number(props.maxAmount))}</Typography>
              <Typography style={{margin: 10}} variant="h6"> {props.assetSendInfo.params["unit-name"]}</Typography>
  
              </div>
              :
              null
              }
              
            </Button>
            </div>
          :
          null
          }
          <Grid item xs={12} sm={12} md={12} >

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
              </Grid>
          </Grid>
          
         
      )
      }
       
            
                

        
       
        
    
    
}