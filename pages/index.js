import React from "react"

import Head from "next/head"

import { Grid, Typography, Button } from "@mui/material"

export default class Index extends React.Component { 

    constructor(props) {
        super(props);
        this.state = {
            activeAddress: null,
            walletType: "",
            place: "",
            error: "",
        };
        
    }

    async componentDidMount() {

    

    }

    
   

    render() {


        return (
            <div >
                <Head>
                <title>Dark Coin</title>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <meta name="description" content="Dark Coin is an innovative community-driven project within the Algorand ecosystem, focused on expanding the possibilities of Algorand Standard Assets (ASAs) in the decentralized finance (DeFi) space. It operates as a decentralized autonomous organization (DAO), giving collective ownership and democratic management power to its members through blockchain-enforced rules." />
                <meta name="keywords" content="Dark Coin, Algorand, Algorand Standard Assets, ASAs, decentralized finance, decentralized autonomous organization, DAO, blockchain" />

                
                </Head>


                    <Grid container>
                    <Grid item xs={12} sm={4}>
                        <Button 
                        style={{display: "grid", margin: "auto", marginBottom: 50}}
                        href="/council">
                        <img src="council.png" style={{display: "flex", margin: "auto", height: 75}} />
                        <Typography align="center" variant="h5" color="secondary">
                            Council
                        </Typography>
                        </Button>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <Button 
                        style={{display: "grid", margin: "auto", marginBottom: 50}}
                        href="/market">
                        <img src="market.svg" style={{display: "flex", margin: "auto", height: 75}} />
                        <Typography align="center" variant="h5" color="secondary">
                            Market
                        </Typography>
                        </Button>
                    </Grid>
                    {/* <Grid item xs={12} sm={4}>
                        <Button 
                        style={{display: "grid", margin: "auto", marginBottom: 50}}
                        onClick={() => this.setState({place: "mixer"})}>
                        <img src="mixer.svg" style={{display: "flex", margin: "auto", height: 75}} />
                        <Typography align="center" variant="h5" color="secondary">
                            Mixer
                        </Typography>
                        </Button>
                    </Grid> */}
                    
                    <Grid item xs={12} sm={4}>
                    <Button 
                    style={{display: "grid", margin: "auto", marginBottom: 50}}
                    href="/arena">
                    <img src="arena.svg" style={{display: "flex", margin: "auto", height: 75}} />
                    <Typography align="center" variant="h5" color="secondary">
                        Arena
                    </Typography>
                    </Button>
                </Grid>
                <Grid item xs={12} sm={12}>
                    <Button 
                    style={{display: "grid", margin: "auto", marginBottom: 50}}
                    href="/tools">
                    <img src="tools.svg" style={{display: "flex", margin: "auto", height: 75}} />
                    <Typography align="center" variant="h5" color="secondary">
                        Tools
                    </Typography>
                    </Button>
                </Grid>
                {/* <Grid item xs={12} sm={6}>
                    <Button 
                    style={{display: "grid", margin: "auto", marginBottom: 50}}
                    href="/ASAblasters">
                    <img src="ASAblasters.svg" style={{display: "flex", margin: "auto", height: 75}} />
                    <Typography align="center" variant="h5" color="secondary">
                        ASAblasters
                    </Typography>
                    </Button>
                </Grid> */}
                    
                    
                    </Grid>
                    
                
                <br />
                <br />

                <Grid container align="center" spacing={3}>
                <Grid item xs={12} sm={12} md={12}>
                        <Button style={{border: "1px solid white", padding: 20, borderRadius: 15}}  onClick={() => window.open("https://discord.com/invite/GWB89qusjQ")}>
                            <Typography color="secondary" align="center" variant="h5">
                                Dark Discord
                            </Typography>
                            <img style={{paddingLeft: 10, width: 70}} src="/discord.jpg"/>
                        </Button>
                        <br />
                        </Grid>
                        <Grid item xs={12} sm={12} md={6}> 
                        <Button style={{border: "1px solid white", padding: 20, borderRadius: 15}} onClick={() => window.open("https://dark-coin.io/")}>
                            <Typography color="secondary" align="center" variant="h5">
                                Dark Paper
                            </Typography>
                            <img style={{paddingLeft: 10}} src="./DarkPaper.svg"/>
                        </Button>
                        <br />
                        </Grid>
                        <Grid item xs={12} sm={12} md={6}>
                        <Button style={{border: "1px solid white", padding: 20, borderRadius: 15}}  onClick={() => window.open("https://github.com/ToysToTinkerWith/DarkCoin")}>
                            <Typography color="secondary" align="center" variant="h5">
                                Dark Repo
                            </Typography>
                            <img style={{paddingLeft: 10}} src="./DarkRepo.svg"/>
                        </Button>
                        <br />
                        </Grid>
                       

                    </Grid>

                

            </div>
        )
    }
    
}