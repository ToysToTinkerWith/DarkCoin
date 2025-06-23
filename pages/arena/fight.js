import React, {useState, useEffect} from "react"


import algosdk from "algosdk"

import { Grid, Typography, Button, Card, styled, LinearProgress, linearProgressClasses } from "@mui/material"

import { useWallet } from '@txnlab/use-wallet'

import DisplayChar from "../../components/contracts/Arena/DisplayChar"

import FeedIcon from '@mui/icons-material/Feed';

import { CID } from 'multiformats/cid'


import * as mfsha2 from 'multiformats/hashes/sha2'
import * as digest from 'multiformats/hashes/digest'


  const TimerBar = styled(LinearProgress)(({ theme }) => ({
    height: 5,
    borderRadius: 5,
    [`&.${linearProgressClasses.colorPrimary}`]: {
      backgroundColor: theme.palette.grey[theme.palette.mode === 'light' ? 200 : 800],
    },
    [`& .${linearProgressClasses.bar}`]: {
      borderRadius: 5,
      backgroundColor: theme.palette.mode === 'light' ? '#31BC38' : '#308fe8',
    },
  }));

  const longToByteArray = (long) => {
    // we want to represent the input as a 8-bytes array
    var byteArray = [0, 0, 0, 0, 0, 0, 0, 0];

    for ( var index = byteArray.length - 1; index > 0; index -- ) {
        var byte = long & 0xff;
        byteArray [ index ] = byte;
        long = (long - byte) / 256 ;
    }

    return byteArray;
};

  const byteArrayToLong = (byteArray) => {
        var value = 0;
        for ( var i = 0; i < byteArray.length; i++) {
            value = (value * 256) + byteArray[i];
        }
    
        return value;
    };

