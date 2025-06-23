import React, { useEffect, useState } from "react"

import algosdk, { assignGroupID } from "algosdk"

import { Typography, Button, TextField, Card, Grid, LinearProgress, linearProgressClasses, styled } from "@mui/material"

import { useWallet } from '@txnlab/use-wallet'

import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

import { useRouter } from 'next/router'

import { CID } from 'multiformats/cid'

import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';


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

  const BorderLinearProgress = styled(LinearProgress)(({ theme }) => ({
    height: 10,
    borderRadius: 5,
    [`&.${linearProgressClasses.colorPrimary}`]: {
      backgroundColor: theme.palette.grey[theme.palette.mode === 'light' ? 200 : 800],
    },
    [`& .${linearProgressClasses.bar}`]: {
      borderRadius: 5,
      backgroundColor: theme.palette.mode === 'light' ? '#1a90ff' : '#308fe8',
    },
  }));



export default function Character(props) {

    const { activeAccount, signTransactions, sendTransactions } = useWallet()

    const [ nft, setNft ] = useState(null)
    const [ nftUrl, setNftUrl ] = useState(null)
    const [ charStats, setCharStats ] = useState(null)

    const [ charObject, setCharObject ] = useState(null)
    const [ action, setAction ] = useState(null)

    const [ xp, setXp ] = useState(0)


    const [windowSize, setWindowSize] = useState([
        0,
        0,
      ]);

    const [ tree, setTree ] = useState(null)
    const [ points, setPoints ] = useState(new Uint8Array(1600))
    const [ oldPoints, setOldPoints ] = useState(new Uint8Array(1600))

    const [ trees, setTrees ] = useState([
        {
            skill1: {
                title: "Poison",
                effect: "Poison + 1",
                level: 0,
                maxLevel: 3,
                byte: 0
            },
            skill2: {
                title: "Toxic Cask",
                effect: "Curses apply 1 poison on hit",
                level: 0,
                maxLevel: 3,
                byte: 1
            },
            skill3: {
                title: "Antidote",
                effect: "Lose 1 poison on self when hit with a buff",
                level: 0,
                maxLevel: 3,
                byte: 2
            },
        },
        {
            skill1: {
                title: "Bleed",
                effect: "Bleed + 1",
                level: 0,
                maxLevel: 3,
                byte: 100
            },
            skill2: {
                title: "Vampire",
                effect: "Applying bleed restores 1 health",
                level: 0,
                maxLevel: 3,
                byte: 101
            },
            skill3: {
                title: "Drown in Blood",
                effect: "Applying bleed applies 1 drown",
                level: 0,
                maxLevel: 3,
                byte: 102
            },
        },
        {
            skill1: {
                title: "Burn",
                effect: "Burn + 1",
                level: 0,
                maxLevel: 3,
                byte: 200
            },
            skill2: {
                title: "Fiery Hell",
                effect: "Applying burn applies 1 doom",
                level: 0,
                maxLevel: 3,
                byte: 201
            },
            skill3: {
                title: "Gasoline",
                effect: "Hitting burned targets applies 1 burn",
                level: 0,
                maxLevel: 3,
                byte: 202
            },
        },
        {
            skill1: {
                title: "Freeze",
                effect: "Freeze + 1",
                level: 0,
                maxLevel: 3,
                byte: 300
            },
            skill2: {
                title: "Cold Hands",
                effect: "Melee hits apply 1 freeze",
                level: 0,
                maxLevel: 3,
                byte: 301
            },
            skill3: {
                title: "Heart of Ice",
                effect: "Freeze applied on self grants 1 health, apply 1 freeze on self per turn",
                level: 0,
                maxLevel: 3,
                byte: 302
            },
        },
        {
            skill1: {
                title: "Slow",
                effect: "Slow + 1",
                level: 0,
                maxLevel: 3,
                byte: 400
            },
            skill2: {
                title: "Quicksand",
                effect: "Hitting slowed targets applies 1 slow",
                level: 0,
                maxLevel: 3,
                byte: 401
            },
            skill3: {
                title: "Slow Motion",
                effect: "Slow applied on self applies 1 focus, apply 1 slow on self per turn",
                level: 0,
                maxLevel: 3,
                byte: 402
            },
        },
        {
            skill1: {
                title: "Drown",
                effect: "Drown + 1",
                level: 0,
                maxLevel: 3,
                byte: 500
            },
            skill2: {
                title: "Deep Water",
                effect: "Drown + 2",
                level: 0,
                maxLevel: 3,
                byte: 501
            },
            skill3: {
                title: "Suffocation",
                effect: "Magic attacks apply 1 drown",
                level: 0,
                maxLevel: 3,
                byte: 502
            },
        },
        {
            skill1: {
                title: "Paralyze",
                effect: "Paralyze + 1",
                level: 0,
                maxLevel: 3,
                byte: 600
            },
            skill2: {
                title: "High Voltage",
                effect: "Paralyze + 2",
                level: 0,
                maxLevel: 3,
                byte: 601
            },
            skill3: {
                title: "Conductivity",
                effect: "Paralyze attacks do +1 damage to targets with drown",
                level: 0,
                maxLevel: 3,
                byte: 602
            },
        },
        {
            skill1: {
                title: "Doom",
                effect: "Doom + 1",
                level: 0,
                maxLevel: 3,
                byte: 700
            },
            skill2: {
                title: "Sadistic Pleasure",
                effect: "Melee attacks apply 2 doom and 1 doom to self",
                level: 0,
                maxLevel: 3,
                byte: 701
            },
            skill3: {
                title: "Unatural Hunger",
                effect: "Doom applied on self heals 1 health",
                level: 0,
                maxLevel: 3,
                byte: 702
            },
        },
        {
            skill1: {
                title: "Shield",
                effect: "Shield + 1",
                level: 0,
                maxLevel: 3,
                byte: 800
            },
            skill2: {
                title: "Knights Honor",
                effect: "Shield + 2",
                level: 0,
                maxLevel: 3,
                byte: 801
            },
            skill3: {
                title: "Paladin",
                effect: "Applying shield also applies 1 bless",
                level: 0,
                maxLevel: 3,
                byte: 802
            },
        },
        {
            skill1: {
                title: "Strengthen",
                effect: "Strengthen + 1",
                level: 0,
                maxLevel: 3,
                byte: 900
            },
            skill2: {
                title: "Arm Day",
                effect: "Melee attacks apply 1 strengthn",
                level: 0,
                maxLevel: 3,
                byte: 901
            },
            skill3: {
                title: "Cardio is King",
                effect: "Each strengthen on self also grants 0.2 speed",
                level: 0,
                maxLevel: 3,
                byte: 902
            },
        },
        {
            skill1: {
                title: "Focus",
                effect: "Focus + 1",
                level: 0,
                maxLevel: 3,
                byte: 1000
            },
            skill2: {
                title: "Eagle Eye",
                effect: "Focus + 2",
                level: 0,
                maxLevel: 3,
                byte: 1001
            },
            skill3: {
                title: "Arrow of Truth",
                effect: "Ranged attacks apply 1 empower to self",
                level: 0,
                maxLevel: 3,
                byte: 1002
            },
        },
        {
            skill1: {
                title: "Empower",
                effect: "Empower + 1",
                level: 0,
                maxLevel: 3,
                byte: 1100
            },
            skill2: {
                title: "Confidence of Self",
                effect: "Empower on self also grants 0.2 dexterity",
                level: 0,
                maxLevel: 3,
                byte: 1101
            },
            skill3: {
                title: "Honest Touch",
                effect: "Melee buffs apply 2 empower",
                level: 0,
                maxLevel: 3,
                byte: 1102
            },
        },
        {
            skill1: {
                title: "Nurture",
                effect: "Nurture + 1",
                level: 0,
                maxLevel: 3,
                byte: 1200
            },
            skill2: {
                title: "Long Summer",
                effect: "Nurture on self provides an additional 0.1 health regen",
                level: 0,
                maxLevel: 3,
                byte: 1201
            },
            skill3: {
                title: "Green Aura",
                effect: "Buffs apply 1 nurture",
                level: 0,
                maxLevel: 3,
                byte: 1202
            },
        },
        {
            skill1: {
                title: "Bless",
                effect: "Bless + 1",
                level: 0,
                maxLevel: 3,
                byte: 1300
            },
            skill2: {
                title: "Unwaivering Faith",
                effect: "Bless applied on self also applies 1 focus",
                level: 0,
                maxLevel: 3,
                byte: 1301
            },
            skill3: {
                title: "Miracles do Happen",
                effect: "Magic moves have a 25% chance to apply 4 bless on self",
                level: 0,
                maxLevel: 3,
                byte: 1302
            },
        },
        {
            skill1: {
                title: "Hasten",
                effect: "Hasten + 1",
                level: 0,
                maxLevel: 3,
                byte: 1400
            },
            skill2: {
                title: "Need for Speed",
                effect: "Hasten provides an additional 0.1 speed",
                level: 0,
                maxLevel: 3,
                byte: 1401
            },
            skill3: {
                title: "Drug Lord",
                effect: "Hasten on self applies 1 strengthen and 1 focus, but also 1 doom",
                level: 0,
                maxLevel: 3,
                byte: 1402
            },
        },
        {
            skill1: {
                title: "Cleanse",
                effect: "Cleanse + 1",
                level: 0,
                maxLevel: 3,
                byte: 1500
            },
            skill2: {
                title: "Washed Hands",
                effect: "Melee buffs apply 1 cleanse",
                level: 0,
                maxLevel: 3,
                byte: 1501
            },
            skill3: {
                title: "Restored Judgement",
                effect: "Applying cleanse applies 1 empower",
                level: 0,
                maxLevel: 3,
                byte: 1502
            },
        },
    ])

    const router = useRouter()

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

    const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)

    const txns = await indexerClient.searchForTransactions(1870514811).do();

    const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)

    let assetBox = algosdk.encodeUint64(props.nftId)


    try {

        let accountBoxXp = await client.getApplicationBoxByName(props.contracts.dragonshorde, new Uint8Array([...assetBox, ...new Uint8Array(Buffer.from("xp"))])).do();
        
        var length = accountBoxXp.value.length;

        let buffer = Buffer.from(accountBoxXp.value);
        var result = buffer.readUIntBE(0, length);

        setXp(result)
        
    }
    catch(err) {
        //console.log(err)
    }

    try {

        let accountBoxPoints = await client.getApplicationBoxByName(props.contracts.dragonshorde, new Uint8Array([...assetBox, ...new Uint8Array(Buffer.from("points"))])).do();        

        setOldPoints(accountBoxPoints.value)
        setPoints(accountBoxPoints.value)

        
    }
    catch(err) {
        //console.log(err)
    }

    

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
                //props.sendDiscordMessage(error, "Fetch Char", activeAccount.address)
            
           
    }

    }
    
    React.useEffect(() => {

        if (props.nftId) {
            fetchData();
        }
        

    }, [router])

    const assignPoints = (byte, action, max, tier) => {

        let level = 1
        let nextLvl = 100
        let prevLvl = 0

    
        while (xp >= nextLvl) {
            prevLvl = nextLvl
            nextLvl = nextLvl + (200 * level) + 100
            level++
        }

        let totalPoints = 0

        for (let i = 0; i < points.length; i++) {
            totalPoints += points[i]
        }

        let treeByte = Math.floor(byte / 100)

        let newPoints = points.slice()

        if (totalPoints > (level - 1) && action == "plus") {

        }
        else if (tier == 1) {
            if (points[treeByte * 100] == 3) {

                if (action == "plus") {
                    if (newPoints[byte] + 1 > max) {
        
                    }
                    else {
                        newPoints[byte]++
                    }
                }
                else if (action == "minus") {
                    if (newPoints[byte] - 1 < 0) {
        
                    }
                    else {
                        newPoints[byte]--
                    }
                }

            }
        }
        else {

            if (action == "plus") {
                if (newPoints[byte] + 1 > max) {
    
                }
                else {
                    newPoints[byte]++
                }
            }
            else if (action == "minus") {
                if (newPoints[byte] - 1 < 0 || points[treeByte * 100 + 1] > 0 || points[treeByte * 100 + 2]) {
    
                }
                else {
                    newPoints[byte]--
                }
            }

        }

        

        setPoints(newPoints)

    }

    function isInt(value) {
        return typeof value === 'number' && value % 1 === 0;
      }

    function incrementNumbers(str, byte) {
    return str
        // Split on spaces into "tokens"
        .split(" ")
        // Transform each token
        .map(token => {

        if (token.slice(token.length - 1) == "%") {
            return token
        }
        // Attempt to parse as a float
        let num = parseFloat(token);
        
        // If parsing was successful (not NaN), increment
        if (!isNaN(num)) {
            if (isInt(num)) {
                return String(num * points[byte]);
            }
            else {
                return String((num * points[byte]).toFixed(1));
            }
            
        }
        
        // Otherwise, just return the token as is
        return token;
        })
        // Re-join on spaces
        .join(" ");
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

    const applyPoints = async () => {

        const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)
        
        let params = await client.getTransactionParams().do();

        const appArgs = []

        appArgs.push(
            new Uint8Array(Buffer.from("applyPoints")),
            points
        )

            
        const accounts = []
        const foreignApps = []
            
        const foreignAssets = [props.nftId]

        let assetInt = longToByteArray(props.nftId)
        
        let assetBox = new Uint8Array([...assetInt, ...new Uint8Array(Buffer.from("points"))])    
        
        const boxes = [{appIndex: 0, name: assetBox}, {appIndex: 0, name: assetBox}]

        props.setMessage("Sign Transaction...")

        
        let txn = algosdk.makeApplicationNoOpTxn(activeAccount.address, params, props.contracts.dragonshorde, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);

        let encoded = algosdk.encodeUnsignedTransaction(txn)
    
        const signedTransactions = await signTransactions([encoded])

        props.setMessage("Sending Transaction...")

        const { id } = await sendTransactions(signedTransactions)

        let confirmedTxn = await algosdk.waitForConfirmation(client, id, 4);

        props.setMessage("Transaction Confirmed, Skill Tree Updated")

        fetchData()

    }

    const arraysEqual = (arr1, arr2) =>
        arr1.length === arr2.length && arr1.every((val, i) => val === arr2[i]);


