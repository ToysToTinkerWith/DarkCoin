import NextCors from 'nextjs-cors';

import algosdk from "algosdk"


async function getNft(req, res) {
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

   const indexerClient = new algosdk.Indexer(token, 'https://mainnet-algorand.api.purestake.io/idx2', '')


  let nft;
  let charStats

  nft = await indexerClient.searchForAssets().index(req.body.nftId).do();

  let assetConfig = await indexerClient.lookupAssetTransactions(req.body.nftId)
  .txType("acfg")
  .do();

            

  charStats = atob(assetConfig.transactions[0].note)

  
  
  res.json({nft: nft, charStats: charStats});
  

   
}

export default getNft