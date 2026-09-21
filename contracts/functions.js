require('dotenv').config()
const fs = require('fs')
const algosdk = require('algosdk');





//SMART CONTRACT DEPLOYMENT
  // declare application state storage (immutable)
  const localInts = 16;
  const localBytes = 0;
  const globalInts = 0; 
  const globalBytes = 0;

  // get accounts from mnemonic
  const creatorMnemonic = process.env.LEGACY_CREATOR_MNEMONIC
  const userMnemonic = process.env.LEGACY_USER_MNEMONIC
  const creatorAccount = algosdk.mnemonicToSecretKey(creatorMnemonic)
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
  let client = new algosdk.Algodv2(algodToken, baseServer, port, headers)


const noop = async (contract)  => {

  

  try{

    
    const appArgs = []
    appArgs.push(
      new Uint8Array(Buffer.from("pull"))
      
      
    )
  let params = await client.getTransactionParams().do()

  const accounts = []
  const foreignApps = []
    
  const foreignAssets = [1000870705]
  
  let txn = algosdk.makeApplicationNoOpTxn(creatorAddress, params, contract, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined);

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

  }catch(err){
    console.log(err)
  }
}

const optin = async (sender, index, assetID)  => {

  

  try{

    
    const appArgs = []
    appArgs.push(
      new Uint8Array(Buffer.from("opt"))
      
      
    )
  let params = await client.getTransactionParams().do()

  const accounts = []
  const foreignApps = []
    
  const foreignAssets = [assetID]

  
  let txn = algosdk.makeApplicationNoOpTxn(sender, params, index, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined);

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

const byteArrayToLong = (byteArray) => {
  var value = 0;
  for ( var i = 0; i < byteArray.length; i++) {
      value = (value * 256) + byteArray[i];
  }

  return value;
};

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

const main = async () => {

  // const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)
  // let params = await client.getTransactionParams().do()


  // let appArgs = []
    
  // appArgs.push(
  //   new Uint8Array(Buffer.from("pull")),
  //   algosdk.encodeUint64(3572936264591)
  // )
      
  // let accounts = ["VWYCYQ3H3PPNIGON4H363DIH7BP33TTZWUUUNMTDXCIHRCDPFOMU7VJ5HM"]

  // let foreignAssets = [1088771340]

  // let foreignApps = []

  // let txn = algosdk.makeApplicationNoOpTxn("NSPLIQLVYV7US34UDYGYPZD7QGSHWND7AWSWPD4FTLRGW5IF2P2R3IF3EQ", params, 1174019649, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined);

  // let signedTxn = txn.signTxn(creatorSecret);
  
  // const { txId } = await client.sendRawTransaction(signedTxn).do()

  // let confirmedTxn = await algosdk.waitForConfirmation(client, txId, 4);

  // console.log(confirmedTxn)

//const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)

// const address = "66YD7UICVBBL6QG2THOIOPRONTNPYNJ7EUAFRBY4PCKTVV6MQIMMYTAHFE";
// const accountTxns = await indexerClient.lookupAccountTransactions(address).limit(1000).do();

// console.log(accountTxns.transactions.length)

// accountTxns.transactions.forEach((txn) => {
//   console.log(txn)
// })

// const appId = 1174019649;
// const appLogs = await indexerClient.lookupApplications(appId).do();

// console.log(appLogs)

// const address = "CJE4GXRL5A2TNTPZC5M3UAUYI42E6WBS4L5PS3XNKWSRI5NPY3H65FDMEE";
// const accountTxns = await indexerClient.lookupAccountTransactions(address).do();

// accountTxns.transactions.forEach((txn) => {
//   console.log(txn["inner-txns"])
// })

const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)

const boxesResponse = await client.getApplicationBoxes(1870514811).do();

console.log(boxesResponse.boxes.length)

boxesResponse.boxes.forEach( async (box) => {

  console.log(box)

  if (box.name.length == 8) {

    let responseBox = await client.getApplicationBoxByName(1870514811, box.name).do();
    console.log(responseBox.value.length)

    if (responseBox.value.length != 32) {

    let params = await client.getTransactionParams().do()

    let appArgs = []
      
    appArgs.push(
      new Uint8Array(Buffer.from("deleteCharacter"))
    )
        
    let accounts = []

    let foreignAssets = [byteArrayToLong(box.name)]

    let foreignApps = []

    let boxes = [{appIndex: 0, name: box.name}, {appIndex: 0, name: box.name}, {appIndex: 0, name: box.name}, {appIndex: 0, name: box.name}]

    let txn = algosdk.makeApplicationNoOpTxn("NSPLIQLVYV7US34UDYGYPZD7QGSHWND7AWSWPD4FTLRGW5IF2P2R3IF3EQ", params, 1870514811, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);

    let signedTxn = txn.signTxn(creatorSecret);
    
    const { txId } = await client.sendRawTransaction(signedTxn).do()

    let confirmedTxn = await algosdk.waitForConfirmation(client, txId, 4);

    console.log(confirmedTxn)

  }

}
  



  // }
  // let responseBox = await client.getApplicationBoxByName(1397879621, box.name).do();
  //       let address = algosdk.encodeAddress(box.name)

  //       let value = byteArrayToLong(responseBox.value)
  //       console.log(address, value)
})

  //       const pk = algosdk.decodeAddress("FWRAERYWOLA4GLNJEUN2RGEYUQ6QGLNROWARIFJCVITTV6PRW2HKA4LXWM");
  //       const addrArray = pk.publicKey
      
  //       let accountDC = new Uint8Array([...addrArray, ...Buffer.from("DC")])


  //       let accountBoxDC = await client.getApplicationBoxByName(1103370576, accountDC).do();

  //       console.log(accountBoxDC)
  //       var lengthDC = accountBoxDC.value.length;
  //       console.log(lengthDC)


  //       let bufferDC = Buffer.from(accountBoxDC.value);
  //       console.log(bufferDC)

  //       var resultDC = bufferDC.readUIntBE(4, lengthDC);

  //       console.log(resultDC)
        

  //       let accountLP = new Uint8Array([...addrArray, ...Buffer.from("LP")])

      

  //         let accountBoxLP = await client.getApplicationBoxByName(1103370576, accountLP).do();
  //         var lengthLP = accountBoxLP.value.length;
  
  //         let bufferLP = Buffer.from(accountBoxLP.value);
  //         var resultLP = bufferLP.readUIntBE(0, lengthLP);
    
  //         console.log(resultLP)
         


  // const fs = require('fs');
  // const allContents = fs.readFileSync('../accounts.txt', 'utf-8');
  // let totalDC = 0
  // allContents.split(/\r?\n/).forEach(async (line) => {
    
  //   let values = line.split(" ")

    

  //   if (Number(values[1]) > 0) {
  //     console.log(Number(values[1]))
  //     totalDC += Number(values[1])
  //   }
    
  //   await optin(creatorAddress, 1035432580, Number(line))

  // })


// let itemsRes = await fetch('https://csgofloat.com/api/v1/listings?type=buy_now&limit=100&max_price=1000', {
//   method: "GET",
//   headers: {
//       'Authorization': 'Basic CuhUsBHFXkIdJNyu5PBrbylMfTBlIF5I',
//       "Content-Type": "application/json",
//   },
  
  
      
//   });

// let items = await itemsRes.json()

// console.log(items)

// let namesArr = []

// items.forEach((item) => {
//   namesArr.push(item.item.market_hash_name)
// })

// const { default: open } = await import('open');



// namesArr.forEach( async (name) => {

//   console.log(name)


 
// })

// let response = await fetch('https://csgofloat.com/api/v1/listings?type=buy_now&sort_by=float_rank&max_price=1600&limit=50', {
//   method: "GET",
//   headers: {
//       'Authorization': 'Basic CuhUsBHFXkIdJNyu5PBrbylMfTBlIF5I',
//       "Content-Type": "application/json",
//   },
  
  
      
//   });

// let session = await response.json()

// const { default: open } = await import('open');

// console.log(session[1])

// session.forEach(async (item) => {
//   await open("https://csgofloat.com/item/" + item.id)
//   // if (item.item.badges && !item.item.is_souvenir){
    
//   // }
//   // if (item.item.scm.price - item.price > -200){
    
//   // }
  
//   // await open("https://csgofloat.com/item/" + item.id)

//   // if (item.item.badges && !item.item.is_souvenir){
//   //   await open("https://csgofloat.com/item/" + item.id)
//   // }
  
// })

// let response = await fetch('https://dark-coin.com/api/ASAblasters/reward', {
//   method: "POST",
//   headers: {
//     "Content-Type": "application/json",
//     "origin": "https://dark-coin.com",
//     "Authorization": "Bearer [use PINATA_JWT from the environment]"

//   },
//   body: JSON.stringify({
//       totalScore: 10,
//       address: "VWYCYQ3H3PPNIGON4H363DIH7BP33TTZWUUUNMTDXCIHRCDPFOMU7VJ5HM",
//       contract: 1434284594,
//       assetScores: {DARKCOIN: 0.1},
//       assetDec: {DARKCOIN: 6},
//       assetIds: {DARKCOIN: 1088771340},
//       assetValues: {
//         AO: 0, 
//         chip: 0, 
//         DARKCOIN: 10, 
//         Gold: 0, 
//         GoldDAO: 0, 
//         META: 0, 
//         PRSMS: 0, 
//         Tacos: 0, 
//         THC: 0, 
//         TRTS: 0, 
//         Vote: 0, 
//         YARN: 0
//       }
//   }),
  
    
// });

// let session = await response.json()

// console.log(session.res)




  

}

main()