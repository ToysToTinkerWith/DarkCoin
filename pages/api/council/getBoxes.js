import NextCors from 'nextjs-cors';

import algosdk from "algosdk"


async function getBoxes(req, res) {
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
  
  


  const boxesResponse = await client.getApplicationBoxes(req.body.contract).do();

  
  res.json(boxesResponse);
  

   
}

export default getBoxes