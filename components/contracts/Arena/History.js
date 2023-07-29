import React from "react"


//43EVULWFT4RU2H7EZH377SAVQJSJO5NZP37N3Y5DZ7PGUXOETKW7VWDIOA

import { PeraWalletConnect } from "@perawallet/connect";

const peraWallet = new PeraWalletConnect();

import algosdk from "algosdk"

import { Grid, Typography, Button, TextField } from "@mui/material"

import DisplayChar from "./DisplayChar";
import DisplayBat from "./DisplayBat";

export default class History extends React.Component { 

    constructor(props) {
        super(props);
        this.state = {
            battles: [],
            wager: 10000,
            charSel: null,
            charSelect: null,
            battleSel: null,
            confirm: ""
        };
       

    }

    async componentDidMount() {

        const token = {
            'X-API-Key': process.env.indexerKey
        }
      
        const indexerClient = new algosdk.Indexer(token, 'https://mainnet-algorand.api.purestake.io/idx2', '');

        let global = await indexerClient.lookupApplications(this.props.contract).do();

        let globalState = global.application.params["global-state"]

        let battleNum

        globalState.forEach((keyVal) => {
            if (atob(keyVal.key) == "battleNum") {
                battleNum = keyVal.value.uint
            }
        })


        const client = new algosdk.Algodv2(token, 'https://mainnet-algorand.api.purestake.io/ps2', '')
        
          for (let i = battleNum - 1; i > battleNum - 10; i--) {
            if (i > 0) {
                let responseProposal = await client.getApplicationBoxByName(this.props.contract, "Battle" + String(i)).do();

                let string = new TextDecoder().decode(responseProposal.value)

                let array = string.split(">")

                let randomNum = Math.floor(Math.random() * 11)


                let winner = Number(array[0])
                let winnerName = array[1]
                let loser = Number(array[2])
                let loserName = array[3]
                let story = array[5]
                let battleNumber = i
                let wager 
                if (battleNumber > 62) {
                    wager = Number(array[4]) / 1000000
                }
                else {
                    wager = Number(array[4])
                }


                this.setState(prevState => ({
                    battles: [...prevState.battles, {battleNum: battleNumber, winner: winner, winnerName: winnerName, loser: loser, loserName: loserName, wager: wager, story: story, randomNum: randomNum}]
                }))
            }
          }

          

    }


      


    render() {


        return (
            <div>
                <br />
                <Typography color="secondary" align="center" variant="h6"> Battles </Typography>
                <br />
                {this.state.battles.length > 0 ? 
                this.state.battles.map((battle, index) => {
                    let char1
                    let char1Name
                    let char2
                    let char2Name
                    if (battle.randomNum % 2 == 1) {
                        char1 = battle.winner
                        char1Name = battle.winnerName
                        char2 = battle.loser
                        char2Name = battle.loserName
                    }
                    else {
                        char2 = battle.winner
                        char2Name = battle.winnerName
                        char1 = battle.loser
                        char1Name = battle.loserName
                    }
                    if (battle.battleNum == this.state.battleSel) {
                        return (
                            <div key={index}>
                                <hr />
                                <Button style={{display: "flex", margin: "auto"}} onClick={() => this.setState({battleSel: null})}>
                                <Typography color="secondary" align="center" variant="h6" style={{padding: 20}}> Battle {battle.battleNum} </Typography>
                                </Button>
    
                                <Grid container>
                                    <Grid item xs={12} sm={5} style={{display: "flex", margin: "auto", width: "50%", maxWidth: 300}} >
                                        <DisplayChar contract={this.state.contract} nftId={char1} setNft={(nftId) => this.setState({charSelect: nftId})} sendErrorMessage={this.sendErrorMessage} />
                                    </Grid>
                                    <Grid item xs={12} sm={2}>
                                        <Typography color="secondary" align="center" variant="h6" style={{padding: 20}}> vs </Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={5} style={{display: "flex", margin: "auto", width: "50%", maxWidth: 300}}>
                                        <DisplayChar contract={this.state.contract} nftId={char2} setNft={(nftId) => this.setState({charSelect: nftId})} sendErrorMessage={this.sendErrorMessage} />
                                    </Grid>
                                </Grid>
    
                                <Typography color="secondary" align="center" variant="h6" style={{padding: 20}}> {battle.story} </Typography>
                                <br />
                                <Typography color="secondary" align="center" variant="h6" style={{padding: 20}}> Winner </Typography>
                                <div style={{display: "flex", margin: "auto", width: "50%", maxWidth: 300}}>
                                <DisplayChar contract={this.state.contract} nftId={battle.winner} setNft={(nftId) => this.setState({charSelect: nftId})} />
                                </div>
                                <br />
                                <Typography color="secondary" align="center" variant="h6"> {Number(battle.wager).toLocaleString("en-US")} <img style={{width: 40, paddingRight: 20}} src="./DarkCoinLogo.png"/> </Typography>
                                <br />
    
                            </div>
                        )
                    }
                    else {
                        return (
                            <div key={index}>
                                <hr />
                                <Button style={{display: "flex", margin: "auto"}} onClick={() => this.setState({battleSel: battle.battleNum})}>
                                <Typography color="secondary" align="center" variant="h6" style={{padding: 20}}> Battle {battle.battleNum} </Typography>
                                </Button>
                                <Typography color="secondary" align="center" variant="h6" style={{padding: 20}}> {char1Name} vs {char2Name} </Typography>

                            </div>
                        )
                    }
                    
                })
                :
                null
                }



            </div>
        )
    }
    
    
}