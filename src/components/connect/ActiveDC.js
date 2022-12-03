import React from "react"

import algosdk from "algosdk"

import { Grid, Card, Modal, Typography, Button } from "@mui/material"

import muisty from "../../muistyles.module.css"

import styles from "../../index.module.css"

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
    
        const indexerClient = new algosdk.Indexer(token, 'https://mainnet-algorand.api.purestake.io/idx2', '');


      (async () => {
        let acct = this.props.activeAddress;

        let numAssets = 0
        let nextToken = 0

        let accountInfo = await indexerClient.lookupAccountAssets(acct).do();

        numAssets = accountInfo.assets.length
        nextToken = accountInfo["next-token"]

        accountInfo.assets.forEach(async (asset) => {
          if (asset["asset-id"] == 601894079) {
            this.setState({
                darkCoin: asset.amount
            })
          }
        })

        while (numAssets == 1000) {

            accountInfo = await indexerClient.lookupAccountAssets(acct).nextToken(nextToken).do();

            accountInfo.assets.forEach(async (asset) => {
                if (asset["asset-id"] == 601894079) {
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
                
                <img className={styles.DCsvg} src="DC.svg" />
                <br />
                <Typography className={muisty.dcbalance} align="center" variant="h6"> {(this.state.darkCoin).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")} </Typography>
                <br />
            </div>

        )
    }
    
}