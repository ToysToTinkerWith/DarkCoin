import NextCors from 'nextjs-cors';

const pinataSDK = require('@pinata/sdk');

const pinata = new pinataSDK({ pinataApiKey: process.env.PINATA_PUBLIC, pinataSecretApiKey: process.env.PINATA_SECRET });

const { Readable } = require('stream');

const Jimp = require('jimp') ;


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