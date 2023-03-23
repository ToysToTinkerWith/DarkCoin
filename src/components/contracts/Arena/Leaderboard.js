import React from "react"
import gold from '../../../../public/gold.svg';
import silver from '../../../../public/silver.svg';
import bronze from '../../../../public/bronze.svg';

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



        let sortedPlayers = leaderboard.sort((a, b)=> {
                if (a.numWins === b.numWins){
                    return a.earnings < b.earnings ? 1 : -1
                } else {
                    return a.numWins < b.numWins ? 1 : -1
                }
            })

        console.log(sortedPlayers)


        return (
            <div>
                <br />
                <Typography color="secondary" align="center" variant="h6"> Leaderboard </Typography>
                <br />
                <>
    <h1 style={{
        display: 'flex',
        margin: 'auto',
        justifyContent: 'center',
        color: 'white',
        marginTop: '30px',
        whiteSpace: 'nowrap',
        minWidth: '732px'
    }}>
        Dark Coin Arena Leaderboard
    </h1>
    <ol
      style={{
        backgroundColor: 'black',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '5px solid white',
        borderRadius: '15px',
        marginLeft: '15%',
        marginRight: '15%',
        marginTop: '5%',
        padding: '20px',
        flexDirection: 'column',
        paddingLeft: '20px',
        minWidth: '550px'
      }}
    >
      <h1 style={{
        display: 'flex',
        margin: 'auto',
        justifyContent: 'center',
        marginBottom: '20px'
    }}>
        BATTLE RANK
      </h1>

      {sortedPlayers.map((player, index) => (
        <li 
          key={index}
          style={{
            border: index % 2 === 0 ? '2px solid white' : 'none',
            borderRadius: '15px',
            marginBottom: '10px',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            maxWidth: '90%',
            position: 'relative'
          }}
        >
          {index === 0 && (
          <img 
            src={gold} 
            alt="gold" 
            style={{
              position: 'absolute',
              top: '-10px',
              left: 'calc(50% - 118px)'
            }} 
          />
        )} {/* display gold crown icon above the first player */}
        {index === 1 && (
          <img 
            src={silver} 
            alt="silver" 
            style={{
              position: 'absolute',
              top: '-10px',
              left: 'calc(50% - 118px)'
            }} 
        />
        )} {/* display silver crown icon above the second player */}
        {index === 2 && (
          <img 
            src={bronze} 
            alt="bronze" 
            style={{
              position: 'absolute',
              top: '15px',
              left: 'calc(50% - 118px)'
            }} 
          />
        )} {/* display bronze crown icon above the third player */}
          <div style={{ marginRight: '20px', fontSize: "35px" }}>{index + 1}{index === 0 ? 'st' : index === 1 ? 'nd' : index === 2 ? 'rd' : 'th'}</div> {/* display rank */}
          <img src={player.assetId} alt="character" 
            style={{ 
              height: '200px', 
              flex: '0 0 200px', 
              marginRight: '20px'
            }} /> {/* display character image */}
          <div style={{ flex: '1', fontSize: '30px' }}>
            <div>Name: {player.characterName}</div> {/* display character name */}
            <div>Wins: {player.numWins}</div> {/* display wins */}
            <div>Total Earned: {player.earnings} DC</div> {/* display total earned */}
          </div>
        </li>
      ))}
    </ol>
    </>
                

            </div>
        )
    }
    
    
}