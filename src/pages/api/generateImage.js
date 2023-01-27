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
        prompt: req.body.description + " Zoom out.",
        n: 1,
        size: "1024x1024",
      });

      console.log(response)

      let image_url = response.data.data[0].url;

      res.json({ image: image_url });
   
}

export default generateImage