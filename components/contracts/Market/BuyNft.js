import React, {useState, useEffect} from "react"

import algosdk from "algosdk"

import { useWallet } from '@txnlab/use-wallet'

import { Card, Typography, Button } from "@mui/material"

export default function BuyNft(props) {

  const { activeAccount, signTransactions, sendTransactions } = useWallet()

  const [nft, setNft] = useState(null)
  const [nftUrl, setNftUrl] = useState(null)

  React.useEffect(() => {

    const fetchData = async () => {

      try {

      let response = await fetch('/api/getNft', {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            nftId: props.nftId
          }),
        
            
        });
    
    let session = await response.json()

    setNft(session.nft.assets[0].params)
    if (props.cat == "chars") {
      setNftUrl("https://ipfs.io/ipfs/" + session.nft.assets[0].params.url.slice(34))
    }
    else {
      setNftUrl("https://ipfs.dark-coin.io/ipfs/" + session.nft.assets[0].params.url.slice(7))
    }
  }
  catch(error) {
      //props.sendDiscordMessage(error, "Fetch Buy", activeAccount.address)
    
    
   }
    

    }
      fetchData();
    

    }, [activeAccount])


  
      const BuyNft = async () => {

        try {
          
        const token = {
            'X-API-Key': process.env.indexerKey
        }

        const client = new algosdk.Algodv2(token, 'https://mainnet-algorand.api.purestake.io/ps2', '')
       
      
        const indexerClient = new algosdk.Indexer(token, 'https://mainnet-algorand.api.purestake.io/idx2', '');

          let params = await client.getTransactionParams().do();
  
          let optedin = false
  
          let opted = await indexerClient.lookupAssetBalances(props.nftId).do();
          opted.balances.forEach((account) => {
            if(account.address == activeAccount.address) {
              optedin = true
            }
          })
  
          if (optedin) {
  
            let txn
  
            if (props.cat == "DAO"){
              txn = algosdk.makeAssetTransferTxnWithSuggestedParams(
                activeAccount.address, 
                "AL6F3TFPSZPF3BSVUFDNOLMEKUCJJAA7GZ5GF3DN3Q4IVJVNUFK76PQFNE", 
                undefined, 
                undefined,
                100000000000,  
                undefined, 
                1088771340, 
                params
              );
            }
  
            else if (props.cat == "Warrior1"){
              txn = algosdk.makeAssetTransferTxnWithSuggestedParams(
                activeAccount.address, 
                "AL6F3TFPSZPF3BSVUFDNOLMEKUCJJAA7GZ5GF3DN3Q4IVJVNUFK76PQFNE", 
                undefined, 
                undefined,
                250000000000,  
                undefined, 
                1088771340, 
                params
              );
            }
  
            else if (props.cat == "Warrior2"){
              txn = algosdk.makeAssetTransferTxnWithSuggestedParams(
                activeAccount.address, 
                "AL6F3TFPSZPF3BSVUFDNOLMEKUCJJAA7GZ5GF3DN3Q4IVJVNUFK76PQFNE", 
                undefined, 
                undefined,
                1250000000000,  
                undefined, 
                1088771340, 
                params
              );
            }
            else if (props.cat == "chars"){
              txn = algosdk.makeAssetTransferTxnWithSuggestedParams(
                activeAccount.address, 
                nft.reserve, 
                undefined, 
                undefined,
                Number(props.price) * 1000000,  
                undefined, 
                1088771340, 
                params
              );
            }
  
            let appArgs = []


            if (props.cat == "chars") {
              appArgs.push(
                new Uint8Array(Buffer.from("buy")),
                new Uint8Array(Buffer.from(String(props.nftId))),
                new Uint8Array(Buffer.from(String(props.price))),
                new Uint8Array(Buffer.from(String(nft.reserve))),

            )
            }
            else {
              appArgs.push(
                new Uint8Array(Buffer.from(props.cat))
              )
            }
            
    
            let accounts = []
            let boxes = []
            let sellBox = new Uint8Array(Buffer.from(String(props.nftId) + ">" + String(props.price)))

            if (props.cat == "chars") {
              accounts.push(nft.reserve)
              boxes.push({appIndex: 0, name: sellBox})
            }

            let foreignApps = []
                
            let foreignAssets = [Number(props.nftId)]
    
 
            let atxn = algosdk.makeApplicationNoOpTxn(activeAccount.address, params, props.contract, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
            
            let txns = [txn, atxn]
  
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

            props.setMessage("Transaction confirmed, asset " + props.nftId + " successfully purchased.")



          }
  
          else {
  
            let txn = algosdk.makeAssetTransferTxnWithSuggestedParams(
              activeAccount.address, 
              activeAccount.address, 
              undefined, 
              undefined,
              0,  
              undefined, 
              Number(props.nftId), 
              params
            );
  
            let encoded = algosdk.encodeUnsignedTransaction(txn)

            props.setMessage("Sign Transaction...")

        
            const signedTransactions = await signTransactions([encoded])
    
            props.setMessage("Sending Transaction...")

            const { id } = await sendTransactions(signedTransactions)

            let confirmedTxn = await algosdk.waitForConfirmation(client, id, 4);

            props.setMessage("Transaction confirmed, asset " + props.nftId + " opted in.")
  
          }
        }
        catch(error) {
          await props.sendDiscordMessage(error, "Buy NFT", activeAccount.address)
         }
      
      }
       
        if (props.zoom && nft && nftUrl) {
            return (
                
              <Card style={{backgroundColor: "black"}}>
                  <Button style={{display: "flex", margin: "auto"}} onClick={() => props.setNft(null)}>
                    <img style={{width: "100%", maxWidth: 500}} src={nftUrl} />
                  </Button>
                  <br />
                  <Typography color="secondary" align="center" variant="h4"> {nft.name} </Typography>
                  <br />
                  {activeAccount ?
                  <Button 
                  style={{display: "flex", margin: "auto", borderRadius: 15, backgroundColor: "white"}}
                  onClick={() => BuyNft()}>
                      <Typography variant="h6"> Buy </Typography>
                      {props.price ?
                        <Typography align="center" variant="h6"> 
                        <img style={{width: 50, padding: 10}} src="/invDC.svg"/>
                        {(props.price).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                        
                        </Typography>
                        :
                        null
                        }
                  </Button>
                  :
                  <Button onClick={() => window.scrollTo(0, 0)}>
                      <Typography  variant="h6"> Connect Wallet </Typography>
                  </Button>
                  }
                 
                 <br />
                 <br />

              </Card>
                
               
            )
                
                
        }

        else if (nft) {
            return (
       
                    <Button onClick={() => props.setNft(props.nftFull)} >
                        <Typography color="secondary" style={{position: "absolute", bottom: 10, left: 10}} align="left" variant="caption"> {nft.name} </Typography>
                        <img style={{width: "100%"}} src={nftUrl} />
                        {props.price ?
                        <Typography color="secondary" style={{position: "absolute", bottom: 10, right: 10}} align="left" variant="caption"> {props.price} </Typography>
                        :
                        null
                        }
                    </Button>
                
    
            )
            
        }

        else {
            return (
                <div>                   
                </div>
    
            )
        }

        
       
        
    
    
}