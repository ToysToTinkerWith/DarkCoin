import React from "react"

import Head from "next/head"

import { db } from "../../Firebase"

import algosdk from "algosdk"



import { Grid, Card, Modal, Typography, Button } from "@mui/material"
import { Nfc } from "@mui/icons-material"

import styles from "../index.module.css"

import muisty from "../muistyles.module.css"

export default class DisplayNft extends React.Component { 

    constructor(props) {
        super(props);
        this.state = {
            nft: null,
            nftUrl: null
            
        };
        
    }

    async componentDidMount() {

        console.log()

        let response = await fetch('/api/getNft', {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                nftId: this.props.nftId
              }),
            
                
            });
        
        let session = await response.json()

        console.log()

        //nftUrl: "https://ipfs.dark-coin.io/ipfs/" + session.assets[0].params.url.slice(7)
        
        this.setState({
            nft: session.assets[0].params,
            nftUrl: "https://ipfs.dark-coin.io/ipfs/" + session.assets[0].params.url.slice(7)
        })
          
      }

   

    render() {

        if (this.state.nft) {
            return (
                <div style={{position: "relative", display: "inline-flex", margin: "auto", width: 200, maxWidth: String(100 / this.props.len) + "%", padding: 10}}>
                    <Typography className={muisty.displaynftname} align="left" variant="caption"> {this.state.nft.name} </Typography>
                    <img className={styles.displaynftimg} src={this.state.nftUrl} style={{borderRadius: 15}} />
                </div>
    
            )
        }

        else {
            return (
                <div>                   
                </div>
    
            )
        }
       
        
    }
    
}