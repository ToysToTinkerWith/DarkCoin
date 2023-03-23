import NextCors from 'nextjs-cors';

const { Configuration, OpenAIApi } = require("openai");

async function generateChar(req, res) {
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
        req.body.descript + ". This character will have the name " + req.body.name +
        ". Generate 2 damaging moves that this character might have in an rpg game."
        ,
        n: 1,
        max_tokens: 100,
        temperature: 0.8,
      });

      res.json({response: response.data.choices[0]});
   
}

export default generateChar