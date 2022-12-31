import NextCors from 'nextjs-cors';

const { Configuration, OpenAIApi } = require("openai");

async function generateImage(req, res) {
   // Run the cors middleware
   // nextjs-cors uses the cors package, so we invite you to check the documentation https://github.com/expressjs/cors

   await NextCors(req, res, {
      // Options
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
      origin: '*',
      optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
   });

   // Rest of the API logic
    const configuration = new Configuration({
        apiKey: process.env.DALLE_KEY,
    });
    const openai = new OpenAIApi(configuration);
    
    const response = await openai.createImage({
        prompt: req.body.race + " " + req.body.clas + ". Zoom out.",
        n: 4,
        size: "1024x1024",
      });

      console.log(response)

      let image_url1 = response.data.data[0].url;
      let image_url2 = response.data.data[1].url;
      let image_url3 = response.data.data[2].url;
      let image_url4 = response.data.data[3].url;

      res.json({ image1: image_url1, image2: image_url2, image3: image_url3, image4: image_url4,});
   
}

export default generateImage