import NextCors from 'nextjs-cors';

import algosdk from "algosdk"


async function govVote(req, res) {
   // Run the cors middleware
   // nextjs-cors uses the cors package, so we invite you to check the documentation https://github.com/expressjs/cors

   await NextCors(req, res, {
      // Options
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
      origin: '*',
      optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
   });

   // Rest of the API logic
   const algod = new algosdk.Algodv2("", "https://node.algoexplorerapi.io/", "");
   // Setting up Transactions
   const suggestedParams = await algod.getTransactionParams().do();
   const optInTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
     from: req.body.activeAddress,
     to: "AL6F3TFPSZPF3BSVUFDNOLMEKUCJJAA7GZ5GF3DN3Q4IVJVNUFK76PQFNE",
     assetIndex: 601894079,
     amount: req.body.amount,
     suggestedParams
   });

   const singleTxnGroups = [{txn: optInTxn, signers: [req.body.activeAddress]}];
   res.json({ txn: singleTxnGroups });
  


   
   
      



   
  
          
        
  

   
}

export default govVote