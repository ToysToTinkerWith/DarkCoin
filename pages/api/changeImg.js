import NextCors from 'nextjs-cors';

const Jimp = require('jimp') ;

function isFarmersHead(headUrl) {
    return /(?:^|[\/%5c%2f_\-\s])farmer(?:$|[._\-\s%?&#/])/i.test(String(headUrl || ""))
}

function compositeLayer(base, layer) {
    base.composite(layer, 0, 0, {
        mode: Jimp.BLEND_SOURCE_OVER,
        opacityDest: 1,
        opacitySource: 1
    })
}



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
            const farmersHeadOnTop = isFarmersHead(req.body.Head)
            let skin = await Jimp.read(req.body.Skin)
            skin = skin.resize(1080,1080)
            let background = await Jimp.read(req.body.Background)
            background = background.resize(1080,1080)
            
            compositeLayer(background, skin)

             if (req.body.Weapon != "None") {
                compositeLayer(background, weapon)
            }
            if (req.body.Magic != "None") {
                compositeLayer(background, magic)
            }
            
            if (!farmersHeadOnTop) {
                compositeLayer(background, head)
            }

            if (req.body.Armour != "None") {
                compositeLayer(background, armour)
            }
            if (req.body.Extra != "None") {
                compositeLayer(background, extra)
            }
            if (farmersHeadOnTop) {
                compositeLayer(background, head)
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
