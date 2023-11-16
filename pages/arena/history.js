import React, { useState } from "react"


import algosdk from "algosdk"

import { Grid, Typography, Button, TextField } from "@mui/material"

import DisplayChar from "../../components/contracts/Arena/DisplayChar";
import DisplayBat from "../../components/contracts/Arena/DisplayBat";

export default function History(props) { 

    const [ battles, setBattles ] = useState([])
    const [ battleSel, setBattleSel ] =useState(null)

    React.useEffect(() => {

        const fetchData = async () => {

            try {

        let numBattles = 10

        for (let i = 0; i < numBattles; i++) {
           

            const response = await fetch('/api/arena/getHistBattles', {
                method: "POST",
                body: JSON.stringify({
                contract: props.contracts.arena,
                i: i
                }),
                headers: {
                "Content-Type": "application/json",
                }
                
            });
            
            const session = await response.json()
                    
            setBattles(battles => [...battles, {battleNum: session.battleNum, winner: session.winner, winnerName: session.winnerName, loser: session.loser, loserName: session.loserName, wager: session.wager, story: session.story, randomNum: session.randomNum}])

            
        }
        }
        catch(error) {
            props.sendDiscordMessage(error, "History Fetch", activeAccount.address)
        }

    }
    fetchData();
    
    

        

    }, [])


        return (
            <div>
                <br />
                <Typography color="secondary" align="center" variant="h6"> Battles </Typography>
                <br />
                {battles.length > 0 ? 
                battles.map((battle, index) => {
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
                    if (battle.battleNum == battleSel) {
                        return (
                            <div key={index}>
                                <hr />
                                <Button style={{display: "flex", margin: "auto"}} onClick={() => setBattleSel(null)}>
                                <Typography color="secondary" align="center" variant="h6" style={{padding: 20}}> Battle {battle.battleNum} </Typography>
                                </Button>
    
                                <Grid container>
                                    <Grid item xs={12} sm={5} style={{display: "flex", margin: "auto", width: "50%", maxWidth: 300}} >
                                        <DisplayChar nftId={char1} sendDiscordMessage={props.sendDiscordMessage} />
                                    </Grid>
                                    <Grid item xs={12} sm={2}>
                                        <Typography color="secondary" align="center" variant="h6" style={{padding: 20}}> vs </Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={5} style={{display: "flex", margin: "auto", width: "50%", maxWidth: 300}}>
                                        <DisplayChar nftId={char2} sendDiscordMessage={props.sendDiscordMessage}/>
                                    </Grid>
                                </Grid>
    
                                <Typography color="secondary" align="center" variant="h6" style={{padding: 20}}> {battle.story} </Typography>
                                <br />
                                <Typography color="secondary" align="center" variant="h6" style={{padding: 20}}> Winner </Typography>
                                <div style={{display: "flex", margin: "auto", width: "50%", maxWidth: 300}}>
                                <DisplayChar nftId={battle.winner} sendDiscordMessage={props.sendDiscordMessage} />
                                </div>
                                <br />
                                <Typography color="secondary" align="center" variant="h6"> {Number(battle.wager).toLocaleString("en-US")} <img style={{width: 40, paddingRight: 20}} src="/invDC.svg"/> </Typography>
                                <br />
    
                            </div>
                        )
                    }
                    else {
                        return (
                            <div key={index}>
                                <hr />
                                <Button style={{display: "flex", margin: "auto"}} onClick={() => setBattleSel(battle.battleNum)}>
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