import React from "react"

import Head from "next/head"

import algosdk from "algosdk"



import { Grid, Card, Modal, Typography, Button } from "@mui/material"

export default class DisplayNft extends React.Component { 

    constructor(props) {
        super(props);
        this.state = {
            nftUrl: null
            
        };
        
    }

    componentDidMount() {

        const indexerClient = new algosdk.Indexer('', 'https://algoindexer.algoexplorerapi.io', '');
        (async () => {

            let assetInfo = await indexerClient.searchForAssets()
            .index(this.props.nftId).do();
            
            this.setState({
                nftUrl: "https://ipfs.io/ipfs/" + assetInfo.assets[0].params.url.slice(7)
            })
          

          
        })().catch(e => {
            console.log(e);
            console.trace();
        });
    
    
      }

   

    render() {

        console.log(this.state)
       
        return (
            <div>
                <img src={this.state.nftUrl} style={{width: "95%"}} />
               
            </div>

        )
    }
    
}