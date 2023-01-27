import React from "react"

import algosdk from "algosdk"

import { Typography } from "@mui/material"

import styles from "../../../index.module.css"

import muisty from "../../../muistyles.module.css"

export default class DisplayNft extends React.Component { 

    constructor(props) {
        super(props);
        this.state = {
            nft: null,
            nftUrl: null
            
        };
        
    }

    async componentDidMount() {

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

        let charStats = null

        if (this.props.zoom) {
            const token = {
                'X-API-Key': process.env.indexerKey
            }
          
            const indexerClient = new algosdk.Indexer(token, 'https://mainnet-algorand.api.purestake.io/idx2', '');
    
            let assetConfig = await indexerClient.lookupAssetTransactions(this.props.nftId)
            .txType("acfg")
            .do();

            //"ewogICAgICAgICAgInN0YW5kYXJkIjogImFyYzY5IiwKICAgICAgICAgICJkZXNjcmlwdGlvbiI6ICJEYXJrIENvaW4gQ2hhcmFjdGVyIE5GVCIsCiAgICAgICAgICAiZXh0ZXJuYWxfdXJsIjogaHR0cHM6Ly9nYXRld2F5LnBpbmF0YS5jbG91ZC9pcGZzL1FtYVhESDU0WnJnaG1waFlRTFZVWjdLb0xWR2lqYXpaTjdENlprTHZtN1FXNDEsCiAgICAgICAgICAibWltZV90eXBlIjogImltZy9wbmciLAogICAgICAgICAgInByb3BlcnRpZXMiOiBbb2JqZWN0IE9iamVjdF0KICAgICAgICB9"
            //"V0tQVjJhRkVtN3czZE5oaDlBNkVWZ0ZmZWVOTWFrZzdnRmVmcDdTVnE2Y3gsCiAgICAgICAgICAibWltZV90eXBlIjogImltZy9wbmciLAogICAgICAgICAgInByb3BlcnRpZXMiOiB7CiAgICAgICAgICAgICJOYW1lIjogS2VsdmluLAogICAgICAgICAgICAiRW5lcmd5IjogMTAwLAogICAgICAgICAgICAiTWVsZWUiOiAzMywKICAgICAgICAgICAgIlJhbmdlZCI6IDMzLAogICAgICAgICAgICAiTWFnaWMiOiAzNCwKICAgICAgICAgICAgIkZpcmUiOiAxNywKICAgICAgICAgICAgIldhdGVyIjogMTcsCiAgICAgICAgICAgICJOYXR1cmUiOiAzNCwKICAgICAgICAgICAgIkVsZWN0cmljIjogMTcsCiAgICAgICAgICAgICJQb2lzb24iOiAxNywKICAgICAgICAgICAgIkxpZ2h0IjogMTcsCiAgICAgICAgICAgICJEYXJrIjogMTcKICAgICAgICAgIH0KICAgICAgICB9"
            console.log(assetConfig.transactions[0])

            console.log(atob(assetConfig.transactions[0].note))

            charStats = JSON.parse(atob(assetConfig.transactions[0].note))
        }
        
        this.setState({
            nft: session.assets[0].params,
            nftUrl: "https:" + session.assets[0].params.url.slice(7),
            charStats: charStats
        })
          
      }

   

    render() {

        console.log(this.state)

        if (this.state.nft) {
            if (this.props.zoom) {
                return (
                    <div style={{display: "flex", margin: "auto", maxWidth: 400, padding: 10}}>
                        <img className={styles.displaynftimg} src={this.state.nftUrl} style={{borderRadius: 15}} />
                        <Typography className={muisty.displaynftname} style={{margin: 20}} align="left" variant="h4"> {this.state.nft.name} </Typography>
                    </div>
        
                )

            }
            else {
                return (
                    <div style={{position: "relative", display: "inline-flex", margin: "auto", width: 200, maxWidth: String(100 / this.props.len) + "%", padding: 10}}>
                        <Typography className={muisty.displaynftname} align="left" variant="caption"> {this.state.nft.name} </Typography>
                        <img className={styles.displaynftimg} src={this.state.nftUrl} style={{borderRadius: 15}} />
                    </div>
        
                )
            }
            
        }

        else {
            return (
                <div>                   
                </div>
    
            )
        }
       
        
    }
    
}