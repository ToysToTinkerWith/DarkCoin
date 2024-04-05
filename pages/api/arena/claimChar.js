import NextCors from 'nextjs-cors';

import algosdk from 'algosdk';

async function claimChar(req, res) {

    // Run the cors middleware
   // nextjs-cors uses the cors package, so we invite you to check the documentation https://github.com/expressjs/cors

   await NextCors(req, res, {
    // Options
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    origin: '*',
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
 });
 

 return new Promise(async (resolve) => {

    const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)

    let params = await client.getTransactionParams().do()

    let ttxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
        "762FFO2SIDJG2H7SXU5BQLQJ4Q5BQPGKKJGS2LEDQSJ7N5EMB2VVZMSMXM", 
        req.body.address, 
        undefined,
        undefined,
        1, 
        undefined,
        req.body.nftId,
        params
        );

        const userAccout =  algosdk.mnemonicToSecretKey(process.env.DC_WALLET)
        // Sign the transaction
        let signedTxn = ttxn.signTxn(userAccout.sk);

        // Submit the transaction
        const { txId } = await client.sendRawTransaction(signedTxn).do()

        let confirmedTxn = await algosdk.waitForConfirmation(client, txId, 4);

        res.json({res: "completed"})
        resolve()
 })

    
    
   
   
}

export default claimChar