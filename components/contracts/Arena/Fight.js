import React from "react"


//43EVULWFT4RU2H7EZH377SAVQJSJO5NZP37N3Y5DZ7PGUXOETKW7VWDIOA

import { PeraWalletConnect } from "@perawallet/connect";

const peraWallet = new PeraWalletConnect();

import algosdk from "algosdk"

import { Grid, Typography, Button, TextField } from "@mui/material"

import DisplayChar from "./DisplayChar";
import DisplayBat from "./DisplayBat";

export default class Fight extends React.Component { 

    constructor(props) {
        super(props);
        this.state = {
            battles: [],
            wager: 10000,
            charSel: null,
            charSelect: null,
            confirm: ""
        };
        this.handleChange = this.handleChange.bind(this)
        this.startBattle = this.startBattle.bind(this)

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
      
        const indexerClient = new algosdk.Indexer(token, 'https://mainnet-algorand.api.purestake.io/idx2', '');

        let global = await indexerClient.lookupApplications(this.props.contract).do();

        let globalState = global.application.params["global-state"]

        let battles = []

        globalState.forEach((keyVal) => {
            if (atob(keyVal.key).length == 58) {
                let addr = atob(keyVal.key)
                let wager = keyVal.value.uint
                battles.push({addr: addr, wager: wager})
            }
        })

        this.setState({
            battles: battles
        })



        if (this.props.activeAddress) {

            let response = await indexerClient.lookupAccountAppLocalStates(this.props.activeAddress).do();
            response["apps-local-states"].forEach((localstate) => {
                if (localstate.id == this.props.contract) {
                    localstate["key-value"].forEach((kv) => {
                        if (atob(kv.key) == "assetId") {
                            this.setState({
                                charSel: kv.value.uint
                            })
                        }
                    })
                }
            })

        }

        
 
          
    }


      handleChange(event) {
        const target = event.target;
        let value = target.type === 'checkbox' ? target.checked : target.value;
        const name = target.name;

        this.setState({
            [name]: value
            });

        
    
        
      }

      async startBattle() {

        const token = {
          'X-API-Key': process.env.indexerKey
      }

      const client = new algosdk.Algodv2(token, 'https://mainnet-algorand.api.purestake.io/ps2', '')
      
        let params = await client.getTransactionParams().do();

        console.log(this.state.wager)

          let wtxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
            this.props.activeAddress, 
            "VWNGMYLU4LGHU2Z2BYHP54IUNU3GJROHG2LOOPFH5JAES3K7W4TBODC6TU", 
            undefined,
            undefined,
            Number(this.state.wager) * 1000000, 
            undefined,
            1088771340,
            params
          );

          let ftxn = algosdk.makePaymentTxnWithSuggestedParams(
            this.props.activeAddress, 
            "VWNGMYLU4LGHU2Z2BYHP54IUNU3GJROHG2LOOPFH5JAES3K7W4TBODC6TU", 
            500000, 
            undefined,
            undefined,
            params
          );

         
          const appArgs = []
          appArgs.push(
            new Uint8Array(Buffer.from("start")),
            new Uint8Array(Buffer.from(this.props.activeAddress))

          )

          const accounts = [this.props.activeAddress]
          const foreignApps = []
            
          const foreignAssets = []

          const boxes = []
          
          let atxn = algosdk.makeApplicationNoOpTxn(this.props.activeAddress, params, this.props.contract, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
          
          let txns = [wtxn, ftxn, atxn]

          let txgroup = algosdk.assignGroupID(txns)

          let multipleTxnGroups
  
          if (this.props.wallet == "pera") {
  
            try {
              multipleTxnGroups = [
                {txn: wtxn, signers: [this.props.activeAddress]},
                {txn: ftxn, signers: [this.props.activeAddress]},
                {txn: atxn, signers: [this.props.activeAddress]}
              ];
  
              const signedTxn = await peraWallet.signTransaction([multipleTxnGroups]) 

              let txId = await client.sendRawTransaction(signedTxn).do();

              this.setState({
                confirm: "Sending Transaction..."
              })

              let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);


              this.setState({
                confirm: "Transaction Confirmed, Battle Init"
              })
    
              
            }
  
            catch (error) {
              this.setState({
                confirm: "Transaction Denied"
              })
              this.props.sendDiscordMessage("Arena/Fight", props.activeAddress, error)
            }
            
  
          }
  
          else if (this.props.wallet == "myalgo") {

            try {

            multipleTxnGroups = [
              wtxn.toByte(),
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

            this.setState({
              confirm: "Transaction Confirmed, Battle Init"
            })

          }

          catch (error) {
            this.setState({
              confirm: "Transaction Denied"
            })
            this.props.sendDiscordMessage("Arena/Character", props.activeAddress, error)
          }
  
          
        }

      }


    render() {

        return (
            <div>

                {this.state.charSel ?
                    <>
                        <Typography color="secondary" align="center" variant="h6"> My Char </Typography>
                        <div style={{display: "flex", margin: "auto", width: "50%", maxWidth: 300}}>
                            <DisplayChar contract={this.state.contract} nftId={this.state.charSel} activeAddress={this.props.activeAddress} wallet={this.props.wallet} setNft={(nftId) => this.setState({charSelect: nftId})} sendErrorMessage={this.sendErrorMessage}/>
                        </div>
                        <br />

                        <Typography color="secondary" align="center" variant="h6"> Start Battle </Typography>

                        <br />
                 
                        <TextField                
                            onChange={this.handleChange}
                            value={this.state.wager}
                            multiline
                            type="number"
                            label=""
                            name="wager"
                            autoComplete="false"
                            InputProps={{ style: { color: "black" } }}
                          
                            style={{
                            color: "black",
                            background: "white",
                            borderRadius: 15,
                            display: "flex",
                            margin: "auto",
                            width: "50%"
                          
                            }}
                          />
                    <br />
                    {this.state.wager >= 10000 ?
                    <Button variant="contained" color="secondary" style={{display: "flex", margin: "auto"}} onClick={() => this.startBattle()}>
                        <Typography color="primary" variant="h6" align="center"> Wager {Number(this.state.wager).toLocaleString("en-US")} </Typography>
                        <img src="invDC.svg" style={{display: "flex", margin: "auto", width: 50, padding: 10}} />
                        <Typography  variant="h6"> + 0.5 </Typography>
                        <img src="AlgoBlack.svg" style={{display: "flex", margin: "auto", width: 40, padding: 10}} />
                    </Button>
                    :
                    null
                    }
                    <br />
                    <Typography color="secondary" align="center" variant="h6"> {this.state.confirm} </Typography>
                    <br />
                    </>
                    :
                    <Typography color="secondary" align="center" variant="h6"> Must select a character to battle </Typography>

                }
                <br />
                <Typography color="secondary" align="center" variant="h6"> Join Battle </Typography>
                <br />
                {this.state.battles.length > 0 ? 
                this.state.battles.map((battle, index) => {
                    return (
                      <div key={index}>
                        <DisplayBat address={battle.addr} wager={battle.wager} contract={this.props.contract} activeAddress={this.props.activeAddress} wallet={this.props.wallet} sendErrorMessage={this.sendErrorMessage} />
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