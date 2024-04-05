import React, { useEffect, useState } from "react"


//43EVULWFT4RU2H7EZH377SAVQJSJO5NZP37N3Y5DZ7PGUXOETKW7VWDIOA

import algosdk from "algosdk"

import { Typography, Button, TextField } from "@mui/material"

import DisplayChar from "../../components/contracts/Arena/DisplayChar";
import DisplayBat from "../../components/contracts/Arena/DisplayBat";

import { useWallet } from '@txnlab/use-wallet'

import { CID } from 'multiformats/cid'


import * as mfsha2 from 'multiformats/hashes/sha2'
import * as digest from 'multiformats/hashes/digest'


export default function Fight(props) { 

  const { activeAccount, signTransactions, sendTransactions } = useWallet()

  const [ battles, setBattles ] = useState([])
  const [ wager, setWager ] = useState(10000)
  const [ charSel, setCharSel ] = useState(null)

    React.useEffect(() => {

      const fetchData = async () => {
  
        if (activeAccount) {

          try {

            props.setMessage("Finding battles...")
  
        const response = await fetch('/api/arena/getBattles', {
          method: "POST",
          body: JSON.stringify({
            activeAccount: activeAccount.address,
            contract: props.contracts.arena
          }),
          headers: {
            "Content-Type": "application/json",
          }
            
        });
      
        const session = await response.json()
  
        setCharSel(session.charSel)

        session.battles.forEach(async (battle) => {

          let response2 = await fetch('/api/arena/getBattleNfts', {
            method: "POST",
            body: JSON.stringify({
              addr: battle.addr,
              wager: battle.wager,
              contract: props.contracts.arena
            }),
            headers: {
              "Content-Type": "application/json",
            }
              
          });
        
          let session2 = await response2.json()  
  
          setBattles(battles => [...battles, session2])

          

        })

        props.setMessage()

        

      }
      catch(error) {
        props.sendDiscordMessage(error, "Fight Fetch", activeAccount.address)
      }
  
        } 
  
      }
      
      fetchData();
      
      
  
          
  
      }, [activeAccount])


      const handleChange = (event) => {
        const target = event.target;
        let value = target.type === 'checkbox' ? target.checked : target.value;
        const name = target.name;

        if (name == "wager") {
          setWager(value)
        }

        
    
        
      }

      const startBattle = async () => {

        try {

 

      const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)
      
        let params = await client.getTransactionParams().do();

          let wtxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
            activeAccount.address, 
            "VWNGMYLU4LGHU2Z2BYHP54IUNU3GJROHG2LOOPFH5JAES3K7W4TBODC6TU", 
            undefined,
            undefined,
            Number(wager) * 1000000, 
            undefined,
            1088771340,
            params
          );

          let ftxn = algosdk.makePaymentTxnWithSuggestedParams(
            activeAccount.address,
            "VWNGMYLU4LGHU2Z2BYHP54IUNU3GJROHG2LOOPFH5JAES3K7W4TBODC6TU", 
            500000, 
            undefined,
            undefined,
            params
          );

         
          const appArgs = []
          appArgs.push(
            new Uint8Array(Buffer.from("start")),
            new Uint8Array(Buffer.from(activeAccount.address))

          )

          const accounts = [activeAccount.address]
          const foreignApps = []
            
          const foreignAssets = []

          const boxes = []
          
          let atxn = algosdk.makeApplicationNoOpTxn(activeAccount.address, params, props.contracts.arena, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
          
          let txns = [wtxn, ftxn, atxn]

          let txgroup = algosdk.assignGroupID(txns)

          let encodedTxns= []

          txns.forEach((txn) => {
            let encoded = algosdk.encodeUnsignedTransaction(txn)
            encodedTxns.push(encoded)
    
          })

          props.setMessage("Sign transaction...")
    
          const signedTransactions = await signTransactions(encodedTxns)

          props.setMessage("Sending transaction...")

          const { id } = await sendTransactions(signedTransactions)

          let confirmedTxn = await algosdk.waitForConfirmation(client, id, 4);

          props.setMessage("Battle initialized")

          await sendBattle()
        }
        catch(error) {
          await props.sendDiscordMessage(error, "Start Battle", activeAccount.address)
         }

          

      }

      const sendBattle = async () => {

        try {

        let responseNft = await fetch('/api/getNft', {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                nftId: charSel
              }),
            
                
            });
        
        let session = await responseNft.json()

        let name = session.nft.assets[0].params.name
        let url

        if (name.substring(0, 18) == "Dark Coin Champion") {
            let addr = algosdk.decodeAddress(session.nft.assets[0].params.reserve)

            let mhdigest = digest.create(mfsha2.sha256.code, addr.publicKey)

            let ocid = CID.create(0, 0x70, mhdigest)

            url = "https://gateway.pinata.cloud/ipfs/" + ocid.toString()


        }
        else {
            url = "https://gateway.pinata.cloud/ipfs/" + sessionWinner.nft.assets[0].params.url.slice(34)
        }


        let embeds = []

        embeds.push({
            "title": wager.toLocaleString("en-US") + " DC to whoever can take down " + name,
            "color": 0
        })
        
            
        embeds.push({
            "title" : name,
            "url": "https://explorer.perawallet.app/asset/" + charSel,
            "image": {
                "url": String(url)
            },
            "color": 16711680
        })

        
                
        const response = await fetch(process.env.discordWebhook, {
            method: "POST",
            body: JSON.stringify({
                username: "Battle Init",
                embeds: embeds
            }),
            headers: {
              "Content-Type": "application/json",
            },
          });

        }
        catch(error) {
            await props.sendDiscordMessage(error, "Send Battle", activeAccount.address)
           }
        
    }



        return (
            <div>

                {charSel ?
                    <>
                        <Typography color="secondary" align="center" variant="h6"> My Char </Typography>
                        <div style={{display: "flex", margin: "auto", width: "50%", maxWidth: 300}}>
                            <DisplayChar nftId={charSel} sendDiscordMessage={props.sendDiscordMessage} />
                        </div>
                        <br />

                        <Typography color="secondary" align="center" variant="h6"> Start Battle </Typography>

                        <br />
                 
                        {/* <TextField                
                            onChange={handleChange}
                            value={wager}
                            multiline
                            type="number"
                            label=""
                            name="wager"
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
                          /> */}
                    <br />
                    {wager >= 10000 ?
                    <Button variant="contained" color="secondary" style={{display: "flex", margin: "auto"}} onClick={() => startBattle()}>
                        <Typography color="primary" variant="h6" align="center"> Wager {Number(wager).toLocaleString("en-US")} </Typography>
                        <img src="/invDC.svg" style={{display: "flex", margin: "auto", width: 50, padding: 10}} />
                        <Typography  variant="h6"> + 0.5 </Typography>
                        <img src="/AlgoBlack.svg" style={{display: "flex", margin: "auto", width: 40, padding: 10}} />
                    </Button>
                    :
                    null
                    }
                    <br />
                    </>
                    :
                    <Typography color="secondary" align="center" variant="h6"> Must select a character to battle </Typography>

                }
                <br />
                <Typography color="secondary" align="center" variant="h6"> Join Battle </Typography>
                <br />
                {battles.length > 0 ? 
                battles.map((battle, index) => {
                  console.log(battle)
                  console.log(activeAccount.address)
                    return (
                      <div key={index}>
                        <DisplayBat address={battle.addr} wager={battle.wager} nftId={battle.nftId} contract={props.contracts.arena} setMessage={props.setMessage} setProgress={props.setProgress} sendDiscordMessage={props.sendDiscordMessage} />
                      </div>
                    )
                })
                :
                null
                }



            </div>
        )
    
    
}