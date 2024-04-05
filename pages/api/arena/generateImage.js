import NextCors from 'nextjs-cors';

import fs from "fs";
import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.DALLE_KEY
});



async function generateImage(req, res) {
   // Run the cors middleware
   // nextjs-cors uses the cors package, so we invite you to check the documentation https://github.com/expressjs/cors

   await NextCors(req, res, {
      // Options
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
      origin: '*',
      optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
   });

   try {


      const response = await openai.images.edit({
        image: fs.createReadStream("./characters/Background.png"),
        mask: fs.createReadStream("./characters/Mask.png"),
        prompt: req.body.description + ". Make the image colorful.",
        n: 1,
        size: "1024x1024"
        });

      

      res.json({ image: response.data[0].url });

   }

   catch (error) {
    res.json({ result: String(error) });
  }
   
}

export default generateImage