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

    function base64ToNumber(base64) {
        const binary = atob(base64); // decode base64 to binary string
        let result = 0;
        for (let i = 0; i < binary.length; i++) {
            result = (result << 8) + binary.charCodeAt(i);
        }
        return result;
    }

    //D4SDJ7CVANGHXBF2IDQFPEX2TNWWRQBZAWRMUHSEXQ63V7VW2ZEK4QBMJU
    const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)

    let global = await indexerClient.lookupApplications(req.body.contract).do();

    let globalState = global.application.params["global-state"]

    let fights = []

    globalState.forEach(async (keyVal) => {
        if (keyVal.key[0] == 'A') {
            console.log(keyVal.key)
            let asset = base64ToNumber(keyVal.key)
            let wager = keyVal.value.uint
            fights.push({asset: asset, wager: wager})
            
        }
    })
   
    
    res.json({fights: fights});
    

        


  
  
  

   
}

export default getFights