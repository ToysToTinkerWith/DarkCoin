
import algosdk from "algosdk"

import admin from "../../../Firebase/FirebaseAdmin.js"


async function reward(req, res) {
   // Run the cors middleware
   // nextjs-cors uses the cors package, so we invite you to check the documentation https://github.com/expressjs/cors


 try{

  // idToken comes from the client app

  const bearerToken = req.headers["authorization"]
  const token = bearerToken.split(" ")[1];

  return new Promise(async (resolve) => {
    admin.auth()
    .verifyIdToken(token)
    .then(async (decodedToken) => {
      const uid = decodedToken.uid;
      console.log(uid)

    let txns = []
     
    const houseAccount = algosdk.mnemonicToSecretKey(process.env.DC_WALLET)
   
   const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)
   
    let params = await client.getTransactionParams().do();
     
    let appArgs = []
    appArgs.push(
      new Uint8Array(Buffer.from("score")),
      algosdk.encodeUint64(Number(req.body.totalScore))
   
    )
   
    let accounts = [req.body.address]
    let foreignApps = []
      
    let foreignAssets = []
   
    let scoreBox = algosdk.decodeAddress(req.body.address)
   
    let boxes = [{appIndex: 0, name: scoreBox.publicKey}]
   
    let stxn = algosdk.makeApplicationNoOpTxn("762FFO2SIDJG2H7SXU5BQLQJ4Q5BQPGKKJGS2LEDQSJ7N5EMB2VVZMSMXM", params, req.body.contract, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
   
    txns.push(stxn)
   
   
    Object.keys(req.body.assetValues).forEach((asset) => {
      
      if(req.body.assetValues[asset] > 0) {
       console.log(req.body.assetDec[asset])
       console.log(Math.floor(Number((req.body.assetValues[asset] * req.body.assetScores[asset]).toFixed(req.body.assetDec[asset])) * Number(10**req.body.assetDec[asset])))
        appArgs = [
          new Uint8Array(Buffer.from("reward")),
          algosdk.encodeUint64(Math.floor(Number((req.body.assetValues[asset] * req.body.assetScores[asset]).toFixed(req.body.assetDec[asset])) * Number(10**req.body.assetDec[asset])))
        ]
        foreignAssets = [req.body.assetIds[asset]]
        stxn = algosdk.makeApplicationNoOpTxn("762FFO2SIDJG2H7SXU5BQLQJ4Q5BQPGKKJGS2LEDQSJ7N5EMB2VVZMSMXM", params, req.body.contract, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
        txns.push(stxn)
   
      }
    })
   
   
    if (txns.length > 1) {
      let txgroup = algosdk.assignGroupID(txns)
    }
   
    let signed = []
   
    txns.forEach((txn) => {
      let signedTxn = txn.signTxn(houseAccount.sk);
      signed.push(signedTxn)
    })
   
    
    const { txId } = await client.sendRawTransaction(signed).do()
   
    let confirmedTxn = await algosdk.waitForConfirmation(client, txId, 4);
   
    res.json({res: confirmedTxn})
    resolve()
  })
  .catch((error) => {
    console.log(error)
    res.json({res: error})
    resolve()
  });
   
   })
  // ...

 }
 catch(err) {
  console.log(err)
  res.json({res: err})
  resolve()
 }
 
  

   
}

export default reward