import "dotenv/config"
import fs from "fs"
import algosdk from "algosdk"




//SMART CONTRACT DEPLOYMENT
  // declare application state storage (immutable)
  const localInts = 16;
  const localBytes = 0;
  const globalInts = 64; 
  const globalBytes = 0;

  const creatorMnemonic = process.env.CREATOR_MNEMONIC || ""

  // get accounts from mnemonic
  const originalMnemonic = process.env.LEGACY_DEPLOYER_MNEMONIC
  const userMnemonic = process.env.LEGACY_USER_MNEMONIC
  if (!originalMnemonic || !userMnemonic) {
    throw new Error("Set ORIGINAL_MNEMONIC/CREATOR_MNEMONIC and USER_MNEMONIC/DC_WALLET before running deployment.js")
  }
  const creatorAccount = algosdk.mnemonicToSecretKey(originalMnemonic)
  const userAccout =  algosdk.mnemonicToSecretKey(userMnemonic)

  const creatorSecret = creatorAccount.sk
  const creatorAddress = creatorAccount.addr
  const sender = userAccout.addr

  //Generate Account
  //const account = algosdk.generateAccount()
  //const secrekey = account.sk
  // const mnemonic = algosdk.secretKeyToMnemonic(secrekey)
  // console.log("mnemonic " + mnemonic )
  // console.log("address " + account.addr )

  // Connect your client
  const algodToken = "";
  const baseServer = 'https://node.algoexplorerapi.io/';
  const port = "";
  const headers ={"X-API-Key": ""}  
    
  //console.log(process.env) 
  const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)
  const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)
  const CONFIRMATION_WAIT_ROUNDS = 30

  const normalizeTxId = (value) => {
    if (!value) return ""
    return typeof value === "string" ? value : value.toString()
  }

  const getSendResultTxId = (sendResult, fallbackTxId = "") =>
    normalizeTxId(sendResult?.txid || sendResult?.txId || sendResult?.txID || sendResult?.id || fallbackTxId)

  const getConfirmedRound = (pendingInfo) =>
    pendingInfo?.confirmedRound ?? pendingInfo?.["confirmed-round"] ?? 0

  const getPoolError = (pendingInfo) =>
    pendingInfo?.poolError || pendingInfo?.["pool-error"] || ""


  // Read Teal File
  let approval_program = ''
  let clear_state_program = ''

  try {
    approval_program = fs.readFileSync(new URL("./vote_approval.teal", import.meta.url), 'utf8')
    clear_state_program = fs.readFileSync(new URL("./vote_clear_state.teal", import.meta.url), 'utf8')

    

  
    
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

// Rounds
const waitForRound = async (round) => {
  let last_round = await client.status().do()
  let lastRound = last_round['last-round']
  console.log("Waiting for round " + lastRound)
  while (lastRound < round) {
    lastRound +=1
  const block =  await client.statusAfterBlock(lastRound).do()
  console.log("Round " + block['last-round'])
  }
}

// convert 64 bit integer i to byte string
const intToBytes = (integer) => {
  return integer.toString()
}

//CREATE APP
// create unsigned transaction
const createApp = async (sender, 
  approvalProgram, clearProgram, 
  localInts, localBytes, globalInts, globalBytes, app_args, extraPages = 0) => {
    try{
      const onComplete = algosdk.OnApplicationComplete.NoOpOC;
      const extraPageCount = Number(extraPages);

      if (!Number.isInteger(extraPageCount) || extraPageCount < 0 || extraPageCount > 3) {
        throw new Error("extraPages must be an integer between 0 and 3");
      }

      let params = await client.getTransactionParams().do()
      params.fee = 1000;
      params.flatFee = true;
      
      console.log("suggestedparams" + params)

        let txn = algosdk.makeApplicationCreateTxnFromObject({
          sender,
          suggestedParams: params,
          onComplete,
          approvalProgram,
          clearProgram,
          numLocalInts: localInts,
          numLocalByteSlices: localBytes,
          numGlobalInts: globalInts,
          numGlobalByteSlices: globalBytes,
          appArgs: app_args,
          extraPages: extraPageCount,
        });
        let txId = txn.txID().toString();
        // Sign the transaction
        let signedTxn = txn.signTxn(creatorAccount.sk);
        console.log("Signed transaction with txID: %s", txId);
        
        // Submit the transaction
        const sendResult = await client.sendRawTransaction(signedTxn).do()
        txId = getSendResultTxId(sendResult, txId)
            // Wait for transaction to be confirmed
           let confirmedTxn = await algosdk.waitForConfirmation(client, txId, CONFIRMATION_WAIT_ROUNDS);
            console.log("confirmed" + confirmedTxn)

            //Get the completed Transaction
            console.log("Transaction " + txId + " confirmed in round " + getConfirmedRound(confirmedTxn));
            // display results
            let transactionResponse = await client.pendingTransactionInformation(txId).do()
            let appId = transactionResponse['application-index'];
            console.log("Created new app-id: ",appId);
            return appId;
      }catch(err){
      console.log("error: " + err)
    }
}

//OPTIN
// create unsigned transaction
const Optin = async (sender, index) => {
  try{
    let params = await client.getTransactionParams().do()
    params.fee = 1000;
    params.flatFee = true;

    let txn = algosdk.makeApplicationOptInTxnFromObject({
      sender,
      suggestedParams: params,
      appIndex: index,
    });
    let txId = txn.txID().toString();
    // sign, send, await
    // Sign the transaction
    let signedTxn = txn.signTxn(userAccout.sk);
    console.log("Signed transaction with txID: %s", txId);

    // Submit the transaction
    await client.sendRawTransaction(signedTxn).do()                           
        // Wait for transaction to be confirmed
       const confirmedTxn = await algosdk.waitForConfirmation(client, txId, 4);
        console.log("confirmed" + confirmedTxn)

        //Get the completed Transaction
        console.log("Transaction " + txId + " confirmed in round " + getConfirmedRound(confirmedTxn));
        // display results
    // display results
    let transactionResponse = await client.pendingTransactionInformation(txId).do();
    console.log("Opted-in to app-id:",transactionResponse['txn']['txn']['apid'])
  }catch(err){
    console.log(err)
  }
}




//READ STATE
// read local state of application from user account
const readLocalState = async (index) => {
  try{
    let accountInfoResponse = await client.accountInformation(userAccout.addr).do();
    let localState = accountInfoResponse['apps-local-state']
    return localState.map((item)=> {
      if(item['id'] == index){
        console.log("User's local state:" + item.id);
        let localStateItem = accountInfoResponse['apps-local-state'][item]['key-value']
        localStateItem.map((local) =>{
          console.log(local)
          return local
        })
      }
      return item
    })
  }catch(err){
    console.log(err)
  }
}


// read global state of application
const readGlobalState = async (index) => {
  try{
    let applicationInfoResponse = await client.getApplicationByID(index).do();
    let globalState = applicationInfoResponse['params']['global-state']
    return globalState.map((state) =>{
      return state
    })
  }catch(err){
    console.log(err)
  }
}

//UPDATE
// create unsigned transaction
const update = async (sender, index, approvalProgram, clearProgram) => {
  try{
    let params = await client.getTransactionParams().do()
    params.fee = 1000;
    params.flatFee = true;

  const txn = algosdk.makeApplicationUpdateTxnFromObject({
    sender,
    suggestedParams: params,
    appIndex: index,
    approvalProgram,
    clearProgram,
  });// sign, send, await

  let txId = txn.txID().toString();
  // Sign the transaction
  let signedTxn = txn.signTxn(creatorAccount.sk);
  console.log("Signed transaction with txID: %s", txId);

  // Submit the transaction
  const sendResult = await client.sendRawTransaction(signedTxn).do()
  txId = getSendResultTxId(sendResult, txId)
      // Wait for transaction to be confirmed
     const confirmedTxn = await algosdk.waitForConfirmation(client, txId, CONFIRMATION_WAIT_ROUNDS);
      console.log("confirmed" + confirmedTxn)

      //Get the completed Transaction
      console.log("Transaction " + txId + " confirmed in round " + getConfirmedRound(confirmedTxn));

  // display results
  let transactionResponse = await client.pendingTransactionInformation(txId).do();
  let appId = transactionResponse['txn']['txn'].apid;
  console.log("Updated app-id: ",appId);
  }catch(err){
    console.log(err)
  }
}


// CLOSE OUT
// create unsigned transaction
const  closeOut = async (sender, index) => {
  try{
    let params = await client.getTransactionParams().do()
    params.fee = 1000;
    params.flatFee = true;
    let txn = algosdk.makeApplicationCloseOutTxnFromObject({
      sender,
      suggestedParams: params,
      appIndex: index,
    })
  // sign, send, await
    let txId = txn.txID().toString();
      // Sign the transaction
      let signedTxn = txn.signTxn(userAccout.sk);
      console.log("Signed transaction with txID: %s", txId);

      // Submit the transaction
      await client.sendRawTransaction(signedTxn).do()                           
          // Wait for transaction to be confirmed
         const confirmedTxn = await algosdk.waitForConfirmation(client, txId, 4);
          console.log("confirmed" + confirmedTxn)

          //Get the completed Transaction
          console.log("Transaction " + txId + " confirmed in round " + getConfirmedRound(confirmedTxn));

      // display results
      let transactionResponse = await client.pendingTransactionInformation(txId).do();
      console.log("Closed out from app-id:",transactionResponse['txn']['txn']['apid'])
  }catch(err){
    console.log(err)
  }
}


//DELETE
// create unsigned transaction
const deleteApp = async (sender, index) => {
  try{
    let params = await client.getTransactionParams().do()
    params.fee = 1000;
    params.flatFee = true;
    let txn = algosdk.makeApplicationDeleteTxnFromObject({
      sender,
      suggestedParams: params,
      appIndex: index,
    });
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
          console.log("Transaction " + txId + " confirmed in round " + getConfirmedRound(confirmedTxn));

    // display results
    let transactionResponse = await client.pendingTransactionInformation(txId).do();
    let appId = transactionResponse['txn']['txn'].apid;
    console.log("Deleted app-id: ",appId);
  }catch(err){
    console.log(err)
  }
}


// CLEAR STATE
// create unsigned transaction
const clearState = async (sender, index) => {
  try{
    let params = await client.getTransactionParams().do()
    params.fee = 1000;
    params.flatFee = true;
  let txn = algosdk.makeApplicationClearStateTxnFromObject({
    sender,
    suggestedParams: params,
    appIndex: index,
  });
  let txId = txn.txID().toString();
  // sign, send, await
  let signedTxn = txn.signTxn(userAccout.sk);
    console.log("Signed transaction with txID: %s", txId);

    // Submit the transaction
    await client.sendRawTransaction(signedTxn).do()                           
        // Wait for transaction to be confirmed
       const confirmedTxn = await algosdk.waitForConfirmation(client, txId, 4);
        console.log("confirmed" + confirmedTxn)

        //Get the completed Transaction
        console.log("Transaction " + txId + " confirmed in round " + getConfirmedRound(confirmedTxn));
  // display results
  let transactionResponse = await client.pendingTransactionInformation(txId).do();
  let appId = transactionResponse['txn']['txn'].apid;
  console.log("Cleared local state for app-id: ",appId);
  }catch(err){
    console.log(err)
  }
}

const noopDC = async (address, amount)  => {

  

  try{

    
    const appArgs = []
    appArgs.push(
      new Uint8Array(Buffer.from("addboxDC")),
      algosdk.encodeUint64(amount)
      
      
    )
  let params = await client.getTransactionParams().do()

  const accounts = [address]
  const foreignApps = []
    
  const foreignAssets = []

  
  const pk = algosdk.decodeAddress(address);
  const addrArray = pk.publicKey
  console.log(addrArray);

  let accountBox = new Uint8Array([...addrArray, ...Buffer.from("DC")])
  console.log(accountBox)

  const boxes = [{appIndex: 0, name: accountBox}]

  
  let txn = algosdk.makeApplicationNoOpTxnFromObject({
    sender: creatorAddress,
    suggestedParams: params,
    appIndex: 1103370576,
    appArgs,
    accounts,
    foreignApps,
    foreignAssets,
    boxes,
  });

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
        console.log("Transaction " + txId + " confirmed in round " + getConfirmedRound(confirmedTxn));

  }catch(err){
    console.log(err)
  }
}

const opt = async (asset)  => {

  

  try{

    let appArgs = []
    appArgs.push(
      new Uint8Array(Buffer.from("optin"))
      
      
    )
  let params = await client.getTransactionParams().do()

  let accounts = []
  let foreignApps = []
    
  let foreignAssets = [asset]

  
  let txn = algosdk.makeApplicationNoOpTxnFromObject({
    sender: creatorAddress,
    suggestedParams: params,
    appIndex: 3339943603,
    appArgs,
    accounts,
    foreignApps,
    foreignAssets,
  });



  


    let signedTxn = txn.signTxn(creatorAccount.sk);
    

    let signed = [signedTxn]



    // Submit the transaction
    let sendResult = await client.sendRawTransaction(signed).do()
    let txId = getSendResultTxId(sendResult, txn.txID().toString())
        // Wait for transaction to be confirmed
       const confirmedTxn = await algosdk.waitForConfirmation(client, txId, 4);
        console.log("confirmed" + confirmedTxn)

        //Get the completed Transaction
        console.log("Transaction " + txId + " confirmed in round " + getConfirmedRound(confirmedTxn));

  }catch(err){
    console.log(err)
  }
}

const globaldel = async (address)  => {

  

  try{

    
    const appArgs = []
    appArgs.push(
      new Uint8Array(Buffer.from("globaldel")),
      new Uint8Array(Buffer.from(address))
      
      
    )
  let params = await client.getTransactionParams().do()


  const accounts = []
  const foreignApps = []
    
  const foreignAssets = []


  
  let txn = algosdk.makeApplicationNoOpTxnFromObject({
    sender: creatorAddress,
    suggestedParams: params,
    appIndex: 1053328572,
    appArgs,
    accounts,
    foreignApps,
    foreignAssets,
  });

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
        console.log("Transaction " + txId + " confirmed in round " + getConfirmedRound(confirmedTxn));

  }catch(err){
    console.log(err)
  }
}

//  CALL(NOOP)
// call application with arguments
const optin = async (sender, index, assetID)  => {

  

  try{

    
    const appArgs = []
    appArgs.push(
      new Uint8Array(Buffer.from("optin"))
      
      
    )
  let params = await client.getTransactionParams().do()

  const accounts = []
  const foreignApps = []
    
  const foreignAssets = [assetID]

  
  let txn = algosdk.makeApplicationNoOpTxnFromObject({
    sender,
    suggestedParams: params,
    appIndex: index,
    appArgs,
    accounts,
    foreignApps,
    foreignAssets,
  });

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
        console.log("Transaction " + txId + " confirmed in round " + getConfirmedRound(confirmedTxn));

  }catch(err){
    console.log(err)
  }
}

const delbox = async (address)  => {

  

  try{

    
    const appArgs = []
    appArgs.push(
      new Uint8Array(Buffer.from("delbox")),
      new Uint8Array(Buffer.from("DC"))
      
      
    )
  let params = await client.getTransactionParams().do()

  const accounts = [address]
  const foreignApps = []
    
  const foreignAssets = []

  
  const pk = algosdk.decodeAddress(address);
  const addrArray = pk.publicKey
  console.log(addrArray);

  let accountBox = new Uint8Array([...addrArray, ...Buffer.from("DC")])
  console.log(accountBox)

  const boxes = [{appIndex: 0, name: accountBox}]

  
  let txn = algosdk.makeApplicationNoOpTxnFromObject({
    sender: creatorAddress,
    suggestedParams: params,
    appIndex: 1103370576,
    appArgs,
    accounts,
    foreignApps,
    foreignAssets,
    boxes,
  });

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
        console.log("Transaction " + txId + " confirmed in round " + getConfirmedRound(confirmedTxn));

  }catch(err){
    console.log(err)
  }
}

const noop = async (sender, index)  => {

  

  try{

    
    const appArgs = []
    appArgs.push(
      new Uint8Array(Buffer.from("globaladd"))
      
      
    )
  let params = await client.getTransactionParams().do()

  const accounts = []
  const foreignApps = []
    
  const foreignAssets = []

  
  let txn = algosdk.makeApplicationNoOpTxnFromObject({
    sender,
    suggestedParams: params,
    appIndex: index,
    appArgs,
    accounts,
    foreignApps,
    foreignAssets,
  });

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
        console.log("Transaction " + txId + " confirmed in round " + getConfirmedRound(confirmedTxn));

  }catch(err){
    console.log(err)
  }
}

const pull = async (sender, index, assetIDs)  => {

  

  try{

    
    const appArgs = []
    appArgs.push(
      new Uint8Array(Buffer.from("send"))
      
      
    )
  let params = await client.getTransactionParams().do()

  const accounts = ["AL6F3TFPSZPF3BSVUFDNOLMEKUCJJAA7GZ5GF3DN3Q4IVJVNUFK76PQFNE"]
  const foreignApps = []
    
  const foreignAssets = assetIDs

  
  let txn = algosdk.makeApplicationNoOpTxnFromObject({
    sender,
    suggestedParams: params,
    appIndex: index,
    appArgs,
    accounts,
    foreignApps,
    foreignAssets,
  });

    let txId = txn.txID().toString();
    // Sign the transaction
    let signedTxn = txn.signTxn(creatorSecret);
    console.log("Signed transaction with txID: %s", txId);

    // Submit the transaction
    const sendResult = await client.sendRawTransaction(signedTxn).do()
    txId = getSendResultTxId(sendResult, txId)
        // Wait for transaction to be confirmed
       const confirmedTxn = await algosdk.waitForConfirmation(client, txId, 4);
        console.log("confirmed" + confirmedTxn)

        //Get the completed Transaction
        console.log("Transaction " + txId + " confirmed in round " + getConfirmedRound(confirmedTxn));

  }catch(err){
    console.log(err)
  }
}

const massOpt = async () => {

  let params = await client.getTransactionParams().do()

  // let contractAddress = algosdk.getApplicationAddress(1632253886)
  
  // console.log(contractAddress)
  
  // const accountAssets = await indexerClient.lookupAccountAssets(contractAddress).do();
  
  // let optedAssets = []
  
  // accountAssets.assets.forEach((asset) => {
  //   optedAssets.push(asset["asset-id"])
  // })
  
  // const address = "L6VIKAHGH4D7XNH3CYCWKWWOHYPS3WYQM6HMIPNBVSYZWPNQ6OTS5VERQY";
  // const accountCreatedAssets = await indexerClient.lookupAccountCreatedAssets(address).do();
  
  
  // console.log(optedAssets)
  
  let assetsNeed = [2311097574, 2311097577, 2311097583, 2311097585, 2311097589, 2311097594]
  
  
  // accountCreatedAssets.assets.forEach(async (asset) => {
  
  //   if (!optedAssets.includes(asset.index)) {
  //     assetsNeed.push(asset.index)
  //   }
  
  // })
  
  let txns = []
  let signedTxns = []
  
  console.log(assetsNeed)
  
  assetsNeed.forEach((asset) => {
    const appArgs = []
    appArgs.push(
      new Uint8Array(Buffer.from("optin"))
    )
  
    const accounts = []
    const foreignApps = []
      
    const foreignAssets = [asset]
  
    const boxes = []
    
    let atxn = algosdk.makeApplicationNoOpTxnFromObject({
      sender: creatorAddress,
      suggestedParams: params,
      appIndex: 1632253886,
      appArgs,
      accounts,
      foreignApps,
      foreignAssets,
      boxes,
    });
  
    txns.push(atxn)
    
  })
  
  console.log(txns.length)
  
  let txgroup = algosdk.assignGroupID(txns)
  let signedTxn
  txns.forEach((txn) => {
    signedTxn = txn.signTxn(creatorSecret);
    signedTxns.push(signedTxn)
  })
  const sendResult = await client.sendRawTransaction(signedTxns).do()
  const txId = getSendResultTxId(sendResult, txns[0]?.txID().toString())
  
  let confirmedTxn = await algosdk.waitForConfirmation(client, txId, 4);
  
  console.log(confirmedTxn)

}

const longToByteArray = (long) => {
  // we want to represent the input as a 8-bytes array
  var byteArray = [0, 0, 0, 0, 0, 0, 0, 0];

  for ( var index = byteArray.length - 1; index > 0; index -- ) {
      var byte = long & 0xff;
      byteArray [ index ] = byte;
      long = (long - byte) / 256 ;
  }

  return byteArray;
};

const byteArrayToLong = (byteArray) => {
  var value = 0;
  for ( var i = 0; i < byteArray.length; i++) {
      value = (value * 256) + byteArray[i];
  }

  return value;
};

const getHolders = async () => {

  const assetId = 1438913021;

  let assetTxns = await indexerClient.lookupAssetTransactions(assetId).limit(1000).do();

  let nextToken = assetTxns["next-token"]
  let numTxns = assetTxns.transactions.length

  let holderData = [{
    holder: '6JG62JUBUNWJYCSKXQHIKNGMZPFH7ZK2DO2COLY5FF3X3H26XRAJWNYUYQ',
    amount: 1000000000000
  }]

  assetTxns.transactions.forEach((txn) => {
    if (txn['tx-type'] == 'appl') {
      txn["inner-txns"].forEach((itxn) => {
        if (itxn['asset-transfer-transaction'] && itxn['asset-transfer-transaction']["asset-id"] == 1438913021 && itxn["confirmed-round"] < 44073639) {
          let txnObj = {
            sender: itxn.sender,
            receiver: itxn['asset-transfer-transaction'].receiver,
            amount: itxn['asset-transfer-transaction'].amount
          }
          let index = holderData.findIndex(x => x.holder === txnObj.receiver)
          if (index >= 0) {
            holderData[index].amount += txnObj.amount
          }
          else {
            holderData.push({
              holder: txnObj.receiver,
              amount: txnObj.amount
            })
          }
    
          let senderIndex = holderData.findIndex(x => x.holder === txnObj.sender)
          holderData[senderIndex].amount -= txnObj.amount
        }
       
      })
    }
    if (txn['tx-type'] == 'axfer' && txn["confirmed-round"] < 44073639) {
      let txnObj = {
        sender: txn.sender,
        receiver: txn['asset-transfer-transaction'].receiver,
        amount: txn['asset-transfer-transaction'].amount
      }
      let index = holderData.findIndex(x => x.holder === txnObj.receiver)
      if (index >= 0) {
        holderData[index].amount += txnObj.amount
      }
      else {
        holderData.push({
          holder: txnObj.receiver,
          amount: txnObj.amount
        })
      }

      let senderIndex = holderData.findIndex(x => x.holder === txnObj.sender)
      holderData[senderIndex].amount -= txnObj.amount

    }
  })


  while (numTxns > 500) {

    assetTxns = await indexerClient.lookupAssetTransactions(assetId).nextToken(nextToken).limit(1000).do();
    
    assetTxns.transactions.forEach((txn) => {
      if (txn['tx-type'] == 'appl') {
        txn["inner-txns"].forEach((itxn) => {
          if (itxn['asset-transfer-transaction'] && itxn['asset-transfer-transaction']["asset-id"] == 1438913021 && itxn["confirmed-round"] < 44073639) {
            let txnObj = {
              sender: itxn.sender,
              receiver: itxn['asset-transfer-transaction'].receiver,
              amount: itxn['asset-transfer-transaction'].amount
            }
            let index = holderData.findIndex(x => x.holder === txnObj.receiver)
            if (index >= 0) {
              holderData[index].amount += txnObj.amount
            }
            else {
              holderData.push({
                holder: txnObj.receiver,
                amount: txnObj.amount
              })
            }
      
            let senderIndex = holderData.findIndex(x => x.holder === txnObj.sender)
            holderData[senderIndex].amount -= txnObj.amount
          }
          
        })
      }
      if (txn['tx-type'] == 'axfer' && txn["confirmed-round"] < 44073639) {
        let txnObj = {
          sender: txn.sender,
          receiver: txn['asset-transfer-transaction'].receiver,
          amount: txn['asset-transfer-transaction'].amount
        }
        let index = holderData.findIndex(x => x.holder === txnObj.receiver)
        if (index >= 0) {
          holderData[index].amount += txnObj.amount
        }
        else {
          holderData.push({
            holder: txnObj.receiver,
            amount: txnObj.amount
          })
        }
  
        let senderIndex = holderData.findIndex(x => x.holder === txnObj.sender)
        holderData[senderIndex].amount -= txnObj.amount
      }
    })

    nextToken = assetTxns["next-token"]
    numTxns = assetTxns.transactions.length

    console.log(numTxns)

  }

  let holders = []

  holderData.forEach((holder) => {
    if (holder.amount != 0) {
      holders.push(holder)
    }
  })

  console.log(holders)

  let total = 0

  holders.forEach((holder) => {
    total += holder.amount
  })

  console.log(total)

  const writer = csvWriter({
    path: 'output.csv',
    header: [
      { id: 'holder', title: 'Holder' },
      { id: 'amount', title: 'Amount' }
    ]
  });
  
  writer.writeRecords(holders)
    .then(() => console.log('CSV file created successfully!'));



}

const updateMetadata = async () => {

  let appID = 1632253886;

  let nextToken

  let response = await indexerClient
        .searchForApplicationBoxes(appID)
        .limit(6)
        .do();

  console.log(response)

  let skin
  let champId
  let armour = 0
  let background = 0
  let extra = 0
  let head = 0
  let magic = 0
  let weapon = 0

  let count = 0

  while (count < 6) {

      console.log(byteArrayToLong(response.boxes[count].name.slice(0,8)))
      champId = byteArrayToLong(response.boxes[count].name.slice(0,8))
      console.log(String.fromCharCode(response.boxes[count].name[8]))
      

      let boxResponse = await indexerClient
        .lookupApplicationBoxByIDandName(appID, response.boxes[count].name)
        .do();
      let boxValue = boxResponse.value;

      console.log(byteArrayToLong(boxValue))

      if (String.fromCharCode(response.boxes[count].name[8]) == "A") {
        armour = byteArrayToLong(boxValue)
      }
      if (String.fromCharCode(response.boxes[count].name[8]) == "B") {
        background = byteArrayToLong(boxValue)
      }
      if (String.fromCharCode(response.boxes[count].name[8]) == "E") {
        extra = byteArrayToLong(boxValue)
      }
      if (String.fromCharCode(response.boxes[count].name[8]) == "H") {
        head = byteArrayToLong(boxValue)
      }
      if (String.fromCharCode(response.boxes[count].name[8]) == "M") {
        magic = byteArrayToLong(boxValue)
      }
      if (String.fromCharCode(response.boxes[count].name[8]) == "W") {
        weapon = byteArrayToLong(boxValue)
      }

      count++

  }

  let assetConfig = await indexerClient.lookupAssetTransactions(champId)
    .txType("acfg")
    .do();
              

  let charStats = atob(assetConfig.transactions[assetConfig.transactions.length - 1].note)

  let charObject = JSON.parse(charStats)

  let champInfo = await indexerClient.lookupAssetByID(champId).do();
  console.log(champInfo.asset.params)
  let champName = champInfo.asset.params.name
  let champReserve = champInfo.asset.params.reserve

  let armourName = "None"
  let backgroundName = "None"
  let extraName = "None"
  let headName = "None"
  let magicName = "None"
  let weaponName = "None"

  let skinName = "None"

  if (armour != 0) {
    let armourInfo = await indexerClient.lookupAssetByID(armour).do();
    armourName = armourInfo.asset.params.name
  }
  if (background != 0) {
    let backgroundInfo = await indexerClient.lookupAssetByID(background).do();
    console.log(backgroundInfo)
    backgroundName = backgroundInfo.asset.params.name
  }
  if (extra != 0) {
    let extraInfo = await indexerClient.lookupAssetByID(extra).do();
    extraName = extraInfo.asset.params.name
  }
  if (head != 0) {
    let headInfo = await indexerClient.lookupAssetByID(head).do();
    headName = headInfo.asset.params.name
  }
  if (magic != 0) {
    let magicInfo = await indexerClient.lookupAssetByID(magic).do();
    magicName = magicInfo.asset.params.name
  }
  if (weapon != 0) {
    let weaponInfo = await indexerClient.lookupAssetByID(weapon).do();
    weaponName = weaponInfo.asset.params.name
  }

  skinName = charObject.properties.Skin

  console.log(armourName, backgroundName, extraName, headName, magicName, weaponName, skinName)

  console.log(charObject)

  console.log(armour, background, extra, head, magic, weapon)

  let newMetadata = {
    standard: 'arc69',
    name: champName,
    description: 'Join the fray with Dark Coin Champions, an ARC19 series featuring swappable traits and integration into Dark Coin Arena! Engage in battles, ally against bosses, and ascend the leaderboard for rewards. Each champion boasts a base skin trait, plus swappable traits of armour, background, extra, head, magic, and weapon. Stay tuned for trait releases as separate collections. Collect, swap, and style your champion for battle supremacy or just to stand out.',
    properties: {
      Background: backgroundName,
      Skin: skinName,
      Weapon: weaponName,
      Magic: magicName,
      Head: headName,
      Armour: armourName,
      Extra: extraName
    }
  }
  
  let params = await client.getTransactionParams().do()

  let note = new Uint8Array(Buffer.from(JSON.stringify(newMetadata)))

  console.log(note)

  let txn = algosdk.makeAssetConfigTxnWithSuggestedParamsFromObject({
    sender: "L6VIKAHGH4D7XNH3CYCWKWWOHYPS3WYQM6HMIPNBVSYZWPNQ6OTS5VERQY",
    note,
    assetIndex: champId,
    manager: "L6VIKAHGH4D7XNH3CYCWKWWOHYPS3WYQM6HMIPNBVSYZWPNQ6OTS5VERQY",
    reserve: champReserve,
    freeze: undefined,
    clawback: undefined,
    suggestedParams: params,
    strictEmptyAddressChecking: false,
  });

  let txId = txn.txID().toString();

  console.log("hi")
  let warriorAccount = algosdk.mnemonicToSecretKey(process.env.WARRIOR_WALLET || "")

  let signedTxn = txn.signTxn(warriorAccount.sk);
  console.log("Signed transaction with txID: %s", txId);
  
  // Submit the transaction
  await client.sendRawTransaction(signedTxn).do()                           
      // Wait for transaction to be confirmed
  let confirmedTxn = await algosdk.waitForConfirmation(client, txId, 4);
  console.log("confirmed" + confirmedTxn)

  nextToken = response.nextToken

  while (nextToken) {

    let response = await indexerClient
        .searchForApplicationBoxes(appID)
        .nextToken(nextToken)
        .limit(6)
        .do();

    console.log(response)

    let skin
    let champId
    let armour = 0
    let background = 0
    let extra = 0
    let head = 0
    let magic = 0
    let weapon = 0

    let count = 0

    while (count < 6) {

        console.log(byteArrayToLong(response.boxes[count].name.slice(0,8)))
        champId = byteArrayToLong(response.boxes[count].name.slice(0,8))
        console.log(String.fromCharCode(response.boxes[count].name[8]))
        

        let boxResponse = await indexerClient
          .lookupApplicationBoxByIDandName(appID, response.boxes[count].name)
          .do();
        let boxValue = boxResponse.value;

        console.log(byteArrayToLong(boxValue))

        if (String.fromCharCode(response.boxes[count].name[8]) == "A") {
          armour = byteArrayToLong(boxValue)
        }
        if (String.fromCharCode(response.boxes[count].name[8]) == "B") {
          background = byteArrayToLong(boxValue)
        }
        if (String.fromCharCode(response.boxes[count].name[8]) == "E") {
          extra = byteArrayToLong(boxValue)
        }
        if (String.fromCharCode(response.boxes[count].name[8]) == "H") {
          head = byteArrayToLong(boxValue)
        }
        if (String.fromCharCode(response.boxes[count].name[8]) == "M") {
          magic = byteArrayToLong(boxValue)
        }
        if (String.fromCharCode(response.boxes[count].name[8]) == "W") {
          weapon = byteArrayToLong(boxValue)
        }

        count++

    }

    let assetConfig = await indexerClient.lookupAssetTransactions(champId)
      .txType("acfg")
      .do();
                

    let charStats = atob(assetConfig.transactions[assetConfig.transactions.length - 1].note)

    let charObject = JSON.parse(charStats)

    let champInfo = await indexerClient.lookupAssetByID(champId).do();
    console.log(champInfo.asset.params)
    let champName = champInfo.asset.params.name
    let champReserve = champInfo.asset.params.reserve

    let armourName = "None"
    let backgroundName = "None"
    let extraName = "None"
    let headName = "None"
    let magicName = "None"
    let weaponName = "None"

    let skinName = "None"

    if (armour != 0) {
      let armourInfo = await indexerClient.lookupAssetByID(armour).do();
      armourName = armourInfo.asset.params.name
    }
    if (background != 0) {
      let backgroundInfo = await indexerClient.lookupAssetByID(background).do();
      console.log(backgroundInfo)
      backgroundName = backgroundInfo.asset.params.name
    }
    if (extra != 0) {
      let extraInfo = await indexerClient.lookupAssetByID(extra).do();
      extraName = extraInfo.asset.params.name
    }
    if (head != 0) {
      let headInfo = await indexerClient.lookupAssetByID(head).do();
      headName = headInfo.asset.params.name
    }
    if (magic != 0) {
      let magicInfo = await indexerClient.lookupAssetByID(magic).do();
      magicName = magicInfo.asset.params.name
    }
    if (weapon != 0) {
      let weaponInfo = await indexerClient.lookupAssetByID(weapon).do();
      weaponName = weaponInfo.asset.params.name
    }

    skinName = charObject.properties.Skin

    console.log(armourName, backgroundName, extraName, headName, magicName, weaponName, skinName)

    console.log(charObject)

    console.log(armour, background, extra, head, magic, weapon)

    let newMetadata = {
      standard: 'arc69',
      name: champName,
      description: 'Join the fray with Dark Coin Champions, an ARC19 series featuring swappable traits and integration into Dark Coin Arena! Engage in battles, ally against bosses, and ascend the leaderboard for rewards. Each champion boasts a base skin trait, plus swappable traits of armour, background, extra, head, magic, and weapon. Stay tuned for trait releases as separate collections. Collect, swap, and style your champion for battle supremacy or just to stand out.',
      properties: {
        Background: backgroundName,
        Skin: skinName,
        Weapon: weaponName,
        Magic: magicName,
        Head: headName,
        Armour: armourName,
        Extra: extraName
      }
    }
    
    let params = await client.getTransactionParams().do()

    let note = new Uint8Array(Buffer.from(JSON.stringify(newMetadata)))

    console.log(note)

    let txn = algosdk.makeAssetConfigTxnWithSuggestedParamsFromObject({
      sender: "L6VIKAHGH4D7XNH3CYCWKWWOHYPS3WYQM6HMIPNBVSYZWPNQ6OTS5VERQY",
      note,
      assetIndex: champId,
      manager: "L6VIKAHGH4D7XNH3CYCWKWWOHYPS3WYQM6HMIPNBVSYZWPNQ6OTS5VERQY",
      reserve: champReserve,
      freeze: undefined,
      clawback: undefined,
      suggestedParams: params,
      strictEmptyAddressChecking: false,
    });

    let txId = txn.txID().toString();

    console.log("hi")
    let warriorAccount = algosdk.mnemonicToSecretKey(process.env.WARRIOR_WALLET || "")

    let signedTxn = txn.signTxn(warriorAccount.sk);
    console.log("Signed transaction with txID: %s", txId);
    
    // Submit the transaction
    await client.sendRawTransaction(signedTxn).do()                           
        // Wait for transaction to be confirmed
    let confirmedTxn = await algosdk.waitForConfirmation(client, txId, 4);
    console.log("confirmed" + confirmedTxn)

    nextToken = response.nextToken

  }

}

const champMeta = async () => {

  let appId = 1632253886

  let champId = 1559455005

  console.log(new Uint8Array(Buffer.from([...longToByteArray(champId), ...Buffer.from("A")])))

  let armour = 0
  let background = 0
  let extra = 0
  let head = 0
  let magic = 0
  let weapon = 0

  let boxResponseA = await indexerClient
    .lookupApplicationBoxByIDandName(appId, new Uint8Array(Buffer.from([...longToByteArray(champId), ...Buffer.from("A")])))
    .do();
  let boxValueA = boxResponseA.value;
  armour = byteArrayToLong(boxValueA)

  let boxResponseB = await indexerClient
    .lookupApplicationBoxByIDandName(appId, new Uint8Array(Buffer.from([...longToByteArray(champId), ...Buffer.from("B")])))
    .do();
  let boxValueB = boxResponseB.value;
  background = byteArrayToLong(boxValueB)

  let boxResponseE = await indexerClient
    .lookupApplicationBoxByIDandName(appId, new Uint8Array(Buffer.from([...longToByteArray(champId), ...Buffer.from("E")])))
    .do();
  let boxValueE = boxResponseE.value;
  extra = byteArrayToLong(boxValueE)

  let boxResponseH = await indexerClient
    .lookupApplicationBoxByIDandName(appId, new Uint8Array(Buffer.from([...longToByteArray(champId), ...Buffer.from("H")])))
    .do();
  let boxValueH = boxResponseH.value;
  head = byteArrayToLong(boxValueH)

  let boxResponseM = await indexerClient
    .lookupApplicationBoxByIDandName(appId, new Uint8Array(Buffer.from([...longToByteArray(champId), ...Buffer.from("M")])))
    .do();
  let boxValueM = boxResponseM.value;
  magic = byteArrayToLong(boxValueM)

  let boxResponseW = await indexerClient
    .lookupApplicationBoxByIDandName(appId, new Uint8Array(Buffer.from([...longToByteArray(champId), ...Buffer.from("W")])))
    .do();
  let boxValueW = boxResponseW.value;
  weapon = byteArrayToLong(boxValueW)

  let assetConfig = await indexerClient.lookupAssetTransactions(champId)
      .txType("acfg")
      .do();
                

  let charStats = atob(assetConfig.transactions[assetConfig.transactions.length - 1].note)

  let charObject = JSON.parse(charStats)
              

  let champInfo = await indexerClient.lookupAssetByID(champId).do();
  console.log(champInfo.asset.params)
  let champName = champInfo.asset.params.name
  let champReserve = champInfo.asset.params.reserve

  let armourName = "None"
  let backgroundName = "None"
  let extraName = "None"
  let headName = "None"
  let magicName = "None"
  let weaponName = "None"

  let skinName = "None"

  if (armour != 0) {
    let armourInfo = await indexerClient.lookupAssetByID(armour).do();
    armourName = armourInfo.asset.params.name
  }
  if (background != 0) {
    let backgroundInfo = await indexerClient.lookupAssetByID(background).do();
    console.log(backgroundInfo)
    backgroundName = backgroundInfo.asset.params.name
  }
  if (extra != 0) {
    let extraInfo = await indexerClient.lookupAssetByID(extra).do();
    extraName = extraInfo.asset.params.name
  }
  if (head != 0) {
    let headInfo = await indexerClient.lookupAssetByID(head).do();
    headName = headInfo.asset.params.name
  }
  if (magic != 0) {
    let magicInfo = await indexerClient.lookupAssetByID(magic).do();
    magicName = magicInfo.asset.params.name
  }
  if (weapon != 0) {
    let weaponInfo = await indexerClient.lookupAssetByID(weapon).do();
    weaponName = weaponInfo.asset.params.name
  }

  skinName = charObject.properties.Skin

  console.log(armourName, backgroundName, extraName, headName, magicName, weaponName, skinName)

  console.log(charObject)

  console.log(armour, background, extra, head, magic, weapon)

  let newMetadata = {
    standard: 'arc69',
    name: champName,
    description: 'Join the fray with Dark Coin Champions, an ARC19 series featuring swappable traits and integration into Dark Coin Arena! Engage in battles, ally against bosses, and ascend the leaderboard for rewards. Each champion boasts a base skin trait, plus swappable traits of armour, background, extra, head, magic, and weapon. Stay tuned for trait releases as separate collections. Collect, swap, and style your champion for battle supremacy or just to stand out.',
    properties: {
      Background: backgroundName,
      Skin: skinName,
      Weapon: weaponName,
      Magic: magicName,
      Head: headName,
      Armour: armourName,
      Extra: extraName
    }
  }

  console.log(newMetadata)
  
  let params = await client.getTransactionParams().do()

  let note = new Uint8Array(Buffer.from(JSON.stringify(newMetadata)))

  console.log(note)

  let txn = algosdk.makeAssetConfigTxnWithSuggestedParamsFromObject({
    sender: "L6VIKAHGH4D7XNH3CYCWKWWOHYPS3WYQM6HMIPNBVSYZWPNQ6OTS5VERQY",
    note,
    assetIndex: champId,
    manager: "L6VIKAHGH4D7XNH3CYCWKWWOHYPS3WYQM6HMIPNBVSYZWPNQ6OTS5VERQY",
    reserve: champReserve,
    freeze: undefined,
    clawback: undefined,
    suggestedParams: params,
    strictEmptyAddressChecking: false,
  });

  let txId = txn.txID().toString();

  console.log("hi")
  let warriorAccount = algosdk.mnemonicToSecretKey(process.env.WARRIOR_WALLET || "")

  let signedTxn = txn.signTxn(warriorAccount.sk);
  console.log("Signed transaction with txID: %s", txId);
  
  // Submit the transaction
  await client.sendRawTransaction(signedTxn).do()                           
      // Wait for transaction to be confirmed
  let confirmedTxn = await algosdk.waitForConfirmation(client, txId, 4);
  console.log("confirmed" + confirmedTxn)

}

let champIds = [
  1559026795, 1559031461, 1559040867, 1559049758,
  1559054409, 1559055010, 1559058287, 1559064006,
  1559067624, 1559077022, 1559077626, 1559095219,
  1559100966, 1559107400, 1559114829, 1559116827,
  1559119475, 1559119761, 1559123962, 1559124701,
  1559134952, 1559140254, 1559152966, 1559153777,
  1559155273, 1559158844, 1559164943, 1559166976,
  1559170896, 1559173025, 1559186156, 1559196422,
  1559199439, 1559202963, 1559208542, 1559229795,
  1559242749, 1559255582, 1559255932, 1559258156,
  1559262096, 1559263198, 1559263484, 1559264648,
  1559281793, 1559281855, 1559284181, 1559288976,
  1559293443, 1559302481, 1559322654, 1559329620,
  1559349463, 1559354305, 1559361294, 1559362402,
  1559365777, 1559382315, 1559385302, 1559443790,
  1559445184, 1559452761, 1559454930, 1559474855,
  1559521110
]



/* =================== CONFIG =================== */

const APP_ID = 1870514811;


// Mnemonic for admin address:
//  - must be creator for update/delete, and
//  - must be one of the allowed admin addresses for deleteCurrentCharacter:
//    "762FFO2SIDJG2H7SXU5BQLQJ4Q5BQPGKKJGS2LEDQSJ7N5EMB2VVZMSMXM"
//    or
//    "NSPLIQLVYV7US34UDYGYPZD7QGSHWND7AWSWPD4FTLRGW5IF2P2R3IF3EQ"
const ADMIN_MNEMONIC = originalMnemonic;
if (!ADMIN_MNEMONIC) {
  throw new Error('Set ADMIN_MNEMONIC in your .env file');
}

const adminAcct = algosdk.mnemonicToSecretKey(ADMIN_MNEMONIC);
const ADMIN_ADDR = adminAcct.addr;

console.log('Using admin address:', ADMIN_ADDR);

/* =================== HELPERS =================== */

function bytesToUint64BEToNumber(bytes) {
  if (bytes.length !== 8) {
    throw new Error('bytesToUint64BEToNumber expects exactly 8 bytes');
  }
  let v = 0n;
  for (const b of bytes) {
    v = (v << 8n) | BigInt(b);
  }
  const num = Number(v);
  if (!Number.isSafeInteger(num)) {
    throw new Error(`assetId ${v.toString()} is not a safe JS integer`);
  }
  return num;
}

async function waitForConfirmation(algod, txId, waitRounds = CONFIRMATION_WAIT_ROUNDS) {
  let status = await algod.status().do();
  let lastRound = Number(status.lastRound ?? status["last-round"] ?? 0);
  let waitedRounds = 0;

  while (waitedRounds < waitRounds) {
    let poolError = "";

    try {
      const pending = await algod.pendingTransactionInformation(txId).do();
      if (getConfirmedRound(pending) > 0) {
        return pending;
      }

      poolError = getPoolError(pending);
      if (poolError) {
        throw new Error(`Transaction rejected: ${poolError}`);
      }
    } catch (err) {
      if (poolError) throw err;
    }

    lastRound += 1;
    waitedRounds += 1;
    await algod.statusAfterBlock(lastRound).do();
  }

  throw new Error(`Transaction ${txId} not confirmed after ${waitRounds} rounds`);
}

/* =================== FETCH BOXES =================== */

async function getBoxesByLength(appId = APP_ID) {
  const eightByteBoxes = [];    // { assetId, nameBytes }
  const fifteenByteBoxes = [];  // { assetId, nameBytes }

  const limit = 1000;
  let nextToken = undefined;

  console.log(`Fetching boxes for app ${appId} from indexer...`);

  do {
    const res = await indexerClient
      .searchForApplicationBoxes(appId)
      .limit(limit)
      .nextToken(nextToken)
      .do();

    const boxes = res.boxes || [];

    for (const box of boxes) {
      const nameBytes = Buffer.from(box.name, 'base64');

      if (nameBytes.length === 8) {
        // name = Itob(assetId)
        const assetId = bytesToUint64BEToNumber(nameBytes);
        eightByteBoxes.push({ assetId, nameBytes });
      } else if (nameBytes.length === 15) {
        // name = Itob(assetId) + "current"
        const assetIdBytes = nameBytes.subarray(0, 8);
        const assetId = bytesToUint64BEToNumber(assetIdBytes);
        fifteenByteBoxes.push({ assetId, nameBytes });
      }
    }

    nextToken = res['next-token'];
  } while (nextToken);

  console.log(`Found ${eightByteBoxes.length} 8-byte boxes`);
  console.log(`Found ${fifteenByteBoxes.length} 15-byte boxes`);

  return { eightByteBoxes, fifteenByteBoxes };
}

/* =================== TX BUILDERS =================== */

async function sendDeleteCharacter(assetId, nameBytes8) {
  // This calls:
  //   Txn.application_args[0] == "deleteCharacter"
  // and contract uses:
  //   Txn.assets[0] == assetId
  //
  // It accesses boxes:
  //   Itob(assetId)
  //   Itob(assetId) + "current"
  // So we include both in `boxes`.

  const params = await client.getTransactionParams().do();

  const appArgs = [
    new Uint8Array(Buffer.from('deleteCharacter')),
  ];

  const boxes = [
    {
      appIndex: APP_ID,
      name: new Uint8Array(nameBytes8), // 8-byte box: Itob(assetId)
    },
    {
      appIndex: APP_ID,
      name: new Uint8Array(
        Buffer.concat([nameBytes8, Buffer.from('current')])
      ), // 15-byte box: Itob(assetId) + "current"
    },
  ];

  const txn = algosdk.makeApplicationNoOpTxnFromObject({
    sender: ADMIN_ADDR,
    appIndex: APP_ID,
    suggestedParams: params,
    appArgs,
    foreignAssets: [assetId],
    boxes,
  });

  const signedTxn = txn.signTxn(adminAcct.sk);
  const sendResult = await client.sendRawTransaction(signedTxn).do();
  const txId = getSendResultTxId(sendResult, txn.txID().toString());

  console.log(
    `deleteCharacter: asset ${assetId} (box name len 8) -> txId ${txId}`
  );

  await waitForConfirmation(client, txId);
  return txId;
}

async function sendDeleteCurrentCharacter(assetId, nameBytes15) {
  // This calls:
  //   Txn.application_args[0] == "deleteCurrentCharacter"
  // and contract uses:
  //   Txn.assets[0] == assetId
  //
  // It accesses box:
  //   Itob(assetId) + "current"
  // which is exactly this 15-byte name.

  const params = await client.getTransactionParams().do();

  const appArgs = [
    new Uint8Array(Buffer.from('deleteCurrentCharacter')),
  ];

  const boxes = [
    {
      appIndex: APP_ID,
      name: new Uint8Array(nameBytes15),
    },
  ];

  const txn = algosdk.makeApplicationNoOpTxnFromObject({
    sender: ADMIN_ADDR,
    appIndex: APP_ID,
    suggestedParams: params,
    appArgs,
    foreignAssets: [assetId],
    boxes,
  });

  const signedTxn = txn.signTxn(adminAcct.sk);
  const sendResult = await client.sendRawTransaction(signedTxn).do();
  const txId = getSendResultTxId(sendResult, txn.txID().toString());

  console.log(
    `deleteCurrentCharacter: asset ${assetId} (box name len 15) -> txId ${txId}`
  );

  await waitForConfirmation(client, txId);
  return txId;
}

/* =================== MAIN FLOW =================== */

async function deleteChars() {
  const { eightByteBoxes, fifteenByteBoxes } = await getBoxesByLength(APP_ID);

  console.log('--- Deleting 8-byte boxes via deleteCharacter ---');
  for (const { assetId, nameBytes } of eightByteBoxes) {
    try {
      await sendDeleteCharacter(assetId, nameBytes);
    } catch (e) {
      console.error(
        `Failed deleteCharacter for asset ${assetId}:`,
        e.message || e
      );
    }
  }

  console.log('--- Deleting 15-byte boxes via deleteCurrentCharacter ---');
  for (const { assetId, nameBytes } of fifteenByteBoxes) {
    try {
      await sendDeleteCurrentCharacter(assetId, nameBytes);
    } catch (e) {
      console.error(
        `Failed deleteCurrentCharacter for asset ${assetId}:`,
        e.message || e
      );
    }
  }

  console.log('Done.');
}


export async function getCreatedAssetsByWalletDesc(creatorWallet) {
  if (!creatorWallet) {
    throw new Error("creatorWallet is required")
  }

  const allAssets = []
  let nextToken = undefined

  do {
    let request = indexerClient
      .lookupAccountCreatedAssets(creatorWallet)
      .limit(1000)

    if (nextToken) {
      request = request.nextToken(nextToken)
    }

    const response = await request.do()

    allAssets.push(...(response.assets || []))
    nextToken = response["next-token"]
  } while (nextToken)

  return allAssets
    .sort((a, b) => {
      const roundDiff =
        Number(b["created-at-round"] || 0) -
        Number(a["created-at-round"] || 0)

      if (roundDiff !== 0) return roundDiff

      return Number(b.index || 0) - Number(a.index || 0)
    })
    .map((asset) => ({
      assetId: Number(asset.index),
      trait: asset.params?.name || "",
      type: "",
      total: Number(asset.params?.total || 0),
      effects: [""],
    }))
}


const TRAIT_ASSET_IDS = [
  3668457190, 3668457164, 3668457162, 3668457154,
  3668457152, 3668457150, 3668457146, 3668457144,
  3668457140, 3668457138, 3668457136,
];

const DEPTHS_APP_ID = 3658640544;
const DARK_COIN_ASSET_ID = 1088771340;
const DEPTHS_DARK_COIN_MIN_BALANCE = 200000;

function getDepthsCreatorAccount() {
  const mnemonic = process.env.CREATOR_MNEMONIC || process.env.DEPTHS_CREATOR_MNEMONIC;
  if (!mnemonic) {
    throw new Error("Set CREATOR_MNEMONIC in your .env file for Depths contract calls.");
  }
  return algosdk.mnemonicToSecretKey(mnemonic);
}

const chunk = (items, size) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) =>
    items.slice(i * size, i * size + size)
  );

