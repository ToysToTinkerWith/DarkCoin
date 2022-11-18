import React from "react"

import Head from "next/head"

import dynamic from "next/dynamic"

import algosdk from "algosdk"

const AlgoConnect = dynamic(() => import("../components/AlgoConnect"), {ssr: false})

import ActiveWallet from "../components/ActiveWallet"
const Votes1 = dynamic(() => import("../components/Votes1"), {ssr: false})
const Votes2 = dynamic(() => import("../components/Votes2"), {ssr: false})
const DarkCoin = dynamic(() => import("../components/DarkCoin"), {ssr: false})


import Socials from "../components/Socials"

import { Grid, Typography, Button } from "@mui/material"

import styles from "../index.module.css"

import muisty from "../muistyles.module.css"

export default class Index extends React.Component { 

    constructor(props) {
        super(props);
        this.state = {
            activeAddress: null,
            walletType: "",
            dcNfts: []
        };
        
    }

    async componentDidMount() {

        let numAssets = 0
        let nextToken = ""

        let response = await fetch('/api/getdcAssets', {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            }
            
                
            });
        
        let session = await response.json()

        numAssets = session.assets.length
        nextToken = session["next-token"]
        
        session.assets.forEach((asset) => {
        
            this.setState(prevState => ({
            dcNfts: [...prevState.dcNfts, asset.index]
            }))
        
        })

        while (numAssets == 1000) {

            response = await fetch('/api/getdcAssets', {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    nextToken: nextToken
                  }),
                  
              });
            
            session = await response.json()

            numAssets = session.assets.length
            nextToken = session["next-token"]
            session.assets.forEach(async (asset) => {
            
                this.setState(prevState => ({
                dcNfts: [...prevState.dcNfts, asset.index]
                }))
            
                })
        }
          
     
    }

   

    render() {
        return (
            <div className={styles.mainbody}>
                <Head>
                <title>Dark Coin</title>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <meta name="description" content="" />
                <meta name="keywords" content="" />

                
                </Head>

                <img className={styles.headerimg} src="./Polygon.svg"/>


                <Typography className={muisty.h1}align="center" variant="h1">
                    Dark Coin
                </Typography>
                <img className={styles.logoimg} src="./DarkCoinLogo.svg" />

                <br />
                <DarkCoin />
                <br />

                <Grid container alignItems="center">
                        <Grid item xs={12} sm={12} md={6}>
                            
                        <Button className={muisty.button} onClick={() => window.open("https://github.com/elborracho420/Dark-Coin-ASA-601894079/blob/main/darkpaper.md")}>
                            <Typography className={muisty.h5} align="center" variant="h5">
                                Dark Paper
                            </Typography>
                            <img className={styles.dpicon} src="./DarkPaper.svg"/>
                        </Button>
                        <br />
                        </Grid>
                        <Grid item xs={12} sm={12} md={6}>
                        <Button className={muisty.button} onClick={() => window.open("https://github.com/ToysToTinkerWith/DarkCoin")}>
                            <Typography className={muisty.h5} align="center" variant="h5">
                                Dark Repo
                            </Typography>
                            <img className={styles.dricon} src="./DarkRepo.svg"/>
                        </Button>
                        <br />
                        </Grid>

                    </Grid>
                

                

                <div className={styles.innerbody}>
                    <Grid container alignItems="center">
                        <Grid item xs={12} sm={12} md={6}>
                            
                            {this.state.activeAddress ?
                            <Typography className={muisty.h3} align="center" variant="h3">
                            Welcome
                            </Typography>
                            :
                            <Typography className={muisty.h3} align="center" variant="h3">
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
                        <ActiveWallet dcNfts={this.state.dcNfts} activeAddress={this.state.activeAddress} wallet={this.state.walletType} />
                        :
                        null
                    }

                </div>

                {this.state.dcNfts.length > 2000 ?
                    <>
                    <Typography className={muisty.h2} align="center" variant="h2"> Governance </Typography>
                    <Votes2 govNfts={this.state.dcNfts.slice(1, 2000)} />
                    <br />
                    <Typography className={muisty.h4} align="center" variant="h4"> Past results </Typography>
                    <Votes1 govNfts={this.state.dcNfts.slice(1, 2000)} />
                    </>
                    
                    :
                    null
                }
                
                


                <Socials />

                



                  
            </div>
        )
    }
    
}