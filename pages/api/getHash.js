import NextCors from 'nextjs-cors';

const pinataSDK = require('@pinata/sdk');

const pinata = new pinataSDK({ pinataApiKey: process.env.PINATA_PUBLIC, pinataSecretApiKey: process.env.PINATA_SECRET });

const { Readable } = require('stream');

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

async function getHash(req, res) {
   // Run the cors middleware
   // nextjs-cors uses the cors package, so we invite you to check the documentation https://github.com/expressjs/cors

   await NextCors(req, res, {
      // Options
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
      origin: '*',
      optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
   });

    return new Promise(async (resolve) => {
            
              pinata.testAuthentication().then(async () => {

                const storage = getStorage();
                let extraRef
                let armourRef
                let magicRef
                let weaponRef
                let headRef
                let skinRef
                let backgroundRef
                if (req.body.Extra != "None") {
                    extraRef = ref(storage, "warriors/Extra/" + req.body.Extra + ".png");
                }
                if (req.body.Armour != "None") {
                    armourRef = ref(storage, "warriors/Armour/" + req.body.Armour + ".png");
                }
                if (req.body.Magic != "None") {
                    magicRef = ref(storage, "warriors/Magic/" + req.body.Magic + ".png");
                }
                if (req.body.Weapon != "None") {
                    weaponRef = ref(storage, "warriors/Weapon/" + req.body.Weapon + ".png");
                }
                headRef = ref(storage, "warriors/Head/" + req.body.Head + ".png");
                skinRef = ref(storage, "warriors/Skin/" + req.body.Skin + ".png");
                backgroundRef = ref(storage, "warriors/Background/" + req.body.Background + ".png");

                let extraUrl
                let armourUrl
                let magicUrl
                let weaponUrl
                let headUrl
                let skinUrl
                let backgroundUrl
                
                if (req.body.Extra != "None") {
                    await getDownloadURL(extraRef)
                    .then((url) => {
                        extraUrl = url
                    })
                }
                if (req.body.Armour != "None") {
                    await getDownloadURL(armourRef)
                    .then((url) => {
                        armourUrl = url
                    })
                }
                if (req.body.Magic != "None") {
                    await getDownloadURL(magicRef)
                    .then((url) => {
                        magicUrl = url
                    })
                }
                if (req.body.Weapon != "None") {
                    await getDownloadURL(weaponRef)
                    .then((url) => {
                        weaponUrl = url
                    })
                }
                await getDownloadURL(headRef)
                .then((url) => {
                    headUrl = url
                })
                await getDownloadURL(skinRef)
                .then((url) => {
                    skinUrl = url
                })
                await getDownloadURL(backgroundRef)
                .then((url) => {
                    backgroundUrl = url
                })

                let extra
                let armour
                let magic
                let weapon
                if (req.body.Extra != "None") {
                    extra = await Jimp.read(extraUrl)
                    extra = extra.resize(1080,1080)
                }
                if (req.body.Armour != "None") {
                    armour = await Jimp.read(armourUrl)
                    armour = armour.resize(1080,1080)
                }
                if (req.body.Magic != "None") {
                    magic = await Jimp.read(magicUrl)
                    magic = magic.resize(1080,1080)
                }
                if (req.body.Weapon != "None") {
                    weapon = await Jimp.read(weaponUrl)
                    weapon = weapon.resize(1080,1080)
                }
                let head = await Jimp.read(headUrl)
                head = head.resize(1080,1080)
                let skin = await Jimp.read(skinUrl)
                skin = skin.resize(1080,1080)
                let background = await Jimp.read(backgroundUrl)
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

                background.getBuffer(Jimp.MIME_PNG, (err, buffer) => {


                    const reader = Readable.from(buffer);

                    const options = {
                        pinataMetadata: {
                            name: req.body.name,
                        },
                        pinataOptions: {
                            cidVersion: 0
                        }
                    };


                        pinata.pinFileToIPFS(reader, options).then((result) => {
                            //handle results here
                            let ipfs = result.IpfsHash
                                
                            res.json({ hash: ipfs })
                            resolve()

                        })

                    })

                });

        
    })
    

      
   
}

export default getHash