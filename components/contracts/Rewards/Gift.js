import React from "react"

//43EVULWFT4RU2H7EZH377SAVQJSJO5NZP37N3Y5DZ7PGUXOETKW7VWDIOA

import { PeraWalletConnect } from "@perawallet/connect";

const peraWallet = new PeraWalletConnect();

import algosdk from "algosdk"

import { Typography, Button, TextField, Grid } from "@mui/material"

export default class Gift extends React.Component { 

    constructor(props) {
        super(props);
        this.state = {
            proposal: "",
            confirm: ""
            
        };
        this.handleChange = this.handleChange.bind(this)
        this.gift = this.gift.bind(this)
        this.updateDiscord = this.updateDiscord.bind(this)
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

        const client = new algosdk.Algodv2(token, 'https://mainnet-algorand.api.purestake.io/ps2', '')

          let status = await client.status().do();

          this.setState({
            currRound: status["last-round"]
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


      async gift(asset, amount, receiver) {

        console.log(this.props.activeAddress)
        console.log(receiver)
        console.log(asset)
        console.log(amount)

       

        try{

            let appArgs = []
            appArgs.push(
              new Uint8Array(Buffer.from("optin"))
              
              
            )

        const token = {
            'X-API-Key': process.env.indexerKey
        }

        const client = new algosdk.Algodv2(token, 'https://mainnet-algorand.api.purestake.io/ps2', '')

          let params = await client.getTransactionParams().do()
        
          let accounts = []
          let foreignApps = []
            
          let foreignAssets = [asset]
        
          
          let otxn = algosdk.makeApplicationNoOpTxn(this.props.activeAddress, params, 1103370576, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined);
        
        
        
          
        let stxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
            this.props.activeAddress, 
            "VQY34GYVYTD3Z5NNMSQGHCJTO6XA4URSFSCXOZOEFZSCNPSGLGA6Y72K6Y", 
            undefined, 
            undefined,
            amount,  
            undefined, 
            asset, 
            params
          );
            
             appArgs = []
            appArgs.push(
              new Uint8Array(Buffer.from("addboxNFT")),
              algosdk.encodeUint64(amount)
              
              
            )
        
           accounts = [receiver]
           foreignApps = []
            
           foreignAssets = [asset]
        
           let encoded = algosdk.encodeUint64(asset);
        
          
          const pk = algosdk.decodeAddress(receiver);
          const addrArray = pk.publicKey
          console.log(addrArray);
        
          let accountBox = new Uint8Array([...addrArray, ...encoded])
          console.log(accountBox)
        
          const boxes = [{appIndex: 0, name: accountBox}]
        
          
          let txn = algosdk.makeApplicationNoOpTxn(this.props.activeAddress, params, 1103370576, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
        
        
        
            let txId = txn.txID().toString();
            // Sign the transaction
            console.log("Signed transaction with txID: %s", txId);
        
            let txns = [otxn, stxn, txn]
        
            let txgroup = algosdk.assignGroupID(txns)
        
        
            
        
        
            let multipleTxnGroups = [
                {txn: otxn, signers: [this.props.activeAddress]},
                {txn: stxn, signers: [this.props.activeAddress]},
                {txn: txn, signers: [this.props.activeAddress]}
              ];
  
              const signedTxn = await peraWallet.signTransaction([multipleTxnGroups]) 

              txId = await client.sendRawTransaction(signedTxn).do();

              this.setState({
                confirm: "Sending Transaction..."
              })

              let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);


              this.setState({
                confirm: "Transaction Confirmed, Gift Successfully Sent"
              })

              this.updateDiscord()
        
        
     
          }catch(err){
            this.props.sendDiscordMessage("Rewards/Gift", props.activeAddress, error)
          }
         
  
  
          
        
      

    }

    async updateDiscord() {

      

      let embeds = []

      embeds.push({
          "title": "A new proposal has been made!",
          "color": 0
      })
      

      embeds.push({
          "description": this.state.proposal,
          "color": 16777215
      })


      const response = await fetch(process.env.discordCouncilWebhook, {
          method: "POST",
          body: JSON.stringify({
              username: "Council Propose",
              embeds: embeds
          }),
          headers: {
            "Content-Type": "application/json",
          },
        });



      
  }
      

    render() {

        return (
            <div style={{border: "1px solid white", margin: 20, borderRadius: 15}}>
              <br />
              <Typography color="secondary" variant="h6" align="center"> Send a gift </Typography>
              <br />

              <Grid container>
                <Grid item xs={12} sm={6} md={6}>
                <Typography color="secondary" variant="h6" align="center"> ASA ID </Typography>
                <TextField                
                    onChange={this.handleChange}
                    value={this.state.asset}
                    multiline
                    type="number"
                    label=""
                    name="asset"
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
                </Grid>
               <Grid item xs={12} sm={6} md={6}>
               <Typography color="secondary" variant="h6" align="center"> Amount </Typography>

               <TextField                
                    onChange={this.handleChange}
                    value={this.state.amount}
                    multiline
                    type="number"
                    label=""
                    name="amount"
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
                </Grid>
                <Grid item xs={12} sm={12} md={12}>
                <Typography color="secondary" variant="h6" align="center"> Receiver </Typography>

                <TextField                
                    onChange={this.handleChange}
                    value={this.state.receiver}
                    multiline
                    type="text"
                    label=""
                    name="receiver"
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
                </Grid>
              </Grid>
                 
                
                <br />
              



                    
          

                

                {this.state.asset && this.state.amount && this.state.receiver ? 
                
                <Button variant="contained" color="secondary" style={{display: "flex", margin: "auto"}} onClick={() => this.gift(Number(this.state.asset), Number(this.state.amount), String(this.state.receiver))}>
                <Typography  variant="h6"> Send Gift {Number(this.state.proposal.length * 50).toLocaleString("en-US")} </Typography>
              


                </Button>

                
                    
                  
                  :
                 null
                }
    
                <br />

                <Typography color="secondary" variant="h6" align="center"> {this.state.confirm} </Typography>

                <br />

                
            </div>
        )
    }
    
}