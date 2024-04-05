import React, { useEffect, useState } from "react"

import algosdk from "algosdk"

import { Typography, Button, Grid } from "@mui/material"

import { useWallet } from '@txnlab/use-wallet'

import { CID } from 'multiformats/cid'


import * as mfsha2 from 'multiformats/hashes/sha2'
import * as digest from 'multiformats/hashes/digest'

export default function DisplayBat(props) {

    console.log(props)

    const { activeAccount, signTransactions, sendTransactions } = useWallet()

    const [ nft, setNft ] = useState(null)
    const [ nftUrl, setNftUrl ] = useState(null)
    const [ nftCharStats, setNftCharStats ] = useState(null)

    const [ story1, setStory1 ] = useState(null)
    const [ story2, setStory2 ] = useState(null)


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

        if (session.nft.assets[0].params.creator == "L6VIKAHGH4D7XNH3CYCWKWWOHYPS3WYQM6HMIPNBVSYZWPNQ6OTS5VERQY") {
            const addr = algosdk.decodeAddress(session.nft.assets[0].params.reserve)

            const mhdigest = digest.create(mfsha2.sha256.code, addr.publicKey)

            const ocid = CID.create(0, 0x70, mhdigest)

            let char = JSON.parse(session.charStats)
            
            let properties = JSON.stringify(char.properties)
            console.log(properties)

            setNft(session.nft.assets[0].params)
            setNftUrl("https://ipfs.dark-coin.io/ipfs/" + ocid.toString())
            setNftCharStats(properties)
        }
        else {

        setNft(session.nft.assets[0].params)
        setNftUrl("https://ipfs.dark-coin.io/ipfs/" + session.nft.assets[0].params.url.slice(34))
        setNftCharStats(session.charStats)
        }

            }
            catch(error) {
                props.sendDiscordMessage(error, "Fetch Battle", activeAccount.address)
               }
    
        

        }

          
        fetchData();
    
    

        

    }, [])

      const genStory = async () => {

        try {

        let charName
        let charStats

        const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)

        props.setMessage("Sign transaction...")


        let response = await indexerClient.lookupAccountAppLocalStates(activeAccount.address).do();
        response["apps-local-states"].forEach((localstate) => {
            if (localstate.id == props.contract) {
                localstate["key-value"].forEach((kv) => {
                    if (atob(kv.key) == "name") {
                        charName = atob(kv.value.bytes)
                        console.log(charName)
                    }
                })
                localstate["key-value"].forEach(async (kv) => {
                    
            if (atob(kv.key) == "assetId") {

                let assetConfig = await indexerClient.lookupAssetTransactions(kv.value.uint)
                .txType("acfg")
                .do();

                let properties = JSON.parse(atob(assetConfig.transactions[assetConfig.transactions.length - 1].note))

                console.log(properties.properties)

                charStats = JSON.stringify(properties.properties)
                

                if (charName && charStats) {

                    const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)

                    let params = await client.getTransactionParams().do();


                    let ftxn = algosdk.makePaymentTxnWithSuggestedParams(
                        activeAccount.address,
                        "VWNGMYLU4LGHU2Z2BYHP54IUNU3GJROHG2LOOPFH5JAES3K7W4TBODC6TU", 
                        500000, 
                        undefined,
                        undefined,
                        params
                      );

                   

                    
                    let txns = [ftxn]

                    let encodedTxns= []

                    txns.forEach((txn) => {
                      let encoded = algosdk.encodeUnsignedTransaction(txn)
                      encodedTxns.push(encoded)
              
                    })
          
              
                    const signedTransactions = await signTransactions(encodedTxns)
          
                    props.setMessage("Sending transaction...")
          
                    const { id } = await sendTransactions(signedTransactions)
          
                    let confirmedTxn = await algosdk.waitForConfirmation(client, id, 4);
          
                    props.setMessage("Generating Stories...")

                let res1 = await fetch('/api/arena/generateStory', {
                    method: "POST",
                    headers: {
                    "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        charName: charName,
                        charStats: charStats,
                        charNameOther: nft.name,
                        charStatsOther: nftCharStats,
                        wager: props.wager

                    }),
                    
                    
                });
        
                let sess1 = await res1.json()
        
                let story1 = sess1.response

                while (story1.length > 800) {

                    res1 = await fetch('/api/arena/generateStory', {
                        method: "POST",
                        headers: {
                        "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            charName: charName,
                            charStats: charStats,
                            charNameOther: nft.name,
                            charStatsOther: nftCharStats,
                            wager: props.wager

                        }),
                        
                        
                    });

                    sess1 = await res1.json()

                    story1 = sess1.response


                }


                setStory1(String(kv.value.uint) + ">" + charName + ">" + props.nftId + ">" + nft.name + ">" + props.wager + ">" + story1)

                props.setProgress(50)



                let res2 = await fetch('/api/arena/generateStory', {
                    method: "POST",
                    headers: {
                    "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        charName: nft.name,
                        charStats: nftCharStats,
                        charNameOther: charName,
                        charStatsOther: charStats,
                        wager: props.wager

                    }),
                    
                    
                });
        
                let sess2 = await res2.json()
        
                let story2 = sess2.response


                while (story2.length > 800) {

                    res2 = await fetch('/api/arena/generateStory', {
                        method: "POST",
                        headers: {
                        "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            charName: nft.name,
                            charStats: nftCharStats,
                            charNameOther: charName,
                            charStatsOther: charStats,
                            wager: props.wager

                        }),
                        
                        
                    });

                    sess2 = await res2.json()

                    story2 = sess2.response



                }


                setStory2(props.nftId + ">" + nft.name + ">" + String(kv.value.uint) + ">" + charName + ">" + props.wager + ">" + story2)
           
                props.setMessage("Stories generated, ready to fight")
                props.setProgress(100)
                        
                        
                        
            
                    
            
                }
            }
            })
        }
        })
        }
        catch(error) {
            await props.sendDiscordMessage(error, "Gen Story", activeAccount.address)
           }

      }

      const joinBattle = async () => {

        try {

        const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)

        const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)

        let params = await client.getTransactionParams().do();

        let wtxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
            activeAccount.address, 
            "VWNGMYLU4LGHU2Z2BYHP54IUNU3GJROHG2LOOPFH5JAES3K7W4TBODC6TU", 
            undefined,
            undefined,
            Number(props.wager), 
            undefined,
            1088771340,
            params
          );

          let global = await indexerClient.lookupApplications(props.contract).do();

          let globalState = global.application.params["global-state"]

          let battleNum

          globalState.forEach((keyVal) => {
            if (atob(keyVal.key) == "battleNum") {
                battleNum = keyVal.value.uint
            }
          })

         
          const appArgs = []
          appArgs.push(
            new Uint8Array(Buffer.from("fight")),
            new Uint8Array(Buffer.from(props.address)),
            new Uint8Array(Buffer.from("Battle" + String(battleNum))),
            new Uint8Array(Buffer.from(story1)),
            new Uint8Array(Buffer.from(story2)),

            
          )

          const accounts = [props.address]
          const foreignApps = []
            
          const foreignAssets = [1088771340]

          let battleBox = new Uint8Array(Buffer.from("Battle" + String(battleNum)))

          const boxes = [{appIndex: 0, name: battleBox}, {appIndex: 0, name: battleBox}]
          
          let atxn = algosdk.makeApplicationNoOpTxn(activeAccount.address, params, props.contract, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
          
          let txns = [wtxn, atxn]

          let txgroup = algosdk.assignGroupID(txns)

          let encodedTxns= []

            txns.forEach((txn) => {
                let encoded = algosdk.encodeUnsignedTransaction(txn)
                encodedTxns.push(encoded)
        
            })

            props.setProgress(0)
            props.setMessage("Sign transaction...")
        
            const signedTransactions = await signTransactions(encodedTxns)

            props.setMessage("Sending transaction...")

            const { id } = await sendTransactions(signedTransactions)

            let confirmedTxn = await algosdk.waitForConfirmation(client, id, 4);

            let Battle = await client.getApplicationBoxByName(props.contract, "Battle" + String(battleNum)).do();

            let string = new TextDecoder().decode(Battle.value)

            let array = string.split(">")

            let winner = Number(array[0])
            let loser = Number(array[2])
            let wager = Number(array[4] / 1000000)
            let story = array[5]

        await sendBattle(winner, loser, wager, story, id)

            props.setMessage("Battle complete")

        }
        catch(error) {
            await props.sendDiscordMessage(error, "Join Battle", activeAccount.address)
           }

      }

    const sendBattle = async (winner, loser, wager, story, txId) => {

        try {

        let responseWinner = await fetch('/api/getNft', {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                nftId: winner
              }),
            
                
            });
        
        let sessionWinner = await responseWinner.json()

        let nameWinner = sessionWinner.nft.assets[0].params.name
        let urlWinner

        if (nameWinner.substring(0, 18) == "Dark Coin Champion") {
            let addr = algosdk.decodeAddress(sessionWinner.nft.assets[0].params.reserve)

            let mhdigest = digest.create(mfsha2.sha256.code, addr.publicKey)

            let ocid = CID.create(0, 0x70, mhdigest)

            urlWinner = "https://gateway.pinata.cloud/ipfs/" + ocid.toString()


        }
        else {
            urlWinner = "https://gateway.pinata.cloud/ipfs/" + sessionWinner.nft.assets[0].params.url.slice(34)
        }

        


        let responseLoser = await fetch('/api/getNft', {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                nftId: loser
              }),
            
                
            });

        
        let sessionLoser = await responseLoser.json()

        let nameLoser = sessionLoser.nft.assets[0].params.name
        let urlLoser

        if (nameLoser.substring(0, 18) == "Dark Coin Champion") {
            let addr = algosdk.decodeAddress(sessionLoser.nft.assets[0].params.reserve)

            let mhdigest = digest.create(mfsha2.sha256.code, addr.publicKey)

            let ocid = CID.create(0, 0x70, mhdigest)

            urlLoser = "https://gateway.pinata.cloud/ipfs/" + ocid.toString()
        }
        else {
            urlLoser = "https://gateway.pinata.cloud/ipfs/" + sessionLoser.nft.assets[0].params.url.slice(34)
        }
        

        let randomNumber = Math.floor(Math.random() * 2);

        let embeds = []

        embeds.push({
            "title": wager.toLocaleString("en-US") + " DC on the line ! FIGHT !",
            "color": 0
        })
        
        if (randomNumber == 1) {
            
            embeds.push({
                "title" : nameWinner,
                "url": "https://explorer.perawallet.app/asset/" + winner,
                "image": {
                    "url": String(urlWinner)
                },
                "color": 16711680
            })

            embeds.push({
                "title" : "VS",
                "color" : 16777215
            })

            embeds.push({
                "title" : nameLoser,
                "url": "https://explorer.perawallet.app/asset/" + loser,
                "image": {
                    "url": String(urlLoser)
                },
                "color": 1376511
            })
                
               

        }

        else {

            embeds.push({
                "title" : nameLoser,
                "url": "https://explorer.perawallet.app/asset/" + loser,
                "image": {
                    "url": String(urlLoser)
                },
                "color": 1376511
            })

            embeds.push({
                "title" : "VS",
                "color" : 16777215
            })

        
            embeds.push({
                "title" : nameWinner,
                "url": "https://explorer.perawallet.app/asset/" + winner,
                "image": {
                    "url": String(urlWinner)
                },
                "color": 16711680
            })

        }

        embeds.push({
            "description": String(story).replace(/["']/g, "'"),
            "color": 16777215
        })

        embeds.push({
            "title": nameWinner + " has won " + wager.toLocaleString("en-US") + " DC !",
            "url": "https://algoexplorer.io/tx/" + txId,
            "color": 0
        })


        const response = await fetch(process.env.discordWebhook, {
            method: "POST",
            body: JSON.stringify({
                username: "Arena Fight",
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

    if (nft) {

        return (
            <div style={{border: "1px solid white"}}>
                <br />
                <Typography color="secondary" align="center" variant="subtitle1"> {nft.name} </Typography>
                <img style={{width: "50%", maxWidth: 200, borderRadius: 5, display: "flex", margin: "auto"}} src={nftUrl} />
                <br />
                <Typography color="secondary" align="center" variant="subtitle1"> Wager </Typography>
                <Typography color="secondary" align="center" variant="h6"> {Number(props.wager / 1000000).toLocaleString("en-US")} <img style={{width: 40, paddingRight: 20}} src="/invDC.svg"/> </Typography>
                <br />
                {story1 && story2 ? 
                <div>
                <Button variant="contained" color="secondary" style={{display: "flex", margin: "auto"}} onClick={() => joinBattle()}>
                    <Typography color="primary" variant="h6" align="center"> Fight {Number(props.wager / 1000000).toLocaleString("en-US")} </Typography>
                    <img src="/invDC.svg" style={{display: "flex", margin: "auto", width: 50, padding: 10}} />
                </Button>
                <Grid container>
                    <Grid item xs={12} sm={6} md={6} style={{padding: 20}}>
                        <Typography color="secondary" align="center" variant="subtitle1"> On win: </Typography>
                        <Typography color="secondary" align="center" variant="subtitle1"> {story1.substring(story1.lastIndexOf(">") + 1)} </Typography>
                    </Grid>
                
                    <Grid item xs={12} sm={6} md={6} style={{padding: 20}}>
                        <Typography color="secondary" align="center" variant="subtitle1"> On loss: </Typography>
                        <Typography color="secondary" align="center" variant="subtitle1"> {story2.substring(story2.lastIndexOf(">") + 1)} </Typography>
                    </Grid>
                </Grid>
                </div>
                :
                props.address != activeAccount.address ?
                <div>
                <Typography color="secondary" align="center" variant="subtitle1"> *First transaction is to generate battle stories </Typography>
                <br />
                <Button variant="contained" color="secondary" style={{display: "flex", margin: "auto"}} onClick={() => genStory()}>
                    <Typography variant="h6"> Generate 0.5 </Typography>
                    <img src="/AlgoBlack.svg" style={{display: "flex", margin: "auto", width: 40, padding: 10}} />
                </Button>

                </div>
                :
                null
                }
            <br />
    
    
            </div>
    
        )
    }
    else {
        return(
            <div>

            </div>
        )
    }
        
    
      
        
    
    
}