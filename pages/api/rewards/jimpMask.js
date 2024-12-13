import NextCors from 'nextjs-cors';

const Jimp = require('jimp') ;



async function jimpMask(req, res) {
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

            Jimp.read(Buffer.from(req.body.img.substring(22), 'base64')).then(async (img) => {

                let patchBack = new Jimp(512, 512, 0xFFFFFFFF)

                let patchWhite = new Jimp(req.body.value + 50, req.body.value + 50, 0xFFFFFFFF)

                let patch = new Jimp(req.body.value, req.body.value, 0x000000FF)

                patchWhite.composite(patch, 25, 25).rotate(-req.body.rotation, false)

                patchBack.composite(patchWhite, (req.body.x * 512 - (req.body.value / 2)) - 25, (req.body.y * 512  - (req.body.value / 2)) - 25)
                 
                let masked = img.mask(patchBack, 0, 0)

                masked.resize(512,512)
    
                return masked.getBase64Async(Jimp.MIME_PNG).then(newImage => {
                    res.json({ image: newImage});
                    resolve()
                })
                
            })

           

            

                
        }
        catch(err) {
            //handle error here
            res.json({ result: err });
            resolve()
        }
    })
    

      
   
}

export default jimpMask