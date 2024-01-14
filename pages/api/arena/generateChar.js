import NextCors from 'nextjs-cors';

import OpenAI from "openai";


const openai = new OpenAI({
    apiKey: process.env.DALLE_KEY
});

async function generateChar(req, res) {

    // Run the cors middleware
   // nextjs-cors uses the cors package, so we invite you to check the documentation https://github.com/expressjs/cors

   await NextCors(req, res, {
    // Options
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    origin: '*',
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
 });

    let messages = [
    {"role": "user", "content":  req.body.descript + ". This character will have the name " + req.body.name},
    {"role": "user", "content": ". Generate 2 damaging moves that this character might have in an rpg game."},       
    ]

    let response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: messages
    })

    console.log(response.choices[0].message.content)

    let chat = response.choices[0].message.content



    res.json(chat);
    
   
   
}

export default generateChar