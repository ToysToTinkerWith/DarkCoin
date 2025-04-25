import NextCors from 'nextjs-cors';

import algosdk from "algosdk"

import { initializeApp, getApps } from "firebase/app"
import { getFirestore, doc, getDoc } from "firebase/firestore";


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

const db = getFirestore(firebase_app)

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

  console.log(req.body.nftId)

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

   charObject.moves.forEach(async (move, index) => {

    console.log(move)

    const docRef = doc(db, "moves", req.body.nftId + move);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
    console.log("Document data:", docSnap.data());
    charObject.moves[index] = docSnap.data()
    } else {
    // docSnap.data() will be undefined in this case
    console.log("No such document!");
    }

   })


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