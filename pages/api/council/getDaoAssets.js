import NextCors from 'nextjs-cors';

import algosdk from "algosdk"


async function getDaoAssets(req, res) {
   // Run the cors middleware
   // nextjs-cors uses the cors package, so we invite you to check the documentation https://github.com/expressjs/cors

   await NextCors(req, res, {
    // Options
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    origin: '*',
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    });

    let allDaoNfts = []
    let heldDao = []

    const token = {
        'X-API-Key': process.env.indexerKey
    }

    const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)


    let assetsDC = await indexerClient.lookupAccountCreatedAssets("AL6F3TFPSZPF3BSVUFDNOLMEKUCJJAA7GZ5GF3DN3Q4IVJVNUFK76PQFNE")
    .limit(1000).do();

    assetsDC.assets.forEach(async (asset) => {
      if(asset.params["unit-name"].substring(0, 4) == "DCGV") {
        allDaoNfts.push(asset.index)
      }
      
    })

    let assetsLen = assetsDC.assets.length
    let assetsNext = assetsDC["next-token"]

    while (assetsLen == 1000) {

        assetsDC = await indexerClient.lookupAccountCreatedAssets("AL6F3TFPSZPF3BSVUFDNOLMEKUCJJAA7GZ5GF3DN3Q4IVJVNUFK76PQFNE").nextToken(assetsNext)
        .limit(1000).do();

      assetsDC.assets.forEach(async (asset) => {
        if(asset.params["unit-name"].substring(0, 4) == "DCGV") {
            allDaoNfts.push(asset.index)
          }
        
      })

      assetsLen = assetsDC.assets.length
      assetsNext = assetsDC["next-token"]

    }

      let assetsWallet = await indexerClient.lookupAccountAssets(req.body.activeAccount)
      .limit(1000).do();


      assetsWallet.assets.forEach(async (asset) => {
        if(allDaoNfts.includes(asset["asset-id"]) && asset.amount == 1) {
            heldDao.push(asset["asset-id"])
        }
        
      })

      assetsLen = assetsWallet.assets.length
      assetsNext = assetsWallet["next-token"]

      while (assetsLen == 1000) {

        assetsWallet = await indexerClient.lookupAccountAssets(req.body.activeAccount).nextToken(assetsNext)
          .limit(1000).do();

          assetsWallet.assets.forEach(async (asset) => {
          if(allDaoNfts.includes(asset["asset-id"])) {
            heldDao.push(asset["asset-id"])
            }
          
        })

        assetsLen = assetsWallet.assets.length
        assetsNext = assetsWallet["next-token"]


      }


  
  res.json(heldDao);
  

   
}

export default getDaoAssets