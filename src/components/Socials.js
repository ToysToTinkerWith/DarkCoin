import React from "react"

import Head from "next/head"


import { Grid, Card, Modal, Typography, IconButton } from "@mui/material"

import styles from "../index.module.css"

import muisty from "../muistyles.module.css"

export default class Index extends React.Component { 

    constructor(props) {
        super(props);
        this.state = {
            activeAddress: null
        };
        
    }

   

    render() {

        return (
            <div className={styles.socials}>

                
                <IconButton className={muisty.socialsbtn} onClick={() => window.open("https://discord.com/invite/xdZ6V5ybmq")} >
                <Typography className={muisty.socialsh5} align="center" variant="h5">
                    Join the discussion
                    </Typography>
                    <img className={styles.discordicon} src={"discord.svg"} />
                </IconButton>
                <br />
                <img className={styles.footerimg} src="./Polygon.svg" />


            </div>
        )
    }
    
}