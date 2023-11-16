import NextCors from 'nextjs-cors';

import algosdk from "algosdk"


async function getWarrior1(req, res) {
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
    
    let assets = await indexerClient.lookupAccountAssets("A563R3UMXKXK5C6CSBM5OA4NQRKMQJACAG75TPX3RDVWGBCKJNHLXHECSU").do();

    let warriors = []
    let numWar = 0

    let numAssets
    let nextToken

    
    assets.assets.forEach(async (asset) => {
    if(asset.amount == 1) {
    if (asset["asset-id"] >= 818167963 && asset["asset-id"] <= 818219236) {
        if (numWar < 12) {
            warriors.push({id: asset["asset-id"]})
            numWar += 1
        }
        
    }   
    }
    
    })

    numAssets = assets.assets.length
    nextToken = assets["next-token"]

    while (numAssets == 1000) {

    assets = await indexerClient.lookupAccountAssets("A563R3UMXKXK5C6CSBM5OA4NQRKMQJACAG75TPX3RDVWGBCKJNHLXHECSU").nextToken(nextToken).do();

    assets.assets.forEach(async (asset) => {
        if(asset.amount == 1) {
        if (asset["asset-id"] >= 818167963 && asset["asset-id"] <= 818219236) {
        if (numWar < 12) {
            warriors.push({id: asset["asset-id"]})
            numWar += 1
        }
            
        }
        
             
        }
        
    })

    numAssets = assets.assets.length
    nextToken = assets["next-token"]




    }

    
    res.json(warriors);
    

   
}

export default getWarrior1