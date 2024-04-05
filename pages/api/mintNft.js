import NextCors from 'nextjs-cors';

import got from "got"

import algosdk from 'algosdk';


async function mintNft(req, res) {
   // Run the cors middleware
   // nextjs-cors uses the cors package, so we invite you to check the documentation https://github.com/expressjs/cors

   await NextCors(req, res, {
      // Options
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
      origin: '*',
      optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
   });

    return new Promise(async (resolve) => {

        console.log(req.body.txn)

        const restoredTxn = algosdk.decodeUnsignedTransaction(
            Buffer.from(req.body.txn, 'base64')
          );

        const warAccount =  algosdk.mnemonicToSecretKey(process.env.WARRIOR_WALLET)

        let signedTxn = restoredTxn.signTxn(warAccount.sk);
        
        const signedB64Txn = Buffer.from(signedTxn).toString('base64');

        res.json({ signedTxn: signedB64Txn })
        resolve()

     
    })
    

      
   
}

export default mintNft