import NextCors from 'nextjs-cors';

import algosdk from "algosdk"


async function getLeaderboard(req, res) {
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
     
    const indexerClient = new algosdk.Indexer(token, 'https://mainnet-algorand.api.purestake.io/idx2', '')

    
    let global = await indexerClient.lookupApplications(req.body.contract).do();

    let globalState = global.application.params["global-state"]

    let battleNum
    let rewardBattle
    let updateBattle

    let battles = []
    let currBattle = 0
    

    globalState.forEach((keyVal) => {
        if (atob(keyVal.key) == "battleNum") {
            battleNum = keyVal.value.uint
        }
        if (atob(keyVal.key) == "rewardBattle") {
            rewardBattle = keyVal.value.uint
        }
        if (atob(keyVal.key) == "updateBattle") {
        updateBattle = keyVal.value.uint
    }
    })

    console.log(battleNum)

    let lastBox = rewardBattle - 100

    currBattle = rewardBattle - 100
    


  
    const client = new algosdk.Algodv2(token, 'https://mainnet-algorand.api.purestake.io/ps2', '')

    for (let i = lastBox; i < battleNum; i++) {
        if (i > 0) {
            let responseProposal = await client.getApplicationBoxByName(req.body.contract, "Battle" + String(i)).do();

            let string = new TextDecoder().decode(responseProposal.value)

            let array = string.split(">")

            let winner = Number(array[0])
            let winnerName = array[1]
            let loser = Number(array[2])
            let loserName = array[3]
            let wager = Number(array[4])
            let story = array[5]
            let battleNumber = i


            if (battleNumber > 62) {
            wager = wager / 1000000
            }

            battles.push({battleNum: battleNumber, winner: winner, winnerName: winnerName, loser: loser, loserName: loserName, wager: wager, story: story})
            currBattle += 1
       
        }
    }

    res.json(battles);

   
}

export default getLeaderboard