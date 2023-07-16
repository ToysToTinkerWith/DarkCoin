import React from "react"

import Head from "next/head"

import dynamic from "next/dynamic"

const AlgoConnect = dynamic(() => import("../components/connect/AlgoConnect"), {ssr: false})

import Mixer from "../components/contracts/Mixer"
import Market from "../components/contracts/Market/Market"
const Council = dynamic(() => import("../components/contracts/Council/Council"), {ssr: false})

import Arena from "../components/contracts/Arena/Arena"
import Rewards from "../components/contracts/Rewards/Rewards"

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
        this.sendErrorMessage = this.sendErrorMessage.bind(this)
        
    }

    async sendErrorMessage(place, account, error) {

        console.log(place, account, error)
       
        const response = await fetch(process.env.discordErrorWebhook, {
          method: "POST",
          body: JSON.stringify({ 
            username: String(place),
            embeds: [{
              "title" : String(account),
              "description": String(error)
            }]
          }),
          headers: {
            "Content-Type": "application/json",
          },
        });

        this.setState({
            error: error
        })
      }
   

    render() {


        return (
            <div >
                <Head>
                <title>Dark Coin</title>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <meta name="description" content="" />
                <meta name="keywords" content="" />

                
                </Head>

                {this.state.error ? 
                <Button style={{position: "fixed", bottom: 20, right: 20, border: "1px solid white"}} onClick={() => this.setState({error: ""})}>
                    <Typography align="center" variant="caption" color="secondary">
                        {this.state.error}
                    </Typography>
                </Button>
                :
                null
                }

                

                <Grid container>
                    <Grid item xs={2} sm={4}>
                    <img src="invDC.svg" style={{display: "flex", margin: "auto", width: "30%", minWidth: 100, padding: 20}} />
                    
                    </Grid>
                    <Grid item xs={10} sm={8} style={{padding: 20}}>
                        <AlgoConnect activeAddress={this.state.activeAddress}  setActiveAddress={(account) => this.setState({activeAddress: account})} setWalletType={(wallet) => this.setState({walletType: wallet})} />
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
                        <Council activeAddress={this.state.activeAddress} wallet={this.state.walletType} sendErrorMessage={this.sendErrorMessage} />
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
                        <Market activeAddress={this.state.activeAddress} wallet={this.state.walletType} sendErrorMessage={this.sendErrorMessage} />
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
                        <Mixer activeAddress={this.state.activeAddress} wallet={this.state.walletType} sendErrorMessage={this.sendErrorMessage} />
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
                        <Arena activeAddress={this.state.activeAddress} wallet={this.state.walletType} sendErrorMessage={this.sendErrorMessage} />
                    </>
                    :
                    null
                }
                 {this.state.place == "rewards" ? 
                    <>
                        <Button 
                        style={{display: "grid", margin: "auto"}}
                        onClick={() => this.setState({place: ""})}>
                        <img src="rewards.svg" style={{display: "flex", margin: "auto", height: 75}} />
                        <Typography align="center" variant="h5" color="secondary">
                            Rewards
                        </Typography>
                        </Button>
                        <br />
                        <Rewards activeAddress={this.state.activeAddress} wallet={this.state.walletType} sendErrorMessage={this.sendErrorMessage}/>
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
                    
                    <Grid item xs={12} sm={6}>
                    <Button 
                    style={{display: "grid", margin: "auto", marginBottom: 50}}
                    onClick={() => this.setState({place: "arena"})}>
                    <img src="arena.svg" style={{display: "flex", margin: "auto", height: 75}} />
                    <Typography align="center" variant="h5" color="secondary">
                        Arena
                    </Typography>
                    </Button>
                </Grid>
                <Grid item xs={12} sm={6}>
                    <Button 
                    style={{display: "grid", margin: "auto", marginBottom: 50}}
                    onClick={() => this.setState({place: "rewards"})}>
                    <img src="rewards.svg" style={{display: "flex", margin: "auto", height: 75}} />
                    <Typography align="center" variant="h5" color="secondary">
                        Rewards
                    </Typography>
                    </Button>
                </Grid>
                    
                    
                    </Grid>
                    :
                    null
                }
                
                <br />
                <br />

                <Grid container align="center" spacing={3}>
                        <Grid item xs={12} sm={12} md={6}> 
                        <Button style={{border: "1px solid white", padding: 20, borderRadius: 15}} onClick={() => window.open("https://github.com/elborracho420/Dark-Coin-ASA-601894079/blob/main/darkpaper.md")}>
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