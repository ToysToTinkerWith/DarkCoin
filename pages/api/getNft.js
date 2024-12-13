import NextCors from 'nextjs-cors';

import algosdk from "algosdk"


async function getNft(req, res) {
   // Run the cors middleware
   // nextjs-cors uses the cors package, so we invite you to check the documentation https://github.com/expressjs/cors

   const longToByteArray = (long) => {
      // we want to represent the input as a 8-bytes array
      var byteArray = [0, 0, 0, 0, 0, 0, 0, 0];
  
      for ( var index = byteArray.length - 1; index > 0; index -- ) {
          var byte = long & 0xff;
          byteArray [ index ] = byte;
          long = (long - byte) / 256 ;
      }
  
      return byteArray;
  };

   await NextCors(req, res, {
    // Options
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    origin: '*',
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
 });

 return new Promise(async (resolve) => {



 const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)

 const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)

  let nft;
  let charStats

  nft = await indexerClient.searchForAssets().index(req.body.nftId).do();

  let assetConfig = await indexerClient.lookupAssetTransactions(req.body.nftId)
  .txType("acfg")
  .do();
            

  charStats = atob(assetConfig.transactions[assetConfig.transactions.length - 1].note)

  let charObject = "none"

  try {
   let response = await client.getApplicationBoxByName(1870514811, longToByteArray(req.body.nftId)).do();

   let string = new TextDecoder().decode(response.value)

   charObject = JSON.parse(string)


  }
  catch(error) {
    
  }

  let action = null

  try {
    let response = await client.getApplicationBoxByName(1870514811, [...longToByteArray(req.body.nftId), ...new Uint8Array(Buffer.from("action"))]).do();
 
    let string = new TextDecoder().decode(response.value)
 
    let actionObj = JSON.parse(string)

    if (actionObj.target == "dragon") {
        action = {
            target: "dragon",
            move: charObject.moves[actionObj.move]
        }

        res.json({nft: nft, charStats: charStats, charObject: charObject, action: action});
        resolve()
    }
    else {
        let responseTarget = await client.getApplicationBoxByName(1870514811, longToByteArray(actionObj.target)).do();
        let stringTarget = new TextDecoder().decode(responseTarget.value)

        let targetObj = JSON.parse(stringTarget)

        action = {
            target: targetObj.name,
            move: charObject.moves[actionObj.move]
        }

        res.json({nft: nft, charStats: charStats, charObject: charObject, action: action});
        resolve()
    }
 
 
   }
   catch(error) {
    res.json({nft: nft, charStats: charStats, charObject: charObject, action: null});
    resolve()
   }
  
  
  
  
 })
   
}

export default getNft