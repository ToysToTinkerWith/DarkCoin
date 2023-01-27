import NextCors from 'nextjs-cors';

const pinataSDK = require('@pinata/sdk');

import got from "got"
const { createWriteStream } = require("fs");
const fs = require('fs');



const pinata = new pinataSDK({ pinataApiKey: process.env.PINATA_PUBLIC, pinataSecretApiKey: process.env.PINATA_SECRET });

async function pinUrl(req, res) {
   // Run the cors middleware
   // nextjs-cors uses the cors package, so we invite you to check the documentation https://github.com/expressjs/cors

   await NextCors(req, res, {
      // Options
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
      origin: '*',
      optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
   });

   // Rest of the API logic

   

   

   pinata.testAuthentication().then((result) => {
        //handle successful authentication here
        console.log(result);

        const url = req.body.url;
        const fileName = "image.png";

        const downloadStream = got.stream(url);
        const fileWriterStream = createWriteStream(fileName);

        downloadStream
        .on("downloadProgress", ({ transferred, total, percent }) => {
            const percentage = Math.round(percent * 100);
            console.error(`progress: ${transferred}/${total} (${percentage}%)`);
        })
        .on("error", (error) => {
            console.error(`Download failed: ${error.message}`);
        });

        fileWriterStream
        .on("error", (error) => {
            console.error(`Could not write file to system: ${error.message}`);
        })
        .on("finish", () => {
            console.log(`File downloaded to ${fileName}`);
            const readableStreamForFile = fs.createReadStream(fileName);
            const options = {
                pinataMetadata: {
                    name: req.body.des.Name,
                },
                pinataOptions: {
                    cidVersion: 0
                }
            };
            pinata.pinFileToIPFS(readableStreamForFile, options).then((result) => {
                //handle results here
                console.log(result);
                res.json({ result: result });
            }).catch((err) => {
                //handle error here
                console.log(err);
            });
        });

        downloadStream.pipe(fileWriterStream);

        
        })
        .catch(error => console.log(error));

      
   
}

export default pinUrl