import NextCors from 'nextjs-cors';

import algosdk from "algosdk"


async function getAddrAssets(req, res) {
   // Run the cors middleware
   // nextjs-cors uses the cors package, so we invite you to check the documentation https://github.com/expressjs/cors

   await NextCors(req, res, {
    // Options
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    origin: '*',
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
 });

 // Rest of the API logic
 const token = {
      'X-API-Key': process.env.indexerKey
  }

  const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)

  let addrAssets = []

  let responseAddr
  let nextTokenAddr

  responseAddr = await indexerClient.lookupAccountAssets(req.body.activeAccount).do();
  nextTokenAddr = responseAddr["next-token"]
  
  responseAddr.assets.forEach((asset) => {
    if (asset.amount > 0) {
        addrAssets.push(asset)
    }
  })


  while (responseAddr.assets.length == 1000) {
    responseAddr = await indexerClient.lookupAccountAssets(req.body.activeAccount).nextToken(nextTokenAddr).limit(1000).do();
    nextTokenAddr = responseAddr["next-token"]
    responseAddr.assets.forEach((asset) => {
        if (asset.amount > 0) {
            addrAssets.push(asset)
        }
      })  
    }
  
  res.json(addrAssets);
  

   
}

export default getAddrAssets