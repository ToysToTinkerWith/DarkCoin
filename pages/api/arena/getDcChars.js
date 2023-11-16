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
    let charsDC = []

    const token = {
        'X-API-Key': process.env.indexerKey
    }
  
    const indexerClient = new algosdk.Indexer(token, 'https://mainnet-algorand.api.purestake.io/idx2', '');

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

    let dcChars = await indexerClient.searchForAssets().unit("DCCHAR").limit(1000).do();

    dcChars.assets.forEach((asset) => {
        charsDC.push(asset.index)
        
    })

    numAssets = accountAssets.assets.length
    nextToken = accountAssets["next-token"]

    while (numAssets == 1000) {

        let dcChars = await indexerClient.searchForAssets().unit("DCCHAR").nextToken(nextToken).limit(1000).do();

        dcChars.assets.forEach((asset) => {
            charsDC.push(asset.index)
            
        })

        numAssets = accountAssets.assets.length
        nextToken = accountAssets["next-token"]

    }

    let ownedNfts = []

        for (var i = 0; i < account.length; i++) {
            if (charsDC.includes(account[i])) {
                ownedNfts.push(account[i])
            }
        }


  
  res.json(ownedNfts);
  

   
}

export default getCreatedChars