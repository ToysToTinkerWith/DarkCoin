import React, { useEffect, useState } from "react"

import algosdk from "algosdk"

import { Typography, Button, TextField, Card, Grid, LinearProgress, linearProgressClasses, styled } from "@mui/material"

import { useWallet } from '@txnlab/use-wallet'

import ArrowForwardIcon from '@mui/icons-material/ArrowForward';



import { CID } from 'multiformats/cid'


import * as mfsha2 from 'multiformats/hashes/sha2'
import * as digest from 'multiformats/hashes/digest'


  const BorderLinearProgressHealth = styled(LinearProgress)(({ theme }) => ({
    height: 10,
    borderRadius: 5,
    [`&.${linearProgressClasses.colorPrimary}`]: {
      backgroundColor: theme.palette.grey[theme.palette.mode === 'light' ? 200 : 800],
    },
    [`& .${linearProgressClasses.bar}`]: {
      borderRadius: 5,
      backgroundColor: theme.palette.mode === 'light' ? '#B92C2C' : '#308fe8',
    },
  }));

  const ProgressHealth = styled(LinearProgress)(({ theme }) => ({
    height: 5,
    borderRadius: 5,
    [`&.${linearProgressClasses.colorPrimary}`]: {
      backgroundColor: theme.palette.grey[theme.palette.mode === 'light' ? 200 : 800],
    },
    [`& .${linearProgressClasses.bar}`]: {
      borderRadius: 5,
      backgroundColor: theme.palette.mode === 'light' ? '#B92C2C' : '#308fe8',
    },
  }));



