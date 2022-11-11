import React from "react"

import Head from "next/head"

import MyAlgo from '@randlabs/myalgo-connect';

import { db } from "../../../Firebase/FirebaseInit"

import { doc, setDoc, getDoc, serverTimestamp  } from "firebase/firestore"; 

//43EVULWFT4RU2H7EZH377SAVQJSJO5NZP37N3Y5DZ7PGUXOETKW7VWDIOA

import { PeraWalletConnect } from "@perawallet/connect";

const peraWallet = new PeraWalletConnect();

import algosdk from "algosdk"


import { Grid, Typography, Button, TextField, Modal, Card } from "@mui/material"

export default class Trade extends React.Component { 

    constructor(props) {
        super(props);
        this.state = {
            optedIn: false,
            mixVal: "",
            feeOption: "",
            receiver: "",
            queued5: 0,
            queued20: 0,
            queued50: 0,
            queued100: 0,
            queued500: 0,
            sendMix: false,
            trans: [],
            contractTrans: [],
            confirm: ""
            
        };
        this.Optin = this.Optin.bind(this)
        this.Closeout = this.Closeout.bind(this)
        this.handleChange = this.handleChange.bind(this)
        this.shuffle = this.shuffle.bind(this)
        this.sendMix = this.sendMix.bind(this)
        this.mix = this.mix.bind(this)
        this.getReceivers = this.getReceivers.bind(this)
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

            this.setState({
              confirm: "Sending Transaction"
            })

            let txId = await client.sendRawTransaction(signedTxn).do();

            let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);

            this.setState({
              confirm: "Transaction Confirmed, Opted In."
            })

