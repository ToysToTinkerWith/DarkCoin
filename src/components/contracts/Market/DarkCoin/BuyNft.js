import React from "react"

import algosdk from "algosdk"

import MyAlgo from '@randlabs/myalgo-connect';


import { PeraWalletConnect } from "@perawallet/connect";

const peraWallet = new PeraWalletConnect();

import { Card, Typography, Button } from "@mui/material"

export default class BuyNft extends React.Component { 

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
        
        this.setState({
            nft: session.assets[0].params,
            nftUrl: "https://ipfs.dark-coin.io/ipfs/" + session.assets[0].params.url.slice(7)
        })
          
      }

      async BuyNft() {

        let client = new algosdk.Algodv2("", "https://node.algoexplorerapi.io/", "")

        const indexerClient = new algosdk.Indexer('', 'https://algoindexer.algoexplorerapi.io', '');

        let params = await client.getTransactionParams().do();

        let optedin = false

        let opted = await indexerClient.lookupAssetBalances(this.props.nftId).do();
        opted.balances.forEach((account) => {
          if(account.address == this.props.activeAddress) {
            optedin = true
          }
        })

        if (optedin) {

          let txn

          if (this.props.cat == "DAO"){
            txn = algosdk.makeAssetTransferTxnWithSuggestedParams(
              this.props.activeAddress, 
              "AL6F3TFPSZPF3BSVUFDNOLMEKUCJJAA7GZ5GF3DN3Q4IVJVNUFK76PQFNE", 
              undefined, 
              undefined,
              100000,  
              undefined, 
              601894079, 
              params
            );
          }

          else if (this.props.cat == "Warrior1"){
            txn = algosdk.makeAssetTransferTxnWithSuggestedParams(
              this.props.activeAddress, 
              "AL6F3TFPSZPF3BSVUFDNOLMEKUCJJAA7GZ5GF3DN3Q4IVJVNUFK76PQFNE", 
              undefined, 
              undefined,
              250000,  
              undefined, 
              601894079, 
              params
            );
          }

          else if (this.props.cat == "Warrior2"){
            txn = algosdk.makeAssetTransferTxnWithSuggestedParams(
              this.props.activeAddress, 
              "AL6F3TFPSZPF3BSVUFDNOLMEKUCJJAA7GZ5GF3DN3Q4IVJVNUFK76PQFNE", 
              undefined, 
              undefined,
              1250000,  
              undefined, 
              601894079, 
              params
            );
          }

          const appArgs = []
          appArgs.push(
            new Uint8Array(Buffer.from(this.props.cat))
          )

          const accounts = []
          const foreignApps = undefined
            
          const foreignAssets = [this.props.nftId]
          
          let atxn = algosdk.makeApplicationNoOpTxn(this.props.activeAddress, params, this.props.contract, appArgs, accounts, foreignApps, foreignAssets);
          
          let txns = [txn, atxn]

          let txgroup = algosdk.assignGroupID(txns)

          let multipleTxnGroups

          if (this.props.wallet == "pera") {

            multipleTxnGroups = [
              {txn: txn, signers: [this.props.activeAddress]},
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
              txn.toByte(),
              atxn.toByte()
            ];

            const myAlgoWallet = new MyAlgo()

            const signedTxn = await myAlgoWallet.signTransaction(multipleTxnGroups);

            this.setState({
              confirm: "Sending Transaction..."
            })

            let txId = await client.sendRawTransaction([signedTxn[0].blob, signedTxn[1].blob]).do();

            let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);

            this.setState({
              confirm: "Transaction Confirmed, NFT Successfully Purchased"
            })


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
                  <Button 
                  style={{display: "flex", margin: "auto", borderRadius: 15, backgroundColor: "white"}}
                  onClick={() => this.BuyNft()}>
                      <Typography variant="h6"> Buy </Typography>
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