export default function DisplayChar(props) {

    const { activeAccount, signTransactions, sendTransactions } = useWallet()

    const [ nft, setNft ] = useState(null)
    const [ nftUrl, setNftUrl ] = useState(null)
    const [ charStats, setCharStats ] = useState(null)

    const [ charObject, setCharObject ] = useState(null)
    const [ action, setAction ] = useState(null)



    const [ hover, setHover ] = useState(false)
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

        if (session.charObject != "none") {
            setCharObject(session.charObject)
        }
        if (session.action) {
            setAction(session.action)
        }
    
        if (session.nft.assets[0].params.creator == "L6VIKAHGH4D7XNH3CYCWKWWOHYPS3WYQM6HMIPNBVSYZWPNQ6OTS5VERQY") {
            const addr = algosdk.decodeAddress(session.nft.assets[0].params.reserve)

            const mhdigest = digest.create(mfsha2.sha256.code, addr.publicKey)

            const ocid = CID.create(0, 0x70, mhdigest)

            let char = JSON.parse(session.charStats)
            
            let properties = JSON.stringify(char.properties)
            setNft(session.nft.assets[0].params)
            setNftUrl("https://ipfs.dark-coin.io/ipfs/" + ocid.toString())
            setCharStats(properties)
            
        }
        else {
            setNft(session.nft.assets[0].params)
            setNftUrl("https://ipfs.dark-coin.io/ipfs/" + session.nft.assets[0].params.url.slice(34))
            setCharStats(session.charStats)
        }

        
    
            }
            catch(error) {
                    //props.sendDiscordMessage(error, "Fetch Char", activeAccount.address)
                
               
               }

        }

        fetchData();
        
    
    
    

        

    }, [])


      const chooseCharacter = async () => {

        try {

      
        const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)

        let optedin = false

        let response = await indexerClient.lookupAccountAppLocalStates(activeAccount.address).do();
        response["apps-local-states"].forEach((localstate) => {
            if (localstate.id == props.contracts.arena) {
                optedin = true
            }
        })


        const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)  
              
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

            props.setMessage("Sign Transaction...")


        const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)

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
        
        const signedTransactions = await signTransactions([encoded])

        props.setMessage("Sending Transaction...")

        const { id } = await sendTransactions(signedTransactions)

        let confirmedTxn = await algosdk.waitForConfirmation(client, id, 4);

        props.setMessage("Listing in marketplace...")


        const response = await fetch('/api/arena/sellChar', {
            method: "POST",
            body: JSON.stringify({
              address: activeAccount.address,
              nftId: props.nftId,
              price: price
            }),
            headers: {
              "Content-Type": "application/json",
            }
              
          });
        
          const session = await response.json()
    
         

        props.setMessage("Asset listed in marketplace.")
        }
        catch(error) {
            await props.sendDiscordMessage(error, "Send Char To Market", activeAccount.address)
           }

      }

      const claimNft = async () => {

        try {

            props.setMessage("Sign Transaction...")


            const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)

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

            props.setMessage("Transfering Asset...")


            const response = await fetch('/api/arena/claimChar', {
                method: "POST",
                body: JSON.stringify({
                  address: activeAccount.address,
                  nftId: props.nftId
                }),
                headers: {
                  "Content-Type": "application/json",
                }
                  
              });
            
              const session = await response.json()
        
        

          props.setMessage("Asset Transfered.")
        }
        catch(error) {
            await props.sendDiscordMessage(error, "Claim Char NFT", activeAccount.address)
           }

      }

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


    const joinBrawl = async () => {

        try {

        const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)  
              
        let params = await client.getTransactionParams().do()

        let txns = []

        let ftxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
            activeAccount.address, 
            "SSG6DFUAQEUI7CX4PMPIXL2G23S5EAMQCDOCDQ5OFUHECPWTYYPDFNHEJQ", 
            undefined, 
            undefined,
            10000000000,  
            undefined, 
            1088771340, 
            params
        );
        
        txns.push(ftxn)

        const appArgs = []

        const accounts = []
        const foreignApps = []
            
        const foreignAssets = [props.nftId]

        let assetInt = longToByteArray(props.nftId)
      
        let assetBox = new Uint8Array(assetInt)

      
        const boxes = [{appIndex: 0, name: assetBox}]

        props.setMessage("Sign Transaction...")

        appArgs.push(
            new Uint8Array(Buffer.from("joinBrawl"))
        )

        let txn = algosdk.makeApplicationNoOpTxn(activeAccount.address, params, props.contracts.dragonshorde, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);

        txns.push(txn)

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

        props.setMessage("Transaction Confirmed, you have entered the lair!")
        props.brawlChars.push(props.nftId)

        
    }
    catch(error) {
        props.setMessage(String(error))
        await props.sendDiscordMessage(error, "Join Brawl", activeAccount.address)
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
            else if (props.brawl) {
                    return (
                        <div>
                            <Typography color="secondary" align="center" variant="subtitle1"> {nft.name} </Typography>
                            <img style={{width: "100%", borderRadius: 5}} src={nftUrl} />
                            {props.brawlChars.includes(props.nftId) || props.drag ? 
                            null
                            :
                            <Button color="primary" style={{backgroundColor: "white", display: "flex", margin: "auto"}} onClick={() => joinBrawl()} >                                
                                <Typography  variant="caption"> Join lair <br /> 10,000 </Typography>
                                <img src="/invDC.svg" style={{display: "flex", margin: "auto", width: 40, padding: 10}} />
                            </Button>
                            }
                            
                        </div>
            
                    )

            }
            else if (props.brawler) {

                let radians = 2*Math.PI*(props.index/props.length);

                if (charObject) {

                    let healthAdj = 0
                    let speedAdj = 0
                    let resistAdj = 0
                    let strengthAdj = 0
                    let dexterityAdj = 0
                    let intelligenceAdj = 0
                    let accuracyAdj = 0

                    if (charObject.effects["poison"]) {
                        healthAdj -= charObject.effects["poison"] * 1
                    }
                    if (charObject.effects["bleed"]) {
                        healthAdj -= charObject.effects["bleed"] * 0.7
                        strengthAdj -= charObject.effects["bleed"] * 0.1
                    }
                    if (charObject.effects["burn"]) {
                        healthAdj -= charObject.effects["burn"] * 0.5
                        intelligenceAdj -= charObject.effects["burn"] * 0.1
                        strengthAdj += charObject.effects["burn"] * 0.1
                        speedAdj += charObject.effects["burn"] * 0.2
                    }
                    if (charObject.effects["freeze"]) {
                        speedAdj -= charObject.effects["freeze"] * 0.2
                        dexterityAdj -= charObject.effects["freeze"] * 0.2
                    }
                    if (charObject.effects["slow"]) {
                        speedAdj -= charObject.effects["slow"] * 0.3
                        dexterityAdj -= charObject.effects["slow"] * 0.1
                    }
                    if (charObject.effects["paralyze"]) {
                        accuracyAdj -= charObject.effects["paralyze"] * 0.2
                    }
                    if (charObject.effects["drown"]) {
                        dexterityAdj -= charObject.effects["drown"] * 0.3
                        accuracyAdj -= charObject.effects["drown"] * 0.1
                    }
                    if (charObject.effects["doom"]) {
                        healthAdj -= charObject.effects["doom"] * 0.3
                        resistAdj -= charObject.effects["doom"] * 0.2
                        intelligenceAdj -= charObject.effects["doom"] * 0.2
                    }

                    
                    if (charObject.effects["strengthen"]) {
                        strengthAdj += charObject.effects["strengthen"] * 0.3
                    }
                    if (charObject.effects["empower"]) {
                        intelligenceAdj += charObject.effects["empower"] * 0.3
                    }
                    if (charObject.effects["hasten"]) {
                        dexterityAdj += charObject.effects["hasten"] * 0.3
                        speedAdj += charObject.effects["hasten"] * 0.1
                    }
                    if (charObject.effects["nurture"]) {
                        healthAdj += charObject.effects["nurture"] * 0.5
                    }
                    if (charObject.effects["bless"]) {
                        strengthAdj += charObject.effects["bless"] * 0.2
                        intelligenceAdj += charObject.effects["bless"] * 0.2
                        resistAdj += charObject.effects["bless"] * 0.1
                    }
                    if (charObject.effects["focus"]) {
                        accuracyAdj += charObject.effects["focus"] * 0.3
                    }

                    if (charObject["name"].substring(0,7) == "Vorlash") {
                        console.log(charObject)
                        console.log(props.nftId)
                    }

                    
                    return (
                        <div onMouseOver={() => props.char && props.moveSelect != null ? null : setHover(true)} onMouseLeave={() => setHover(false)} onClick={() => props.char && props.moveSelect != null ? props.attack(props.nftId) : null}  style={{position: "absolute", left: props.index % 2 == 0 ? (-(Math.sin(radians)*props.width/3) + (props.width/2.2)) : (-(Math.sin(radians)*props.width/4) + (props.width/2.2)), top: props.index % 2 == 0 ? (-(Math.cos(radians)*props.height/3) + (props.height/2)) : (-(Math.cos(radians)*props.height/4) + (props.height/2))}}>
                            {/* <Typography color="secondary" align="center" variant="subtitle1"> {charObject ? charObject["name"] : nft.name.substring(18)} </Typography> */}
                            <img style={{zIndex: 0, width: props.dcChars.includes(props.nftId) ? String((300 / (props.length + 3))) + "vw" : String((200 / (props.length + 3))) + "vw", minWidth: 20, borderRadius: 5, border: props.dcChars.includes(props.nftId) || (props.char && props.moveSelect != null) ? "3px solid white" : null}} src={nftUrl} />
                            <ProgressHealth variant="determinate" style={{color: "white"}} value={charObject.currentHealth / charObject.health * 100} />

                            
                            {hover && !props.char && props.moveSelect == null ? 
                            <Card style={Math.sin(radians) < 0 ? {zIndex: 10, position: "absolute", display: "grid", right: 0, top: -50, backgroundColor: "black", minWidth: 200, border: "1px solid white"} : {zIndex: 10, position: "absolute", display: "grid", left: 0, top: -50, backgroundColor: "black", minWidth: 200, border: "1px solid white"}}>

                                <Typography color="secondary" align="center" variant="subtitle1" style={{margin: 20}}> {charObject.name} </Typography>

                                <img style={{width: "100%", borderRadius: 5}} src={nftUrl} />

                                <Grid container style={{padding: 20}}>
                                    {charObject.effects["bleed"] ? 
                                        <Grid item xs={3} sm={3} md={3}>
                                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/bleeding.svg"} />
                                        <Typography color="secondary" align="center" variant="subtitle1"> {charObject.effects.bleed} </Typography>
                                    </Grid>                                :
                                    null
                                    }
                                    {charObject.effects["bless"] ? 
                                        <Grid item xs={3} sm={3} md={3}>
                                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/blessed.svg"} />
                                        <Typography color="secondary" align="center" variant="subtitle1"> {charObject.effects.bless} </Typography>
                                    </Grid>                                :
                                    null
                                    }
                                    {charObject.effects["burn"] ? 
                                        <Grid item xs={3} sm={3} md={3}>
                                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/burned.svg"} />
                                        <Typography color="secondary" align="center" variant="subtitle1"> {charObject.effects.burn} </Typography>
                                    </Grid>                                :
                                    null
                                    }
                                    {charObject.effects["cleanse"] ? 
                                        <Grid item xs={3} sm={3} md={3}>
                                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/cleansed.svg"} />
                                        <Typography color="secondary" align="center" variant="subtitle1"> {charObject.effects.cleanse} </Typography>
                                    </Grid>                                :
                                    null
                                    }
                                    {charObject.effects["doom"] ? 
                                        <Grid item xs={3} sm={3} md={3}>
                                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/doomed.svg"} />
                                        <Typography color="secondary" align="center" variant="subtitle1"> {charObject.effects.doom} </Typography>
                                    </Grid>                                :
                                    null
                                    }
                                    {charObject.effects["drown"] ? 
                                        <Grid item xs={3} sm={3} md={3}>
                                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/drowned.svg"} />
                                        <Typography color="secondary" align="center" variant="subtitle1"> {charObject.effects.drown} </Typography>
                                    </Grid>                                :
                                    null
                                    }
                                    {charObject.effects["empower"] ? 
                                        <Grid item xs={3} sm={3} md={3}>
                                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/empowered.svg"} />
                                        <Typography color="secondary" align="center" variant="subtitle1"> {charObject.effects.empower} </Typography>
                                    </Grid>                                :
                                    null
                                    }
                                    {charObject.effects["focus"] ? 
                                        <Grid item xs={3} sm={3} md={3}>
                                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/focused.svg"} />
                                        <Typography color="secondary" align="center" variant="subtitle1"> {charObject.effects.focus} </Typography>
                                    </Grid>                                :
                                    null
                                    }
                                    {charObject.effects["freeze"] ? 
                                        <Grid item xs={3} sm={3} md={3}>
                                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/frozen.svg"} />
                                        <Typography color="secondary" align="center" variant="subtitle1"> {charObject.effects.freeze} </Typography>
                                    </Grid>                                :
                                    null
                                    }
                                    {charObject.effects["hasten"] ? 
                                        <Grid item xs={3} sm={3} md={3}>
                                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/hastened.svg"} />
                                        <Typography color="secondary" align="center" variant="subtitle1"> {charObject.effects.hasten} </Typography>
                                    </Grid>                                :
                                    null
                                    }
                                    {charObject.effects["nurture"] ? 
                                        <Grid item xs={3} sm={3} md={3}>
                                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/nurtured.svg"} />
                                        <Typography color="secondary" align="center" variant="subtitle1"> {charObject.effects.nurture} </Typography>
                                    </Grid>                                :
                                    null
                                    }
                                    {charObject.effects["paralyze"] ? 
                                        <Grid item xs={3} sm={3} md={3}>
                                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/paralyzed.svg"} />
                                        <Typography color="secondary" align="center" variant="subtitle1"> {charObject.effects.paralyze} </Typography>
                                    </Grid>                                :
                                    null
                                    }
                                    {charObject.effects["poison"] ? 
                                        <Grid item xs={3} sm={3} md={3}>
                                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/poisoned.svg"} />
                                        <Typography color="secondary" align="center" variant="subtitle1"> {charObject.effects.poison} </Typography>
                                    </Grid>                                :
                                    null
                                    }
                                    {charObject.effects["shield"] ? 
                                        <Grid item xs={3} sm={3} md={3}>
                                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/shielded.svg"} />
                                        <Typography color="secondary" align="center" variant="subtitle1"> {charObject.effects.shield} </Typography>
                                    </Grid>                                :
                                    null
                                    }
                                    {charObject.effects["slow"] ? 
                                        <Grid item xs={3} sm={3} md={3}>
                                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/slowed.svg"} />
                                        <Typography color="secondary" align="center" variant="subtitle1"> {charObject.effects.slow} </Typography>
                                    </Grid>                                :
                                    null
                                    }
                                    {charObject.effects["strengthen"] ? 
                                    <Grid item xs={3} sm={3} md={3}>
                                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/strengthened.svg"} />
                                        <Typography color="secondary" align="center" variant="subtitle1"> {charObject.effects.strengthen} </Typography>
                                    </Grid>
                                    :
                                    null
                                    }

                                    
                            
                                </Grid>

                                {action ?
                                <Typography color="secondary" align="center" variant="subtitle1" style={{margin: 20, padding: 20, border: "1px solid white", borderRadius: 15}}>  {action.move.name} <ArrowForwardIcon /> {action.target} </Typography>
                                :
                                null
                                }



                                <Grid container style={{padding: 20}}> 
                                    <Grid item xs={12}>
                                        <img style={{zIndex: 10, width: String((50 / (props.length + 3))) + "vw", minWidth: 60, maxWidth: 80, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/health.svg"} />
                                        <BorderLinearProgressHealth variant="determinate" style={{marginRight: 10, marginLeft: 10, color: "white"}} value={charObject.currentHealth / charObject.health * 100} />
                                        {healthAdj == 0 ?
                                            <Typography color="secondary" align="center" variant="subtitle1"> {Number(charObject.currentHealth).toFixed(1)} </Typography>
                                            :
                                            healthAdj < 0 ?
                                            <div>
                                            <Typography color="secondary" align="center" variant="subtitle1"> {Number(charObject.currentHealth).toFixed(1)} </Typography>
                                            <Typography color="secondary" align="center" variant="subtitle1" style={{color: "#F8575A"}}> {healthAdj} </Typography>
                                            </div>
                                            :
                                            <div>
                                            <Typography color="secondary" align="center" variant="subtitle1"> {Number(charObject.currentHealth).toFixed(1)} </Typography>
                                            <Typography color="secondary" align="center" variant="subtitle1" style={{color: "#4EC83E"}}> + {healthAdj} </Typography>
                                            </div>
                                        }
                                    </Grid>
                                    <Grid item xs={6}>
                                        <img style={{zIndex: 10, width: String((50 / (props.length + 3))) + "vw", minWidth: 50, maxWidth: 70, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/speed.svg"} />
                                        {speedAdj == 0 ?
                                            <Typography color="secondary" align="center" variant="subtitle1"> {Number(charObject.speed).toFixed(1)} </Typography>
                                            :
                                            speedAdj < 0 ?
                                            <Typography color="secondary" align="center" variant="subtitle1" style={{color: "#F8575A"}}> {Number(charObject.speed + speedAdj).toFixed(1)} </Typography>
                                            :
                                            <Typography color="secondary" align="center" variant="subtitle1" style={{color: "#4EC83E"}}> {Number(charObject.speed + speedAdj).toFixed(1)} </Typography>
                                        }                                
                                    </Grid>
                                    <Grid item xs={6}>
                                        <img style={{zIndex: 10, width: String((50 / (props.length + 3))) + "vw", minWidth: 50, maxWidth: 70, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/resist.svg"} />
                                        {resistAdj == 0 ?
                                            <Typography color="secondary" align="center" variant="subtitle1"> {Number(charObject.resist).toFixed(1)} </Typography>
                                            :
                                            resistAdj < 0 ?
                                            <Typography color="secondary" align="center" variant="subtitle1" style={{color: "#F8575A"}}> {Number(charObject.resist + resistAdj).toFixed(1)} </Typography>
                                            :
                                            <Typography color="secondary" align="center" variant="subtitle1" style={{color: "#4EC83E"}}> {Number(charObject.resist + resistAdj).toFixed(1)} </Typography>
                                        }                                
                                    </Grid>
                                </Grid>

                                <Grid container style={{padding: 20}}>
                                    <Grid item xs={4} sm={4} md={4}>
                                        <img style={{zIndex: 10, width: String((50 / (props.length + 3))) + "vw", minWidth: 40, maxWidth: 60, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/strength.svg"} />
                                        {strengthAdj == 0 ?
                                            <Typography color="secondary" align="center" variant="subtitle1"> {Number(charObject.strength).toFixed(1)} </Typography>
                                            :
                                            strengthAdj < 0 ?
                                            <Typography color="secondary" align="center" variant="subtitle1" style={{color: "#F8575A"}}> {Number(charObject.strength + strengthAdj).toFixed(1)} </Typography>
                                            :
                                            <Typography color="secondary" align="center" variant="subtitle1" style={{color: "#4EC83E"}}> {Number(charObject.strength+ strengthAdj).toFixed(1)} </Typography>
                                        }                                
                                        </Grid>
                                    <Grid item xs={4} sm={4} md={4}>
                                        <img style={{zIndex: 10, width: String((50 / (props.length + 3))) + "vw", minWidth: 40, maxWidth: 60, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/dexterity.svg"} />
                                        {dexterityAdj == 0 ?
                                            <Typography color="secondary" align="center" variant="subtitle1"> {Number(charObject.dexterity).toFixed(1)} </Typography>
                                            :
                                            dexterityAdj < 0 ?
                                            <Typography color="secondary" align="center" variant="subtitle1" style={{color: "#F8575A"}}> {Number(charObject.dexterity + dexterityAdj).toFixed(1)} </Typography>
                                            :
                                            <Typography color="secondary" align="center" variant="subtitle1" style={{color: "#4EC83E"}}> {Number(charObject.dexterity + dexterityAdj).toFixed(1)} </Typography>
                                        }                                
                                        </Grid>
                                    <Grid item xs={4} sm={4} md={4}>
                                        <img style={{zIndex: 10, width: String((50 / (props.length + 3))) + "vw", minWidth: 40, maxWidth: 60, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/intelligence.svg"} />
                                        {intelligenceAdj == 0 ?
                                            <Typography color="secondary" align="center" variant="subtitle1"> {Number(charObject.intelligence).toFixed(1)} </Typography>
                                            :
                                            intelligenceAdj < 0 ?
                                            <Typography color="secondary" align="center" variant="subtitle1" style={{color: "#F8575A"}}> {Number(charObject.intelligence + intelligenceAdj).toFixed(1)} </Typography>
                                            :
                                            <Typography color="secondary" align="center" variant="subtitle1" style={{color: "#4EC83E"}}> {Number(charObject.intelligence + intelligenceAdj).toFixed(1)} </Typography>
                                        }                                
                                        </Grid>
                                </Grid>

                                <Grid container style={{padding: 20}}>
                                    {charObject["bleed"] ? 
                                        <Grid item xs={3} sm={3} md={3}>
                                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/bleeding.svg"} />
                                        <Typography color="secondary" align="center" variant="subtitle1"> {charObject.bleed} </Typography>
                                    </Grid>                                :
                                    null
                                    }
                                    {charObject["bless"] ? 
                                        <Grid item xs={3} sm={3} md={3}>
                                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/blessed.svg"} />
                                        <Typography color="secondary" align="center" variant="subtitle1"> {charObject.bless} </Typography>
                                    </Grid>                                :
                                    null
                                    }
                                    {charObject["burn"] ? 
                                        <Grid item xs={3} sm={3} md={3}>
                                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/burned.svg"} />
                                        <Typography color="secondary" align="center" variant="subtitle1"> {charObject.burn} </Typography>
                                    </Grid>                                :
                                    null
                                    }
                                    {charObject["cleanse"] ? 
                                        <Grid item xs={3} sm={3} md={3}>
                                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/cleansed.svg"} />
                                        <Typography color="secondary" align="center" variant="subtitle1"> {charObject.cleanse} </Typography>
                                    </Grid>                                :
                                    null
                                    }
                                    {charObject["doom"] ? 
                                        <Grid item xs={3} sm={3} md={3}>
                                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/doomed.svg"} />
                                        <Typography color="secondary" align="center" variant="subtitle1"> {charObject.doom} </Typography>
                                    </Grid>                                :
                                    null
                                    }
                                    {charObject["drown"] ? 
                                        <Grid item xs={3} sm={3} md={3}>
                                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/drowned.svg"} />
                                        <Typography color="secondary" align="center" variant="subtitle1"> {charObject.drown} </Typography>
                                    </Grid>                                :
                                    null
                                    }
                                    {charObject["empower"] ? 
                                        <Grid item xs={3} sm={3} md={3}>
                                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/empowered.svg"} />
                                        <Typography color="secondary" align="center" variant="subtitle1"> {charObject.empower} </Typography>
                                    </Grid>                                :
                                    null
                                    }
                                    {charObject["focus"] ? 
                                        <Grid item xs={3} sm={3} md={3}>
                                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/focused.svg"} />
                                        <Typography color="secondary" align="center" variant="subtitle1"> {charObject.focus} </Typography>
                                    </Grid>                                :
                                    null
                                    }
                                    {charObject["freeze"] ? 
                                        <Grid item xs={3} sm={3} md={3}>
                                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/frozen.svg"} />
                                        <Typography color="secondary" align="center" variant="subtitle1"> {charObject.freeze} </Typography>
                                    </Grid>                                :
                                    null
                                    }
                                    {charObject["hasten"] ? 
                                        <Grid item xs={3} sm={3} md={3}>
                                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/hastened.svg"} />
                                        <Typography color="secondary" align="center" variant="subtitle1"> {charObject.hasten} </Typography>
                                    </Grid>                                :
                                    null
                                    }
                                    {charObject["nurture"] ? 
                                        <Grid item xs={3} sm={3} md={3}>
                                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/nurtured.svg"} />
                                        <Typography color="secondary" align="center" variant="subtitle1"> {charObject.nurture} </Typography>
                                    </Grid>                                :
                                    null
                                    }
                                    {charObject["paralyze"] ? 
                                        <Grid item xs={3} sm={3} md={3}>
                                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/paralyzed.svg"} />
                                        <Typography color="secondary" align="center" variant="subtitle1"> {charObject.paralyze} </Typography>
                                    </Grid>                                :
                                    null
                                    }
                                    {charObject["poison"] ? 
                                        <Grid item xs={3} sm={3} md={3}>
                                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/poisoned.svg"} />
                                        <Typography color="secondary" align="center" variant="subtitle1"> {charObject.poison} </Typography>
                                    </Grid>                                :
                                    null
                                    }
                                    {charObject["shield"] ? 
                                        <Grid item xs={3} sm={3} md={3}>
                                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/shielded.svg"} />
                                        <Typography color="secondary" align="center" variant="subtitle1"> {charObject.shield} </Typography>
                                    </Grid>                                :
                                    null
                                    }
                                    {charObject["slow"] ? 
                                        <Grid item xs={3} sm={3} md={3}>
                                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/slowed.svg"} />
                                        <Typography color="secondary" align="center" variant="subtitle1"> {charObject.slow} </Typography>
                                    </Grid>                                :
                                    null
                                    }
                                    {charObject["strengthen"] ? 
                                    <Grid item xs={3} sm={3} md={3}>
                                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/strengthened.svg"} />
                                        <Typography color="secondary" align="center" variant="subtitle1"> {charObject.strengthen} </Typography>
                                    </Grid>
                                    :
                                    null
                                    }

                                    
                            
                                </Grid>

                                

                                {charObject.moves.length > 0 ? 
                                    charObject.moves.map((move, index) => {
                                        return (
                                            <div key={index} style={{border: "1px solid white", margin: 20, borderRadius: 15}}>
                                                <Typography color="secondary" align="center" variant="subtitle1" style={{margin: 20}}> {move.name} </Typography>

                                                <Grid container align="space" justifyContent="center">
                                                    <Grid item xs={7} style={{paddingLeft: 30}}>
                                                        {move.type.substring(0,5) == "melee" ? 
                                                        <img style={{zIndex: 10, width: String((50 / (props.length + 3))) + "vw", minWidth: 50, maxWidth: 60, borderRadius: 5, padding: 5}} src={"/dragonshorde/strength.svg"} />
                                                        :
                                                        null
                                                        }
                                                        {move.type.substring(0,6) == "ranged" ? 
                                                        <img style={{zIndex: 10, width: String((50 / (props.length + 3))) + "vw", minWidth: 50, maxWidth: 60, borderRadius: 5, padding: 5}} src={"/dragonshorde/dexterity.svg"} />
                                                        :
                                                        null
                                                        }
                                                        {move.type.substring(0,5) == "magic" ? 
                                                        <img style={{zIndex: 10, width: String((50 / (props.length + 3))) + "vw", minWidth: 50, maxWidth: 60, borderRadius: 5, padding: 5}} src={"/dragonshorde/intelligence.svg"} />
                                                        :
                                                        null
                                                        }
                                                    </Grid>
                                                    <Grid item xs={5}>
                                                        {move.effect == "bleed" ? 
                                                        
                                                        <img style={{zIndex: 10, height: String((40 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, padding: 5}} src={"/dragonshorde/effects/bleeding.svg"} />
                                                        :
                                                        null
                                                        }
                                                        {move.effect == "bless" ? 
                                                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, padding: 5}} src={"/dragonshorde/effects/blessed.svg"} />
                                                        :
                                                        null
                                                        }
                                                        {move.effect == "burn" ? 
                                                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, padding: 5}} src={"/dragonshorde/effects/burned.svg"} />
                                                        :
                                                        null
                                                        }
                                                        {move.effect == "cleanse" ? 
                                                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, padding: 5}} src={"/dragonshorde/effects/cleansed.svg"} />
                                                        :
                                                        null
                                                        }
                                                        {move.effect == "doom" ? 
                                                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, padding: 5}} src={"/dragonshorde/effects/doomed.svg"} />
                                                        :
                                                        null
                                                        }
                                                        {move.effect == "drown" ? 
                                                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, padding: 5}} src={"/dragonshorde/effects/drowned.svg"} />
                                                        :
                                                        null
                                                        }
                                                        {move.effect == "empower" ? 
                                                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, padding: 5}} src={"/dragonshorde/effects/empowered.svg"} />
                                                        :
                                                        null
                                                        }
                                                        {move.effect == "focus" ? 
                                                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, padding: 5}} src={"/dragonshorde/effects/focused.svg"} />
                                                        :
                                                        null
                                                        }
                                                        {move.effect == "freeze" ? 
                                                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, padding: 5}} src={"/dragonshorde/effects/frozen.svg"} />
                                                        :
                                                        null
                                                        }
                                                        {move.effect == "hasten" ? 
                                                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, padding: 5}} src={"/dragonshorde/effects/hastened.svg"} />
                                                        :
                                                        null
                                                        }
                                                        {move.effect == "nurture" ? 
                                                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, padding: 5}} src={"/dragonshorde/effects/nurtured.svg"} />
                                                        :
                                                        null
                                                        }
                                                        {move.effect == "paralyze" ? 
                                                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, padding: 5}} src={"/dragonshorde/effects/paralyzed.svg"} />
                                                        :
                                                        null
                                                        }
                                                        {move.effect == "poison" ? 
                                                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, padding: 5}} src={"/dragonshorde/effects/poisoned.svg"} />
                                                        :
                                                        null
                                                        }
                                                        {move.effect == "shield" ? 
                                                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, padding: 5}} src={"/dragonshorde/effects/shielded.svg"} />
                                                        :
                                                        null
                                                        }
                                                        {move.effect == "slow" ? 
                                                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, padding: 5}} src={"/dragonshorde/effects/slowed.svg"} />
                                                        :
                                                        null
                                                        }
                                                        {move.effect == "strengthen" ? 
                                                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, padding: 5}} src={"/dragonshorde/effects/strengthened.svg"} />
                                                        :
                                                        null
                                                        }
                                                    </Grid>
                                                    
                                                </Grid>

                                                <Typography color="secondary" align="center" variant="subtitle1"> {move.type} </Typography>
                                                

                                                <Grid container style={{marginTop: 10, marginBottom: 10, padding: 10}}>
                                                    <Grid item xs={6}>
                                                        <img style={{zIndex: 10, width: String((50 / (props.length + 3))) + "vw", minWidth: 40, maxWidth: 60, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/power.svg"} />
                                                        {move.type.substring(0,5) == "melee" ?
                                                            strengthAdj == 0 ?
                                                            <Typography color="secondary" align="center" variant="subtitle1"> {Number(move.power + charObject.strength).toFixed(1)} </Typography>
                                                            :
                                                            strengthAdj < 0 ?
                                                            <Typography color="secondary" align="center" variant="subtitle1" style={{color: "#F8575A"}}> {Number(move.power + charObject.strength + strengthAdj).toFixed(1)} </Typography>
                                                            :
                                                            <Typography color="secondary" align="center" variant="subtitle1" style={{color: "#4EC83E"}}> {Number(move.power + charObject.strength + strengthAdj).toFixed(1)} </Typography>
                                                            :
                                                            null
                                                        }
                                                        {move.type.substring(0,6) == "ranged" ?
                                                            dexterityAdj == 0 ?
                                                            <Typography color="secondary" align="center" variant="subtitle1"> {Number(move.power + charObject.dexterity).toFixed(1)} </Typography>
                                                            :
                                                            dexterityAdj < 0 ?
                                                            <Typography color="secondary" align="center" variant="subtitle1" style={{color: "#F8575A"}}> {Number(move.power + charObject.dexterity + dexterityAdj).toFixed(1)} </Typography>
                                                            :
                                                            <Typography color="secondary" align="center" variant="subtitle1" style={{color: "#4EC83E"}}> {Number(move.power + charObject.dexterity + dexterityAdj).toFixed(1)} </Typography>
                                                            :
                                                            null
                                                        }
                                                        {move.type.substring(0,5) == "magic" ?
                                                            intelligenceAdj == 0 ?
                                                            <Typography color="secondary" align="center" variant="subtitle1"> {Number(move.power + charObject.intelligence).toFixed(1)} </Typography>
                                                            :
                                                            intelligenceAdj < 0 ?
                                                            <Typography color="secondary" align="center" variant="subtitle1" style={{color: "#F8575A"}}> {Number(move.power + charObject.intelligence + intelligenceAdj).toFixed(1)} </Typography>
                                                            :
                                                            <Typography color="secondary" align="center" variant="subtitle1" style={{color: "#4EC83E"}}> {Number(move.power + charObject.intelligence + intelligenceAdj).toFixed(1)} </Typography>
                                                            :
                                                            null
                                                        }
                                                    
                                                    </Grid>
                                                    <Grid item xs={6}>
                                                        <img style={{zIndex: 10, width: String((50 / (props.length + 3))) + "vw", minWidth: 40, maxWidth: 60, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/accuracy.svg"} />
                                                        {accuracyAdj == 0 ?
                                                            <Typography color="secondary" align="center" variant="subtitle1"> {Number(move.accuracy).toFixed(1)} </Typography>
                                                            :
                                                            accuracyAdj < 0 ?
                                                            <Typography color="secondary" align="center" variant="subtitle1" style={{color: "#F8575A"}}> {Number(move.accuracy + accuracyAdj).toFixed(1)} </Typography>
                                                            :
                                                            <Typography color="secondary" align="center" variant="subtitle1" style={{color: "#4EC83E"}}> {Number(move.accuracy + accuracyAdj).toFixed(1)} </Typography>
                                                        }
                                                    </Grid>
                                                </Grid>

                                                {
                                                    move.effect == "none" ?
                                                    null
                                                :
                                                    move.type.substring(move.type.length - 5) == "curse" || move.type.substring(move.type.length - 4) == "buff" ? 
                                                    <Typography color="secondary" align="center" variant="subtitle2" style={{margin: 10}}> Apply {charObject[move.effect] * 2} {move.effect} </Typography>
                                                :
                                                    <Typography color="secondary" align="center" variant="subtitle2" style={{margin: 10}}> Apply {Math.ceil(charObject[move.effect] / 2)} {move.effect} </Typography>
                                                }

                                                <Typography color="secondary" align="center" variant="subtitle2" style={{margin: 10}}> {move.description} </Typography>

                                                {props.dcChars.includes(props.nftId) ?
                                                <Button variant="contained" color="secondary"  style={{display: "flex", margin: "auto"}} onClick={() => [props.setChar(props.nftId), props.setMoveSelect(index)]} >
                                                    <Typography color="primary" align="center" variant="subtitle1"> Select </Typography>
                                                </Button>
                                                :
                                                null
                                                }
                                                <br />
                                                
                                            </div>
                                        )
                                    })
                                    :
                                    null
                                }


                            </Card>
                            : 
                            null
                            }
                        </div>
            
                    )
                    
                }
                else {
                    return (
                        <div onMouseOver={() => setHover(true)} onMouseLeave={() => setHover(false)}  style={{position: "absolute", left: (-(Math.sin(radians)*props.width/3) + (props.width/2.2)), top: (-(Math.cos(radians)*props.height/3) + (props.height/2))}}>
                            <Typography color="secondary" align="center" variant="subtitle1"> {charObject ? charObject["name"] : nft.name.substring(18)} </Typography>
                            <img style={{zIndex: 0, width: String((100 / (props.length + 3))) + "vw", borderRadius: 5, border: props.dcChars.includes(props.nftId) ? "1px solid white" : null}} src={nftUrl} />
                        </div>
                    )
                }

                
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