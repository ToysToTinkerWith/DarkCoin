import NextCors from 'nextjs-cors';

const { Configuration, OpenAIApi } = require("openai");

async function sanitizeAmend(req, res) {
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
    
    const response = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: 
        "This is an amendment submitted to the Dark Coin Council: \"" + req.body.amend +
        "\" Sanitize and clarify the amendment. Make sure the amendment doesn't have any dates in it. Exclude all salutations and complementary closes."
        ,
        n: 1,
        max_tokens: 100,
        temperature: 0,
      });

      res.json(response.data.choices[0]);
   
}

export default sanitizeAmend