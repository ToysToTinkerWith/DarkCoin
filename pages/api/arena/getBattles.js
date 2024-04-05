import NextCors from 'nextjs-cors';

import algosdk from "algosdk"


async function getBattles(req, res) {
   // Run the cors middleware
   // nextjs-cors uses the cors package, so we invite you to check the documentation https://github.com/expressjs/cors

   await NextCors(req, res, {
    // Options
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    origin: '*',
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    });

    
    const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)

    let global = await indexerClient.lookupApplications(req.body.contract).do();

    let globalState = global.application.params["global-state"]

    let battles = []

    globalState.forEach(async (keyVal) => {
        if (atob(keyVal.key).length == 58) {
            let addr = atob(keyVal.key)
            let wager = keyVal.value.uint
            console.log(addr)
            battles.push({addr: addr, wager: wager})
            
        }
    })

    

    let charSel

    let response = await indexerClient.lookupAccountAppLocalStates(req.body.activeAccount).do();
    response["apps-local-states"].forEach((localstate) => {
        if (localstate.id == req.body.contract) {
            localstate["key-value"].forEach((kv) => {
                if (atob(kv.key) == "assetId") {
                    charSel = kv.value.uint
                }
            })
        }
    })
    
    res.json({battles: battles, charSel: charSel});
    

        


  
  
  

   
}

export default getBattles