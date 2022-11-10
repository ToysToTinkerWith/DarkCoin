import NextCors from 'nextjs-cors';

import algosdk from "algosdk"

import { PeraWalletConnect } from "@perawallet/connect";

const peraWallet = new PeraWalletConnect();

peraWallet.reconnectSession()
.catch((error) => {
  // You MUST handle the reject because once the user closes the modal, peraWallet.connect() promise will be rejected.
  // For the async/await syntax you MUST use try/catch
  if (error?.data?.type !== "CONNECT_MODAL_CLOSED") {
      // log the necessary errors
      console.log(error)
  }
  });

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
   let client = new algosdk.Algodv2("", "https://node.algoexplorerapi.io/", "")
        
          let params = await client.getTransactionParams().do()
          params.fee = 1000;
          params.flatFee = true;  
          
          const appArgs = []
            appArgs.push(
                new Uint8Array(Buffer.from("vote")),
                new Uint8Array(Buffer.from(String(req.body.proposal1) + "," + String(req.body.proposal2) + "," + String(req.body.proposal3))),
            )

          const accounts = [req.body.activeAddress]
          const foreignApps = undefined
            
          const foreignAssets = [req.body.activeNft]
          
          let txn = algosdk.makeApplicationNoOpTxn(req.body.activeAddress, params, 826032354, appArgs, accounts, foreignApps, foreignAssets);
          const singleTxnGroups = [{txn: txn, signers: [req.body.activeAddress]}]

          if (req.body.wallet == "pera") {

           

            const signedTxn = await peraWallet.signTransaction([singleTxnGroups])

            let txId = await client.sendRawTransaction(signedTxn).do();

            res.json({ txnId: txId });
          }
          else if (req.body.wallet == "myalgo") {
            const myAlgoWallet = new MyAlgo()

            const signedTxn = await myAlgoWallet.signTransaction(txn.toByte());

            let txId = await client.sendRawTransaction(signedTxn.blob).do();

            res.json({ txnId: txId });
          }
         
  
   
}

export default govVote