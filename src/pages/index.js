import React from "react"

import Head from "next/head"

import dynamic from "next/dynamic"

import algosdk from "algosdk"

const AlgoConnect = dynamic(() => import("../components/connect/AlgoConnect"), {ssr: false})

import Mixer from "../components/contracts/Mixer"
import Market from "../components/contracts/Market"
import Council from "../components/contracts/Council/Council"
import Arena from "../components/contracts/Arena/Arena"

const Votes1 = dynamic(() => import("../components/Votes1"), {ssr: false})
const Votes2 = dynamic(() => import("../components/Votes2"), {ssr: false})
const DarkCoin = dynamic(() => import("../components/DarkCoin"), {ssr: false})



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

                <Grid container>
                    <Grid item xs={2} sm={4}>
                    <img src="invDC.svg" style={{display: "flex", margin: "auto", width: "30%", minWidth: 100, padding: 20}} />
                    
                    </Grid>
                    <Grid item xs={10} sm={8} style={{padding: 20}}>
                        <AlgoConnect activeAddress={this.state.activeAddress} setActiveAddress={(account) => this.setState({activeAddress: account})} setWalletType={(wallet) => this.setState({walletType: wallet})} />
                    </Grid>

                </Grid>

                {this.state.place == "council" ? 
                    <>
                        <Button 
                        style={{display: "grid", margin: "auto"}}
                        onClick={() => this.setState({place: ""})}>
                        <img src="council.png" style={{display: "flex", margin: "auto", height: 75}} />
                        <Typography align="center" variant="h5" color="secondary">
                            Council
                        </Typography>
                        </Button>
                        <Council activeAddress={this.state.activeAddress} wallet={this.state.walletType} />
                    </>
                    :
                    null
                }
                {this.state.place == "market" ? 
                    <>
                        <Button 
                        style={{display: "grid", margin: "auto"}}
                        onClick={() => this.setState({place: ""})}>
                        <img src="market.svg" style={{display: "flex", margin: "auto", height: 75}} />
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
                        <Button 
                        style={{display: "grid", margin: "auto"}}
                        onClick={() => this.setState({place: ""})}>
                        <img src="mixer.svg" style={{display: "flex", margin: "auto", height: 75}} />
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
                {this.state.place == "arena" ? 
                    <>
                        <Button 
                        style={{display: "grid", margin: "auto"}}
                        onClick={() => this.setState({place: ""})}>
                        <img src="arena.svg" style={{display: "flex", margin: "auto", height: 75}} />
                        <Typography align="center" variant="h5" color="secondary">
                            Arena
                        </Typography>
                        </Button>
                        <br />
                        <Arena activeAddress={this.state.activeAddress} wallet={this.state.walletType} />
                    </>
                    :
                    null
                }
                <br />
                <br />

                {this.state.place == "" ? 
                    <Grid container>
                    <Grid item xs={12} sm={4}>
                        <Button 
                        style={{display: "grid", margin: "auto", marginBottom: 50}}
                        onClick={() => this.setState({place: "council"})}>
                        <img src="council.png" style={{display: "flex", margin: "auto", height: 75}} />
                        <Typography align="center" variant="h5" color="secondary">
                            Council
                        </Typography>
                        </Button>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <Button 
                        style={{display: "grid", margin: "auto", marginBottom: 50}}
                        onClick={() => this.setState({place: "market"})}>
                        <img src="market.svg" style={{display: "flex", margin: "auto", height: 75}} />
                        <Typography align="center" variant="h5" color="secondary">
                            Market
                        </Typography>
                        </Button>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <Button 
                        style={{display: "grid", margin: "auto", marginBottom: 50}}
                        onClick={() => this.setState({place: "mixer"})}>
                        <img src="mixer.svg" style={{display: "flex", margin: "auto", height: 75}} />
                        <Typography align="center" variant="h5" color="secondary">
                            Mixer
                        </Typography>
                        </Button>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <Button 
                        style={{display: "grid", margin: "auto", marginBottom: 50}}
                        onClick={() => this.setState({place: "arena"})}>
                        <img src="arena.svg" style={{display: "flex", margin: "auto", height: 75}} />
                        <Typography align="center" variant="h5" color="secondary">
                            Arena
                        </Typography>
                        </Button>
                    </Grid>
                    </Grid>
                    :
                    null
                }
                
                <br />
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
                

            </div>
        )
    }
    
}