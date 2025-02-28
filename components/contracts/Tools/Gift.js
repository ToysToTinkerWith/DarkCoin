import React, { useState } from "react"

//43EVULWFT4RU2H7EZH377SAVQJSJO5NZP37N3Y5DZ7PGUXOETKW7VWDIOA

import { useWallet } from '@txnlab/use-wallet'


import algosdk from "algosdk"

import { Typography, Button, TextField, Grid } from "@mui/material"

export default function Gift(props) { 

    const { activeAccount, signTransactions, sendTransactions } = useWallet()
    
    const [asset, setAsset] = useState("")
    const [amount, setAmount] = useState("")
    const [receiver, setReceiver] = useState("")

    React.useEffect(() => {
      const fetchData = async () => {
      

      }

      try {
        fetchData();
      }
      catch(error) {
      }


    }, [activeAccount])


    const handleChange = (event) => {

      console.log(event)

      if (event) {

        const target = event.target;
        let value = target.type === 'checkbox' ? target.checked : target.value;
        const name = target.name;

        if (name == "asset") {
          setAsset(Number(value))
        }
        if (name == "amount") {
          setAmount(Number(value))
        }
        if (name == "receiver") {
          setReceiver(value)
        }

      }
      

     
      
    }


      const gift = async () => {
       

        try{

          const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)

          let params = await client.getTransactionParams().do()

          const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)
          console.log(asset)

          let addrOptedAssets = []

          let responseAddr
          let nextTokenAddr

          responseAddr = await indexerClient.lookupAccountAssets("5U3SSPACPICLNX4KDZGG6CED7C6R6VVXEIJN7YXBYHDNAUXDINONRIT65Q").do();
          nextTokenAddr = responseAddr["next-token"]
          
          responseAddr.assets.forEach((asset) => {
            if (asset.amount >= 0) {
              addrOptedAssets.push(asset["asset-id"])
            }
          })

          while (responseAddr.assets.length == 1000) {
            responseAddr = await indexerClient.lookupAccountAssets("5U3SSPACPICLNX4KDZGG6CED7C6R6VVXEIJN7YXBYHDNAUXDINONRIT65Q").nextToken(nextTokenAddr).limit(1000).do();
            nextTokenAddr = responseAddr["next-token"]
            responseAddr.assets.forEach((asset) => {
                if (asset.amount >= 0) {
                  addrOptedAssets.push(asset["asset-id"])
                }
            })  
          }

          console.log(addrOptedAssets)

          let opted = addrOptedAssets.includes(asset)

          console.log(opted)

          let txns = []

          if (!opted) {

            let ftxn = algosdk.makePaymentTxnWithSuggestedParams(
              activeAccount.address, 
              "5U3SSPACPICLNX4KDZGG6CED7C6R6VVXEIJN7YXBYHDNAUXDINONRIT65Q", 
              100000, 
              undefined,
              undefined,
              params
            );

            txns.push(ftxn)

            let appArgs = []
            appArgs.push(
              new Uint8Array(Buffer.from("optin"))
            )

            let accounts = []
            let foreignApps = []
              
            let foreignAssets = [asset]
          
            
            let otxn = algosdk.makeApplicationNoOpTxn(activeAccount.address, params, 2638261330, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined);

            txns.push(otxn)

          }

            const assetInfo = await indexerClient.lookupAssetByID(asset).do();
  
            let decimals = assetInfo.asset.params.decimals
            let div = 10**decimals
        
          
        let atxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
            activeAccount.address, 
            "5U3SSPACPICLNX4KDZGG6CED7C6R6VVXEIJN7YXBYHDNAUXDINONRIT65Q", 
            undefined, 
            undefined,
            amount * div,  
            undefined, 
            asset, 
            params
          );

          txns.push(atxn)
            
          let appArgs = []
          appArgs.push(
            new Uint8Array(Buffer.from("addboxNFT"))
          )
      
          let accounts = [receiver]
          let foreignApps = []
          
          let foreignAssets = [asset]
      
          let encoded = algosdk.encodeUint64(asset)
          
          const pk = algosdk.decodeAddress(receiver)
          const addrArray = pk.publicKey
        
          let accountBox = new Uint8Array([...addrArray, ...encoded])

          console.log(accountBox)
        
          const boxes = [{appIndex: 0, name: accountBox}]
        
          let txn = algosdk.makeApplicationNoOpTxn(activeAccount.address, params, 2638261330, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);

          txns.push(txn)
        
          let txId = txn.txID().toString();
          // Sign the transaction
              
          let txgroup = algosdk.assignGroupID(txns)
      
          let encodedTxns= []
            
          txns.forEach((txn) => {
            let encoded = algosdk.encodeUnsignedTransaction(txn)
            encodedTxns.push(encoded)
    
          })
    
          const signedTransactions = await signTransactions(encodedTxns)

          props.setMessage("Sending Transaction...")
          
          const { id } = await sendTransactions(signedTransactions)

          let confirmedTxn = await algosdk.waitForConfirmation(client, id, 4);

          console.log(confirmedTxn)

          props.setMessage("Transaction confirmed, asset has been mailed.")
        
        
        
     
          }catch(err){
            console.log(err)
            props.setMessage(err)
            props.sendDiscordMessage("Rewards/Gift", activeAccount.address, err)
          }
         
  
  
          
        
      

    }

    const updateDiscord = async () => {

      

      let embeds = []

      embeds.push({
          "title": "A new proposal has been made!",
          "color": 0
      })
      

      embeds.push({
          "description": this.state.proposal,
          "color": 16777215
      })


      const response = await fetch(process.env.discordCouncilWebhook, {
          method: "POST",
          body: JSON.stringify({
              username: "Council Propose",
              embeds: embeds
          }),
          headers: {
            "Content-Type": "application/json",
          },
        });



      
  }
      

        return (
            <div style={{border: "1px solid white", margin: 20, borderRadius: 15}}>
              <br />
              <Typography color="secondary" variant="h6" align="center"> Mail an asset </Typography>
              <br />

              <Grid container>
                <Grid item xs={12} sm={6} md={6}>
                <Typography color="secondary" variant="h6" align="center"> ASA ID </Typography>
                <TextField                
                    onChange={handleChange}
                    value={asset}
                    multiline
                    type="number"
                    label=""
                    name="asset"
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
                  <br />
                </Grid>
               <Grid item xs={12} sm={6} md={6}>
               <Typography color="secondary" variant="h6" align="center"> Amount </Typography>

               <TextField                
                    onChange={handleChange}
                    value={amount}
                    multiline
                    type="number"
                    label=""
                    name="amount"
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
                  <br />
                </Grid>
                <Grid item xs={12} sm={12} md={12}>
                <Typography color="secondary" variant="h6" align="center"> Receiver </Typography>

                <TextField                
                    onChange={handleChange}
                    value={receiver}
                    multiline
                    type="text"
                    label=""
                    name="receiver"
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
              </Grid>
                 
                
                <br />
              



                    
          

                

                {asset && amount && receiver ? 
                
                <Button variant="contained" color="secondary" style={{display: "flex", margin: "auto"}} onClick={() => gift()}>
                <Typography variant="h6"> Send Gift </Typography>
              


                </Button>

                
                    
                  
                  :
                 null
                }
    
                <br />


                
            </div>
        )
    
}