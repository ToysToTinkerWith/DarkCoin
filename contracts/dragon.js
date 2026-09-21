
import algosdk from "algosdk";
import OpenAI from "openai";
import { CID } from 'multiformats/cid';
import * as mfsha2 from 'multiformats/hashes/sha2';
import * as digest from 'multiformats/hashes/digest';

import got from "got"

import pinataSDK from '@pinata/sdk'

const pinata = new pinataSDK({ pinataApiKey: "20eb37090eeb01ec1143", pinataSecretApiKey: "bde723d6003535689b55caee38bf7e7bd147f71568349f19ca8b36fa167bbc71" });

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    dangerouslyAllowBrowser: true
});

import { initializeApp, getApps } from "firebase/app"
import { getFirestore, doc, getDoc } from "firebase/firestore";


const firebaseConfig = {
    apiKey: "AIzaSyDqIv-4wBs-ublbAx0I_0PXTT1WmMqSRLY",
    authDomain: "dark-coin-dc4a3.firebaseapp.com",
    projectId: "dark-coin-dc4a3",
    storageBucket: "dark-coin-dc4a3.appspot.com",
    messagingSenderId: "167442935007",
    appId: "1:167442935007:web:f231176971bc58c7f84d6a",
    measurementId: "G-6DQ60L8DWM"
}

let firebase_app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

const db = getFirestore(firebase_app)

const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)

const houseAccount =  algosdk.mnemonicToSecretKey(process.env.LEGACY_HOUSE_MNEMONIC)

const creatorSecret = houseAccount.sk

