import React from "react"

import Head from "next/head"

import MyAlgo from '@randlabs/myalgo-connect';

import { db } from "../../../Firebase/FirebaseInit"

import { doc, setDoc, getDoc } from "firebase/firestore"; 

//43EVULWFT4RU2H7EZH377SAVQJSJO5NZP37N3Y5DZ7PGUXOETKW7VWDIOA

import { PeraWalletConnect } from "@perawallet/connect";

const peraWallet = new PeraWalletConnect();

import algosdk from "algosdk"


import { Grid, Typography, Button, TextField } from "@mui/material"

export default class Trade extends React.Component { 

    constructor(props) {
        super(props);
        this.state = {
            optedIn: false,
            mixVal: "",
            receiver: "",
            queued5: 0,
            queued20: 0,
            queued50: 0,
            queued100: 0,
            queued500: 0,
        };
        this.Optin = this.Optin.bind(this)
        this.Closeout = this.Closeout.bind(this)
        this.handleChange = this.handleChange.bind(this)
        this.shuffle = this.shuffle.bind(this)
        this.mix = this.mix.bind(this)
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

          let response = await indexerClient.lookupApplications(885581567).do();

          let globalState = response.application.params["global-state"]

          globalState.forEach((keyVal) => {
            if (atob(keyVal.key) == "queued5") {
              this.setState({queued5: keyVal.value.uint})
            }
            else if (atob(keyVal.key) == "queued20") {
              this.setState({queued20: keyVal.value.uint})
            }
            else if (atob(keyVal.key) == "queued50") {
              this.setState({queued50: keyVal.value.uint})
            }
            else if (atob(keyVal.key) == "queued100") {
              this.setState({queued100: keyVal.value.uint})
            }
            else if (atob(keyVal.key) == "queued500") {
              this.setState({queued500: keyVal.value.uint})
            }
          })

          let address = this.props.activeAddress;
          response = await indexerClient.lookupAccountAppLocalStates(address).do();
          response["apps-local-states"].forEach((app) => {                
              if (app.id == 885581567) {
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

      shuffle(array) {
        let currentIndex = array.length,  randomIndex;
      
        // While there remain elements to shuffle.
        while (currentIndex != 0) {
      
          // Pick a remaining element.
          randomIndex = Math.floor(Math.random() * currentIndex);
          currentIndex--;
      
          // And swap it with the current element.
          [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
        }
      
        return array;
      }

      async mix() {

        let queued5
        let queued20
        let queued50
        let queued100
        let queued500
        

        const indexerClient = new algosdk.Indexer('', 'https://algoindexer.algoexplorerapi.io', '');

        let response = await indexerClient.lookupApplications(885581567).do();

        let globalState = response.application.params["global-state"]

        globalState.forEach((keyVal) => {
          if (atob(keyVal.key) == "queued5") {
            queued5 = keyVal.value.uint
          }
          else if (atob(keyVal.key) == "queued20") {
            queued20 = keyVal.value.uint
          }
          else if (atob(keyVal.key) == "queued50") {
            queued50 = keyVal.value.uint
          }
          else if (atob(keyVal.key) == "queued100") {
            queued50 = keyVal.value.uint
          }
          else if (atob(keyVal.key) == "queued500") {
            queued500 = keyVal.value.uint
          }
        })

        let chosenQueue

        if (this.state.mixVal == "5") {
          chosenQueue = queued5
        }
        else if (this.state.mixVal == "20") {
          chosenQueue = queued20
        }
        else if (this.state.mixVal == "50") {
          chosenQueue = queued50
        }
        else if (this.state.mixVal == "100") {
          chosenQueue = queued100
        }
        else if (this.state.mixVal == "500") {
          chosenQueue = queued500
        }

        

        const client = new algosdk.Algodv2("", "https://node.algoexplorerapi.io/", "")

        let params = await client.getTransactionParams().do();

        if (chosenQueue >= 3) {

          let i = 0
          let trans = []

          for (i = 0; i < 3; i++) {

            let docRef = doc(db, "queued" + this.state.mixVal, i.toString());
            let docSnap = await getDoc(docRef);
            let receiver = docSnap.data().receiver
    
            trans.push(receiver)
            
    
          }

          let cost

          if (this.state.mixVal == "5") {
            cost = 5100000
          }
          else if (this.state.mixVal == "20") {
            cost = 20400000
          }
          else if (this.state.mixVal == "50") {
            cost = 51000000
          }
          else if (this.state.mixVal == "100") {
            cost = 102000000
          }
          else if (this.state.mixVal == "500") {
            cost = 510000000
          }
          

          let ftxn = algosdk.makePaymentTxnWithSuggestedParams(
            this.props.activeAddress, 
            "43EVULWFT4RU2H7EZH377SAVQJSJO5NZP37N3Y5DZ7PGUXOETKW7VWDIOA", 
            cost, 
            undefined,
            undefined,
            params
          );


          const appArgs = []
          appArgs.push(
            new Uint8Array(Buffer.from("mix")),
            new Uint8Array(Buffer.from(this.state.mixVal)),
            algosdk.encodeUint64(chosenQueue)
          )

          let accounts = [trans[0], trans[1], trans[2], this.state.receiver]
          let shuffledAccounts = this.shuffle(accounts)
          const foreignApps = undefined
            
          const foreignAssets = []
          
          let atxn = algosdk.makeApplicationNoOpTxn(this.props.activeAddress, params, 885581567, appArgs, shuffledAccounts, foreignApps, foreignAssets);
          
          let txns = [ftxn, atxn]

          let txgroup = algosdk.assignGroupID(txns)

          let multipleTxnGroups

          if (this.props.wallet == "pera") {

            multipleTxnGroups = [
              {txn: ftxn, signers: [this.props.activeAddress]},
              {txn: atxn, signers: [this.props.activeAddress]}
            ];

            const signedTxn = await peraWallet.signTransaction([multipleTxnGroups])

            let txId = await client.sendRawTransaction(signedTxn).do();

          }
          else if (this.props.wallet == "myalgo") {

            multipleTxnGroups = [
              ftxn.toByte(),
              atxn.toByte()
            ];

            const myAlgoWallet = new MyAlgo()

            const signedTxn = await myAlgoWallet.signTransaction(multipleTxnGroups);

            let txId = await client.sendRawTransaction([signedTxn[0].blob, signedTxn[1].blob]).do();

          }



        }

        else {

          let cost

          if (this.state.mixVal == "5") {
            cost = 5100000
          }
          else if (this.state.mixVal == "20") {
            cost = 20400000
          }
          else if (this.state.mixVal == "50") {
            cost = 51000000
          }
          else if (this.state.mixVal == "100") {
            cost = 102000000
          }
          else if (this.state.mixVal == "500") {
            cost = 510000000
          }

          let txn = algosdk.makePaymentTxnWithSuggestedParams(
            this.props.activeAddress, 
            "43EVULWFT4RU2H7EZH377SAVQJSJO5NZP37N3Y5DZ7PGUXOETKW7VWDIOA", 
            cost, 
            undefined,
            undefined,
            params
          );

          const appArgs = []
          appArgs.push(
            new Uint8Array(Buffer.from("mix")),
            new Uint8Array(Buffer.from(this.state.mixVal)),
            algosdk.encodeUint64(chosenQueue)
          )

          const accounts = []
          const foreignApps = undefined
            
          const foreignAssets = []
          
          let atxn = algosdk.makeApplicationNoOpTxn(this.props.activeAddress, params, 885581567, appArgs, accounts, foreignApps, foreignAssets);
          
          let txns = [txn, atxn]

          let txgroup = algosdk.assignGroupID(txns)

          let multipleTxnGroups
  
  
          if (this.props.wallet == "pera") {
  
            try {
              multipleTxnGroups = [
                {txn: txn, signers: [this.props.activeAddress]},
                {txn: atxn, signers: [this.props.activeAddress]}
              ];
  
              const signedTxn = await peraWallet.signTransaction([multipleTxnGroups]) 

              await setDoc(doc(db, "queued" + this.state.mixVal, chosenQueue.toString()), {
                sender: this.props.activeAddress,
                receiver: this.state.receiver
              });

              let txId = await client.sendRawTransaction(signedTxn).do();
    
              
            }
  
            catch (error) {
              console.log(error)
            }
            
  
          }
  
          else if (this.props.wallet == "myalgo") {

            try {

            multipleTxnGroups = [
              txn.toByte(),
              atxn.toByte()
            ];

            const myAlgoWallet = new MyAlgo()

            const signedTxn = await myAlgoWallet.signTransaction(multipleTxnGroups);

            await setDoc(doc(db, "queued" + this.state.mixVal, queued5.toString()), {
              sender: this.props.activeAddress,
              receiver: this.state.receiver
            });

            let txId = await client.sendRawTransaction([signedTxn[0].blob, signedTxn[1].blob]).do();
    
            

          }

          catch (error) {
            console.log(error)
          }
  
          }
        }

        
      
      }

    render() {

      let contract = 885581567  

        return (
            <div style={{margin: 30}}>
              
              <Typography variant="h4" align="center" style={{fontFamily: "Jacques", color: "#FFFFFF"}}> Dark Mixer </Typography>
          

                
                <br />
                {this.state.optedIn == false ? 
                <Button style={{display: "flex", margin: "auto", padding: 10, borderRadius: 15, backgroundColor: "#FFFFFF"}} onClick={() => this.Optin(this.props.activeAddress, contract)}>
                     <Typography variant="h6" style={{fontFamily: "Jacques", color: "#000000"}}> Opt in </Typography>
                </Button>
                :
                <>
                <Typography variant="h6" align="center" style={{fontFamily: "Jacques", color: "#FFFFFF"}}> Sends at 4 </Typography>
                  <Grid container align="center" >
                      <Grid item xs={12} sm={4} md={4} lg={2} >
                      <Typography variant="h6" style={{fontFamily: "Jacques", color: "#FFFFFF"}}> {this.state.queued5} </Typography>

                          <Button style={{padding: 10, margin: 20, borderRadius: 15, backgroundColor: this.state.mixVal == "5" ? "#FFFFFF" : "#000000", border: "1px solid white"}} onClick={() => this.state.mixVal == "5" ? this.setState({mixVal: ""}) : this.setState({mixVal: "5"})}>
                          <Typography variant="h6" style={{fontFamily: "Jacques", color: this.state.mixVal == "5" ? "#000000" : "#FFFFFF"}}> 5 </Typography>
                          {this.state.mixVal == "5" ?
                          <img src="/AlgoBlack.svg" style={{width: 15}} />
                          :
                          <img src="/AlgoWhite.svg" style={{width: 15}} />
                          }

                          </Button>
                          
                      </Grid>
                      <Grid item xs={12} sm={4} md={4} lg={3}>
                      <Typography variant="h6" style={{fontFamily: "Jacques", color: "#FFFFFF"}}> {this.state.queued20} </Typography>
                          <Button style={{padding: 10, margin: 20, borderRadius: 15, backgroundColor: this.state.mixVal == "20" ? "#FFFFFF" : "#000000", border: "1px solid white"}} onClick={() => this.state.mixVal == "20" ? this.setState({mixVal: ""}) : this.setState({mixVal: "20"})}>
                          <Typography variant="h6" style={{fontFamily: "Jacques", color: this.state.mixVal == "20" ? "#000000" : "#FFFFFF"}}> 20 </Typography>
                          {this.state.mixVal == "20" ?
                          <img src="/AlgoBlack.svg" style={{width: 15}} />
                          :
                          <img src="/AlgoWhite.svg" style={{width: 15}} />
                          }
                          </Button>
                      </Grid>
                      <Grid item xs={12} sm={4} md={4} lg={2}>
                      <Typography variant="h6" style={{fontFamily: "Jacques", color: "#FFFFFF"}}> {this.state.queued50} </Typography>
                          <Button style={{padding: 10, margin: 20, borderRadius: 15, backgroundColor: this.state.mixVal == "50" ? "#FFFFFF" : "#000000", border: "1px solid white"}} onClick={() => this.state.mixVal == "50" ? this.setState({mixVal: ""}) : this.setState({mixVal: "50"})}>
                          <Typography variant="h6" style={{fontFamily: "Jacques", color: this.state.mixVal == "50" ? "#000000" : "#FFFFFF"}}> 50 </Typography>
                          {this.state.mixVal == "50" ?
                          <img src="/AlgoBlack.svg" style={{width: 15}} />
                          :
                          <img src="/AlgoWhite.svg" style={{width: 15}} />
                          }
                          </Button>
                      </Grid>
                      <Grid item xs={12} sm={6} md={6} lg={3}>
                      <Typography variant="h6" style={{fontFamily: "Jacques", color: "#FFFFFF"}}> {this.state.queued100} </Typography>
                          <Button style={{padding: 10, margin: 20, borderRadius: 15, backgroundColor: this.state.mixVal == "100" ? "#FFFFFF" : "#000000", border: "1px solid white"}} onClick={() => this.state.mixVal == "100" ? this.setState({mixVal: ""}) : this.setState({mixVal: "100"})}>
                          <Typography variant="h6" style={{fontFamily: "Jacques", color: this.state.mixVal == "100" ? "#000000" : "#FFFFFF"}}> 100 </Typography>
                          {this.state.mixVal == "100" ?
                          <img src="/AlgoBlack.svg" style={{width: 15}} />
                          :
                          <img src="/AlgoWhite.svg" style={{width: 15}} />
                          }
                          </Button>
                      </Grid>
                      <Grid item xs={12} sm={6} md={6} lg={2}>
                      <Typography variant="h6" style={{fontFamily: "Jacques", color: "#FFFFFF"}}> {this.state.queued500} </Typography>
                          <Button style={{padding: 10, margin: 20, borderRadius: 15, backgroundColor: this.state.mixVal == "500" ? "#FFFFFF" : "#000000", border: "1px solid white"}} onClick={() => this.state.mixVal == "500" ? this.setState({mixVal: ""}) : this.setState({mixVal: "500"})}>
                          <Typography variant="h6" style={{fontFamily: "Jacques", color: this.state.mixVal == "500" ? "#000000" : "#FFFFFF"}}> 500 </Typography>
                          {this.state.mixVal == "500" ?
                          <img src="/AlgoBlack.svg" style={{width: 15}} />
                          :
                          <img src="/AlgoWhite.svg" style={{width: 15}} />
                          }
                          </Button>
                      </Grid>
                      
                  </Grid>

                  {this.state.mixVal ?
                  <>
                    <br />

                    <TextField
                        onChange={this.handleChange}
                        value={this.state.receiver}
                        type="text"
                        label="Receiver"
                        name="receiver"
                        autoComplete="false"
                        color="secondary"
                        InputProps={{ style: { color: "white" } }}
                        InputLabelProps={{ style: { color: "white" } }}
                        sx={{"& .MuiOutlinedInput-root":{"& > fieldset": {border: '2px solid #FFFFFF'}}}}
                        style={{
                        display: "flex",
                        margin: "auto",
                        width: "80%"
                        }}
                      />
                       <br />
                    <Button style={{display: "flex", margin: "auto", padding: 10, borderRadius: 15, backgroundColor: "#FFFFFF"}} onClick={() => this.mix()}>
                      <Typography variant="h6" style={{fontFamily: "Jacques", color: "#000000"}}> Mix </Typography>
                    </Button>
                  </>
                    :
                    null
                  }
                  
                  
                  <br />
                  <Button style={{display: "flex", margin: "auto", padding: 10, borderRadius: 15, backgroundColor: "#FFFFFF"}} onClick={() => this.Closeout(this.props.activeAddress, contract)}>
                      <Typography variant="h6" style={{fontFamily: "Jacques", color: "#000000"}}> Opt out </Typography>
                  </Button>
                </>
                }
                <br />

              <Button style={{display: "flex", margin: "auto", padding: 10, borderRadius: 15, backgroundColor: "#FFFFFF"}} onClick={() => window.open("https://algoexplorer.io/application/" + contract)}>
                  <Typography variant="h6" style={{fontFamily: "Jacques", color: "#000000"}}> View Contract </Typography>
              </Button>
                
                
            </div>
        )
    }
    
}