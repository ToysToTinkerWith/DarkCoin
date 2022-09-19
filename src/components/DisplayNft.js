import React from "react"

import Head from "next/head"

import { db } from "../../Firebase"

import algosdk from "algosdk"



import { Grid, Card, Modal, Typography, Button } from "@mui/material"
import { Nfc } from "@mui/icons-material"

export default class DisplayNft extends React.Component { 

    constructor(props) {
        super(props);
        this.state = {
            nft: null,
            nftUrl: null,
            pinataNftMeta: null,
            
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
        
        this.setState({
            nft: session.assets[0].params,
            nftUrl: "https://ipfs.dark-coin.io/ipfs/" + session.assets[0].params.url.slice(7)
        })
          
      }

   

    render() {

        if (this.state.nft) {
            return (
                <div>
                    <Button onClick={() => this.props.setActiveNft([this.props.nftId, this.state.nft])} >
                        <Typography align="left" variant="caption" style={{color: "#FFFFFF", fontFamily: "Jacques", fontWeight: "800", padding: 20, position: "absolute", top: 0, left: 0, width: 100}}> {this.state.nft.name} </Typography>
                        <img src={this.state.nftUrl} style={{width: "100%"}} />
                    </Button>
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