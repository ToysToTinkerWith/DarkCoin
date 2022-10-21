import NextCors from 'nextjs-cors';

import algosdk from "algosdk"


async function getDCprices(req, res) {
   // Run the cors middleware
   // nextjs-cors uses the cors package, so we invite you to check the documentation https://github.com/expressjs/cors

   await NextCors(req, res, {
      // Options
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
      origin: '*',
      optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
   });

   // Rest of the API logic
   const indexerClient = new algosdk.Indexer('', 'https://algoindexer.algoexplorerapi.io', '');
    let usdc = "FPOU46NBKTWUZCNMNQNXRWNW3SMPOOK4ZJIN5WSILCWP662ANJLTXVRUKA";
    let usdcInfo = await indexerClient.lookupAccountByID(usdc).do();

    let DC = "GII6U3WIVUD5FTCGP3DG7IFTETBG5IPNFOFICKOYSYM42PYA5VN6N46E3Q";
    let DCInfo = await indexerClient.lookupAccountByID(DC).do();
    res.json({ usdcInfo: usdcInfo, DCInfo: DCInfo });
   
}

export default getDCprices