const dragonAccount =  algosdk.mnemonicToSecretKey(process.env.LEGACY_DRAGON_MNEMONIC)


    const byteArrayToLong = (byteArray) => {
        var value = 0;
        for ( var i = 0; i < byteArray.length; i++) {
            value = (value * 256) + byteArray[i];
        }
    
        return value;
    };

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

    const getPoint = (points, byte) => Number(points?.[byte] || 0)

    const addCharacterValue = (character, key, amount) => {
        character[key] = Number(character?.[key] || 0) + Number(amount || 0)
    }

    const DEFAULT_CRIT_CHANCE = 25
    const DEFAULT_CRIT_DAMAGE = 200

    const getCharacterPercentStat = (character, key, fallbackValue) => {
        const raw = character?.[key]
        const value = Number(raw)

        return raw === undefined || raw === null || raw === "" || !Number.isFinite(value)
            ? fallbackValue
            : value
    }

    const ensureCharacterCritStats = (character) => {
        if (!character) return
        character.critChance = getCharacterPercentStat(character, "critChance", DEFAULT_CRIT_CHANCE)
        character.critDamage = getCharacterPercentStat(character, "critDamage", DEFAULT_CRIT_DAMAGE)
    }

    const applySkillPointBonuses = (character, points) => {
        ensureCharacterCritStats(character)

        addCharacterValue(character, "poison", getPoint(points, 0))
        addCharacterValue(character, "bleed", getPoint(points, 100))
        addCharacterValue(character, "burn", getPoint(points, 200))
        addCharacterValue(character, "freeze", getPoint(points, 300))
        addCharacterValue(character, "slow", getPoint(points, 400))
        addCharacterValue(character, "drown", getPoint(points, 500))
        addCharacterValue(character, "paralyze", getPoint(points, 600))
        addCharacterValue(character, "doom", getPoint(points, 700))

        addCharacterValue(character, "shield", getPoint(points, 800))
        addCharacterValue(character, "strengthen", getPoint(points, 900))
        addCharacterValue(character, "focus", getPoint(points, 1000))
        addCharacterValue(character, "empower", getPoint(points, 1100))
        addCharacterValue(character, "nurture", getPoint(points, 1200))
        addCharacterValue(character, "bless", getPoint(points, 1300))
        addCharacterValue(character, "hasten", getPoint(points, 1400))
        addCharacterValue(character, "cleanse", getPoint(points, 1500))

        const healthBonus =
            getPoint(points, 1600) * 5 +
            getPoint(points, 1601) * 4 +
            getPoint(points, 1602) * 3

        addCharacterValue(character, "health", healthBonus)
        addCharacterValue(character, "currentHealth", healthBonus)
        addCharacterValue(character, "speed", getPoint(points, 1700) * 2 + getPoint(points, 1701) + getPoint(points, 1702))
        addCharacterValue(character, "resist", getPoint(points, 1800) * 2 + getPoint(points, 1801) + getPoint(points, 1802) + getPoint(points, 2102))
        addCharacterValue(character, "strength", getPoint(points, 1900) * 2 + getPoint(points, 1901) + getPoint(points, 1902))
        addCharacterValue(character, "dexterity", getPoint(points, 2000) * 2 + getPoint(points, 2001) + getPoint(points, 2002))
        addCharacterValue(character, "intelligence", getPoint(points, 2100) * 2 + getPoint(points, 2101))
        addCharacterValue(character, "critChance", getPoint(points, 2200) * 0.5 + getPoint(points, 2201) * 0.5)
        addCharacterValue(character, "critDamage", getPoint(points, 2300) * 10 + getPoint(points, 2301) * 5 + getPoint(points, 2302) * 5)
        addCharacterValue(character, "accuracy", getPoint(points, 2202))
    }

    const getUrl = async (assetId) => {
        let nft = await indexerClient.searchForAssets().index(assetId).do();
        let name = nft.assets[0].params.name;
        if (name.substring(0, 18) == "Dark Coin Champion") {
            let addr = algosdk.decodeAddress(nft.assets[0].params.reserve);
            let mhdigest = digest.create(mfsha2.sha256.code, addr.publicKey);
            let ocid = CID.create(0, 0x70, mhdigest);
            return "https://ipfs.dark-coin.io/ipfs/" + ocid.toString();
        } else {
            return "https://ipfs.dark-coin.io/ipfs/" + nft.assets[0].params.url.slice(21);
        }
    };


    const updateChars = async () => {

        const contractBoxes = await indexerClient
        .searchForApplicationBoxes(1870514811)
        .limit(1000)
        .do();

        let brawlers = []

        contractBoxes.boxes.forEach((box) => {
            if (box.name.length == 8) {
                let assetId = byteArrayToLong(box.name)
            
                brawlers.push(assetId)
            }
            
        })

        console.log(brawlers)

            brawlers.slice((Math.floor(brawlers.length / 2))).forEach(async (champ) => {

                const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)
            
                let params = await client.getTransactionParams().do()
            
                let assetConfig = await indexerClient
                .lookupAssetTransactions(champ)
                .txType("acfg")
                .do();
                          
            
                let charStats = atob(assetConfig.transactions[assetConfig.transactions.length - 1].note)
            
                let char = JSON.parse(charStats)
                        
                let properties = JSON.stringify(char.properties)
            
                console.log(properties)
            
                let moveExample = JSON.stringify({
                    
                    type: "(melee damage, ranged damage, magic damage, melee curse, ranged curse, magic curse, melee buff, ranged buff, magic buff)",
                    effect: "('poison', 'bleed', 'burn', 'freeze', 'slow', 'paralyze', 'drown', or 'doom' if type of move is a curse or damage. 'shield', 'strengthen', 'empower', 'hasten', 'nurture', 'bless', 'focus', or 'cleanse' if type of move is buff)",
                    power: "(number between 10 and 40)",
                    accuracy: "(number between 25 and 100)",
                    description: "(description of move based on type and effect and the characters properties. move should target a single character. description should describe move to be able to target anyone. dont mention turns in the description.)",
                    name: "(string based on move description)"
                })
            
                let objectExample = JSON.stringify({
                    name: "(unique sounding name based on character properties)",
                    strength: "(number between 1 and 20)",
                    dexterity: "(number between 1 and 20)",
                    intelligence: "(number between 1 and 20)",
                    speed: "(number between 25 and 100)",
                    resist: "(number between 1 and 20)",
                    health: "(number between 100 and 200)",
                    effects: {},
                    moves: [
                        moveExample,
                        moveExample,
                        moveExample,
                        moveExample
                    ]
                })
            
                let messages = [
                {"role": "system", "content":  "You are a character object generator."},
                {"role": "user", "content":  "A Dark Coin Character has these properties: " + properties},
                {"role": "user", "content": "Create a character JSON object based off of the character's properties, that is the same structure as: " + objectExample + ". Make sure the moves array is an object array."},       
                ]
            
                let response = await openai.chat.completions.create({
                    model: "gpt-3.5-turbo",
                    messages: messages,
                    response_format: { "type": "json_object" }
                })
            
                let charObj = JSON.parse(response.choices[0].message.content)

                charObj["health"] = Number(charObj["health"])
                charObj["strength"] = Number(charObj["strength"])
                charObj["dexterity"] = Number(charObj["dexterity"])
                charObj["intelligence"] = Number(charObj["intelligence"])
                charObj["speed"] = Number(charObj["speed"])
                charObj["resist"] = Number(charObj["resist"])

                charObj["moves"].forEach((move, index) => {
                    charObj["moves"][index].power = Number(charObj["moves"][index].power)
                    charObj["moves"][index].accuracy = Number(charObj["moves"][index].accuracy)
                })
            

                if (charObj["health"] > 200) {
                    charObj["health"] = 200
                }

                if (charObj["strength"] > 20) {
                    charObj["strength"] = 20
                }

                if (charObj["dexterity"] > 20) {
                    charObj["dexterity"] = 20
                }

                if (charObj["intelligence"] > 20) {
                    charObj["intelligence"] = 20
                }

                if (charObj["resist"] > 20) {
                    charObj["resist"] = 20
                }

                if (charObj["speed"] > 100) {
                    charObj["speed"] = 100
                }

                charObj["health"] = charObj["health"] + (charObj["strength"] * 2)
                charObj["speed"] = charObj["speed"] + (Math.ceil(charObj["dexterity"] / 2))
                charObj["resist"] = charObj["resist"] + (Math.floor(charObj["intelligence"] / 2))

                charObj["currentHealth"] = Number(charObj["health"])

                let effectsArray = ['poison', 'bleed', 'burn', 'freeze', 'slow', 'paralyze', 'drown', 'doom', 'shield', 'strengthen', 'empower', 'hasten', 'nurture', 'bless', 'focus', 'cleanse']
            
                charObj["moves"].forEach((move, index) => {
                    if (!effectsArray.includes(charObj["moves"][index].effect)) {
                        charObj["moves"][index].effect = effectsArray[Math.floor(Math.random() * effectsArray.length)]
                    }
                    charObj[charObj["moves"][index].effect] = Math.floor(Math.random() * 5 + 1)
                    if (charObj["moves"][index].type == "melee damage" || charObj["moves"][index].type == "ranged damage" || charObj["moves"][index].type == "magic damage") {
            
                        charObj["moves"][index].power = charObj["moves"][index].power + 10
            
                        charObj["moves"][index].accuracy = charObj["moves"][index].accuracy - 10
            
                        if (charObj["moves"][index].type == "melee damage") {
                            charObj["moves"][index].power = charObj["moves"][index].power + charObj["strength"]
                        }
                        else if (charObj["moves"][index].type == "ranged damage") {
                            charObj["moves"][index].power = charObj["moves"][index].power + charObj["dexterity"]
                        }
                        else if (charObj["moves"][index].type == "magic damage") {
                            charObj["moves"][index].power = charObj["moves"][index].power + charObj["intelligence"]
                        }
            
                        if (charObj["moves"][index].accuracy >= 90) {
                            charObj["moves"][index].power - 10
                        }
                        else if (charObj["moves"][index].accuracy < 60) {
                            charObj["moves"][index].power + 10
                        }
                        else if (charObj["moves"][index].accuracy < 40) {
                            charObj["moves"][index].power + 20
                        }
                
                    }
                    else if (charObj["moves"][index].type == "melee curse" || charObj["moves"][index].type == "ranged curse" || charObj["moves"][index].type == "magic curse") {
                        charObj["moves"][index].power = charObj["moves"][index].power - 20
                        charObj["moves"][index].accuracy = charObj["moves"][index].accuracy + 10
                    }
                    else if (charObj["moves"][index].type == "melee buff" || charObj["moves"][index].type == "ranged buff" || charObj["moves"][index].type == "magic buff") {
                        charObj["moves"][index].power = charObj["moves"][index].power - 20
                        charObj["moves"][index].accuracy = charObj["moves"][index].accuracy + 10
                    }
            
                    
                    
            
                    if (charObj["moves"][index].power < 0) {
                        charObj["moves"][index].power = 0
                    }
            
                    if (charObj["moves"][index].accuracy > 100) {
                        charObj["moves"][index].accuracy = 100
                    }
                    
                })
            
                console.log(charObj)
            
                let jsonChar = JSON.stringify(charObj)
            
            
                let appArgs = []
                appArgs.push(
                    new Uint8Array(Buffer.from("updateCharacter")),
                    new Uint8Array(Buffer.from(jsonChar))
                    
                )
            
                let accounts = []
                let foreignApps = []
                    
                let foreignAssets = [champ]
            
                let assetInt = longToByteArray(champ)
            
                let box = new Uint8Array(assetInt)
            
                console.log(box)
            
                let boxes = [{appIndex: 0, name: box}, {appIndex: 0, name: box}, {appIndex: 0, name: box}, {appIndex: 0, name: box}]
                
                let txn = algosdk.makeApplicationNoOpTxn("762FFO2SIDJG2H7SXU5BQLQJ4Q5BQPGKKJGS2LEDQSJ7N5EMB2VVZMSMXM", params, 1870514811, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
                
                let signedTxn = txn.signTxn(houseAccount.sk);
                
                // Submit the transaction
                let { txId } = await client.sendRawTransaction(signedTxn).do()                           
                // Wait for transaction to be confirmed
                let confirmedTxn = await algosdk.waitForConfirmation(client, txId, 4);
    
                console.log(confirmedTxn)

            })
                
    }

    const updateDrag = async () => {

        const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)

        let params = await client.getTransactionParams().do()

        let moveExample = JSON.stringify({
            type: "(melee damage, ranged damage, magic damage, melee curse, ranged curse, magic curse, melee buff, ranged buff, magic buff)",
            effect: "('poison', 'bleed', 'burn', 'freeze', 'slow', 'paralyze', 'drown', or 'doom' if type of move is a curse or damage. 'shield', 'strengthen', 'empower', 'hasten', 'nurture', 'bless', 'focus', or 'cleanse' if type of move is buff)",
            power: "(number between 100 and 200)",
            accuracy: "(number between 25 and 100)",
            description: "(description of move based on type and effect. move should target a single character. description should describe move to be able to target anyone. dont mention turns in the description.)",
            name: "(string based on move description)"
        })

        let objectExample = JSON.stringify({
            name: "(dragon name)",
            type: "dragon",
            description: "(short description of the dragon)",
            strength: "(number between 1 and 50)",
            dexterity: "(number between 1 and 50)",
            intelligence: "(number between 1 and 50)",
            speed: "(number between 25 and 100)",
            resist: "(number between 1 and 40)",
            health: "40000",
            effects: {},
            moves: [
                moveExample,
                moveExample,
                moveExample,
                moveExample
            ]
        })

        let messages = [
        {"role": "system", "content":  "You are a dragon object generator."},
        {"role": "user", "content": "Create a dragon JSON object, that is the same structure as: " + objectExample},       
        ]

        let response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: messages,
            response_format: { "type": "json_object" }
        })

        let charObj = JSON.parse(response.choices[0].message.content)

        charObj["health"] = Number(charObj["health"])
        charObj["strength"] = Number(charObj["strength"])
        charObj["dexterity"] = Number(charObj["dexterity"])
        charObj["intelligence"] = Number(charObj["intelligence"])
        charObj["speed"] = Number(charObj["speed"])
        charObj["resist"] = Number(charObj["resist"])

        charObj["moves"].forEach((move, index) => {
            console.log(charObj["moves"][index])
            charObj["moves"][index]["power"] = Number(charObj["moves"][index]["power"])
            charObj["moves"][index]["accuracy"] = Number(charObj["moves"][index]["accuracy"])
        })
      

        if (charObj["health"] > 40000) {
            charObj["health"] = 40000
        }

        if (charObj["strength"] > 50) {
            charObj["strength"] = 50
        }

        if (charObj["dexterity"] > 50) {
            charObj["dexterity"] = 50
        }

        if (charObj["intelligence"] > 50) {
            charObj["intelligence"] = 50
        }

        if (charObj["resist"] > 40) {
            charObj["resist"] = 40
        }

        if (charObj["speed"] > 100) {
            charObj["speed"] = 100
        }


        charObj["speed"] = charObj["speed"] + (Math.ceil(charObj["dexterity"] / 2))
        charObj["resist"] = charObj["resist"] + (Math.floor(charObj["intelligence"] / 2))

        charObj["currentHealth"] = Number(charObj["health"])

        let effectsArray = ['poison', 'bleed', 'burn', 'freeze', 'slow', 'paralyze', 'drown', 'doom', 'shield', 'strengthen', 'empower', 'hasten', 'nurture', 'bless', 'focus', 'cleanse']


        charObj["moves"].forEach((move, index) => {
            if (!effectsArray.includes(charObj["moves"][index].effect)) {
                charObj["moves"][index].effect = effectsArray[Math.floor(Math.random() * effectsArray.length)]
            }
            charObj[charObj["moves"][index].effect] = Math.floor(Math.random() * 20 + 5)
            console.log(charObj["moves"][index].power)
            if (charObj["moves"][index].power > 200) {
                charObj["moves"][index].power = 200
            }
            if (charObj["moves"][index].power < 100) {
                charObj["moves"][index].power = 100
            }
            if (charObj["moves"][index].accuracy > 100) {
                charObj["moves"][index].accuracy = 100
            }
            if (charObj["moves"][index].type == "melee damage" || charObj["moves"][index].type == "ranged damage" || charObj["moves"][index].type == "magic damage") {

                charObj["moves"][index].power = charObj["moves"][index].power + 10

                charObj["moves"][index].accuracy = charObj["moves"][index].accuracy - 10

                if (charObj["moves"][index].type == "melee damage") {
                    charObj["moves"][index].power = charObj["moves"][index].power + charObj["strength"]
                }
                else if (charObj["moves"][index].type == "ranged damage") {
                    charObj["moves"][index].power = charObj["moves"][index].power + charObj["dexterity"]
                }
                else if (charObj["moves"][index].type == "magic damage") {
                    charObj["moves"][index].power = charObj["moves"][index].power + charObj["intelligence"]
                }

                if (charObj["moves"][index].accuracy >= 90) {
                    charObj["moves"][index].power - 10
                }
                else if (charObj["moves"][index].accuracy < 60) {
                    charObj["moves"][index].power + 10
                }
                else if (charObj["moves"][index].accuracy < 40) {
                    charObj["moves"][index].power + 20
                }
        
            }
            else if (charObj["moves"][index].type == "melee curse" || charObj["moves"][index].type == "ranged curse" || charObj["moves"][index].type == "magic curse") {
                charObj["moves"][index].power = charObj["moves"][index].power - 40
            }
            else if (charObj["moves"][index].type == "melee buff" || charObj["moves"][index].type == "ranged buff" || charObj["moves"][index].type == "magic buff") {

            }

            
            

            if (charObj["moves"][index].power < 0) {
                charObj["moves"][index].power = 0
            }

            if (charObj["moves"][index].accuracy > 100) {
                charObj["moves"][index].accuracy = 100
            }
            
        })

        
        const responseImage = await openai.images.generate({
            model: "dall-e-3",
            prompt: "Create a detailed, colorful image of this dragon:" + JSON.stringify({name: charObj.name, description: charObj.description} + " Do not put any letters or words in the image."),
            n: 1,
            size: "1024x1024",
        });

        console.log(responseImage)

        pinata.testAuthentication().then(() => {
            //handle successful authentication here
    
            const url = responseImage.data[0].url;
    
            (async () => {
                try {
                    
                    const reader = got.stream(url)
    
                        
                    const options = {
                        pinataMetadata: {
                            name: charObj.name,
                        },
                        pinataOptions: {
                            cidVersion: 0
                        }
                    };
                            
                    pinata.pinFileToIPFS(reader, options).then(async (result) => {
                        //handle results here
    
                        let ipfs = result.IpfsHash
    
                        if (ipfs) {
                
                        const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)
                        
                        let params = await client.getTransactionParams().do();
                
                        const creator = "WSEGWJDMJWLFUSPQ4CH6XBGCO2NNDM3Q7FC4EZMCRGHL5AW4HG3IWITHL4";
                        const defaultFrozen = false;    
                        const unitName = "DRAG"; 
                        const assetName = charObj.name;
                        const url = "https://ipfs.io/ipfs/" + ipfs;
                        const managerAddr = "WSEGWJDMJWLFUSPQ4CH6XBGCO2NNDM3Q7FC4EZMCRGHL5AW4HG3IWITHL4";
                        const reserveAddr = undefined;  
                        const freezeAddr = undefined;
                        const clawbackAddr = undefined;
                        const total = 1;                // NFTs have totalIssuance of exactly 1
                        const decimals = 0;             // NFTs have decimals of exactly 0
                        const note = new Uint8Array(Buffer.from(charObj.description))
                        const mtxn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
                        assetMetadataHash: undefined,
                        assetName:assetName,
                        assetURL: url,
                        clawback: clawbackAddr,
                        decimals:decimals,
                        defaultFrozen:defaultFrozen,
                        freeze: freezeAddr,
                        from:creator,
                        manager: managerAddr,
                        note: note,
                        rekeyTo:undefined,
                        reserve: reserveAddr,
                        suggestedParams: params,
                        total:total,
                        unitName:unitName,
                    });
                
                        // Sign the transaction
                        let signedTxnMint = mtxn.signTxn(dragonAccount.sk);
                
                    
                        // Submit the transaction
                        const txMint = await client.sendRawTransaction(signedTxnMint).do()

                        console.log(txMint)

                        let txIdMint = txMint.txId
                
                        let confirmedTxnMint = await algosdk.waitForConfirmation(client, txIdMint, 4);

                        console.log(confirmedTxnMint)

                        charObj.assetId = confirmedTxnMint["asset-index"]

                        console.log(charObj)

                        let jsonChar = JSON.stringify(charObj)

                        let appArgs = []
                        appArgs.push(
                            new Uint8Array(Buffer.from("updateDragon")),
                            new Uint8Array(Buffer.from(jsonChar))
                            
                        )

                        let accounts = []
                        let foreignApps = []
                            
                        let foreignAssets = []

                        let box = new Uint8Array(Buffer.from("dragon"))

                        console.log(box)

                        let boxes = [{appIndex: 0, name: box}, {appIndex: 0, name: box}, {appIndex: 0, name: box}, {appIndex: 0, name: box}]
                        
                        let txn = algosdk.makeApplicationNoOpTxn("762FFO2SIDJG2H7SXU5BQLQJ4Q5BQPGKKJGS2LEDQSJ7N5EMB2VVZMSMXM", params, 1870514811, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
                        
                        let signedTxn = txn.signTxn(houseAccount.sk);
                        
                        // Submit the transaction
                        let { txId } = await client.sendRawTransaction(signedTxn).do()                           
                        // Wait for transaction to be confirmed
                        let confirmedTxn = await algosdk.waitForConfirmation(client, txId, 4);

                        console.log(confirmedTxn)
                
                
                        }
        
                            
                        }).catch((err) => {
                            //handle error here
                            console.log(err)
                        });
    
    
                } catch (error) {
                    console.log(error)
                }
            })();
            
        })


        


        

    }

    const effects = async () => {

        const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)

        let params = await client.getTransactionParams().do()

        const boxesResponse = await client.getApplicationBoxes(1870514811).do();

        let champs = []

        boxesResponse.boxes.forEach(async (box, index) => {

            if (box.name.length == 15 || box.name.length == 6) {

                let txn

                let appArgs = []
        
                let accounts = []
                let foreignApps = []
                    
                let foreignAssets = []

                let boxes = []

                let response = await indexerClient.lookupApplicationBoxByIDandName(1870514811, box.name).do();

                let champObject = JSON.parse(new TextDecoder().decode(response.value))

                let updateAttacker = false

                let addEffects = ""

                if (!champObject.effects) {
                    champObject.effects = {}
                }

                if (champObject.effects.bleed > 0) {
                    champObject.currentHealth = Number(champObject.currentHealth) - Number(champObject.effects.bleed * 0.7)
                    updateAttacker = true
                    addEffects = addEffects + champObject.name + " took " + String((champObject.effects.bleed * 0.7).toFixed(1)) + " from bleed. "
                }
                if (champObject.effects.burn > 0) {
                    champObject.currentHealth = Number(champObject.currentHealth) - Number(champObject.effects.burn * 0.5)
                    updateAttacker = true
                    addEffects = addEffects + champObject.name + " took " + String((champObject.effects.burn * 0.5).toFixed(1)) + " from burn. "
        
                }
                if (champObject.effects.poison > 0) {
                    champObject.currentHealth = Number(champObject.currentHealth) - Number(champObject.effects.poison * 1)
                    updateAttacker = true
                    addEffects = addEffects + champObject.name + " took " + String((champObject.effects.poison * 1).toFixed(1)) + " from poison. "
        
                }
                if (champObject.effects.doom > 0) {
                    champObject.currentHealth = Number(champObject.currentHealth) - Number(champObject.effects.doom * 0.3)
                    updateAttacker = true
                    addEffects = addEffects + champObject.name + " took " + String((champObject.effects.doom * 0.3).toFixed(1)) + " from doom. "
        
                }
                if (champObject.effects.nurture > 0) {
                    champObject.currentHealth = Number(champObject.currentHealth) + Number(champObject.effects.nurture * 0.5)
                    updateAttacker = true
                    addEffects = addEffects + champObject.name + " gained " + String((champObject.effects.nurture * 0.5).toFixed(1)) + " from nurture. "
        
                }
        
                if (champObject.currentHealth < 1) {
                    champObject.currentHealth = 1
                }

        
                if (updateAttacker) {

                    let url
        
                    let jsonChar = JSON.stringify(champObject)
        
                    if (champObject.type == "dragon") {

                            url = await getUrl(champObject.assetId)

                            appArgs = [
                                new Uint8Array(Buffer.from("updateDragon")),
                                new Uint8Array(Buffer.from(jsonChar))
                            ]
                            boxes = [{appIndex: 0, name: new Uint8Array(Buffer.from("dragon"))}, {appIndex: 0, name: new Uint8Array(Buffer.from("dragon"))}]
                    }
                    else {
                        console.log(byteArrayToLong(box.name.slice(0,8)))
                        url = await getUrl(byteArrayToLong(box.name.slice(0,8)))

                        appArgs = [
                            new Uint8Array(Buffer.from("updateCurrentCharacter")),
                            new Uint8Array(Buffer.from(jsonChar))
                        ]
                        foreignAssets = [byteArrayToLong(box.name.slice(0,8))]
                        boxes = [{appIndex: 0, name: box.name}, {appIndex: 0, name: box.name}]
                    }
                
                    let embeds = []
                    


                    embeds.push({
                        "title": addEffects,
                        "color": 0,
                        "image": { "url": url },
                        "description": 'HP: ' + String(champObject.currentHealth.toFixed(1)) + ' / ' + String(champObject.health)

                    })
        
                    console.log(embeds)

                    
        
                    const response = await fetch("https://discord.com/api/webhooks/1305242237747204106/R2hpw_os4jcSYwQYiWdjUN13tdchDtzMsUMtSTpLAURf-4wgICTUp1JY0DY7q9oFSCgL", {
                        method: "POST",
                        body: JSON.stringify({
                            username: "DragonsHorde",
                            embeds: embeds
                        }),
                        headers: {
                        "Content-Type": "application/json",
                        },
                    });
                            
                    txn = algosdk.makeApplicationNoOpTxn("762FFO2SIDJG2H7SXU5BQLQJ4Q5BQPGKKJGS2LEDQSJ7N5EMB2VVZMSMXM", params, 1870514811, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
                
                    let signedTxn = txn.signTxn(houseAccount.sk);
        
                    // Submit the transaction
                    let { txId } = await client.sendRawTransaction(signedTxn).do()                           
                    // Wait for transaction to be confirmed
                    let confirmedTxn = await algosdk.waitForConfirmation(client, txId, 4);
        
                    console.log(confirmedTxn)
        
                }

            }

        })

        
    
    }

    const reward = async (winner, dragId) => {

        const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)

        let params = await client.getTransactionParams().do()

        const status = await client.status().do();
        const currentRound = status['last-round'];

        const address = "SSG6DFUAQEUI7CX4PMPIXL2G23S5EAMQCDOCDQ5OFUHECPWTYYPDFNHEJQ";

        const accountAssets = await indexerClient.lookupAccountAssets(address).do();

        console.log(accountAssets.assets[0])

        let darkcoin

        accountAssets.assets.forEach((asset) => {
            if (asset["asset-id"] == 1088771340) {
                darkcoin = asset.amount
            }
        })

        console.log(darkcoin)

        const boxesResponse = await client.getApplicationBoxes(1870514811).do();

        let winners = []

        boxesResponse.boxes.forEach(async (box, index) => {

            if (box.name.length == 15) {           
                winners.push(box.name)
            }
        })

        console.log(winners)

        const assetInfo = await indexerClient.lookupAssetByID(winner).do();

        let winnerAddress

        const winnerHolders = await indexerClient.lookupAssetBalances(winner).do();

        winnerHolders.balances.forEach((balance) => {
            console.log(balance)
            if (balance.amount == 1) {
                winnerAddress = balance.address
            }
        })

        try {

            let txns = []

            let addrOptedAssets = []
            
            let responseAddr
            let nextTokenAddr

            responseAddr = await indexerClient.lookupAccountAssets("5U3SSPACPICLNX4KDZGG6CED7C6R6VVXEIJN7YXBYHDNAUXDINONRIT65Q").do();
            nextTokenAddr = responseAddr["next-token"]
            
            responseAddr.assets.forEach((asset) => {
            if (asset.amount >= 0) {
                addrOptedAssets.push(asset["asset-id"])
            }
            })

            while (responseAddr.assets.length == 1000) {
            responseAddr = await indexerClient.lookupAccountAssets("5U3SSPACPICLNX4KDZGG6CED7C6R6VVXEIJN7YXBYHDNAUXDINONRIT65Q").nextToken(nextTokenAddr).limit(1000).do();
            nextTokenAddr = responseAddr["next-token"]
            responseAddr.assets.forEach((asset) => {
                if (asset.amount >= 0) {
                    addrOptedAssets.push(asset["asset-id"])
                }
            })  
            }

            console.log(addrOptedAssets)

            let opted = addrOptedAssets.includes(dragId)

            console.log(opted)

            if (!opted) {

            let ftxn = algosdk.makePaymentTxnWithSuggestedParams(
                "WSEGWJDMJWLFUSPQ4CH6XBGCO2NNDM3Q7FC4EZMCRGHL5AW4HG3IWITHL4", 
                "5U3SSPACPICLNX4KDZGG6CED7C6R6VVXEIJN7YXBYHDNAUXDINONRIT65Q", 
                100000, 
                undefined,
                undefined,
                params
            );

            txns.push(ftxn)

            let appArgs = []
            appArgs.push(
                new Uint8Array(Buffer.from("optin"))
            )

            let accounts = []
            let foreignApps = []
                
            let foreignAssets = [dragId]
            
            
            let otxn = algosdk.makeApplicationNoOpTxn("WSEGWJDMJWLFUSPQ4CH6XBGCO2NNDM3Q7FC4EZMCRGHL5AW4HG3IWITHL4", params, 2638261330, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined);

            txns.push(otxn)

            }

            let atxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
            "WSEGWJDMJWLFUSPQ4CH6XBGCO2NNDM3Q7FC4EZMCRGHL5AW4HG3IWITHL4", 
            "5U3SSPACPICLNX4KDZGG6CED7C6R6VVXEIJN7YXBYHDNAUXDINONRIT65Q", 
            undefined, 
            undefined,
            1,  
            undefined, 
            dragId, 
            params
            );

            txns.push(atxn)
            
            let appArgs = []
            appArgs.push(
            new Uint8Array(Buffer.from("addboxNFT"))
            )

            console.log(winnerAddress)
        
            let accounts = [winnerAddress]
            let foreignApps = []
            
            let foreignAssets = [dragId]
        
            let encoded = algosdk.encodeUint64(dragId)
            
            const pk = algosdk.decodeAddress(winnerAddress)
            const addrArray = pk.publicKey
        
            let accountBox = new Uint8Array([...addrArray, ...encoded])

            console.log(accountBox)
        
            const boxes = [{appIndex: 0, name: accountBox}]
        
            let txn = algosdk.makeApplicationNoOpTxn("WSEGWJDMJWLFUSPQ4CH6XBGCO2NNDM3Q7FC4EZMCRGHL5AW4HG3IWITHL4", params, 2638261330, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);

            txns.push(txn)
                
            let txgroup = algosdk.assignGroupID(txns)
        
            let signedTxns = []

            console.log(txns)
            
            txns.forEach((txn) => {
            let signedTxn = txn.signTxn(dragonAccount.sk);
            signedTxns.push(signedTxn)
    
            })

            console.log(signedTxns)
            
            const { txId } = await client.sendRawTransaction(signedTxns).do()

            console.log(txId)

            let confirmedTxn = await algosdk.waitForConfirmation(client, txId, 4);

            console.log(confirmedTxn)

            let dragNft = await indexerClient.searchForAssets().index(dragId).do();
            console.log(dragNft)
            let dragUrl = "https://ipfs.dark-coin.io/ipfs/" + dragNft.assets[0].params.url.slice(21)

            let winnerURL = await getUrl(winner)

            let embeds = []

            embeds.push({
                "title": assetInfo.asset.params.name + " has won the Dragon NFT.",
                "description": "Follow the link to claim " + dragNft.assets[0].params.name,
                "url": "https://dark-coin.com/tools/mailbox",
                "thumbnail": { "url": winnerURL },
                "image": { "url": dragUrl }
              })

            console.log(embeds)

            const response = await fetch("https://discord.com/api/webhooks/1305242237747204106/R2hpw_os4jcSYwQYiWdjUN13tdchDtzMsUMtSTpLAURf-4wgICTUp1JY0DY7q9oFSCgL", {
                method: "POST",
                body: JSON.stringify({
                    username: "DragonsHorde NFT Reward",
                    embeds: embeds
                }),
                headers: {
                "Content-Type": "application/json",
                },
            });

            console.log(response)


        }
        catch(error) {
            console.log(error)
        }

        try {

        let appArgs = [
            new Uint8Array(Buffer.from("reward")),
            algosdk.encodeUint64(Math.floor(darkcoin / 4))
        ]

        let accounts = [winnerAddress]
        let foreignApps = []
            
        let foreignAssets = [1088771340, winner]

        let boxes = []

        let txn = algosdk.makeApplicationNoOpTxn("762FFO2SIDJG2H7SXU5BQLQJ4Q5BQPGKKJGS2LEDQSJ7N5EMB2VVZMSMXM", params, 1870514811, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
        
        let signedTxn = txn.signTxn(houseAccount.sk);
        
        // Submit the transaction
        let { txId } = await client.sendRawTransaction(signedTxn).do()
        // Wait for transaction to be confirmed
        let confirmedTxn = await algosdk.waitForConfirmation(client, txId, 4);

        console.log(confirmedTxn)

        let embeds = []

        embeds.push({
            "title": "Slayer Reward",
            "url": "https://allo.info/tx/" + txId,
            "description": String(((Math.floor(darkcoin / 4)) / 1000000).toFixed(0)) + " awarded to " + assetInfo.asset.params.name,
            "color": 0
        })

        console.log(embeds)

        const response = await fetch("https://discord.com/api/webhooks/1305242237747204106/R2hpw_os4jcSYwQYiWdjUN13tdchDtzMsUMtSTpLAURf-4wgICTUp1JY0DY7q9oFSCgL", {
            method: "POST",
            body: JSON.stringify({
                username: "DragonsHorde Reward",
                embeds: embeds
            }),
            headers: {
            "Content-Type": "application/json",
            },
        });

        console.log(response)
        }
        catch {

        }

        let count = 0

        while (count < winners.length) {

            try {

            let txns = []

            const assetBalances = await indexerClient.lookupAssetBalances(byteArrayToLong(winners[count])).do();

            const assetInfo = await indexerClient.lookupAssetByID(byteArrayToLong(winners[count])).do();

            console.log(assetInfo.asset.params.name)

            let address

            assetBalances.balances.forEach((balance) => {
                if (balance.amount == 1) {
                    address = balance.address
                }
            })

            let appArgs = [
                new Uint8Array(Buffer.from("reward")),
                algosdk.encodeUint64(Math.floor(((darkcoin - Math.floor(darkcoin / 4)) / winners.length))),
                algosdk.encodeUint64(byteArrayToLong(winners[count]))
            ]
    
            let accounts = [address]
            let foreignApps = []
                
            let foreignAssets = [1088771340, byteArrayToLong(winners[count])]
    
            let boxes = []
                
            let txn = algosdk.makeApplicationNoOpTxn("762FFO2SIDJG2H7SXU5BQLQJ4Q5BQPGKKJGS2LEDQSJ7N5EMB2VVZMSMXM", params, 1870514811, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
            
            txns.push(txn)

            appArgs = [
                new Uint8Array(Buffer.from("grantXp")),
                algosdk.encodeUint64(100)
            ]
            foreignAssets = [byteArrayToLong(winners[count])]
            let assetInt = longToByteArray(byteArrayToLong(winners[count]))
            let assetBox = new Uint8Array([...assetInt, ...new Uint8Array(Buffer.from("xp"))])    
            boxes = [{appIndex: 0, name: assetBox}]
            let xtxn = algosdk.makeApplicationNoOpTxn("762FFO2SIDJG2H7SXU5BQLQJ4Q5BQPGKKJGS2LEDQSJ7N5EMB2VVZMSMXM", params, 1870514811, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
            txns.push(xtxn)

            let txgroup = algosdk.assignGroupID(txns)

            let signedTxns = []

            console.log(txns)
            
            txns.forEach((txn) => {
            let signedTxn = txn.signTxn(houseAccount.sk);
            signedTxns.push(signedTxn)
    
            })
                        
            // Submit the transaction
            let { txId } = await client.sendRawTransaction(signedTxns).do()
            // Wait for transaction to be confirmed
            let confirmedTxn = await algosdk.waitForConfirmation(client, txId, 4);

            console.log(confirmedTxn)

            let embeds = []

            embeds.push({
                "title": "Reward",
                "url": "https://allo.info/tx/" + txId,
                "description": String((Math.floor(((darkcoin - Math.floor(darkcoin / 4)) / winners.length)) / 1000000).toFixed(0)) + " awarded to " + assetInfo.asset.params.name,
                "color": 0
            })

            console.log(embeds)

            const response = await fetch("https://discord.com/api/webhooks/1305242237747204106/R2hpw_os4jcSYwQYiWdjUN13tdchDtzMsUMtSTpLAURf-4wgICTUp1JY0DY7q9oFSCgL", {
                method: "POST",
                body: JSON.stringify({
                    username: "DragonsHorde Reward",
                    embeds: embeds
                }),
                headers: {
                "Content-Type": "application/json",
                },
            });

            console.log(response)

            count++

            }
            catch {
                count++
            }

        }

        

    }

    const round = async (actions) => {

        console.log(actions)

        const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)

        let params = await client.getTransactionParams().do()

        const status = await client.status().do();
        const currentRound = status['last-round'];

        const address = "SSG6DFUAQEUI7CX4PMPIXL2G23S5EAMQCDOCDQ5OFUHECPWTYYPDFNHEJQ";

        const accountAssets = await indexerClient.lookupAccountAssets(address).do();

        let darkcoin

        accountAssets.assets.forEach((asset) => {
            if (asset["asset-id"] == 1088771340) {
                darkcoin = asset.amount
            }
        })

        let count = 0

        let events = []
        let embeds = []

        let dragonDied = null

        while(count < actions.length) {

            let action = actions[count]

            try {

            ensureCharacterCritStats(action.attacker)

            let strengthAdj = 0
            let dexterityAdj = 0
            let intelligenceAdj = 0
            let accuracyAdj = 0
            let critChanceAdj = 0


            if (action.attacker.effects["bleed"]) {
                strengthAdj -= action.attacker.effects["bleed"] * 0.1
            }
            if (action.attacker.effects["burn"]) {
                intelligenceAdj -= action.attacker.effects["burn"] * 0.1
                strengthAdj += action.attacker.effects["burn"] * 0.1
            }
            if (action.attacker.effects["freeze"]) {
                dexterityAdj -= action.attacker.effects["freeze"] * 0.2
            }
            if (action.attacker.effects["slow"]) {
                dexterityAdj -= action.attacker.effects["slow"] * 0.1
            }
            if (action.attacker.effects["paralyze"]) {
                accuracyAdj -= action.attacker.effects["paralyze"] * 0.2
            }
            if (action.attacker.effects["drown"]) {
                dexterityAdj -= action.attacker.effects["drown"] * 0.3
                accuracyAdj -= action.attacker.effects["drown"] * 0.1
            }
            if (action.attacker.effects["doom"]) {
                intelligenceAdj -= action.attacker.effects["doom"] * 0.2
            }

            
            if (action.attacker.effects["strengthen"]) {
                strengthAdj += action.attacker.effects["strengthen"] * 0.3
            }
            if (action.attacker.effects["empower"]) {
                intelligenceAdj += action.attacker.effects["empower"] * 0.3
            }
            if (action.attacker.effects["hasten"]) {
                dexterityAdj += action.attacker.effects["hasten"] * 0.3
            }
            if (action.attacker.effects["bless"]) {
                strengthAdj += action.attacker.effects["bless"] * 0.2
                intelligenceAdj += action.attacker.effects["bless"] * 0.2
            }
            if (action.attacker.effects["focus"]) {
                accuracyAdj += action.attacker.effects["focus"] * 0.3
                critChanceAdj += action.attacker.effects["focus"] * 0.04
            }

            let responseDefender 
            
            if (action.defender.length == 6) {
                responseDefender = await indexerClient.lookupApplicationBoxByIDandName(1870514811, action.defender).do();
            }
            else {
                console.log(new Uint8Array([...action.defender, ...new Uint8Array(Buffer.from("current"))]))
                responseDefender = await indexerClient.lookupApplicationBoxByIDandName(1870514811, new Uint8Array([...action.defender, ...new Uint8Array(Buffer.from("current"))])).do();
            }

            let defenderObject = JSON.parse(new TextDecoder().decode(responseDefender.value))
            ensureCharacterCritStats(defenderObject)

            if (!defenderObject.effects) {
                defenderObject.effects = {}
            }

            let resistAdj = 0

            if (defenderObject.effects["bless"]) {
                resistAdj += defenderObject.effects["bless"] * 0.1
            }

            if (defenderObject.effects["doom"]) {
                resistAdj -= defenderObject.effects["doom"] * 0.2
            }

            let hit = false
            let hitRoll = Math.floor(Math.random() * 100) + 1
            
            if (hitRoll <= (action.move.accuracy + accuracyAdj)) {
                hit = true
            }

            let battleString

            let attackerURL
            let defenderURL
            let moveUrl

            if (action.attacker.type == 'dragon') {
                attackerURL = await getUrl(action.attacker.assetId)
            } else {
                attackerURL = await getUrl(action.attacker.id)
            }

            if (defenderObject.type == "dragon") {
                defenderURL = await getUrl(defenderObject.assetId)

            }
            else {
                defenderURL = await getUrl(byteArrayToLong(action.defender))
            }

            moveUrl = action.move.url

            if (hit) {
                const isDamageMove = String(action.move?.type || "").includes("damage")
                const critChance = Math.max(
                    0,
                    Math.min(
                        100,
                        getCharacterPercentStat(action.attacker, "critChance", DEFAULT_CRIT_CHANCE) + critChanceAdj
                    )
                )
                const critDamageMultiplier = Math.max(
                    0,
                    getCharacterPercentStat(action.attacker, "critDamage", DEFAULT_CRIT_DAMAGE) / 100
                )
                const criticalHit = isDamageMove && Math.random() * 100 < critChance
                const applyCriticalDamage = (amount) => criticalHit ? amount * critDamageMultiplier : amount
                

                if (action.move.type.substring(action.move.type.length - 4) == "buff") {
                    battleString = action.attacker.name + " used " + action.move.name + " on " + defenderObject.name + " healing "

                    if (action.move.type == "melee buff") {

                        defenderObject.currentHealth = defenderObject.currentHealth + action.move.power + action.attacker.strength + strengthAdj

                        battleString = battleString + (action.move.power + action.attacker.strength + strengthAdj).toFixed(1)

                    }

                    if (action.move.type == "ranged buff") {

                        defenderObject.currentHealth = defenderObject.currentHealth + action.move.power + action.attacker.dexterity + dexterityAdj

                        battleString = battleString + (action.move.power + action.attacker.dexterity + dexterityAdj).toFixed(1)

                    }

                    if (action.move.type == "magic buff") {

                        defenderObject.currentHealth = defenderObject.currentHealth + action.move.power + action.attacker.intelligence + intelligenceAdj

                        battleString = battleString + (action.move.power + action.attacker.intelligence + intelligenceAdj).toFixed(1)

                    }

                    if (defenderObject.currentHealth > defenderObject.health) {
                        defenderObject.currentHealth = defenderObject.health
                    }

                }
                else {

                    battleString = action.attacker.name + " used " + action.move.name + " on " + defenderObject.name + " dealing "

                    if (action.move.type.substring(0,5) == "melee") {
                        const damage = applyCriticalDamage(action.move.power + action.attacker.strength + strengthAdj)

                        defenderObject.currentHealth = defenderObject.currentHealth - damage
        
                        battleString = battleString + damage.toFixed(1)
                    }
        
                    if (action.move.type.substring(0,6) == "ranged") {
                        const damage = applyCriticalDamage(action.move.power + action.attacker.dexterity + dexterityAdj)
        
                        defenderObject.currentHealth = defenderObject.currentHealth - damage
        
                        battleString = battleString + damage.toFixed(1)
                    }
        
                    if (action.move.type.substring(0,5) == "magic") {
                        const damage = applyCriticalDamage(action.move.power + action.attacker.intelligence + intelligenceAdj)
        
                        defenderObject.currentHealth = defenderObject.currentHealth - damage
        
                        battleString = battleString + damage.toFixed(1)
                    }

                    if (criticalHit) {
                        battleString = battleString + " with a critical hit"
                    }

                }

                let effectsRoll = Math.floor(Math.random() * 100) + 1
                let effectHit = false
                if (effectsRoll >= (defenderObject.resist + resistAdj)) {
                    effectHit = true
                }

                if (action.move.type.substring(action.move.type.length - 4) == "buff") {
                    effectHit = true
                }

                if (effectHit) {

                    if (defenderObject.effects[action.move.effect]) {
                        if (action.move.type.substring(action.move.type.length - 5) == "curse" || action.move.type.substring(action.move.type.length - 4) == "buff") {
                            defenderObject.effects[action.move.effect] = defenderObject.effects[action.move.effect] + (action.attacker[action.move.effect] * 2)
                            battleString = battleString + " and applying " + String(action.attacker[action.move.effect] * 2) + " " + String(action.move.effect)
    
                        }
                        else {
                            defenderObject.effects[action.move.effect] = defenderObject.effects[action.move.effect] + action.attacker[action.move.effect]
                            battleString = battleString + " and applying " + String(Math.ceil(action.attacker[action.move.effect] / 2)) + " " + String(action.move.effect)
                        }
                    }
                    else {
                        if (action.move.type.substring(action.move.type.length - 5) == "curse" || action.move.type.substring(action.move.type.length - 4) == "buff") {
                            defenderObject.effects[action.move.effect] = action.attacker[action.move.effect] * 2
                            battleString = battleString + " and applying " + String(action.attacker[action.move.effect] * 2) + " " + String(action.move.effect)
                        }
                        else {
                            defenderObject.effects[action.move.effect] = action.attacker[action.move.effect]
                            battleString = battleString + " and applying " + String(Math.ceil(action.attacker[action.move.effect] / 2)) + " " + String(action.move.effect)
                        }
    
                    }
    
    
                }
                else {
                    battleString = battleString + " and " + defenderObject.name + " resisted the " + action.move.effect
                }

                let txns = []

                let appArgs = []
        
                let accounts = []
                let foreignApps = []
                    
                let foreignAssets = []

                let boxes = []

                let jsonChar = JSON.stringify(defenderObject)

                let playerKill = false
                let dragonKill = false

                if (defenderObject.type == "dragon") {

                    if (defenderObject.currentHealth < 1) {
                        appArgs = [
                            new Uint8Array(Buffer.from("deleteDragon")),
                            new Uint8Array(Buffer.from(battleString))
                        ]
                        foreignAssets = [action.attacker.id]
                        boxes = [{appIndex: 0, name: new Uint8Array(Buffer.from("dragon"))}, {appIndex: 0, name: new Uint8Array(Buffer.from("dragon"))}]
                        battleString = battleString + ". " + defenderObject.name + " has died. The horde has been claimed." + String(Math.floor(darkcoin / 1000000)) + " awarded to the champions."
                        dragonDied = action.attacker.id
                        count += 1000
                        dragonKill = true
                        


                    }
                    else {
                        appArgs = [
                            new Uint8Array(Buffer.from("updateDragon")),
                            new Uint8Array(Buffer.from(jsonChar)),
                            new Uint8Array(Buffer.from(battleString))
                        ]
                        foreignAssets = [action.attacker.id]

                        boxes = [{appIndex: 0, name: new Uint8Array(Buffer.from("dragon"))}, {appIndex: 0, name: new Uint8Array(Buffer.from("dragon"))}]

                    }
                    
                }
                else {

                    if (defenderObject.currentHealth <= 0) {
                        appArgs = [
                            new Uint8Array(Buffer.from("deleteCharacter")),
                            new Uint8Array(Buffer.from(battleString))
                        ]
                        foreignAssets = [byteArrayToLong(action.defender), action.attacker.id]
                        boxes = [{appIndex: 0, name: new Uint8Array([...action.defender, ...new Uint8Array(Buffer.from("current"))])}, {appIndex: 0, name: new Uint8Array([...action.defender, ...new Uint8Array(Buffer.from("current"))])}]
                        battleString = battleString + ". " + defenderObject.name + " has died."
                        playerKill = true


                    }
                    else {
                        appArgs = [
                            new Uint8Array(Buffer.from("updateCurrentCharacter")),
                            new Uint8Array(Buffer.from(jsonChar)),
                            new Uint8Array(Buffer.from(battleString))
                        ]
                        foreignAssets = [byteArrayToLong(action.defender), action.attacker.id]
                        boxes = [{appIndex: 0, name: new Uint8Array([...action.defender, ...new Uint8Array(Buffer.from("current"))])}, {appIndex: 0, name: new Uint8Array([...action.defender, ...new Uint8Array(Buffer.from("current"))])}]

                    }
                }

                let txn = algosdk.makeApplicationNoOpTxn("762FFO2SIDJG2H7SXU5BQLQJ4Q5BQPGKKJGS2LEDQSJ7N5EMB2VVZMSMXM", params, 1870514811, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
                
                txns.push(txn)
                console.log(battleString)

                if (playerKill) {

                    appArgs = [
                        new Uint8Array(Buffer.from("grantXp")),
                        algosdk.encodeUint64(10)
                    ]
                    foreignAssets = [action.attacker.id]
                    let assetInt = longToByteArray(action.attacker.id)
                    let assetBox = new Uint8Array([...assetInt, ...new Uint8Array(Buffer.from("xp"))])    
                    boxes = [{appIndex: 0, name: assetBox}]
                    let xtxn = algosdk.makeApplicationNoOpTxn("762FFO2SIDJG2H7SXU5BQLQJ4Q5BQPGKKJGS2LEDQSJ7N5EMB2VVZMSMXM", params, 1870514811, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
                    txns.push(xtxn)
                }

                if (dragonKill) {

                    appArgs = [
                        new Uint8Array(Buffer.from("grantXp")),
                        algosdk.encodeUint64(100)
                    ]
                    foreignAssets = [action.attacker.id]
                    let assetInt = longToByteArray(action.attacker.id)
                    let assetBox = new Uint8Array([...assetInt, ...new Uint8Array(Buffer.from("xp"))])    
                    boxes = [{appIndex: 0, name: assetBox}]
                    let xtxn = algosdk.makeApplicationNoOpTxn("762FFO2SIDJG2H7SXU5BQLQJ4Q5BQPGKKJGS2LEDQSJ7N5EMB2VVZMSMXM", params, 1870514811, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
                    txns.push(xtxn)
                }

                if (txns.length > 1) {
                    let txgroup = algosdk.assignGroupID(txns)
                }

                let signedTxns = []

                console.log(txns)
                
                txns.forEach((txn) => {
                let signedTxn = txn.signTxn(houseAccount.sk);
                signedTxns.push(signedTxn)
        
                })
                
                // Submit the transaction
                let { txId } = await client.sendRawTransaction(signedTxns).do()
                // Wait for transaction to be confirmed
                let confirmedTxn = await algosdk.waitForConfirmation(client, txId, 4);

                console.log(confirmedTxn)
                

                
            }

            else {
                battleString = action.attacker.name + " used " + action.move.name + " on " + defenderObject.name + " and missed."
            }

            let messages = [
                    {"role": "system", "content": "The event that happened = " + battleString},
                    {"role": "user", "content": "Retale this event with more depth and add dialogue between the characters. Make it about 3 sentences long."},
                    
                ]
                                
            
                let actionResponse = await openai.chat.completions.create({
                    model: "gpt-3.5-turbo",
                    messages: messages
                    
                })
                                    
                let chat = actionResponse.choices[0].message.content        

                

                embeds.push({
                    "title": battleString,
                    "thumbnail": { "url": attackerURL },
                    "description": chat,
                    "image": { "url": moveUrl }
                  })

                  embeds.push({
                        "thumbnail": { "url": defenderURL },
                        "description": 'HP: ' + String(defenderObject.currentHealth.toFixed(1)) + ' / ' + String(defenderObject.health)
                  })
                      
                

            events.push(battleString)
            count++
        }
        catch (error) {
            count++
            console.log(error)
        }


        }

        console.log(events)
        console.log(embeds)

        async function sleep(msec) {
            return new Promise(resolve => setTimeout(resolve, msec));
        }

        let embedCount = 0

        while (embedCount < embeds.length) {

            

            const response = await fetch("https://discord.com/api/webhooks/1305242237747204106/R2hpw_os4jcSYwQYiWdjUN13tdchDtzMsUMtSTpLAURf-4wgICTUp1JY0DY7q9oFSCgL" , {
                method: "POST",
                body: JSON.stringify({
                    username: "Action",
                    embeds: [embeds[embedCount]]
                }),
                headers: {
                "Content-Type": "application/json",
                },
            })


            embedCount++

            console.log("Waiting for 5 second...");
            await sleep(5000);
            console.log("Waiting done.");


        }
        

        if (dragonDied) {
            console.log(dragonDied, defenderObject.assetId)
            reward(dragonDied, defenderObject.assetId)
        }

    }

    const getActions = async () => {

        const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)

        let params = await client.getTransactionParams().do()

        const status = await client.status().do();
        const currentRound = status['last-round'];

        const boxesResponse = await client.getApplicationBoxes(1870514811).do();

        let actions = []

        let targets = []

        let count = 0

        while (count < boxesResponse.boxes.length) {

            console.log(count)

            let box = boxesResponse.boxes[count]

            if (box.name.length == 14) {

                try {

                let responseMove = await indexerClient.lookupApplicationBoxByIDandName(1870514811, box.name).do();
                
                let attacker = byteArrayToLong(responseMove.name.slice(0,8))

                let defender = JSON.parse(new TextDecoder().decode(responseMove.value)).target

                let move = JSON.parse(new TextDecoder().decode(responseMove.value)).move

                let responseAttacker = await indexerClient.lookupApplicationBoxByIDandName(1870514811, new Uint8Array([...longToByteArray(attacker), ...new Uint8Array(Buffer.from("current"))])).do();
            
                let attackerObject = JSON.parse(new TextDecoder().decode(responseAttacker.value))
                ensureCharacterCritStats(attackerObject)

                try {

                let accountBoxPoints = await client.getApplicationBoxByName(1870514811, new Uint8Array([...longToByteArray(attacker), ...new Uint8Array(Buffer.from("points"))])).do();
                                

                let points = accountBoxPoints.value

                applySkillPointBonuses(attackerObject, points)

                }
                catch {

                }
                

                if (!attackerObject.effects) {
                    attackerObject.effects = {}
                }

                attackerObject.id = attacker

                let speedAdj = 0

                if (attackerObject.effects["burn"]) {
                    speedAdj += attackerObject.effects["burn"] * 0.2
                }
                if (attackerObject.effects["freeze"]) {
                    speedAdj -= attackerObject.effects["freeze"] * 0.2
                }
                if (attackerObject.effects["slow"]) {
                    speedAdj -= attackerObject.effects["slow"] * 0.3
                }
                if (attackerObject.effects["hasten"]) {
                    speedAdj += attackerObject.effects["hasten"] * 0.1
                }

                attackerObject.speed = attackerObject.speed + speedAdj

                let attackerMove

                const docRef = doc(db, "moves", attacker + attackerObject.moves[move]);
                const docSnap = await getDoc(docRef);
            
                if (docSnap.exists()) {
                console.log("Document data:", docSnap.data());
                attackerMove = docSnap.data()
                } else {
                // docSnap.data() will be undefined in this case
                console.log("No such document!");
                }

                

                console.log(attackerObject)
                console.log(attackerMove)

                let defenderBox

                if (defender == "dragon") {
                    defenderBox = new Uint8Array(Buffer.from("dragon"))
                }
                else {
                    defenderBox = new Uint8Array(longToByteArray(defender))
                }

                actions.push({attacker: attackerObject, defender: defenderBox, move: attackerMove})
                

                }
                catch (error) {
                    console.log(error)
                }
            }

            if (box.name.length == 15) {
                targets.push(box.name.slice(0,8))
            }
            count++
        }

        let dragonTarget = targets[Math.floor(Math.random() * targets.length)]
        let dragonMove = Math.floor(Math.random() * 4)

        let responseAttacker = await indexerClient.lookupApplicationBoxByIDandName(1870514811, new Uint8Array(Buffer.from("dragon"))).do();

        let attackerObject = JSON.parse(new TextDecoder().decode(responseAttacker.value))

        attackerObject.type = "dragon"

        let speedAdj = 0

        if (attackerObject.effects["burn"]) {
            speedAdj += attackerObject.effects["burn"] * 0.2
        }
        if (attackerObject.effects["freeze"]) {
            speedAdj -= attackerObject.effects["freeze"] * 0.2
        }
        if (attackerObject.effects["slow"]) {
            speedAdj -= attackerObject.effects["slow"] * 0.3
        }
        if (attackerObject.effects["hasten"]) {
            speedAdj += attackerObject.effects["hasten"] * 0.1
        }
       

        attackerObject.speed = attackerObject.speed + speedAdj
        attackerObject.id = 0

        let attackerMove = attackerObject.moves[dragonMove]

        if (attackerMove.type.substring(attackerMove.type.length - 4) == "buff") {

            actions.push({attacker: attackerObject, defender: new Uint8Array(Buffer.from("dragon")), move: attackerMove})

        }
        else {

            actions.push({attacker: attackerObject, defender: dragonTarget, move: attackerMove})
        
        }


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

        round(sortedActions)

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
    
            let txn = algosdk.makeApplicationNoOpTxn(activeAccount.address, params, 1870514811, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
    
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
            await props.sendDiscordMessage(error, "Brawl Action", activeAccount.address)
           }

      }

      const deleteChars = async () => {

        const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)
        
        const boxesResponse = await client.getApplicationBoxes(1870514811).do();
        
        console.log(boxesResponse.boxes.length)
        
        boxesResponse.boxes.forEach( async (box) => {
        
          console.log(box)
        
          if (box.name.length == 15) {
        
            let responseBox = await client.getApplicationBoxByName(1870514811, box.name).do();
            console.log(responseBox.value.length)
                
            let params = await client.getTransactionParams().do()
        
            let appArgs = []
              
            appArgs.push(
              new Uint8Array(Buffer.from("deleteCurrentCharacter"))
            )
                
            let accounts = []
        
            let foreignAssets = [byteArrayToLong(box.name.slice(0,8))]
        
            let foreignApps = []
        
            let boxes = [{appIndex: 0, name: box.name}, {appIndex: 0, name: box.name}]
        
            let txn = algosdk.makeApplicationNoOpTxn("762FFO2SIDJG2H7SXU5BQLQJ4Q5BQPGKKJGS2LEDQSJ7N5EMB2VVZMSMXM", params, 1870514811, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
        
            let signedTxn = txn.signTxn(creatorSecret);
            
            const { txId } = await client.sendRawTransaction(signedTxn).do()
        
            let confirmedTxn = await algosdk.waitForConfirmation(client, txId, 4);
        
            console.log(confirmedTxn)
        
          
        
        }
          
        })

      }

      const deleteCharMoves = async () => {

        const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)
        
        const boxesResponse = await client.getApplicationBoxes(1870514811).do();
        
        console.log(boxesResponse.boxes.length)
        
        boxesResponse.boxes.forEach( async (box) => {
        
          console.log(box)
        
          if (box.name.length == 14) {
        
            let responseBox = await client.getApplicationBoxByName(1870514811, box.name).do();
            console.log(responseBox.value.length)

            if (responseBox.value.length == 50 || responseBox.value.length == 52) {

                let params = await client.getTransactionParams().do()
        
                let appArgs = []
                
                appArgs.push(
                new Uint8Array(Buffer.from("deleteAttack"))
                )
                    
                let accounts = []
            
                let foreignAssets = [byteArrayToLong(box.name.slice(0,8))]
            
                let foreignApps = []
            
                let boxes = [{appIndex: 0, name: box.name}, {appIndex: 0, name: box.name}, {appIndex: 0, name: box.name}, {appIndex: 0, name: box.name}]
            
                let txn = algosdk.makeApplicationNoOpTxn("762FFO2SIDJG2H7SXU5BQLQJ4Q5BQPGKKJGS2LEDQSJ7N5EMB2VVZMSMXM", params, 1870514811, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
            
                let signedTxn = txn.signTxn(creatorSecret);
                
                const { txId } = await client.sendRawTransaction(signedTxn).do()
            
                let confirmedTxn = await algosdk.waitForConfirmation(client, txId, 4);
            
                console.log(confirmedTxn)
            }
        
            
        
        
        }
          
        })

      }

      //reward(1559095219, 2993025647)
      //deleteChars()
      deleteCharMoves()

     //updateChars()
      //updateDrag()
    //effects();
    //getActions();

