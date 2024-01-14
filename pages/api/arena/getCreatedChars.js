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

    let ownedAssets = []

    const token = {
        'X-API-Key': process.env.indexerKey
    }
  
    const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)

      let accountAssets = await indexerClient.lookupAccountAssets(req.body.activeAccount).do();

    
        accountAssets.assets.forEach((asset) => {
            if (asset.amount == 1) {
                ownedAssets.push(asset["asset-id"])
            }
        })


        let numAccAssets = accountAssets.assets.length
        let nextAccToken = accountAssets["next-token"]

        while (numAccAssets == 1000) {

            accountAssets = await indexerClient.lookupAccountAssets(req.body.activeAccount).nextToken(nextAccToken).do();

            accountAssets.assets.forEach((asset) => {
              if (asset.amount == 1) {
                ownedAssets.push(asset["asset-id"])
              }
            })

            numAccAssets = accountAssets.assets.length
            nextAccToken = accountAssets["next-token"]

        }

        let contract = []

        let contractAssets = await indexerClient.lookupAccountAssets("YRVK422KP65SU4TBAHY34R7YT3OYFOL4DUSFR4UADQEQHS2HMXKORIC6TE").do();

    
        contractAssets.assets.forEach((asset) => {
            if (asset.amount == 1) {
              contract.push(asset["asset-id"])
            }
        })


        let conAccAssets = accountAssets.assets.length
        let conAccToken = accountAssets["next-token"]

        while (numAccAssets == 1000) {

          contractAssets = await indexerClient.lookupAccountAssets("YRVK422KP65SU4TBAHY34R7YT3OYFOL4DUSFR4UADQEQHS2HMXKORIC6TE").nextToken(nextAccToken).do();

          contractAssets.assets.forEach((asset) => {
              if (asset.amount == 1) {
                contract.push(asset["asset-id"])
              }
            })

            conAccAssets = accountAssets.assets.length
            conAccToken = accountAssets["next-token"]

        }

        let minted = []


      let accountCreatedAssets = await indexerClient.lookupAccountCreatedAssets("YRVK422KP65SU4TBAHY34R7YT3OYFOL4DUSFR4UADQEQHS2HMXKORIC6TE").do();

      accountCreatedAssets.assets.forEach((asset) => {
        if (asset.params.reserve == req.body.activeAccount && !ownedAssets.includes(asset.index) && contract.includes(asset.index)) {
            minted.push(asset.index)
          
        }

      })

      let numAssets = accountCreatedAssets.assets.length
      let nextToken = accountCreatedAssets["next-token"]

        while (numAssets == 1000) {

          accountCreatedAssets = await indexerClient.lookupAccountCreatedAssets("YRVK422KP65SU4TBAHY34R7YT3OYFOL4DUSFR4UADQEQHS2HMXKORIC6TE").do();

          accountCreatedAssets.assets.forEach((asset) => {
            if (asset.params.reserve == req.body.activeAccount && !ownedAssets.includes(asset.index)) {
                minted.push(asset.index)
            }

          })

            numAssets = accountCreatedAssets.assets.length
            nextToken = accountCreatedAssets["next-token"]

        }


  
  res.json(minted);
  

   
}

export default getCreatedChars