export async function optContractIntoTraitAssets({
  algod,
  adminAccount,
  appId = 1632253886,
  assetIds = TRAIT_ASSET_IDS,
  batchSize = 16,
}) {
  const sender = adminAccount


  const appAddress = algosdk.getApplicationAddress(appId);
  console.log(`App account to fund/check: ${appAddress}`);

  const results = [];
  const appArgs = [new TextEncoder().encode("optin")];

  for (const ids of chunk(assetIds, batchSize)) {
    const suggestedParams = await client.getTransactionParams().do();

    // One outer app call + one inner asset-transfer opt-in per asset.
    const minFee = Number(suggestedParams.minFee ?? 1000);
    suggestedParams.flatFee = true;
    suggestedParams.fee = minFee * 2;

    console.log(adminAccount)

    const txns = ids.map((assetId) =>
      algosdk.makeApplicationNoOpTxnFromObject({
        sender: "NSPLIQLVYV7US34UDYGYPZD7QGSHWND7AWSWPD4FTLRGW5IF2P2R3IF3EQ",
        appIndex: appId,
        appArgs,
        foreignAssets: [assetId],
        suggestedParams,
      })
    );

    if (txns.length > 1) algosdk.assignGroupID(txns);

    const signed = txns.map((txn) => txn.signTxn(creatorAccount.sk));
    const sendResult = await client.sendRawTransaction(signed).do();
    const txid = getSendResultTxId(sendResult, txns[0].txID().toString());

    const confirmed = await algosdk.waitForConfirmation(client, txid, 4);

    results.push({
      assetIds: ids,
      txid,
      confirmedRound: getConfirmedRound(confirmed),
    });
  }

  return results;
}

