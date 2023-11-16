import NextCors from 'nextjs-cors';

import algosdk from "algosdk"


async function getDCAssets(req, res) {
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

  const indexerClient = new algosdk.Indexer(token, 'https://mainnet-algorand.api.purestake.io/idx2', '');

  let DCAssets = []

  let response
  let nextToken

  response = await indexerClient.lookupAccountCreatedAssets("AL6F3TFPSZPF3BSVUFDNOLMEKUCJJAA7GZ5GF3DN3Q4IVJVNUFK76PQFNE").limit(1000).do();
  nextToken = response["next-token"]
  response.assets.forEach((asset) => {
    DCAssets.push(asset)
  })

  while (response.assets.length == 1000) {
    response = await indexerClient.lookupAccountCreatedAssets("AL6F3TFPSZPF3BSVUFDNOLMEKUCJJAA7GZ5GF3DN3Q4IVJVNUFK76PQFNE").nextToken(nextToken).limit(1000).do();
    nextToken = response["next-token"]
    response.assets.forEach((asset) => {
        DCAssets.push(asset)
    })
  }


  res.json(DCAssets);
  

   
}

export default getDCAssets