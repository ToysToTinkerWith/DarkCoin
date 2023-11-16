import React, { useState, useEffect } from "react"

import DisplayChar from "../../components/contracts/Arena/DisplayChar";

import algosdk from "algosdk"

import { Grid, Typography, Button, TextField, Modal, Card, FormControl, InputLabel, Select, MenuItem } from "@mui/material"

import { useWallet } from '@txnlab/use-wallet'

export default function Create(props) { 

  const { activeAccount, signTransactions, sendTransactions } = useWallet()


  const [ descript, setDescript ] = useState("")
  const [ name, setName ] = useState("")

  const [ des, setDes ] = useState(null)
  const [ img, setImg ] = useState(null)

  const [ minted, setMinted ] = useState([])
  const [ char, setChar ] = useState(null)


  React.useEffect(() => {

    const fetchData = async () => {

      if (activeAccount) {

        try {

        

      const response = await fetch('/api/arena/getCreatedChars', {
        method: "POST",
        body: JSON.stringify({
          activeAccount: activeAccount.address,
        }),
        headers: {
          "Content-Type": "application/json",
        }
          
      });
    
      const session = await response.json()

      setMinted(session)

        }
        catch(error) {
          props.sendDiscordMessage(error, "Fetch Create", activeAccount.address)
        }

      } 

    }
    fetchData();
    
    

        

    }, [activeAccount])


     const handleChange = (event) => {

      
        const target = event.target;
        let value = target.type === 'checkbox' ? target.checked : target.value;
        const name = target.name;

        if (name == "descript") {
          setDescript(value)
        }
        if (name == "name") {
          setName(value)
        }

       
        
      }

      const generate = async () => {

        try {

        const token = {
            'X-API-Key': process.env.indexerKey
        }

      
        const indexerClient = new algosdk.Indexer(token, 'https://mainnet-algorand.api.purestake.io/idx2', '');
        
        const accountAssets = await indexerClient.lookupAccountAssets(activeAccount.address).assetId(1088771340).do();

        let accountDC = accountAssets.assets[0].amount

        if (accountDC >= 10000) {


        const client = new algosdk.Algodv2(token, 'https://mainnet-algorand.api.purestake.io/ps2', '')

        let params = await client.getTransactionParams().do();

        let ftxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
          activeAccount.address, 
          "VWYCYQ3H3PPNIGON4H363DIH7BP33TTZWUUUNMTDXCIHRCDPFOMU7VJ5HM", 
          undefined,
          undefined,
          10000000000, 
          undefined,
          1088771340,
          params
        );

        let txns = [ftxn]


        let encodedTxns= []
  
        txns.forEach((txn) => {
          let encoded = algosdk.encodeUnsignedTransaction(txn)
          encodedTxns.push(encoded)
  
        })

        props.setMessage("Sign Transaction...")

  
        const signedTransactions = await signTransactions(encodedTxns)

        props.setMessage("Generating Image...")

        let response = await fetch('/api/arena/generateImage', {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            description: descript
          }),
          
            
        });

        const session = await response.json()

        let generatedImage = session.image

        if (generatedImage) {

          props.setMessage("Sending Transaction...")
          
          const { id } = await sendTransactions(signedTransactions)

          let confirmedTxn = await algosdk.waitForConfirmation(client, id, 4);

          props.setMessage("Generating Move Set...")
          setImg(generatedImage)

          let res = await fetch('/api/arena/generateChar', {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
                descript: descript,
                name: name
            }),
            
              
          });
  
          const sess = await res.json()
  
          let generatedDes = sess.response.text

          setDes(generatedDes)
          props.setMessage("Minting Asset...")

          await pin(generatedImage, generatedDes)

          props.setMessage("Character Creation Success.")

        }

        else {
          props.setMessage("Image not created, possible content policy violation.")
        }
              
        }

        else {
          props.setMessage("Transaction Denied, 10,000 Dark Coin required.")
        }
      }
      catch(error) {
        await props.sendDiscordMessage(error, "Create Generate", activeAccount.address)
       }

      }

      const pin = async (generatedImage, generatedDes) => {

        try {

        props.setMessage("Pinning...")

        let response = await fetch('/api/arena/pinUrl', {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
              url: generatedImage,
              des: generatedDes,
              name: name
          }),
          
            
        });

        const session = await response.json()

        let ipfs = session.result.IpfsHash

        if (ipfs) {

          const token = {
            'X-API-Key': process.env.indexerKey
        }
  
        const client = new algosdk.Algodv2(token, 'https://mainnet-algorand.api.purestake.io/ps2', '')
        
          let params = await client.getTransactionParams().do();
  
          const creator = "YRVK422KP65SU4TBAHY34R7YT3OYFOL4DUSFR4UADQEQHS2HMXKORIC6TE";
          const defaultFrozen = false;    
          const unitName = "DCCHAR"; 
          const assetName = name;
          const url = "https://gateway.pinata.cloud/ipfs/" + ipfs;
          const managerAddr = "YRVK422KP65SU4TBAHY34R7YT3OYFOL4DUSFR4UADQEQHS2HMXKORIC6TE";
          const reserveAddr = activeAccount.address;  
          const freezeAddr = undefined;
          const clawbackAddr = undefined;
          const total = 1;                // NFTs have totalIssuance of exactly 1
          const decimals = 0;             // NFTs have decimals of exactly 0
          const note = new Uint8Array(Buffer.from("Description: " + descript.substring(0, 500) + " Moves: " + generatedDes))
          const mtxn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
          from:creator,
          total,
          decimals,
          assetName,
          unitName,
          assetURL: url,
          assetMetadataHash: undefined,
          defaultFrozen,
          freeze: freezeAddr,
          manager: managerAddr,
          clawback: clawbackAddr,
          reserve: reserveAddr,
          note: note,
          suggestedParams: params});
  
          const userMnemonic = process.env.DCwallet
          const userAccout =  algosdk.mnemonicToSecretKey(userMnemonic)
          // Sign the transaction
          let signedTxn = mtxn.signTxn(userAccout.sk);
  
      
          // Submit the transaction
          const { txId } = await client.sendRawTransaction(signedTxn).do()
  
          let confirmedTxn = await algosdk.waitForConfirmation(client, txId, 4);
  
          setMinted([...minted, confirmedTxn["asset-index"]])
  
          await sendDiscordMessage(assetName, url)

        }
      }
      catch(error) {
        await props.sendDiscordMessage(error, "Pin", activeAccount.address)
       }

        

        

      }


      const sendDiscordMessage = async (name, url) => {
       
        const response = await fetch(process.env.discordWebhook, {
          method: "POST",
          body: JSON.stringify({ 
            username: "Arena Create",
            embeds: [{
              "title" : name + " has appeared!",
              "url": url,
              "image": {
                "url": String(url)
              }
            }]
          }),
          headers: {
            "Content-Type": "application/json",
          },
        });
      }
      
      if (char) {
        return(
          <DisplayChar create={true} style={{position: "absolute"}} nftId={char} setNft={(nftId) => setChar(nftId)} setMessage={(message) => props.setMessage(message)} sendDiscordMessage={props.sendDiscordMessage}/>
        )
      }

      else {
        return (
          <div>
            <Grid container align="center">
                  {minted.length > 0 ? 
                  
                  minted.map((asset, index) => {
                      return (
                          <Grid key={index} item xs={6} sm={4} md={3} lg={2} style={{position: "relative"}} >
                              <DisplayChar style={{position: "absolute"}} nftId={asset} setNft={(nftId) => setChar(nftId)} sendDiscordMessage={props.sendDiscordMessage} />
                          </Grid>
                      )
                  })
                  :
                  null
                  }
                  </Grid>
            <br />
            <Typography color="secondary" variant="h6" align="center"> Describe your character: </Typography>
            <br />
            <TextField                
                  onChange={handleChange}
                  value={descript}
                  multiline
                  type="text"
                  rows={3}
                  label=""
                  name="descript"
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
              <Typography color="secondary" variant="h6" align="center"> Name your character: </Typography>
            <br />
              <TextField                
                  onChange={handleChange}
                  value={name}
                  
                  type="text"
                  label=""
                  name="name"
                  autoComplete="false"
                  InputProps={{ style: { color: "black" } }}
                 
                  style={{
                  color: "black",
                  background: "white",
                  borderRadius: 15,
                  display: "flex",
                  margin: "auto",
                  width: "30%"
                 
                  }}
                />
              

                  <br />
                  
                  {activeAccount ? 
              
                    <Button variant="contained" color="secondary" style={{display: "flex", margin: "auto"}} onClick={() => generate()} >
                    <Typography  variant="h6"> Generate 10,000 </Typography>
                    <img src="/invDC.svg" style={{display: "flex", margin: "auto", width: 50, padding: 10}} />
                    </Button>
                    :
                    <Button onClick={() => window.scrollTo(0, 0)}>
                        <Typography  variant="h6"> Connect Wallet </Typography>
                    </Button>
                  }
                  <br />
                  
                  
             
              <br />
              {des && img ? 
                  <div style={{position: "relative"}}>
                    <img src={img} style={{display: "flex", margin: "auto", width: "70%", maxWidth: 500}} />
                    <br />
                    <Typography align="center" color="secondary" variant="h6" style={{padding: 10}}> {name} </Typography>
                    <br />
                    <Typography align="center" color="secondary" variant="subtitle1" style={{padding: 20}}> {des} </Typography>
                    <br />
                      

                  </div>
                  :
                  null
                 
                  }
              
          </div>
      )

      }

        
    
    
}