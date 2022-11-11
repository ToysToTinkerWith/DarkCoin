import React from "react"

import Head from "next/head"

import MyAlgo from '@randlabs/myalgo-connect';


import { PeraWalletConnect } from "@perawallet/connect";

const peraWallet = new PeraWalletConnect();

import algosdk from "algosdk"


import { Grid, Card, Modal, Typography, Button, TextField, Select } from "@mui/material"

export default class DAO1 extends React.Component { 

    constructor(props) {
        super(props);
        this.state = {
            optedIn: false,
            localProposal: "",
            proposal1: "",
            proposal2: "",
            proposal3: ""
        };
        this.Optin = this.Optin.bind(this)
        this.Closeout = this.Closeout.bind(this)
        this.Vote = this.Vote.bind(this)
        this.handleChange = this.handleChange.bind(this)    
    }

    componentDidMount() {
        
        peraWallet.reconnectSession()
        .catch((error) => {
          // You MUST handle the reject because once the user closes the modal, peraWallet.connect() promise will be rejected.
          // For the async/await syntax you MUST use try/catch
          if (error?.data?.type !== "CONNECT_MODAL_CLOSED") {
              // log the necessary errors
              console.log(error)
          }
          });

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
                        if (fKey == String(this.props.activeNft[0])) {
                          localProposal = atob(key.value.bytes)
                          localProposal = localProposal.split(",")
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
                new Uint8Array(Buffer.from(String(this.state.proposal1) + "," + String(this.state.proposal2) + "," + String(this.state.proposal3))),
            )

          const accounts = [this.props.activeAddress]
          const foreignApps = undefined
            
          const foreignAssets = [this.props.activeNft[0]]
          
          let txn = algosdk.makeApplicationNoOpTxn(sender, params, index, appArgs, accounts, foreignApps, foreignAssets);
          const singleTxnGroups = [{txn: txn, signers: [this.props.activeAddress]}]

          if (this.props.wallet == "pera") {
            const signedTxn = await peraWallet.signTransaction([singleTxnGroups])

            let txId = await client.sendRawTransaction(signedTxn).do();

            this.setState({localProposal: [this.state.proposal1, this.state.proposal2, this.state.proposal3]})
          }
          else if (this.props.wallet == "myalgo") {
            const myAlgoWallet = new MyAlgo()

            const signedTxn = await myAlgoWallet.signTransaction(txn.toByte());

            let txId = await client.sendRawTransaction(signedTxn.blob).do();

            this.setState({localProposal: [this.state.proposal1, this.state.proposal2, this.state.proposal3]})
          }
          
         
        }catch(err){
          console.log(err)
        }
      }

      handleChange(event) {
        const target = event.target;
        let value = target.type === 'checkbox' ? target.checked : target.value;
        const name = target.name;

        if (value < 0) {
          value = 0
        }
    
        this.setState({
        [name]: value
    
        });
      }

   

    render() {

      let contract = 826032354

        return (
            <div style={{margin: 30}}>
              <Typography align="center" variant="h4" style={{color: "#FFFFFF", fontFamily: "Jacques", padding: 30}}>
                    Measure 1 <hr /> LP Rewards
              </Typography>

                
                <br />
                {this.state.optedIn == false ? 
                <Button style={{display: "flex", margin: "auto", padding: 10, borderRadius: 15, backgroundColor: "#FFFFFF"}} onClick={() => this.Optin(this.props.activeAddress, contract)}>
                     <Typography variant="h6" style={{fontFamily: "Consolas", color: "#000000"}}> Opt in </Typography>
                </Button>
                :
                <>
                <Grid container alignItems="center">
                        <Grid item xs={12} sm={12} md={6}>
                            
                        <Button style={{display: "flex", margin: "auto", marginLeft: 10, marginRight: 10, padding: 10, borderRadius: 15, textTransform: "none", border: "1px solid white", backgroundColor: this.state.proposal1 == "A" ? "#FFFFFF" : "#000000"}} onClick={() => this.state.proposal1 == "A" ? this.setState({proposal1: "none"}) : this.setState({proposal1: "A"})}>
                      <Typography variant="h6" style={{fontFamily: "Jacques", color: this.state.proposal1 == "A" ? "#000000" : "#FFFFFF"}}> 
                      Option A
                      <hr />
                      Move LP rewards from AlgoStake to AlgoFaucet
                      <hr />
                      Proposal to move LP rewards 15% APY program from AlgoStake to AlgoFaucet
                      <hr />
                      PROS: Reduces expenses to the development team, more out of pocket funds can be reallocated to liquidity & buybacks, LP token holders do not have to take any action to receive daily rewards.
                      <hr />
                      CONS: Potential loss of visibility generated from being on AlgoStake platform, adjusting payout amount based on price fluctuations won't take effect instantly. </Typography>
                  </Button>
                  <br />
                        </Grid>
                        <Grid item xs={12} sm={12} md={6}>
                        <Button style={{display: "flex", margin: "auto", marginLeft: 10, marginRight: 10, padding: 10, borderRadius: 15, textTransform: "none", border: "1px solid white", backgroundColor: this.state.proposal1 == "B" ? "#FFFFFF" : "#000000"}} onClick={() => this.state.proposal1 == "B" ? this.setState({proposal1: "none"}) : this.setState({proposal1: "B"})}>
                            <Typography variant="h6" style={{fontFamily: "Jacques", color: this.state.proposal1 == "B" ? "#000000" : "#FFFFFF"}}> 
                            Option B
                            <hr />
                            Keep LP rewards on AlgoStake platform
                            <hr />
                            Proposal to continue using the AlgoStake platform the the LP rewards 15% APY program
                            <hr />
                            PROS: Potential increase of visibility generated from being on AlgoStake platform, adjusting payout amount based on price fluctuations DO take effect instantly.
                            <hr />
                            CONS: Continued expenses to the development team, less out of pocket funds, LP token holders DO have to access the AlgoStake website daily to claim rewards (or pay for membership to auto-claim). </Typography>
                        </Button>
                        <br />
                        </Grid>
                      </Grid>

                      <Typography align="center" variant="h4" style={{color: "#FFFFFF", fontFamily: "Jacques", padding: 30}}>
                        Measure 2 <hr /> DAO NFT Shuffle
                      </Typography>

                      <TextField
                        onChange={this.handleChange}
                        value={this.state.proposal2}
                        type="number"
                        label="NFTs released"
                        name="proposal2"
                        autoComplete="false"
                        color="secondary"
                        InputProps={{ style: { color: "white" } }}
                        InputLabelProps={{ style: { color: "white" } }}
                        sx={{"& .MuiOutlinedInput-root":{"& > fieldset": {border: '2px solid #FFFFFF'}}}}
                        style={{
                        display: "flex",
                        margin: "auto",
                        width: "30%"
                        }}
                      />
                      <br />

                      <TextField
                        onChange={this.handleChange}
                        value={this.state.proposal3}
                        type="number"
                        label="Price per NFT"
                        name="proposal3"
                        autoComplete="false"
                        color="secondary"
                        InputProps={{ style: { color: "white" } }}
                        InputLabelProps={{ style: { color: "white" } }}
                        sx={{"& .MuiOutlinedInput-root":{"& > fieldset": {border: '2px solid #FFFFFF'}}}}
                        style={{
                        display: "flex",
                        margin: "auto",
                        width: "30%"
                        }}
                      />
                       <br />
                  
                 
                  <Button style={{display: "flex", margin: "auto", padding: 10, borderRadius: 15, backgroundColor: "#FFFFFF"}} onClick={() => this.Vote(this.props.activeAddress, contract)}>
                      <Typography variant="h6" style={{fontFamily: "Consolas", color: "#000000"}}> Vote </Typography>
                  </Button>
                  <br />
                  <Button style={{display: "flex", margin: "auto", padding: 10, borderRadius: 15, backgroundColor: "#FFFFFF"}} onClick={() => this.Closeout(this.props.activeAddress, contract)}>
                      <Typography variant="h6" style={{fontFamily: "Consolas", color: "#000000"}}> Opt out </Typography>
                  </Button>
                </>
                }
                <br />

              <Button style={{display: "flex", margin: "auto", padding: 10, borderRadius: 15, backgroundColor: "#FFFFFF"}} onClick={() => window.open("https://algoexplorer.io/application/" + contract)}>
                  <Typography variant="h6" style={{fontFamily: "Consolas", color: "#000000"}}> View Contract </Typography>
              </Button>

              {this.state.localProposal ? 
                <Typography align="center" variant="h4" style={{color: "#FFFFFF", fontFamily: "Consolas", padding: 30}}>
                    Voted <hr />
                    Measure 1
                    <br />
                    {this.state.localProposal[0] != "none" ? this.state.localProposal[0] : "No vote"}
                    <hr />
                    Measure 2
                    <br />
                    {this.state.localProposal[1] ? this.state.localProposal[1] + " DAO NFTs" : "No vote on NFT release amount"}
                    <br />
                    {this.state.localProposal[2] ? this.state.localProposal[2] + " Algo each" : "No vote on NFT release price"} 
                </Typography>
                :
                null
                }
                
                
            </div>
        )
    }
    
}