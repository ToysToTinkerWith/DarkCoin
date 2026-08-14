import React, {useState, useEffect} from "react"

import algosdk from "algosdk"


import { Typography, Button } from "@mui/material"

import Gift from "../../components/contracts/Tools/Gift"

import { useWallet } from '@txnlab/use-wallet-react'



export default function Mailbox(props) { 

  const {
      wallets,
      activeWallet,
      activeAddress,
      isReady,
      signTransactions,
      transactionSigner,
      algodClient,
  } = useWallet()  

  const [ confirm, setConfirm ] = useState("")

  const [ contract ] = useState(1103370576)

  const [ claimNFT, setClaimNFT ] = useState([])

  const [ NFT, setNFT ] = useState([])

  const byteArrayToLong = (byteArray) => {
    var value = 0;
    for ( var i = 0; i < byteArray.length; i++) {
        value = (value * 256) + byteArray[i];
    }

    return value;
  };



    useEffect(() => {


      const fetchData = async () => {

        const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)

        const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)

        setNFT([])

        const boxes = await indexerClient
       .searchForApplicationBoxes(props.contracts.mailbox)
       .do();

       let nfts = []

       boxes.boxes.forEach(async (box) => {
        if (box.name.length > 34) {
          let encoded = algosdk.encodeAddress(box.name.slice(0, 32))
          if (encoded == activeAddress) {
            console.log("herer")
            const nft = algosdk.decodeUint64(box.name.slice(32), 'safe');
            console.log(nft)
            let response = await client.getApplicationBoxByName(props.contracts.mailbox, box.name).do();
            console.log(response)
            const assetInfo = await indexerClient.lookupAssetByID(nft).do();
            let decimals = assetInfo.asset.params.decimals
            let div = 10**decimals
            let amount = byteArrayToLong(response.value) / div
            console.log(amount)
            nfts.push({assetId: nft, amount: amount})


          }
            
          }
       })

       console.log(nfts)

       setNFT(nfts)

          }
          if (activeAddress) {
            fetchData();
          }  
            
    }, [activeAddress])

    const fetchData = async () => {

      const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)

        const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)

        setNFT([])

        const boxes = await indexerClient
       .searchForApplicationBoxes(props.contracts.mailbox)
       .do();

       let nfts = []

       boxes.boxes.forEach(async (box) => {
        if (box.name.length > 34) {
          let encoded = algosdk.encodeAddress(box.name.slice(0, 32))
          if (encoded == activeAddress) {
            console.log("herer")
            const nft = algosdk.decodeUint64(box.name.slice(32), 'safe');
            console.log(nft)
            let response = await client.getApplicationBoxByName(props.contracts.mailbox, box.name).do();
            console.log(response)
            const assetInfo = await indexerClient.lookupAssetByID(nft).do();
            let decimals = assetInfo.asset.params.decimals
            let div = 10**decimals
            let amount = byteArrayToLong(response.value) / div
            console.log(amount)
            nfts.push({assetId: nft, amount: amount})


          }
            
          }
       })

       console.log(nfts)

       setNFT(nfts)

    }

    

    const AcceptNFT = async (asset) => {

      props.setMessage("Sign transaction...")

      const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)

      const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)

      let params = await client.getTransactionParams().do()

      let addrOptedAssets = []

      let responseAddr
      let nextTokenAddr

      responseAddr = await indexerClient.lookupAccountAssets(activeAddress).do();
      nextTokenAddr = responseAddr.nextToken
      
      responseAddr.assets.forEach((asset) => {
        if (Number(asset.amount) >= 0) {
          addrOptedAssets.push(Number(asset.assetId))
        }
      })

      while (responseAddr.assets.length == 1000) {
        responseAddr = await indexerClient.lookupAccountAssets(activeAddress).nextToken(nextTokenAddr).limit(1000).do();
        nextTokenAddr = responseAddr.nextToken
      
        responseAddr.assets.forEach((asset) => {
          if (Number(asset.amount) >= 0) {
            addrOptedAssets.push(Number(asset.assetId))
          }
        })
      }

      let opted = addrOptedAssets.includes(asset)

      let txns = []

      if (!opted) {

        const otxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          sender: activeAddress,
          receiver: activeAddress,
          amount: 0,
          assetIndex: asset,
          suggestedParams: params,

          // these were `undefined` in your positional call:
          // closeRemainderTo: undefined,
          // revocationTarget: undefined,
          // note: undefined,
        });


        txns.push(otxn)

      }

        const appArgs = []
        appArgs.push(
          new Uint8Array(Buffer.from("acceptNFT"))              
          
        )

              
        const accounts = []
        const foreignApps = []
          
        const foreignAssets = [asset]
      
        
        const pk = algosdk.decodeAddress(activeAddress);
        const addrArray = pk.publicKey

        let encoded = algosdk.encodeUint64(asset);

      
        let accountBox = new Uint8Array([...addrArray, ...encoded])
        
        console.log(accountBox)
        const boxes = [{appIndex: 0, name: accountBox}]
      
        
        const txn = algosdk.makeApplicationNoOpTxnFromObject({
          sender: activeAddress,
          suggestedParams: params,
          appIndex: props.contracts.mailbox,

          appArgs,
          accounts,
          foreignApps,
          foreignAssets,
          boxes,

          // these were `undefined` in your positional call:
          // note: undefined,
          // lease: undefined,
          // rekeyTo: undefined,
        });

        txns.push(txn)
        
        if (txns.length > 1) {
          let txgroup = algosdk.assignGroupID(txns)
        }
      
        let encodedTxns= []
          
        txns.forEach((txn) => {
            let encoded = algosdk.encodeUnsignedTransaction(txn)
            encodedTxns.push(encoded)
    
        })
    
        const signedTransactions = await signTransactions(encodedTxns)

        props.setMessage("Sending Transaction...")

        const { txid } = await client.sendRawTransaction(signedTransactions).do()

        let confirmedTxn = await algosdk.waitForConfirmation(client, txid, 4);

        props.setMessage("Transaction Confirmed, asset recieved.")

        await fetchData()
    
    }
    
    return (
        
      <div>
        <Typography align="center" color="secondary"> Account </Typography>
        {activeAddress ?
        <Typography align="center" color="secondary"> {activeAddress} </Typography>
        :
        null
        }
        <br />
        <Gift setMessage={props.setMessage} sendDiscordMessage={props.sendDiscordMessage}/>
        
        <Typography align="center" color="secondary"> {confirm} </Typography>

        <br />

        {NFT.length > 0 ?
          <Typography align="center" color="secondary"> Ready to claim </Typography>
          :
          null
        }
        

        {NFT.length > 0 ? 
        NFT.map((asset, index) => {
          return (
            <div key={index}>
          <br />
          
          <Button variant="text" color="secondary" style={{display: "flex", margin: "auto"}} href={"https://explorer.perawallet.app/asset/" + asset.assetId}>
            <Typography align="center" color="secondary" variant="subtitle1" > Asset {asset.assetId} </Typography>           
          </Button>
          <Typography align="center" color="secondary" variant="subtitle1" > Amount {asset.amount} </Typography>

          <br />
          <Button variant="contained" color="secondary" style={{display: "flex", margin: "auto"}} onClick={() => AcceptNFT(asset.assetId)}>
          <Typography align="center" color="primary" variant="h6" > Accept </Typography>

          </Button>
          </div>
          )
        })
        
        :
        null
        }
      <br />
      </div>
        
        
    )
                

    
}