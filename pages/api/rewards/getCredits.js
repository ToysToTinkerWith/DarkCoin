import NextCors from 'nextjs-cors';

import algosdk from "algosdk"


async function getCredits(req, res) {
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

    

      const accountAppLocalStates = await indexerClient.lookupAccountAppLocalStates(req.body.activeAddress).do();

      let credits = []
      let numCredits = 0

      await accountAppLocalStates["apps-local-states"].forEach(async (app) => {
        if (app.id == req.body.contract) {
          if (app["key-value"]) {
            app["key-value"].forEach(async (keyval) => {
              numCredits++
            })
          }
        }
      })

      console.log(numCredits)


    await accountAppLocalStates["apps-local-states"].forEach(async (app) => {
      if (app.id == req.body.contract) {
        if (app["key-value"]) {
          app["key-value"].forEach(async (keyval) => {
            let key = algosdk.decodeUint64(Buffer.from(keyval.key, 'base64')) 
            
            const assetInfo = await indexerClient.lookupAssetByID(key).do();

  

            let decimals = assetInfo.asset.params.decimals
            let div = 10**decimals

            console.log({assetId: key, assetAmountAtomic: keyval.value.uint, assetAmount: Math.floor(keyval.value.uint / div), unit: assetInfo.asset.params["unit-name"]})

            credits.push({assetId: key, assetAmountAtomic: keyval.value.uint, assetAmount: Math.floor(keyval.value.uint / div), unit: assetInfo.asset.params["unit-name"]})

            if (credits.length == numCredits) {
              res.json(credits);
            }


            
            
          })
        }
        
      }
    })



    
    
    

   
}

export default getCredits