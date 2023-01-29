import React from "react"

import algosdk from "algosdk"

import Propose from "./Propose"
import Vote from "./Vote"


import { Grid, Typography, Button } from "@mui/material"

import muisty from "../../../muistyles.module.css"

export default class Council extends React.Component { 

    constructor(props) {
        super(props);
        this.state = {
            contract: 1024356879,
            daoBal: "",
            place: ""
            
        };
    }

    async componentDidMount() {

        let address = await algosdk.getApplicationAddress(this.state.contract)

        const indexerClient = new algosdk.Indexer('', 'https://algoindexer.algoexplorerapi.io', '');
        
        let accountInfo = await indexerClient.lookupAccountAssets(address).do();

        accountInfo.assets.forEach(async (asset) => {
          if (asset["asset-id"] == 601894079) {
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
                  <Grid container >
                    <Grid item xs={12} sm={6}>
                    <Button className={muisty.mixerbtn} style={{backgroundColor: this.state.place == "propose" ? "#FFFFFF" : "#000000", border: "1px solid white", display: "flex", margin: "auto"}} onClick={() => this.state.place == "propose" ? this.setState({place: ""}) : this.setState({place: "propose"})}>
                        <Typography color="secondary" variant="h6" style={{color: this.state.place == "propose" ? "#000000" : "#FFFFFF"}}> Propose </Typography>
                    </Button>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                    <Button className={muisty.mixerbtn} style={{backgroundColor: this.state.place == "vote" ? "#FFFFFF" : "#000000", border: "1px solid white", display: "flex", margin: "auto"}} onClick={() => this.state.place == "vote" ? this.setState({place: ""}) : this.setState({place: "vote"})}>
                        <Typography color="secondary" variant="h6" style={{color: this.state.place == "vote" ? "#000000" : "#FFFFFF"}}> Vote </Typography>
                    </Button>
                    </Grid>
                    <div style={{display: "flex", margin: "auto"}}>
                        <Typography color="secondary" align="center" variant="h6" > DAO Balance = {Number(this.state.daoBal).toLocaleString("en-US")} </Typography>
                        <img src="invDC.svg" style={{width: 50, padding: 10}} />
                    </div>
                  </Grid>

                  

                {this.state.place == "propose" ?
                    <Propose activeAddress={this.props.activeAddress} wallet={this.props.wallet} contract={this.state.contract} />
                    :
                    null
                }

                {this.state.place == "vote" ?
                    <Vote activeAddress={this.props.activeAddress} wallet={this.props.wallet} contract={this.state.contract} />
                    :
                    null
                }
                  
            
            </div>
        )
    }
    
}