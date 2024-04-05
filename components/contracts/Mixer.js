import React from "react"

import Head from "next/head"

import { db } from "../../Firebase/FirebaseInit"

import { doc, setDoc, getDoc  } from "firebase/firestore"; 

//43EVULWFT4RU2H7EZH377SAVQJSJO5NZP37N3Y5DZ7PGUXOETKW7VWDIOA

import { PeraWalletConnect } from "@perawallet/connect";

const peraWallet = new PeraWalletConnect();

import algosdk from "algosdk"


import { Grid, Typography, Button, TextField, Modal, Card } from "@mui/material"


export default class Mixer extends React.Component { 

    constructor(props) {
        super(props);
        this.state = {
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
            confirm: "",
            contract: 1100820907
            
        };
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


          const token = {
            'X-API-Key': process.env.indexerKey
        }
      
        const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)

        (async () => {

          let response = await indexerClient.lookupApplications(this.state.contract).do();

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



        })().catch(e => {
            console.error(e);
            console.trace();
        })

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

        const token = {
          'X-API-Key': process.env.indexerKey
      }

      const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)

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
          
          let txn = algosdk.makeApplicationNoOpTxn(this.props.activeAddress, params, this.state.contract, appArgs, chunk, foreignApps, foreignAssets);
          
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

