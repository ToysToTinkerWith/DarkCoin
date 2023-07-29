import React from "react"

import algosdk from "algosdk"

import Propose from "./Propose"
import Proposals from "./Proposals"


import { Grid, Typography, Button } from "@mui/material"

export default class Council extends React.Component { 

    constructor(props) {
        super(props);
        this.state = {
            contract: 1025341912,
            daoBal: "",
            place: ""
            
        };
    }

    async componentDidMount() {

        let address = await algosdk.getApplicationAddress(this.state.contract)

        console.log(address)

        const token = {
            'X-API-Key': process.env.indexerKey
        }
      
        const indexerClient = new algosdk.Indexer(token, 'https://mainnet-algorand.api.purestake.io/idx2', '');
                
        let accountInfo = await indexerClient.lookupAccountAssets(address).do();

        accountInfo.assets.forEach(async (asset) => {
          if (asset["asset-id"] == 1088771340) {
            this.setState({
                daoBal: asset.amount
            })
          }
        })


    }

    render() {

        return (
            <div>
              <br />
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                    <Button style={{backgroundColor: this.state.place == "propose" ? "#FFFFFF" : "#000000", border: "1px solid white", display: "flex", margin: "auto", borderRadius: 15, padding: 10}} onClick={() => this.state.place == "propose" ? this.setState({place: ""}) : this.setState({place: "propose"})}>
                        <Typography color="secondary" variant="h6" style={{color: this.state.place == "propose" ? "#000000" : "#FFFFFF"}}> Propose </Typography>
                    </Button>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                    <Button style={{backgroundColor: this.state.place == "proposals" ? "#FFFFFF" : "#000000", border: "1px solid white", display: "flex", margin: "auto", borderRadius: 15, padding: 10}} onClick={() => this.state.place == "proposals" ? this.setState({place: ""}) : this.setState({place: "proposals"})}>
                        <Typography color="secondary" variant="h6" style={{color: this.state.place == "proposals" ? "#000000" : "#FFFFFF"}}> Proposals </Typography>
                    </Button>
                    </Grid>
                    <div style={{display: "flex", margin: "auto", paddingTop: 20}}>
                        
                        <Typography color="secondary" align="center" variant="h6" > DAO Balance = {Number(this.state.daoBal / 1000000).toLocaleString("en-US")} </Typography>
                        <img src="invDC.svg" style={{width: 50, padding: 10}} />
                    </div>
                  </Grid>

                  

                {this.state.place == "propose" ?
                    <Propose activeAddress={this.props.activeAddress} wallet={this.props.wallet} contract={this.state.contract} sendErrorMessage={this.sendErrorMessage} />
                    :
                    null
                }

                {this.state.place == "proposals" ?
                    <Proposals activeAddress={this.props.activeAddress} wallet={this.props.wallet} contract={this.state.contract} sendErrorMessage={this.sendErrorMessage}/>
                    :
                    null
                }
                  
            
            </div>
        )
    }
    
}