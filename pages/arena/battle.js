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
    const [dragUrl, setDragUrl] = useState(null)

    const [hover, setHover] = useState(false)

    const [char, setChar] = useState(null)
    const [moveSelect, setMoveSelect] = useState(null)
    const [target, setTarget] = useState(null)

    const [horde, setHorde] = useState(null)

    const [hours, setHours] = useState(null)
    const [minutes, setMinutes] = useState(null)
    const [seconds, setSeconds] = useState(null)

    const [offset, setOffset] = useState(null)

    const [timeLeft, setTimeLeft] = useState(null)

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
        cleansed: "Removes 3 negative effect."


    })

    const [showRules, setShowRules] = useState(false)

    const byteArrayToLong = (byteArray) => {
        var value = 0;
        for ( var i = 0; i < byteArray.length; i++) {
            value = (value * 256) + byteArray[i];
        }
    
        return value;
    };

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
                    .searchForApplicationBoxes(props.contracts.arena)
                    .limit(1000)
                    .do();

                    let brawlers = []


                    contractBoxes.boxes.forEach((box) => {
                        if (box.name.length == 15) {
                            let assetId = byteArrayToLong(box.name.slice(0,8))
                        
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
                    let dragNft = await indexerClient.searchForAssets().index(dragObject.assetId).do();
                    console.log(dragNft)
                    setDragUrl("https://ipfs.dark-coin.io/ipfs/" + dragNft.assets[0].params.url.slice(21))
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

                    const now = new Date();

                    let offset = now.getTimezoneOffset()

                    setOffset(offset)

                    console.log(offset / 60)

                    console.log(now)

                    // Get individual components
                    let hours = now.getHours()
                    let minutes = now.getMinutes()
                    let seconds = now.getSeconds()

                    setHours(hours)
                    setMinutes(minutes)
                    setSeconds(seconds)

                    function decimalToHMS(decimalHours) {
                        const hours = Math.floor(decimalHours);
                        const minutes = Math.floor((decimalHours - hours) * 60);
                        const seconds = Math.round(((decimalHours - hours) * 60 - minutes) * 60);
                    
                        return `${hours} hours, ${minutes} minutes, ${seconds} seconds`;
                    }

                    console.log((24 - ((hours + (minutes / 60) + (seconds / 3600) + (offset / 60) + 1) % 24)))

                    // Format the time
                    const timeString = `${hours}:${minutes}:${seconds}`;

                    setTimeLeft(decimalToHMS((24 - ((hours + (minutes / 60) + (seconds / 3600) + (offset / 60) + 1) % 24))))

                    console.log(timeLeft)
                

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

    return (
        <div>

            
            <Grid container >
            {dcChars.length > 0 ? 
            dcChars.map((nft, index) => {
                return (
                    <Grid key={index} item xs={6} sm={4} md={3} lg={2} >
                        <DisplayChar nftId={nft} setNft={(nftId) => setCharSelect(nftId)} setMessage={props.setMessage} sendDiscordMessage={props.sendDiscordMessage} battle={true} contracts={props.contracts} brawlChars={brawlChars} />
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
        
    
    
