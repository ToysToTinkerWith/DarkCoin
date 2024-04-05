import NextCors from 'nextjs-cors';

import algosdk from "algosdk"

async function sendAirdrop(req, res) {
   // Run the cors middleware
   // nextjs-cors uses the cors package, so we invite you to check the documentation https://github.com/expressjs/cors

   await NextCors(req, res, {
    // Options
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    origin: '*',
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    });

    return new Promise(async (resolve) => {
        try{

          const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)

          const assetInfo = await indexerClient.lookupAssetByID(req.body.sendAsset).do();

          let decimals = assetInfo.asset.params.decimals
          let mult = 10**decimals

          let quoteTotal = 0

          req.body.quote.forEach((account) => {
            quoteTotal += Number(account.sendAmountAtomic)
          })

          quoteTotal = Number(Math.ceil(quoteTotal) * mult)

          console.log(quoteTotal)

        const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)

        let params = await client.getTransactionParams().do()

        const DCAccount = algosdk.mnemonicToSecretKey(process.env.DC_WALLET)
    
        let appArgs = []
    
      
        appArgs.push(
          new Uint8Array(Buffer.from("send")),
          new Uint8Array(Buffer.from(req.body.note)),
        )
        
        let quote = req.body.quote
    
        let accounts = []
    
        let foreignAssets = [Number(req.body.sendAsset), Number(req.body.basedAsset)]
    
        let foreignApps = []
    
        let stxn
    
        let txns = []
        let signedTxns = []
    
        let tally = 0

        console.log(req.body.quote)
    
          while (quote.length > 0) {

            console.log(quote[0].sendAmount)
    
            appArgs.push(algosdk.encodeUint64(quote[0].sendAmount))
            accounts.push(quote[0].address)
            
            tally++
        
        
            if (tally % 4 == 0) {
              
              stxn = algosdk.makeApplicationNoOpTxn("762FFO2SIDJG2H7SXU5BQLQJ4Q5BQPGKKJGS2LEDQSJ7N5EMB2VVZMSMXM", params, req.body.contract, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined);
              txns.unshift(stxn)
             
              appArgs = []
              appArgs.push(
                new Uint8Array(Buffer.from("send")),
                new Uint8Array(Buffer.from(req.body.note)),
              )
              console.log(accounts)
              accounts = []
              if (txns.length > 15) {
                let txgroup = algosdk.assignGroupID(txns)
                let signedTxn
                txns.forEach((txn) => {
                  signedTxn = txn.signTxn(DCAccount.sk);
                  signedTxns.push(signedTxn)
                })
                const { txId } = await client.sendRawTransaction(signedTxns).do()
        
                let confirmedTxn = await algosdk.waitForConfirmation(client, txId, 4);
                
                txns = []
                signedTxns = []
              }
        
            }        

            quote.shift()
        
            }
        
            stxn = algosdk.makeApplicationNoOpTxn("762FFO2SIDJG2H7SXU5BQLQJ4Q5BQPGKKJGS2LEDQSJ7N5EMB2VVZMSMXM", params, req.body.contract, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined);
            txns.unshift(stxn)
        
            let txgroup = algosdk.assignGroupID(txns)
            let signedTxn
            txns.forEach((txn) => {
              signedTxn = txn.signTxn(DCAccount.sk);
              signedTxns.push(signedTxn)
            })
            const { txId } = await client.sendRawTransaction(signedTxns).do()
        
            let confirmedTxn = await algosdk.waitForConfirmation(client, txId, 4);

            res.json({res: "complete"})
            resolve()
            

            
        }
        catch(err) {
            console.log(err)
            console.log(quote)
            res.json({res: err})
            resolve()
        }

           
        
    })



    

   
}

export default sendAirdrop