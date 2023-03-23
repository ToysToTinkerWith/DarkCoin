import React from "react"


//43EVULWFT4RU2H7EZH377SAVQJSJO5NZP37N3Y5DZ7PGUXOETKW7VWDIOA

import { PeraWalletConnect } from "@perawallet/connect";

const peraWallet = new PeraWalletConnect();

import MyAlgo from '@randlabs/myalgo-connect';

import algosdk from "algosdk"

import { Grid, Typography, Button, TextField } from "@mui/material"

import DisplayChar from "./DisplayChar";
import DisplayBat from "./DisplayBat";

export default class Leaderboard extends React.Component { 

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

        const indexerClient = new algosdk.Indexer('', 'https://algoindexer.algoexplorerapi.io', '');

        let global = await indexerClient.lookupApplications(this.props.contract).do();

        let globalState = global.application.params["global-state"]

        let battleNum
        let lastBox = 1

        globalState.forEach((keyVal) => {
            if (atob(keyVal.key) == "battleNum") {
                battleNum = keyVal.value.uint
            }
        })

        console.log(battleNum)

          const client = new algosdk.Algodv2("", "https://node.algoexplorerapi.io/", "")

          for (let i = lastBox; i < battleNum; i++) {
            if (i > 0) {
                let responseProposal = await client.getApplicationBoxByName(this.props.contract, "Battle" + String(i)).do();

                let string = new TextDecoder().decode(responseProposal.value)

                let array = string.split(">")

                let winner = Number(array[0])
                let winnerName = array[1]
                let loser = Number(array[2])
                let loserName = array[3]
                let wager = Number(array[4])
                let story = array[5]
                let battleNumber = i

                this.setState(prevState => ({
                    battles: [...prevState.battles, {battleNum: battleNumber, winner: winner, winnerName: winnerName, loser: loser, loserName: loserName, wager: wager, story: story}]
                }))
            }
          }

          

    }


      


    render() {

        let leaderboard = []

        this.state.battles.forEach((battle) => {
            if (leaderboard.some(asset => asset.assetId === battle.winner)) {
                let addedIndex = leaderboard.findIndex(asset => asset.assetId === battle.winner)
                leaderboard[addedIndex].numWins += 1
                leaderboard[addedIndex].earnings += battle.wager
            }
            else {
                leaderboard.push({assetId: battle.winner, characterName: battle.winnerName, numWins: 1, earnings: battle.wager})
            }
            if (leaderboard.some(asset => asset.assetId === battle.loser)) {
                let addedIndex = leaderboard.findIndex(asset => asset.assetId === battle.loser)
                leaderboard[addedIndex].numWins -= 1
                leaderboard[addedIndex].earnings -= battle.wager
            }
            else {
                leaderboard.push({assetId: battle.loser, characterName: battle.loserName, numWins: -1, earnings: -battle.wager})
            }
        })



        leaderboard.sort((a, b)=> {
        if (a.numWins === b.numWins){
            return a.earnings < b.earnings ? 1 : -1
        } else {
            return a.numWins < b.numWins ? 1 : -1
        }
        })

        console.log(leaderboard)


        return (
            <div>
                <br />
                <Typography color="secondary" align="center" variant="h6"> Leaderboard </Typography>
                <br />
                

            </div>
        )
    }
    
    
}