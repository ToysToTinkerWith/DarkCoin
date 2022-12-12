import React from "react"

import MyAlgo from '@randlabs/myalgo-connect';

import { doc, setDoc, getDoc  } from "firebase/firestore"; 

//43EVULWFT4RU2H7EZH377SAVQJSJO5NZP37N3Y5DZ7PGUXOETKW7VWDIOA

import { PeraWalletConnect } from "@perawallet/connect";

const peraWallet = new PeraWalletConnect();

import algosdk from "algosdk"


import { Grid, Typography, Button, TextField, Modal, Card } from "@mui/material"

import muisty from "../../../muistyles.module.css"

export default class Vote extends React.Component { 

    constructor(props) {
        super(props);
        this.state = {
            proposals: [
                {proposal: "This is a proposal with some extra added on to it to see how the app handles proposals of long length.",
                }
            ],
            daoNFTs: [],
            confirm: ""
            
        };
        this.handleChange = this.handleChange.bind(this)
        this.vote = this.vote.bind(this)
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

            let response = await fetch('/api/getAllVotes1', {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                }
                
                  
              });
            
            let session = await response.json()

            console.log(session)
            
            let assetsDC = await indexerClient.lookupAccountCreatedAssets("AL6F3TFPSZPF3BSVUFDNOLMEKUCJJAA7GZ5GF3DN3Q4IVJVNUFK76PQFNE")
            .limit(1000).do();

           console.log(assetsDC)
  
            assetsDC.assets.forEach(async (asset) => {
              if(asset.params["unit-name"].substring(0, 4) == "DCGV") {
                this.setState(prevState => ({
                  daoNFTs: [...prevState.daoNFTs, asset.index]
                }))
              }
              
            })
  
            let assetsLen = assetsDC.assets.length
            let assetsNext = assetsDC["next-token"]

            console.log(assetsLen)
  
            while (assetsLen == 1000) {
  
                assetsDC = await indexerClient.lookupAccountCreatedAssets("AL6F3TFPSZPF3BSVUFDNOLMEKUCJJAA7GZ5GF3DN3Q4IVJVNUFK76PQFNE").nextToken(assetsNext)
                .limit(1000).do();
  
              assetsDC.assets.forEach(async (asset) => {
                if(asset.params["unit-name"].substring(0, 4) == "DCGV") {
                    this.setState(prevState => ({
                      daoNFTs: [...prevState.daoNFTs, asset.index]
                    }))
                  }
                
              })
  
              assetsLen = assetsDC.assets.length
              assetsNext = assetsDC["next-token"]
  
  
            }


  
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


      async vote() {

        const indexerClient = new algosdk.Indexer('', 'https://algoindexer.algoexplorerapi.io', '');

        let response = await indexerClient.lookupApplications(885581567).do();

        let globalState = response.application.params["global-state"]

        globalState.forEach((keyVal) => {
          if (atob(keyVal.key) == "queued5") {
            queued5 = keyVal.value.uint
          }
          
        })

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
      

    render() {

      let contract = 885581567  

    console.log(this.state)

        return (
            <div>
              <br />
              <Typography color="secondary" variant="h6" align="center"> Proposals </Typography>

              {this.state.proposals.length > 0 ? 
                this.state.proposals.map((proposal, index) => {
                    return (
                        <div key={index} style={{border: "1px solid white", borderRadius: 15, padding: 20, margin: 20 }}>
                            <Typography color="secondary" variant="h6" align="center"> {proposal.proposal} </Typography>
                            <br />

                            <div style={{display: "flex", margin: "auto"}}>
                            <Button className={muisty.mixerbtn} style={{backgroundColor: this.state["vote" + index] == true ? "#FFFFFF" : "#000000", border: "1px solid white", display: "flex", margin: "auto"}} onClick={() => this.state["vote" + index] == true ? this.setState({["vote" + index]: "none"}) : this.setState({["vote" + index]: true})}>
                                <Typography color="secondary" variant="h6" style={{color: this.state["vote" + index] == true ? "#000000" : "#FFFFFF"}}> Accept </Typography>
                            </Button> 

                            <Button className={muisty.mixerbtn} style={{backgroundColor: this.state["vote" + index] == false ? "#FFFFFF" : "#000000", border: "1px solid white", display: "flex", margin: "auto"}} onClick={() => this.state["vote" + index] == false ? this.setState({["vote" + index]: "none"}) : this.setState({["vote" + index]: false})}>
                                <Typography color="secondary" variant="h6" style={{color: this.state["vote" + index] == false ? "#000000" : "#FFFFFF"}}> Reject </Typography>
                            </Button> 

                            </div>

                            <Typography color="secondary" variant="subtitle1" align="center"> Comment </Typography>
                            
                               

                            <TextField                
                                onChange={this.handleChange}
                                value={this.state.proposal}
                                multiline
                                type="text"
                                label=""
                                name="proposal"
                                autoComplete="false"
                                InputProps={{ style: { color: "black" } }}
                            
                                style={{
                                color: "black",
                                background: "white",
                                borderRadius: 15,
                                display: "flex",
                                margin: "auto",
                                width: "80%"
                            
                                }}
                            />
                            <br />

                            <Button className={muisty.mixerbtn} style={{backgroundColor: "#FFFFFF", border: "1px solid white", display: "flex", margin: "auto"}} onClick={() => this.vote()}>
                                <Typography color="secondary" variant="h6" style={{color: "#000000"}}> Vote </Typography>
                            </Button> 
                        </div>
                    )
                })
                :
                null
            }
                 
                
              
            </div>
        )
    }
    
}