export async function optDepthsContractIntoDarkCoin({
  appId = DEPTHS_APP_ID,
  assetId = DARK_COIN_ASSET_ID,
  account = null,
} = {}) {
  const signerAccount = account || getDepthsCreatorAccount();
  const sender = signerAccount.addr;
  const appAddress = algosdk.getApplicationAddress(appId);
  console.log(`Opting Depths app ${appId} (${appAddress}) into Dark Coin ${assetId}`);

  try {
    const assetLookup = await indexerClient
      .lookupAccountAssets(appAddress)
      .assetId(assetId)
      .includeAll(true)
      .do();

    if ((assetLookup.assets || []).some((asset) => Number(asset["asset-id"]) === Number(assetId))) {
      console.log(`Depths app ${appId} is already opted into Dark Coin ${assetId}`);
      return {
        appId,
        assetId,
        alreadyOptedIn: true,
      };
    }
  } catch (err) {
    console.log(`Could not verify existing opt-in, continuing with opt-in transaction: ${err.message || err}`);
  }

  let appBalance = 0;
  try {
    const appAccount = await client.accountInformation(appAddress).do();
    appBalance = Number(appAccount.amount ?? 0);
  } catch (err) {
    console.log(`Depths app account is not funded yet, funding from ${sender.toString()}`);
  }

  const fundingNeeded = Math.max(0, DEPTHS_DARK_COIN_MIN_BALANCE - appBalance);
  const txns = [];

  if (fundingNeeded > 0) {
    const paymentParams = await client.getTransactionParams().do();
    const paymentMinFee = Number(paymentParams.minFee ?? 1000);
    paymentParams.flatFee = true;
    paymentParams.fee = paymentMinFee;

    txns.push(
      algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender,
        receiver: appAddress,
        amount: fundingNeeded,
        suggestedParams: paymentParams,
      })
    );

    console.log(`Funding Depths app account with ${fundingNeeded} microAlgos`);
  }

  const appCallParams = await client.getTransactionParams().do();
  const appCallMinFee = Number(appCallParams.minFee ?? 1000);
  appCallParams.flatFee = true;
  appCallParams.fee = appCallMinFee * 2;

  txns.push(algosdk.makeApplicationNoOpTxnFromObject({
    sender,
    suggestedParams: appCallParams,
    appIndex: appId,
    appArgs: [new TextEncoder().encode("optin")],
    foreignAssets: [assetId],
  }));

  if (txns.length > 1) {
    algosdk.assignGroupID(txns);
  }

  const signedTxns = txns.map((txn) => txn.signTxn(signerAccount.sk));
  const sendResult = await client.sendRawTransaction(signedTxns).do();
  const txid = getSendResultTxId(sendResult, txns[txns.length - 1].txID().toString());
  console.log(`Depths Dark Coin opt-in submitted: ${txid}`);

  const confirmed = await algosdk.waitForConfirmation(client, txid, 4);
  console.log(
    `Depths Dark Coin opt-in confirmed in round ${getConfirmedRound(confirmed)}`
  );

  return {
    appId,
    assetId,
    txid,
    confirmedRound: getConfirmedRound(confirmed),
  };
}

const main = async () => {



  // await optContractIntoTraitAssets({ client, creatorAddress });


//   const wallet = "3SKDMKVJQD7RR62DMOIXVK3CQQWSFXAM2JXMIRDOPLIW4MWWPBWYV3NZ3Y"

// const assets = await getCreatedAssetsByWalletDesc(wallet)

// assets.forEach((asset) => {
//   console.log(`${JSON.stringify(asset)},`)
// })
  //opt(1088771340)
  
const approvalPogram = await compileProgram(client, approval_program)
const clearProgram = await compileProgram(client, clear_state_program )

// // configure registration and voting period
// //let status = await client.status().do()


// // create list of bytes for app args
let appArgs = [];
const marketExtraPages = 3;


// // create new application
// const appId = await createApp(
//   creatorAddress,
//   approvalPogram,
//   clearProgram,
//   localInts,
//   localBytes,
//   globalInts,
//   globalBytes,
//   appArgs,
//   marketExtraPages
// )

const updateId = await update(
  creatorAddress,
  3690496091,
  approvalPogram,
  clearProgram
)

//MNK42KGZKBB3JA6QYCPISL2LVYQNUUAZENFZRJL56FCV5E7Y6ZVIND7HGU

}

main()
