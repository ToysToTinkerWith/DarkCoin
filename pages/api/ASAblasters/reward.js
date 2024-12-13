
import algosdk from "algosdk"

import { initializeApp, getApps } from "firebase/app"
import { getFirestore } from "firebase/firestore"
import { doc, setDoc, getDoc } from "firebase/firestore"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
}

let firebase_app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getFirestore(firebase_app)


async function reward(req, res) {
   // Run the cors middleware
   // nextjs-cors uses the cors package, so we invite you to check the documentation https://github.com/expressjs/cors


 try{

  return new Promise(async (resolve) => {

    let txns = []
     
    const houseAccount = algosdk.mnemonicToSecretKey(process.env.DC_WALLET)
   
    const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)

    let params = await client.getTransactionParams().do();

    let accepted = [409604194, 388592191, 1088771340, 1241944285, 1241945177, 712012773, 753890862, 329110405, 1119722936, 1000870705, 452399768, 544217506]
    let acceptedUnitName = ["AO", "chip", "DARKCOIN", "Gold", "GoldDAO", "META", "PRSMS", "Tacos", "THC", 'TRTS', "Vote", "YARN"]

    const docRef = doc(db, "ASAblasters", req.body.address);
    const docSnap = await getDoc(docRef);

    let rewards = docSnap.data()

    let stxn

    let appArgs = []
    let accounts = []
    let foreignApps = []
  
    let foreignAssets = []

    let boxes = []
   
    Object.keys(rewards).forEach((asset) => {
      
      if(rewards[asset] > 0 && asset != "totalScore") {

        let indexOf = acceptedUnitName.indexOf(asset)
        let assetId = accepted[indexOf]

        console.log(assetId)

        appArgs = []
        appArgs = [
          new Uint8Array(Buffer.from("reward")),
          algosdk.encodeUint64(Number(rewards[asset]))
        ]

        accounts = [req.body.address]
        foreignApps = []
      
        foreignAssets = [Number(assetId)]

        boxes = []
       
        stxn = algosdk.makeApplicationNoOpTxn("762FFO2SIDJG2H7SXU5BQLQJ4Q5BQPGKKJGS2LEDQSJ7N5EMB2VVZMSMXM", params, req.body.contract, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
        txns.push(stxn)
   
      }
    })

    
     
    appArgs = []
    appArgs.push(
      new Uint8Array(Buffer.from("score")),
      algosdk.encodeUint64(Number(rewards.totalScore))
   
    )
   
    accounts = [req.body.address]
    foreignApps = []
      
    foreignAssets = []
   
    let scoreBox = algosdk.decodeAddress(req.body.address)
   
    boxes = [{appIndex: 0, name: scoreBox.publicKey}]
   
    stxn = algosdk.makeApplicationNoOpTxn("762FFO2SIDJG2H7SXU5BQLQJ4Q5BQPGKKJGS2LEDQSJ7N5EMB2VVZMSMXM", params, req.body.contract, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
   
    txns.push(stxn)

    await setDoc(docRef, {totalScore: 0})
   
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
   
    res.json({res: txId})
    resolve()
  
   
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