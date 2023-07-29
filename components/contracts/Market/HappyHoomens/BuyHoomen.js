import React from "react"

import algosdk from "algosdk"


import { PeraWalletConnect } from "@perawallet/connect";

const peraWallet = new PeraWalletConnect();

import { Card, Typography, Button } from "@mui/material"

import { CID } from 'multiformats/cid'


import * as mfsha2 from 'multiformats/hashes/sha2'
import * as digest from 'multiformats/hashes/digest'






export default class BuyHoomen extends React.Component { 

    constructor(props) {
        super(props);
        this.state = {
            nft: null,
            nftUrl: null,
            zoomNft: null,
            confirm: ""
            
        };
        this.BuyNft = this.BuyNft.bind(this)
        
    }

    async componentDidMount() {

      peraWallet.reconnectSession()
        .catch((error) => {
          // You MUST handle the reject because once the user closes the modal, peraWallet.connect() promise will be rejected.
          // For the async/await syntax you MUST use try/catch
          if (error?.data?.type !== "CONNECT_MODAL_CLOSED") {
              // log the necessary errors
              console.log(error)
          }
          });

          let response = await fetch('/api/getNft', {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                nftId: this.props.nftId
              }),
            
                
            });
        
        let session = await response.json()

          // let hoomenIPFS = ""

          // hoomensIPFS.forEach((hoomen) => {
          //   console.log(hoomen)
          //   if (hoomen[0] == this.props.nftId) {
          //     hoomenIPFS = hoomen[1]
          //   }
          // })

          //let addr = algosdk.decodeAddress(session.assets[0].params.reserve)

          const addr = algosdk.decodeAddress(session.assets[0].params.reserve)

          console.log(addr)

          const mhdigest = digest.create(mfsha2.sha256.code, addr.publicKey)
          console.log(mhdigest)

          console.log(Buffer.from(mhdigest.digest).toString('base64'))

          const cid = CID.create(1, 0x55, mhdigest)

          console.log(cid)

            await fetch("https://ipfs.io/ipfs/" + cid.toString())
            .then(async (response) => {
              let hoomenData = await response.json()
              let ipfs = hoomenData.image.substring(7)

              this.setState({
                nft: session.assets[0].params,
                nftUrl: "https://ipfs.io/ipfs/" + ipfs
            })
            })
        
          
      }

      async BuyNft(payAsset) {

        try {
        const token = {
          'X-API-Key': process.env.indexerKey
        }

        const client = new algosdk.Algodv2(token, 'https://mainnet-algorand.api.purestake.io/ps2', '')
      
        const indexerClient = new algosdk.Indexer(token, 'https://mainnet-algorand.api.purestake.io/idx2', '');

        let params = await client.getTransactionParams().do();

        let optedin = false

        let opted = await indexerClient.lookupAssetBalances(this.props.nftId).do();
        opted.balances.forEach((account) => {
          if(account.address == this.props.activeAddress) {
            optedin = true
          }
        })

        if (optedin) {

          if (this.props.cat == "Hoomens"){

            let txn1
            let txn2

            if (payAsset == "DC") {
              txn1 = algosdk.makeAssetTransferTxnWithSuggestedParams(
                this.props.activeAddress, 
                "II6ZZJFPVGXVGQOMDSZ3AXZEMX3UFRTXKBCQT7L25P3ON2SWJUFXOCRW2A", 
                undefined, 
                undefined,
                166250000000,  
                undefined, 
                1088771340, 
                params
              );
              txn2 = algosdk.makeAssetTransferTxnWithSuggestedParams(
                this.props.activeAddress, 
                "AL6F3TFPSZPF3BSVUFDNOLMEKUCJJAA7GZ5GF3DN3Q4IVJVNUFK76PQFNE", 
                undefined, 
                undefined,
                8750000000,  
                undefined, 
                1088771340, 
                params
              );
            }

            if (payAsset == "TRTS") {
              txn1 = algosdk.makeAssetTransferTxnWithSuggestedParams(
                this.props.activeAddress, 
                "II6ZZJFPVGXVGQOMDSZ3AXZEMX3UFRTXKBCQT7L25P3ON2SWJUFXOCRW2A", 
                undefined, 
                undefined,
                114000,  
                undefined, 
                1000870705, 
                params
              );
              txn2 = algosdk.makeAssetTransferTxnWithSuggestedParams(
                this.props.activeAddress, 
                "AL6F3TFPSZPF3BSVUFDNOLMEKUCJJAA7GZ5GF3DN3Q4IVJVNUFK76PQFNE", 
                undefined, 
                undefined,
                6000,  
                undefined, 
                1000870705, 
                params
              );
            }

            
            
              
              

            const appArgs = []
          appArgs.push(
            new Uint8Array(Buffer.from(this.props.cat)),
            new Uint8Array(Buffer.from(payAsset))
          )

          const accounts = []
          const foreignApps = undefined
            
          const foreignAssets = [this.props.nftId]
          
          let atxn = algosdk.makeApplicationNoOpTxn(this.props.activeAddress, params, this.props.contract, appArgs, accounts, foreignApps, foreignAssets);
          
          let txns = [txn1, txn2, atxn]

          let txgroup = algosdk.assignGroupID(txns)

          let multipleTxnGroups

          if (this.props.wallet == "pera") {

            multipleTxnGroups = [
              {txn: txn1, signers: [this.props.activeAddress]},
              {txn: txn2, signers: [this.props.activeAddress]},
              {txn: atxn, signers: [this.props.activeAddress]}
            ];

            const signedTxn = await peraWallet.signTransaction([multipleTxnGroups])

            this.setState({
              confirm: "Sending Transaction..."
            })

            let txId = await client.sendRawTransaction(signedTxn).do();

            let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);

            this.setState({
              confirm: "Transaction Confirmed, NFT Successfully Purchased"
            })


          }
          else if (this.props.wallet == "myalgo") {

            multipleTxnGroups = [
              txn1.toByte(),
              txn2.toByte(),
              atxn.toByte()
            ];

            const myAlgoWallet = new MyAlgo()

            const signedTxn = await myAlgoWallet.signTransaction(multipleTxnGroups);

            this.setState({
              confirm: "Sending Transaction..."
            })

            let txId = await client.sendRawTransaction([signedTxn[0].blob, signedTxn[1].blob, signedTxn[2].blob]).do();

            let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);

            this.setState({
              confirm: "Transaction Confirmed, NFT Successfully Purchased"
            })


          }

          }

          

        }

        else {

          let txn = algosdk.makeAssetTransferTxnWithSuggestedParams(
            this.props.activeAddress, 
            this.props.activeAddress, 
            undefined, 
            undefined,
            0,  
            undefined, 
            this.props.nftId, 
            params
          );

          const singleTxnGroups = [{txn: txn, signers: [this.props.activeAddress]}]

          if (this.props.wallet == "pera") {
            const signedTxn = await peraWallet.signTransaction([singleTxnGroups])

            this.setState({
              confirm: "Sending Transaction..."
            })

            let txId = await client.sendRawTransaction(signedTxn).do();

            let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);

            this.setState({
              confirm: "Transaction Confirmed, Asset Opted In"
            })


          }
          else if (this.props.wallet == "myalgo") {
            const myAlgoWallet = new MyAlgo()

            const signedTxn = await myAlgoWallet.signTransaction(txn.toByte());

            this.setState({
              confirm: "Sending Transaction..."
            })

            let txId = await client.sendRawTransaction(signedTxn.blob).do();

            let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);

            this.setState({
              confirm: "Transaction Confirmed, Asset Opted In"
            })


          }

        }

        }

        catch(error) {
          this.props.sendDiscordMessage("HappyHoomens/BuyHoomen", props.activeAddress, error)
        }

        

      
      }

   

    render() {

       

        if (this.props.zoom && this.state.nft && this.state.nftUrl) {
            return (
                
              <Card style={{backgroundColor: "black"}}>
                  <Button style={{display: "flex", margin: "auto"}} onClick={() => this.props.setNft(null)}>
                    <img style={{width: "100%", maxWidth: 500}} src={this.state.nftUrl} />
                  </Button>
                  <br />
                  <Typography color="secondary" align="center" variant="h4"> {this.state.nft.name} </Typography>
                  <br />
                  {this.props.activeAddress ?
                  <>
                  <Button variant="contained" color="secondary" style={{display: "flex", margin: "auto"}} onClick={() => this.BuyNft("DC")}>
                    <Typography  variant="h6"> Buy 175,000 </Typography>
                    <img src="invDC.svg" style={{display: "flex", margin: "auto", width: 50, padding: 10}} />
                  </Button>
                  <br />
                  <Typography align="center" color="secondary" variant="subtitle1"> or </Typography>
                  <br />
                  <Button variant="outlined" color="secondary" style={{display: "flex", margin: "auto"}} onClick={() => this.BuyNft("TRTS")}>
                    <Typography  variant="h6"> Buy 12,000 </Typography>
                    <img src="./Treats.svg" style={{display: "flex", margin: "auto", width: 50, padding: 10}} />
                  </Button>
                  </>
                  :
                  <Button onClick={() => window.scrollTo(0, 0)}>
                      <Typography  variant="h6"> Connect Wallet </Typography>
                  </Button>
                  }
                 
                  {this.state.confirm ? 
                    <>
                    <br />
                    <Typography color="secondary" align="center" variant="h6"> {this.state.confirm} </Typography>
                    

                    </>
                    :
                    null
                  }

              </Card>
                
               
            )
                
                
        }

        else if (this.state.nft) {
            return (
       
                    <Button  onClick={() => this.props.setNft(this.props.nftId)} >
                        <Typography style={{position: "absolute", top: 10, left: 10}} align="left" variant="caption"> {this.state.nft.name} </Typography>
                        <img style={{width: "100%"}} src={this.state.nftUrl} />
                    </Button>
                
    
            )
            
        }

        else {
            return (
                <div>                   
                </div>
    
            )
        }

        
       
        
    }
    
}