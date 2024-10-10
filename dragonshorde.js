import React, {useState, useEffect} from "react"


import algosdk from "algosdk"

import { Grid, Typography, Button, Card, styled, LinearProgress, linearProgressClasses } from "@mui/material"

import { useWallet } from '@txnlab/use-wallet'

import DisplayChar from "../../components/contracts/Arena/DisplayChar"

import FeedIcon from '@mui/icons-material/Feed';
import { act } from "react"

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

                    let dragResponse = await client.getApplicationBoxByName(1870514811, "dragon").do();

                    let string = new TextDecoder().decode(dragResponse.value)

                    let dragObject = JSON.parse(string)

                    setDrag(dragObject)

                    props.setMessage("")
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
                props.sendDiscordMessage(error, "Fetch Select", activeAccount.address)
              }
    
        }
        fetchData();  
        

    
    }, [activeAccount])

    const updateChars = async () => {

        brawlChars.forEach(async (char) => {

            let res = await fetch('/api/arena/genCharObject', {
                method: "POST",
                headers: {
                "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    assetId: char,
                    contract: props.contracts.dragonshorde

                }),
                
                
            });
    
            let sess = await res.json()


        })

    }

    const updateDrag = async () => {


        let res = await fetch('/api/arena/genDragon', {
            method: "POST",
            headers: {
            "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contract: props.contracts.dragonshorde

            }),
            
            
        });

        let sess = await res.json()


        

    }

    const hordeFight = async () => {

        const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)

        let params = await client.getTransactionParams().do()

        const status = await client.status().do();
        const currentRound = status['last-round'];

        const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)

        const boxesResponse = await client.getApplicationBoxes(props.contracts.dragonshorde).do();

        let actions = []

        let numActions = 1

        let targets = []

        boxesResponse.boxes.forEach(async (box, index) => {

            console.log(box)
            if (box.name.length == 8) {
                targets.push(box.name)
            }

            if (box.name.length == 14) {
                numActions++
            }
        })

        console.log(numActions)
        console.log(targets)

        let dragonTarget = targets[Math.floor(Math.random() * targets.length)]
        console.log(dragonTarget)
        let dragonMove = Math.floor(Math.random() * 4)

        let responseAttacker = await indexerClient.lookupApplicationBoxByIDandName(props.contracts.dragonshorde, new Uint8Array(Buffer.from("dragon"))).do();

        let attackerObject = JSON.parse(new TextDecoder().decode(responseAttacker.value))

        attackerObject.type = "dragon"

        let attackerMove = attackerObject.moves[dragonMove]

        console.log(attackerMove.type.substring(attackerMove.type.length - 4) == "buff")

        let responseDefender
        let defenderObject
        let battleString

        responseDefender = await indexerClient.lookupApplicationBoxByIDandName(props.contracts.dragonshorde, new Uint8Array(Buffer.from("dragon"))).do();

        defenderObject = JSON.parse(new TextDecoder().decode(responseDefender.value))


        let healthAdj = 0
        let speedAdj = 0
        let strengthAdj = 0
        let dexterityAdj = 0
        let intelligenceAdj = 0
        let accuracyAdj = 0

        if (attackerObject.effects["poison"]) {
            healthAdj -= attackerObject.effects["poison"] * 1
        }
        if (attackerObject.effects["bleed"]) {
            healthAdj -= attackerObject.effects["bleed"] * 0.7
            strengthAdj -= attackerObject.effects["bleed"] * 0.1
        }
        if (attackerObject.effects["burn"]) {
            healthAdj -= attackerObject.effects["burn"] * 0.5
            intelligenceAdj -= attackerObject.effects["burn"] * 0.1
            strengthAdj += attackerObject.effects["burn"] * 0.1
            speedAdj += attackerObject.effects["burn"] * 0.2
        }
        if (attackerObject.effects["freeze"]) {
            speedAdj -= attackerObject.effects["freeze"] * 0.2
            dexterityAdj -= attackerObject.effects["freeze"] * 0.2
        }
        if (attackerObject.effects["slow"]) {
            speedAdj -= attackerObject.effects["slow"] * 0.3
            dexterityAdj -= attackerObject.effects["slow"] * 0.1
        }
        if (attackerObject.effects["paralyze"]) {
            accuracyAdj -= attackerObject.effects["paralyze"] * 0.2
        }
        if (attackerObject.effects["drown"]) {
            dexterityAdj -= attackerObject.effects["drown"] * 0.3
            accuracyAdj -= attackerObject.effects["drown"] * 0.1
        }
        if (attackerObject.effects["doom"]) {
            healthAdj -= attackerObject.effects["doom"] * 0.3
            resistAdj -= attackerObject.effects["doom"] * 0.2
            intelligenceAdj -= attackerObject.effects["doom"] * 0.2
        }

        
        if (attackerObject.effects["strengthen"]) {
            strengthAdj += attackerObject.effects["strengthen"] * 0.3
        }
        if (attackerObject.effects["empower"]) {
            intelligenceAdj += attackerObject.effects["empower"] * 0.3
        }
        if (attackerObject.effects["hasten"]) {
            dexterityAdj += attackerObject.effects["hasten"] * 0.3
            speedAdj += attackerObject.effects["hasten"] * 0.1
        }
        if (attackerObject.effects["nurture"]) {
            healthAdj += attackerObject.effects["nurture"] * 0.5
        }
        if (attackerObject.effects["bless"]) {
            strengthAdj += attackerObject.effects["bless"] * 0.2
            intelligenceAdj += attackerObject.effects["bless"] * 0.2
        }
        if (attackerObject.effects["focus"]) {
            accuracyAdj += attackerObject.effects["focus"] * 0.3
        }

        let resistAdj = 0

        if (defenderObject.effects["bless"]) {
            resistAdj += defenderObject.effects["bless"] * 0.1
        }

        if (defenderObject.effects["doom"]) {
            resistAdj -= defenderObject.effects["doom"] * 0.2
        }

        
        let hitRoll = Math.floor(Math.random() * 101) + 1
        let hit = false
        if (hitRoll <= attackerMove.accuracy) {
            hit = true
        }

        if (hit) {

            if (attackerMove.type.substring(attackerMove.type.length - 4) == "buff") {

                defenderObject.type = "dragon"
    
                battleString = attackerObject.name + " used " + attackerMove.name + " on " + defenderObject.name + " healing "
    
                if (attackerMove.type == "melee buff") {
                    defenderObject.currentHealth = defenderObject.currentHealth + attackerMove.power + attackerObject.strength + strengthAdj
    
                    battleString = battleString + (attackerMove.power + attackerObject.strength + strengthAdj)
                }
    
                if (attackerMove.type == "ranged buff") {
                    defenderObject.currentHealth = defenderObject.currentHealth + attackerMove.power + attackerObject.dexterity + dexterityAdj
    
                    battleString = battleString + (attackerMove.power + attackerObject.dexterity + dexterityAdj)
                }
    
                if (attackerMove.type == "magic buff") {
                    defenderObject.currentHealth = defenderObject.currentHealth + attackerMove.power + attackerObject.intelligence + intelligenceAdj
    
                    battleString = battleString + (attackerMove.power + attackerObject.intelligence + intelligenceAdj)
                }
    
            }
            else {
    
                defenderObject.id = byteArrayToLong(dragonTarget)
    
                defenderObject.type = "player"
    
                battleString = attackerObject.name + " used " + attackerMove.name + " on " + defenderObject.name + " dealing "
    
                if (attackerMove.type.substring(0,5) == "melee") {
    
                    defenderObject.currentHealth = defenderObject.currentHealth - attackerMove.power + attackerObject.strength + strengthAdj
    
                    battleString = battleString + (attackerMove.power + attackerObject.strength + strengthAdj)
                }
    
                if (attackerMove.type.substring(0,6) == "ranged") {
    
                    defenderObject.currentHealth = defenderObject.currentHealth - attackerMove.power + attackerObject.dexterity + dexterityAdj
    
                    battleString = battleString + (attackerMove.power + attackerObject.dexterity + dexterityAdj)
                }
    
                if (attackerMove.type.substring(0,5) == "magic") {
    
                    defenderObject.currentHealth = defenderObject.currentHealth - attackerMove.power + attackerObject.intelligence + intelligenceAdj
    
                    battleString = battleString + (attackerMove.power + attackerObject.intelligence + intelligenceAdj)
                }
    
            }

            let effectsRoll = Math.floor(Math.random() * 101) + 1
            let effectHit = false
            if (effectsRoll >= (defenderObject.resist + resistAdj)) {
                effectHit = true
            }

            if (attackerMove.type.substring(attackerMove.type.length - 4) == "buff") {
                effectHit = true
            }

            if (effectHit) {
                if (defenderObject.effects[attackerMove.effect]) {
                    if (attackerMove.type.substring(attackerMove.type.length - 5) == "curse" || attackerMove.type.substring(attackerMove.type.length - 4) == "buff") {
                        defenderObject.effects[attackerMove.effect] = defenderObject.effects[attackerMove.effect] + (attackerObject[attackerMove.effect] * 2)
                        battleString = battleString + " and applying " + String(attackerObject[attackerMove.effect] * 2) + " " + String(attackerMove.effect)
        
                    }
                    else {
                        defenderObject.effects[attackerMove.effect] = defenderObject.effects[attackerMove.effect] + attackerObject[attackerMove.effect]
                        battleString = battleString + " and applying " + String(Math.ceil(attackerObject[attackerMove.effect] / 2)) + " " + String(attackerMove.effect)
                    }
                }
                else {
                    if (attackerMove.type.substring(attackerMove.type.length - 5) == "curse" || attackerMove.type.substring(attackerMove.type.length - 4) == "buff") {
                        defenderObject.effects[attackerMove.effect] = attackerObject[attackerMove.effect] * 2
                        battleString = battleString + " and applying " + String(attackerObject[attackerMove.effect] * 2) + " " + String(attackerMove.effect)
                    }
                    else {
                        defenderObject.effects[attackerMove.effect] = attackerObject[attackerMove.effect]
                        battleString = battleString + " and applying " + String(Math.ceil(attackerObject[attackerMove.effect] / 2)) + " " + String(attackerMove.effect)
                    }
        
                }
            }
            else {
                battleString = battleString + " and " + defenderObject.name + " resisted the " + attackerMove.effect
            }
    
            
    
            console.log({attacker: attackerObject, defender: defenderObject, battleString: battleString})
    
            actions.push({attacker: attackerObject, defender: defenderObject, battleString: battleString})

        }
        else {
            battleString = attackerObject.name + " used " + attackerMove.name + " on " + defenderObject.name + " and missed."
            actions.push({attacker: null, defender: null, battleString: battleString})
        }

        

        console.log(actions)
        

        boxesResponse.boxes.forEach(async (box, index) => {

            if (box.name.length == 14) {

                try {

                console.log(box.name)

                let responseMove = await indexerClient.lookupApplicationBoxByIDandName(props.contracts.dragonshorde, box.name).do();

                console.log(responseMove)
                
                let attacker = byteArrayToLong(responseMove.name.slice(0,8))

                let defender = JSON.parse(new TextDecoder().decode(responseMove.value)).target

                let move = JSON.parse(new TextDecoder().decode(responseMove.value)).move

                console.log(new Uint8Array(longToByteArray(attacker)))

                let responseAttacker = await indexerClient.lookupApplicationBoxByIDandName(props.contracts.dragonshorde, new Uint8Array(longToByteArray(attacker))).do();
            
                let attackerObject = JSON.parse(new TextDecoder().decode(responseAttacker.value))

                console.log(attackerObject)

                attackerObject.id = attacker

                let attackerMove = attackerObject.moves[move]

                let defenderBox

                if (defender == "dragon") {
                    defenderBox = new Uint8Array(Buffer.from("dragon"))
                }
                else {
                    defenderBox = new Uint8Array(longToByteArray(defender))
                }

                console.log(defender)

                console.log(defenderBox)

                let responseDefender = await indexerClient.lookupApplicationBoxByIDandName(props.contracts.dragonshorde, defenderBox).do();

                let defenderObject = JSON.parse(new TextDecoder().decode(responseDefender.value))

                let healthAdj = 0
                let speedAdj = 0
                let strengthAdj = 0
                let dexterityAdj = 0
                let intelligenceAdj = 0
                let accuracyAdj = 0

                if (attackerObject.effects["poison"]) {
                    healthAdj -= attackerObject.effects["poison"] * 1
                }
                if (attackerObject.effects["bleed"]) {
                    healthAdj -= attackerObject.effects["bleed"] * 0.7
                    strengthAdj -= attackerObject.effects["bleed"] * 0.1
                }
                if (attackerObject.effects["burn"]) {
                    healthAdj -= attackerObject.effects["burn"] * 0.5
                    intelligenceAdj -= attackerObject.effects["burn"] * 0.1
                    strengthAdj += attackerObject.effects["burn"] * 0.1
                    speedAdj += attackerObject.effects["burn"] * 0.2
                }
                if (attackerObject.effects["freeze"]) {
                    speedAdj -= attackerObject.effects["freeze"] * 0.2
                    dexterityAdj -= attackerObject.effects["freeze"] * 0.2
                }
                if (attackerObject.effects["slow"]) {
                    speedAdj -= attackerObject.effects["slow"] * 0.3
                    dexterityAdj -= attackerObject.effects["slow"] * 0.1
                }
                if (attackerObject.effects["paralyze"]) {
                    accuracyAdj -= attackerObject.effects["paralyze"] * 0.2
                }
                if (attackerObject.effects["drown"]) {
                    dexterityAdj -= attackerObject.effects["drown"] * 0.3
                    accuracyAdj -= attackerObject.effects["drown"] * 0.1
                }
                if (attackerObject.effects["doom"]) {
                    healthAdj -= attackerObject.effects["doom"] * 0.3
                    resistAdj -= attackerObject.effects["doom"] * 0.2
                    intelligenceAdj -= attackerObject.effects["doom"] * 0.2
                }

                
                if (attackerObject.effects["strengthen"]) {
                    strengthAdj += attackerObject.effects["strengthen"] * 0.3
                }
                if (attackerObject.effects["empower"]) {
                    intelligenceAdj += attackerObject.effects["empower"] * 0.3
                }
                if (attackerObject.effects["hasten"]) {
                    dexterityAdj += attackerObject.effects["hasten"] * 0.3
                    speedAdj += attackerObject.effects["hasten"] * 0.1
                }
                if (attackerObject.effects["nurture"]) {
                    healthAdj += attackerObject.effects["nurture"] * 0.5
                }
                if (attackerObject.effects["bless"]) {
                    strengthAdj += attackerObject.effects["bless"] * 0.2
                    intelligenceAdj += attackerObject.effects["bless"] * 0.2
                }
                if (attackerObject.effects["focus"]) {
                    accuracyAdj += attackerObject.effects["focus"] * 0.3
                }

                let resistAdj = 0

                if (defenderObject.effects["bless"]) {
                    resistAdj += defenderObject.effects["bless"] * 0.1
                }

                if (defenderObject.effects["doom"]) {
                    resistAdj -= defenderObject.effects["doom"] * 0.2
                }

                
                let hitRoll = Math.floor(Math.random() * 101) + 1
                let hit = false
                if (hitRoll <= attackerMove.accuracy) {
                    hit = true
                }

                console.log(defenderObject)

                if (defender == "dragon") {
                    defenderObject.type = "dragon"
                }
                else {
                    defenderObject.type = "player"
                    defenderObject.id = defender
                }

                let battleString

                if (hit) {

                    if (attackerMove.type.substring(attackerMove.type.length - 4) == "buff") {
                        battleString = attackerObject.name + " used " + attackerMove.name + " on " + defenderObject.name + " healing "
    
                        if (attackerMove.type == "melee buff") {
    
                            defenderObject.currentHealth = defenderObject.currentHealth + attackerMove.power + attackerObject.strength + strengthAdj
    
                            battleString = battleString + (attackerMove.power + attackerObject.strength + strengthAdj)
    
                        }

                        if (attackerMove.type == "ranged buff") {
    
                            defenderObject.currentHealth = defenderObject.currentHealth + attackerMove.power + attackerObject.dexterity + dexterityAdj
    
                            battleString = battleString + (attackerMove.power + attackerObject.dexterity + dexterityAdj)
    
                        }

                        if (attackerMove.type == "magic buff") {
    
                            defenderObject.currentHealth = defenderObject.currentHealth + attackerMove.power + attackerObject.intelligence + intelligenceAdj
    
                            battleString = battleString + (attackerMove.power + attackerObject.intelligence + intelligenceAdj)
    
                        }
    
                    }
                    else {
    
                        battleString = attackerObject.name + " used " + attackerMove.name + " on " + defenderObject.name + " dealing "
    
                        if (attackerMove.type.substring(0,5) == "melee") {
    
                            defenderObject.currentHealth = defenderObject.currentHealth - attackerMove.power + attackerObject.strength + strengthAdj
            
                            battleString = battleString + (attackerMove.power + attackerObject.strength + strengthAdj)
                        }
            
                        if (attackerMove.type.substring(0,6) == "ranged") {
            
                            defenderObject.currentHealth = defenderObject.currentHealth - attackerMove.power + attackerObject.dexterity + dexterityAdj
            
                            battleString = battleString + (attackerMove.power + attackerObject.dexterity + dexterityAdj)
                        }
            
                        if (attackerMove.type.substring(0,5) == "magic") {
            
                            defenderObject.currentHealth = defenderObject.currentHealth - attackerMove.power + attackerObject.intelligence + intelligenceAdj
            
                            battleString = battleString + (attackerMove.power + attackerObject.intelligence + intelligenceAdj)
                        }
    
                    }

                    let effectsRoll = Math.floor(Math.random() * 101) + 1
                    let effectHit = false
                    if (effectsRoll >= (defenderObject.resist + resistAdj)) {
                        effectHit = true
                    }

                    if (attackerMove.type.substring(attackerMove.type.length - 4) == "buff") {
                        effectHit = true
                    }

                    if (effectHit) {
    
                        if (defenderObject.effects[attackerMove.effect]) {
                            if (attackerMove.type.substring(attackerMove.type.length - 5) == "curse" || attackerMove.type.substring(attackerMove.type.length - 4) == "buff") {
                                defenderObject.effects[attackerMove.effect] = defenderObject.effects[attackerMove.effect] + (attackerObject[attackerMove.effect] * 2)
                                battleString = battleString + " and applying " + String(attackerObject[attackerMove.effect] * 2) + " " + String(attackerMove.effect)
        
                            }
                            else {
                                defenderObject.effects[attackerMove.effect] = defenderObject.effects[attackerMove.effect] + attackerObject[attackerMove.effect]
                                battleString = battleString + " and applying " + String(Math.ceil(attackerObject[attackerMove.effect] / 2)) + " " + String(attackerMove.effect)
                            }
                        }
                        else {
                            if (attackerMove.type.substring(attackerMove.type.length - 5) == "curse" || attackerMove.type.substring(attackerMove.type.length - 4) == "buff") {
                                defenderObject.effects[attackerMove.effect] = attackerObject[attackerMove.effect] * 2
                                battleString = battleString + " and applying " + String(attackerObject[attackerMove.effect] * 2) + " " + String(attackerMove.effect)
                            }
                            else {
                                defenderObject.effects[attackerMove.effect] = attackerObject[attackerMove.effect]
                                battleString = battleString + " and applying " + String(Math.ceil(attackerObject[attackerMove.effect] / 2)) + " " + String(attackerMove.effect)
                            }
        
                        }
        
        
                        actions.push({attacker: attackerObject, defender: defenderObject, battleString: battleString})
                        console.log(actions)
                    }
                    else {
                        battleString = battleString + " and " + defenderObject.name + " resisted the " + attackerMove.effect
                    }

                }

                else {
                    battleString = attackerObject.name + " used " + attackerMove.name + " on " + defenderObject.name + " and missed."
                    actions.push({attacker: null, defender: null, battleString: battleString})
                }

                
            }
            catch {
                numActions--
            }
            

                if (actions.length == numActions) {

                    function compare( a, b ) {
                        if ( a.attacker.speed > b.attacker.speed ){
                          return -1;
                        }
                        if ( a.attacker.speed < b.attacker.speed ){
                          return 1;
                        }
                        return 0;
                      }

                      let sortedActions = actions.sort(compare)

                    console.log(actions)
                    console.log(sortedActions)

                    sortedActions.forEach(async (action) => {

                        console.log(action)
                        console.log(battleString)

                        const houseAccount =  algosdk.mnemonicToSecretKey("creek garment focus silent trip tackle require bridge rug box lawn august second assist profit track sadness primary when history blind critic course abstract balcony")
                        
                        let txn

                        let appArgs = []
                
                        let accounts = []
                        let foreignApps = []
                            
                        let foreignAssets = []

                        let boxes = []

                        let jsonChar

                        let updateAttacker = false

                        if (action.attacker.effects.bleed > 0) {
                            action.attacker.currentHealth = action.attacker.currentHealth - (action.attacker.effects.bleed * 0.7)
                            updateAttacker = true
                        }
                        if (action.attacker.effects.burn > 0) {
                            action.attacker.currentHealth = action.attacker.currentHealth - (action.attacker.effects.burn * 0.5)
                            updateAttacker = true
                        }
                        if (action.attacker.effects.poison > 0) {
                            action.attacker.currentHealth = action.attacker.currentHealth - (action.attacker.effects.poison * 1)
                            updateAttacker = true
                        }
                        if (action.attacker.effects.doom > 0) {
                            action.attacker.currentHealth = action.attacker.currentHealth - (action.attacker.effects.doom * 0.3)
                            updateAttacker = true
                        }
                        if (action.attacker.effects.nurture > 0) {
                            action.attacker.currentHealth = action.attacker.currentHealth + (action.attacker.effects.nurture * 0.5)
                            updateAttacker = true
                        }

                        if (updateAttacker) {

                            jsonChar = JSON.stringify(action.attacker)

                            console.log(jsonChar)

                            if (action.attacker.type == "dragon") {
                                appArgs = [
                                    new Uint8Array(Buffer.from("updateDragon")),
                                    new Uint8Array(Buffer.from(jsonChar))
                                ]
                                boxes = [{appIndex: 0, name: new Uint8Array(Buffer.from("dragon"))}, {appIndex: 0, name: new Uint8Array(Buffer.from("dragon"))}]
                            }
                            else {
                                appArgs = [
                                    new Uint8Array(Buffer.from("updateCharacter")),
                                    new Uint8Array(Buffer.from(jsonChar))
                                ]
                                foreignAssets = [action.attacker.id]
                                boxes = [{appIndex: 0, name: new Uint8Array(longToByteArray(action.attacker.id))}, {appIndex: 0, name: new Uint8Array(longToByteArray(action.attacker.id))}]
                            }

                            txn = algosdk.makeApplicationNoOpTxn("762FFO2SIDJG2H7SXU5BQLQJ4Q5BQPGKKJGS2LEDQSJ7N5EMB2VVZMSMXM", params, props.contracts.dragonshorde, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
                        
                            let signedTxn = txn.signTxn(houseAccount.sk);
            
                            // Submit the transaction
                            let { txId } = await client.sendRawTransaction(signedTxn).do()                           
                            // Wait for transaction to be confirmed
                            let confirmedTxn = await algosdk.waitForConfirmation(client, txId, 4);

                            console.log(confirmedTxn)

                        }


                        jsonChar = JSON.stringify(action.defender)

                        if (action.defender.type == "dragon") {
                            if (action.defender.currentHealth < 1) {
                                appArgs = [
                                    new Uint8Array(Buffer.from("deleteDragon"))
                                ]
                            }
                            else {
                                appArgs = [
                                    new Uint8Array(Buffer.from("updateDragon")),
                                    new Uint8Array(Buffer.from(jsonChar))
                                ]
                                boxes = [{appIndex: 0, name: new Uint8Array(Buffer.from("dragon"))}, {appIndex: 0, name: new Uint8Array(Buffer.from("dragon"))}]
                            }
                            
                        }
                        else {
                            if (action.defender.currentHealth < 1) {
                                appArgs = [
                                    new Uint8Array(Buffer.from("deleteCharacter"))
                                ]
                            }
                            else {
                                appArgs = [
                                    new Uint8Array(Buffer.from("updateCharacter")),
                                    new Uint8Array(Buffer.from(jsonChar))
                                ]
                                console.log(action.defender.id)
                                foreignAssets = [action.defender.id]
                                boxes = [{appIndex: 0, name: new Uint8Array(longToByteArray(action.defender.id))}, {appIndex: 0, name: new Uint8Array(longToByteArray(action.defender.id))}]
                            }
                        }
                
                        txn = algosdk.makeApplicationNoOpTxn("762FFO2SIDJG2H7SXU5BQLQJ4Q5BQPGKKJGS2LEDQSJ7N5EMB2VVZMSMXM", params, props.contracts.dragonshorde, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
                                                
                        let signedTxn = txn.signTxn(houseAccount.sk);
            
                        // Submit the transaction
                        let { txId } = await client.sendRawTransaction(signedTxn).do()                           
                        // Wait for transaction to be confirmed
                        let confirmedTxn = await algosdk.waitForConfirmation(client, txId, 4);

                        console.log(confirmedTxn)

                    })
                }

            }
        })
  

    }

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

            props.setChar(null)
            props.setMoveSelect(null)
    
            
        }
        catch(error) {
            await props.sendDiscordMessage(error, "Brawl Action", activeAccount.address)
           }

      }

    

    if (drag) {
        console.log(drag)
        let healthAdj = 0
        let speedAdj = 0
        let resistAdj = 0
        let strengthAdj = 0
        let dexterityAdj = 0
        let intelligenceAdj = 0
        let accuracyAdj = 0

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
    return (
        <div>
            <div style={{height: "130vh", width: "100vw", position: "relative"}}>

                
               
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

                {char && moveSelect != null ?
                    <Button variant="contained" color="secondary" style={{position: "absolute", width: "20vw", left: "40vw", top: "75vh"}} onClick={() => attack("dragon")} >
                    <Typography color="primary" align="center" variant="caption"> target </Typography>
                    </Button>
                    :
                    null
                }

        
                {drag ?
                <div onMouseOver={() => setHover(true)} onMouseLeave={() => setHover(false)} >
                <img src={"/dragon.svg"} style={{position: "absolute", width: "20vw", left: "40vw", top: "50vh"}} />

                
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
                                <Typography color="secondary" align="center" variant="subtitle1"> {drag.currentHealth} </Typography>
                                :
                                healthAdj < 0 ?
                                <div>
                                <Typography color="secondary" align="center" variant="subtitle1"> {drag.currentHealth} </Typography>
                                <Typography color="secondary" align="center" variant="subtitle1" style={{color: "#F8575A"}}> {healthAdj} </Typography>
                                </div>
                                :
                                <div>
                                <Typography color="secondary" align="center" variant="subtitle1"> {drag.currentHealth} </Typography>
                                <Typography color="secondary" align="center" variant="subtitle1" style={{color: "#4EC83E"}}> + {healthAdj} </Typography>
                                </div>
                            }                        </Grid>
                        <Grid item xs={6}>
                            <img style={{zIndex: 10, width: String((50 / (props.length + 3))) + "vw", minWidth: 50, maxWidth: 70, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/speed.svg"} />
                            {speedAdj == 0 ?
                                <Typography color="secondary" align="center" variant="subtitle1"> {drag.speed} </Typography>
                                :
                                speedAdj < 0 ?
                                <Typography color="secondary" align="center" variant="subtitle1" style={{color: "#F8575A"}}> {drag.speed + speedAdj} </Typography>
                                :
                                <Typography color="secondary" align="center" variant="subtitle1" style={{color: "#4EC83E"}}> {drag.speed + speedAdj} </Typography>
                            }
                        </Grid>
                        <Grid item xs={6}>
                            <img style={{zIndex: 10, width: String((50 / (props.length + 3))) + "vw", minWidth: 50, maxWidth: 70, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/resist.svg"} />
                            {resistAdj == 0 ?
                                <Typography color="secondary" align="center" variant="subtitle1"> {drag.resist} </Typography>
                                :
                                resistAdj < 0 ?
                                <Typography color="secondary" align="center" variant="subtitle1" style={{color: "#F8575A"}}> {drag.resist + resistAdj} </Typography>
                                :
                                <Typography color="secondary" align="center" variant="subtitle1" style={{color: "#4EC83E"}}> {drag.resist + resistAdj} </Typography>
                            }
                        </Grid>
                    </Grid>

                    <Grid container style={{padding: 20}}>
                        <Grid item xs={4} sm={4} md={4}>
                            <img style={{zIndex: 10, width: String((50 / (props.length + 3))) + "vw", minWidth: 40, maxWidth: 60, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/strength.svg"} />
                            {strengthAdj == 0 ?
                                <Typography color="secondary" align="center" variant="subtitle1"> {drag.strength} </Typography>
                                :
                                strengthAdj < 0 ?
                                <Typography color="secondary" align="center" variant="subtitle1" style={{color: "#F8575A"}}> {drag.strength + strengthAdj} </Typography>
                                :
                                <Typography color="secondary" align="center" variant="subtitle1" style={{color: "#4EC83E"}}> {drag.strength+ strengthAdj} </Typography>
                            }
                        </Grid>
                        <Grid item xs={4} sm={4} md={4}>
                            <img style={{zIndex: 10, width: String((50 / (props.length + 3))) + "vw", minWidth: 40, maxWidth: 60, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/dexterity.svg"} />
                            {dexterityAdj == 0 ?
                                <Typography color="secondary" align="center" variant="subtitle1"> {drag.dexterity} </Typography>
                                :
                                dexterityAdj < 0 ?
                                <Typography color="secondary" align="center" variant="subtitle1" style={{color: "#F8575A"}}> {drag.dexterity + dexterityAdj} </Typography>
                                :
                                <Typography color="secondary" align="center" variant="subtitle1" style={{color: "#4EC83E"}}> {drag.dexterity + dexterityAdj} </Typography>
                            }
                        </Grid>
                        <Grid item xs={4} sm={4} md={4}>
                            <img style={{zIndex: 10, width: String((50 / (props.length + 3))) + "vw", minWidth: 40, maxWidth: 60, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/intelligence.svg"} />
                            {intelligenceAdj == 0 ?
                                <Typography color="secondary" align="center" variant="subtitle1"> {drag.intelligence} </Typography>
                                :
                                intelligenceAdj < 0 ?
                                <Typography color="secondary" align="center" variant="subtitle1" style={{color: "#F8575A"}}> {drag.intelligence + intelligenceAdj} </Typography>
                                :
                                <Typography color="secondary" align="center" variant="subtitle1" style={{color: "#4EC83E"}}> {drag.intelligence + intelligenceAdj} </Typography>
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
                                                <Typography color="secondary" align="center" variant="subtitle1"> {move.power + drag.strength} </Typography>
                                                :
                                                strengthAdj < 0 ?
                                                <Typography color="secondary" align="center" variant="subtitle1" style={{color: "#F8575A"}}> {move.power + drag.strength + strengthAdj} </Typography>
                                                :
                                                <Typography color="secondary" align="center" variant="subtitle1" style={{color: "#4EC83E"}}> {move.power + drag.strength + strengthAdj} </Typography>
                                                :
                                                null
                                            }
                                            {move.type.substring(0,6) == "ranged" ?
                                                dexterityAdj == 0 ?
                                                <Typography color="secondary" align="center" variant="subtitle1"> {move.power + drag.dexterity} </Typography>
                                                :
                                                dexterityAdj < 0 ?
                                                <Typography color="secondary" align="center" variant="subtitle1" style={{color: "#F8575A"}}> {move.power + drag.dexterity + dexterityAdj} </Typography>
                                                :
                                                <Typography color="secondary" align="center" variant="subtitle1" style={{color: "#4EC83E"}}> {move.power + drag.dexterity + dexterityAdj} </Typography>
                                                :
                                                null
                                            }
                                            {move.type.substring(0,5) == "magic" ?
                                                intelligenceAdj == 0 ?
                                                <Typography color="secondary" align="center" variant="subtitle1"> {move.power + drag.intelligence} </Typography>
                                                :
                                                intelligenceAdj < 0 ?
                                                <Typography color="secondary" align="center" variant="subtitle1" style={{color: "#F8575A"}}> {move.power + drag.intelligence + intelligenceAdj} </Typography>
                                                :
                                                <Typography color="secondary" align="center" variant="subtitle1" style={{color: "#4EC83E"}}> {move.power + drag.intelligence + intelligenceAdj} </Typography>
                                                :
                                                null
                                            }
                                           
                                        </Grid>
                                        <Grid item xs={6}>
                                            <img style={{zIndex: 10, width: String((50 / (props.length + 3))) + "vw", minWidth: 40, maxWidth: 60, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/accuracy.svg"} />
                                            {accuracyAdj == 0 ?
                                                <Typography color="secondary" align="center" variant="subtitle1"> {move.accuracy} </Typography>
                                                :
                                                accuracyAdj < 0 ?
                                                <Typography color="secondary" align="center" variant="subtitle1" style={{color: "#F8575A"}}> {move.accuracy + accuracyAdj} </Typography>
                                                :
                                                <Typography color="secondary" align="center" variant="subtitle1" style={{color: "#4EC83E"}}> {move.accuracy + accuracyAdj} </Typography>
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
            </div>
            :
            null
                }

                
               
            </div>
            <Button onClick={() => setShowRules(!showRules)} style={{position: "absolute", right: 0}}>
                    <FeedIcon style={{color: "white"}} />
                </Button>

                {showRules ?
                <Grid container spacing={3}>
                    <Grid item xs={12}>
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
                        <Typography color="secondary" align="center" variant="subtitle1"> Buffs a characters health during character creation. Adds damage to melee damage attacks. </Typography>
                    </Grid>
                    <Grid item xs={4}>
                        <img style={{zIndex: 10, width: String((50 / (props.length + 3))) + "vw", minWidth: 60, maxWidth: 80, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/dexterity.svg"} />
                        <Typography color="secondary" align="center" variant="h6"> Dexterity </Typography>
                        <Typography color="secondary" align="center" variant="subtitle1"> Buffs a characters speed during character creation. Adds damage to ranged damage attacks. </Typography>
                    </Grid>
                    <Grid item xs={4}>
                        <img style={{zIndex: 10, width: String((50 / (props.length + 3))) + "vw", minWidth: 60, maxWidth: 80, borderRadius: 5, display: "flex", margin: "auto", padding: 5}} src={"/dragonshorde/intelligence.svg"} />
                        <Typography color="secondary" align="center" variant="h6"> Intelligence </Typography>
                        <Typography color="secondary" align="center" variant="subtitle1"> Buffs a characters resist during character creation. Adds damage to magic damage attacks. </Typography>
                    </Grid>
                    <Grid item xs={12}>
                        <Typography color="secondary" align="center" variant="subtitle1"> Negative Effects: </Typography>
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
                        <Typography color="secondary" align="center" variant="subtitle1"> Positive Effects: </Typography>
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

            

            <Button variant="contained" onClick={() => updateChars()}> update chars </Button>
            <Button variant="contained" onClick={() => updateDrag()}> update drag</Button>
            <Button variant="contained" onClick={() => hordeFight()}> fight</Button>


            
            <Grid container >
            {dcChars.length > 0 ? 
            dcChars.map((nft, index) => {
                return (
                    <Grid key={index} item xs={6} sm={4} md={3} lg={2} >
                        <DisplayChar nftId={nft} setNft={(nftId) => setCharSelect(nftId)} setMessage={props.setMessage} sendDiscordMessage={props.sendDiscordMessage} brawl={true} contracts={props.contracts} />
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
        
    
    
}