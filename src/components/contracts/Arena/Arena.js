import React from "react"

import { Grid, Typography, Button } from "@mui/material"

import Create from "./Create"
import Select from "./Select"
import Fight from "./Fight"

import algosdk from "algosdk"

export default class Arena extends React.Component { 

    constructor(props) {
        super(props);
        this.state = {
            contract: 1048011431,
            place: ""
            
        };
    }

    async componentDidMount() {

        let address = await algosdk.getApplicationAddress(this.state.contract)

        console.log(address)

    }

    render() {

        return (
            <div>
              <br />
                  <Grid container >
                    <Grid item xs={12} sm={4} style={{marginBottom: 50}}>
                    <Button style={{backgroundColor: this.state.place == "create" ? "#FFFFFF" : "#000000", border: "1px solid white", display: "flex", margin: "auto", padding: 10, borderRadius: 15}} onClick={() => this.state.place == "create" ? this.setState({place: ""}) : this.setState({place: "create"})}>
                        <Typography color="secondary" variant="h6" style={{color: this.state.place == "create" ? "#000000" : "#FFFFFF"}}> Create </Typography>
                    </Button>
                    </Grid>
                    <Grid item xs={12} sm={4} style={{marginBottom: 50}}>
                    <Button style={{backgroundColor: this.state.place == "select" ? "#FFFFFF" : "#000000", border: "1px solid white", display: "flex", margin: "auto", padding: 10, borderRadius: 15}} onClick={() => this.state.place == "select" ? this.setState({place: ""}) : this.setState({place: "select"})}>
                        <Typography color="secondary" variant="h6" style={{color: this.state.place == "select" ? "#000000" : "#FFFFFF"}}> Select </Typography>
                    </Button>
                    </Grid>
                    <Grid item xs={12} sm={4} style={{marginBottom: 50}}>
                    <Button style={{backgroundColor: this.state.place == "fight" ? "#FFFFFF" : "#000000", border: "1px solid white", display: "flex", margin: "auto", padding: 10, borderRadius: 15}} onClick={() => this.state.place == "fight" ? this.setState({place: ""}) : this.setState({place: "fight"})}>
                        <Typography color="secondary" variant="h6" style={{color: this.state.place == "fight" ? "#000000" : "#FFFFFF"}}> Fight </Typography>
                    </Button>
                    </Grid>
                  </Grid>

                {this.state.place == "create" ?
                    <Create activeAddress={this.props.activeAddress} wallet={this.props.wallet} contract={this.state.contract} />
                    :
                    null
                }

                {this.state.place == "select" ?
                    <Select activeAddress={this.props.activeAddress} wallet={this.props.wallet} contract={this.state.contract} />
                    :
                    null
                }

                {this.state.place == "fight" ?
                    <Fight activeAddress={this.props.activeAddress} wallet={this.props.wallet} contract={this.state.contract} />
                    :
                    null
                }
                  
            
            </div>
        )
    }
    
}