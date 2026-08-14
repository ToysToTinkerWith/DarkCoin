import NextCors from 'nextjs-cors';

import algosdk from "algosdk"


async function getFights(req, res) {
   // Run the cors middleware
   // nextjs-cors uses the cors package, so we invite you to check the documentation https://github.com/expressjs/cors

   await NextCors(req, res, {
    // Options
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    origin: '*',
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    });

    function u8_8_toInt(u8, { littleEndian = false, asNumberIfSafe = true } = {}) {
        if (!(u8 instanceof Uint8Array) || u8.length !== 8) {
            throw new TypeError("Expected Uint8Array(8)");
        }

        let n = 0n;

        if (littleEndian) {
            for (let i = 7; i >= 0; i--) n = (n << 8n) | BigInt(u8[i]);
        } else {
            for (let i = 0; i < 8; i++) n = (n << 8n) | BigInt(u8[i]);
        }

        if (asNumberIfSafe && n <= BigInt(Number.MAX_SAFE_INTEGER)) return Number(n);
        return n; // BigInt
        }
    


    //D4SDJ7CVANGHXBF2IDQFPEX2TNWWRQBZAWRMUHSEXQ63V7VW2ZEK4QBMJU
    const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)

    console.log(req.body.contract)

    let global = await indexerClient.lookupApplications(req.body.contract).do();

    console.log(global)

    let globalState = global.application.params.globalState


    let fights = []

    if (globalState) {

        globalState.forEach(async (keyVal) => {
                console.log(keyVal)
                let asset = u8_8_toInt(keyVal.key)
                console.log(asset)
                let wager = keyVal.value.uint
                console.log(wager)
                fights.push({asset: asset, wager: Number(wager)})
                
            
        })

    }

    
   
    
    res.json({fights: fights});
    
   
}

export default getFights