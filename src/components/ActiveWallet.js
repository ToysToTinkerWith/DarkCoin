import React from "react"

import Head from "next/head"

import algosdk from "algosdk"

import DisplayNft from "./DisplayNft"



import { Grid, Card, Modal, Typography, Button } from "@mui/material"

export default class ActiveWallet extends React.Component { 

    constructor(props) {
        super(props);
        this.state = {
            nftIds: [],
            ownedNfts: [],
            darkCoin: 0
            
        };
        
    }

    componentDidMount() {
        const indexerClient = new algosdk.Indexer('', 'https://algoindexer.algoexplorerapi.io', '');
        (async () => {

            let numAssets = 0
            let acct = "AL6F3TFPSZPF3BSVUFDNOLMEKUCJJAA7GZ5GF3DN3Q4IVJVNUFK76PQFNE";
            let nextToken = ""

            let accountInfo = await indexerClient.lookupAccountCreatedAssets(acct).limit(1000).do();
            console.log(accountInfo)
            numAssets = numAssets + accountInfo.assets.length
            nextToken = accountInfo["next-token"]
            
            accountInfo.assets.forEach(async (asset) => {
            
              this.setState(prevState => ({
                  nftIds: [...prevState.nftIds, asset.index]
              }))
           
            })

            while (numAssets < 2000) {
                accountInfo = await indexerClient.lookupAccountCreatedAssets(acct).nextToken(nextToken).limit(1000).do();
                console.log(accountInfo)
                numAssets = numAssets + accountInfo.assets.length
                nextToken = accountInfo["next-token"]
                accountInfo.assets.forEach(async (asset) => {
                
                  this.setState(prevState => ({
                      nftIds: [...prevState.nftIds, asset.index]
                  }))
               
                  })
            }
          
         
    
          
          
      })().catch(e => {
          console.log(e);
          console.trace();
      });

      (async () => {
        let acct = this.props.activeAddress;
        let accountInfo = await indexerClient.lookupAccountAssets(acct).do();
        accountInfo.assets.forEach(async (asset) => {
          console.log(asset)
          if (asset["asset-id"] == 601894079) {
            this.setState({
                darkCoin: asset.amount
            })
          }
          if (asset.amount == 1) {
            this.setState(prevState => ({
                ownedNfts: [...prevState.ownedNfts, asset["asset-id"]]
              }))
          }

    
              
          
          
      
          
          
          })
  
        
        
    })().catch(e => {
        console.log(e);
        console.trace();
    });
    
    
      }

   

    render() {

        console.log(this.state)

        const govNfts = this.state.nftIds.filter(value => this.state.ownedNfts.includes(value));

        console.log(govNfts)
       
        return (
            <div>
                <Grid container alignItems="center" wrap="wrap-reverse">
                    <Grid item xs={12} sm={12} md={6} style={{display: "flex", padding: "5%"}}>
                    {govNfts.length > 0 ?
            
                    govNfts.map((nft) => {
                        return (
                            <DisplayNft nftId={nft} />
                        )
                    })
                    :
                    null
                    }
                    
                    </Grid>
                    <Grid item xs={12} sm={12} md={6}>
                        <Typography align="center" variant="h6" style={{color: "#FFFFFF", fontFamily: "Jacques", margin: 30}}> Dark Coin </Typography>
                        <img src="./DarkCoinLogo.svg" style={{display: "flex", margin: "auto", width: "10%", marginBottom: 30}}/>
                        <Typography align="center" variant="h6" style={{color: "#FFFFFF", fontFamily: "Jacques", margin: 30}}> {this.state.darkCoin} </Typography>
                    </Grid>

                </Grid>
                
               

                

            </div>

        )
    }
    
}