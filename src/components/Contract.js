import React from "react"

import Head from "next/head"

import MyAlgo from '@randlabs/myalgo-connect';


import { PeraWalletConnect } from "@perawallet/connect";

const peraWallet = new PeraWalletConnect();

import algosdk from "algosdk"


import { Grid, Card, Modal, Typography, Button, TextField } from "@mui/material"

export default class Contract extends React.Component { 

    constructor(props) {
        super(props);
        this.state = {
            optedIn: false,
            localProposal: "",
            proposal: ""
        };
        this.Optin = this.Optin.bind(this)
        this.Closeout = this.Closeout.bind(this)
        this.Vote = this.Vote.bind(this)
        this.handleChange = this.handleChange.bind(this)    
    }

    componentDidMount() {
        
        peraWallet.reconnectSession()

        const indexerClient = new algosdk.Indexer('', 'https://algoindexer.algoexplorerapi.io', '');

        (async () => {
            let address = this.props.activeAddress;
            let response = await indexerClient.lookupAccountAppLocalStates(address).do();
            response["apps-local-states"].forEach((app) => {                
                if (app.id == 826032354) {
                    let localProposal = ""
                    if (app["key-value"]) {
                      app["key-value"].forEach((keyvalue) => {
                        if (atob(keyvalue.key) == String(this.props.activeNft[0])) {
                          localProposal = atob(keyvalue.value.bytes)
                          this.setState({localProposal: localProposal})
                        }
                      })
                    }

                    this.setState({optedIn: true})
                }
            })
        })().catch(e => {
            console.error(e);
            console.trace();
        })

      }
     

      async Optin (sender, index) {
        try{

        let client = new algosdk.Algodv2("", "https://node.algoexplorerapi.io/", "")
        
          let params = await client.getTransactionParams().do()
          params.fee = 1000;
          params.flatFee = true;      
          
          let txn = algosdk.makeApplicationOptInTxn(sender, params, index);
          const singleTxnGroups = [{txn: txn, signers: [this.props.activeAddress]}]

          if (this.props.wallet == "pera") {
            const signedTxn = await peraWallet.signTransaction([singleTxnGroups])

            let txId = await client.sendRawTransaction(signedTxn).do();

            this.setState({optedIn: true})
          }
          else if (this.props.wallet == "myalgo") {
            const myAlgoWallet = new MyAlgo()

            const signedTxn = await myAlgoWallet.signTransaction(txn.toByte());

            let txId = await client.sendRawTransaction(signedTxn.blob).do();

            this.setState({optedIn: true})
          }
          
          
          
          
         
        }catch(err){
          console.log(err)
        }
      }

      async Closeout (sender, index) {
        try{

        let client = new algosdk.Algodv2("", "https://node.algoexplorerapi.io/", "")
        
          let params = await client.getTransactionParams().do()
          params.fee = 1000;
          params.flatFee = true;      
          
          let txn = algosdk.makeApplicationCloseOutTxn(sender, params, index);
          const singleTxnGroups = [{txn: txn, signers: [this.props.activeAddress]}]

          if (this.props.wallet == "pera") {
            const signedTxn = await peraWallet.signTransaction([singleTxnGroups])

            let txId = await client.sendRawTransaction(signedTxn).do();

            this.setState({optedIn: false})
          }
          else if (this.props.wallet == "myalgo") {
            const myAlgoWallet = new MyAlgo()

            const signedTxn = await myAlgoWallet.signTransaction(txn.toByte());

            let txId = await client.sendRawTransaction(signedTxn.blob).do();

            this.setState({optedIn: false, localProposal: ""})
          }
 

        
          
         
        }catch(err){
          console.log(err)
        }
      }