const token = {
            'X-API-Key': process.env.indexerKey
        }
      
        const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)

        let appState = await indexerClient.lookupApplications(this.state.contract).do();

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

        if (this.state.mixVal == ""){
          this.setState({confirm: "Select an amount to send"})
        }

        else if (this.state.feeOption == ""){
          this.setState({confirm: "Select a fee option"})
        }

        else if (this.state.receiver.length != 58){
          this.setState({confirm: "Choose a valid receiving address"})
        }

        else {
        
        let queued5
        let queued20
        let queued50
        let queued100
        let queued500
        

const token = {
            'X-API-Key': process.env.indexerKey
        }
      
        const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)

        let response = await indexerClient.lookupApplications(this.state.contract).do();

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
            queued100 = keyVal.value.uint
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
    

        const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)

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
              if (asset["asset-id"] == "1088771340") {
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

            ftxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
              this.props.activeAddress, 
              "AL6F3TFPSZPF3BSVUFDNOLMEKUCJJAA7GZ5GF3DN3Q4IVJVNUFK76PQFNE", 
              undefined,
              undefined,
              fee, 
              undefined,
              1088771340,
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
          
          let atxn = algosdk.makeApplicationNoOpTxn(this.props.activeAddress, params, this.state.contract, appArgs, accounts, foreignApps, foreignAssets);
          
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
                confirm: "Sending Transaction..."
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
              this.props.sendDiscordMessage("Mixer", props.activeAddress, error)
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
              confirm: "Sending Transaction..."
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

        

        
      
      }

      

    render() {

      let contract = this.state.contract  

      let contractTrans = this.state.contractTrans.reverse()

        return (
            <div>
              
              <Typography color="secondary" variant="h6" align="center"> Select amount to send: </Typography>
              <br />
                  <Grid container align="center" spacing={3}>
                      <Grid item xs={12} sm={4} md={4} lg={2} >
                      <Typography color="secondary" variant="h6"> {this.state.queued5} </Typography>

                          <Button style={{backgroundColor: this.state.mixVal == "5" ? "#FFFFFF" : "#000000", border: "1px solid white", borderRadius: 15, padding: 10}} onClick={() => this.state.mixVal == "5" ? this.setState({mixVal: ""}) : this.setState({mixVal: "5"})}>
                          <Typography  variant="h6" style={{color: this.state.mixVal == "5" ? "#000000" : "#FFFFFF"}}> 5 </Typography>
                          {this.state.mixVal == "5" ?
                          <img style={{width: 15}} src="/AlgoBlack.svg" />
                          :
                          <img style={{width: 15}} src="/AlgoWhite.svg" />
                          }

                          </Button>
                          
                      </Grid>
                      <Grid item xs={12} sm={4} md={4} lg={3}>
                      <Typography color="secondary" variant="h6"> {this.state.queued20} </Typography>
                          <Button style={{backgroundColor: this.state.mixVal == "20" ? "#FFFFFF" : "#000000", border: "1px solid white", borderRadius: 15, padding: 10}} onClick={() => this.state.mixVal == "20" ? this.setState({mixVal: ""}) : this.setState({mixVal: "20"})}>
                          <Typography color="secondary" variant="h6" style={{color: this.state.mixVal == "20" ? "#000000" : "#FFFFFF"}}> 20 </Typography>
                          {this.state.mixVal == "20" ?
                          <img style={{width: 15}} src="/AlgoBlack.svg" />
                          :
                          <img style={{width: 15}} src="/AlgoWhite.svg" />
                          }
                          </Button>
                      </Grid>
                      <Grid item xs={12} sm={4} md={4} lg={2}>
                      <Typography color="secondary" variant="h6"> {this.state.queued50} </Typography>
                          <Button  style={{backgroundColor: this.state.mixVal == "50" ? "#FFFFFF" : "#000000", border: "1px solid white", borderRadius: 15, padding: 10}} onClick={() => this.state.mixVal == "50" ? this.setState({mixVal: ""}) : this.setState({mixVal: "50"})}>
                          <Typography color="secondary" variant="h6" style={{color: this.state.mixVal == "50" ? "#000000" : "#FFFFFF"}}> 50 </Typography>
                          {this.state.mixVal == "50" ?
                          <img style={{width: 15}} src="/AlgoBlack.svg" />
                          :
                          <img style={{width: 15}} src="/AlgoWhite.svg" />
                          }
                          </Button>
                      </Grid>
                      <Grid  item xs={12} sm={6} md={6} lg={3}>
                      <Typography color="secondary" variant="h6"> {this.state.queued100} </Typography>
                          <Button  style={{backgroundColor: this.state.mixVal == "100" ? "#FFFFFF" : "#000000", border: "1px solid white", borderRadius: 15, padding: 10}} onClick={() => this.state.mixVal == "100" ? this.setState({mixVal: ""}) : this.setState({mixVal: "100"})}>
                          <Typography color="secondary" variant="h6" style={{color: this.state.mixVal == "100" ? "#000000" : "#FFFFFF"}}> 100 </Typography>
                          {this.state.mixVal == "100" ?
                          <img style={{width: 15}} src="/AlgoBlack.svg" />
                          :
                          <img style={{width: 15}} src="/AlgoWhite.svg" />
                          }
                          </Button>
                      </Grid>
                      <Grid  item xs={12} sm={6} md={6} lg={2}>
                      <Typography color="secondary" variant="h6"> {this.state.queued500} </Typography>
                          <Button  style={{backgroundColor: this.state.mixVal == "500" ? "#FFFFFF" : "#000000", border: "1px solid white", borderRadius: 15, padding: 10}} onClick={() => this.state.mixVal == "500" ? this.setState({mixVal: ""}) : this.setState({mixVal: "500"})}>
                          <Typography color="secondary" variant="h6" style={{color: this.state.mixVal == "500" ? "#000000" : "#FFFFFF"}}> 500 </Typography>
                          {this.state.mixVal == "500" ?
                          <img style={{width: 15}} src="/AlgoBlack.svg" />
                          :
                          <img style={{width: 15}} src="/AlgoWhite.svg" />
                          }
                          </Button>
                      </Grid>
                      
                  </Grid>

                  <br />

                  <Typography color="secondary" variant="h6" align="center"> Select fee options: </Typography>

                  <br />
                    <Grid container align="center" spacing={3}>
                        <Grid  item xs={12} sm={6} md={6} lg={6} >

                        <Button  style={{backgroundColor: this.state.feeOption == "DC" ? "#FFFFFF" : "#000000", border: "1px solid white", borderRadius: 15, padding: 10}} onClick={() => this.state.feeOption == "DC" ? this.setState({feeOption: ""}) : this.setState({feeOption: "DC"})}>
                            <Typography color="secondary" variant="h6" style={{color: this.state.feeOption == "DC" ? "#000000" : "#FFFFFF"}}> 1% </Typography>
                            {this.state.feeOption == "DC" ?
                            <img style={{width: 15}} src="/DarkCoinLogo.png" />
                            :
                            <img style={{width: 15}} src="/WhiteCoinLogo.svg" />
                            }
                            </Button>

                            
                            
                        </Grid>
                        <Grid  item xs={12} sm={6} md={6} lg={6}>

                        <Button  style={{backgroundColor: this.state.feeOption == "ALGO" ? "#FFFFFF" : "#000000", border: "1px solid white", borderRadius: 15, padding: 10}} onClick={() => this.state.feeOption == "ALGO" ? this.setState({feeOption: ""}) : this.setState({feeOption: "ALGO"})}>
                            <Typography color="secondary" variant="h6" style={{color: this.state.feeOption == "ALGO" ? "#000000" : "#FFFFFF"}}> 2% </Typography>
                            {this.state.feeOption == "ALGO" ?
                            <img style={{width: 15}} src="/AlgoBlack.svg" />
                            :
                            <img style={{width: 15}} src="/AlgoWhite.svg" />
                            }

                            </Button>
                            
                        </Grid>
                        
                    </Grid>

                    <br />

                    <Typography color="secondary" variant="h6" align="center"> Receiving Wallet: </Typography>

                    <br />

                    

                    <TextField                /* Leaving all TextField styling inline in jsx */
                        onChange={this.handleChange}
                        value={this.state.receiver}
                        type="text"
                        label=""
                        name="receiver"
                        autoComplete="false"
                        InputProps={{ style: { color: "black" } }}
                        sx={{input: {
                          color: "black",
                          background: "white",
                          borderRadius: 15
                        }, "& .MuiOutlinedInput-root":{"& > fieldset": {border: '2px solid #FFFFFF', borderRadius: 15}}}}
                        style={{
                        display: "flex",
                        margin: "auto",
                        width: "80%"
                        }}
                      />
                       <br />
                    
          

                

                {this.props.activeAddress ? 
                  <>
                    {this.props.activeAddress == "AL6F3TFPSZPF3BSVUFDNOLMEKUCJJAA7GZ5GF3DN3Q4IVJVNUFK76PQFNE" ? 
                      <div style={{display: "grid", margin: "auto", width: 200}}>
                        <Button variant="contained" color="secondary" onClick={() => [this.getReceivers(), this.setState({sendMix: true})]}>
                          <img style={{}} src="invMixer.svg" />
                          <Typography  variant="h6">  Send Mix </Typography>
                        </Button>
                      </div>
                    :
                    <>
  
                    {this.state.confirm ? 
                      <>
                      <Typography color="secondary" align="center" variant="h6"> {this.state.confirm} </Typography>
                      <br />
                      </>
                      :
                      null
                    }
                    
                    <Button variant="contained" color="secondary" style={{display: "flex", margin: "auto", padding: 10}} onClick={() => this.mix()}>
                      <img style={{paddingRight: 10}} src="invMixer.svg" />
                      <Typography variant="h6"> Mix </Typography>
                    </Button>
                    
                  </>
                  }
                    </>
                    
                    
                  
                  :
                  <Button  onClick={() => window.scrollTo(0, 0)}>
                      <Typography  variant="h6"> Connect Wallet </Typography>
                  </Button>
                }

                

                  

                  
                <br />

                
              {this.state.sendMix ? 
                <Modal 
                open={true} 
                onClose={() => this.setState({sendMix: false})}
                onClick={() => this.setState({sendMix: false})}>
                    <Card >
                    <Grid container>
                      <Grid item xs={6} sm={6}>
                        <Typography variant="h6"> Firebase </Typography>
                      </Grid>
                      <Grid item xs={6} sm={6}>
                        <Typography variant="h6"> Contract </Typography>
                      </Grid>
                     {this.state.trans.length > 0 ?
                        this.state.trans.map((tran, index) => {
                          return (
                            <>
                              <Grid item xs={6} sm={6}>
                                <Typography  variant="h6"> Sender: {tran.sender.substring(0,10)} </Typography>
                                <Typography variant="h6"> Confirmed: {tran.confirmedRound} </Typography>
                              </Grid>
                              {contractTrans.length > 0 ?
                                <Grid item xs={6} sm={6}>
                                  <Typography  variant="h6"> Sender: {contractTrans[index].sender.substring(0,10)} </Typography>
                                  <Typography  variant="h6"> Confirmed: {contractTrans[index].confirmedRound} </Typography>
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

                      <Button  onClick={() => this.sendMix()}>
                          <Typography  variant="h6"> Send Mix </Typography>
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