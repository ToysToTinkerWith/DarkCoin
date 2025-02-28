import React, {useState, useEffect} from "react"

import algosdk from "algosdk"


import { Typography, Button } from "@mui/material"

import Gift from "../../components/contracts/Tools/Gift"

import { useWallet } from '@txnlab/use-wallet'



export default function Mailbox(props) { 

  const { activeAccount, signTransactions, sendTransactions } = useWallet()
  

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
          if (encoded == activeAccount.address) {
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
          if (activeAccount) {
            fetchData();
          }  
            
    }, [activeAccount])

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
          if (encoded == activeAccount.address) {
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

      responseAddr = await indexerClient.lookupAccountAssets(activeAccount.address).do();
      nextTokenAddr = responseAddr["next-token"]
      
      responseAddr.assets.forEach((asset) => {
        if (asset.amount >= 0) {
          addrOptedAssets.push(asset["asset-id"])
        }
      })

      while (responseAddr.assets.length == 1000) {
        responseAddr = await indexerClient.lookupAccountAssets(activeAccount.address).nextToken(nextTokenAddr).limit(1000).do();
        nextTokenAddr = responseAddr["next-token"]
        responseAddr.assets.forEach((asset) => {
            if (asset.amount >= 0) {
              addrOptedAssets.push(asset["asset-id"])
            }
        })  
      }

      let opted = addrOptedAssets.includes(asset)

      let txns = []

      if (!opted) {

        let otxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
            activeAccount.address, 
            activeAccount.address, 
            undefined, 
            undefined,
            0,  
            undefined, 
            asset, 
            params
        );

        txns.push(otxn)

      }

        const appArgs = []
        appArgs.push(
          new Uint8Array(Buffer.from("acceptNFT"))              
          
        )

              
        const accounts = []
        const foreignApps = []
          
        const foreignAssets = [asset]
      
        
        const pk = algosdk.decodeAddress(activeAccount.address);
        const addrArray = pk.publicKey

        let encoded = algosdk.encodeUint64(asset);

      
        let accountBox = new Uint8Array([...addrArray, ...encoded])
        
        console.log(accountBox)
        const boxes = [{appIndex: 0, name: accountBox}]
      
        
        let txn = algosdk.makeApplicationNoOpTxn(activeAccount.address, params, props.contracts.mailbox, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);

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

        const { id } = await sendTransactions(signedTransactions)

        let confirmedTxn = await algosdk.waitForConfirmation(client, id, 4);

        props.setMessage("Transaction Confirmed, asset recieved.")

        await fetchData()
    
    }
    
    return (
        
      <div>
        <Typography align="center" color="secondary"> Account </Typography>
        {activeAccount ?
        <Typography align="center" color="secondary"> {activeAccount.address} </Typography>
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