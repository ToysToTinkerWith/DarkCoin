import NextCors from 'nextjs-cors';

import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.DALLE_KEY
});

async function getDraft(req, res) {

      // Run the cors middleware
   // nextjs-cors uses the cors package, so we invite you to check the documentation https://github.com/expressjs/cors

   await NextCors(req, res, {
    // Options
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    origin: '*',
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    });

    let messages = [
    {"role": "user", "content": "The Dark Coin DAO is called the Council. Dark Coin is a community that uses the Algorand Blockchain for data storage and finance. This is a proposal submitted to the Council: \"" + req.body.proposal }    
    ]

    req.body.amendments.forEach((amendment) => {
        messages.push({"role": "user", "content": "This is an amendment to that proposal: " + amendment})
    })

    messages.push({"role": "user", "content": "Craft a final draft of the proposal including all the amendments. Make sure the draft doesn't have any dates in it. Exclude all salutations and complementary closes. Don't include the word <Draft> in the response. Only mention the essence of the draft."})

    let response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: messages
    })

    console.log(response.choices[0].message.content)

    let chat = response.choices[0].message.content


    res.json(chat);

   
   
}

export default getDraft