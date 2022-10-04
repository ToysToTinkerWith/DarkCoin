import NextCors from 'nextjs-cors';

const fs = require('fs');

async function writeTrans(req, res) {
   // Run the cors middleware
   // nextjs-cors uses the cors package, so we invite you to check the documentation https://github.com/expressjs/cors

   await NextCors(req, res, {
      // Options
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
      origin: '*',
      optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
   });

    fs.writeFileSync("./signed" + req.body.queued5 + ".stxn", req.body.receiver.toString(), (err) => {
      if (err) {
         console.log(err);
         res.json("error", err);
      }
      else {
          res.json("write success");
      }
    })
   
}

export default writeTrans