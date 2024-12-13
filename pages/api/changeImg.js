import NextCors from 'nextjs-cors';

const Jimp = require('jimp') ;

import { initializeApp, getApps } from "firebase/app";

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


import { getDownloadURL, getStorage, ref } from "firebase/storage";


async function changeImg(req, res) {
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

            let extra
            let armour
            let magic
            let weapon

            if (req.body.Extra != "None") {
                extra = await Jimp.read(req.body.Extra)
                extra = extra.resize(1080,1080)
            }
            if (req.body.Armour != "None") {
                armour = await Jimp.read(req.body.Armour)
                armour = armour.resize(1080,1080)
            }
            if (req.body.Magic != "None") {
                magic = await Jimp.read(req.body.Magic)
                magic = magic.resize(1080,1080)
            }
            if (req.body.Weapon != "None") {
                weapon = await Jimp.read(req.body.Weapon)
                weapon = weapon.resize(1080,1080)
            }
            let head = await Jimp.read(req.body.Head)
            head = head.resize(1080,1080)
            let skin = await Jimp.read(req.body.Skin)
            skin = skin.resize(1080,1080)
            let background = await Jimp.read(req.body.Background)
            background = background.resize(1080,1080)
            
            background.composite(skin, 0, 0, {
                mode: Jimp.BLEND_SOURCE_OVER,
                opacityDest: 1,
                opacitySource: 1
             })

             if (req.body.Weapon != "None") {
                background.composite(weapon, 0, 0, {
                    mode: Jimp.BLEND_SOURCE_OVER,
                    opacityDest: 1,
                    opacitySource: 1
                })
            }
            if (req.body.Magic != "None") {
                background.composite(magic, 0, 0, {
                    mode: Jimp.BLEND_SOURCE_OVER,
                    opacityDest: 1,
                    opacitySource: 1
                })
            }
            
            background.composite(head, 0, 0, {
                mode: Jimp.BLEND_SOURCE_OVER,
                opacityDest: 1,
                opacitySource: 1
            })

            if (req.body.Armour != "None") {
                background.composite(armour, 0, 0, {
                    mode: Jimp.BLEND_SOURCE_OVER,
                    opacityDest: 1,
                    opacitySource: 1
                })
            }
            if (req.body.Extra != "None") {
                background.composite(extra, 0, 0, {
                    mode: Jimp.BLEND_SOURCE_OVER,
                    opacityDest: 1,
                    opacitySource: 1
                })
            }
             
             
             background.getBase64Async(Jimp.MIME_JPEG).then(newImage => {
                res.json({ image: newImage});
                resolve()
                })

                
        }
        catch(err) {
            //handle error here
            console.log(err)
            res.json({ result: err });
            resolve()
        }
    })
    

      
   
}

export default changeImg