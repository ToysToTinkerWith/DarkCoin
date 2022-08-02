import React from "react"

import Head from "next/head"

import algosdk from "algosdk"

import DisplayNft from "./DisplayNft"
import Propose from "./Propose.js"
import Contract from "./Contract.js"
import NftVote from "./NftVote.js"



import { Grid, Card, Modal, Typography, Button } from "@mui/material"

export default class ActiveWallet extends React.Component { 

    constructor(props) {
        super(props);
        this.state = {
            nftIds: [],
            ownedNfts: [],
            darkCoin: 0,
            activeNft: null
            
        };
        
    }

    componentDidMount() {
        const indexerClient = new algosdk.Indexer('', 'https://algoindexer.algoexplorerapi.io', '');
        (async () => {

            let numAssets = 0
            let acct = "AL6F3TFPSZPF3BSVUFDNOLMEKUCJJAA7GZ5GF3DN3Q4IVJVNUFK76PQFNE";
            let nextToken = ""

            let accountInfo = await indexerClient.lookupAccountCreatedAssets(acct).limit(1000).do();
            numAssets = numAssets + accountInfo.assets.length
            nextToken = accountInfo["next-token"]
            
            accountInfo.assets.forEach(async (asset) => {
            
              this.setState(prevState => ({
                  nftIds: [...prevState.nftIds, asset.index]
              }))
           
            })

            while (numAssets < 2000) {
                accountInfo = await indexerClient.lookupAccountCreatedAssets(acct).nextToken(nextToken).limit(1000).do();
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

        const govNfts = this.state.nftIds.filter(value => this.state.ownedNfts.includes(value));
        
        return (
            <div>
                <Grid container alignItems="center" >
                    <Grid item xs={12} sm={12} md={12}>
                        <Typography align="center" variant="h6" style={{color: "#FFFFFF", fontFamily: "Jacques", margin: 30}}> Dark Coin </Typography>
                        <img src="./DarkCoinLogo.svg" style={{display: "flex", margin: "auto", width: "10%", marginBottom: 30}}/>
                        <Typography align="center" variant="h6" style={{color: "#FFFFFF", fontFamily: "Jacques", margin: 30}}> {this.state.darkCoin} </Typography>
                    </Grid>



                    {this.state.activeNft ?
                    <Grid item xs={12} sm={12} md={12}>
                        <Button style={{display: "block", margin: "auto"}} onClick={() => this.setState({activeNft: null})} >
                            <Typography align="center" variant="h6" style={{color: "#FFFFFF", fontFamily: "Jacques", fontWeight: "800", padding: 20}}> {this.state.activeNft[1].name} </Typography>
                            <img src={"https://ipfs.dark-coin.io/ipfs/" + this.state.activeNft[1].url.slice(7)} style={{display: "flex", margin: "auto", width: "100%"}} />
                        </Button>
                    </Grid>
                    :
                    govNfts.length > 0 ?
            
                    govNfts.map((nft, index) => {
                        return (
                            <Grid item xs={6} sm={6} md={4} lg={3} key={index} style={{display: "flex", padding: "5%"}}>
                                <DisplayNft nftId={nft} setActiveNft={(nft) => this.setState({activeNft: nft})} />
                            </Grid>
                        )
                    })
                    :
                    null
                    
                    }
                    
                    
                    
                    
                    

                </Grid>

                {this.state.activeNft ?
                    <Contract activeNft={this.state.activeNft} activeAddress={this.props.activeAddress} wallet={this.props.wallet} />
                    :
                    null
                }

            </div>

        )
    }
    
}