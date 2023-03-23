import React from "react"

import algosdk from "algosdk"

import { Typography, Button } from "@mui/material"

import MyAlgo from '@randlabs/myalgo-connect';

import { PeraWalletConnect } from "@perawallet/connect";

const peraWallet = new PeraWalletConnect();


export default class DisplayChar extends React.Component { 

    constructor(props) {
        super(props);
        this.state = {
            nft: null,
            nftUrl: null,
            svg: null,
            message: ""
            
        };
        this.chooseCharacter = this.chooseCharacter.bind(this)

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

        let charStats = null

        if (this.props.zoom) {
            const token = {
                'X-API-Key': process.env.indexerKey
            }
          
            const indexerClient = new algosdk.Indexer(token, 'https://mainnet-algorand.api.purestake.io/idx2', '');
    
            let assetConfig = await indexerClient.lookupAssetTransactions(this.props.nftId)
            .txType("acfg")
            .do();

            charStats = atob(assetConfig.transactions[0].note)
        }
        
        this.setState({
            nft: session.assets[0].params,
            nftUrl: "https://ipfs.io/ipfs/" + session.assets[0].params.url.slice(34),
            charStats: charStats
        })
          
      }

      async chooseCharacter() {

        const indexerClient = new algosdk.Indexer('', 'https://algoindexer.algoexplorerapi.io', '');

        let optedin = false

        let response = await indexerClient.lookupAccountAppLocalStates(this.props.activeAddress).do();
        response["apps-local-states"].forEach((localstate) => {
            if (localstate.id == this.props.contract) {
                optedin = true
            }
        })

        let client = new algosdk.Algodv2("", "https://node.algoexplorerapi.io/", "")
        
        let params = await client.getTransactionParams().do()

        const appArgs = []
        

        const accounts = []
        const foreignApps = []
            
        const foreignAssets = [this.props.nftId]

        const boxes = []

        if (optedin) {

            appArgs.push(
                new Uint8Array(Buffer.from("select")),
                new Uint8Array(Buffer.from(this.state.nft.name))
            )

            let txn = algosdk.makeApplicationNoOpTxn(this.props.activeAddress, params, this.props.contract, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
            const singleTxnGroups = [{txn: txn, signers: [this.props.activeAddress]}]

            if (this.props.wallet == "pera") {
                const signedTxn = await peraWallet.signTransaction([singleTxnGroups])
                this.setState({message: "Sending Transaction..."})


                let txId = await client.sendRawTransaction(signedTxn).do();

                let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);        


                this.setState({message: "Transaction Confirmed, Character Successfully Chosen."})

            }
            else if (this.props.wallet == "myalgo") {
                
                const myAlgoWallet = new MyAlgo()

                const signedTxn = await myAlgoWallet.signTransaction(txn.toByte());

                this.setState({message: "Sending Transaction..."})


                let txId = await client.sendRawTransaction(signedTxn.blob).do();

                let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);        


                this.setState({message: "Transaction Confirmed, Character Successfully Chosen."})
            }

        }

        else {

            appArgs.push(

                new Uint8Array(Buffer.from(this.state.nft.name))
            )

            let txn = algosdk.makeApplicationOptInTxn(this.props.activeAddress, params, this.props.contract, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
            const singleTxnGroups = [{txn: txn, signers: [this.props.activeAddress]}]

            if (this.props.wallet == "pera") {
                const signedTxn = await peraWallet.signTransaction([singleTxnGroups])
                this.setState({message: "Sending Transaction..."})


                let txId = await client.sendRawTransaction(signedTxn).do();

                let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);        


                this.setState({message: "Transaction Confirmed, Character Successfully Chosen."})

            }
            else if (this.props.wallet == "myalgo") {
                const myAlgoWallet = new MyAlgo()

                const signedTxn = await myAlgoWallet.signTransaction(txn.toByte());
                this.setState({message: "Sending Transaction..."})


                let txId = await client.sendRawTransaction(signedTxn.blob).do();

                let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);        


                this.setState({message: "Transaction Confirmed, Character Successfully Chosen."})
            }
        }
        



      }


    render() {

        if (this.state.nft) {
            if (this.props.zoom) {

               

                return (
                    <div >
                            <Typography color="secondary" align="center" style={{margin: 20}} variant="h6"> {this.state.nft.name} </Typography>

                        <Button style={{display: "flex", margin: "auto"}} onClick={() => this.props.setNft(null)}>
                        <img src={this.state.nftUrl} style={{display: "flex", margin: "auto", width: "70%", maxWidth: 500, borderRadius: 5}} />


                        </Button>


                        <Typography color="secondary" align="center" style={{margin: 20}} variant="subtitle1"> {this.state.charStats} </Typography>
                        <br />
                        <Typography color="secondary" align="center" variant="h6"> {this.state.message} </Typography>

                        <br />


                        <Button variant="contained" color="secondary"  style={{display: "flex", margin: "auto"}} onClick={() => this.chooseCharacter()} >
                            
                        <Typography color="primary" align="center" variant="h6"> Select </Typography>
                    </Button>
                    <br />
                   


                    </div>
        
                )

            }
            else {
                return (
                    <Button  onClick={() => this.props.setNft(this.props.nftId)} >
                        <Typography color="secondary" style={{position: "absolute", bottom: 10, left: 15}} align="left" variant="caption"> {this.state.nft.name} </Typography>
                        <img style={{width: "100%", borderRadius: 5}} src={this.state.nftUrl} />
                       

                    </Button>
        
                )
            }
            
        }

        else {
            return (
                <div>                   
                </div>
    
            )
        }
       
        
    }
    
}