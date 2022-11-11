import React from "react"

import Head from "next/head"

import MyAlgo from '@randlabs/myalgo-connect';


import { PeraWalletConnect } from "@perawallet/connect";

const peraWallet = new PeraWalletConnect();

import algosdk from "algosdk"


import { Grid, Card, Modal, Typography, Button, TextField, Select } from "@mui/material"

export default class DAO2 extends React.Component { 

    constructor(props) {
        super(props);
        this.state = {
            optedIn: false,
            localProposal: "",
            proposal1: "",
            proposal2: ""
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
                if (app.id == 896464969) {
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
                new Uint8Array(Buffer.from(String(this.state.proposal1) + "," + String(this.state.proposal2))),
            )

          const accounts = [this.props.activeAddress]
          const foreignApps = undefined
            
          const foreignAssets = [this.props.activeNft[0]]
          
          let txn = algosdk.makeApplicationNoOpTxn(sender, params, index, appArgs, accounts, foreignApps, foreignAssets);
          const singleTxnGroups = [{txn: txn, signers: [this.props.activeAddress]}]

          if (this.props.wallet == "pera") {
            const signedTxn = await peraWallet.signTransaction([singleTxnGroups])

            let txId = await client.sendRawTransaction(signedTxn).do();

            this.setState({localProposal: [this.state.proposal1, this.state.proposal2]})
          }
          else if (this.props.wallet == "myalgo") {
            const myAlgoWallet = new MyAlgo()

            const signedTxn = await myAlgoWallet.signTransaction(txn.toByte());

            let txId = await client.sendRawTransaction(signedTxn.blob).do();

            this.setState({localProposal: [this.state.proposal1, this.state.proposal2]})
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

      let contract = 896464969

        return (
            <div style={{margin: 30, display: "grid", margin: "auto"}}>
              

                
                <br />
                {this.state.optedIn == false ? 
                <Button style={{display: "flex", margin: "auto", padding: 10, borderRadius: 15, backgroundColor: "#FFFFFF"}} onClick={() => this.Optin(this.props.activeAddress, contract)}>
                     <Typography variant="h6" style={{fontFamily: "Consolas", color: "#000000"}}> Opt in </Typography>
                </Button>
                :
                <>

                <Typography align="center" variant="h4" style={{color: "#FFFFFF", fontFamily: "Jacques", padding: 30}}>
                    Measure 3 <hr /> Puddin Mine
                </Typography>
                <Grid container >
                        <Grid item xs={12} sm={12} md={6}>
                            
                        <Button style={{display: "flex", margin: "auto", marginLeft: 10, marginRight: 10, padding: 10, borderRadius: 15, textTransform: "none", border: "1px solid white", backgroundColor: this.state.proposal1 == "A" ? "#FFFFFF" : "#000000"}} onClick={() => this.state.proposal1 == "A" ? this.setState({proposal1: "none"}) : this.setState({proposal1: "A"})}>
                      <Typography variant="h6" style={{fontFamily: "Jacques", color: this.state.proposal1 == "A" ? "#000000" : "#FFFFFF"}}> 
                      Option A
                      <hr />
                      Deposit Dark Coin to the puddin mine so puddin mine users can earn Dark Coin by mining (max deposit is 4,000,000 DC, rewards will last over a year per the devs).
                      <hr />
                      PROS: Exposure to more communities and users who theoretically may invest more if they are interested in the project.
                      <hr />
                      CONS: This theoretically could increase selling pressure and decrease buying pressure if puddin mine users are not buying in to Dark Coin and mining it just to sell it.  </Typography>
                  </Button>
                  <br />
                        </Grid>
                        <Grid item xs={12} sm={12} md={6}>
                        <Button style={{display: "flex", margin: "auto", marginLeft: 10, marginRight: 10, padding: 10, borderRadius: 15, textTransform: "none", border: "1px solid white", backgroundColor: this.state.proposal1 == "B" ? "#FFFFFF" : "#000000"}} onClick={() => this.state.proposal1 == "B" ? this.setState({proposal1: "none"}) : this.setState({proposal1: "B"})}>
                            <Typography variant="h6" style={{fontFamily: "Jacques", color: this.state.proposal1 == "B" ? "#000000" : "#FFFFFF"}}> 
                            Option B
                            <hr />
                            Do not deposit Dark Coin to the puddin mine.
                            <hr />
                            PROS: Theoretically would decrease selling pressure and increase buying pressure. 
                            <hr />
                            CONS: Dark Coin loses out on the added exposure. </Typography>
                        </Button>
                        <br />
                        </Grid>
                      </Grid>

                      <Typography align="center" variant="h4" style={{color: "#FFFFFF", fontFamily: "Jacques", padding: 30}}>
                        Measure 4 <hr /> Source of funding for Puddin Mine
                      </Typography>

                      <Typography align="center" variant="h6" style={{color: "#FFFFFF", fontFamily: "Jacques", padding: 30}}>
                      (note that measure 2 is dependent on the results of measure 1. If Measure 1 Option B is passed, this measure loses practical relevance).
                      </Typography>


                      <Grid container >
                        <Grid item xs={12} sm={12} md={6}>
                            
                        <Button style={{display: "flex", margin: "auto", marginLeft: 10, marginRight: 10, padding: 10, borderRadius: 15, textTransform: "none", border: "1px solid white", backgroundColor: this.state.proposal2 == "A" ? "#FFFFFF" : "#000000"}} onClick={() => this.state.proposal2 == "A" ? this.setState({proposal2: "none"}) : this.setState({proposal2: "A"})}>
                      <Typography variant="h6" style={{fontFamily: "Jacques", color: this.state.proposal2 == "A" ? "#000000" : "#FFFFFF"}}> 
                      Option A
                      <hr />
                      Deposit Dark Coin to the puddin mine from the creator wallet reserves (max deposit is 4,000,000 for a years worth of reward payouts).
                      <hr />
                      PROS: This is the simplest way to source the funds, and with creator buy backs, 4,000,000 DC will be earned back by the creator wallet over time.
                      <hr />
                      CONS: Reduces the amount of Dark Coin immediately available in the creator wallet for adding liquidity and funding staking rewards.  </Typography>
                  </Button>
                  <br />
                        </Grid>
                        <Grid item xs={12} sm={12} md={6}>
                        <Button style={{display: "flex", margin: "auto", marginLeft: 10, marginRight: 10, padding: 10, borderRadius: 15, textTransform: "none", border: "1px solid white", backgroundColor: this.state.proposal2 == "B" ? "#FFFFFF" : "#000000"}} onClick={() => this.state.proposal2 == "B" ? this.setState({proposal2: "none"}) : this.setState({proposal2: "B"})}>
                            <Typography variant="h6" style={{fontFamily: "Jacques", color: this.state.proposal2 == "B" ? "#000000" : "#FFFFFF"}}> 
                            Option B
                            <hr />
                            Deposit half of the balance (2,000,000 Dark Coin) from the creator wallet reserves and accept up to 2,000,000 Dark Coin in community donations.
                            <hr />
                            PROS: More DC immediately available in the creator wallet for adding liquidity and funding staking rewards. Community has more control over the amount being deposited into the mine.
                            <hr />
                            CONS: Collecting donations is more complicated than just simply donating the entire amount from the creator wallet. </Typography>
                        </Button>
                        <br />
                        </Grid>
                      </Grid>
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
                    Measure 3
                    <br />
                    {this.state.localProposal[0] != "none" ? this.state.localProposal[0] : "No vote"}
                    <hr />
                    Measure 4
                    <br />
                    {this.state.localProposal[1] != "none" ? this.state.localProposal[1] : "No vote"}
                    
                </Typography>
                :
                null
                }
                
                
            </div>
        )
    }
    
}