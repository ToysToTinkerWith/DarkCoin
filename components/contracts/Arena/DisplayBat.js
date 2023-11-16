import React, { useEffect, useState } from "react"

import algosdk from "algosdk"

import { Typography, Button } from "@mui/material"

import { useWallet } from '@txnlab/use-wallet'

export default function DisplayBat(props) {

    const { activeAccount, signTransactions, sendTransactions } = useWallet()

    const [ nft, setNft ] = useState(null)
    const [ nftUrl, setNftUrl ] = useState(null)
    const [ charStats, setCharStats ] = useState(null)

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
    
            

        setNft(session.nft.assets[0].params)
        setNftUrl("https://gateway.pinata.cloud/ipfs/" + session.nft.assets[0].params.url.slice(34))
        setCharStats(session.charStats)

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

        const token = {
            'X-API-Key': process.env.indexerKey
        }
      
        const indexerClient = new algosdk.Indexer(token, 'https://mainnet-algorand.api.purestake.io/idx2', '');

        let response = await indexerClient.lookupAccountAppLocalStates(activeAccount.address).do();
        response["apps-local-states"].forEach((localstate) => {
            if (localstate.id == props.contract) {
                localstate["key-value"].forEach((kv) => {
                    if (atob(kv.key) == "name") {
                        charName = atob(kv.value.bytes)
                    }
                })
                localstate["key-value"].forEach(async (kv) => {
                    
            if (atob(kv.key) == "assetId") {

                let assetConfig = await indexerClient.lookupAssetTransactions(kv.value.uint)
                .txType("acfg")
                .do();

                charStats = atob(assetConfig.transactions[0].note)
                

                if (charName && charStats) {

                    const token = {
                        'X-API-Key': process.env.indexerKey
                    }
            
                    const client = new algosdk.Algodv2(token, 'https://mainnet-algorand.api.purestake.io/ps2', '')

                    let params = await client.getTransactionParams().do();


                    let ftxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
                        activeAccount.address,
                        "5W64M4ZT4ERRI4AW77HMSO63YHYZVJTRGM6WC7RQIM3YJOLOPYPTXHMU6I", 
                        undefined,
                        undefined,
                        1000000000, 
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
          
                    props.setMessage("Sign transation...")
              
                    const signedTransactions = await signTransactions(encodedTxns)
          
                    props.setMessage("Sending transation...")
          
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
                        charStatsOther: charStats,
                        wager: props.wager

                    }),
                    
                    
                });
        
                let sess1 = await res1.json()
        
                let story1 = sess1.response.text

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
                            charStatsOther: charStats,
                            wager: props.wager

                        }),
                        
                        
                    });

                    sess1 = await res1.json()

                    story1 = sess1.response.text


                }


                setStory1(String(kv.value.uint) + ">" + charName + ">" + props.nftId + ">" + nft.name + ">" + props.wager + ">" + story1)



                let res2 = await fetch('/api/arena/generateStory', {
                    method: "POST",
                    headers: {
                    "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        charName: nft.name,
                        charStats: charStats,
                        charNameOther: charName,
                        charStatsOther: charStats,
                        wager: props.wager

                    }),
                    
                    
                });
        
                let sess2 = await res2.json()
        
                let story2 = sess2.response.text


                while (story2.length > 800) {

                    res2 = await fetch('/api/arena/generateStory', {
                        method: "POST",
                        headers: {
                        "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            charName: nft.name,
                            charStats: charStats,
                            charNameOther: charName,
                            charStatsOther: charStats,
                            wager: props.wager

                        }),
                        
                        
                    });

                    sess2 = await res2.json()

                    story2 = sess1.response.text



                }


                setStory2(props.nftId + ">" + nft.name + ">" + String(kv.value.uint) + ">" + charName + ">" + props.wager + ">" + story2)


           
                props.setMessage("Stories generated, ready to fight")
                        
                        
                        
            
                    
            
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

        const token = {
            'X-API-Key': process.env.indexerKey
        }
      
        const indexerClient = new algosdk.Indexer(token, 'https://mainnet-algorand.api.purestake.io/idx2', '');

        const client = new algosdk.Algodv2(token, 'https://mainnet-algorand.api.purestake.io/ps2', '')

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

            props.setMessage("Sign transation...")
        
            const signedTransactions = await signTransactions(encodedTxns)

            props.setMessage("Sending transation...")

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

        let nameWinner = sessionWinner.assets[0].params.name
        let urlWinner = "https://gateway.pinata.cloud/ipfs/" + sessionWinner.assets[0].params.url.slice(34)

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

        let nameLoser = sessionLoser.assets[0].params.name
        let urlLoser = "https://gateway.pinata.cloud/ipfs/" + sessionLoser.assets[0].params.url.slice(34)

        let randomNumber = Math.floor(Math.random() * 2);

        let embeds = []

        embeds.push({
            "title": wager.toLocaleString("en-US") + " DC on the line ! FIGHT !",
            "color": 0
        })
        
        if (randomNumber == 1) {
            
            embeds.push({
                "title" : nameWinner,
                "url": "https://algoexplorer.io/asset/" + winner,
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
                "url": "https://algoexplorer.io/asset/" + loser,
                "image": {
                    "url": String(urlLoser)
                },
                "color": 1376511
            })
                
               

        }

        else {

            embeds.push({
                "title" : nameLoser,
                "url": "https://algoexplorer.io/asset/" + loser,
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
                "url": "https://algoexplorer.io/asset/" + winner,
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
                <Button variant="contained" color="secondary" style={{display: "flex", margin: "auto"}} onClick={() => joinBattle()}>
                    <Typography color="primary" variant="h6" align="center"> Fight {Number(props.wager / 1000000).toLocaleString("en-US")} </Typography>
                    <img src="/invDC.svg" style={{display: "flex", margin: "auto", width: 50, padding: 10}} />
                </Button>
                :
                <Button variant="contained" color="secondary" style={{display: "flex", margin: "auto"}} onClick={() => genStory()}>
                    <Typography  variant="h6"> Generate 1,000 </Typography>
                    <img src="/invDC.svg" style={{display: "flex", margin: "auto", width: 50, padding: 10}} />
                </Button>
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