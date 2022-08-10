import React from "react"

import Head from "next/head"

import dynamic from "next/dynamic"

import algosdk from "algosdk"

const AlgoConnect = dynamic(() => import("../components/AlgoConnect"), {ssr: false})

import ActiveWallet from "../components/ActiveWallet"
const Votes = dynamic(() => import("../components/Votes"), {ssr: false})
const DarkCoin = dynamic(() => import("../components/DarkCoin"), {ssr: false})



import Socials from "../components/Socials"

import { Grid, Typography, Button } from "@mui/material"

export default class Index extends React.Component { 

    constructor(props) {
        super(props);
        this.state = {
            activeAddress: null,
            walletType: "",
            govNfts: []
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
                govNfts: [...prevState.govNfts, asset.index]
              }))
           
            })

            while (numAssets < 2001) {
                accountInfo = await indexerClient.lookupAccountCreatedAssets(acct).nextToken(nextToken).limit(1000).do();
                numAssets = numAssets + accountInfo.assets.length
                nextToken = accountInfo["next-token"]
                accountInfo.assets.forEach(async (asset) => {
                
                  this.setState(prevState => ({
                    govNfts: [...prevState.govNfts, asset.index]
                  }))
               
                  })
            }
          
      })().catch(e => {
          console.log(e);
          console.trace();
      });
    }

   

    render() {
        return (
            <div>
                <Head>
                <title>Dark Coin</title>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <meta name="description" content="" />
                <meta name="keywords" content="" />

                
                </Head>

                <img src="./Polygon.svg" style={{display: "flex", margin: "auto", width: "80%"}}/>


                <Typography align="center" variant="h1" style={{color: "#FFFFFF", fontFamily: "Jacques", padding: 30}}>
                    Dark Coin
                </Typography>
                <img src="./DarkCoinLogo.svg" style={{display: "flex", margin: "auto", padding: 30, width: "100%", maxWidth: 350}}/>

                <br />
                <Grid container alignItems="center">
                        <Grid item xs={12} sm={12} md={6}>
                            
                        <Button style={{display: "flex", margin: "auto", textTransform: "none", border: "1px solid white", borderRadius: 15}} onClick={() => window.open("https://github.com/elborracho420/Dark-Coin-ASA-601894079/blob/main/darkpaper.md")}>
                            <Typography align="center" variant="h5" style={{color: "#FFFFFF", fontFamily: "Jacques", padding: 10}}>
                                Dark Paper
                            </Typography>
                            <img src="./DarkPaper.svg" style={{width: "10%", maxWidth: 100}}/>
                        </Button>
                        <br />
                        </Grid>
                        <Grid item xs={12} sm={12} md={6}>
                        <Button style={{display: "flex", margin: "auto", textTransform: "none", border: "1px solid white", borderRadius: 15}} onClick={() => window.open("https://github.com/ToysToTinkerWith/DarkCoin")}>
                            <Typography align="center" variant="h5" style={{color: "#FFFFFF", fontFamily: "Jacques", padding: 10}}>
                                Dark Repo
                            </Typography>
                            <img src="./DarkRepo.svg" style={{width: "20%", maxWidth: 100}}/>
                        </Button>
                        <br />
                        </Grid>

                    </Grid>
                

                

                <div style={{border: "3px solid white", borderRadius: 15, margin: 30}}>
                    <Grid container alignItems="center">
                        <Grid item xs={12} sm={12} md={6}>
                            
                            {this.state.activeAddress ?
                            <Typography align="center" variant="h3" style={{color: "#FFFFFF", fontFamily: "JacquesShadow", padding: 30}}>
                            Welcome
                            </Typography>
                            :
                            <Typography align="center" variant="h3" style={{color: "#FFFFFF", fontFamily: "Jacques", padding: 30}}>
                            Connect with an Algorand Wallet
                            </Typography>
                            }
                        
                        </Grid>
                        <Grid item xs={12} sm={12} md={6}>
                            <br />
                            <AlgoConnect activeAddress={this.state.activeAddress} setActiveAddress={(account) => this.setState({activeAddress: account})} setWalletType={(wallet) => this.setState({walletType: wallet})} />
                        </Grid>

                    </Grid>

                    {this.state.activeAddress ? 
                        <ActiveWallet govNfts={this.state.govNfts} activeAddress={this.state.activeAddress} wallet={this.state.walletType} />
                        :
                        null
                    }

                </div>

                {this.state.govNfts.length > 2000 ?
                    <Votes govNfts={this.state.govNfts.slice(1, 2000)} />
                    :
                    null
                }
                
                

                <DarkCoin />

                <Socials />

                



                  
            </div>
        )
    }
    
}