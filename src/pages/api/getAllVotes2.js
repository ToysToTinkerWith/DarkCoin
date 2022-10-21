import NextCors from 'nextjs-cors';

import algosdk from "algosdk"


async function getAllVotes2(req, res) {
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

    let applicationId = 896464969;

    let response;

    if (req.body.nextToken) {
        response = await indexerClient.searchForTransactions().applicationID(applicationId).nextToken(nextToken).limit(1000).do()
    }
    else {
        response = await indexerClient.searchForTransactions().applicationID(applicationId).limit(1000).do()
    }
    
    res.json(response);
  

   
}

export default getAllVotes2