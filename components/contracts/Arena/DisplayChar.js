import React, { useEffect, useState } from "react"

import algosdk from "algosdk"

import { Typography, Button, TextField } from "@mui/material"

import { useWallet } from '@txnlab/use-wallet'

export default function DisplayChar(props) {

    const { activeAccount, signTransactions, sendTransactions } = useWallet()

    const [ nft, setNft ] = useState(null)
    const [ nftUrl, setNftUrl ] = useState(null)
    const [ charStats, setCharStats ] = useState(null)


    const [ svg, setSvg ] = useState(null)
    const [ price, setPrice ] = useState(0)
    

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
        setNftUrl("https://gateway.pinata.cloud/ipfs/" + session.nft.assets[0].params.url.slice(34))
        setCharStats(session.charStats)
    
            }
            catch(error) {
                    //props.sendDiscordMessage(error, "Fetch Char", activeAccount.address)
                
               
               }

        }

        if (activeAccount) {
            fetchData();
        }
        
    
    

        

    }, [activeAccount])


      const chooseCharacter = async () => {

        try {

        const token = {
            'X-API-Key': process.env.indexerKey
        }
      
        const indexerClient = new algosdk.Indexer(token, 'https://mainnet-algorand.api.purestake.io/idx2', '');

        let optedin = false

        let response = await indexerClient.lookupAccountAppLocalStates(activeAccount.address).do();
        response["apps-local-states"].forEach((localstate) => {
            if (localstate.id == props.contracts.arena) {
                optedin = true
            }
        })


        const client = new algosdk.Algodv2(token, 'https://mainnet-algorand.api.purestake.io/ps2', '')  
              
        let params = await client.getTransactionParams().do()

        const appArgs = []
        

        const accounts = []
        const foreignApps = []
            
        const foreignAssets = [props.nftId]

        const boxes = []

        props.setMessage("Sign Transaction...")

        if (optedin) {

            appArgs.push(
                new Uint8Array(Buffer.from("select")),
                new Uint8Array(Buffer.from(nft.name))
            )

            let txn = algosdk.makeApplicationNoOpTxn(activeAccount.address, params, props.contracts.arena, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);

            let encoded = algosdk.encodeUnsignedTransaction(txn)
        
            const signedTransactions = await signTransactions([encoded])
    
            props.setMessage("Sending Transaction...")

            const { id } = await sendTransactions(signedTransactions)

            let confirmedTxn = await algosdk.waitForConfirmation(client, id, 4);

            props.setMessage("Transaction Confirmed, Character Successfully Chosen")

        }

        else {

            appArgs.push(
                new Uint8Array(Buffer.from(nft.name))
            )

            let txn = algosdk.makeApplicationOptInTxn(activeAccount.address, params, props.contracts.arena, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);

            let encoded = algosdk.encodeUnsignedTransaction(txn)
        
            const signedTransactions = await signTransactions([encoded])
    
            props.setMessage("Sending Transaction...")

            const { id } = await sendTransactions(signedTransactions)

            let confirmedTxn = await algosdk.waitForConfirmation(client, id, 4);

            props.setMessage("Transaction Confirmed, Application Opted In")
        }
    }
    catch(error) {
        await props.sendDiscordMessage(error, "Select Char", activeAccount.address)
       }
        



      }

      const handleChange = (event) => {
        const target = event.target;
        let value = target.type === 'checkbox' ? target.checked : target.value;
        const name = target.name;

        if (name == "price") {
            setPrice(value)
        }

        

        
    
        
      }

      const sendToMarket = async () => {

        try {

        const token = {
            'X-API-Key': process.env.indexerKey
        }

        const client = new algosdk.Algodv2(token, 'https://mainnet-algorand.api.purestake.io/ps2', '')

        let params = await client.getTransactionParams().do()

        let ftxn = algosdk.makePaymentTxnWithSuggestedParams(
            activeAccount.address, 
            "VI66S7AN2G4HKUD7DXJUSVEP54MDJ42NGDOUUD3LQJSCU7WT5UU2KAIHAU", 
            300000, 
            undefined,
            undefined,
            params
          );

          let encoded = algosdk.encodeUnsignedTransaction(ftxn)

          console.log(encoded)
        
        const signedTransactions = await signTransactions([encoded])

        props.setMessage("Sending Transaction...")

        const { id } = await sendTransactions(signedTransactions)

        let confirmedTxn = await algosdk.waitForConfirmation(client, id, 4);

          let appArgs = []
        

          let accounts = []
          let foreignApps = []
              
          let foreignAssets = [props.nftId]
    
          let boxes = []
  
          appArgs.push(
              new Uint8Array(Buffer.from("optin"))
          )
  
          let otxn = algosdk.makeApplicationNoOpTxn("YRVK422KP65SU4TBAHY34R7YT3OYFOL4DUSFR4UADQEQHS2HMXKORIC6TE", params, 1035432580, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);

          let userMnemonic = process.env.DCwallet
        let userAccout =  algosdk.mnemonicToSecretKey(userMnemonic)
        // Sign the transaction
        let signedTxn = otxn.signTxn(userAccout.sk);

        props.setMessage("Opting contract into asset...")

        // Submit the transaction
        let { txId } = await client.sendRawTransaction(signedTxn).do()


        confirmedTxn = await algosdk.waitForConfirmation(client, txId, 4);

        let stxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
            "YRVK422KP65SU4TBAHY34R7YT3OYFOL4DUSFR4UADQEQHS2HMXKORIC6TE", 
            "VI66S7AN2G4HKUD7DXJUSVEP54MDJ42NGDOUUD3LQJSCU7WT5UU2KAIHAU", 
            undefined,
            undefined,
            1, 
            undefined,
            props.nftId,
            params
          );

        appArgs = []
        

        accounts = []
        foreignApps = []
            
        foreignAssets = [props.nftId]

        let sellBox = new Uint8Array(Buffer.from(String(props.nftId) + ">" + String(price)))

        boxes = [{appIndex: 0, name: sellBox}]

        appArgs.push(
            new Uint8Array(Buffer.from("sell")),
            new Uint8Array(Buffer.from(String(props.nftId) + ">" + String(price))),
            new Uint8Array(Buffer.from(activeAccount.address)),
        )

        let atxn = algosdk.makeApplicationNoOpTxn("YRVK422KP65SU4TBAHY34R7YT3OYFOL4DUSFR4UADQEQHS2HMXKORIC6TE", params, 1035432580, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
        
        let txns = [stxn, atxn]

        let txGroup = algosdk.assignGroupID(txns);
        
        let signedTxn1 = stxn.signTxn(userAccout.sk);
        let signedTxn2 = atxn.signTxn(userAccout.sk);

        let signed = [signedTxn1, signedTxn2]

        props.setMessage("Sending asset to contract..")

    
        // Submit the transaction
        txId = await client.sendRawTransaction(signed).do()

        confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);

        props.setMessage("Asset listed in marketplace.")
        }
        catch(error) {
            await props.sendDiscordMessage(error, "Send Char To Market", activeAccount.address)
           }

      }

      const claimNft = async () => {

        try {

        const token = {
            'X-API-Key': process.env.indexerKey
        }

        const client = new algosdk.Algodv2(token, 'https://mainnet-algorand.api.purestake.io/ps2', '')

        let params = await client.getTransactionParams().do()

        let otxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
            activeAccount.address, 
            activeAccount.address, 
            undefined,
            undefined,
            0, 
            undefined,
            props.nftId,
            params
          );

          let encoded = algosdk.encodeUnsignedTransaction(otxn)
        
        const signedTransactions = await signTransactions([encoded])

        props.setMessage("Sending Transaction...")

        const { id } = await sendTransactions(signedTransactions)

        let confirmedTxn = await algosdk.waitForConfirmation(client, id, 4);
          
        

        let ttxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
            "YRVK422KP65SU4TBAHY34R7YT3OYFOL4DUSFR4UADQEQHS2HMXKORIC6TE", 
            activeAccount.address, 
            undefined,
            undefined,
            1, 
            undefined,
            props.nftId,
            params
          );

          const userMnemonic = process.env.DCwallet
          const userAccout =  algosdk.mnemonicToSecretKey(userMnemonic)
          // Sign the transaction
          let signedTxn = ttxn.signTxn(userAccout.sk);
  
          // Submit the transaction
          const { txId } = await client.sendRawTransaction(signedTxn).do()

          props.setMessage("Transfering Asset...")

  
          confirmedTxn = await algosdk.waitForConfirmation(client, txId, 4);

          props.setMessage("Asset Transfered.")
        }
        catch(error) {
            await props.sendDiscordMessage(error, "Claim Char NFT", activeAccount.address)
           }

      }

      


        if (nft) {
            if (props.select) {
                return (
                    <div >
                        <Typography color="secondary" align="center" style={{margin: 20}} variant="h6"> {nft.name} </Typography>

                        <Button style={{display: "flex", margin: "auto"}} onClick={() => props.setNft(null)}>
                        <img src={nftUrl} style={{display: "flex", margin: "auto", width: "70%", maxWidth: 500, borderRadius: 5}} />


                        </Button>


                        <Typography color="secondary" align="center" style={{margin: 20}} variant="subtitle1"> {charStats} </Typography>
                        <br />
                     


                        <Button variant="contained" color="secondary"  style={{display: "flex", margin: "auto"}} onClick={() => chooseCharacter()} >
                            
                        <Typography color="primary" align="center" variant="h6"> Select </Typography>
                    </Button>
                    <br />
                   


                    </div>
        
                )

            }
            else if (props.create) {
                return (
                    <div >
                        <Typography color="secondary" align="center" style={{margin: 20}} variant="h6"> {nft.name} </Typography>

                        <Button style={{display: "flex", margin: "auto"}} onClick={() => props.setNft(null)}>
                        <img src={nftUrl} style={{display: "flex", margin: "auto", width: "70%", maxWidth: 500, borderRadius: 5}} />


                        </Button>


                        <Typography color="secondary" align="center" style={{margin: 20, marginBottom: 0}} variant="subtitle1"> {charStats} </Typography>
                      

                        <br />


                        <Button variant="contained" color="secondary"  style={{display: "flex", margin: "auto"}} onClick={() => claimNft()} >
                            
                        <Typography color="primary" align="center" variant="h6"> Claim </Typography>

                        
                    </Button>
                    <br />

                    <Typography color="secondary" align="center" variant="h6"> Or </Typography>

                    <br />

                    <TextField                
                    onChange={handleChange}
                    value={price}
                    type="number"
                    label=""
                    name="price"
                    autoComplete="false"
                    InputProps={{ style: { color: "black" } }}
                   
                    style={{
                    color: "black",
                    background: "white",
                    borderRadius: 15,
                    display: "flex",
                    margin: "auto",
                    width: "50%"
                   
                    }}
                  />

                    <Button variant="contained" color="secondary"  style={{display: "flex", margin: "auto"}} onClick={() => sendToMarket()} >
                            
                    <Typography color="primary" variant="h6" align="center"> Sell for {Number(price).toLocaleString("en-US")} </Typography>
                        <img src="/invDC.svg" style={{display: "flex", margin: "auto", width: 50, padding: 10}} />
                        <Typography  variant="h6"> Fee = 0.3 </Typography>
                        <img src="/AlgoBlack.svg" style={{display: "flex", margin: "auto", width: 40, padding: 10}} />
                        
                    </Button>
                 
                

                <br />
                   


                    </div>
                )
            }
            else if (props.leaderboard) {
                return (
                <img style={{width: 200, borderRadius: 5}} src={nftUrl} />
                )

            }
            else if (props.buy) {
                return (
                    <div >
                        <Typography color="secondary" align="center" style={{margin: 20}} variant="h6"> {this.state.nft.name} </Typography>

                        <Button style={{display: "flex", margin: "auto"}} onClick={() => this.props.setNft(null)}>
                        <img src={this.state.nftUrl} style={{display: "flex", margin: "auto", width: "70%", maxWidth: 500, borderRadius: 5}} />


                        </Button>


                        <Typography color="secondary" align="center" style={{margin: 20}} variant="subtitle1"> {this.state.charStats} </Typography>
                        <br />
                        <Typography color="secondary" align="center" variant="h6"> {this.state.message} </Typography>

                        <br />


                        <Button variant="contained" color="secondary"  style={{display: "flex", margin: "auto", padding: 10}} onClick={() => this.buyNft()} >
                            
                        <Typography color="primary" align="center" variant="h6"> 
                        Buy 
                        <img style={{width: 50, paddingLeft: 10, paddingRight: 10}} src="./invDC.svg"/>
                        {(this.props.price).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
 
                        </Typography>
                    </Button>
                    <br />
                   


                    </div>
                )
            }
            
            else {
                return (
                    <Button style={{display: "block"}} onClick={() => props.setNft(props.nftId, props.price)} >
                        <Typography color="secondary" style={{position: "absolute", bottom: props.price ? 55 : 15, left: 15}} align="left" variant="caption"> {nft.name} </Typography>
                        <img style={{width: "100%", borderRadius: 5}} src={nftUrl} />
                        {props.price ? 
                        <Typography color="secondary" align="center" variant="h6"> 
                        <img style={{width: 50, paddingRight: 20}} src="./invDC.svg"/>
                        {(props.price).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
 
                        </Typography>
                        :
                        null
                        }
                       

                    </Button>
        
                )
            }
            
        }

        else {
            return (
                <div>                   
                </div>
    
            )
        }
       
        
    
    
}