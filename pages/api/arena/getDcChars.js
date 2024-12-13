import NextCors from 'nextjs-cors';

import algosdk from "algosdk"


async function getCreatedChars(req, res) {
   // Run the cors middleware
   // nextjs-cors uses the cors package, so we invite you to check the documentation https://github.com/expressjs/cors

   await NextCors(req, res, {
    // Options
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    origin: '*',
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    });

    let account = []
    let warriors = []

    const token = {
        'X-API-Key': process.env.indexerKey
    }
  
    const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)

    let accountAssets = await indexerClient.lookupAccountAssets(req.body.address).limit(1000).do();
    
            
    accountAssets.assets.forEach((asset) => {
        if (asset.amount == 1) {
            account.push(asset["asset-id"])
        }
    })


    let numAssets = accountAssets.assets.length
    let nextToken = accountAssets["next-token"]

    while (numAssets == 1000) {

        accountAssets = await indexerClient.lookupAccountAssets(req.body.address).limit(1000).nextToken(nextToken).do();

        accountAssets.assets.forEach((asset) => {
            if (asset.amount == 1) {
                account.push(asset["asset-id"])
            }
        })

        numAssets = accountAssets.assets.length
        nextToken = accountAssets["next-token"]

    }

    

    let assets = await indexerClient.lookupAccountAssets("L6VIKAHGH4D7XNH3CYCWKWWOHYPS3WYQM6HMIPNBVSYZWPNQ6OTS5VERQY").do();

    
    assets.assets.forEach(async (asset) => {
        if (account.includes(asset["asset-id"])) {
            warriors.push(asset["asset-id"])
        }
    })

    numAssets = assets.assets.length
    nextToken = assets["next-token"]

    while (numAssets == 1000) {

        assets = await indexerClient.lookupAccountAssets("L6VIKAHGH4D7XNH3CYCWKWWOHYPS3WYQM6HMIPNBVSYZWPNQ6OTS5VERQY").nextToken(nextToken).do();

        assets.assets.forEach(async (asset) => {
            if (account.includes(asset["asset-id"])) {
                warriors.push(asset["asset-id"])
            }
        })

        numAssets = assets.assets.length
        nextToken = assets["next-token"]

    }

    let ownedNfts = []

        for (var i = 0; i < account.length; i++) {
            if (warriors.includes(account[i])) {
                ownedNfts.push(account[i])
            }
        }


  
  res.json(ownedNfts);
  

   
}

export default getCreatedChars