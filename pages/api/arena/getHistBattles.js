import NextCors from 'nextjs-cors';

import algosdk from "algosdk"


async function getHistBattles(req, res) {
   // Run the cors middleware
   // nextjs-cors uses the cors package, so we invite you to check the documentation https://github.com/expressjs/cors

   await NextCors(req, res, {
    // Options
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    origin: '*',
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    });

    const token = {
        'X-API-Key': process.env.indexerKey
    }
  
    const indexerClient = new algosdk.Indexer(token, 'https://mainnet-algorand.api.purestake.io/idx2', '');

    let global = await indexerClient.lookupApplications(req.body.contract).do();

    let globalState = global.application.params["global-state"]

    let battleNum

    globalState.forEach((keyVal) => {
        if (atob(keyVal.key) == "battleNum") {
            battleNum = keyVal.value.uint
        }
    })


    const client = new algosdk.Algodv2(token, 'https://mainnet-algorand.api.purestake.io/ps2', '')
    
      
    let responseProposal = await client.getApplicationBoxByName(req.body.contract, "Battle" + String(battleNum - req.body.i - 1)).do();

    let string = new TextDecoder().decode(responseProposal.value)

    let array = string.split(">")

    let randomNum = Math.floor(Math.random() * 11)


    let winner = Number(array[0])
    let winnerName = array[1]
    let loser = Number(array[2])
    let loserName = array[3]
    let story = array[5]
    let battleNumber = battleNum - req.body.i
    let wager 
    if (battleNumber > 62) {
        wager = Number(array[4]) / 1000000
    }
    else {
        wager = Number(array[4])
    }

    res.json({battleNum: battleNumber, winner: winner, winnerName: winnerName, loser: loser, loserName: loserName, wager: wager, story: story, randomNum: randomNum});

   
}

export default getHistBattles