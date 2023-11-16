import NextCors from 'nextjs-cors';

const pinataSDK = require('@pinata/sdk');

import got from "got"
const { createWriteStream } = require("fs");
const fs = require('fs');
const fsPromises = require("fs").promises;

import path from 'path'


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

   

   

   pinata.testAuthentication().then(() => {
        //handle successful authentication here

        const url = req.body.url;

        (async () => {
            try {
                
                const reader = got.stream(url)
                    
                const options = {
                    pinataMetadata: {
                        name: req.body.name,
                    },
                    pinataOptions: {
                        cidVersion: 0
                    }
                };
                pinata.pinFileToIPFS(reader, options).then((result) => {
                    //handle results here
                    res.json({ result: result });
                }).catch((err) => {
                    //handle error here
                    res.json({ result: err });
                });
                

                

            } catch (error) {
                res.json({ result: error });
            }
          })();
        
        })
        .catch(error => res.json({ result: error }));

      
   
}

export default pinUrl