if (charObject) {

    let level = 1
    let nextLvl = 100
    let prevLvl = 0

 
    while (xp >= nextLvl) {
        prevLvl = nextLvl
        nextLvl = nextLvl + (200 * level) + 100
        level++
    }    

    let healthAdj = 0
    let speedAdj = 0
    let resistAdj = 0
    let strengthAdj = 0
    let dexterityAdj = 0
    let intelligenceAdj = 0
    let accuracyAdj = 0

    if (charObject.effects) {
        

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
    }

    let poisonAdj = oldPoints[0]
    let bleedAdj = oldPoints[100]
    let burnAdj = oldPoints[200]
    let freezeAdj = oldPoints[300]
    let slowAdj = oldPoints[400]
    let drownAdj = oldPoints[500]
    let paralyzeAdj = oldPoints[600]
    let doomAdj = oldPoints[700]

    let shieldAdj = oldPoints[800]
    let strengthenAdj = oldPoints[900]
    let focusAdj = oldPoints[1000]
    let empowerAdj = oldPoints[1100]
    let nurtureAdj = oldPoints[1200]
    let blessAdj = oldPoints[1300]
    let hastenAdj = oldPoints[1400]
    let cleanseAdj = oldPoints[1500]

    
    
    return (
        <div >
            {/* <Typography color="secondary" align="center" variant="subtitle1"> {charObject ? charObject["name"] : nft.name.substring(18)} </Typography> */}
            



                {/* <div style={{position: "relative"}}>

                {trees.map((tree, index) => {
                    let radians = 2*Math.PI*(index/trees.length);
                    return (
                        <div style={{position: "absolute", left: (-(Math.sin(radians)*windowSize[0]/3) + (windowSize[0]/2.3)), top: (-(Math.cos(radians)*200) + (500))}}>
                            <Button style={{position: "absolute", width: "5%"}} onClick={() => setTree(tree)}>
                                <img src={"/dragonshorde/trees/" + tree.skill1.title + ".svg"} style={{width: "100%"}}/>
                            </Button>
                        </div>
                    )
                })}

                </div> */}

                <div style={{marginTop: 100, marginBottom: 50}}>
                    <Typography color="secondary" align="center" variant="h4" style={{fontFamily: "Jacques", margin: 20}}> {charObject.name} </Typography>
                    <img style={{width: "50%", borderRadius: 5, display: "flex", margin: "auto", maxWidth: 500}} src={nftUrl} />
                    
                </div>

                <div style={{marginLeft: "25vw", marginRight: "25vw"}}>
                    <BorderLinearProgress variant="determinate" style={{marginRight: 10, marginLeft: 10}} value={((xp - prevLvl) / (nextLvl - prevLvl)) * 100} />
                    <Typography align="center" variant="caption" style={{fontFamily: "Jacques", display: "grid", color: "#FFFFFF"}}> {xp} / {nextLvl} </Typography>

                    <Typography align="center" variant="h6" style={{fontFamily: "Jacques", display: "grid", margin: 10, color: "#FFFFFF"}}> Level {level} </Typography>
                </div>

                

                {action ?
                <Typography color="secondary" align="center" variant="subtitle1" style={{fontFamily: "Jacques", margin: 20, padding: 20, border: "1px solid white", borderRadius: 15}}>  {action.move.name} <ArrowForwardIcon /> {action.target} </Typography>
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
                    {charObject["bleed"] + bleedAdj > 0 ? 
                        <Grid item xs={3} sm={3} md={3}>
                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/trees/Bleed.svg"} />
                        <Typography color="secondary" align="center" variant="subtitle1" style={{color: bleedAdj > 0 ? "#4EC83E" : "#FFFFFF"}}> {charObject.bleed + bleedAdj} </Typography>
                    </Grid>                                :
                    null
                    }
                    {charObject["bless"] + blessAdj > 0 ? 
                        <Grid item xs={3} sm={3} md={3}>
                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/trees/Bless.svg"} />
                        <Typography color="secondary" align="center" variant="subtitle1" style={{color: blessAdj > 0 ? "#4EC83E" : "#FFFFFF"}}> {charObject.bless + blessAdj} </Typography>
                    </Grid>                                :
                    null
                    }
                    {charObject["burn"] + burnAdj > 0 ? 
                        <Grid item xs={3} sm={3} md={3}>
                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/trees/Burn.svg"} />
                        <Typography color="secondary" align="center" variant="subtitle1" style={{color: burnAdj > 0 ? "#4EC83E" : "#FFFFFF"}}> {charObject.burn + burnAdj} </Typography>
                    </Grid>                                :
                    null
                    }
                    {charObject["cleanse"] + cleanseAdj > 0 ? 
                        <Grid item xs={3} sm={3} md={3}>
                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/trees/Cleanse.svg"} />
                        <Typography color="secondary" align="center" variant="subtitle1" style={{color: cleanseAdj > 0 ? "#4EC83E" : "#FFFFFF"}}> {charObject.cleanse + cleanseAdj} </Typography>
                    </Grid>                                :
                    null
                    }
                    {charObject["doom"] + doomAdj > 0 ? 
                        <Grid item xs={3} sm={3} md={3}>
                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/trees/Doom.svg"} />
                        <Typography color="secondary" align="center" variant="subtitle1" style={{color: doomAdj > 0 ? "#4EC83E" : "#FFFFFF"}}> {charObject.doom + doomAdj} </Typography>
                    </Grid>                                :
                    null
                    }
                    {charObject["drown"] + drownAdj > 0 ? 
                        <Grid item xs={3} sm={3} md={3}>
                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/trees/Drown.svg"} />
                        <Typography color="secondary" align="center" variant="subtitle1" style={{color: drownAdj > 0 ? "#4EC83E" : "#FFFFFF"}}> {charObject.drown + drownAdj} </Typography>
                    </Grid>                                :
                    null
                    }
                    {charObject["empower"] + empowerAdj > 0 ? 
                        <Grid item xs={3} sm={3} md={3}>
                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/trees/Empower.svg"} />
                        <Typography color="secondary" align="center" variant="subtitle1" style={{color: empowerAdj > 0 ? "#4EC83E" : "#FFFFFF"}}> {charObject.empower + empowerAdj} </Typography>
                    </Grid>                                :
                    null
                    }
                    {charObject["focus"] + focusAdj > 0 ? 
                        <Grid item xs={3} sm={3} md={3}>
                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/trees/Focus.svg"} />
                        <Typography color="secondary" align="center" variant="subtitle1" style={{color: focusAdj > 0 ? "#4EC83E" : "#FFFFFF"}}> {charObject.focus + focusAdj} </Typography>
                    </Grid>                                :
                    null
                    }
                    {charObject["freeze"] + freezeAdj > 0 ? 
                        <Grid item xs={3} sm={3} md={3}>
                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/trees/Freeze.svg"} />
                        <Typography color="secondary" align="center" variant="subtitle1" style={{color: freezeAdj > 0 ? "#4EC83E" : "#FFFFFF"}}> {charObject.freeze + freezeAdj} </Typography>
                    </Grid>                                :
                    null
                    }
                    {charObject["hasten"] + hastenAdj > 0 ? 
                        <Grid item xs={3} sm={3} md={3}>
                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/trees/Hasten.svg"} />
                        <Typography color="secondary" align="center" variant="subtitle1" style={{color: hastenAdj > 0 ? "#4EC83E" : "#FFFFFF"}}> {charObject.hasten + hastenAdj} </Typography>
                    </Grid>                                :
                    null
                    }
                    {charObject["nurture"] + nurtureAdj > 0 ? 
                        <Grid item xs={3} sm={3} md={3}>
                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/trees/Nurture.svg"} />
                        <Typography color="secondary" align="center" variant="subtitle1" style={{color: nurtureAdj > 0 ? "#4EC83E" : "#FFFFFF"}}> {charObject.nurture + nurtureAdj} </Typography>
                    </Grid>                                :
                    null
                    }
                    {charObject["paralyze"] + paralyzeAdj > 0 ? 
                        <Grid item xs={3} sm={3} md={3}>
                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/trees/Paralyze.svg"} />
                        <Typography color="secondary" align="center" variant="subtitle1" style={{color: paralyzeAdj > 0 ? "#4EC83E" : "#FFFFFF"}}> {charObject.paralyze + paralyzeAdj} </Typography>
                    </Grid>                                :
                    null
                    }
                    {charObject["poison"] + poisonAdj > 0 ? 
                        <Grid item xs={3} sm={3} md={3}>
                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/trees/Poison.svg"} />
                        <Typography color="secondary" align="center" variant="subtitle1" style={{color: poisonAdj > 0 ? "#4EC83E" : "#FFFFFF"}}> {charObject.poison + poisonAdj} </Typography>
                    </Grid>                                :
                    null
                    }
                    {charObject["shield"] + shieldAdj > 0 ? 
                        <Grid item xs={3} sm={3} md={3}>
                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/trees/Shield.svg"} />
                        <Typography color="secondary" align="center" variant="subtitle1" style={{color: shieldAdj > 0 ? "#4EC83E" : "#FFFFFF"}}> {charObject.shield + shieldAdj} </Typography>
                    </Grid>                                :
                    null
                    }
                    {charObject["slow"] + slowAdj > 0 ? 
                        <Grid item xs={3} sm={3} md={3}>
                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/trees/Slow.svg"} />
                        <Typography color="secondary" align="center" variant="subtitle1" style={{color: slowAdj > 0 ? "#4EC83E" : "#FFFFFF"}}> {charObject.slow + slowAdj} </Typography>
                    </Grid>                                :
                    null
                    }
                    {charObject["strengthen"] + strengthenAdj > 0 ? 
                    <Grid item xs={3} sm={3} md={3}>
                        <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/trees/Strengthen.svg"} />
                        <Typography color="secondary" align="center" variant="subtitle1" style={{color: strengthenAdj > 0 ? "#4EC83E" : "#FFFFFF"}}> {charObject.strengthen + strengthenAdj} </Typography>
                    </Grid>
                    :
                    null
                    }

                    
            
                </Grid>


                <Grid container>

                {charObject.moves.length > 0 ? 
                    charObject.moves.map((move, index) => {
                        let bonus = 0
                        if (move.effect == "bleed") {
                            bonus = bleedAdj
                        }
                        else if (move.effect == "bless") {
                            bonus = blessAdj
                        }
                        else if (move.effect == "burn") {
                            bonus = burnAdj
                        }
                        else if (move.effect == "cleanse") {
                            bonus = cleanseAdj
                        }
                        else if (move.effect == "doom") {
                            bonus = doomAdj
                        }
                        else if (move.effect == "drown") {
                            bonus = drownAdj
                        }
                        else if (move.effect == "empower") {
                            bonus = empowerAdj
                        }
                        else if (move.effect == "focus") {
                            bonus = focusAdj
                        }
                        else if (move.effect == "freeze") {
                            bonus = freezeAdj
                        }
                        else if (move.effect == "hasten") {
                            bonus = hastenAdj
                        }
                        else if (move.effect == "nurture") {
                            bonus = nurtureAdj
                        }
                        else if (move.effect == "paralyze") {
                            bonus = paralyzeAdj
                        }
                        else if (move.effect == "poison") {
                            bonus = poisonAdj
                        }
                        else if (move.effect == "shield") {
                            bonus = shieldAdj
                        }
                        else if (move.effect == "slow") {
                            bonus = slowAdj
                        }
                        else if (move.effect == "strengthen") {
                            bonus = strengthenAdj
                        }
                        if (move.type){
                            return (
                                <Grid item sm={6} md={6} lg={3} key={index} style={{border: "1px solid white", padding: 20, borderRadius: 15}}>
                                    <Typography color="secondary" align="center" variant="subtitle1" style={{fontFamily: "Jacques", margin: 20}}> {move.name} </Typography>
                                    <img src={move.url} style={{width: "50%", maxWidth: 400, display: "flex", margin: "auto"}} />
                                    <br />

                                    <Grid container align="space" justifyContent="center">
                                        <Grid item xs={12} style={{}}>
                                            {move.type.substring(0,5) == "melee" ? 
                                            <img style={{zIndex: 10, width: 100, minWidth: 50, maxWidth: 60, borderRadius: 5, padding: 5, display: "flex", margin: "auto"}} src={"/dragonshorde/strength.svg"} />
                                            :
                                            null
                                            }
                                            {move.type.substring(0,6) == "ranged" ? 
                                            <img style={{zIndex: 10, width: 100, minWidth: 50, maxWidth: 60, borderRadius: 5, padding: 5, display: "flex", margin: "auto"}} src={"/dragonshorde/dexterity.svg"} />
                                            :
                                            null
                                            }
                                            {move.type.substring(0,5) == "magic" ? 
                                            <img style={{zIndex: 10, width: 100, minWidth: 50, maxWidth: 60, borderRadius: 5, padding: 5, display: "flex", margin: "auto"}} src={"/dragonshorde/intelligence.svg"} />
                                            :
                                            null
                                            }
                                        </Grid>
                                        
                                        
                                    </Grid>

                                    <Typography color="secondary" align="center" variant="subtitle1"> {move.type} </Typography>
                                    

                                    <Grid container style={{marginTop: 10, marginBottom: 10, padding: 10}}>
                                        <Grid item xs={6}>
                                            <img style={{zIndex: 10, width: 100, minWidth: 40, maxWidth: 60, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/power.svg"} />
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
                                            <img style={{zIndex: 10, width: 100, minWidth: 40, maxWidth: 60, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/accuracy.svg"} />
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
                                        <Typography color="secondary" align="center" variant="subtitle2" style={{margin: 10, color: bonus > 0 ? "#4EC83E" : null}}> Apply {(charObject[move.effect] + bonus) * 2} {move.effect} </Typography>
                                    :
                                        <Typography color="secondary" align="center" variant="subtitle2" style={{margin: 10, color: bonus > 0 ? "#4EC83E" : null}}> Apply {Math.ceil((charObject[move.effect] + bonus) / 2)} {move.effect} </Typography>
                                    }

                                        <Grid item xs={5}>
                                            {move.effect == "bleed" ? 
                                            
                                            <img style={{zIndex: 10, height: 100, minHeight: 40, maxHeight: 50, borderRadius: 5, padding: 5}} src={"/dragonshorde/trees/Bleed.svg"} />
                                            :
                                            null
                                            }
                                            {move.effect == "bless" ? 
                                            <img style={{zIndex: 10, height: 100, minHeight: 40, maxHeight: 50, borderRadius: 5, padding: 5}} src={"/dragonshorde/trees/Bless.svg"} />
                                            :
                                            null
                                            }
                                            {move.effect == "burn" ? 
                                            <img style={{zIndex: 10, height: 100, minHeight: 40, maxHeight: 50, borderRadius: 5, padding: 5}} src={"/dragonshorde/trees/Burn.svg"} />
                                            :
                                            null
                                            }
                                            {move.effect == "cleanse" ? 
                                            <img style={{zIndex: 10, height: 100, minHeight: 40, maxHeight: 50, borderRadius: 5, padding: 5}} src={"/dragonshorde/trees/Cleanse.svg"} />
                                            :
                                            null
                                            }
                                            {move.effect == "doom" ? 
                                            <img style={{zIndex: 10, height: 100, minHeight: 40, maxHeight: 50, borderRadius: 5, padding: 5}} src={"/dragonshorde/trees/Doom.svg"} />
                                            :
                                            null
                                            }
                                            {move.effect == "drown" ? 
                                            <img style={{zIndex: 10, height: 100, minHeight: 40, maxHeight: 50, borderRadius: 5, padding: 5}} src={"/dragonshorde/trees/Drown.svg"} />
                                            :
                                            null
                                            }
                                            {move.effect == "empower" ? 
                                            <img style={{zIndex: 10, height: 100, minHeight: 40, maxHeight: 50, borderRadius: 5, padding: 5}} src={"/dragonshorde/trees/Empower.svg"} />
                                            :
                                            null
                                            }
                                            {move.effect == "focus" ? 
                                            <img style={{zIndex: 10, height: 100, minHeight: 40, maxHeight: 50, borderRadius: 5, padding: 5}} src={"/dragonshorde/trees/Focus.svg"} />
                                            :
                                            null
                                            }
                                            {move.effect == "freeze" ? 
                                            <img style={{zIndex: 10, height: 100, minHeight: 40, maxHeight: 50, borderRadius: 5, padding: 5}} src={"/dragonshorde/trees/Freeze.svg"} />
                                            :
                                            null
                                            }
                                            {move.effect == "hasten" ? 
                                            <img style={{zIndex: 10, height: 100, minHeight: 40, maxHeight: 50, borderRadius: 5, padding: 5}} src={"/dragonshorde/trees/Hasten.svg"} />
                                            :
                                            null
                                            }
                                            {move.effect == "nurture" ? 
                                            <img style={{zIndex: 10, height: 100, minHeight: 40, maxHeight: 50, borderRadius: 5, padding: 5}} src={"/dragonshorde/trees/Nurture.svg"} />
                                            :
                                            null
                                            }
                                            {move.effect == "paralyze" ? 
                                            <img style={{zIndex: 10, height: 100, minHeight: 40, maxHeight: 50, borderRadius: 5, padding: 5}} src={"/dragonshorde/trees/Paralyze.svg"} />
                                            :
                                            null
                                            }
                                            {move.effect == "poison" ? 
                                            <img style={{zIndex: 10, height: 100, minHeight: 40, maxHeight: 50, borderRadius: 5, padding: 5}} src={"/dragonshorde/trees/Poison.svg"} />
                                            :
                                            null
                                            }
                                            {move.effect == "shield" ? 
                                            <img style={{zIndex: 10, height: 100, minHeight: 40, maxHeight: 50, borderRadius: 5, padding: 5}} src={"/dragonshorde/trees/Shield.svg"} />
                                            :
                                            null
                                            }
                                            {move.effect == "slow" ? 
                                            <img style={{zIndex: 10, height: 100, minHeight: 40, maxHeight: 50, borderRadius: 5, padding: 5}} src={"/dragonshorde/trees/Slow.svg"} />
                                            :
                                            null
                                            }
                                            {move.effect == "strengthen" ? 
                                            <img style={{zIndex: 10, height: 100, minHeight: 40, maxHeight: 50, borderRadius: 5, padding: 5}} src={"/dragonshorde/trees/Strengthen.svg"} />
                                            :
                                            null
                                            }
                                        </Grid>

                                    <Typography color="secondary" align="center" variant="subtitle2" style={{margin: 10}}> {move.description} </Typography>

                                    <br />

                                    
                                    
                                </Grid>
                            )
                        }
                        else {
                            return(
                                <div></div>
                            )
                        }
                        
                    })
                    :
                    null
                }
                </Grid>
                 <br />
                 <br />
                 <Typography color="secondary" align="center" variant="h4" style={{fontFamily: "Jacques", margin: 20}}> Skill Tree </Typography>

                 <br />
                 <br />
                <Grid container style={{}}>

                    {trees.map((treeNode, index) => {
                        return (
                            <Grid key={index} item xs={3} sm={12/8} md={6/8} style={{}}>
                                <Button style={{width: "5%"}} onClick={() => treeNode == tree ? setTree(null) : setTree(treeNode)}>
                                    <img src={"/dragonshorde/trees/" + treeNode.skill1.title + ".svg"} style={{width: "100%"}}/>
                                </Button>
                            </Grid>
                        )
                    })}

                    </Grid>

                    <br />
                    <br />


                    {tree ? 
                    <Grid container >
                        <Grid item xs={12} sm={12} >
                                <img src={"/dragonshorde/trees/" + tree.skill1.title + ".svg"} style={{width: "20%", display: "flex", margin: "auto"}}/>
                                <Typography color="secondary" align="center" variant="subtitle1" style={{marginTop: 10, paddingLeft: 30, paddingRight: 30}}> {tree.skill1.title} Practice </Typography>
                                <Typography color="secondary" align="center" variant="subtitle1" style={{display: "grid", margin: "auto", textTransform: 'none', paddingLeft: 30, paddingRight: 30}}> {tree.skill1.effect} </Typography>
                                <Button style={{display: "flex", margin: "auto"}} onClick={() => assignPoints(tree.skill1.byte, "plus", tree.skill1.maxLevel, 0)}>
                                    <AddIcon style={{color: "#FFFFFF"}}/>
                                </Button>
                                <Typography color="secondary" align="center" variant="subtitle1" style={{display: "grid", margin: "auto"}}> {points[tree.skill1.byte]} / {tree.skill1.maxLevel} </Typography>
                                <Button style={{display: "flex", margin: "auto"}} onClick={() => assignPoints(tree.skill1.byte, "minus", tree.skill1.maxLevel, 0)}>
                                    <RemoveIcon style={{color: "#FFFFFF"}}/>
                                </Button>
                                <Typography color="secondary" align="center" variant="subtitle1" style={{display: "grid", margin: "auto", paddingLeft: 30, paddingRight: 30}}> {incrementNumbers(tree.skill1.effect, tree.skill1.byte)} </Typography>

                        </Grid>
                        <Grid item xs={6} sm={6} >
                                <img src={"/dragonshorde/trees/tier1/" + tree.skill2.title + ".svg"} style={{height: 100, display: "flex", margin: "auto"}}/>
                                <Typography color="secondary" align="center" variant="subtitle1" style={{marginTop: 10, paddingLeft: 30, paddingRight: 30}}> {tree.skill2.title} </Typography>
                                <Typography color="secondary" align="center" variant="subtitle1" style={{display: "grid", margin: "auto", textTransform: 'none', paddingLeft: 30, paddingRight: 30}}> {tree.skill2.effect} </Typography>
                                <Button style={{display: "flex", margin: "auto"}} onClick={() => assignPoints(tree.skill2.byte, "plus", tree.skill2.maxLevel, 1)}>
                                    <AddIcon style={{color: "#FFFFFF"}}/>
                                </Button>
                                <Typography color="secondary" align="center" variant="subtitle1" style={{display: "grid", margin: "auto"}}> {points[tree.skill2.byte]} / {tree.skill2.maxLevel} </Typography>
                                <Button style={{display: "flex", margin: "auto"}} onClick={() => assignPoints(tree.skill2.byte, "minus", tree.skill2.maxLevel, 1)}>
                                    <RemoveIcon style={{color: "#FFFFFF"}}/>
                                </Button>
                                <Typography color="secondary" align="center" variant="subtitle1" style={{display: "grid", margin: "auto", paddingLeft: 30, paddingRight: 30}}> {incrementNumbers(tree.skill2.effect, tree.skill2.byte)} </Typography>

                        </Grid>
                        <Grid item xs={6} sm={6} >
                                <img src={"/dragonshorde/trees/tier1/" + tree.skill3.title + ".svg"} style={{height: 100, display: "flex", margin: "auto"}}/>
                                <Typography color="secondary" align="center" variant="subtitle1" style={{marginTop: 10, paddingLeft: 30, paddingRight: 30}}> {tree.skill3.title}  </Typography>
                                <Typography color="secondary" align="center" variant="subtitle1" style={{display: "grid", margin: "auto", textTransform: 'none', paddingLeft: 30, paddingRight: 30}}> {tree.skill3.effect} </Typography>
                                <Button style={{display: "flex", margin: "auto"}} onClick={() => assignPoints(tree.skill3.byte, "plus", tree.skill3.maxLevel, 1)}>
                                    <AddIcon style={{color: "#FFFFFF"}}/>
                                </Button>
                                <Typography color="secondary" align="center" variant="subtitle1" style={{display: "grid", margin: "auto"}}> {points[tree.skill3.byte]} / {tree.skill3.maxLevel} </Typography>
                                <Button style={{display: "flex", margin: "auto"}} onClick={() => assignPoints(tree.skill3.byte, "minus", tree.skill3.maxLevel, 1)}>
                                    <RemoveIcon style={{color: "#FFFFFF"}}/>
                                </Button>
                                <Typography color="secondary" align="center" variant="subtitle1" style={{display: "grid", margin: "auto", paddingLeft: 30, paddingRight: 30}}> {incrementNumbers(tree.skill3.effect, tree.skill3.byte)} </Typography>

                        </Grid>
                        
                    </Grid>
                    :
                    null
                    }

                    <br />
                    <br />
                    <br />
                    {!arraysEqual(points, oldPoints) ?
                        <Button variant="contained" color="secondary" style={{display: "flex", margin: "auto"}} onClick={() => applyPoints()}>
                            <Typography color="primary" align="center" variant="subtitle1" style={{display: "grid", margin: "auto"}}> Apply </Typography>
                        </Button>
                        :
                        null
                    }
                    
                    <br />
                    <br />
                    <br />

            
        </div>

    )
                     
    }

}