import NextCors from 'nextjs-cors';

const { Configuration, OpenAIApi } = require("openai");

async function getDraft(req, res) {
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

    let prompt = "The Dark Coin DAO is called the Council. Dark Coin is a community that uses the Algorand Blockchain for data storage and finance. This is a proposal submitted to the Council: \"" + req.body.proposal 
    
    req.body.amendments.forEach((amendment) => {
        prompt += "This is an amendment to that proposal: " + amendment
    })

    prompt += "Craft a final draft of the proposal applying all the amendments to it."

    console.log(prompt.length)
    
    const response = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: prompt,
        n: 1,
        max_tokens: Math.ceil(prompt.length / 4),
        temperature: 0,
      });

      res.json(response.data.choices[0]);
   
}

export default getDraft