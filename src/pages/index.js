import React from "react"

import Head from "next/head"

import dynamic from "next/dynamic"

import algosdk from "algosdk"

const AlgoConnect = dynamic(() => import("../components/connect/AlgoConnect"), {ssr: false})

import Mixer from "../components/contracts/Mixer"
import Market from "../components/contracts/Market"

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
            place: ""
        };
        
    }

    async componentDidMount() {

      
          
     
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

                <Grid className={muisty.headerBar} container>
                    <Grid item xs={2} sm={4}>
                    <img className={styles.invertedLogo} src="invDC.svg" />
                    
                    </Grid>
                    <Grid className={muisty.connectWalletGrid} item xs={10} sm={8}>
                        <AlgoConnect activeAddress={this.state.activeAddress} setActiveAddress={(account) => this.setState({activeAddress: account})} setWalletType={(wallet) => this.setState({walletType: wallet})} />
                    </Grid>

                </Grid>

                {this.state.place == "council" ? 
                    <Button className={muisty.navbtn}
                    onClick={() => this.setState({place: ""})}>
                    <img className={styles.navIcon} src="council.png" />
                    <Typography align="center" variant="h5" color="secondary">
                        Council
                    </Typography>
                    </Button>
                    :
                    null
                }
                {this.state.place == "market" ? 
                    <>
                        <Button className={muisty.navbtn}
                        onClick={() => this.setState({place: ""})}>
                        <img className={styles.navIcon} src="market.svg" />
                        <Typography align="center" variant="h5" color="secondary">
                            Market
                        </Typography>
                        </Button>
                        <Market activeAddress={this.state.activeAddress} wallet={this.state.walletType} />
                    </>
                    :
                    null
                }
                {this.state.place == "mixer" ? 
                    <>
                        <Button className={muisty.navbtn}
                        onClick={() => this.setState({place: ""})}>
                        <img className={styles.navIcon} src="mixer.svg" />
                        <Typography align="center" variant="h5" color="secondary">
                            Mixer
                        </Typography>
                        </Button>
                        <br />
                        <Mixer activeAddress={this.state.activeAddress} wallet={this.state.walletType} />
                    </>
                    :
                    null
                }
                <br />
                <br />

                {this.state.place == "" ? 
                    <Grid className={muisty.navBar} container>
                    <Grid item xs={12} sm={4}>
                        <Button className={muisty.navbtn}
                        onClick={() => this.setState({place: "council"})}>
                        <img className={styles.navIcon} src="council.png" />
                        <Typography align="center" variant="h5" color="secondary">
                            Council
                        </Typography>
                        </Button>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <Button className={muisty.navbtn}
                        onClick={() => this.setState({place: "market"})}>
                        <img className={styles.navIcon} src="market.svg" />
                        <Typography align="center" variant="h5" color="secondary">
                            Market
                        </Typography>
                        </Button>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <Button className={muisty.navbtn}
                        onClick={() => this.setState({place: "mixer"})}>
                        <img className={styles.navIcon} src="mixer.svg" />
                        <Typography align="center" variant="h5" color="secondary">
                            Mixer
                        </Typography>
                        </Button>
                    </Grid>
                    </Grid>
                    :
                    null
                }
                
                <br />
                <br />

                <Grid className={muisty.footerBar} container alignItems="center">
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
                

            </div>
        )
    }
    
}