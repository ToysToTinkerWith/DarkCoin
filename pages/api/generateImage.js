import NextCors from 'nextjs-cors';

const { Configuration, OpenAIApi } = require("openai");

const fs = require('fs');


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

   // Rest of the API logic
    const configuration = new Configuration({
        apiKey: process.env.DALLE_KEY,
    });
    const openai = new OpenAIApi(configuration);    

      const response = await openai.createImageEdit(
        fs.createReadStream("./characters/Background.png"),
        fs.createReadStream("./characters/Mask.png"),
        req.body.description + ". Make the image colorful.",
        1,
        "1024x1024"
      );

      console.log(response)

      let image_url = response.data.data[0].url;

      console.log(image_url)

      res.json({ image: image_url });

   }

   catch (error) {
    res.json({ result: error });
  }
   
}

export default generateImage