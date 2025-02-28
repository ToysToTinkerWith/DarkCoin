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

    const [windowSize, setWindowSize] = useState([
        0,
        0,
      ]);

    const [ tree, setTree ] = useState(null)
    const [ points, setPoints ] = useState(new Uint8Array(1600))
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
    
    React.useEffect(() => {

        const fetchData = async () => {

            try {

                console.log(Number(router.query.id))
        
        let response = await fetch('/api/getNft', {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                nftId: Number(router.query.id)
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

        console.log(txns)

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

        if (Number(router.query.id)) {
            fetchData();
        }

        
        
    
    
    

        

    }, [router])

    const assignPoints = (byte, action, max, tier) => {

        let treeByte = Math.floor(byte / 100)

        console.log(treeByte)

        let newPoints = points.slice()

        if (tier == 1) {
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
            console.log(token.slice(token.length - 1))

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

    console.log(points)
    
    return (
        <div style={{position: "relative"}}>
            {/* <Typography color="secondary" align="center" variant="subtitle1"> {charObject ? charObject["name"] : nft.name.substring(18)} </Typography> */}
            


            {trees.map((tree, index) => {
                let radians = 2*Math.PI*(index/trees.length);
                return (
                    <div style={{position: "absolute", left: (-(Math.sin(radians)*windowSize[0]/3) + (windowSize[0]/2.3)), top: (-(Math.cos(radians)*200) + (100))}}>
                        <Button style={{position: "absolute", width: "5%"}} onClick={() => setTree(tree)}>
                            <img src={"/dragonshorde/trees/" + tree.skill1.title + ".svg"} style={{width: "100%"}}/>
                        </Button>
                    </div>
                )
            })}

            
            
                           
               <div style={{marginTop: 100, marginBottom: 200}}>
                    <Typography color="secondary" align="center" variant="subtitle1" style={{margin: 20}}> {charObject.name} </Typography>
                    <img style={{width: "20%", borderRadius: 5, display: "flex", margin: "auto", maxWidth: 200}} src={nftUrl} />
                </div>

                {tree ? 
                <Grid container >
                    <Grid item xs={12} sm={12} >
                            <img src={"/dragonshorde/trees/" + tree.skill1.title + ".svg"} style={{width: "20%", display: "flex", margin: "auto"}}/>
                            <Typography color="secondary" align="center" variant="subtitle1" style={{marginTop: 10}}> {tree.skill1.title} Practice </Typography>
                            <Typography color="secondary" align="center" variant="subtitle1" style={{display: "grid", margin: "auto", textTransform: 'none'}}> {tree.skill1.effect} </Typography>
                            <Button style={{display: "flex", margin: "auto"}} onClick={() => assignPoints(tree.skill1.byte, "plus", tree.skill1.maxLevel, 0)}>
                                <AddIcon style={{color: "#FFFFFF"}}/>
                            </Button>
                            <Typography color="secondary" align="center" variant="subtitle1" style={{display: "grid", margin: "auto"}}> {points[tree.skill1.byte]} / {tree.skill1.maxLevel} </Typography>
                            <Button style={{display: "flex", margin: "auto"}} onClick={() => assignPoints(tree.skill1.byte, "minus", tree.skill1.maxLevel, 0)}>
                                <RemoveIcon style={{color: "#FFFFFF"}}/>
                            </Button>
                            <Typography color="secondary" align="center" variant="subtitle1" style={{display: "grid", margin: "auto"}}> {incrementNumbers(tree.skill1.effect, tree.skill1.byte)} </Typography>

                    </Grid>
                    <Grid item xs={6} sm={6} >
                            <img src={"/dragonshorde/trees/tier1/" + tree.skill2.title + ".svg"} style={{height: 100, display: "flex", margin: "auto"}}/>
                            <Typography color="secondary" align="center" variant="subtitle1" style={{marginTop: 10}}> {tree.skill2.title} </Typography>
                            <Typography color="secondary" align="center" variant="subtitle1" style={{display: "grid", margin: "auto", textTransform: 'none'}}> {tree.skill2.effect} </Typography>
                            <Button style={{display: "flex", margin: "auto"}} onClick={() => assignPoints(tree.skill2.byte, "plus", tree.skill2.maxLevel, 1)}>
                                <AddIcon style={{color: "#FFFFFF"}}/>
                            </Button>
                            <Typography color="secondary" align="center" variant="subtitle1" style={{display: "grid", margin: "auto"}}> {points[tree.skill2.byte]} / {tree.skill2.maxLevel} </Typography>
                            <Button style={{display: "flex", margin: "auto"}} onClick={() => assignPoints(tree.skill2.byte, "minus", tree.skill2.maxLevel, 1)}>
                                <RemoveIcon style={{color: "#FFFFFF"}}/>
                            </Button>
                            <Typography color="secondary" align="center" variant="subtitle1" style={{display: "grid", margin: "auto"}}> {incrementNumbers(tree.skill2.effect, tree.skill2.byte)} </Typography>

                    </Grid>
                    <Grid item xs={6} sm={6} >
                            <img src={"/dragonshorde/trees/tier1/" + tree.skill3.title + ".svg"} style={{height: 100, display: "flex", margin: "auto"}}/>
                            <Typography color="secondary" align="center" variant="subtitle1" style={{marginTop: 10}}> {tree.skill3.title}  </Typography>
                            <Typography color="secondary" align="center" variant="subtitle1" style={{display: "grid", margin: "auto", textTransform: 'none'}}> {tree.skill3.effect} </Typography>
                            <Button style={{display: "flex", margin: "auto"}} onClick={() => assignPoints(tree.skill3.byte, "plus", tree.skill3.maxLevel, 1)}>
                                <AddIcon style={{color: "#FFFFFF"}}/>
                            </Button>
                            <Typography color="secondary" align="center" variant="subtitle1" style={{display: "grid", margin: "auto"}}> {points[tree.skill3.byte]} / {tree.skill3.maxLevel} </Typography>
                            <Button style={{display: "flex", margin: "auto"}} onClick={() => assignPoints(tree.skill3.byte, "minus", tree.skill3.maxLevel, 1)}>
                                <RemoveIcon style={{color: "#FFFFFF"}}/>
                            </Button>
                            <Typography color="secondary" align="center" variant="subtitle1" style={{display: "grid", margin: "auto"}}> {incrementNumbers(tree.skill3.effect, tree.skill3.byte)} </Typography>

                    </Grid>
                    
                </Grid>
                :
                null
                }

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
                        if (move.type){
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

                                    <br />
                                    
                                </div>
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

            
        </div>

    )
                     
    }

}