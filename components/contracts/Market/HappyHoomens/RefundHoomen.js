import React from "react"

import algosdk from "algosdk"

import { PeraWalletConnect } from "@perawallet/connect";

const peraWallet = new PeraWalletConnect();

import { Card, Typography, Button } from "@mui/material"

import { CID } from 'multiformats/cid'

import * as mfsha2 from 'multiformats/hashes/sha2'
import * as digest from 'multiformats/hashes/digest'


export default class RefundHoomen extends React.Component { 

    constructor(props) {
        super(props);
        this.state = {
            nft: null,
            nftUrl: null,
            zoomNft: null,
            hoomens: [],
            loading: "",
            confirm: ""
            
        };
        this.Refund = this.Refund.bind(this)
        
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

          const addr = algosdk.decodeAddress(session.assets[0].params.reserve)

          const mhdigest = digest.create(mfsha2.sha256.code, addr.publicKey)

          const cid = CID.create(1, 0x55, mhdigest)
    

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

      async Refund() {

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
          if(account.address == "VI66S7AN2G4HKUD7DXJUSVEP54MDJ42NGDOUUD3LQJSCU7WT5UU2KAIHAU") {
            optedin = true
          }
        })

        if (optedin) {

          let htxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
            this.props.activeAddress, 
            "VI66S7AN2G4HKUD7DXJUSVEP54MDJ42NGDOUUD3LQJSCU7WT5UU2KAIHAU", 
            undefined, 
            undefined,
            1,  
            undefined, 
            this.props.nftId, 
            params
          );

          const appArgs = []
          appArgs.push(
            new Uint8Array(Buffer.from(this.props.cat))
          )

          const accounts = []
          const foreignApps = undefined
            
          const foreignAssets = [this.props.nftId, 1000870705]

          let atxn = algosdk.makeApplicationNoOpTxn(this.props.activeAddress, params, this.props.contract, appArgs, accounts, foreignApps, foreignAssets);

          let txns = [atxn, htxn]

          let txgroup = algosdk.assignGroupID(txns)

          let multipleTxnGroups

          if (this.props.wallet == "pera") {

            multipleTxnGroups = [
              {txn: atxn, signers: [this.props.activeAddress]},
              {txn: htxn, signers: [this.props.activeAddress]}
            ];

            const signedTxn = await peraWallet.signTransaction([multipleTxnGroups])

            this.setState({
              confirm: "Sending Transaction..."
            })

            let txId = await client.sendRawTransaction(signedTxn).do();

            let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);

            this.setState({
              confirm: "Transaction Confirmed, Successfully Refunded"
            })


          }
          else if (this.props.wallet == "myalgo") {
            const myAlgoWallet = new MyAlgo()

            multipleTxnGroups = [
              atxn.toByte(),
              htxn.toByte()
            ];

            const signedTxn = await myAlgoWallet.signTransaction(multipleTxnGroups);

            this.setState({
              confirm: "Sending Transaction..."
            })

            let txId = await client.sendRawTransaction([signedTxn[0].blob, signedTxn[1].blob]).do();

            let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);

            this.setState({
              confirm: "Transaction Confirmed, Successfully Refunded"
            })


          }

          

        }

        else {


          let ftxn = algosdk.makePaymentTxnWithSuggestedParams(
            this.props.activeAddress, 
            "VI66S7AN2G4HKUD7DXJUSVEP54MDJ42NGDOUUD3LQJSCU7WT5UU2KAIHAU", 
            100000, 
            undefined,
            undefined,
            params
          );

          const appArgs = []
          appArgs.push(
            new Uint8Array(Buffer.from(this.props.cat))

          )

          const accounts = []
          const foreignApps = undefined
            
          const foreignAssets = [this.props.nftId]

          let atxn = algosdk.makeApplicationNoOpTxn(this.props.activeAddress, params, this.props.contract, appArgs, accounts, foreignApps, foreignAssets);

          let txns = [atxn, ftxn]

          let txgroup = algosdk.assignGroupID(txns)

          let multipleTxnGroups

          if (this.props.wallet == "pera") {

            multipleTxnGroups = [
              {txn: atxn, signers: [this.props.activeAddress]},
              {txn: ftxn, signers: [this.props.activeAddress]}
            ];

            const signedTxn = await peraWallet.signTransaction([multipleTxnGroups])

            this.setState({
              confirm: "Sending Transaction..."
            })

            let txId = await client.sendRawTransaction(signedTxn).do();

            let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);

            this.setState({
              confirm: "Transaction Confirmed, Contract Opted In"
            })


          }
          else if (this.props.wallet == "myalgo") {
            const myAlgoWallet = new MyAlgo()

            multipleTxnGroups = [
              atxn.toByte(),
              ftxn.toByte()
            ];

            const signedTxn = await myAlgoWallet.signTransaction(multipleTxnGroups);

            this.setState({
              confirm: "Sending Transaction..."
            })

            let txId = await client.sendRawTransaction([signedTxn[0].blob, signedTxn[1].blob]).do();

            let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);

            this.setState({
              confirm: "Transaction Confirmed, Contract Opted In"
            })


          }

        }
        }

        catch(error) {
          this.props.sendDiscordMessage("HappyHoomens/RefundHoomen", props.activeAddress, error)
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
                  <Button variant="outlined" color="secondary" style={{display: "flex", margin: "auto"}} onClick={() => this.Refund()}>
                    <Typography  variant="h6"> Refund 8,400 </Typography>
                    <img src="./Treats.svg" style={{display: "flex", margin: "auto", width: 50, padding: 10}} />
                  </Button>
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