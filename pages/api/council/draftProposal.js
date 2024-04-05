import NextCors from 'nextjs-cors';

import algosdk from 'algosdk';

async function draftProposal(req, res) {

    // Run the cors middleware
   // nextjs-cors uses the cors package, so we invite you to check the documentation https://github.com/expressjs/cors

   await NextCors(req, res, {
    // Options
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    origin: '*',
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
 });

 try {
 

 return new Promise(async (resolve) => {

    const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)
            
        let params = await client.getTransactionParams().do();

        let appArgs = []

        appArgs.push(new Uint8Array(Buffer.from("draft")))

        if (req.body.accepted) {
          appArgs.push(
            new Uint8Array(Buffer.from("accept")),
            new Uint8Array(Buffer.from(req.body.draft)),
          )
        }
        appArgs.push(
          new Uint8Array(Buffer.from("reject")),
        )

        let accounts = []
        let foreignApps = []
          
        let foreignAssets = []

        let boxes

        let draftBox = new Uint8Array(Buffer.from("Draft"))

        if (req.body.accepted) {
          boxes = [{appIndex: 0, name: draftBox}, {appIndex: 0, name: draftBox}, {appIndex: 0, name: draftBox}]
        }

        let amend0 = new Uint8Array(Buffer.from("Amend0"))
       
        boxes.push({appIndex: 0, name: amend0})
        
        let wtxn = algosdk.makeApplicationNoOpTxn("762FFO2SIDJG2H7SXU5BQLQJ4Q5BQPGKKJGS2LEDQSJ7N5EMB2VVZMSMXM", params, req.body.contract, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);

        const houseAccount =  algosdk.mnemonicToSecretKey(process.env.DC_WALLET)

        let signedTxn = wtxn.signTxn(houseAccount.sk);

        let txId = wtxn.txID().toString();

        // Submit the transaction
        await client.sendRawTransaction(signedTxn).do()                           
        // Wait for transaction to be confirmed
        let confirmedTxn = await algosdk.waitForConfirmation(client, txId, 4);

        res.json({res: "success"})
        resolve()
 })

}
catch(err) {
    console.log(err)
    res.json({res: err})
    resolve()
}

    
    
   
   
}

export default draftProposal