            this.setState({optedIn: true})
          }
          else if (this.props.wallet == "myalgo") {
            const myAlgoWallet = new MyAlgo()

            const signedTxn = await myAlgoWallet.signTransaction(txn.toByte());

            this.setState({
              confirm: "Sending Transaction"
            })

            let txId = await client.sendRawTransaction(signedTxn.blob).do();

            let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);

            this.setState({
              confirm: "Transaction Confirmed, Opted In."
            })


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

            this.setState({
              confirm: "Sending Transaction"
            })

            let txId = await client.sendRawTransaction(signedTxn).do();

            let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);

            this.setState({
              confirm: "Transaction Confirmed, Opted Out."
            })


            this.setState({optedIn: false})
          }
          else if (this.props.wallet == "myalgo") {
            const myAlgoWallet = new MyAlgo()

            const signedTxn = await myAlgoWallet.signTransaction(txn.toByte());

            this.setState({
              confirm: "Sending Transaction"
            })

            let txId = await client.sendRawTransaction(signedTxn.blob).do();

            let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);

            this.setState({
              confirm: "Transaction Confirmed, Opted Out."
            })


            this.setState({optedIn: false})
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

      async sendMix() {

        let i = 0
        let receivers = []

        this.state.trans.forEach((tran) => {
          receivers.push(tran.receiver)
        })

        let shuffledReceivers = this.shuffle(receivers)

        const client = new algosdk.Algodv2("", "https://node.algoexplorerapi.io/", "")

        let params = await client.getTransactionParams().do();

        let chunk
        let txns = []
        let multipleTxnGroups = []


        for (i = 0; i < shuffledReceivers.length; i += 4) {

          chunk = shuffledReceivers.slice(i, i + 4)

          const appArgs = []
          appArgs.push(
            new Uint8Array(Buffer.from("mix")),
            new Uint8Array(Buffer.from(this.state.mixVal)),
          )

          const accounts = []
          const foreignApps = undefined
            
          const foreignAssets = []
          
          let txn = algosdk.makeApplicationNoOpTxn(this.props.activeAddress, params, 885581567, appArgs, chunk, foreignApps, foreignAssets);
          
          txns.push(txn)

          if (this.props.wallet == "pera") {
            multipleTxnGroups.push({txn: txn, signers: [this.props.activeAddress]})
          }

          else if (this.props.wallet == "myalgo") {
            multipleTxnGroups.push(txn.toByte())
          }
          
        }

        let txgroup = algosdk.assignGroupID(txns)

        if (this.props.wallet == "pera") {

          const signedTxn = await peraWallet.signTransaction([multipleTxnGroups]) 

          let txId = await client.sendRawTransaction(signedTxn).do();

          let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);

        }

        else if (this.props.wallet == "myalgo") {
            
          const myAlgoWallet = new MyAlgo()

          const signedTxn = await myAlgoWallet.signTransaction(multipleTxnGroups);

          let trans = []

          signedTxn.forEach((tran) => {
            trans.push(tran.blob)
          })



          let txId = await client.sendRawTransaction(trans).do();

          let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);  

        }


       

        



      }

      async getReceivers() {

        const indexerClient = new algosdk.Indexer('', 'https://algoindexer.algoexplorerapi.io', '');

        let appState = await indexerClient.lookupApplications(885581567).do();

        let globalState = appState.application.params["global-state"]

        let queued

        globalState.forEach((keyVal) => {
          if (atob(keyVal.key) == "queued" + this.state.mixVal) {
            queued = keyVal.value.uint
          }
        })

        let i = 0
        let trans = []
        let firstTranRound
        
        for (i = 0; i < queued; i++) {

          let docRef = doc(db, "queued" + this.state.mixVal, i.toString());
          let docSnap = await getDoc(docRef);
          let tran = docSnap.data()

          if (i == 0) {
            firstTranRound = docSnap.data().confirmedRound
          }
  
          trans.push(tran)

        }

        this.setState({trans: trans})

        let contractTrans = []

        let response = await indexerClient.searchForTransactions()
        .address("43EVULWFT4RU2H7EZH377SAVQJSJO5NZP37N3Y5DZ7PGUXOETKW7VWDIOA")
        .minRound(firstTranRound)
        .do();


        response.transactions.forEach((tran) => {
          
          if (tran["payment-transaction"]) {
            if (tran["payment-transaction"].amount == Number(this.state.mixVal) * 1000000 || tran["payment-transaction"].amount == 20400000) {
              contractTrans.push({sender: tran.sender, confirmedRound: tran["confirmed-round"]})
              
              
            }
            
          }
        })

        this.setState({
          contractTrans: contractTrans
        })



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


          let cost

          if (this.state.mixVal == "5") {
            cost = 5000000
          }
          else if (this.state.mixVal == "20") {
            cost = 20000000
          }
          else if (this.state.mixVal == "50") {
            cost = 50000000
          }
          else if (this.state.mixVal == "100") {
            cost = 100000000
          }
          else if (this.state.mixVal == "500") {
            cost = 500000000
          }

          let txn = algosdk.makePaymentTxnWithSuggestedParams(
            this.props.activeAddress, 
            "43EVULWFT4RU2H7EZH377SAVQJSJO5NZP37N3Y5DZ7PGUXOETKW7VWDIOA", 
            cost, 
            undefined,
            undefined,
            params
          );

          let ftxn

          let fee

          if (this.state.feeOption == "ALGO") {

            if (this.state.mixVal == "5") {
              fee = 100000
            }
            else if (this.state.mixVal == "20") {
              fee = 400000
            }
            else if (this.state.mixVal == "50") {
              fee = 1000000
            }
            else if (this.state.mixVal == "100") {
              fee = 2000000
            }
            else if (this.state.mixVal == "500") {
              fee = 10000000
            }

            ftxn = algosdk.makePaymentTxnWithSuggestedParams(
              this.props.activeAddress, 
              "AL6F3TFPSZPF3BSVUFDNOLMEKUCJJAA7GZ5GF3DN3Q4IVJVNUFK76PQFNE", 
              fee, 
              undefined,
              undefined,
              params
            );

          }

          else if (this.state.feeOption == "DC") {

            const response = await fetch('/api/getDCprices', {
              method: "POST",
            
              headers: {
                "Content-Type": "application/json",
              }
                
            });
  
            const session = await response.json()
  
          let algoUsdc = session.usdcInfo.account.amount
          let usdc
          session.usdcInfo.account.assets.forEach((asset) => {
              if (asset["asset-id"] == "31566704") {
                  usdc = asset.amount
              }
          })
          
          let algoPrice = usdc/algoUsdc
  
          let algoDC = session.DCInfo.account.amount / 1000000
          let DC
          session.DCInfo.account.assets.forEach((asset) => {
              if (asset["asset-id"] == "601894079") {
                  DC = asset.amount
              }
          })
  
          let DCalgo = algoDC/DC


            if (this.state.mixVal == "5") {
              fee = 0.05 / DCalgo
            }
            else if (this.state.mixVal == "20") {
              fee = 0.2 / DCalgo
            }
            else if (this.state.mixVal == "50") {
              fee = 0.5 / DCalgo
            }
            else if (this.state.mixVal == "100") {
              fee = 1 / DCalgo
            }
            else if (this.state.mixVal == "500") {
              fee = 10 / DCalgo
            }

            fee = Math.floor(fee)

            console.log(fee)

            ftxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
              this.props.activeAddress, 
              "AL6F3TFPSZPF3BSVUFDNOLMEKUCJJAA7GZ5GF3DN3Q4IVJVNUFK76PQFNE", 
              undefined,
              undefined,
              fee, 
              undefined,
              601894079,
              params
            );

          }

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
          
          let txns = [txn, ftxn, atxn]

          let txgroup = algosdk.assignGroupID(txns)

          let multipleTxnGroups
  
  
          if (this.props.wallet == "pera") {
  
            try {
              multipleTxnGroups = [
                {txn: txn, signers: [this.props.activeAddress]},
                {txn: ftxn, signers: [this.props.activeAddress]},
                {txn: atxn, signers: [this.props.activeAddress]}
              ];
  
              const signedTxn = await peraWallet.signTransaction([multipleTxnGroups]) 

              let txId = await client.sendRawTransaction(signedTxn).do();

              this.setState({
                confirm: "Sending Transaction"
              })

              let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);

              await setDoc(doc(db, "queued" + this.state.mixVal, chosenQueue.toString()), {
                sender: this.props.activeAddress,
                receiver: this.state.receiver,
                confirmedRound: confirmedTxn["confirmed-round"]
              });

              this.setState({
                confirm: "Transaction Confirmed, Mixed Transaction Queued"
              })
    
              
            }
  
            catch (error) {
              console.log(error)
            }
            
  
          }
  
          else if (this.props.wallet == "myalgo") {

            try {

            multipleTxnGroups = [
              txn.toByte(),
              ftxn.toByte(),
              atxn.toByte()
            ];

            const myAlgoWallet = new MyAlgo()

            const signedTxn = await myAlgoWallet.signTransaction(multipleTxnGroups);

            let txId = await client.sendRawTransaction([signedTxn[0].blob, signedTxn[1].blob, signedTxn[2].blob]).do();

            this.setState({
              confirm: "Sending Transaction"
            })

            let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);        

            await setDoc(doc(db, "queued" + this.state.mixVal, chosenQueue.toString()), {
              sender: this.props.activeAddress,
              receiver: this.state.receiver,
              confirmedRound: confirmedTxn["confirmed-round"]
            });

            this.setState({
              confirm: "Transaction Confirmed, Mixed Transaction Queued"
            })

          }

          catch (error) {
            console.log(error)
          }
  
          
        }

        
      
      }

      

    render() {

      let contract = 885581567  

      let contractTrans = this.state.contractTrans.reverse()

        return (
            <div style={{margin: 30}}>
              
              <Typography variant="h4" align="center" style={{fontFamily: "Consolas", color: "#FFFFFF"}}> Dark Mixer </Typography>
              <br />
          

                
                <br />
                {this.state.optedIn == false ? 
                <Button style={{display: "flex", margin: "auto", padding: 10, borderRadius: 15, backgroundColor: "#FFFFFF"}} onClick={() => this.Optin(this.props.activeAddress, contract)}>
                     <Typography variant="h6" style={{fontFamily: "Consolas", color: "#000000"}}> Opt in </Typography>
                </Button>
                :
                <>
                <Typography variant="h6" align="center" style={{fontFamily: "Consolas", color: "#FFFFFF"}}> Max 16 </Typography>
                  <Grid container align="center" >
                      <Grid item xs={12} sm={4} md={4} lg={2} >
                      <Typography variant="h6" style={{fontFamily: "Consolas", color: "#FFFFFF"}}> {this.state.queued5} </Typography>

                          <Button style={{padding: 10, margin: 20, borderRadius: 15, backgroundColor: this.state.mixVal == "5" ? "#FFFFFF" : "#000000", border: "1px solid white"}} onClick={() => this.state.mixVal == "5" ? this.setState({mixVal: ""}) : this.setState({mixVal: "5"})}>
                          <Typography variant="h6" style={{fontFamily: "Consolas", color: this.state.mixVal == "5" ? "#000000" : "#FFFFFF"}}> 5 </Typography>
                          {this.state.mixVal == "5" ?
                          <img src="/AlgoBlack.svg" style={{width: 15}} />
                          :
                          <img src="/AlgoWhite.svg" style={{width: 15}} />
                          }

                          </Button>
                          
                      </Grid>
                      <Grid item xs={12} sm={4} md={4} lg={3}>
                      <Typography variant="h6" style={{fontFamily: "Consolas", color: "#FFFFFF"}}> {this.state.queued20} </Typography>
                          <Button style={{padding: 10, margin: 20, borderRadius: 15, backgroundColor: this.state.mixVal == "20" ? "#FFFFFF" : "#000000", border: "1px solid white"}} onClick={() => this.state.mixVal == "20" ? this.setState({mixVal: ""}) : this.setState({mixVal: "20"})}>
                          <Typography variant="h6" style={{fontFamily: "Consolas", color: this.state.mixVal == "20" ? "#000000" : "#FFFFFF"}}> 20 </Typography>
                          {this.state.mixVal == "20" ?
                          <img src="/AlgoBlack.svg" style={{width: 15}} />
                          :
                          <img src="/AlgoWhite.svg" style={{width: 15}} />
                          }
                          </Button>
                      </Grid>
                      <Grid item xs={12} sm={4} md={4} lg={2}>
                      <Typography variant="h6" style={{fontFamily: "Consolas", color: "#FFFFFF"}}> {this.state.queued50} </Typography>
                          <Button style={{padding: 10, margin: 20, borderRadius: 15, backgroundColor: this.state.mixVal == "50" ? "#FFFFFF" : "#000000", border: "1px solid white"}} onClick={() => this.state.mixVal == "50" ? this.setState({mixVal: ""}) : this.setState({mixVal: "50"})}>
                          <Typography variant="h6" style={{fontFamily: "Consolas", color: this.state.mixVal == "50" ? "#000000" : "#FFFFFF"}}> 50 </Typography>
                          {this.state.mixVal == "50" ?
                          <img src="/AlgoBlack.svg" style={{width: 15}} />
                          :
                          <img src="/AlgoWhite.svg" style={{width: 15}} />
                          }
                          </Button>
                      </Grid>
                      <Grid item xs={12} sm={6} md={6} lg={3}>
                      <Typography variant="h6" style={{fontFamily: "Consolas", color: "#FFFFFF"}}> {this.state.queued100} </Typography>
                          <Button style={{padding: 10, margin: 20, borderRadius: 15, backgroundColor: this.state.mixVal == "100" ? "#FFFFFF" : "#000000", border: "1px solid white"}} onClick={() => this.state.mixVal == "100" ? this.setState({mixVal: ""}) : this.setState({mixVal: "100"})}>
                          <Typography variant="h6" style={{fontFamily: "Consolas", color: this.state.mixVal == "100" ? "#000000" : "#FFFFFF"}}> 100 </Typography>
                          {this.state.mixVal == "100" ?
                          <img src="/AlgoBlack.svg" style={{width: 15}} />
                          :
                          <img src="/AlgoWhite.svg" style={{width: 15}} />
                          }
                          </Button>
                      </Grid>
                      <Grid item xs={12} sm={6} md={6} lg={2}>
                      <Typography variant="h6" style={{fontFamily: "Consolas", color: "#FFFFFF"}}> {this.state.queued500} </Typography>
                          <Button style={{padding: 10, margin: 20, borderRadius: 15, backgroundColor: this.state.mixVal == "500" ? "#FFFFFF" : "#000000", border: "1px solid white"}} onClick={() => this.state.mixVal == "500" ? this.setState({mixVal: ""}) : this.setState({mixVal: "500"})}>
                          <Typography variant="h6" style={{fontFamily: "Consolas", color: this.state.mixVal == "500" ? "#000000" : "#FFFFFF"}}> 500 </Typography>
                          {this.state.mixVal == "500" ?
                          <img src="/AlgoBlack.svg" style={{width: 15}} />
                          :
                          <img src="/AlgoWhite.svg" style={{width: 15}} />
                          }
                          </Button>
                      </Grid>
                      
                  </Grid>

                  {this.props.activeAddress == "AL6F3TFPSZPF3BSVUFDNOLMEKUCJJAA7GZ5GF3DN3Q4IVJVNUFK76PQFNE" ? 
                    <>
                    {this.state.mixVal ? 
                      <Button style={{display: "flex", margin: "auto", padding: 10, borderRadius: 15, backgroundColor: "#FFFFFF"}} onClick={() => [this.getReceivers(), this.setState({sendMix: true})]}>
                        <Typography variant="h6" style={{fontFamily: "Consolas", color: "#000000"}}>  Send Mix </Typography>
                      </Button>
                      :
                      null
                    }
                    
                    </>
                  :
                  <>
                    <Typography variant="h6" align="center" style={{fontFamily: "Consolas", color: "#FFFFFF"}}> Fee </Typography>


                    <Grid container align="center" >
                        <Grid item xs={12} sm={6} md={6} lg={6} >

                        <Button style={{padding: 10, margin: 20, borderRadius: 15, backgroundColor: this.state.feeOption == "DC" ? "#FFFFFF" : "#000000", border: "1px solid white"}} onClick={() => this.state.feeOption == "DC" ? this.setState({feeOption: ""}) : this.setState({feeOption: "DC"})}>
                            <Typography variant="h6" style={{fontFamily: "Consolas", color: this.state.feeOption == "DC" ? "#000000" : "#FFFFFF"}}> 1% </Typography>
                            {this.state.feeOption == "DC" ?
                            <img src="/WhiteCoinLogo.svg" style={{width: 15}} />
                            :
                            <img src="/DarkCoinLogo.svg" style={{width: 15}} />
                            }
                            </Button>

                            
                            
                        </Grid>
                        <Grid item xs={12} sm={6} md={6} lg={6}>

                        <Button style={{padding: 10, margin: 20, borderRadius: 15, backgroundColor: this.state.feeOption == "ALGO" ? "#FFFFFF" : "#000000", border: "1px solid white"}} onClick={() => this.state.feeOption == "ALGO" ? this.setState({feeOption: ""}) : this.setState({feeOption: "ALGO"})}>
                            <Typography variant="h6" style={{fontFamily: "Consolas", color: this.state.feeOption == "ALGO" ? "#000000" : "#FFFFFF"}}> 2% </Typography>
                            {this.state.feeOption == "ALGO" ?
                            <img src="/AlgoBlack.svg" style={{width: 15}} />
                            :
                            <img src="/AlgoWhite.svg" style={{width: 15}} />
                            }

                            </Button>
                            
                        </Grid>
                        
                    </Grid>

                    {this.state.mixVal && this.state.feeOption ?
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
                      <Typography variant="h6" style={{fontFamily: "Consolas", color: "#000000"}}> Mix </Typography>
                    </Button>
                  </>
                    :
                    null
                  }

                  {this.state.confirm ? 
                    <>
                    <br />
                    <Typography align="center" variant="h6" style={{fontFamily: "Consolas", color: "#FFFFFF"}}> {this.state.confirm} </Typography>
                    </>
                    :
                    null
                  }
                  
                  
                  <br />
                  <Button style={{display: "flex", margin: "auto", padding: 10, borderRadius: 15, backgroundColor: "#FFFFFF"}} onClick={() => this.Closeout(this.props.activeAddress, contract)}>
                      <Typography variant="h6" style={{fontFamily: "Consolas", color: "#000000"}}> Opt out </Typography>
                  </Button>
                </>
                }
                  </>
                  
                  }

                  

                  
                <br />

              <Button style={{display: "flex", margin: "auto", padding: 10, borderRadius: 15, backgroundColor: "#FFFFFF"}} onClick={() => window.open("https://algoexplorer.io/application/" + contract)}>
                  <Typography variant="h6" style={{fontFamily: "Consolas", color: "#000000"}}> View Contract </Typography>
              </Button>

              <br />

              <Button style={{display: "flex", margin: "auto", padding: 10, borderRadius: 15, backgroundColor: "#FFFFFF"}} onClick={() => window.open("https://algoexplorer.io/address/43EVULWFT4RU2H7EZH377SAVQJSJO5NZP37N3Y5DZ7PGUXOETKW7VWDIOA")}>
                  <Typography variant="h6" style={{fontFamily: "Consolas", color: "#000000"}}> View Address</Typography>
              </Button>
                
              {this.state.sendMix ? 
                <Modal 
                open={true} 
                onClose={() => this.setState({sendMix: false})}
                onClick={() => this.setState({sendMix: false})}
                style={{
                    overflowY: "auto",
                    overflowX: "hidden"
                }}>
                    <Card style={{backgroundColor: "#000000"}}>
                    <Grid container>
                      <Grid item xs={6} sm={6} style={{border: "1px solid white",  padding: 30}}>
                        <Typography variant="h6" style={{fontFamily: "Consolas", color: "#FFFFFF"}}> Firebase </Typography>
                      </Grid>
                      <Grid item xs={6} sm={6} style={{border: "1px solid white",  padding: 30}}>
                        <Typography variant="h6" style={{fontFamily: "Consolas", color: "#FFFFFF"}}> Contract </Typography>
                      </Grid>
                     {this.state.trans.length > 0 ?
                        this.state.trans.map((tran, index) => {
                          return (
                            <>
                              <Grid item xs={6} sm={6} style={{border: "1px solid white",  padding: 30}}>
                                <Typography variant="h6" style={{fontFamily: "Consolas", color: "#FFFFFF"}}> Sender: {tran.sender.substring(0,10)} </Typography>
                                <Typography variant="h6" style={{fontFamily: "Consolas", color: "#FFFFFF"}}> Confirmed: {tran.confirmedRound} </Typography>
                              </Grid>
                              {contractTrans.length > 0 ?
                                <Grid item xs={6} sm={6} style={{border: "1px solid white",  padding: 30}}>
                                  <Typography variant="h6" style={{fontFamily: "Consolas", color: "#FFFFFF"}}> Sender: {contractTrans[index].sender.substring(0,10)} </Typography>
                                  <Typography variant="h6" style={{fontFamily: "Consolas", color: "#FFFFFF"}}> Confirmed: {contractTrans[index].confirmedRound} </Typography>
                                </Grid>
                                :
                                null
                              }
                              
                              </>
                          )
                        })
                        :
                        null
                      }
                      </Grid>

                      <Button style={{padding: 10, margin: 20, borderRadius: 15, backgroundColor: "#FFFFFF", border: "1px solid white"}} onClick={() => this.sendMix()}>
                          <Typography variant="h6" style={{fontFamily: "Consolas", color: "#000000"}}> Send Mix </Typography>
                        </Button>
                    </Card>
                
                </Modal>
                
                    :
                    null
                }
                
            </div>
        )
    }
    
}