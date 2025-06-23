import NextCors from 'nextjs-cors';

import { initializeApp, getApps } from "firebase/app"
import { getStorage, ref, uploadBytes, uploadBytesResumable, getDownloadURL } from "firebase/storage"
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';


import algosdk from 'algosdk';

import fs from "fs"
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



import OpenAI, { toFile } from "openai";

const openai = new OpenAI({
    apiKey: process.env.DALLE_KEY
});

const Jimp = require('jimp') ;

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

async function generateMove(req, res) {

    // Run the cors middleware
   // nextjs-cors uses the cors package, so we invite you to check the documentation https://github.com/expressjs/cors

   await NextCors(req, res, {
    // Options
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    origin: '*',
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
 });

 async function urlToBlob(imageUrl) {
    const response = await fetch(imageUrl);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return new Blob([arrayBuffer], { type: response.headers.get('content-type') });
}


return new Promise(async (resolve) => {

    try {

    const email    = 'abergquist96@gmail.com';
    const password = process.env.EMAILPASS

    const { user } = await signInWithEmailAndPassword(auth, email, password);
    const idToken  = await user.getIdToken();      // JWT you can send to your API


    let properties

    const docRef = doc(db, "chars", req.body.charId + String("meta"));
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
    properties = docSnap.data().properties
    } else {
    // docSnap.data() will be undefined in this case
    console.log("No such document!");
    }
               
            
    console.log(properties)

    let charObj

    const docRefChar = doc(db, "chars", req.body.charId + String("object"));
    const docSnapChar = await getDoc(docRefChar);

    if (docSnapChar.exists()) {
        charObj = docSnapChar.data().charObj
    } else {
    // docSnap.data() will be undefined in this case
        console.log("No such document!");
    }
               
            
    console.log(charObj)

    let orgImg = new Jimp(500, 500, 0xFFFFFFFF)

    let maskImg = new Jimp(500, 500, 0xFFFFFF00)

    let patch = new Jimp(100, 100, 0xFFFFFF00)

    
    let champ = await Jimp.read(req.body.url)
    champ = champ.resize(100,100)

    orgImg.composite(champ, 200, 250, {
        mode: Jimp.BLEND_SOURCE_OVER,
        opacityDest: 1,
        opacitySource: 1
    })

    maskImg.composite(champ, 200, 250, {
        mode: Jimp.BLEND_SOURCE_OVER,
        opacityDest: 1,
        opacitySource: 1
    })

    maskImg.mask(patch, 200, 250)

    maskImg.getBase64Async(Jimp.MIME_PNG).then(async (maskImage) => {
        orgImg.getBase64Async(Jimp.MIME_PNG).then(async (orgImage) => {
            

            const maskBlob = b64toBlob(maskImage.substring(22));
            const orgBlob = b64toBlob(orgImage.substring(22));

            maskBlob.name = "mask.png"
            maskBlob.lastModified = 20

            orgBlob.name = "org.png"
            orgBlob.lastModified = 20

            console.log(maskBlob)
            console.log(orgBlob)

            await blobToStream(orgBlob).then(async (orgStream) => {
                 await blobToStream(maskBlob).then(async (maskStream) => {
                    console.log(orgStream)
                    const response = await openai.images.edit({
                        model: "gpt-image-1",
                        image: await toFile(orgStream, null, {
                            type: "image/png",
                        }),
                        mask: await toFile(maskStream, null, {
                            type: "image/png",
                        }),
                        prompt: "Have the character performing this move = " + charObj.moves[req.body.charMove].name,
                        quality: "low",
                        size: "1024x1024"
                    });
                        
                    console.log(response.data[0])

                    const finalBlob = b64toBlob(response.data[0].b64_json);

                    const storageRef = ref(storage, 'moves/' + req.body.charId + String(charObj.moves[req.body.charMove].name));

                    // 'file' comes from the Blob or File API
                    uploadBytes(storageRef, finalBlob).then((snapshot) => getDownloadURL(snapshot.ref)).then(async (downloadUrl) => {

                        console.log(downloadUrl)

                        await setDoc(doc(db, "moves",  req.body.charId + String(charObj.moves[req.body.charMove].name)), {
                            type: String(charObj.moves[req.body.charMove].type),
                            effect: String(charObj.moves[req.body.charMove].effect),
                            power: Number(charObj.moves[req.body.charMove].power),
                            accuracy: Number(charObj.moves[req.body.charMove].accuracy),
                            description: String(charObj.moves[req.body.charMove].description),
                            name: String(charObj.moves[req.body.charMove].name),
                            url: downloadUrl
                            });

                            res.json({status: "uploaded"})
                
                        resolve()

                    })

                })

                 
            })

            
            
        })
    })

    // const response = await openai.responses.create({
    // model: "gpt-4.1-mini",
    // input: [{
    //     role: "user",
    //     content: [
    //         { type: "input_text", text: "Generate an image that is the character in the input image performing this move = " + charObj.moves[req.body.charMove].name},
    //         {
    //             type: "input_image",
    //             image_url: req.body.url,
    //         },
    //     ],
    // }],
    // tools: [{type: "image_generation"}],
    // });

    // console.log(response)

    // const responseImage = await openai.images.generate({
    //     model: "dall-e-3",
    //     prompt: "Create an image that resembles this move = " + charObj.moves[req.body.charMove].name + ". The character has weapon = " + properties.Weapon + ", head = " + properties.Head + ", and armour = " + properties.Armour + ". The image should have a " + properties.Background,
    //     size: "1024x1024",
    //     style: "vivid"
    //   });


    // const genUrl = responseImage.data[0].url;

    // console.log(genUrl)

    // urlToBlob(genUrl)
    // .then(async blob => {
       

    //     const storageRef = ref(storage, 'moves/' + req.body.charId + String(charObj.moves[req.body.charMove].name));

    //     // 'file' comes from the Blob or File API
    //     uploadBytes(storageRef, blob).then((snapshot) => getDownloadURL(snapshot.ref)).then(async (downloadUrl) => {

    //         await setDoc(doc(db, "moves",  req.body.charId + String(charObj.moves[req.body.charMove].name)), {
    //             type: String(charObj.moves[req.body.charMove].type),
    //             effect: String(charObj.moves[req.body.charMove].effect),
    //             power: Number(charObj.moves[req.body.charMove].power),
    //             accuracy: Number(charObj.moves[req.body.charMove].accuracy),
    //             description: String(charObj.moves[req.body.charMove].description),
    //             name: String(charObj.moves[req.body.charMove].name),
    //             url: downloadUrl
    //           });

    //           res.json({status: "uploaded"})
    
    //         resolve()

    //     })
            
        

                    
            

    //     })
            
                    
    }
    catch(error){
        console.log(error.message)
    }         
            
            
})
   


    
   
   
}

export default generateMove