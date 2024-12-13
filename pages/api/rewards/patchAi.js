import NextCors from 'nextjs-cors';

import algosdk from "algosdk"

const Jimp = require('jimp') ;

import OpenAI from "openai";

import {Blob} from 'node:buffer';

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


const openai = new OpenAI({
    apiKey: process.env.DALLE_KEY
});

const b64toBlob = (b64Data, contentType='', sliceSize=256) => {
    const byteCharacters = atob(b64Data);
    const byteArrays = [];
  
    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      const slice = byteCharacters.slice(offset, offset + sliceSize);
  
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
  
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
      
    const blob = new Blob(byteArrays, {type: contentType});
    return blob;
  }



async function patchAi(req, res) {
   // Run the cors middleware
   // nextjs-cors uses the cors package, so we invite you to check the documentation https://github.com/expressjs/cors

   await NextCors(req, res, {
      // Options
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
      origin: '*',
      optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
   });

    return new Promise(async (resolve) => {
        try {

            const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)
            const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)

            const txnInfo = await indexerClient.lookupTransactionByID(req.body.txn).do();

            let status = await client.status().do();

            const lastRound = status['last-round'];

            if((txnInfo["current-round"] == lastRound) && 
            (txnInfo.transaction["asset-transfer-transaction"].amount == 500000000) &&
            (txnInfo.transaction["asset-transfer-transaction"]["asset-id"] == 1088771340) &&
            (txnInfo.transaction["asset-transfer-transaction"].receiver == 'VWYCYQ3H3PPNIGON4H363DIH7BP33TTZWUUUNMTDXCIHRCDPFOMU7VJ5HM')) {

                const docRefOrg = doc(db, "Imager", txnInfo.transaction.sender + "Org");
                const docSnapOrg = await getDoc(docRefOrg);

                let imgOrg = docSnapOrg.data()

                const docRefMask = doc(db, "Imager", txnInfo.transaction.sender + "Mask");
                const docSnapMask = await getDoc(docRefMask);

                let imgMask = docSnapMask.data()

                const orgBlob = b64toBlob(imgOrg.image.substring(22));
                const maskBlob = b64toBlob(imgMask.image.substring(22));

                maskBlob.name = "mask.png"
                maskBlob.lastModified = 20

                orgBlob.name = "org.png"
                orgBlob.lastModified = 20

                const response = await openai.images.edit({
                    image: orgBlob,
                    mask: maskBlob,
                    prompt: req.body.prompt,
                    n: 1,
                    size: "512x512"
                });
                    
                Jimp.read(response.data[0].url)
                .then((image) => {
                    return image.getBase64Async(Jimp.MIME_PNG).then(newImage => {
                        res.json({ image: newImage});
                        resolve()
                    })
                })
            }


            


                     
                
        }
        catch(err) {
            console.log(err)
            res.json({ result: err });
            resolve()
        }
    })
    

      
   
}

export default patchAi