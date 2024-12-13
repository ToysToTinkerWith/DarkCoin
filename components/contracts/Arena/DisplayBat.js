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

    const [ img, setImg ] = useState(null)



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
                        100000, 
                        undefined,
                        undefined,
                        params
                      );

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

                    
                    const appArgs = []
                    appArgs.push(
                        new Uint8Array(Buffer.from("fight")),
                        new Uint8Array(Buffer.from(props.address)),
                        
                    )

                    const accounts = [props.address]
                    const foreignApps = []
                        
                    const foreignAssets = [1088771340]


                    const boxes = []
                    
                    let atxn = algosdk.makeApplicationNoOpTxn(activeAccount.address, params, props.contract, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);

                    
                    let txns = [ftxn, wtxn, atxn]

                    let txgroup = algosdk.assignGroupID(txns)


                    let encodedTxns= []

                    txns.forEach((txn) => {
                      let encoded = algosdk.encodeUnsignedTransaction(txn)
                      encodedTxns.push(encoded)
              
                    })
          
              
                    const signedTransactions = await signTransactions(encodedTxns)
          
                    props.setMessage("Sending transaction...")
          
                    const { id } = await sendTransactions(signedTransactions)
          
                    let confirmedTxn = await algosdk.waitForConfirmation(client, id, 4);

                    let txId = atxn.txID().toString();

          
                    props.setMessage("Generating Stories...")

                let res = await fetch('/api/arena/generateStory', {
                    method: "POST",
                    headers: {
                    "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        charName: charName,
                        charStats: charStats,
                        charNameOther: nft.name,
                        charStatsOther: nftCharStats,
                        wager: props.wager,
                        txn: txId

                    }),
                    
                    
                });
        
                let sess = await res.json()
        
                let result = sess.response

                await sendBattle(result.winner, result.loser, result.wager, result.story, id, result.setting)

                props.setMessage("Battle Complete")
                        
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

    const sendBattle = async (winner, loser, wager, story, txId, setting) => {

        props.setMessage("Sending to Discord...")


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

        let responseNft = await fetch('/api/getNft', {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                nftId: props.charSel
              }),
            
                
            });
        
        let sessionNft = await responseNft.json()

        let name = sessionNft.nft.assets[0].params.name
        let url

        if (name.substring(0, 18) == "Dark Coin Champion") {
            let addr = algosdk.decodeAddress(sessionNft.nft.assets[0].params.reserve)

            let mhdigest = digest.create(mfsha2.sha256.code, addr.publicKey)

            let ocid = CID.create(0, 0x70, mhdigest)

            url = "https://gateway.pinata.cloud/ipfs/" + ocid.toString()


        }
        else {
            url = "https://gateway.pinata.cloud/ipfs/" + sessionNft.nft.assets[0].params.url.slice(34)
        }

        let responseImg = await fetch('/api/arena/imageComb', {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                champ1: nftUrl,
                champ2: url,
                setting: setting
              }),
            
                
            });
        
        let session = await responseImg.json()

        console.log(session)

        embeds.push({
            "image": {
                "url": String(session.image)
            },
            "color": 16711680
        })

        embeds.push({
            "title": "Fight!",
            "color": 16777215
        })

        embeds.push({
            "description": String(story).replace(/["']/g, "'"),
            "color": 16777215
        })

        embeds.push({
            "title": nameWinner + " has won " + wager.toLocaleString("en-US") + " DC !",
            "url": "https://allo.info/tx/" + txId,
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
            props.setMessage(error)

            await props.sendDiscordMessage(error, "Send Battle", activeAccount.address)
           }



        
    }

    const makeImage = async () => {

        console.log(props.charSel)

        let responseNft = await fetch('/api/getNft', {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                nftId: props.charSel
              }),
            
                
            });
        
        let sessionNft = await responseNft.json()

        let name = sessionNft.nft.assets[0].params.name
        let url

        if (name.substring(0, 18) == "Dark Coin Champion") {
            let addr = algosdk.decodeAddress(sessionNft.nft.assets[0].params.reserve)

            let mhdigest = digest.create(mfsha2.sha256.code, addr.publicKey)

            let ocid = CID.create(0, 0x70, mhdigest)

            url = "https://gateway.pinata.cloud/ipfs/" + ocid.toString()


        }
        else {
            url = "https://gateway.pinata.cloud/ipfs/" + sessionNft.nft.assets[0].params.url.slice(34)
        }

        let response = await fetch('/api/arena/imageComb', {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                champ1: nftUrl,
                champ2: url
              }),
            
                
            });
        
        let session = await response.json()

        setImg(session.image)

        console.log(session.image)



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
                {props.address != activeAccount.address ?
                <div>
                
                <Button variant="contained" color="secondary" style={{display: "flex", margin: "auto"}} onClick={() => genStory()}>
                    <Typography variant="h6"> Fight {Number(props.wager / 1000000).toLocaleString("en-US")} </Typography>

                    <img src="/invDC.svg" style={{display: "flex", margin: "auto", width: 50, padding: 10}} />

                    <Typography variant="h6"> 0.1 </Typography>
                    <img src="/AlgoBlack.svg" style={{display: "flex", margin: "auto", width: 40, padding: 10}} />
                    
                </Button>

                </div>
                :
                null
                }
            <br />
                {/* <Button style={{backgroundColor: "#FFFFFF"}} onClick={() => makeImage()}>
                    image
                </Button>

                {img ? 
                <img src={img} style={{width: "100%"}}/>
                :
                null
                } */}
    
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