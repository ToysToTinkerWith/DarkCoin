import NextCors from 'nextjs-cors';

const { Configuration, OpenAIApi } = require("openai");

async function getSlogan(req, res) {
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
        "The Dark Coin DAO is called the Council. Dark Coin is a community that uses the Algorand Blockchain for data storage and finance. This is a proposal submitted to the Council: \"" + req.body.proposal +
        "\"  What is a good title for this proposal in 5 words or less."
        ,
        n: 1,
        max_tokens: 50,
        temperature: 0,
      });

      res.json(response.data.choices[0]);
   
}

export default getSlogan