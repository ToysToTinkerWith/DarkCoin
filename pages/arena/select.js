import React, {useState, useEffect} from "react"


import algosdk from "algosdk"

import { Grid, Typography, Button } from "@mui/material"

import { useWallet } from '@txnlab/use-wallet'

import DisplayChar from "../../components/contracts/Arena/DisplayChar"


export default function Select(props) {

    const { activeAccount, signTransactions, sendTransactions } = useWallet()

    const [dcChars, setDcChars] = useState([])
    const [charSelect, setCharSelect] = useState(null)


    React.useEffect(() => {

        const fetchData = async () => {

            try {
         
                if (activeAccount) {

                props.setMessage("Finding Characters...")

                const response = await fetch('/api/arena/getDcChars', {
                    method: "POST",
                    body: JSON.stringify({
                        address: activeAccount.address,
                    }),
                    headers: {
                        "Content-Type": "application/json",
                    }
                        
                    });
                
                    const session = await response.json()
                        
                    setDcChars(session)

                    props.setMessage("")
                }
            }
            catch(error) {
                props.sendDiscordMessage(error, "Fetch Select", activeAccount.address)
              }
    
        }
        fetchData();
        
        
    
            
    
        }, [activeAccount])

        if (charSelect) {
            return (
                <div>
                    <DisplayChar nftId={charSelect} setNft={(nftId) => setCharSelect(nftId)} select={true} contracts={props.contracts} setMessage={props.setMessage} sendDiscordMessage={props.sendDiscordMessage}/>
                </div>
            )
        }

        else {
            return (
                <div>
                    <Grid container align="center">
                    {dcChars.length > 0 ? 
                    dcChars.map((nft, index) => {
                        return (
                            <Grid key={index} item xs={6} sm={4} md={3} lg={2} style={{position: "relative"}} >
                                <DisplayChar style={{position: "absolute"}} nftId={nft} setNft={(nftId) => setCharSelect(nftId)} sendDiscordMessage={props.sendDiscordMessage}/>
                            </Grid>
                        )
                    })
                    :
                   null
                    }
                    </Grid>
                </div>
            )
        }
    
    
}