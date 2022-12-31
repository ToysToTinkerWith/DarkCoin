import React from "react"

import Propose from "./Propose"
import Vote from "./Vote"


import { Grid, Typography, Button, TextField, Modal, Card } from "@mui/material"

import styles from "../../../index.module.css"

import muisty from "../../../muistyles.module.css"

export default class Council extends React.Component { 

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
                  </Grid>

                {this.state.place == "propose" ?
                    <Propose activeAddress={this.props.activeAddress} wallet={this.props.wallet} />
                    :
                    null
                }

                {this.state.place == "vote" ?
                    <Vote activeAddress={this.props.activeAddress} wallet={this.props.wallet} />
                    :
                    null
                }
                  
            
            </div>
        )
    }
    
}