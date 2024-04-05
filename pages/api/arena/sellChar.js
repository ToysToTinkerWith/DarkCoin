import NextCors from 'nextjs-cors';

import algosdk from 'algosdk';

async function sellChar(req, res) {

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

    let appArgs = []


    let accounts = []
    let foreignApps = []
        
    let foreignAssets = [req.body.nftId]

    let boxes = []

    appArgs.push(
        new Uint8Array(Buffer.from("optin"))
    )

    let otxn = algosdk.makeApplicationNoOpTxn("762FFO2SIDJG2H7SXU5BQLQJ4Q5BQPGKKJGS2LEDQSJ7N5EMB2VVZMSMXM", params, 1035432580, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);

    let userAccout =  algosdk.mnemonicToSecretKey(process.env.DC_WALLET)
    // Sign the transaction
    let signedTxn = otxn.signTxn(userAccout.sk);

    // Submit the transaction
    let { txId } = await client.sendRawTransaction(signedTxn).do()


    let confirmedTxn = await algosdk.waitForConfirmation(client, txId, 4);

    let stxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
        "762FFO2SIDJG2H7SXU5BQLQJ4Q5BQPGKKJGS2LEDQSJ7N5EMB2VVZMSMXM", 
        "VI66S7AN2G4HKUD7DXJUSVEP54MDJ42NGDOUUD3LQJSCU7WT5UU2KAIHAU", 
        undefined,
        undefined,
        1, 
        undefined,
        req.body.nftId,
        params
      );

    appArgs = []
    

    accounts = []
    foreignApps = []
        
    foreignAssets = [req.body.nftId]

    let sellBox = new Uint8Array(Buffer.from(String(req.body.nftId) + ">" + String(req.body.price)))

    boxes = [{appIndex: 0, name: sellBox}]

    appArgs.push(
        new Uint8Array(Buffer.from("sell")),
        new Uint8Array(Buffer.from(String(req.body.nftId) + ">" + String(req.body.price))),
        new Uint8Array(Buffer.from(req.body.address)),
    )

    let atxn = algosdk.makeApplicationNoOpTxn("762FFO2SIDJG2H7SXU5BQLQJ4Q5BQPGKKJGS2LEDQSJ7N5EMB2VVZMSMXM", params, 1035432580, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
    
    let txns = [stxn, atxn]

    let txGroup = algosdk.assignGroupID(txns);
    
    let signedTxn1 = stxn.signTxn(userAccout.sk);
    let signedTxn2 = atxn.signTxn(userAccout.sk);

    let signed = [signedTxn1, signedTxn2]


    // Submit the transaction
    txId = await client.sendRawTransaction(signed).do()

    confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);

    res.json({res: "completed"})
    resolve()
 })

    
    
   
   
}

export default sellChar