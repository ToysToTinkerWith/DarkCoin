import NextCors from 'nextjs-cors';

import { initializeApp, getApps } from "firebase/app"
import { getStorage, ref, uploadBytes, uploadBytesResumable, getDownloadURL } from "firebase/storage"
import { getFirestore, doc, setDoc } from "firebase/firestore";

import algosdk from 'algosdk';


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

const storage = getStorage(firebase_app)
const db = getFirestore(firebase_app)


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

 async function urlToBlob(imageUrl) {
    const response = await fetch(imageUrl);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return new Blob([arrayBuffer], { type: response.headers.get('content-type') });
}


return new Promise(async (resolve) => {


   const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)
               
    let params = await client.getTransactionParams().do()
            
    let properties = req.body.properties

    console.log(properties)

    let propertyOptions = []

    for (let key in properties) {

        if (properties[key] != 'None') {
            propertyOptions.push(String(key) + " " + properties[key])
        }
      }

    let moveTrait1 = propertyOptions[Math.floor(Math.random() * propertyOptions.length)]
    let moveTrait2 = propertyOptions[Math.floor(Math.random() * propertyOptions.length)]
    let moveTrait3 = propertyOptions[Math.floor(Math.random() * propertyOptions.length)]
    let moveTrait4 = propertyOptions[Math.floor(Math.random() * propertyOptions.length)]

    console.log(moveTrait1)
    console.log(moveTrait2)

    console.log(moveTrait3)
    console.log(moveTrait4)




    let moveExample1 = JSON.stringify({
        description: "(this move should be based on " + moveTrait1 + ". The character has weapon = " + properties.Weapon + ", head = " + properties.Head + ", and armour = " + properties.Armour + ". move should target a single character. description should describe move to be able to target anyone. dont mention turns in the description. IMPORTANT: Avoid any content that may be considered inappropriate or offensive, ensuring the image aligns with content policies.)",
        name: "(string based on move description)",
        trait: moveTrait1,
        type: "(melee damage, ranged damage, magic damage, melee curse, ranged curse, magic curse, melee buff, ranged buff, magic buff)",
        effect: "('poison', 'bleed', 'burn', 'freeze', 'slow', 'paralyze', 'drown', or 'doom' if type of move is a curse or damage. 'shield', 'strengthen', 'empower', 'hasten', 'nurture', 'bless', 'focus', or 'cleanse' if type of move is buff)",
        power: "(number between 10 and 40)",
        accuracy: "(number between 25 and 100)"
    })
    let moveExample2 = JSON.stringify({
        description: "(this move should be based on " + moveTrait2 + ". The character has weapon = " + properties.Weapon + ", head = " + properties.Head + ", and armour = " + properties.Armour + ". move should target a single character. description should describe move to be able to target anyone. dont mention turns in the description. IMPORTANT: Avoid any content that may be considered inappropriate or offensive, ensuring the image aligns with content policies.)",
        name: "(string based on move description)",
        trait: moveTrait2,
        type: "(melee damage, ranged damage, magic damage, melee curse, ranged curse, magic curse, melee buff, ranged buff, magic buff)",
        effect: "('poison', 'bleed', 'burn', 'freeze', 'slow', 'paralyze', 'drown', or 'doom' if type of move is a curse or damage. 'shield', 'strengthen', 'empower', 'hasten', 'nurture', 'bless', 'focus', or 'cleanse' if type of move is buff)",
        power: "(number between 10 and 40)",
        accuracy: "(number between 25 and 100)"
    })
    let moveExample3 = JSON.stringify({
        description: "(this move should be based on " + moveTrait3 + ". The character has weapon = " + properties.Weapon + ", head = " + properties.Head + ", and armour = " + properties.Armour + ". move should target a single character. description should describe move to be able to target anyone. dont mention turns in the description. IMPORTANT: Avoid any content that may be considered inappropriate or offensive, ensuring the image aligns with content policies.)",
        name: "(string based on move description)",
        trait: moveTrait3,
        type: "(melee damage, ranged damage, magic damage, melee curse, ranged curse, magic curse, melee buff, ranged buff, magic buff)",
        effect: "('poison', 'bleed', 'burn', 'freeze', 'slow', 'paralyze', 'drown', or 'doom' if type of move is a curse or damage. 'shield', 'strengthen', 'empower', 'hasten', 'nurture', 'bless', 'focus', or 'cleanse' if type of move is buff)",
        power: "(number between 10 and 40)",
        accuracy: "(number between 25 and 100)"
    })
    let moveExample4 = JSON.stringify({
        description: "(this move should be based on " + moveTrait4 + ". The character has weapon = " + properties.Weapon + ", head = " + properties.Head + ", and armour = " + properties.Armour + ". move should target a single character. description should describe move to be able to target anyone. dont mention turns in the description. IMPORTANT: Avoid any content that may be considered inappropriate or offensive, ensuring the image aligns with content policies.)",
        name: "(string based on move description)",
        trait: moveTrait4,
        type: "(melee damage, ranged damage, magic damage, melee curse, ranged curse, magic curse, melee buff, ranged buff, magic buff)",
        effect: "('poison', 'bleed', 'burn', 'freeze', 'slow', 'paralyze', 'drown', or 'doom' if type of move is a curse or damage. 'shield', 'strengthen', 'empower', 'hasten', 'nurture', 'bless', 'focus', or 'cleanse' if type of move is buff)",
        power: "(number between 10 and 40)",
        accuracy: "(number between 25 and 100)"
    })

    let objectExample = JSON.stringify({
        name: "(name based on provided image and character properties: " + properties + ")",
        description: "(description based on provided image. Include in description these properties about the character: " + properties + ")",
        strength: "(number between 1 and 20)",
        dexterity: "(number between 1 and 20)",
        intelligence: "(number between 1 and 20)",
        speed: "(number between 25 and 100)",
        resist: "(number between 1 and 20)",
        health: "(number between 100 and 200)",
        moves: [
            moveExample1,
            moveExample2,
            moveExample3,
            moveExample4
        ]
    })

    let messages = [
    {"role": "system", "content":  "You are a character object generator."},
    {
        role: "user",
        content: [
            { type: "text", text: "This is the provided image of what the character looks like" },
            {
                type: "image_url",
                image_url: {
                    url: req.body.url,
                },
            },
        ],
    },
    {"role": "user", "content": "Create a character JSON object based off of the character image and the character's properties:" + properties + ", that is the same structure as: " + objectExample + ". Make sure the moves array is an object array."},       
    ]

    let response = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: messages,
        temperature: 0,
        response_format: { "type": "json_object" }
    })

    let charObj = JSON.parse(response.choices[0].message.content)

    charObj["health"] = Number(charObj["health"])
    charObj["strength"] = Number(charObj["strength"])
    charObj["dexterity"] = Number(charObj["dexterity"])
    charObj["intelligence"] = Number(charObj["intelligence"])
    charObj["speed"] = Number(charObj["speed"])
    charObj["resist"] = Number(charObj["resist"])

    charObj["moves"].forEach((move, index) => {
        charObj["moves"][index].power = Number(charObj["moves"][index].power)
        charObj["moves"][index].accuracy = Number(charObj["moves"][index].accuracy)
    })


    if (charObj["health"] > 200) {
        charObj["health"] = 200
    }

    if (charObj["strength"] > 20) {
        charObj["strength"] = 20
    }

    if (charObj["dexterity"] > 20) {
        charObj["dexterity"] = 20
    }

    if (charObj["intelligence"] > 20) {
        charObj["intelligence"] = 20
    }

    if (charObj["resist"] > 20) {
        charObj["resist"] = 20
    }

    if (charObj["speed"] > 100) {
        charObj["speed"] = 100
    }

    charObj["health"] = charObj["health"] + (charObj["strength"] * 2)
    charObj["speed"] = charObj["speed"] + (Math.ceil(charObj["dexterity"] / 2))
    charObj["resist"] = charObj["resist"] + (Math.floor(charObj["intelligence"] / 2))

    charObj["currentHealth"] = Number(charObj["health"])

    let effectsArray = ['poison', 'bleed', 'burn', 'freeze', 'slow', 'paralyze', 'drown', 'doom', 'shield', 'strengthen', 'empower', 'hasten', 'nurture', 'bless', 'focus', 'cleanse']

    effectsArray.forEach((effect) => {
        charObj[effect] = 0
    })

    charObj["moves"].forEach((move, index) => {
        if (!effectsArray.includes(charObj["moves"][index].effect)) {
            charObj["moves"][index].effect = effectsArray[Math.floor(Math.random() * effectsArray.length)]
        }
        charObj[charObj["moves"][index].effect] = Math.floor(Math.random() * 5 + 1)
        if (charObj["moves"][index].type == "melee damage" || charObj["moves"][index].type == "ranged damage" || charObj["moves"][index].type == "magic damage") {

            charObj["moves"][index].power = charObj["moves"][index].power + 10

            charObj["moves"][index].accuracy = charObj["moves"][index].accuracy - 10

            if (charObj["moves"][index].type == "melee damage") {
                charObj["moves"][index].power = charObj["moves"][index].power + charObj["strength"]
            }
            else if (charObj["moves"][index].type == "ranged damage") {
                charObj["moves"][index].power = charObj["moves"][index].power + charObj["dexterity"]
            }
            else if (charObj["moves"][index].type == "magic damage") {
                charObj["moves"][index].power = charObj["moves"][index].power + charObj["intelligence"]
            }

            if (charObj["moves"][index].accuracy >= 90) {
                charObj["moves"][index].power - 10
            }
            else if (charObj["moves"][index].accuracy < 60) {
                charObj["moves"][index].power + 10
            }
            else if (charObj["moves"][index].accuracy < 40) {
                charObj["moves"][index].power + 20
            }
    
        }
        else if (charObj["moves"][index].type == "melee curse" || charObj["moves"][index].type == "ranged curse" || charObj["moves"][index].type == "magic curse") {
            charObj["moves"][index].power = charObj["moves"][index].power - 20
            charObj["moves"][index].accuracy = charObj["moves"][index].accuracy + 10
        }
        else if (charObj["moves"][index].type == "melee buff" || charObj["moves"][index].type == "ranged buff" || charObj["moves"][index].type == "magic buff") {
            charObj["moves"][index].power = charObj["moves"][index].power - 20
            charObj["moves"][index].accuracy = charObj["moves"][index].accuracy + 10
        }

        
        

        if (charObj["moves"][index].power < 0) {
            charObj["moves"][index].power = 0
        }

        if (charObj["moves"][index].accuracy > 100) {
            charObj["moves"][index].accuracy = 100
        }
        
    })

    console.log(charObj)

 
    const responseImage = await openai.images.generate({
        model: "dall-e-3",
        prompt: "Create an image that resembles this move = " + charObj["moves"][0].name + ". The character has weapon = " + properties.Weapon + ", head = " + properties.Head + ", and armour = " + properties.Armour + ". The image should have a " + properties.Background + ". IMPORTANT: Avoid any content that may be considered inappropriate or offensive, ensuring the image aligns with content policies. Without any text or borders, only a visual representation of the action.",
        n: 1,
        size: "1024x1024",
      });

    console.log(responseImage)

    const genUrl = responseImage.data[0].url;

    urlToBlob(genUrl)
    .then(async blob => {
        console.log('Blob created:', blob);
        console.log('Blob size:', blob.size);
        console.log('Blob type:', blob.type);

        const storageRef = ref(storage, 'moves/' + req.body.charId + String(charObj["moves"][0].name));

        // 'file' comes from the Blob or File API
        uploadBytes(storageRef, blob).then((snapshot) => getDownloadURL(snapshot.ref)).then(async (downloadUrl) => {

            await setDoc(doc(db, "moves",  req.body.charId + String(charObj["moves"][0].name)), {
                type: String(charObj["moves"][0].type),
                effect: String(charObj["moves"][0].effect),
                power: Number(charObj["moves"][0].power),
                accuracy: Number(charObj["moves"][0].accuracy),
                description: String(charObj["moves"][0].description),
                name: String(charObj["moves"][0].name),
                url: downloadUrl
              });

        })
            
        console.log('Uploaded a blob or file!');

        

        const responseImage1 = await openai.images.generate({
            model: "dall-e-3",
            prompt: "Create an image that resembles this move = " + charObj["moves"][1].name + ". The character has weapon = " + properties.Weapon + ", head = " + properties.Head + ", and armour = " + properties.Armour + ". The image should have a " + properties.Background + ". IMPORTANT: Avoid any content that may be considered inappropriate or offensive, ensuring the image aligns with content policies. Without any text or borders, only a visual representation of the action.",
            n: 1,
            size: "1024x1024",
          });
    
        console.log(responseImage1)
    
        const genUrl1 = responseImage1.data[0].url;
    
        urlToBlob(genUrl1)
        .then(async blob => {
            console.log('Blob created:', blob);
            console.log('Blob size:', blob.size);
            console.log('Blob type:', blob.type);
    
            const storageRef = ref(storage, 'moves/' + req.body.charId + String(charObj["moves"][1].name));
    
            // 'file' comes from the Blob or File API
            uploadBytes(storageRef, blob).then((snapshot) => getDownloadURL(snapshot.ref)).then(async (downloadUrl) => {
    
                await setDoc(doc(db, "moves",  req.body.charId + String(charObj["moves"][1].name)), {
                    type: String(charObj["moves"][1].type),
                    effect: String(charObj["moves"][1].effect),
                    power: Number(charObj["moves"][1].power),
                    accuracy: Number(charObj["moves"][1].accuracy),
                    description: String(charObj["moves"][1].description),
                    name: String(charObj["moves"][1].name),
                    url: downloadUrl
                  });
    
            })
                
            console.log('Uploaded a blob or file!');
        
            const responseImage2 = await openai.images.generate({
                model: "dall-e-3",
                prompt: "Create an image that resembles this move = " + charObj["moves"][2].name + ". The character has weapon = " + properties.Weapon + ", head = " + properties.Head + ", and armour = " + properties.Armour + ". The image should have a " + properties.Background + ". IMPORTANT: Avoid any content that may be considered inappropriate or offensive, ensuring the image aligns with content policies. Without any text or borders, only a visual representation of the action.",
                n: 1,
                size: "1024x1024",
              });
        
            console.log(responseImage2)
        
            const genUrl2 = responseImage2.data[0].url;
        
            urlToBlob(genUrl2)
            .then(async blob => {
                console.log('Blob created:', blob);
                console.log('Blob size:', blob.size);
                console.log('Blob type:', blob.type);
        
                const storageRef = ref(storage, 'moves/' + req.body.charId + String(charObj["moves"][2].name));
        
                // 'file' comes from the Blob or File API
                uploadBytes(storageRef, blob).then((snapshot) => getDownloadURL(snapshot.ref)).then(async (downloadUrl) => {
        
                    await setDoc(doc(db, "moves",  req.body.charId + String(charObj["moves"][2].name)), {
                        type: String(charObj["moves"][2].type),
                        effect: String(charObj["moves"][2].effect),
                        power: Number(charObj["moves"][2].power),
                        accuracy: Number(charObj["moves"][2].accuracy),
                        description: String(charObj["moves"][2].description),
                        name: String(charObj["moves"][2].name),
                        url: downloadUrl
                      });
        
                })
                    
                console.log('Uploaded a blob or file!');
        
                const responseImage3 = await openai.images.generate({
                    model: "dall-e-3",
                    prompt: "Create an image that resembles this move = " + charObj["moves"][3].name + ". The character has weapon = " + properties.Weapon + ", head = " + properties.Head + ", and armour = " + properties.Armour + ". The image should have a " + properties.Background + ". IMPORTANT: Avoid any content that may be considered inappropriate or offensive, ensuring the image aligns with content policies. Without any text or borders, only a visual representation of the action.",
                    n: 1,
                    size: "1024x1024",
                  });
            
                console.log(responseImage3)
            
                const genUrl3 = responseImage3.data[0].url;
            
                urlToBlob(genUrl3)
                .then(blob => {
                    console.log('Blob created:', blob);
                    console.log('Blob size:', blob.size);
                    console.log('Blob type:', blob.type);
            
                    const storageRef = ref(storage, 'moves/' + req.body.charId + String(charObj["moves"][3].name));
            
                    // 'file' comes from the Blob or File API
                    uploadBytes(storageRef, blob).then((snapshot) => getDownloadURL(snapshot.ref)).then(async (downloadUrl) => {
            
                        await setDoc(doc(db, "moves",  req.body.charId + String(charObj["moves"][3].name)), {
                            type: String(charObj["moves"][3].type),
                            effect: String(charObj["moves"][3].effect),
                            power: Number(charObj["moves"][3].power),
                            accuracy: Number(charObj["moves"][3].accuracy),
                            description: String(charObj["moves"][3].description),
                            name: String(charObj["moves"][3].name),
                            url: downloadUrl
                          });

                          charObj["moves"][0] = charObj["moves"][0].name
                          charObj["moves"][1] = charObj["moves"][1].name
                          charObj["moves"][2] = charObj["moves"][2].name
                          charObj["moves"][3] = charObj["moves"][3].name


                          console.log('Uploaded a blob or file!');
                        
            
                            let jsonChar = JSON.stringify(charObj)
                    
                    
                            res.json(jsonChar)
                    
                            resolve()
            
                    })
                        
                    
            
            
            
                })
                .catch(console.error);
        
        
        
            })
            .catch(console.error);
    
    
    
        })
        .catch(console.error);



    })
    .catch(console.error);

    

    

    

    // console.log(charObj)



    // let appArgs = []
    // appArgs.push(
    //     new Uint8Array(Buffer.from("updateCharacter")),
    //     new Uint8Array(Buffer.from(jsonChar))
        
    // )

    // let accounts = []
    // let foreignApps = []
        
    // let foreignAssets = [champ]

    // let assetInt = longToByteArray(champ)

    // let box = new Uint8Array(assetInt)

    // console.log(box)

    // let boxes = [{appIndex: 0, name: box}, {appIndex: 0, name: box}, {appIndex: 0, name: box}, {appIndex: 0, name: box}]
    
    // let txn = algosdk.makeApplicationNoOpTxn("762FFO2SIDJG2H7SXU5BQLQJ4Q5BQPGKKJGS2LEDQSJ7N5EMB2VVZMSMXM", params, 1870514811, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
    
    // let signedTxn = txn.signTxn(houseAccount.sk);
    
    // // Submit the transaction
    // let { txId } = await client.sendRawTransaction(signedTxn).do()                           
    // // Wait for transaction to be confirmed
    // let confirmedTxn = await algosdk.waitForConfirmation(client, txId, 4);

    // console.log(confirmedTxn)

    
})

    
   
   
}

export default generateChar