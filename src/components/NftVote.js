import React from "react"

import Head from "next/head"

import MyAlgo from '@randlabs/myalgo-connect';


import { PeraWalletConnect } from "@perawallet/connect";

const peraWallet = new PeraWalletConnect();

import algosdk from "algosdk"


import { Grid, Card, Modal, Typography, Button, TextField } from "@mui/material"

import styles from "../index.module.css"

import muisty from "../muistyles.module.css"

export default class NftVote extends React.Component { 

    constructor(props) {
        super(props);
        this.state = {
            proposal: "",
            localProposal: ""
        };
        this.Vote = this.Vote.bind(this)
        this.handleChange = this.handleChange.bind(this)    
    }

    componentDidMount() {
        
        peraWallet.reconnectSession()


      }

      

      async Vote () {

        try{

            const response = await fetch('/api/updateNft', {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    cid: this.props.activeNft[0].url.slice(7),
                    proposal: this.state.proposal
                  }),
                  
              });
            
              const session = await response.json()

              console.log(session)

              if (session.status == "OK") {
                this.setState({
                    localProposal: this.state.proposal
                })
              }
          
         
        }
        catch(err){
          console.log(err)
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

       console.log(this.props.activeNft)
        return (
            <div className={styles.nftvotediv}>

                <Typography className={muisty.nftvoteh6} variant="h6" align="center"> {this.props.activeNft[0].name} </Typography>


                {this.props.activeNft[1].keyvalues ? 
                <Typography className={muisty.nftvoteh6} variant="h6" align="center"> {this.props.activeNft[1].keyvalues.proposal} </Typography>
                :
                <Typography className={muisty.nftvoteh6} variant="h6" align="center"> {this.state.localProposal} </Typography>

                }

                

                
                <TextField /* Going to leave this TextField styling in line as well */
                    color="primary"
                    variant="outlined"
                    multiline
                    rows={5}
                    value={this.state.proposal}
                    type="text"
                    label={<Typography variant="body1" style={{fontFamily: "Consolas", color: "#FFFFFF"}}> Proposal </Typography>}
                    name={"proposal"}
                    inputProps={{ style: { color: "white", fontFamily: "Consolas" }}}

                    sx={{"& .MuiOutlinedInput-root":{"& > fieldset": {border: '2px solid #FFFFFF'}}}}
                    style={{width: "80%", display: "flex", margin: "auto"}}
                    onChange={this.handleChange}
                />
                <br />
                <Button className={muisty.contractbtn} onClick={() => this.Vote()}>
                    <Typography className={muisty.contractbtnt} variant="h6"> Vote </Typography>
                </Button>
               
                
            </div>
        )
    }
    
}