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
        "Give me a name of a character with a race of " + req.body.race + " and a class of " + req.body.clas + ". Make sure there is a comma after the characters name. Then give me a description of that character." +
        "The description should spend about 100 characters talking about the characters upbringing, include things like gender, personality, and characteristics." + 
        "Then spend about 100 characters talking about the strengths they have based on that upbringing. What kinds of weapons they are familiar with and the kind of magic powers they have." +
        ""
        ,
        n: 1,
        max_tokens: 500,
        temperature: 0.8,
      });

      console.log(response.data)

      res.json({response: response.data});
   
}

export default generateChar