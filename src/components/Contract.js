import React from "react"

import Head from "next/head"

import MyAlgo from '@randlabs/myalgo-connect';


import { PeraWalletConnect } from "@perawallet/connect";

const peraWallet = new PeraWalletConnect();

import algosdk from "algosdk"


import { Grid, Card, Modal, Typography, Button, TextField, Select } from "@mui/material"

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
                      app["key-value"].forEach((key) => {
                        const buffer = Buffer.from(key.key, 'base64');
                        const bufString = buffer.toString('hex');
                        let fKey = parseInt(bufString, 16)
                        console.log(fKey)
                        if (fKey == String(this.props.activeNft[0])) {
                          localProposal = atob(key.value.bytes)
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
              <Typography align="center" variant="h4" style={{color: "#FFFFFF", fontFamily: "Jacques", padding: 30}}>
                    Measure 1
              </Typography>
              <Typography align="center" variant="h6" style={{fontFamily: "Jacques", color: "#FFFFFF"}}> Dark Coin is spending $3 a day on AlgoStake to keep a pool open for DC/ALGO LP holders to stake their tokens for extra Dark Coin. The Dark Coin team is looking to save on the expenses of AlgoStake, and is offering alternatives to the AlgoStake platform.    </Typography>

                
            
               
                
                <br />
                {this.state.optedIn == false ? 
                <Button style={{display: "flex", margin: "auto", padding: 10, borderRadius: 15, backgroundColor: "#FFFFFF"}} onClick={() => this.Optin(this.props.activeAddress, 826032354)}>
                     <Typography variant="h6" style={{fontFamily: "Jacques", color: "#000000"}}> Opt in </Typography>
                </Button>
                :
                <>
                <Grid container alignItems="center">
                        <Grid item xs={12} sm={12} md={6}>
                            
                        <Button style={{display: "flex", margin: "auto", padding: 10, borderRadius: 15, textTransform: "none", border: "1px solid white", backgroundColor: this.state.proposal == "A" ? "#FFFFFF" : "#000000"}} onClick={() => this.setState({proposal: "A"})}>
                      <Typography variant="h6" style={{fontFamily: "Jacques", color: this.state.proposal == "A" ? "#000000" : "#FFFFFF"}}> Option A <hr />  Keep the AlgoStake LP pool online </Typography>
                  </Button>
                  <br />
                        </Grid>
                        <Grid item xs={12} sm={12} md={6}>
                        <Button style={{display: "flex", margin: "auto", padding: 10, borderRadius: 15, textTransform: "none", border: "1px solid white", backgroundColor: this.state.proposal == "B" ? "#FFFFFF" : "#000000"}} onClick={() => this.setState({proposal: "B"})}>
                            <Typography variant="h6" style={{fontFamily: "Jacques", color: this.state.proposal == "B" ? "#000000" : "#FFFFFF"}}> Option B <hr /> Move off AlgoStake and look to AlgoFaucet </Typography>
                        </Button>
                        <br />
                        </Grid>
                      </Grid>
                  
                 
                  <Button style={{display: "flex", margin: "auto", padding: 10, borderRadius: 15, backgroundColor: "#FFFFFF"}} onClick={() => this.Vote(this.props.activeAddress, 826032354)}>
                      <Typography variant="h6" style={{fontFamily: "Jacques", color: "#000000"}}> Vote </Typography>
                  </Button>
                  <br />
                  <Button style={{display: "flex", margin: "auto", padding: 10, borderRadius: 15, backgroundColor: "#FFFFFF"}} onClick={() => this.Closeout(this.props.activeAddress, 826032354)}>
                      <Typography variant="h6" style={{fontFamily: "Jacques", color: "#000000"}}> Opt out </Typography>
                  </Button>
                </>
                }
                <br />

              <Button style={{display: "flex", margin: "auto", padding: 10, borderRadius: 15, backgroundColor: "#FFFFFF"}} onClick={() => window.open("https://algoexplorer.io/application/826032354")}>
                  <Typography variant="h6" style={{fontFamily: "Jacques", color: "#000000"}}> View Contract </Typography>
              </Button>

              {this.state.localProposal ? 
                <Typography align="center" variant="h4" style={{color: "#FFFFFF", fontFamily: "Jacques", padding: 30}}>
                    Voted: {this.state.localProposal}
                </Typography>
                :
                null
                }
                
                
            </div>
        )
    }
    
}