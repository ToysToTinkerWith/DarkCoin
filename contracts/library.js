require('dotenv').config()
const fs = require('fs')
const algosdk = require('algosdk');

const https = require('https');

const PINATA_API_KEY = '6285c1c6058f708bf80e';
const PINATA_SECRET_API_KEY = '757e7c6352b6998c1cedf699faaaee4dcb176b1b23640591eb6a713af81fd020';

//SMART CONTRACT DEPLOYMENT
  // declare application state storage (immutable)
  const localInts = 0;
  const localBytes = 0;
  const globalInts = 0; 
  const globalBytes = 0;

  const creatorMnemonic = ""

  // get accounts from mnemonic
  // const creatorAccount = algosdk.mnemonicToSecretKey(creatorMnemonic)

  // const creatorSecret = creatorAccount.sk
  // const creatorAddress = creatorAccount.addr

  //Generate Account
  //const account = algosdk.generateAccount()
  //const secrekey = account.sk
  // const mnemonic = algosdk.secretKeyToMnemonic(secrekey)
  // console.log("mnemonic " + mnemonic )
  // console.log("address " + account.addr )
  
    
  //console.log(process.env) 
  const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)
  const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)


  // Read Teal File
  let approval_program = ''
  let clear_state_program = ''

  try {
    approval_program = fs.readFileSync('vote_approval.teal', 'utf8')
    clear_state_program = fs.readFileSync('vote_clear_state.teal', 'utf8')
    
    //console.log(approvalProgram)
    //console.log(clear_state_program)
  } catch (err) {
    console.error(err)
  }


  // Compile Program
  const compileProgram = async (client, programSource) => {
  let encoder = new TextEncoder();
  let programBytes = encoder.encode(programSource);
  let compileResponse = await client.compile(programBytes).do();
  let compiledBytes = new Uint8Array(Buffer.from(compileResponse.result, "base64"));
  // console.log(compileResponse)
  return compiledBytes;
}


//CREATE APP
const createApp = async (sender, 
  approvalProgram, clearProgram, 
  localInts, localBytes, globalInts, globalBytes, app_args) => {
    try{
      const onComplete = algosdk.OnApplicationComplete.NoOpOC;

      let params = await client.getTransactionParams().do()
      params.fee = 1000;
      params.flatFee = true;
      
      console.log("suggestedparams" + params)

        let txn = algosdk.makeApplicationCreateTxn(sender, params, onComplete, 
          approvalProgram, clearProgram, 
          localInts, localBytes, globalInts, globalBytes, app_args);
        let txId = txn.txID().toString();
        // Sign the transaction
        let signedTxn = txn.signTxn(creatorAccount.sk);
        console.log("Signed transaction with txID: %s", txId);
        
        // Submit the transaction
        await client.sendRawTransaction(signedTxn).do()                           
            // Wait for transaction to be confirmed
           let confirmedTxn = await algosdk.waitForConfirmation(client, txId, 4);
            console.log("confirmed" + confirmedTxn)

            //Get the completed Transaction
            console.log("Transaction " + txId + " confirmed in round " + confirmedTxn["confirmed-round"]);
            // display results
            let transactionResponse = await client.pendingTransactionInformation(txId).do()
            let appId = transactionResponse['application-index'];
            console.log("Created new app-id: ",appId);
      }catch(err){
      console.log("error: " + err)
    }
}

//UPDATE
const update = async (sender, index, approvalProgram, clearProgram) => {
  try{
    let params = await client.getTransactionParams().do()
    params.fee = 1000;
    params.flatFee = true;

  let txn = algosdk.makeApplicationUpdateTxn(sender, params, index, approvalProgram, clearProgram);
// sign, send, await
  let txId = txn.txID().toString();
  // Sign the transaction
  let signedTxn = txn.signTxn(creatorAccount.sk);
  console.log("Signed transaction with txID: %s", txId);

  // Submit the transaction
  await client.sendRawTransaction(signedTxn).do()                           
      // Wait for transaction to be confirmed
     const confirmedTxn = await algosdk.waitForConfirmation(client, txId, 4);
      console.log("confirmed" + confirmedTxn)

      //Get the completed Transaction
      console.log("Transaction " + txId + " confirmed in round " + confirmedTxn["confirmed-round"]);

  // display results
  let transactionResponse = await client.pendingTransactionInformation(txId).do();
  let appId = transactionResponse['txn']['txn'].apid;
  console.log("Updated app-id: ",appId);
  }catch(err){
    console.log(err)
  }
}


