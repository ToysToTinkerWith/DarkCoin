import NextCors from 'nextjs-cors';

import algosdk from "algosdk"


async function getChars(req, res) {
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

    const client = new algosdk.Algodv2(token, 'https://mainnet-algorand.api.purestake.io/ps2', '')

    let charsBox = []

    const boxes = await client
    .getApplicationBoxes(1035432580)
    .do();

    boxes.boxes.forEach((box) => {
        let boxName = new TextDecoder().decode(box.name);

        let array = boxName.split(">")

        let assetId = array[0]
        let assetPrice = array[1]

        charsBox.push({assetId: assetId, assetPrice: assetPrice})

    })

//     const indexerClient = new algosdk.Indexer(token, 'https://mainnet-algorand.api.purestake.io/idx2', '');


//    let assetsAccount = []

//    let accountAssets = await indexerClient.lookupAccountAssets("VI66S7AN2G4HKUD7DXJUSVEP54MDJ42NGDOUUD3LQJSCU7WT5UU2KAIHAU").limit(1000).do();
        
                
//     accountAssets.assets.forEach((asset) => {
//         if (asset.amount == 1) {
//             assetsAccount.push(asset["asset-id"])
//         }
//     })


//     let numAssets = accountAssets.assets.length
//     let nextToken = accountAssets["next-token"]

//     while (numAssets == 1000) {

//         accountAssets = await indexerClient.lookupAccountAssets("VI66S7AN2G4HKUD7DXJUSVEP54MDJ42NGDOUUD3LQJSCU7WT5UU2KAIHAU").limit(1000).nextToken(nextToken).do();

//         accountAssets.assets.forEach((asset) => {
//             if (asset.amount == 1) {
//                 assetsAccount.push(asset["asset-id"])
//             }
//         })

//         numAssets = accountAssets.assets.length
//         nextToken = accountAssets["next-token"]

//     }

//     let charsDc = []

//     let dcChars = await indexerClient.searchForAssets().unit("DCCHAR").limit(1000).do();

//     dcChars.assets.forEach((asset) => {
//         if (assetsAccount.includes(asset.index)) {
//             charsDc.push(asset.index)
//         }
        
        
//     })

//     numAssets = accountAssets.assets.length
//     nextToken = accountAssets["next-token"]

//     while (numAssets == 1000) {

//         let dcChars = await indexerClient.searchForAssets().unit("DCCHAR").nextToken(nextToken).limit(1000).do();

//         dcChars.assets.forEach((asset) => {
//             if (assetsAccount.includes(asset.index)) {
//                 charsDc.push(asset.index)
//             }
            
//         })

//         numAssets = accountAssets.assets.length
//         nextToken = accountAssets["next-token"]

//     }



      res.json(charsBox);
   
}

export default getChars