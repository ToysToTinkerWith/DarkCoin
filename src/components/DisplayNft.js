import React from "react"

import Head from "next/head"

import { db } from "../../Firebase"

import algosdk from "algosdk"



import { Grid, Card, Modal, Typography, Button } from "@mui/material"

export default class DisplayNft extends React.Component { 

    constructor(props) {
        super(props);
        this.state = {
            nft: null,
            nftUrl: null
            
        };
        
    }

    componentDidMount() {

        const indexerClient = new algosdk.Indexer('', 'https://algoindexer.algoexplorerapi.io', '');
        (async () => {

            let assetInfo = await indexerClient.searchForAssets()
            .index(this.props.nftId).do();

            console.log(assetInfo)
            
            this.setState({
                nft: assetInfo.assets[0].params,
                nftUrl: "https://ipfs.dark-coin.io/ipfs/" + assetInfo.assets[0].params.url.slice(7)
            })
          

          
        })().catch(e => {
            console.log(e);
            console.trace();
        });
    
    
      }

   

    render() {

        console.log(this.state)

        if (this.state.nft) {
            return (
                <div>
                    <Button href={this.state.nftUrl} style={{display: "block"}}>
                        <Typography align="center" style={{color: "#FFFFFF", fontFamily: "Jacques", padding: 10}}> {this.state.nft.name} </Typography>
                        <img src={this.state.nftUrl} style={{width: "95%"}} />
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