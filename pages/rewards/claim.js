import React, {useState, useEffect} from "react"

import algosdk from "algosdk"


import { PeraWalletConnect } from "@perawallet/connect";

import { Typography, Button } from "@mui/material"

import Gift from "../../components/contracts/Rewards/Gift"



export default function Accept(props) { 

  const [ confirm, setConfirm ] = useState("")

  const [ contract ] = useState(1103370576)

  const [ claimDC, setClaimDC ] = useState(null)
  const [ claimLP, setClaimLP ] = useState(null)
  const [ claimNFT, setClaimNFT ] = useState([])


  const [ DC, setDC ] = useState(null)
  const [ LP, setLP ] = useState(null)
  const [ NFT, setNFT ] = useState([])



    useEffect(() => {


      const fetchData = async () => {

        const token = {
            'X-API-Key': process.env.indexerKey
        }

        const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)

        

        const accountAppLocalStates = await indexerClient.lookupAccountAppLocalStates(props.activeAddress).do();


        accountAppLocalStates["apps-local-states"].forEach((app) => {
          if (app.id == contract) {
            if (app["key-value"]) {
              app["key-value"].forEach((keyval) => {
                if (atob(keyval.key) == "DC") {
                  setClaimDC(keyval.value.uint)
                }
                else if (atob(keyval.key) == "LP") {
                  setClaimLP(keyval.value.uint)
                }
                else {
                 
                  let decode = algosdk.decodeUint64(Buffer.from(keyval.key, 'base64'))
                  setClaimNFT([...claimNFT, decode])

                }
                
              })
            }
            
          }
        })

        const accountAssets = await indexerClient.lookupAccountAssets("VQY34GYVYTD3Z5NNMSQGHCJTO6XA4URSFSCXOZOEFZSCNPSGLGA6Y72K6Y").do();


        setNFT([])

        const boxes = await indexerClient
       .searchForApplicationBoxes(1103370576)
       .do();


       boxes.boxes.forEach(async (box) => {
        if (box.name.length > 34) {
          let encoded = algosdk.encodeAddress(box.name.slice(0, 32))
          if (encoded == props.activeAddress) {
            const nft = algosdk.decodeUint64(box.name.slice(32), 'safe');
            setNFT([...NFT, nft])


          }
            
          }
       })
      
    const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)

        const pk = algosdk.decodeAddress(props.activeAddress);
        const addrArray = pk.publicKey
      
        let accountDC = new Uint8Array([...addrArray, ...Buffer.from("DC")])


        try {

        let accountBoxDC = await client.getApplicationBoxByName(1103370576, accountDC).do();
        var lengthDC = accountBoxDC.value.length;

        let bufferDC = Buffer.from(accountBoxDC.value);
        var resultDC = bufferDC.readUIntBE(0, lengthDC);

        setDC(resultDC)
        }
        catch(error) {
        }

        let accountLP = new Uint8Array([...addrArray, ...Buffer.from("LP")])

        try {

          let accountBoxLP = await client.getApplicationBoxByName(1103370576, accountLP).do();
          var lengthLP = accountBoxLP.value.length;
  
          let bufferLP = Buffer.from(accountBoxLP.value);
          var resultLP = bufferLP.readUIntBE(0, lengthLP);
    
          setLP(resultLP)
          }
          catch(error) {
          }

       

        

          }
          if (props.activeAddress) {
            fetchData();
          }  
            
        }, [props.activeAddress])

    const AcceptDC = async () => {

      let opted = false

      const token = {
        'X-API-Key': process.env.indexerKey
      }

      const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)

      const accountAppLocalStates = await indexerClient.lookupAccountAppLocalStates(props.activeAddress).do();

      accountAppLocalStates["apps-local-states"].forEach((app) => {
        if (app.id == contract) {
          opted = true
        }
      })


        const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)

      if (!opted) {
        try{

    
          const appArgs = []
          appArgs.push(
            new Uint8Array(Buffer.from("acceptDC"))              
            
          )
        let params = await client.getTransactionParams().do()
              
        const accounts = []
        const foreignApps = []
          
        const foreignAssets = []
      
        
        const pk = algosdk.decodeAddress(props.activeAddress);
        const addrArray = pk.publicKey
      
        let accountBox = new Uint8Array([...addrArray, ...Buffer.from("DC")])
      
        const boxes = [{appIndex: 0, name: accountBox}]
      
        
        let txn = algosdk.makeApplicationNoOpTxn(props.activeAddress, params, contract, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);

        let otxn = algosdk.makeApplicationOptInTxn(props.activeAddress, params, contract)
        
        let txns = [otxn, txn]

        let txgroup = algosdk.assignGroupID(txns)
      
        let multipleTxnGroups = [
          {txn: otxn, signers: [props.activeAddress]},
          {txn: txn, signers: [props.activeAddress]}
        ];

        if (props.wallet == "pera") {
          const signedTxn = await peraWallet.signTransaction([multipleTxnGroups])

          setConfirm("Sending Transaction...")

          let txId = await client.sendRawTransaction(signedTxn).do();

          let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);

          setConfirm("Transaction Confirmed, DARKCOIN Accepted.")

          setClaimDC(DC)

          setDC(null)


        }

             
      
        }catch(err){
          console.log(err)
        }
      }
      else {
        try{

    
          const appArgs = []
          appArgs.push(
            new Uint8Array(Buffer.from("acceptDC"))              
            
          )
        let params = await client.getTransactionParams().do()
              
        const accounts = []
        const foreignApps = []
          
        const foreignAssets = []
      
        
        const pk = algosdk.decodeAddress(props.activeAddress);
        const addrArray = pk.publicKey
      
        let accountBox = new Uint8Array([...addrArray, ...Buffer.from("DC")])
      
        const boxes = [{appIndex: 0, name: accountBox}]
      
        
        let txn = algosdk.makeApplicationNoOpTxn(props.activeAddress, params, contract, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
      
        const singleTxnGroups = [{txn: txn, signers: [props.activeAddress]}]

        if (props.wallet == "pera") {
          const signedTxn = await peraWallet.signTransaction([singleTxnGroups])

          setConfirm("Sending Transaction...")

          let txId = await client.sendRawTransaction(signedTxn).do();

          let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);

          setConfirm("Transaction Confirmed, DARKCOIN Accepted.")

          setClaimDC(DC)

          setDC(null)


        }

             
      
        }catch(err){
          console.log(err)
        }
      }


        
    
    }

    const AcceptLP = async () => {

      let opted = false

      const token = {
        'X-API-Key': process.env.indexerKey
      }

      const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)

      const accountAppLocalStates = await indexerClient.lookupAccountAppLocalStates(props.activeAddress).do();


      accountAppLocalStates["apps-local-states"].forEach((app) => {
        if (app.id == contract) {
          opted = true
        }
      })


    const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)

      if (!opted) {
        try{

    
          const appArgs = []
          appArgs.push(
            new Uint8Array(Buffer.from("acceptLP"))              
            
          )
        let params = await client.getTransactionParams().do()
              
        const accounts = []
        const foreignApps = []
          
        const foreignAssets = []
      
        
        const pk = algosdk.decodeAddress(props.activeAddress);
        const addrArray = pk.publicKey
      
        let accountBox = new Uint8Array([...addrArray, ...Buffer.from("LP")])
      
        const boxes = [{appIndex: 0, name: accountBox}]
      
        
        let txn = algosdk.makeApplicationNoOpTxn(props.activeAddress, params, contract, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);

        let otxn = algosdk.makeApplicationOptInTxn(props.activeAddress, params, contract)
        
        let txns = [otxn, txn]

        let txgroup = algosdk.assignGroupID(txns)
      
        let multipleTxnGroups = [
          {txn: otxn, signers: [props.activeAddress]},
          {txn: txn, signers: [props.activeAddress]}
        ];

        if (props.wallet == "pera") {
          const signedTxn = await peraWallet.signTransaction([multipleTxnGroups])

          setConfirm("Sending Transaction...")

          let txId = await client.sendRawTransaction(signedTxn).do();

          let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);

          setConfirm("Transaction Confirmed, LP Accepted.")

          setClaimLP(LP)

          setLP(null)


        }

             
      
        }catch(err){
          console.log(err)
        }
      }
      else {
        try{

    
          const appArgs = []
          appArgs.push(
            new Uint8Array(Buffer.from("acceptLP"))              
            
          )
        let params = await client.getTransactionParams().do()
              
        const accounts = []
        const foreignApps = []
          
        const foreignAssets = []
      
        
        const pk = algosdk.decodeAddress(props.activeAddress);
        const addrArray = pk.publicKey
      
        let accountBox = new Uint8Array([...addrArray, ...Buffer.from("LP")])
      
        const boxes = [{appIndex: 0, name: accountBox}]
      
        
        let txn = algosdk.makeApplicationNoOpTxn(props.activeAddress, params, contract, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
      
        const singleTxnGroups = [{txn: txn, signers: [props.activeAddress]}]

        if (props.wallet == "pera") {
          const signedTxn = await peraWallet.signTransaction([singleTxnGroups])

          setConfirm("Sending Transaction...")

          let txId = await client.sendRawTransaction(signedTxn).do();

          let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);

          setConfirm("Transaction Confirmed, LP Accepted.")

          setClaimLP(LP)

          setLP(null)


        }

             
      
        }catch(err){
          console.log(err)
        }
      }


        
    
    }

    const AcceptNFT = async (asset) => {

      let opted = false

      const token = {
        'X-API-Key': process.env.indexerKey
      }

      const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)

      const accountAppLocalStates = await indexerClient.lookupAccountAppLocalStates(props.activeAddress).do();

      accountAppLocalStates["apps-local-states"].forEach((app) => {
        if (app.id == contract) {
          opted = true
        }
      })



    const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)

      if (!opted) {
        try{

    
          const appArgs = []
          appArgs.push(
            new Uint8Array(Buffer.from("acceptNFT"))              
            
          )
        let params = await client.getTransactionParams().do()
              
        const accounts = []
        const foreignApps = []
          
        const foreignAssets = [asset]
      
        
        const pk = algosdk.decodeAddress(props.activeAddress);
        const addrArray = pk.publicKey

        let encoded = algosdk.encodeUint64(asset);

      
        let accountBox = new Uint8Array([...addrArray, ...encoded])
      
        const boxes = [{appIndex: 0, name: accountBox}]
      
        
        let txn = algosdk.makeApplicationNoOpTxn(props.activeAddress, params, contract, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);

        let otxn = algosdk.makeApplicationOptInTxn(props.activeAddress, params, contract)
        
        let txns = [otxn, txn]

        let txgroup = algosdk.assignGroupID(txns)
      
        let multipleTxnGroups = [
          {txn: otxn, signers: [props.activeAddress]},
          {txn: txn, signers: [props.activeAddress]}
        ];

        if (props.wallet == "pera") {
          const signedTxn = await peraWallet.signTransaction([multipleTxnGroups])

          setConfirm("Sending Transaction...")

          let txId = await client.sendRawTransaction(signedTxn).do();

          let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);

          setConfirm("Transaction Confirmed, " + asset + " Accepted.")

          setClaimLP(LP)

          setLP(null)


        }

             
      
        }catch(err){
          console.log(err)
        }
      }
      else {
        try{

    
          const appArgs = []
          appArgs.push(
            new Uint8Array(Buffer.from("acceptNFT"))              
            
          )
        let params = await client.getTransactionParams().do()
              
        const accounts = []
        const foreignApps = []
          
        const foreignAssets = [asset]
      
        
        const pk = algosdk.decodeAddress(props.activeAddress);
        const addrArray = pk.publicKey

        let encoded = algosdk.encodeUint64(asset);

      
        let accountBox = new Uint8Array([...addrArray, ...encoded])
      
        const boxes = [{appIndex: 0, name: accountBox}]
      
        
        let txn = algosdk.makeApplicationNoOpTxn(props.activeAddress, params, contract, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
      
        const singleTxnGroups = [{txn: txn, signers: [props.activeAddress]}]

        if (props.wallet == "pera") {
          const signedTxn = await peraWallet.signTransaction([singleTxnGroups])

          setConfirm("Sending Transaction...")

          let txId = await client.sendRawTransaction(signedTxn).do();

          let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);

          setConfirm("Transaction Confirmed, " + asset + " Accepted.")

          setClaimLP(LP)

          setLP(null)


        }

             
      
        }catch(err){
          console.log(err)
        }
      }


        
    
    }

    const Award = async () => {
      
      let optedDC = false
      let optedLP = false
      let optedNFT = []

      claimNFT.forEach((nft) => {
        optedNFT.push(false)
      })

      let txns = []
      let multipleTxnGroups = []

      

      try {

        const token = {
          'X-API-Key': process.env.indexerKey
        }

      const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)

      const accountAssets = await indexerClient.lookupAccountAssets(props.activeAddress).do();


      accountAssets.assets.forEach((asset) => {
        if (asset["asset-id"] == 1088771340) {
          optedDC = true
        }
        if (asset["asset-id"] == 1103290813) {
          optedLP = true
        }
        claimNFT.forEach((nft, index) => {
          if (asset["asset-id"] == nft) {
            optedNFT[index] = true
          }
        })
      })

     


    const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)
    
    let params = await client.getTransactionParams().do()

    if (claimNFT.length > 0) {
      claimNFT.forEach((nft, index) => {
        const appArgs = []
      appArgs.push(
        new Uint8Array(Buffer.from("awardNFT"))              
        
      )
            
      const accounts = []
      const foreignApps = []
        
      const foreignAssets = [nft]

      let ntxn = algosdk.makeApplicationNoOpTxn(props.activeAddress, params, contract, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined);

      txns.unshift(ntxn)

      multipleTxnGroups.unshift({txn: ntxn, signers: [props.activeAddress]})

      if (!optedNFT[index]) {
        let notxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
          props.activeAddress, 
          props.activeAddress, 
          undefined, 
          undefined,
          0,  
          undefined, 
          nft, 
          params
        );
  
        txns.unshift(notxn)
  
        multipleTxnGroups.unshift({txn: notxn, signers: [props.activeAddress]})

      }

      })
    }

    if (claimDC > 0) {
      const appArgs = []
      appArgs.push(
        new Uint8Array(Buffer.from("awardDC"))              
        
      )
            
      const accounts = []
      const foreignApps = []
        
      const foreignAssets = [1088771340]

      let dtxn = algosdk.makeApplicationNoOpTxn(props.activeAddress, params, contract, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined);

      txns.unshift(dtxn)

      multipleTxnGroups.unshift({txn: dtxn, signers: [props.activeAddress]})

      if (!optedDC) {
        let dotxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
          props.activeAddress, 
          props.activeAddress, 
          undefined, 
          undefined,
          0,  
          undefined, 
          1088771340, 
          params
        );
  
        txns.unshift(dotxn)
  
        multipleTxnGroups.unshift({txn: dotxn, signers: [props.activeAddress]})
  
      }

    }

    if (claimLP > 0) {
      const appArgs = []
      appArgs.push(
        new Uint8Array(Buffer.from("awardLP"))              
        
      )
            
      const accounts = []
      const foreignApps = []
        
      const foreignAssets = [1103290813]

      let ltxn = algosdk.makeApplicationNoOpTxn(props.activeAddress, params, contract, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined);

      txns.unshift(ltxn)
  
      multipleTxnGroups.unshift({txn: ltxn, signers: [props.activeAddress]})

      if (!optedLP) {
        let lotxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
          props.activeAddress, 
          props.activeAddress, 
          undefined, 
          undefined,
          0,  
          undefined, 
          1103290813, 
          params
        );
  
        txns.unshift(lotxn)
  
        multipleTxnGroups.unshift({txn: lotxn, signers: [props.activeAddress]})

    }
    }


    if (txns.length > 1) {
      let txgroup = algosdk.assignGroupID(txns)

    }


    if (props.wallet == "pera") {
      const signedTxn = await peraWallet.signTransaction([multipleTxnGroups])

      setConfirm("Sending Transaction...")

      let txId = await client.sendRawTransaction(signedTxn).do();

      let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);

      setConfirm("Transaction Confirmed, Assets Sent To Wallet.")

      setClaimDC(null)
      setClaimLP(null)


    }




      }
      catch (error) {
        console.log(error)
      }
    }
           

    
            return (
                
              <div>
                <Typography align="center" color="secondary"> Account </Typography>
                <Typography align="center" color="secondary"> {props.activeAddress} </Typography>
                <br />
                <Gift activeAddress={props.activeAddress} sendErrorMessage={props.sendErrorMessage}/>
                
                <Typography align="center" color="secondary"> {confirm} </Typography>

                <br />

                {DC || LP || NFT.length > 0 ?
                  <Typography align="center" color="secondary"> Is Owed </Typography>
                  :
                  null
                }
                
                {DC ? 
                <>
                <br />
                <Typography color="secondary" align="center" variant="h6"> 
                    <img style={{width: 50, paddingRight: 20}} src="./invDC.svg"/>
                    {(DC).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                </Typography>
                <br />
                <Button variant="contained" color="secondary" style={{display: "flex", margin: "auto"}} onClick={() => AcceptDC()}>
                <Typography align="center" color="primary" variant="h6" > Accept </Typography>

                </Button>
                </>
                :
                null
                }

                {LP ? 
                <>
                <br />
                <Typography color="secondary" align="center" variant="h6">
                  
                    <img style={{width: 50, paddingRight: 20}} src="./invDC.svg"/>
                    
                    {(LP).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " LP"}
                </Typography>

                <br />
                <Button variant="contained" color="secondary" style={{display: "flex", margin: "auto"}} onClick={() => AcceptLP()}>
                <Typography align="center" color="primary" variant="h6" > Accept </Typography>

                </Button>
                </>
                :
                null
                }

                {NFT.length > 0 ? 
                NFT.map((nft, index) => {
                  return (
                    <div key={index}>
                  <br />
                  
                  <Button variant="text" color="secondary" style={{display: "flex", margin: "auto"}} href={"https://algoexplorer.io/asset/" + nft}>
                    Asset {nft}
                     
                  </Button>

                  <br />
                  <Button variant="contained" color="secondary" style={{display: "flex", margin: "auto"}} onClick={() => AcceptNFT(nft)}>
                  <Typography align="center" color="primary" variant="h6" > Accept </Typography>

                  </Button>
                  </div>
                  )
                })
                
                :
                null
                }

                {claimDC || claimLP || claimNFT.length > 0 ? 
                <div style={{border: "1px solid white", margin: "5%", borderRadius: 15, padding: "5%"}}>
                  <Typography align="center" color="secondary" variant="h6" > Ready to claim </Typography>
                  <br />
                  {
                  claimDC > 0 ?
                  <Typography align="center" color="secondary" variant="h6" > 
                  <img style={{width: 50, paddingRight: 20}} src="./invDC.svg"/>
                    {(claimDC).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                  </Typography>
                  :
                  null
                  }
                  {
                  claimLP > 0 ?
                  <Typography align="center" color="secondary" variant="h6" > 
                  <img style={{width: 50, paddingRight: 20}} src="./invDC.svg"/>
                    {(claimLP).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " LP"}
                  </Typography>
                  :
                  null
                  }

                  {
                  claimNFT.length > 0 ?
                  claimNFT.map((nft, index) => {
                    return(
                      <div key={index}>
                       <br />
                  
                      <Button variant="text" color="secondary" style={{display: "flex", margin: "auto"}} href={"https://algoexplorer.io/asset/" + nft}>
                        Asset {nft}
                        
                      </Button>

                      <br />
                      </div>
                    )
                  })
                  
                  :
                  null
                  }
                 

                  <br />
                  <Button variant="contained" color="secondary" style={{display: "flex", margin: "auto"}} onClick={() => Award()}>
                    <Typography align="center" color="primary" variant="h6" > Send to wallet </Typography>
                  </Button>
                  
                  </div>
                :
                null
                }


                
                
              </div>
                
               
            )
                

    
}