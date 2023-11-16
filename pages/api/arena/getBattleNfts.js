import NextCors from 'nextjs-cors';

import algosdk from "algosdk"


async function getBattleNfts(req, res) {
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

    let nftId
    
    let response = await indexerClient.lookupAccountAppLocalStates(req.body.addr).do();
    response["apps-local-states"].forEach((localstate) => {
        if (localstate.id == req.body.contract) {
            localstate["key-value"].forEach((kv) => {
                if (atob(kv.key) == "assetId") {
                    nftId = kv.value.uint
                    res.json({addr: req.body.addr, wager: req.body.wager, nftId: nftId});
                }
            })
        }
    })

   
}

export default getBattleNfts