import NextCors from 'nextjs-cors';

const pinataSDK = require('@pinata/sdk');

import got from "got"

import algosdk from 'algosdk';



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

                return new Promise((resolve) => {
                    pinata.pinFileToIPFS(reader, options).then(async (result) => {
                        //handle results here
    
                        let ipfs = result.IpfsHash
    
                        if (ipfs) {
                
                        const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)
                        
                        let params = await client.getTransactionParams().do();
                
                        const creator = "762FFO2SIDJG2H7SXU5BQLQJ4Q5BQPGKKJGS2LEDQSJ7N5EMB2VVZMSMXM";
                        const defaultFrozen = false;    
                        const unitName = "DCCHAR"; 
                        const assetName = req.body.name;
                        const url = "https://gateway.pinata.cloud/ipfs/" + ipfs;
                        const managerAddr = "762FFO2SIDJG2H7SXU5BQLQJ4Q5BQPGKKJGS2LEDQSJ7N5EMB2VVZMSMXM";
                        const reserveAddr = req.body.addr;  
                        const freezeAddr = undefined;
                        const clawbackAddr = undefined;
                        const total = 1;                // NFTs have totalIssuance of exactly 1
                        const decimals = 0;             // NFTs have decimals of exactly 0
                        const note = new Uint8Array(Buffer.from("Description: " + req.body.descript.substring(0, 500) + " Moves: " + req.body.des))
                        const mtxn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
                        assetMetadataHash: undefined,
                        assetName:assetName,
                        assetURL: url,
                        clawback: clawbackAddr,
                        decimals:decimals,
                        defaultFrozen:defaultFrozen,
                        freeze: freezeAddr,
                        from:creator,
                        manager: managerAddr,
                        note: note,
                        rekeyTo:undefined,
                        reserve: reserveAddr,
                        suggestedParams: params,
                        total:total,
                        unitName:unitName,
                    });

                    console.log(mtxn)
                
                    
                        const userAccout =  algosdk.mnemonicToSecretKey(process.env.DC_WALLET)
                        // Sign the transaction
                        let signedTxn = mtxn.signTxn(userAccout.sk);
                
                    
                        // Submit the transaction
                        const { txId } = await client.sendRawTransaction(signedTxn).do()
                
                        let confirmedTxn = await algosdk.waitForConfirmation(client, txId, 4);
                
                        res.json({ ipfs: url, assetId: confirmedTxn["asset-index"] });
                        resolve()
    
                        }
    
                        
                    }).catch((err) => {
                        //handle error here
                        console.log(err)
                        res.json({ result: err });
                        resolve()
                    });
                })


            } catch (error) {
                res.json({ result: error });
            }
          })();
        
        })
        .catch(error => res.json({ result: error }));

      
   
}

export default pinUrl