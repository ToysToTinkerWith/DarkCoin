import React from "react"

import algosdk from "algosdk"

import { Grid, Card, Modal, Typography, Button } from "@mui/material"

export default class ActiveWallet extends React.Component { 

    constructor(props) {
        super(props);
        this.state = {
            darkCoin: 0,            
        };
        
    }

    componentDidMount() {
        
        const token = {
            'X-API-Key': process.env.indexerKey
        }
        const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)


      (async () => {
        let acct = this.props.activeAddress;

        let numAssets = 0
        let nextToken = 0

        let accountInfo = await indexerClient.lookupAccountAssets(acct).do();

        numAssets = accountInfo.assets.length
        nextToken = accountInfo["next-token"]

        accountInfo.assets.forEach(async (asset) => {
          if (asset["asset-id"] == 1088771340) {
            this.setState({
                darkCoin: asset.amount
            })
          }
        })

        while (numAssets == 1000) {

            accountInfo = await indexerClient.lookupAccountAssets(acct).nextToken(nextToken).do();

            accountInfo.assets.forEach(async (asset) => {
                if (asset["asset-id"] == 1088771340) {
                  this.setState({
                      darkCoin: asset.amount
                  })
                }
              })

            numAssets = accountInfo.assets.length
            nextToken = accountInfo["next-token"]
        }
  
        
        
    })().catch(e => {
        console.log(e);
        console.trace();
    });
    
    
    }

   

    render() {

        return (
            <div>
                
                <img src="DC.svg" style={{display: "flex", margin: "auto", width: 50}} />
                <br />
                <Typography align="center" variant="h6" style={{color: "white"}} > {(this.state.darkCoin / 1000000).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")} </Typography>
                <br />
            </div>

        )
    }
    
}