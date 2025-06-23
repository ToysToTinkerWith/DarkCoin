import NextCors from 'nextjs-cors';

const Jimp = require('jimp') ;

import OpenAI, { toFile } from "openai";

import {Blob} from 'node:buffer';



const openai = new OpenAI({
    apiKey: process.env.DALLE_KEY
});

import { initializeApp, getApps } from "firebase/app"
import { getStorage, ref, uploadBytes, uploadBytesResumable, getDownloadURL } from "firebase/storage"
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

import { Readable } from 'stream';



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

const storage = getStorage(firebase_app)
const db = getFirestore(firebase_app)
const auth = getAuth(firebase_app);

const b64toBlob = (b64Data, contentType='image/png', sliceSize=512) => {
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

const blobToStream = async (blob) => {
  const arrayBuffer = await blob.arrayBuffer();
  return Readable.from(Buffer.from(arrayBuffer));
};

async function imageComb(req, res) {
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

            const email    = 'abergquist96@gmail.com';
            const password = process.env.EMAILPASS
        
            const { user } = await signInWithEmailAndPassword(auth, email, password);
            const idToken  = await user.getIdToken();      // JWT you can send to your API

            let orgImg = new Jimp(1024, 1024, 0xFFFFFFFF)

            let maskImg = new Jimp(1024, 1024, 0xFFFFFF00)

            let patch = new Jimp(256, 256, 0xFFFFFF00)

          
            let champ1 = await Jimp.read(req.body.champ1)
            champ1 = champ1.resize(256,256)

            let champ2 = await Jimp.read(req.body.champ2)
            champ2 = champ2.resize(256,256)
            champ2 = champ2.mirror(true,false)

            orgImg.composite(champ1, 128, 512, {
                mode: Jimp.BLEND_SOURCE_OVER,
                opacityDest: 1,
                opacitySource: 1
             })

            orgImg.composite(champ2, 640, 512, {
                mode: Jimp.BLEND_SOURCE_OVER,
                opacityDest: 1,
                opacitySource: 1
             })

            maskImg.composite(champ1, 128, 512, {
                mode: Jimp.BLEND_SOURCE_OVER,
                opacityDest: 1,
                opacitySource: 1
             })

             maskImg.composite(champ2, 640, 512, {
                mode: Jimp.BLEND_SOURCE_OVER,
                opacityDest: 1,
                opacitySource: 1
             })

             maskImg.mask(patch, 128, 512)
             maskImg.mask(patch, 640, 512)


             maskImg.getBase64Async(Jimp.MIME_PNG).then((maskImage) => {
                orgImg.getBase64Async(Jimp.MIME_PNG).then(async (orgImage) => {

                    const maskBlob = b64toBlob(maskImage.substring(22));
                    const orgBlob = b64toBlob(orgImage.substring(22));

                    maskBlob.name = "mask.png"
                    maskBlob.lastModified = 20

                    orgBlob.name = "org.png"
                    orgBlob.lastModified = 20

                    await blobToStream(orgBlob).then(async (orgStream) => {
                        await blobToStream(maskBlob).then(async (maskStream) => {

                        const response = await openai.images.edit({
                            model: "gpt-image-1",
                            image: await toFile(orgStream, null, {
                                type: "image/png",
                            }),
                            mask: await toFile(maskStream, null, {
                                type: "image/png",
                            }),
                            prompt: "Create a battle scene out of story: "  + req.body.story + ". Don't include any text in the image.",
                            quality: "medium",
                            size: "1024x1024"
                        });
                            
                        console.log(response.data[0])
                        
                        const finalBlob = b64toBlob(response.data[0].b64_json);
    
                        const storageRef = ref(storage, 'fights/' + req.body.txId);

                        const metadata = {
                            contentType: 'image/png',
                        };
    
                        // 'file' comes from the Blob or File API
                        uploadBytes(storageRef, finalBlob, metadata).then((snapshot) => getDownloadURL(snapshot.ref)).then(async (downloadUrl) => {
    
                            console.log(downloadUrl)
    
                            await setDoc(doc(db, "fights",  req.body.txId), {
                                winner: req.body.winner,
                                loser: req.body.loser,
                                wager: req.body.wager,
                                url: downloadUrl
                                });
                                            
                                res.json({ image: downloadUrl});
                                resolve()
    
                        })
                        

                        })
                    })
                    
                })
            })

                
        }
        catch(err) {
            console.log(err)
            res.json({ result: err });
            resolve()
        }
    })
    

      
   
}

export default imageComb