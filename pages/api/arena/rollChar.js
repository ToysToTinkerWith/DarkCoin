import NextCors from 'nextjs-cors';

import OpenAI from "openai";

import algosdk from "algosdk"


const openai = new OpenAI({
    apiKey: process.env.DALLE_KEY
});

async function rollChar(req, res) {

    // Run the cors middleware
   // nextjs-cors uses the cors package, so we invite you to check the documentation https://github.com/expressjs/cors

   await NextCors(req, res, {
    // Options
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    origin: '*',
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    });

    const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)
 
    const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)
 
    let nft;
    let charStats
    
    nft = await indexerClient.searchForAssets().index(req.body.nftId).do();
    
    let assetConfig = await indexerClient.lookupAssetTransactions(req.body.nftId)
    .txType("acfg")
    .do();
                
    charStats = atob(assetConfig.transactions[assetConfig.transactions.length - 1].note)

    console.log(charStats)

    let properties = JSON.parse(charStats).properties
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

    charObj["health"] = charObj["health"] + (charObj["strength"] * 2)
    charObj["speed"] = charObj["speed"] + (Math.ceil(charObj["dexterity"] / 2))
    charObj["resist"] = charObj["resist"] + (Math.floor(charObj["intelligence"] / 2))

    charObj["currentHealth"] = charObj["health"]



    charObj["moves"].forEach((move, index) => {
        charObj[move["effect"]] = Math.floor(Math.random() * 5 + 1)
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

    console.log(jsonChar)

    let skillOptions1 = [
        {
            description: "short one sentence description of passive ability that is applied to all damage and curse type attacks",
            apply: "(Pick one: 'poison', 'bleed', 'burn', 'freeze', 'slow', 'paralyze', 'drown', or 'doom')",
            power: "(number between 1 and 4)",
            level: 0
        },
        {
            description: "short one sentence description of passive ability that is buffing self permenantly.",
            buff: "(Pick one: 'strength', 'dexterity', 'intelligence', 'speed', 'slow', 'resist', or 'health')",
            power: "(number between 1 and 6)",
            level: 0
        },
        {
            description: "short one sentence description of passive ability that is applied to all buff type moves",
            apply: "(Pick one: 'shield', 'strengthen', 'empower', 'hasten', 'nurture', 'bless', 'focus', or 'cleanse')",
            power: "(number between 1 and 4)",
            level: 0
        },
    ]

    let skillOptions2 = [
        {
            description: "short one sentence description of passive ability that is buffing self permenantly.",
            buff: "(Pick one: 'poison', 'bleed', 'burn', 'freeze', 'slow', 'paralyze', 'drown', or 'doom')",
            power: "(number between 1 and 4)",
            level: 0
        },
        {
            description: "short one sentence description of passive ability that is buffing self permenantly.",
            buff: "(Pick one: 'strength', 'dexterity', 'intelligence', 'speed', 'slow', 'resist', or 'health')",
            power: "(number between 3 and 8)",
            level: 0
        },
        {
            description: "short one sentence description of passive ability that is buffing self permenantly.",
            buff: "(Pick one: 'shield', 'strengthen', 'empower', 'hasten', 'nurture', 'bless', 'focus', or 'cleanse')",
            power: "(number between 1 and 4)",
            level: 0
        },
    ]

    let skillExample = JSON.stringify({
                    
        type: "(melee damage, ranged damage, magic damage, melee curse, ranged curse, magic curse, melee buff, ranged buff, magic buff)",
        effect: "('poison', 'bleed', 'burn', 'freeze', 'slow', 'paralyze', 'drown', or 'doom' if type of move is a curse or damage. 'shield', 'strengthen', 'empower', 'hasten', 'nurture', 'bless', 'focus', or 'cleanse' if type of move is buff)",
        power: "(number between 10 and 40)",
        accuracy: "(number between 25 and 100)",
        description: "(description of move based on type and effect and the characters properties. move should target a single character. description should describe move to be able to target anyone. dont mention turns in the description.)",
        name: "(string based on move description)"
    })

    let pathsExample = JSON.stringify({
        path1: {
            description: "Path description describing what kinds of skills are in this tree.",
            skill1: skillOptions1[Math.floor(Math.random() * skillOptions1.length)],
            skill2: skillOptions2[Math.floor(Math.random() * skillOptions2.length)],
            skill3: skillOptions2[Math.floor(Math.random() * skillOptions2.length)]
        },
        path2: {
            description: "Path description describing what kinds of skills are in this tree.",
            skill1: skillOptions1[Math.floor(Math.random() * skillOptions1.length)],
            skill2: skillOptions2[Math.floor(Math.random() * skillOptions2.length)],
            skill3: skillOptions2[Math.floor(Math.random() * skillOptions2.length)]
        },
        path3: {
            description: "Path description describing what kinds of skills are in this tree.",
            skill1: skillOptions1[Math.floor(Math.random() * skillOptions1.length)],
            skill2: skillOptions2[Math.floor(Math.random() * skillOptions2.length)],
            skill3: skillOptions2[Math.floor(Math.random() * skillOptions2.length)]
        },
    })

    console.log(pathsExample)



    let messagesClass = [
    {"role": "user", "content":  "Given the character represented in this object: " + jsonChar + ". Generate a skill tree in json format based on this example: " + pathsExample},
    ]

    let responseClass = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: messagesClass,
        response_format: { "type": "json_object" }
    })

    console.log(responseClass.choices[0].message.content)




    res.json(charStats);
    
   
   
}

export default rollChar