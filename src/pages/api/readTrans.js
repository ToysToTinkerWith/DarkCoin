import NextCors from 'nextjs-cors';

const fs = require('fs');

import algosdk from "algosdk"

async function readTrans(req, res) {
   // Run the cors middleware
   // nextjs-cors uses the cors package, so we invite you to check the documentation https://github.com/expressjs/cors

   await NextCors(req, res, {
      // Options
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
      origin: '*',
      optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
   });

    //let read = algosdk.decodeSignedTransaction(Buffer.from(fs.readFileSync("./signed.stxn").toString(), "base64"))

    let receiver = ""

    let read = fs.readFileSync("./signed" + req.body.i.toString() + ".stxn", "utf-8")

    // if (read.split(/\r?\n/).length == 3) {
    //     read.split(/\r?\n/).forEach((line, index) =>  {
        
    //         if (index == 0) {
    //             trans = algosdk.decodeSignedTransaction(Buffer.from(line.toString(), "base64"))
    //         }
    //         else if (index == 1) {
    //             sender = line.toString()
    //         }
    //         else if (index == 2) {
    //             receiver = line.toString()
    //         }
            
    //       })

    // }

    
    
      
    
    res.json({
        receiver: read.toString()
    })
   
}

export default readTrans