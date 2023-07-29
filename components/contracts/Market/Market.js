import React from "react"

import { PeraWalletConnect } from "@perawallet/connect";

const peraWallet = new PeraWalletConnect();

import algosdk from "algosdk"

import { Grid, Typography, Button } from "@mui/material"

import DarkCoin from "./DarkCoin/DarkCoin"
import HappyHoomens from "./HappyHoomens/HappyHoomens"


export default class Market extends React.Component { 

    constructor(props) {
        super(props);
        this.state = {
            cat: ""
        };
    }

    render() {


    
        return (
            <div >
              <br />
                
                  <Grid container align="center" spacing={3} >
                      <Grid item xs={12} sm={6} md={6} lg={6} >
                          <Button style={{backgroundColor: this.state.cat == "darkcoin" ? "#FFFFFF" : "#000000", border: "1px solid white", borderRadius: 15, padding: 10}} onClick={() => this.state.cat == "darkcoin" ? this.setState({cat: ""}) : this.setState({cat: "darkcoin"})}>
                            <Typography  variant="h6" style={{color: this.state.cat == "darkcoin" ? "#000000" : "#FFFFFF"}}> Dark Coin </Typography>
                          </Button>
                          
                      </Grid>
                      <Grid item xs={12} sm={6} md={6} lg={6} >
                          <Button style={{backgroundColor: this.state.cat == "hoomens" ? "#FFFFFF" : "#000000", border: "1px solid white", borderRadius: 15, padding: 10}} onClick={() => this.state.cat == "hoomens" ? this.setState({cat: ""}) : this.setState({cat: "hoomens"})}>
                            <Typography  variant="h6" style={{color: this.state.cat == "hoomens" ? "#000000" : "#FFFFFF"}}> Happy Hoomens </Typography>
                          </Button>
                          
                      </Grid>       
                    </Grid>

                    {this.state.cat == "darkcoin" ? 
                      <>
                      <br />
                        <DarkCoin activeAddress={this.props.activeAddress} wallet={this.props.wallet} sendErrorMessage={this.sendErrorMessage}/>
                        

                      </>
                      :
                      null
                    }
                    
                    {this.state.cat == "hoomens" ? 
                      <>
                      <br />
                        <HappyHoomens activeAddress={this.props.activeAddress} wallet={this.props.wallet} sendErrorMessage={this.sendErrorMessage} />
                        

                      </>
                      :
                      null
                    }

                    
                

                

             
                
                
            </div>
        )
    }
    
}