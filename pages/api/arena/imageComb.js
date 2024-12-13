import NextCors from 'nextjs-cors';

const Jimp = require('jimp') ;

import OpenAI from "openai";

import {Blob} from 'node:buffer';



const openai = new OpenAI({
    apiKey: process.env.DALLE_KEY
});

const b64toBlob = (b64Data, contentType='', sliceSize=512) => {
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

            let orgImg = new Jimp(500, 500, 0xFFFFFFFF)

            let maskImg = new Jimp(500, 500, 0xFFFFFF00)

            let patch = new Jimp(100, 100, 0xFFFFFF00)

          
            let champ1 = await Jimp.read(req.body.champ1)
            champ1 = champ1.resize(100,100)

            let champ2 = await Jimp.read(req.body.champ2)
            champ2 = champ2.resize(100,100)
            champ2 = champ2.mirror(true,false)

            orgImg.composite(champ1, 100, 250, {
                mode: Jimp.BLEND_SOURCE_OVER,
                opacityDest: 1,
                opacitySource: 1
             })

            orgImg.composite(champ2, 300, 250, {
                mode: Jimp.BLEND_SOURCE_OVER,
                opacityDest: 1,
                opacitySource: 1
             })

            maskImg.composite(champ1, 100, 250, {
                mode: Jimp.BLEND_SOURCE_OVER,
                opacityDest: 1,
                opacitySource: 1
             })

             maskImg.composite(champ2, 300, 250, {
                mode: Jimp.BLEND_SOURCE_OVER,
                opacityDest: 1,
                opacitySource: 1
             })

             maskImg.mask(patch, 100, 250)
             maskImg.mask(patch, 300, 250)


             maskImg.getBase64Async(Jimp.MIME_PNG).then((maskImage) => {
                orgImg.getBase64Async(Jimp.MIME_PNG).then(async (orgImage) => {

                    const maskBlob = b64toBlob(maskImage.substring(22));
                    const orgBlob = b64toBlob(orgImage.substring(22));

                    maskBlob.name = "mask.png"
                    maskBlob.lastModified = 20

                    orgBlob.name = "org.png"
                    orgBlob.lastModified = 20

                    const response = await openai.images.edit({
                        image: orgBlob,
                        mask: maskBlob,
                        prompt: "A battle. " + req.body.setting,
                        n: 1,
                        size: "1024x1024"
                    });
                        
                    console.log(response)

                    res.json({ image: response.data[0].url});
                    resolve()
                    
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