import React, { useState } from "react"


import algosdk from "algosdk"

import { Grid, Button} from "@mui/material"

import { useWallet } from '@txnlab/use-wallet-react'

import DisplayChar from "../../components/contracts/Arena/DisplayChar"

import { CID } from 'multiformats/cid'


import * as mfsha2 from 'multiformats/hashes/sha2'
import * as digest from 'multiformats/hashes/digest'


export default function Fight(props) {

    const {
        wallets,
        activeWallet,
        activeAddress,
        isReady,
        signTransactions,
        transactionSigner,
        algodClient,
    } = useWallet()


    const [fights, setFights] = useState([])

    const [wallet, setWallet] = useState([])



    const [char, setChar] = useState(null)

    const [windowSize, setWindowSize] = useState([
        0,
        0,
      ]);

    const fetchData = async () => {

            try {

                if (activeAddress) {

                const response = await fetch('/api/getDcAssets', {
                    method: "POST",
                    body: JSON.stringify({
                    address: activeAddress,
                    }),
                    headers: {
                    "Content-Type": "application/json",
                    }
                    
                });
                
                const session = await response.json()

                console.log(session)

                setWallet(session)

                

            }

                props.setMessage("Finding fight...")
  
                const response = await fetch('/api/arena/getFights', {
                method: "POST",
                body: JSON.stringify({
                    activeAccount: activeAddress,
                    contract: props.contracts.arena
                }),
                headers: {
                    "Content-Type": "application/json",
                }
                    
                });
      
                const session = await response.json()

                console.log(session)

                setFights(session.fights)
         
                
                    
                props.setMessage("")

                

                const windowSizeHandler = () => {
                    setWindowSize([window.innerWidth, window.innerHeight]);
                  };
                  window.addEventListener("resize", windowSizeHandler);
                  setWindowSize([window.innerWidth, window.innerHeight])
              
                  return () => {
                    window.removeEventListener("resize", windowSizeHandler);
                  };
            }
            catch(error) {
                props.sendDiscordMessage(error, "Fetch Select")
              }
    
        }

    React.useEffect(() => {

            fetchData();
        

    
    }, [activeAddress])

    const startFight = async (champ) => {

        try {

 

            const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)
        
            let params = await client.getTransactionParams().do();

            let wtxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
                // Required
                sender: activeAddress,
                receiver: "2N75NDVPWJLLLIKYDEVJAHL36BETO3HKDGHGXJAMUWSKGER7HJIPNBDGA4",
                amount: 10000000000,
                assetIndex: 1088771340,
                suggestedParams: params,

                // Optional (explicitly included)
                closeRemainderTo: undefined,     // ASA close-to (closes sender's ASA holding)
                revocationTarget: undefined,     // clawback target (only if sender is clawback)
                note: undefined,                // Uint8Array (or Buffer -> Uint8Array)
                lease: undefined,               // Uint8Array(32)
                rekeyTo: undefined,             // rekey address
            })


            let ftxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
                // Required
                sender: activeAddress,
                receiver: "VWYCYQ3H3PPNIGON4H363DIH7BP33TTZWUUUNMTDXCIHRCDPFOMU7VJ5HM",
                amount: 100000,
                suggestedParams: params,

                // Optional (explicitly included)
                closeRemainderTo: undefined, // payment close-to
                note: undefined,            // Uint8Array
                lease: undefined,           // Uint8Array(32)
                rekeyTo: undefined,         // rekey address
            })

            
            const appArgs = []
            appArgs.push(
                new Uint8Array(Buffer.from("startFight")),

            )

            const accounts = []
            const foreignApps = []
                
            const foreignAssets = [champ]

            const boxes = []

            console.log(props.contracts.arena)
            
            let atxn = algosdk.makeApplicationNoOpTxnFromObject({
                sender: activeAddress,
                suggestedParams: params,
                appIndex: props.contracts.arena,
                appArgs,
                accounts,
                foreignApps,
                foreignAssets,
                note: undefined,
                lease: undefined,
                rekeyTo: undefined,
                boxes,
            })

            
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

            const { txid } = await client.sendRawTransaction(signedTransactions).do()

            let confirmedTxn = await algosdk.waitForConfirmation(client, txid, 4);

            props.setMessage("Fight initialized")

            setChar(null)

            await sendFightStart(champ)

            await fetchData()
        }
        catch(error) {
          await props.sendDiscordMessage(error, "Start Fight", activeAddress)
        }

      }

      const sendFightStart = async (champ) => {

        try {

        let responseNft = await fetch('/api/getNft', {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                nftId: champ
              }),
            
                
            });
        
        let session = await responseNft.json()

        console.log(session)

        let nameChar = session.charObject.name

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
            "title": Number(10000).toLocaleString("en-US") + " DC to whoever can take down " + nameChar,
            "color": 0
        })
        
            
        embeds.push({
            "title" : nameChar,
            "url": "https://explorer.perawallet.app/asset/" + champ,
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
            await props.sendDiscordMessage(error, "Send Battle", activeAddress)
           }
        
    }


    

    return (
        <div>
            <br />
            {char ?
                <Button variant="contained" color="secondary" style={{display: "flex", margin: "auto"}} onClick={() => setChar(null)}>
                    Cancel
                </Button>
            :
                null
            }
            <br />
            <Grid container style={{}}>
                {fights.length > 0 ? 
                fights.map((nft, index) => {
                    console.log(nft)
                    return (
                        <Grid key={index} item xs={6} sm={4} md={3} lg={2} >
                            <DisplayChar nftId={nft.asset} setMessage={props.setMessage} wager={nft.wager} sendDiscordMessage={props.sendDiscordMessage} char={char} fighter={true} contracts={props.contracts}  />
                            <br />
                        </Grid>
                    )
                })
                :
                null
                }
            </Grid>
            <br />
            <br />
            <br />
            <Grid container >
                {props.wallet.length > 0 ? 
                props.wallet.map((warrior, index) => {
                    console.log(warrior)
                    if (warrior.asset.params && warrior.asset.params.creator == "L6VIKAHGH4D7XNH3CYCWKWWOHYPS3WYQM6HMIPNBVSYZWPNQ6OTS5VERQY") {
                        return (
                        <Grid key={index} item xs={6} sm={4} md={3} lg={2} >
                            <DisplayChar nftId={warrior.asset.index} startFight={startFight} setNft={(nftId) => setChar(nftId)} setMessage={props.setMessage} sendDiscordMessage={props.sendDiscordMessage} fight={true} contracts={props.contracts} fights={fights} />
                            <br />
                        </Grid>
                    )
                    }
                    
                })
                :
                null
                }
            </Grid>
        </div>
    )
}
        
    
    
