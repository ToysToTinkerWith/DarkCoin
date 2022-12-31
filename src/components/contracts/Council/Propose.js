import React from "react"

import MyAlgo from '@randlabs/myalgo-connect';

//43EVULWFT4RU2H7EZH377SAVQJSJO5NZP37N3Y5DZ7PGUXOETKW7VWDIOA

import { PeraWalletConnect } from "@perawallet/connect";

const peraWallet = new PeraWalletConnect();

import algosdk from "algosdk"


import { Grid, Typography, Button, TextField, Modal, Card } from "@mui/material"

import muisty from "../../../muistyles.module.css"

export default class Propose extends React.Component { 

    constructor(props) {
        super(props);
        this.state = {
            proposal: "",
            confirm: ""
            
        };
        this.handleChange = this.handleChange.bind(this)
        this.propose = this.propose.bind(this)
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

          let address = await algosdk.getApplicationAddress(970700116)

        console.log(address)
 


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


      async propose() {

        //let address = await algosdk.getApplicationAddress(970700116)

        const indexerClient = new algosdk.Indexer('', 'https://algoindexer.algoexplorerapi.io', '');

        let response = await indexerClient.lookupApplications(970700116).do();

        let globalState = response.application.params["global-state"]

        let proposalNum

        globalState.forEach((keyVal) => {
          if (atob(keyVal.key) == "proposalNum") {
            proposalNum = keyVal.value.uint
          }
          
        })

        console.log(proposalNum)

        const client = new algosdk.Algodv2("", "https://node.algoexplorerapi.io/", "")

        let params = await client.getTransactionParams().do();

         let ftxn1 = algosdk.makePaymentTxnWithSuggestedParams(
          this.props.activeAddress, 
          "H3MZAN32IQ25E7NM4ABINBV24V5BWGCOS2Z3DXEW6ULPBBPJVY7VUTGBQM", 
          1000000, 
          undefined,
          undefined,
          params
        );

          let ftxn2 = algosdk.makeAssetTransferTxnWithSuggestedParams(
            this.props.activeAddress, 
            "H3MZAN32IQ25E7NM4ABINBV24V5BWGCOS2Z3DXEW6ULPBBPJVY7VUTGBQM", 
            undefined,
            undefined,
            this.state.proposal.length * 50, 
            undefined,
            601894079,
            params
          );

         
          const appArgs = []
          appArgs.push(
            new Uint8Array(Buffer.from("propose")),
            new Uint8Array(Buffer.from(this.state.proposal)),
            new Uint8Array(Buffer.from(String(proposalNum)))
            
          )

          console.log(appArgs)

          const accounts = []
          const foreignApps = []
            
          const foreignAssets = []

          console.log(Buffer.from("Proposal" + String(proposalNum)))

          let proposalBox = new Uint8Array(Buffer.from("Proposal" + String(proposalNum)))
          let votesBox = new Uint8Array(Buffer.from("Votes" + String(proposalNum)))

          const boxes = [{appIndex: 0, name: proposalBox}, {appIndex: 0, name: proposalBox}, {appIndex: 0, name: votesBox}, {appIndex: 0, name: votesBox}]
          
          let atxn = algosdk.makeApplicationNoOpTxn(this.props.activeAddress, params, 970700116, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
          
          console.log(atxn)
          let txns = [ftxn1, ftxn2, atxn]

          let txgroup = algosdk.assignGroupID(txns)

          let multipleTxnGroups

          if (false) {
            const userMnemonic = ""
            const userAccout =  algosdk.mnemonicToSecretKey(userMnemonic)
            // Sign the transaction
            let signedTxn1 = ftxn1.signTxn(userAccout.sk);
            let signedTxn2 = ftxn2.signTxn(userAccout.sk);
            let signedTxn3 = atxn.signTxn(userAccout.sk);

            let signed = []
            signed.push( signedTxn1 )
            signed.push( signedTxn2 )
            signed.push( signedTxn3 )
        
            // Submit the transaction
            await client.sendRawTransaction(signed).do()                           
                
        
          }
  
          else if (this.props.wallet == "pera") {
  
            try {
              multipleTxnGroups = [
                {txn: ftxn1, signers: [this.props.activeAddress]},
                {txn: ftxn2, signers: [this.props.activeAddress]},
                {txn: atxn, signers: [this.props.activeAddress]}
              ];
  
              const signedTxn = await peraWallet.signTransaction([multipleTxnGroups]) 

              let txId = await client.sendRawTransaction(signedTxn).do();

              this.setState({
                confirm: "Sending Transaction..."
              })

              let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);


              this.setState({
                confirm: "Transaction Confirmed, Proposal Successfully Sent"
              })
    
              
            }
  
            catch (error) {
              console.log(error)
            }
            
  
          }
  
          else if (this.props.wallet == "myalgo") {

            try {

            multipleTxnGroups = [
              ftxn1.toByte(),
              ftxn2.toByte(),
              atxn.toByte()
            ];

            const myAlgoWallet = new MyAlgo()

            console.log(multipleTxnGroups)

            const signedTxn = await myAlgoWallet.signTransaction(multipleTxnGroups);

            let txId = await client.sendRawTransaction([signedTxn[0].blob, signedTxn[1].blob, signedTxn[2].blob]).do();

            this.setState({
              confirm: "Sending Transaction..."
            })

            let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);        

            this.setState({
              confirm: "Transaction Confirmed, Proposal Successfully Sent"
            })

          }

          catch (error) {
            console.log(error)
          }
  
          
        }

        }
      

    render() {

        return (
            <div>
              <br />
              <Typography color="secondary" variant="h6" align="center"> Propose new feature(s) </Typography>
              <br />
                 
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
                    
          

                

                {this.props.activeAddress ? 
                
                <Button className={muisty.contractbtn} onClick={() => this.propose()}>
                <Typography  variant="h6"> Propose {this.state.proposal.length * 50} </Typography>
                <img src="invDC.svg" style={{display: "flex", margin: "auto", width: 50, padding: 10}} />


                </Button>
                    
                  
                  :
                  <Button className={muisty.contractbtn} onClick={() => window.scrollTo(0, 0)}>
                      <Typography  variant="h6"> Connect Wallet </Typography>
                  </Button>
                }
    
                <br />
                
            </div>
        )
    }
    
}