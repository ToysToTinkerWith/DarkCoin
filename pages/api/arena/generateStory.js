import NextCors from 'nextjs-cors';

import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.DALLE_KEY
});

async function generateStory(req, res) {

    // Run the cors middleware
   // nextjs-cors uses the cors package, so we invite you to check the documentation https://github.com/expressjs/cors

   await NextCors(req, res, {
    // Options
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    origin: '*',
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    });


    let messages = [
    {"role": "system", "content": "You are a battle simulator."},
    {"role": "user", "content": "The first character = " + req.body.charName + " with stats " + req.body.charStats},
    {"role": "user", "content": "The second character = " + req.body.charNameOther + " with stats " + req.body.charStatsOther},
    {"role": "user", "content": "Tell me a story of a battle between these two characters in less than 500 characters, in which the first character " + req.body.charName + " wins. Spawn these characters in a random setting. Highlight the differences between the characters in the battle story. Make the fight interesting until the very end. The characters should speak vile words to eachother in the story. The output should be between 450 and 500 characters."},       
    ]

    console.log(messages)


    let response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: messages
    })


    let chat = response.choices[0].message.content



    res.json({response: chat});
    
   
   
}

export default generateStory