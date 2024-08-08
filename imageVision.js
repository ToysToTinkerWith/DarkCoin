import Jimp from "jimp"
import fs from "fs";
import OpenAI from "openai";


import ffmpegPath from "@ffmpeg-installer/ffmpeg"
import ffmpeg from "fluent-ffmpeg"

import path from "path";
import { timeStamp } from "console";
import { stringify } from "querystring";


ffmpeg.setFfmpegPath(ffmpegPath.path);


var video = new ffmpeg('aoe2.mp4')

const openai = new OpenAI({
    apiKey: ""
});


let videoLength = 2213
let pastStories = []
let count = 0

let inputFiles = []





function saveFrames() {
    return new Promise(async (resolve) => {
        await video
        .on('filenames', function(filenames) {
            console.log('Screenshots are being saved as: ' + filenames.join(', '));
        })
        .on('end', function() {
            console.log('Screenshots taken');
            resolve()
        })
        .on('error', function(err) {
            console.error('An error occurred: ' + err.message);
        })
        .screenshots({
            timestamps: Array.from({ length: 36 }, (_, i) => i * 30),
            filename: 'thumbnail-at-%s-seconds.png',
            folder: "screenshots",
            size: '1280x720'
        });
    });
  }

  function generateAudio() {

        return new Promise(async (resolve) => {

            console.log(count)
            const image1 = await Jimp.read('screenshots/thumbnail-at-' + String(count) + '-seconds.png');
            const image2 = await Jimp.read('screenshots/thumbnail-at-' + String(count + 30) + '-seconds.png');


            
            image1.getBase64Async(Jimp.MIME_PNG).then(async (base641) => {
                image2.getBase64Async(Jimp.MIME_PNG).then(async (base642) => {


                //let history = " This is an ongoing story, do not introduce the scene. Tell the next part of the story based on the defference between the first image and the second. The previous parts are: " + pastStories.toString() + " try to talk about a different aspect of Dark Coin than what was previous stated."
                
            
                let text = "The game is Age of Empires 2. Players begin the game around the Town Center, a scout, and villagers. Tell a story based on the first image going to the second image. The player being shown is 'Dark Coin' Create a story based on the images provided. Just return the text of the story. Dark Coin is red color, his enemy is in the Blue color. "

                let darkCoinDetails = [
                    "Dark Coin (ASA-1088771340) Dark Coin is an innovative community-driven project within the Algorand ecosystem, focused on expanding the possibilities of Algorand Standard Assets (ASAs) in the decentralized finance (DeFi) space. It operates as a decentralized autonomous organization (DAO), giving collective ownership and democratic management power to its members through blockchain-enforced rules. Key Features: Decentralized Governance: Dark Coin enables users to actively participate in shaping the project's future. Through our dApp, users can cast votes and submit proposals using NFT-based voting tokens. This allows the community to influence decisions on project direction, governance, and asset management. Character NFT Assets and AI Arena: Unique character NFT assets that can be engaged in battles within the Dark Coin AI Arena, providing an engaging and interactive experience for users. Governance and Control: The Dark Coin team is developing a user-friendly dApp accessible via (https://dark-coin.com), where members can participate in governance processes, propose changes, and vote on key decisions. Empowering the Community: Dark Coin is committed to empowering its community by providing the tools and mechanisms necessary for active participation, influence, and contribution. Through our DAO structure and decentralized governance, we strive to create a collaborative environment that benefits all members.",
                    "Join us in shaping the future of decentralized finance on the Algorand network! Dark Coin is an experimental grassroots community project focused on expanding the Algorand DeFi ecosystem. Managed by a decentralized autonomous organization (DAO), Dark Coin's users collectively own and manage the project based on blockchain-enforced rules and smart contracts. The primary objective of the Dark Coin DAO is to develop privacy solutions for the Algorand Network. The Council is an app integrated with Dark Coin, designed to let users vote on proposals using their DAO NFTs. It involves creating proposals, amending them, and voting to decide their fate. Anyone can create a proposal by sending 20 Algo to the Council smart contract. Once this is done, a separate contract is made for the specific proposal, which holds the 20 Algo.",
                    "The Arena is a Dark Coin application where users can battle using their Dark Coin champion NFTs for fame, glory, and Dark Coin rewards. Dark Coin champion NFTs use Algorand's ARC-19 standard, allowing for swappable traits. Visit the trait swapper inside the Arena to mix and match the look of your champion. Equipped traits are sent to a contract for holding. Unequipped traits are sent to the user's wallet. When ready for battle, go to the select tab inside the Arena. Select the champion you wish to use in the battle. Start a new battle. Join a Battle: Join an already initialized battle. Both parties must pay a 10,000 Dark Coin wager plus an additional 0.1 Algo fee.                     When a champion joins an existing battle, the Arena contract determines the winner. The winner receives the combined 20,000 Dark Coin wager. Using AI, the app generates a battle story describing the victory. The app also creates an image depicting the two champions in battle. Battle results are displayed in a dedicated Discord channel.",
                ]     

                let darkCoin = " The dialouge should be about Dark Coin on the Algorand Blockchain, and the events happening between the images. Briefly describe the scene. The dialouge should come from the NPC characters seen in the image. Refer to NPCs as there official unit name from Age of Empires 2. Make sure the events relate to the events happening in game. The text returned should not be longer than 400 characters. Sound epic and dramatic"
             
                if (count > 350) {
                    darkCoin = darkCoin
                }
                else {
                    darkCoin = darkCoin + "Do not mention blue. The narrator should set the scene, then the story is a short converstaion between 2 or more allied NPCs seen in the image, talking to eachother about Dark Coin. Name the NPCs real Bulgarian names, but should speak in english. Inlcude and outro by the narrator. Relate everything to what is happening in the image."
                    if (count < 50) {
                        darkCoin = darkCoin + "The characters is a scout and multiple villagers." 
                    }
                    else if (count < 100) {
                        darkCoin = darkCoin + "The characters are multiple villagers harvesting a sheep. One goes out to build a lumber camp. Talk about the Dark Coin DAO." 
                    }
                    else if (count < 150) {
                        darkCoin = darkCoin + "Talk about the Dark Coin Arena." 
                    }
                    
                }

                darkCoin = darkCoin + "These are details about Dark Coin: " + darkCoinDetails[Math.floor(Math.random() * 3)]

                
                
                const response = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [
                    {
                        role: "user",
                        content: [
                        
                            { 
                                type: "text", 
                                text: text
                            },
                            { 
                                type: "text", 
                                text: darkCoin
                            },
                            {
                                type: "image_url",
                                image_url: {
                                "url": base641,
                                },
                            },
                            {
                                type: "image_url",
                                image_url: {
                                "url": base642,
                                },
                            },
                            
                            
                        ],
                    },
                    ],
                    });

                    console.log(response.choices[0].message.content)

                    let chat = response.choices[0].message.content

                    pastStories.push(chat)

                    let jsonExample = {
                        
                            "dialogue": [
                              {
                                "speaker": "Narrator",
                                "line": "As Dark Coin scouted the landscape, he encountered a group of villagers.",
                                "voice": "fable"
                              },
                              {
                                "speaker": "Ivan",
                                "line": "Do you see how Dark Coin shapes our future? With decentralized governance, every voice matters!",
                                "gender": "male or female"
                              },
                              {
                                "speaker": "Narrator",
                                "line": "Ivan exclaimed, peering at the map.",
                                "voice": "fable"
                              },
                              {
                                "speaker": "Mila",
                                "line": "Exactly! We can vote on proposals and truly own our project. It’s democracy on the Algorand Blockchain!",
                                "gender": "male or female"
                              },
                              {
                                "speaker": "Narrator",
                                "line": "Mila adjusted the pickaxe on her shoulder.",
                                "voice": "fable"
                              },
                              {
                                "speaker": "Ivan",
                                "line": "That’s the power of community! Join us, and let’s forge a thriving ecosystem together!",
                                "gender": "male or female"
                              },
                              {
                                "speaker": "Narrator",
                                "line": "Ivan added, his excitement palpable.",
                                "voice": "fable"
                              }
                            ]
                          

                      }

                    const responseObject = await openai.chat.completions.create({
                        model: "gpt-4o-mini",
                        response_format: { type: "json_object" },
                        messages: [
                        {
                            role: "user",
                            content: [
                                { 
                                    type: "text", 
                                    text: chat
                                },
                                { 
                                    type: "text", 
                                    text: "return a JSON object in this example structure: " + JSON.stringify(jsonExample) + "but use the story from the input. For the voice key, pick one of the options for male and female names. "
                                },   
                                
                            ],
                        },
                        ],
                        });

                    let dialogue = JSON.parse(responseObject.choices[0].message.content)

                    console.log(dialogue["dialogue"])

                    let maleVoices = ["alloy", "echo", "onyx"]
                    let femaleVoices = ["nova", "shimmer"]

                    dialogue["dialogue"].forEach(async (dia, index) => {
                        if (dia.gender == "male") {
                            dialogue["dialogue"][index].voice = maleVoices[Math.floor(Math.random() * 3)]

                        }
                        else if (dia.gender == "female") {
                            dialogue["dialogue"][index].voice = femaleVoices[Math.floor(Math.random() * 2)]
                        }
                    })

                    let nameObject = {

                    }

                    dialogue["dialogue"].forEach(async (dia, index) => {
                        if (nameObject[dia.speaker]) {
                            dialogue["dialogue"][index].voice = nameObject[dia.speaker]

                        }
                        else {
                            nameObject[dia.speaker] = dia.voice
                        }
                    })

                    inputFiles = []



                    await dialogue["dialogue"].forEach(async (dia, index) => {

                        let speechFile = path.resolve("cast" + String(index) + ".mp3");

                        let mp3 = await openai.audio.speech.create({
                            model: "tts-1",
                            voice: dia.voice,
                            input: dia.line,
                        });
                        console.log(speechFile);
                        let buffer = Buffer.from(await mp3.arrayBuffer());
                        await fs.promises.writeFile(speechFile, buffer);

                        inputFiles.push(speechFile)

                        if (inputFiles.length == dialogue["dialogue"].length) {
                            inputFiles.sort((a, b) => {
                                const numA = parseInt(a.match(/(\d+)\.mp3$/)[1], 10);
                                const numB = parseInt(b.match(/(\d+)\.mp3$/)[1], 10);
                                return numA - numB;
                              });
                            resolve()
                        }

                    })

                    console.log(inputFiles)
                      
                    
                

                

                    
                    

                
            })
        })
        
        });

        
    
  }

  function stichAudio() {
    return new Promise(async (resolve) => {

        console.log(inputFiles)

        const fileContent = inputFiles.map(file => `file '${file}'`).join('\n');
                    console.log(fileContent)
                    fs.writeFileSync('filelist.txt', fileContent);
                    
                    // Concatenate the audio files using ffmpeg
                    ffmpeg()
                      .input('filelist.txt')
                      .inputOptions('-f concat')
                      .inputOption('-safe 0')
                      .outputOptions('-c copy')
                      .on('error', function(err) {
                        console.error('An error occurred: ' + err.message);
                      })
                      .on('end', function() {
                        console.log('Files have been concatenated successfully.');
                        // Clean up temporary file
                        new ffmpeg()
                        .input("aoe2.mp4")
                        .input("cast.mp3")
                        
                        .complexFilter([
                            `[1:a]adelay=${count * 1000 + 5000}[delayed_audio]; 
                            [0:a][delayed_audio]amix=inputs=2:duration=first:dropout_transition=3[a]`
                        ])
                        .outputOptions([
                            '-map 0:v',              // Use the video stream from the first input
                            '-map [a]',              // Use the mixed audio stream
                            '-c:v libx264',          // Encode video stream to H.264
                            '-c:a aac',              // Encode audio stream to AAC
                            '-b:v 1000k',            // Set video bitrate to 1000 kbps
                            '-b:a 128k',             // Set audio bitrate to 128 kbps
                            '-vf scale=-1:720',      // Resize video to 720p while maintaining aspect ratio
                            '-ss ' + String(count),          // Start at count
                            '-t 60'                  // Set the duration to 30 seconds
                        ])
                        .output("final/final" + String(count) + ".mp4")
                        .on('end', function() {
                            console.log('Merging finished!');
                            resolve()
                        })
                        .on('error', function(err) {
                            console.error('An error occurred: ' + err.message);
                        })
                        .run();
                      })
                      .save('cast.mp3');

        
        
    })
    }

  function stichVideo() {
    return new Promise(async (resolve) => {

        const videoFiles = [];

        fs.readdirSync("final").forEach(file => {
            videoFiles.push(file)
        })

        videoFiles.sort((a, b) => {
            const numA = parseInt(a.match(/\d+/)[0]);
            const numB = parseInt(b.match(/\d+/)[0]);
            return numA - numB;
          });

        console.log(videoFiles)

     
        fs.writeFileSync('filelist.txt', videoFiles.map(file => `file 'final/${file}'`).join('\n'));

        ffmpeg()
        .input('filelist.txt')
        .inputFormat('concat')
        .inputOption('-safe 0')
        .outputOptions('-c copy')
        .on('end', () => {
            console.log('Files have been merged successfully');
            
        })
        .on('error', (err) => {
            console.error('Error merging files:', err);
        })
        .save('output.mp4');

        
        
    })
    }



    
//await saveFrames()


// while (videoLength - count > 0) {


    
// await generateAudio()

// await stichAudio()

// count = count + 60

// }

await stichVideo()



