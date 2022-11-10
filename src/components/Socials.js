import React from "react"

import Head from "next/head"


import { Grid, Card, Modal, Typography, IconButton } from "@mui/material"

export default class Index extends React.Component { 

    constructor(props) {
        super(props);
        this.state = {
            activeAddress: null
        };
        
    }

   

    render() {

        return (
            <div style={{}}>

                
                <IconButton style={{display: "grid", margin: "auto"}} onClick={() => window.open("https://discord.com/invite/xdZ6V5ybmq")} >
                <Typography align="center" variant="h5" style={{color: "#FFFFFF", fontFamily: "Consolas", padding: 30}}>
                    Join the discussion
                    </Typography>
                    <img src={"discord.svg"} style={{width: 50, display: "flex", margin: "auto"}} />
                </IconButton>
                <br />
                <img src="./Polygon.svg" style={{width: "80%", transform: "scaleY(-1)", display: "flex", margin: "auto"}}/>


            </div>
        )
    }
    
}