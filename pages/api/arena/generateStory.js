import NextCors from 'nextjs-cors';

const { Configuration, OpenAIApi } = require("openai");

async function generateStory(req, res) {
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
        "There are two characters, the first one is: Name: " + req.body.charName + " " + req.body.charStats +
        ". The second character is: Name: " + req.body.charNameOther + " " + req.body.charStatsOther +
        " Spawn these characters in a random setting. Tell me a story of a battle between these two characters in less than 500 characters, in which the first character " + req.body.charName + " wins." +
        " Make the fight interesting until the very end. The characters should speak vile words to eachother in the story. The output should be between 450 and 500 characters." +
        " The first character " + req.body.charName + " wins and emerges victorious. Make sure the output is less than 500 characters."
        ,
        n: 1,
        max_tokens: 250,
        temperature: 0,
      });

      res.json({response: response.data.choices[0]});
   
}

export default generateStory