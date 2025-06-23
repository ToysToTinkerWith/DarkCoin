import NextCors from 'nextjs-cors';

import OpenAI from "openai";

import algosdk from "algosdk"

const openai = new OpenAI({
    apiKey: process.env.DALLE_KEY
});

import { initializeApp, getApps } from "firebase/app"
import { getFirestore, doc, getDoc } from "firebase/firestore";


const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
}

let firebase_app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

const db = getFirestore(firebase_app)

const longToByteArray = (long) => {
      // we want to represent the input as a 8-bytes array
      var byteArray = [0, 0, 0, 0, 0, 0, 0, 0];
  
      for ( var index = byteArray.length - 1; index > 0; index -- ) {
          var byte = long & 0xff;
          byteArray [ index ] = byte;
          long = (long - byte) / 256 ;
      }
  
      return byteArray;
  };

async function generateStory(req, res) {

    // Run the cors middleware
   // nextjs-cors uses the cors package, so we invite you to check the documentation https://github.com/expressjs/cors

   await NextCors(req, res, {
    // Options
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    origin: '*',
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    });


    const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)
    const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)

    let params = await client.getTransactionParams().do()

    console.log(req.body.champ1)
    console.log(req.body.champ1)



    let responseChar1 = await client.getApplicationBoxByName(1870514811, longToByteArray(req.body.champ1)).do();
    
    let stringChar1 = new TextDecoder().decode(responseChar1.value)

    let charObject1 = JSON.parse(stringChar1)


    let responseChar2 = await client.getApplicationBoxByName(1870514811, longToByteArray(req.body.champ2)).do();
    
    let stringChar2 = new TextDecoder().decode(responseChar2.value)

    let charObject2 = JSON.parse(stringChar2)


    console.log(charObject1)
    console.log(charObject2)
   


    let messages = [
    {"role": "system", "content": "You are a battle simulator."},
    {"role": "user", "content": "The first character = " + charObject1.name + ", " + charObject1.description + " with moves = " + charObject1.moves[0] + charObject1.moves[1] + charObject1.moves[2] + charObject1.moves[3]},
    {"role": "user", "content": "The second character = " + charObject2.name + ", " + charObject2.description + " with moves = " + charObject2.moves[0] + charObject2.moves[1] + charObject2.moves[2] + charObject2.moves[3]},
    {"role": "user", "content": "Tell me a short story of a battle between these two characters in less than 300 characters, in which the first character " + charObject1.name + " wins. Spawn these characters in a random setting. Highlight the differences between the characters in the battle story. Make the fight interesting until the very end. The characters should speak vile words to eachother in the story. The output should be between 450 and 500 characters."}
    ]


    console.log(messages)


    let response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: messages
    })


    let chat = response.choices[0].message.content

    let storyChat

    storyChat = req.body.champ1 + ">" + req.body.champ2 + ">" + req.body.wager + ">" + chat
  

    messages = [
        {"role": "system", "content": chat},
        {"role": "user", "content": "What is the setting of this battle?"}
        ]

    let responseSetting = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: messages
    })

    let setting = responseSetting.choices[0].message.content

    console.log(setting)

    console.log(storyChat)
    

    res.json({story: storyChat, setting: setting});
    
   
   
}

export default generateStory