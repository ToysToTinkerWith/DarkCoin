import NextCors from 'nextjs-cors';

import OpenAI from "openai";

import algosdk from "algosdk"

const openai = new OpenAI({
    apiKey: process.env.DALLE_KEY
});

async function generateStory(req, res) {

    // Run the cors middleware
   // nextjs-cors uses the cors package, so we invite you to check the documentation https://github.com/expressjs/cors

   await NextCors(req, res, {
    // Options
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    origin: '*',
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    });

    console.log(req.body.txn)

    const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)
    const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)

    let params = await client.getTransactionParams().do()


    const txnInfo = await indexerClient.lookupTransactionByID(req.body.txn).do();

    console.log(txnInfo)

    console.log(txnInfo.transaction["application-transaction"]["foreign-assets"])
    console.log(txnInfo.transaction["application-transaction"].accounts)
    console.log(txnInfo.transaction["inner-txns"][0])
    console.log(txnInfo.transaction.sender)

    let status = await client.status().do();

    console.log(status)

    const lastRound = status['last-round'];

    console.log(lastRound)
    console.log(txnInfo["current-round"])

    let winningAddress
    let losingAddress

    if (txnInfo.transaction["inner-txns"][0]['asset-transfer-transaction'].receiver == txnInfo.transaction.sender) {
        winningAddress = txnInfo.transaction.sender
        losingAddress = txnInfo.transaction["application-transaction"].accounts[0]
    }
    else {
        winningAddress = txnInfo.transaction["application-transaction"].accounts[0]
        losingAddress = txnInfo.transaction.sender
    }

    let charSelWinner
    let charSelLoser

    let responseWinner = await indexerClient.lookupAccountAppLocalStates(winningAddress).do();
    responseWinner["apps-local-states"].forEach((localstate) => {
        if (localstate.id == 1053328572) {
            localstate["key-value"].forEach((kv) => {
                if (atob(kv.key) == "assetId") {
                    charSelWinner = kv.value.uint
                }
            })
        }
    })

    let responseLoser = await indexerClient.lookupAccountAppLocalStates(losingAddress).do();
    responseLoser["apps-local-states"].forEach((localstate) => {
        if (localstate.id == 1053328572) {
            localstate["key-value"].forEach((kv) => {
                if (atob(kv.key) == "assetId") {
                    charSelLoser = kv.value.uint
                }
            })
        }
    })



    let messages = [
    {"role": "system", "content": "You are a battle simulator."},
    {"role": "user", "content": "The first character = " + req.body.charName + " with stats " + req.body.charStats},
    {"role": "user", "content": "The second character = " + req.body.charNameOther + " with stats " + req.body.charStatsOther},
    ]

    if (winningAddress == txnInfo.transaction.sender) {
        messages.push({"role": "user", "content": "Tell me a story of a battle between these two characters in less than 500 characters, in which the first character " + req.body.charName + " wins. Spawn these characters in a random setting. Highlight the differences between the characters in the battle story. Make the fight interesting until the very end. The characters should speak vile words to eachother in the story. The output should be between 450 and 500 characters."})
    }
    else {
        messages.push({"role": "user", "content": "Tell me a story of a battle between these two characters in less than 500 characters, in which the second character " + req.body.charNameOther + " wins. Spawn these characters in a random setting. Highlight the differences between the characters in the battle story. Make the fight interesting until the very end. The characters should speak vile words to eachother in the story. The output should be between 450 and 500 characters."})
    }

    console.log(messages)


    let response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: messages
    })


    let chat = response.choices[0].message.content

    let storyChat

    if (winningAddress == txnInfo.transaction.sender) {
        storyChat = charSelWinner + ">" + req.body.charName + ">" + charSelLoser + ">" + req.body.charNameOther + ">" + req.body.wager + ">" + chat
    }
    else {
        storyChat = charSelWinner + ">" + req.body.charNameOther + ">" + charSelLoser + ">" + req.body.charName + ">" + req.body.wager + ">" + chat
    }

    messages = [
        {"role": "system", "content": chat},
        {"role": "user", "content": "What is the setting of this battle?"}
        ]

    let responseSetting = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: messages
    })

    let setting = responseSetting.choices[0].message.content

    console.log(setting)

    console.log(storyChat)
    let global = await indexerClient.lookupApplications(1053328572).do();

    let globalState = global.application.params["global-state"]

    let battleNum

    globalState.forEach((keyVal) => {
        if (atob(keyVal.key) == "battleNum") {
            battleNum = keyVal.value.uint
        }
    })

    
    const appArgs = []
    appArgs.push(
        new Uint8Array(Buffer.from("writeBattle")),
        new Uint8Array(Buffer.from("Battle" + String(battleNum))),
        new Uint8Array(Buffer.from(storyChat))

        
    )

    const accounts = []
    const foreignApps = []
        
    const foreignAssets = []

    let battleBox = new Uint8Array(Buffer.from("Battle" + String(battleNum)))

    const boxes = [{appIndex: 0, name: battleBox}, {appIndex: 0, name: battleBox}]
    
    let stxn = algosdk.makeApplicationNoOpTxn("762FFO2SIDJG2H7SXU5BQLQJ4Q5BQPGKKJGS2LEDQSJ7N5EMB2VVZMSMXM", params, 1053328572, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);

    let txId = stxn.txID().toString();
    // Sign the transaction

    const houseAccount =  algosdk.mnemonicToSecretKey(process.env.DC_WALLET)

    let signedTxn = stxn.signTxn(houseAccount.sk);
    
    // Submit the transaction
    await client.sendRawTransaction(signedTxn).do()                           
    // Wait for transaction to be confirmed
    let confirmedTxn = await algosdk.waitForConfirmation(client, txId, 4);

    let Battle = await client.getApplicationBoxByName(1053328572, "Battle" + String(battleNum)).do();

    let string = new TextDecoder().decode(Battle.value)

    let array = string.split(">")

    let winner = Number(array[0])
    let loser = Number(array[2])
    let wager = Number(array[4] / 1000000)
    let story = array[5]

    res.json({response: {winner: winner, loser: loser, wager: wager, story: story, setting: setting}});
    
   
   
}

export default generateStory