export default function Fight(props) {

    const { activeAccount, signTransactions, sendTransactions } = useWallet()

    const [dcChars, setDcChars] = useState([])

    const [brawlChars, setBrawlChars] = useState([])

    const [fights, setFights] = useState([])


    const [char, setChar] = useState(null)

    const [windowSize, setWindowSize] = useState([
        0,
        0,
      ]);

    const fetchData = async () => {

            try {

                props.setMessage("Finding fight...")
  
                const response = await fetch('/api/arena/getFights', {
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

                console.log(session)

                setFights(session.fights)
         
                if (activeAccount) {

                props.setMessage("Finding Characters...")

                const response = await fetch('/api/arena/getDcChars', {
                    method: "POST",
                    body: JSON.stringify({
                        address: activeAccount.address,
                    }),
                    headers: {
                        "Content-Type": "application/json",
                    }
                        
                    });
                
                    const session = await response.json()
                        
                    setDcChars(session)

                }

                    
                    props.setMessage(null)

                

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
    
    }, [activeAccount])

    const startFight = async (champ) => {

        try {

 

            const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)
        
            let params = await client.getTransactionParams().do();

            let wtxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
                activeAccount.address, 
                "VWNGMYLU4LGHU2Z2BYHP54IUNU3GJROHG2LOOPFH5JAES3K7W4TBODC6TU", 
                undefined,
                undefined,
                10000000000, 
                undefined,
                1088771340,
                params
            );

            let ftxn = algosdk.makePaymentTxnWithSuggestedParams(
                activeAccount.address,
                "VWNGMYLU4LGHU2Z2BYHP54IUNU3GJROHG2LOOPFH5JAES3K7W4TBODC6TU", 
                100000, 
                undefined,
                undefined,
                params
            );

            
            const appArgs = []
            appArgs.push(
                new Uint8Array(Buffer.from("startFight")),

            )

            const accounts = []
            const foreignApps = []
                
            const foreignAssets = [champ]

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

            props.setMessage("Fight initialized")

            setChar(null)

            await sendFightStart(champ)

            await fetchData()
        }
        catch(error) {
          await props.sendDiscordMessage(error, "Start Fight", activeAccount.address)
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
            await props.sendDiscordMessage(error, "Send Battle", activeAccount.address)
           }
        
    }

    const genStory = async (champ1, champ2, wager) => {
    
            
    
                console.log(champ1, champ2, wager)

             props.setMessage("Generating Stories...")
    
            let res1 = await fetch('/api/arena/generateStory', {
                method: "POST",
                headers: {
                "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    champ1: champ1,
                    champ2: champ2,
                    wager: wager

                }),
                
                
            });
    
            let sess1 = await res1.json()
    
            let result1 = sess1.story

            console.log(result1)

            let res2 = await fetch('/api/arena/generateStory', {
                method: "POST",
                headers: {
                "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    champ1: champ2,
                    champ2: champ1,
                    wager: wager

                }),
                
                
            });
    
            let sess2 = await res2.json()
    
            let result2 = sess2.story

            console.log(result2)
    
            const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)

            const assetBalances = await indexerClient.lookupAssetBalances(champ1).do();

            const assetInfo = await indexerClient.lookupAssetByID(champ1).do();

            let address

            assetBalances.balances.forEach((balance) => {
                if (balance.amount == 1) {
                    address = balance.address
                }
            })

            let global = await indexerClient.lookupApplications(1053328572).do();

            let globalState = global.application.params["global-state"]

            let battleNum

            globalState.forEach((keyVal) => {
                if (atob(keyVal.key) == "battleNum") {
                    battleNum = keyVal.value.uint
                }
            })
    
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
            10000000000, 
            undefined,
            1088771340,
            params
            );

            
            const appArgs = []
            appArgs.push(
                new Uint8Array(Buffer.from("fight")),
                new Uint8Array(Buffer.from(result1)),
                new Uint8Array(Buffer.from(result2)),
                
            )

            const accounts = [address]
            const foreignApps = []
                
            const foreignAssets = [champ1, champ2, 1088771340]


            let battleBox = new Uint8Array([...Buffer.from("Battle"), ...longToByteArray(battleNum)])

            console.log(battleBox)

            const boxes = [{appIndex: 0, name: battleBox}, {appIndex: 0, name: battleBox}]
            
            let atxn = algosdk.makeApplicationNoOpTxn(activeAccount.address, params, props.contracts.arena, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);

            
            let txns = [ftxn, wtxn, atxn]

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

            let txId = atxn.txID().toString();

            console.log(id)
            console.log(txId)

            let responseBox = await client.getApplicationBoxByName(props.contracts.arena, battleBox).do();

            let stringBox = new TextDecoder().decode(responseBox.value)

            let array = stringBox.split(">")

            let winner = Number(array[0])
            let loser = Number(array[1])
            let wagerAmount = Number(array[2])
            let story = array[3]

            let setting

            if (winner == champ1) {
                setting = sess1.setting
            }
            else {
                setting = sess2.setting
            }
    

        await sendFightDiscord(winner, loser, wagerAmount, story, id, setting)

        props.setMessage("Battle Complete")
                            
        
          
    
          }
    
        const sendFightDiscord = async (winner, loser, wager, story, txId, setting) => {
    
            props.setMessage("Sending to Discord...")

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
    
            let nameWinner = sessionWinner.charObject.name
    
            let addrWinner = algosdk.decodeAddress(sessionWinner.nft.assets[0].params.reserve)

            let mhdigestWinner = digest.create(mfsha2.sha256.code, addrWinner.publicKey)

            let ocidWinner = CID.create(0, 0x70, mhdigestWinner)

            let urlWinner = "https://gateway.pinata.cloud/ipfs/" + ocidWinner.toString()
    
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
    
            let nameLoser = sessionLoser.charObject.name
            
    
            let addrLoser = algosdk.decodeAddress(sessionLoser.nft.assets[0].params.reserve)

            let mhdigestLoser = digest.create(mfsha2.sha256.code, addrLoser.publicKey)

            let ocidLoser = CID.create(0, 0x70, mhdigestLoser)

            let urlLoser = "https://gateway.pinata.cloud/ipfs/" + ocidLoser.toString()
         
            let randomNumber = Math.floor(Math.random() * 2);
    
            let embeds = []
    
            embeds.push({
                "title": (wager / 1000000).toLocaleString("en-US") + " DC on the line ! FIGHT !",
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
    
    
            let responseImg = await fetch('/api/arena/imageComb', {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    champ1: urlWinner,
                    champ2: urlLoser,
                    setting: setting,
                    winner: winner,
                    loser: loser,
                    wager: wager,
                    story: story,
                    txId: txId
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
                "title": nameWinner + " has won " + (wager / 1000000).toLocaleString("en-US") + " DC !",
                "url": "https://explorer.perawallet.app/tx/" + txId,
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

              await fetchData()
    
 
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
                            <DisplayChar nftId={nft.asset} setMessage={props.setMessage} wager={nft.wager} sendDiscordMessage={props.sendDiscordMessage} char={char} fighter={true} contracts={props.contracts} genStory={genStory} />
                            {/* <Button variant="contained" onClick={() => rollChar(nft)}> roll char </Button> */}
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
                {dcChars.length > 0 ? 
                dcChars.map((nft, index) => {
                    return (
                        <Grid key={index} item xs={6} sm={4} md={3} lg={2} >
                            <DisplayChar nftId={nft} startFight={startFight} setNft={(nftId) => setChar(nftId)} setMessage={props.setMessage} sendDiscordMessage={props.sendDiscordMessage} fight={true} contracts={props.contracts} fights={fights} />
                            {/* <Button variant="contained" onClick={() => rollChar(nft)}> roll char </Button> */}
                            <br />
                        </Grid>
                    )
                })
                :
                null
                }
            </Grid>
        </div>
    )
}
        
    
    
