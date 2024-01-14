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
    {"role": "user", "content": "There are two characters, the first one is: Name: " + req.body.charName + ". Description: " + req.body.charStats},
    {"role": "user", "content": ". The second character is: Name: " + req.body.charNameOther + ". Description: " + req.body.charStatsOther},
    {"role": "user", "content": " Spawn these characters in a random setting. Tell me a story of a battle between these two characters in less than 500 characters, in which the first character " + req.body.charName + " wins."},       
    {"role": "user", "content": " Make the fight interesting until the very end. The characters should speak vile words to eachother in the story. The output should be between 450 and 500 characters."},       
    {"role": "user", "content": " The first character " + req.body.charName + " wins and emerges victorious. Make sure the output is less than 500 characters."},       
    ]


    let response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: messages
    })

    console.log(response.choices[0].message.content)

    let chat = response.choices[0].message.content



    res.json({response: chat});
    
   
   
}

export default generateStory