      async Vote (sender, index) {
        try{

        let client = new algosdk.Algodv2("", "https://node.algoexplorerapi.io/", "")
        
          let params = await client.getTransactionParams().do()
          params.fee = 1000;
          params.flatFee = true;  
          
          const appArgs = []
            appArgs.push(
                new Uint8Array(Buffer.from("vote")),
                new Uint8Array(Buffer.from(this.props.activeNft[0].toString())),
                new Uint8Array(Buffer.from(this.state.proposal)),
            )

          const accounts = [this.props.activeAddress]
          const foreignApps = undefined
            
          const foreignAssets = [this.props.activeNft[0]]
          
          let txn = algosdk.makeApplicationNoOpTxn(sender, params, index, appArgs, accounts, foreignApps, foreignAssets);
          const singleTxnGroups = [{txn: txn, signers: [this.props.activeAddress]}]

          if (this.props.wallet == "pera") {
            const signedTxn = await peraWallet.signTransaction([singleTxnGroups])

            let txId = await client.sendRawTransaction(signedTxn).do();

            this.setState({localProposal: this.state.proposal})
          }
          else if (this.props.wallet == "myalgo") {
            const myAlgoWallet = new MyAlgo()

            const signedTxn = await myAlgoWallet.signTransaction(txn.toByte());

            let txId = await client.sendRawTransaction(signedTxn.blob).do();

            this.setState({localProposal: this.state.proposal})
          }
          
         
        }catch(err){
          console.log(err)
        }
      }

      handleChange(event) {
        const target = event.target;
        const value = target.type === 'checkbox' ? target.checked : target.value;
        const name = target.name;
    
        this.setState({
        [name]: value
    
        });
      }

   

    render() {


        return (
            <div style={{margin: 30}}>
                
            
                {this.state.localProposal ? 
                <>
                <Typography align="center" variant="h4" style={{color: "#FFFFFF", fontFamily: "Jacques", padding: 30}}>
                    Proposal
                </Typography>
                <Typography align="center" variant="h6" style={{color: "#FFFFFF", fontFamily: "Jacques", padding: 30}}>
                    {this.state.localProposal}
                </Typography>
                </>
                :
                null
                }
                <br />

               
                <Button style={{display: "flex", margin: "auto", padding: 10, borderRadius: 15, backgroundColor: "#FFFFFF"}} onClick={() => window.open("https://algoexplorer.io/application/826032354")}>
                     <Typography variant="h6" style={{fontFamily: "Jacques", color: "#000000"}}> View Contract </Typography>
                </Button>
                <br />
                {this.state.optedIn == false ? 
                <Button style={{display: "flex", margin: "auto", padding: 10, borderRadius: 15, backgroundColor: "#FFFFFF"}} onClick={() => this.Optin(this.props.activeAddress, 826032354)}>
                     <Typography variant="h6" style={{fontFamily: "Jacques", color: "#000000"}}> Opt in </Typography>
                </Button>
                :
                <>
                  <TextField
                      color="primary"
                      variant="outlined"
                      multiline
                      rows={5}
                      value={this.state.proposal}
                      type="text"
                      label={<Typography variant="body1" style={{fontFamily: "Jacques", color: "#FFFFFF"}}> Proposal </Typography>}
                      name={"proposal"}
                      inputProps={{ style: { color: "white", fontFamily: "Jacques" }}}

                      sx={{"& .MuiOutlinedInput-root":{"& > fieldset": {border: '2px solid #FFFFFF'}}}}
                      style={{width: "80%", display: "flex", margin: "auto"}}
                      onChange={this.handleChange}
                  />
                  <br />
                  <Button style={{display: "flex", margin: "auto", padding: 10, borderRadius: 15, backgroundColor: "#FFFFFF"}} onClick={() => this.Vote(this.props.activeAddress, 826032354)}>
                      <Typography variant="h6" style={{fontFamily: "Jacques", color: "#000000"}}> Vote </Typography>
                  </Button>
                  <br />
                  <Button style={{display: "flex", margin: "auto", padding: 10, borderRadius: 15, backgroundColor: "#FFFFFF"}} onClick={() => this.Closeout(this.props.activeAddress, 826032354)}>
                      <Typography variant="h6" style={{fontFamily: "Jacques", color: "#000000"}}> Opt out </Typography>
                  </Button>
                </>
                }
                
                
            </div>
        )
    }
    
}