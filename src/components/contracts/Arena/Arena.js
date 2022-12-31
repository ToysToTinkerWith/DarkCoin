import React from "react"

import { Grid, Typography, Button, TextField, Modal, Card } from "@mui/material"

import styles from "../../../index.module.css"

import muisty from "../../../muistyles.module.css"

import Create from "./Create"
import Fight from "./Fight"

export default class Arena extends React.Component { 

    constructor(props) {
        super(props);
        this.state = {
            place: ""
            
        };
    }

    render() {

        return (
            <div>
              <br />
                  <Grid container >
                    <Grid item xs={12} sm={6} style={{marginBottom: 50}}>
                    <Button className={muisty.mixerbtn} style={{backgroundColor: this.state.place == "create" ? "#FFFFFF" : "#000000", border: "1px solid white", display: "flex", margin: "auto"}} onClick={() => this.state.place == "create" ? this.setState({place: ""}) : this.setState({place: "create"})}>
                        <Typography color="secondary" variant="h6" style={{color: this.state.place == "create" ? "#000000" : "#FFFFFF"}}> Create </Typography>
                    </Button>
                    </Grid>
                    <Grid item xs={12} sm={6} style={{marginBottom: 50}}>
                    <Button className={muisty.mixerbtn} style={{backgroundColor: this.state.place == "fight" ? "#FFFFFF" : "#000000", border: "1px solid white", display: "flex", margin: "auto"}} onClick={() => this.state.place == "fight" ? this.setState({place: ""}) : this.setState({place: "fight"})}>
                        <Typography color="secondary" variant="h6" style={{color: this.state.place == "fight" ? "#000000" : "#FFFFFF"}}> Fight </Typography>
                    </Button>
                    </Grid>
                  </Grid>

                {this.state.place == "create" ?
                    <Create activeAddress={this.props.activeAddress} wallet={this.props.wallet} />
                    :
                    null
                }

                {this.state.place == "fight" ?
                    <Fight activeAddress={this.props.activeAddress} wallet={this.props.wallet} />
                    :
                    null
                }
                  
            
            </div>
        )
    }
    
}