
import algosdk from "algosdk"

import admin from "../../../Firebase/FirebaseAdmin.js"


async function storeJWT(req, res) {
   // Run the cors middleware
   // nextjs-cors uses the cors package, so we invite you to check the documentation https://github.com/expressjs/cors


 try{


  return new Promise(async (resolve) => {

    const userId = 'some-uid';

    getAuth()
    .createCustomToken(userId)
    .then((customToken) => {
        res.json({token: customToken})
        resolve()
    })
    .catch((error) => {
        console.log('Error creating custom token:', error);
        res.json({res: error})
    });
    
   
   })
  // ...

 }
 catch(err) {
  console.log(err)
  res.json({res: err})
  resolve()
 }
 
  

   
}

export default storeJWT