const noop = async (sender, index)  => {

  try{

    
    const appArgs = []
    appArgs.push(
      new Uint8Array(Buffer.from("appArgs"))
      
      
    )
  let params = await client.getTransactionParams().do()

  const accounts = []
  const foreignApps = []
    
  const foreignAssets = []

  let box = new Uint8Array(Buffer.from("DC"))

  const boxes = [{appIndex: 0, name: box}]

  
  let txn = algosdk.makeApplicationNoOpTxn(sender, params, index, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);

    let txId = txn.txID().toString();
    // Sign the transaction
    let signedTxn = txn.signTxn(creatorSecret);
    console.log("Signed transaction with txID: %s", txId);

    // Submit the transaction
    await client.sendRawTransaction(signedTxn).do()                           
        // Wait for transaction to be confirmed
       const confirmedTxn = await algosdk.waitForConfirmation(client, txId, 4);
        console.log("confirmed" + confirmedTxn)

        //Get the completed Transaction
        console.log("Transaction " + txId + " confirmed in round " + confirmedTxn["confirmed-round"]);

  }catch(err){
    console.log(err)
  }
}

function pinByCID(cid, fileName = 'myFile') {
  const data = JSON.stringify({
    hashToPin: cid,
    pinataMetadata: {
      name: fileName,
    },
  });

  const options = {
    hostname: 'api.pinata.cloud',
    path: '/pinning/pinByHash',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'pinata_api_key': PINATA_API_KEY,
      'pinata_secret_api_key': PINATA_SECRET_API_KEY,
      'Content-Length': Buffer.byteLength(data),
    },
  };

  const req = https.request(options, (res) => {
    let responseData = '';

    res.on('data', (chunk) => {
      responseData += chunk;
    });

    res.on('end', () => {
      console.log('Response:', JSON.parse(responseData));
    });
  });

  req.on('error', (e) => {
    console.error('Error:', e);
  });

  req.write(data);
  req.end();
}


const uploadIPFS = async ()  => {

  let createdAssets = await indexerClient.lookupAccountCreatedAssets("3G4PM64BTRW2X452WVYXKRZSD76Z4HR5E7YLGBIC7PWI67HNXMZKCAG2EM").limit(1000).do()

  console.log(createdAssets.assets.length)

  let cids = []

  createdAssets.assets.forEach(async (asset) => {

    //console.log(asset.params.url)

    let cid

    if (asset.params.url.slice(0,12) == "ipfs://ipfs/") {
      cid = asset.params.url.slice(12, 71)
    }
    else if (asset.params.url.slice(0,7) == "ipfs://") {
      if (asset.params.url[7] == "Q") {
        cid = asset.params.url.slice(7, 53)
      }
      else {
        cid = asset.params.url.slice(7, 66)
      }
    }

    console.log(cid)

    if (!cids.includes(cid)) {
      cids.push(cid)
    }

  })

  console.log(cids.length)

    // let assetConfig = await indexerClient.lookupAssetTransactions(asset.index)
    // .txType("acfg")
    // .do();

    // let properties = JSON.parse(atob(assetConfig.transactions[assetConfig.transactions.length - 1].note))

    cids.forEach((cid) => {
      pinByCID(cid, 'Shepventures');
    })

    

}


const main = async () => {

  uploadIPFS()

  
const approvalPogram = await compileProgram(client, approval_program)
const clearProgram = await compileProgram(client, clear_state_program )

// // configure registration and voting period
// //let status = await client.status().do()


// // create list of bytes for app args
//let appArgs = [];


// create new application
//const appId =  await createApp(creatorAddress, approvalPogram, clearProgram , localInts, localBytes, globalInts, globalBytes, appArgs)

// update application
//const updateId = await update(sender, 1053328572, approvalPogram, clearProgram)

}

main()