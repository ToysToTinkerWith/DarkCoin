import React, {useState, useEffect} from "react"


import algosdk from "algosdk"

import { Grid, Typography, Button, Card, styled, LinearProgress, linearProgressClasses } from "@mui/material"

import { useWallet } from '@txnlab/use-wallet'

import DisplayChar from "../../components/contracts/Arena/DisplayChar"

import FeedIcon from '@mui/icons-material/Feed';


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

export default function DragonsHorde(props) {

    const { activeAccount, signTransactions, sendTransactions } = useWallet()

    const [dcChars, setDcChars] = useState([])

    const [brawlChars, setBrawlChars] = useState([])

    const [drag, setDrag] = useState(null)
    const [hover, setHover] = useState(false)

    const [char, setChar] = useState(null)
    const [moveSelect, setMoveSelect] = useState(null)
    const [target, setTarget] = useState(null)

    const [horde, setHorde] = useState(null)


    const [windowSize, setWindowSize] = useState([
        0,
        0,
      ]);

    const [ rules ] = useState({
        poisoned: "Loses 1 health.",
        bleeding: "Loses 0.7 health, 0.1 strength.",
        burned: "Loses 0.5 health, 0.1 intelligence. Gains 0.1 strength, 0.2 speed.",
        frozen: "Loses 0.2 speed, 0.2 dexterity.",
        slowed: "Loses 0.3 speed, 0.1 dexterity.",
        paralyzed: "0.5% chance to not be able to move.",
        drowned: "Loses 0.3 dexterity, 0.1 accuracy.",
        doomed: "Loses 0.3 health, 0.2 resist, 0.2 intelligence.",

        shielded: "Blocks 1 physical damage.",
        strengthened: "Gain 0.3 strength.",
        empowered: "Gain 0.3 intelligence.",
        hastened: "Gain 0.3 dexterity, 0.1 speed.",
        nurtured: "Gain 0.5 health regen.",
        blessed: "Gain 0.2 strength, 0.2 intelligence, 0.1 resist.",
        focused: "Gain 0.5 accuracy",
        cleansed: "Removes 1 negative effect."


    })

    const [showRules, setShowRules] = useState(false)

    const byteArrayToLong = (byteArray) => {
        var value = 0;
        for ( var i = 0; i < byteArray.length; i++) {
            value = (value * 256) + byteArray[i];
        }
    
        return value;
    };

    React.useEffect(() => {

       

        const fetchData = async () => {

            try {
         
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

                    const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)

                    const contractBoxes = await indexerClient
                    .searchForApplicationBoxes(props.contracts.dragonshorde)
                    .limit(1000)
                    .do();

                    let brawlers = []


                    contractBoxes.boxes.forEach((box) => {
                        if (box.name.length == 8) {
                            let assetId = byteArrayToLong(box.name)
                        
                            brawlers.push(assetId)
                        }
                        
                    })

                    setBrawlChars(brawlers)

                    const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)

                    try {

                    let dragResponse = await client.getApplicationBoxByName(1870514811, "dragon").do();

                    let string = new TextDecoder().decode(dragResponse.value)

                    let dragObject = JSON.parse(string)

                    setDrag(dragObject)
                    }
                    catch {
                        setDrag(null)
                    }

                    const address = "SSG6DFUAQEUI7CX4PMPIXL2G23S5EAMQCDOCDQ5OFUHECPWTYYPDFNHEJQ";

                    const accountAssets = await indexerClient.lookupAccountAssets(address).do();

                    console.log(accountAssets.assets[0])

                    let darkcoin

                    accountAssets.assets.forEach((asset) => {
                        if (asset["asset-id"] == 1088771340) {
                            darkcoin = asset.amount
                        }
                    })

                    setHorde(darkcoin)

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
        fetchData();

    
        

    
    }, [activeAccount])

    const attack = async (target) => {

        try {

            let attackObject = {
                attacker: char,
                target: target,
                move: moveSelect
            }

            let attackString = JSON.stringify(attackObject)

            const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)  
                  
            let params = await client.getTransactionParams().do()
    
            const appArgs = []
    
            const accounts = []
            const foreignApps = []
                
            const foreignAssets = [char]
    
            let assetInt = longToByteArray(char)
          
            let assetBox = new Uint8Array([...assetInt, ...new Uint8Array(Buffer.from("action"))])    
          
            const boxes = [{appIndex: 0, name: assetBox}]
    
            props.setMessage("Sign Transaction...")
    
            appArgs.push(
                new Uint8Array(Buffer.from("attack")),
                new Uint8Array(Buffer.from(attackString))
            )
    
            let txn = algosdk.makeApplicationNoOpTxn(activeAccount.address, params, props.contracts.dragonshorde, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
    
            let encoded = algosdk.encodeUnsignedTransaction(txn)
        
            const signedTransactions = await signTransactions([encoded])
    
            props.setMessage("Sending Transaction...")
    
            const { id } = await sendTransactions(signedTransactions)
    
            let confirmedTxn = await algosdk.waitForConfirmation(client, id, 4);
    
            props.setMessage("Transaction Confirmed, Action in Queue.")

            setChar(null)
            setMoveSelect(null)
    
            
        }
        catch(error) {
            props.setMessage(String(error))
            await props.sendDiscordMessage(error, "Brawl Action", activeAccount.address)
           }

      }

    
        let healthAdj = 0
        let speedAdj = 0
        let resistAdj = 0
        let strengthAdj = 0
        let dexterityAdj = 0
        let intelligenceAdj = 0
        let accuracyAdj = 0

        if (drag) {

        if (drag.effects["poison"]) {
            healthAdj -= drag.effects["poison"] * 1
        }
        if (drag.effects["bleed"]) {
            healthAdj -= drag.effects["bleed"] * 0.7
            strengthAdj -= drag.effects["bleed"] * 0.1
        }
        if (drag.effects["burn"]) {
            healthAdj -= drag.effects["burn"] * 0.5
            intelligenceAdj -= drag.effects["burn"] * 0.1
            strengthAdj += drag.effects["burn"] * 0.1
            speedAdj += drag.effects["burn"] * 0.2
        }
        if (drag.effects["freeze"]) {
            speedAdj -= drag.effects["freeze"] * 0.2
            dexterityAdj -= drag.effects["freeze"] * 0.2
        }
        if (drag.effects["slow"]) {
            speedAdj -= drag.effects["slow"] * 0.3
            dexterityAdj -= drag.effects["slow"] * 0.1
        }
        if (drag.effects["paralyze"]) {
            accuracyAdj -= drag.effects["paralyze"] * 0.2
        }
        if (drag.effects["drown"]) {
            dexterityAdj -= drag.effects["drown"] * 0.3
            accuracyAdj -= drag.effects["drown"] * 0.1
        }
        if (drag.effects["doom"]) {
            healthAdj -= drag.effects["doom"] * 0.3
            resistAdj -= drag.effects["doom"] * 0.2
            intelligenceAdj -= drag.effects["doom"] * 0.2
        }

        
        if (drag.effects["strengthen"]) {
            strengthAdj += drag.effects["strengthen"] * 0.3
        }
        if (drag.effects["empower"]) {
            intelligenceAdj += drag.effects["empower"] * 0.3
        }
        if (drag.effects["hasten"]) {
            dexterityAdj += drag.effects["hasten"] * 0.3
            speedAdj += drag.effects["hasten"] * 0.1
        }
        if (drag.effects["nurture"]) {
            healthAdj += drag.effects["nurture"] * 0.5
        }
        if (drag.effects["bless"]) {
            strengthAdj += drag.effects["bless"] * 0.2
            intelligenceAdj += drag.effects["bless"] * 0.2
            resistAdj += drag.effects["bless"] * 0.1
        }
        if (drag.effects["focus"]) {
            accuracyAdj += drag.effects["focus"] * 0.3
        }
    }
    console.log(drag)

    const now = new Date();

    let offset = now.getTimezoneOffset()

    console.log(offset / 60)

    console.log(now)

    // Get individual components
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();

    function decimalToHMS(decimalHours) {
        const hours = Math.floor(decimalHours);
        const minutes = Math.floor((decimalHours - hours) * 60);
        const seconds = Math.round(((decimalHours - hours) * 60 - minutes) * 60);
    
        return `${hours} hours, ${minutes} minutes, ${seconds} seconds`;
    }

    console.log((24 - ((hours + (minutes / 60) + (seconds / 3600) + (offset / 60) + 1) % 24)))

    // Format the time
    const timeString = `${hours}:${minutes}:${seconds}`;

    let timeLeft = decimalToHMS((24 - ((hours + (minutes / 60) + (seconds / 3600) + (offset / 60) + 1) % 24)))

    console.log(timeLeft)

    

    return (
        <div>
            <div style={{height: "130vh", width: "100vw", position: "relative"}}>

            <Typography color="secondary" align="center" variant="subtitle1"> Time til next round </Typography>

            <TimerBar variant="determinate" style={{display: "flex", margin: "auto", width: "50vw", color: "white"}} value={(((hours + (minutes / 60) + (seconds / 3600) + (offset / 60) + 1) % 24) / 24) * 100} />

            <Typography color="secondary" align="center" variant="subtitle1"> {timeLeft} </Typography>

                {brawlChars.length > 0 ? 
                brawlChars.map((nft, index) => {
                    return (
                        <div key={index} style={{position: "absolute"}}>
                            <DisplayChar attack={attack} setChar={setChar} setMoveSelect={setMoveSelect} char={char} moveSelect={moveSelect} dcChars={dcChars} nftId={nft} width={windowSize[0]} height={windowSize[1]} setNft={(nftId) => setCharSelect(nftId)} setMessage={props.setMessage} sendDiscordMessage={props.sendDiscordMessage} brawler={true} contracts={props.contracts} index={index} length={brawlChars.length} />
                            <br />
                        </div>
                    )
                })
                :
                null
                }

                {char ? 
                <Button variant="contained" color="secondary"  style={{display: "flex", margin: "auto"}} onClick={() => [setChar(null), setMoveSelect(null)]} >
                    <Typography color="primary" align="center" variant="subtitle1"> Cancel </Typography>
                </Button>
                :
                null
                }


                <div style={{position: "absolute", width: "5vw", left: "35vw", top: "60vh", display: "inline-flex"}}>
                    <Typography color="secondary" align="center" variant="subtitle1" style={{margin: 10}}> {String(Number(horde / 1000000).toFixed(0)).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} </Typography>
                    <img style={{width: 20}} src={"/invDC.svg"} />
                </div>

        
                {drag ?
                <Button onMouseOver={() => char && moveSelect != null ? null : setHover(true)} onMouseLeave={() => setHover(false)} onClick={() => char && moveSelect != null ? attack("dragon") : null} >
                <div style={{position: "absolute", width: "5vw", left: "40vw", top: "35vh"}}>
                    <img src={"/dragon.svg"} style={{width: "15vw", border: char && moveSelect != null ? "1px solid white" : null, borderRadius: 15}} />
                    <ProgressHealth variant="determinate" style={{width: "15vw", color: "white"}} value={(drag.currentHealth / drag.health) * 100} />


                   
                </div>

                
                {hover ? 
                <Card style={{zIndex: 10, position: "absolute", display: "grid", left: 0, backgroundColor: "black", width: 200, border: "1px solid white", left: "40vw", top: "50vh"}}>

                    <Typography color="secondary" align="center" variant="subtitle1" style={{margin: 20}}> {drag.name} </Typography>
                    <img style={{width: "100%", borderRadius: 5}} src={"/dragon.svg"} />

                    

                    <Grid container style={{padding: 20}}>
                        {drag.effects["bleed"] ? 
                            <Grid item xs={3} sm={3} md={3}>
                            <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/bleeding.svg"} />
                            <Typography color="secondary" align="center" variant="subtitle1"> {drag.effects.bleed} </Typography>
                        </Grid>                                :
                        null
                        }
                        {drag.effects["bless"] ? 
                            <Grid item xs={3} sm={3} md={3}>
                            <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/blessed.svg"} />
                            <Typography color="secondary" align="center" variant="subtitle1"> {drag.effects.bless} </Typography>
                        </Grid>                                :
                        null
                        }
                        {drag.effects["burn"] ? 
                            <Grid item xs={3} sm={3} md={3}>
                            <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/burned.svg"} />
                            <Typography color="secondary" align="center" variant="subtitle1"> {drag.effects.burn} </Typography>
                        </Grid>                                :
                        null
                        }
                        {drag.effects["cleanse"] ? 
                            <Grid item xs={3} sm={3} md={3}>
                            <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/cleansed.svg"} />
                            <Typography color="secondary" align="center" variant="subtitle1"> {drag.effects.cleanse} </Typography>
                        </Grid>                                :
                        null
                        }
                        {drag.effects["doom"] ? 
                            <Grid item xs={3} sm={3} md={3}>
                            <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/doomed.svg"} />
                            <Typography color="secondary" align="center" variant="subtitle1"> {drag.effects.doom} </Typography>
                        </Grid>                                :
                        null
                        }
                        {drag.effects["drown"] ? 
                            <Grid item xs={3} sm={3} md={3}>
                            <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/drowned.svg"} />
                            <Typography color="secondary" align="center" variant="subtitle1"> {drag.effects.drown} </Typography>
                        </Grid>                                :
                        null
                        }
                        {drag.effects["empower"] ? 
                            <Grid item xs={3} sm={3} md={3}>
                            <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/empowered.svg"} />
                            <Typography color="secondary" align="center" variant="subtitle1"> {drag.effects.empower} </Typography>
                        </Grid>                                :
                        null
                        }
                        {drag.effects["focus"] ? 
                            <Grid item xs={3} sm={3} md={3}>
                            <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/focused.svg"} />
                            <Typography color="secondary" align="center" variant="subtitle1"> {drag.effects.focus} </Typography>
                        </Grid>                                :
                        null
                        }
                        {drag.effects["freeze"] ? 
                            <Grid item xs={3} sm={3} md={3}>
                            <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/frozen.svg"} />
                            <Typography color="secondary" align="center" variant="subtitle1"> {drag.effects.freeze} </Typography>
                        </Grid>                                :
                        null
                        }
                        {drag.effects["hasten"] ? 
                            <Grid item xs={3} sm={3} md={3}>
                            <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/hastened.svg"} />
                            <Typography color="secondary" align="center" variant="subtitle1"> {drag.effects.hasten} </Typography>
                        </Grid>                                :
                        null
                        }
                        {drag.effects["nurture"] ? 
                            <Grid item xs={3} sm={3} md={3}>
                            <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/nurtured.svg"} />
                            <Typography color="secondary" align="center" variant="subtitle1"> {drag.effects.nurture} </Typography>
                        </Grid>                                :
                        null
                        }
                        {drag.effects["paralyze"] ? 
                            <Grid item xs={3} sm={3} md={3}>
                            <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/paralyzed.svg"} />
                            <Typography color="secondary" align="center" variant="subtitle1"> {drag.effects.paralyze} </Typography>
                        </Grid>                                :
                        null
                        }
                        {drag.effects["poison"] ? 
                            <Grid item xs={3} sm={3} md={3}>
                            <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/poisoned.svg"} />
                            <Typography color="secondary" align="center" variant="subtitle1"> {drag.effects.poison} </Typography>
                        </Grid>                                :
                        null
                        }
                        {drag.effects["shield"] ? 
                            <Grid item xs={3} sm={3} md={3}>
                            <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/shielded.svg"} />
                            <Typography color="secondary" align="center" variant="subtitle1"> {drag.effects.shield} </Typography>
                        </Grid>                                :
                        null
                        }
                        {drag.effects["slow"] ? 
                            <Grid item xs={3} sm={3} md={3}>
                            <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/slowed.svg"} />
                            <Typography color="secondary" align="center" variant="subtitle1"> {drag.effects.slow} </Typography>
                        </Grid>                                :
                        null
                        }
                        {drag.effects["strengthen"] ? 
                        <Grid item xs={3} sm={3} md={3}>
                            <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/strengthened.svg"} />
                            <Typography color="secondary" align="center" variant="subtitle1"> {drag.effects.strengthen} </Typography>
                        </Grid>
                        :
                        null
                        }

                        
                    
                    </Grid>

                    <Grid container style={{padding: 20}}> 
                        <Grid item xs={12}>
                            <img style={{zIndex: 10, width: String((50 / (props.length + 3))) + "vw", minWidth: 60, maxWidth: 80, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/health.svg"} />
                            <BorderLinearProgressHealth variant="determinate" style={{marginRight: 10, marginLeft: 10, color: "white"}} value={drag.currentHealth / drag.health * 100} />
                            {healthAdj == 0 ?
                                <Typography color="secondary" align="center" variant="subtitle1"> {Number(drag.currentHealth).toFixed(1)} </Typography>
                                :
                                healthAdj < 0 ?
                                <div>
                                <Typography color="secondary" align="center" variant="subtitle1"> {Number(drag.currentHealth).toFixed(1)} </Typography>
                                <Typography color="secondary" align="center" variant="subtitle1" style={{color: "#F8575A"}}> {healthAdj.toFixed(1)} </Typography>
                                </div>
                                :
                                <div>
                                <Typography color="secondary" align="center" variant="subtitle1"> {Number(drag.currentHealth).toFixed(1)} </Typography>
                                <Typography color="secondary" align="center" variant="subtitle1" style={{color: "#4EC83E"}}> + {healthAdj.toFixed(1)} </Typography>
                                </div>
                            }                        </Grid>
                        <Grid item xs={6}>
                            <img style={{zIndex: 10, width: String((50 / (props.length + 3))) + "vw", minWidth: 50, maxWidth: 70, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/speed.svg"} />
                            {speedAdj == 0 ?
                                <Typography color="secondary" align="center" variant="subtitle1"> {Number(drag.speed).toFixed(1)} </Typography>
                                :
                                speedAdj < 0 ?
                                <Typography color="secondary" align="center" variant="subtitle1" style={{color: "#F8575A"}}> {Number(drag.speed + speedAdj).toFixed(1)} </Typography>
                                :
                                <Typography color="secondary" align="center" variant="subtitle1" style={{color: "#4EC83E"}}> {Number(drag.speed + speedAdj).toFixed(1)} </Typography>
                            }
                        </Grid>
                        <Grid item xs={6}>
                            <img style={{zIndex: 10, width: String((50 / (props.length + 3))) + "vw", minWidth: 50, maxWidth: 70, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/resist.svg"} />
                            {resistAdj == 0 ?
                                <Typography color="secondary" align="center" variant="subtitle1"> {Number(drag.resist).toFixed(1)} </Typography>
                                :
                                resistAdj < 0 ?
                                <Typography color="secondary" align="center" variant="subtitle1" style={{color: "#F8575A"}}> {Number(drag.resist + resistAdj).toFixed(1)} </Typography>
                                :
                                <Typography color="secondary" align="center" variant="subtitle1" style={{color: "#4EC83E"}}> {Number(drag.resist + resistAdj).toFixed(1)} </Typography>
                            }
                        </Grid>
                    </Grid>

                    <Grid container style={{padding: 20}}>
                        <Grid item xs={4} sm={4} md={4}>
                            <img style={{zIndex: 10, width: String((50 / (props.length + 3))) + "vw", minWidth: 40, maxWidth: 60, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/strength.svg"} />
                            {strengthAdj == 0 ?
                                <Typography color="secondary" align="center" variant="subtitle1"> {Number(drag.strength).toFixed(1)} </Typography>
                                :
                                strengthAdj < 0 ?
                                <Typography color="secondary" align="center" variant="subtitle1" style={{color: "#F8575A"}}> {Number(drag.strength + strengthAdj).toFixed(1)} </Typography>
                                :
                                <Typography color="secondary" align="center" variant="subtitle1" style={{color: "#4EC83E"}}> {Number(drag.strength+ strengthAdj).toFixed(1)} </Typography>
                            }
                        </Grid>
                        <Grid item xs={4} sm={4} md={4}>
                            <img style={{zIndex: 10, width: String((50 / (props.length + 3))) + "vw", minWidth: 40, maxWidth: 60, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/dexterity.svg"} />
                            {dexterityAdj == 0 ?
                                <Typography color="secondary" align="center" variant="subtitle1"> {Number(drag.dexterity).toFixed(1)} </Typography>
                                :
                                dexterityAdj < 0 ?
                                <Typography color="secondary" align="center" variant="subtitle1" style={{color: "#F8575A"}}> {Number(drag.dexterity + dexterityAdj).toFixed(1)} </Typography>
                                :
                                <Typography color="secondary" align="center" variant="subtitle1" style={{color: "#4EC83E"}}> {Number(drag.dexterity + dexterityAdj).toFixed(1)} </Typography>
                            }
                        </Grid>
                        <Grid item xs={4} sm={4} md={4}>
                            <img style={{zIndex: 10, width: String((50 / (props.length + 3))) + "vw", minWidth: 40, maxWidth: 60, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/intelligence.svg"} />
                            {intelligenceAdj == 0 ?
                                <Typography color="secondary" align="center" variant="subtitle1"> {Number(drag.intelligence).toFixed(1)} </Typography>
                                :
                                intelligenceAdj < 0 ?
                                <Typography color="secondary" align="center" variant="subtitle1" style={{color: "#F8575A"}}> {Number(drag.intelligence + intelligenceAdj).toFixed(1)} </Typography>
                                :
                                <Typography color="secondary" align="center" variant="subtitle1" style={{color: "#4EC83E"}}> {Number(drag.intelligence + intelligenceAdj).toFixed(1)} </Typography>
                            }
                        </Grid>
                    </Grid>

                    <Grid container style={{padding: 20}}>
                        {drag["bleed"] ? 
                            <Grid item xs={3} sm={3} md={3}>
                            <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/bleeding.svg"} />
                            <Typography color="secondary" align="center" variant="subtitle1"> {drag.bleed} </Typography>
                        </Grid>                                :
                        null
                        }
                        {drag["bless"] ? 
                            <Grid item xs={3} sm={3} md={3}>
                            <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/blessed.svg"} />
                            <Typography color="secondary" align="center" variant="subtitle1"> {drag.bless} </Typography>
                        </Grid>                                :
                        null
                        }
                        {drag["burn"] ? 
                            <Grid item xs={3} sm={3} md={3}>
                            <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/burned.svg"} />
                            <Typography color="secondary" align="center" variant="subtitle1"> {drag.burn} </Typography>
                        </Grid>                                :
                        null
                        }
                        {drag["cleanse"] ? 
                            <Grid item xs={3} sm={3} md={3}>
                            <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/cleansed.svg"} />
                            <Typography color="secondary" align="center" variant="subtitle1"> {drag.cleanse} </Typography>
                        </Grid>                                :
                        null
                        }
                        {drag["doom"] ? 
                            <Grid item xs={3} sm={3} md={3}>
                            <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/doomed.svg"} />
                            <Typography color="secondary" align="center" variant="subtitle1"> {drag.doom} </Typography>
                        </Grid>                                :
                        null
                        }
                        {drag["drown"] ? 
                            <Grid item xs={3} sm={3} md={3}>
                            <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/drowned.svg"} />
                            <Typography color="secondary" align="center" variant="subtitle1"> {drag.drown} </Typography>
                        </Grid>                                :
                        null
                        }
                        {drag["empower"] ? 
                            <Grid item xs={3} sm={3} md={3}>
                            <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/empowered.svg"} />
                            <Typography color="secondary" align="center" variant="subtitle1"> {drag.empower} </Typography>
                        </Grid>                                :
                        null
                        }
                        {drag["focus"] ? 
                            <Grid item xs={3} sm={3} md={3}>
                            <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/focused.svg"} />
                            <Typography color="secondary" align="center" variant="subtitle1"> {drag.focus} </Typography>
                        </Grid>                                :
                        null
                        }
                        {drag["freeze"] ? 
                            <Grid item xs={3} sm={3} md={3}>
                            <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/frozen.svg"} />
                            <Typography color="secondary" align="center" variant="subtitle1"> {drag.freeze} </Typography>
                        </Grid>                                :
                        null
                        }
                        {drag["hasten"] ? 
                            <Grid item xs={3} sm={3} md={3}>
                            <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/hastened.svg"} />
                            <Typography color="secondary" align="center" variant="subtitle1"> {drag.hasten} </Typography>
                        </Grid>                                :
                        null
                        }
                        {drag["nurture"] ? 
                            <Grid item xs={3} sm={3} md={3}>
                            <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/nurtured.svg"} />
                            <Typography color="secondary" align="center" variant="subtitle1"> {drag.nurture} </Typography>
                        </Grid>                                :
                        null
                        }
                        {drag["paralyze"] ? 
                            <Grid item xs={3} sm={3} md={3}>
                            <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/paralyzed.svg"} />
                            <Typography color="secondary" align="center" variant="subtitle1"> {drag.paralyze} </Typography>
                        </Grid>                                :
                        null
                        }
                        {drag["poison"] ? 
                            <Grid item xs={3} sm={3} md={3}>
                            <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/poisoned.svg"} />
                            <Typography color="secondary" align="center" variant="subtitle1"> {drag.poison} </Typography>
                        </Grid>                                :
                        null
                        }
                        {drag["shield"] ? 
                            <Grid item xs={3} sm={3} md={3}>
                            <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/shielded.svg"} />
                            <Typography color="secondary" align="center" variant="subtitle1"> {drag.shield} </Typography>
                        </Grid>                                :
                        null
                        }
                        {drag["slow"] ? 
                            <Grid item xs={3} sm={3} md={3}>
                            <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/slowed.svg"} />
                            <Typography color="secondary" align="center" variant="subtitle1"> {drag.slow} </Typography>
                        </Grid>                                :
                        null
                        }
                        {drag["strengthen"] ? 
                        <Grid item xs={3} sm={3} md={3}>
                            <img style={{zIndex: 10, height: String((50 / (props.length + 3))) + "vw", minHeight: 40, maxHeight: 50, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/strengthened.svg"} />
                            <Typography color="secondary" align="center" variant="subtitle1"> {drag.strengthen} </Typography>
                        </Grid>
                        :
                        null
                        }
                        
                   
                    </Grid>

                    {drag.moves.length > 0 ? 
                        drag.moves.map((move) => {
                            return (
                                <div style={{border: "1px solid white", margin: 20, borderRadius: 15}}>
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
                                                <Typography color="secondary" align="center" variant="subtitle1"> {Number(move.power + drag.strength).toFixed(1)} </Typography>
                                                :
                                                strengthAdj < 0 ?
                                                <Typography color="secondary" align="center" variant="subtitle1" style={{color: "#F8575A"}}> {Number(move.power + drag.strength + strengthAdj).toFixed(1)} </Typography>
                                                :
                                                <Typography color="secondary" align="center" variant="subtitle1" style={{color: "#4EC83E"}}> {Number(move.power + drag.strength + strengthAdj).toFixed(1)} </Typography>
                                                :
                                                null
                                            }
                                            {move.type.substring(0,6) == "ranged" ?
                                                dexterityAdj == 0 ?
                                                <Typography color="secondary" align="center" variant="subtitle1"> {Number(move.power + drag.dexterity).toFixed(1)} </Typography>
                                                :
                                                dexterityAdj < 0 ?
                                                <Typography color="secondary" align="center" variant="subtitle1" style={{color: "#F8575A"}}> {Number(move.power + drag.dexterity + dexterityAdj).toFixed(1)} </Typography>
                                                :
                                                <Typography color="secondary" align="center" variant="subtitle1" style={{color: "#4EC83E"}}> {Number(move.power + drag.dexterity + dexterityAdj).toFixed(1)} </Typography>
                                                :
                                                null
                                            }
                                            {move.type.substring(0,5) == "magic" ?
                                                intelligenceAdj == 0 ?
                                                <Typography color="secondary" align="center" variant="subtitle1"> {Number(move.power + drag.intelligence).toFixed(1)} </Typography>
                                                :
                                                intelligenceAdj < 0 ?
                                                <Typography color="secondary" align="center" variant="subtitle1" style={{color: "#F8575A"}}> {Number(move.power + drag.intelligence + intelligenceAdj).toFixed(1)} </Typography>
                                                :
                                                <Typography color="secondary" align="center" variant="subtitle1" style={{color: "#4EC83E"}}> {Number(move.power + drag.intelligence + intelligenceAdj).toFixed(1)} </Typography>
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
                                        <Typography color="secondary" align="center" variant="subtitle2" style={{margin: 10}}> Apply {drag[move.effect] * 2} {move.effect} </Typography>
                                    :
                                        <Typography color="secondary" align="center" variant="subtitle2" style={{margin: 10}}> Apply {Math.ceil(drag[move.effect] / 2)} {move.effect} </Typography>
                                    }

                                    <Typography color="secondary" align="center" variant="subtitle2" style={{margin: 10}}> {move.description} </Typography>
                                    
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
            </Button>
            :
            null
                }

                
               
            </div>
            <Button onClick={() => setShowRules(!showRules)} style={{border: "1px solid white", margin: 20}}>
                    <Typography color="secondary" align="center" variant="h6"> Rules <FeedIcon style={{color: "white"}} /></Typography>
                    
                </Button>

                {showRules ?
                <Grid container spacing={3}  style={{padding: 20}}>
                    <Grid item xs={12}>
                        <br />
                        <Typography color="secondary" align="center" variant="h4" style={{padding: 20}}> Dragon's Horde - Quick Rules Overview 🐉⚔️ </Typography>
                        <br />
                        <hr />
                        <br />
                        <Typography color="secondary" align="center" variant="h5" style={{padding: 20}}> Objective: </Typography>
                        <br />
                        <Typography color="secondary" align="center" variant="h6" style={{padding: 20}}> Use your champion NFT to defeat the dragon guarding the Dark Coin horde. Survive and strategize to maximize your rewards. </Typography>
                        <br />
                        <hr />
                        <br />
                        <Typography color="secondary" align="center" variant="h5" style={{padding: 20}}> How It Works: </Typography>
                        <div style={{border: "1px solid white", padding: 20, margin: 40, borderRadius: 15}}>
                        <br />
                        <Typography color="secondary" align="center" variant="h6" style={{padding: 20}}> Each round, players choose a move:   </Typography>
                        <br />
                        <Typography color="secondary" align="center" variant="subtitle1" style={{padding: 20}}>  Attack the Dragon to help weaken it. </Typography>
                        <br />
                        <Typography color="secondary" align="center" variant="h6" style={{padding: 20}}>  or  </Typography>
                        <br />
                        <Typography color="secondary" align="center" variant="subtitle1" style={{padding: 20}}>  Attack Another Champion to thin the competition. </Typography>
                        <br />
                        </div>
                        <Typography color="secondary" align="center" variant="h6" style={{padding: 20}}>  Moves are resolved at the end of the round.  </Typography>
                        <br />
                        <hr />
                        <br />
                        <Typography color="secondary" align="center" variant="h5" style={{padding: 20}}>  Rewards:  </Typography>
                        <br />
                        <Typography color="secondary" align="center" variant="h6" style={{padding: 20}}>  Survivors Split the Horde  </Typography>
                        <br />
                        <Typography color="secondary" align="center" variant="subtitle1" style={{padding: 20}}>   Dark Coin rewards are divided among the champions still standing  </Typography>
                        <br />
                        <Typography color="secondary" align="center" variant="h6" style={{padding: 20}}>  The Final Strike  </Typography>
                        <br />
                        <Typography color="secondary" align="center" variant="subtitle1" style={{padding: 20}}>  The champion who lands the killing blow on the dragon earns 25% of the entire Dark Coin pot </Typography>
                        <br />
                        <Typography color="secondary" align="center" variant="h6" style={{padding: 20}}>  No Dragon, No Rewards  </Typography>
                        <br />
                        <Typography color="secondary" align="center" variant="subtitle1" style={{padding: 20}}>  If the dragon isn’t defeated, no one gets the treasure, and the rewards roll over to the next round  </Typography>
                        <br />
                        <hr />
                        <br />
                        <Typography color="secondary" align="center" variant="h6" style={{padding: 20}}>  Let the battle begin, and may the strongest champion claim the Dragon's Horde! 🏆✨  </Typography>
                    </Grid>
                    <Grid item xs={12}>
                        <Typography color="secondary" align="center" variant="h6"> Stats: </Typography>
                    </Grid>

                    <Grid item xs={12} >
                        <img style={{zIndex: 10, width: String((50 / (props.length + 3))) + "vw", minWidth: 60, maxWidth: 80, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/health.svg"} />
                        <Typography color="secondary" align="center" variant="h6"> Health </Typography>
                        <Typography color="secondary" align="center" variant="subtitle1"> Health is the characters lifeforce. Taking damage causes loss of health. When a character hits 0 they will be eliminated. </Typography>
                    </Grid>
                    <Grid item xs={6}>
                        <img style={{zIndex: 10, width: String((50 / (props.length + 3))) + "vw", minWidth: 60, maxWidth: 80, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/speed.svg"} />
                        <Typography color="secondary" align="center" variant="h6"> Speed </Typography>
                        <Typography color="secondary" align="center" variant="subtitle1"> Speed determines the characters turn order. </Typography>
                    </Grid>
                    <Grid item xs={6}>
                        <img style={{zIndex: 10, width: String((50 / (props.length + 3))) + "vw", minWidth: 60, maxWidth: 80, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/resist.svg"} />
                        <Typography color="secondary" align="center" variant="h6"> Resist </Typography>
                        <Typography color="secondary" align="center" variant="subtitle1"> Resist determines the characters ability to avoid an applied negative effect. </Typography>
                    </Grid>
                    <Grid item xs={4}>
                        <img style={{zIndex: 10, width: String((50 / (props.length + 3))) + "vw", minWidth: 60, maxWidth: 80, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/strength.svg"} />
                        <Typography color="secondary" align="center" variant="h6"> Strength </Typography>
                        <Typography color="secondary" align="center" variant="subtitle1"> Buffs a characters health during character creation. Adds damage to melee attacks. </Typography>
                    </Grid>
                    <Grid item xs={4}>
                        <img style={{zIndex: 10, width: String((50 / (props.length + 3))) + "vw", minWidth: 60, maxWidth: 80, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/dexterity.svg"} />
                        <Typography color="secondary" align="center" variant="h6"> Dexterity </Typography>
                        <Typography color="secondary" align="center" variant="subtitle1"> Buffs a characters speed during character creation. Adds damage to ranged attacks. </Typography>
                    </Grid>
                    <Grid item xs={4}>
                        <img style={{zIndex: 10, width: String((50 / (props.length + 3))) + "vw", minWidth: 60, maxWidth: 80, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/intelligence.svg"} />
                        <Typography color="secondary" align="center" variant="h6"> Intelligence </Typography>
                        <Typography color="secondary" align="center" variant="subtitle1"> Buffs a characters resist during character creation. Adds damage to magic attacks. </Typography>
                    </Grid>
                    <Grid item xs={12}>
                        <Typography color="secondary" align="center" variant="h6"> Negative Effects: </Typography>
                    </Grid>
                    
                    <Grid item xs={3}>
                        <img style={{zIndex: 10, width: String((50 / (props.length + 3))) + "vw", minHeight: 50, maxHeight: 60, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/bleeding.svg"} />
                        <Typography color="secondary" align="center" variant="h6"> Bleed </Typography>
                        <Typography color="secondary" align="center" variant="subtitle1"> Each application causes the character to lose 0.7 health and 0.1 strength. </Typography>
                    </Grid>
                    <Grid item xs={3}>
                        <img style={{zIndex: 10, width: String((50 / (props.length + 3))) + "vw", minHeight: 50, maxHeight: 60, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/burned.svg"} />
                        <Typography color="secondary" align="center" variant="h6"> Burn </Typography>
                        <Typography color="secondary" align="center" variant="subtitle1"> Each application causes the character to lose 0.5 health and 0.1 intelligence, but gain 0.1 strength and 0.2 speed. </Typography>
                    </Grid>
                    <Grid item xs={3}>
                        <img style={{zIndex: 10, width: String((50 / (props.length + 3))) + "vw", minHeight: 50, maxHeight: 60, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/doomed.svg"} />
                        <Typography color="secondary" align="center" variant="h6"> Doom </Typography>
                        <Typography color="secondary" align="center" variant="subtitle1"> Each application causes the character to lose 0.3 health, 0.2 resist, and 0.2 intelligence. </Typography>
                    </Grid>
                    <Grid item xs={3}>
                        <img style={{zIndex: 10, width: String((50 / (props.length + 3))) + "vw", minHeight: 50, maxHeight: 60, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/drowned.svg"} />
                        <Typography color="secondary" align="center" variant="h6"> Drown </Typography>
                        <Typography color="secondary" align="center" variant="subtitle1"> Each application causes the character to lose 0.3 dexterity and 0.1 accuracy. </Typography>
                    </Grid>
                    <Grid item xs={3}>
                        <img style={{zIndex: 10, width: String((50 / (props.length + 3))) + "vw", minHeight: 50, maxHeight: 60, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/frozen.svg"} />
                        <Typography color="secondary" align="center" variant="h6"> Freeze </Typography>
                        <Typography color="secondary" align="center" variant="subtitle1"> Each application causes the character to lose 0.2 speed and 0.2 dexterity. </Typography>
                    </Grid>
                    <Grid item xs={3}>
                        <img style={{zIndex: 10, width: String((50 / (props.length + 3))) + "vw", minHeight: 50, maxHeight: 60, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/paralyzed.svg"} />
                        <Typography color="secondary" align="center" variant="h6"> Paralyze </Typography>
                        <Typography color="secondary" align="center" variant="subtitle1"> Each application causes the character to lose 0.2 accuracy. </Typography>
                    </Grid>
                    <Grid item xs={3}>
                        <img style={{zIndex: 10, width: String((50 / (props.length + 3))) + "vw", minHeight: 50, maxHeight: 60, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/poisoned.svg"} />
                        <Typography color="secondary" align="center" variant="h6"> Poison </Typography>
                        <Typography color="secondary" align="center" variant="subtitle1"> Each application causes the character to lose 1 health. </Typography>
                    </Grid>
                    <Grid item xs={3}>
                        <img style={{zIndex: 10, width: String((50 / (props.length + 3))) + "vw", minHeight: 50, maxHeight: 60, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/slowed.svg"} />
                        <Typography color="secondary" align="center" variant="h6"> Slow </Typography>
                        <Typography color="secondary" align="center" variant="subtitle1"> Each application causes the character to lose 0.3 speed and 0.1 dexterity. </Typography>
                    </Grid>
                    <Grid item xs={12}>
                        <Typography color="secondary" align="center" variant="h6"> Positive Effects: </Typography>
                    </Grid>
                    <Grid item xs={3}>
                        <img style={{zIndex: 10, width: String((50 / (props.length + 3))) + "vw", minHeight: 50, maxHeight: 60, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/blessed.svg"} />
                        <Typography color="secondary" align="center" variant="h6"> Bless </Typography>
                        <Typography color="secondary" align="center" variant="subtitle1"> Each application increases the character's strength by 0.2, intelligence by 0.2, and resist by 0.1. </Typography>
                    </Grid>
                    <Grid item xs={3}>
                        <img style={{zIndex: 10, width: String((50 / (props.length + 3))) + "vw", minHeight: 50, maxHeight: 60, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/cleansed.svg"} />
                        <Typography color="secondary" align="center" variant="h6"> Cleansed </Typography>
                        <Typography color="secondary" align="center" variant="subtitle1"> Each application causes the character to lose 0.5 health and 0.1 intelligence, but gain 0.1 strength and 0.2 speed. </Typography>
                    </Grid>
                    <Grid item xs={3}>
                        <img style={{zIndex: 10, width: String((50 / (props.length + 3))) + "vw", minHeight: 50, maxHeight: 60, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/empowered.svg"} />
                        <Typography color="secondary" align="center" variant="h6"> Empower </Typography>
                        <Typography color="secondary" align="center" variant="subtitle1"> Each application increases the character's intelligence by 0.3. </Typography>
                    </Grid>
                    <Grid item xs={3}>
                        <img style={{zIndex: 10, width: String((50 / (props.length + 3))) + "vw", minHeight: 50, maxHeight: 60, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/focused.svg"} />
                        <Typography color="secondary" align="center" variant="h6"> Focus </Typography>
                        <Typography color="secondary" align="center" variant="subtitle1"> Each application increases the character's accuracy by 0.3. </Typography>
                    </Grid>
                    <Grid item xs={3}>
                        <img style={{zIndex: 10, width: String((50 / (props.length + 3))) + "vw", minHeight: 50, maxHeight: 60, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/hastened.svg"} />
                        <Typography color="secondary" align="center" variant="h6"> Hasten </Typography>
                        <Typography color="secondary" align="center" variant="subtitle1"> Each application increases the character's dexterity by 0.3 and speed by 0.1. </Typography>
                    </Grid>
                    <Grid item xs={3}>
                        <img style={{zIndex: 10, width: String((50 / (props.length + 3))) + "vw", minHeight: 50, maxHeight: 60, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/nurtured.svg"} />
                        <Typography color="secondary" align="center" variant="h6"> Nurture </Typography>
                        <Typography color="secondary" align="center" variant="subtitle1"> Each application increases the character's health regeneration by 0.5. </Typography>
                    </Grid>
                    <Grid item xs={3}>
                        <img style={{zIndex: 10, width: String((50 / (props.length + 3))) + "vw", minHeight: 50, maxHeight: 60, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/shielded.svg"} />
                        <Typography color="secondary" align="center" variant="h6"> Shield </Typography>
                        <Typography color="secondary" align="center" variant="subtitle1"> Each application allows the character to block 1 physical damage. </Typography>
                    </Grid>
                    <Grid item xs={3}>
                        <img style={{zIndex: 10, width: String((50 / (props.length + 3))) + "vw", minHeight: 50, maxHeight: 60, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/effects/strengthened.svg"} />
                        <Typography color="secondary" align="center" variant="h6"> Strengthen </Typography>
                        <Typography color="secondary" align="center" variant="subtitle1"> Each application increases the character's strength by 0.3. </Typography>
                    </Grid>
                </Grid>
                :
                null
                }
            
            <Grid container >
            {dcChars.length > 0 ? 
            dcChars.map((nft, index) => {
                return (
                    <Grid key={index} item xs={6} sm={4} md={3} lg={2} >
                        <DisplayChar drag={drag} nftId={nft} setNft={(nftId) => setCharSelect(nftId)} setMessage={props.setMessage} sendDiscordMessage={props.sendDiscordMessage} brawl={true} contracts={props.contracts} brawlChars={brawlChars} />
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
        
    
    
