import React, { useState } from "react"

import { PeraWalletConnect } from "@perawallet/connect";

const peraWallet = new PeraWalletConnect();

import { Transaction } from "algosdk";

import algosdk from 'algosdk';


import { Button, Typography, TextField } from "@mui/material"

export default class Propose extends React.Component {

    constructor() {
        super()
        this.state = {
            proposal: "",
            amount: ""
        }
        this.sendTrans = this.sendTrans.bind(this)
        this.handleChange = this.handleChange.bind(this)
    }

  

    async sendTrans() {
        try {

            const response = await fetch('/api/govVote', {
                method: "POST",
                body: JSON.stringify({
                  activeAddress: this.props.activeAddress,
                  proposal: this.state.proposal,
                  amount: Number(this.state.amount),
                  connector: this.props.connector
                }),
                headers: {
                  "Content-Type": "application/json",
                }
                  
              });
            
              const session = await response.json()

              console.log(session.txn)

              try {
                const signedTxn = await this.props.connector.signTxn(new Transaction(session.txn));
              } catch (error) {
                console.log("Couldn't sign Opt-in txns", error);
              }
        
        } catch (err) {
        console.error(err);
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
        console.log(this.props)
        return (
            <div >
                <TextField
                    color="primary"
                    variant="outlined"
                    multiline
                    rows={5}
                    value={this.state.proposal}
                    type="text"
                    label={<Typography variant="body1" style={{fontFamily: "Chango", color: "#FFFFFF"}}> Proposal </Typography>}
                    name={"proposal"}
                    inputProps={{ style: { color: "white", fontFamily: "Chango" }}}
    
                    sx={{"& .MuiOutlinedInput-root":{"& > fieldset": {border: '2px solid #FFFFFF'}}}}
                    style={{width: "80%", display: "flex", margin: "auto"}}
                    onChange={this.handleChange}
                />
                <br />

                <TextField
                    onChange={this.handleChange}
                    value={this.state.amount}
                    type="number"
                    label={<Typography variant="body1" style={{fontFamily: "Chango", color: "#FFFFFF"}}> Amount </Typography>}
                    name="amount"
                    autoComplete="false"
                    color="primary"
                    inputProps={{ style: { color: "white", fontFamily: "Chango" }}}
                    sx={{"& .MuiOutlinedInput-root":{"& > fieldset": {border: '2px solid #FFFFFF'}}}}
                    style={{
                    display: "flex",
                    margin: "auto",
                    width: "70%"
                    }}
                />

                <Button onClick={() => this.sendTrans()} style={{display: "flex", margin: "auto", backgroundColor: "#FFFFFF", padding: 10, borderRadius: 15, marginTop: "2%"}}> 
                    <Typography variant="h6" style={{fontFamily: "Chango", color: "#000000"}}> Propose </Typography>
                </Button>
                <br />
            </div>
        )
      }

    
}





