import React, {useState} from "react"

import { Grid, Button } from "@mui/material"

import Swapper from "../../components/contracts/Arena/Swapper"
import { CHAMPION_ASSET_TRAITS } from "../../components/contracts/Arena/traitsData"

import { useWallet } from '@txnlab/use-wallet-react'


export default function Swap(props) {

    const {
    wallets,
    activeWallet,
    activeAddress,
    isReady,
    signTransactions,
    transactionSigner,
    algodClient,
  } = useWallet()

    const [warriors, setWarriors] = useState([])
    const [traits, setTraits] = useState([])
    const [ownTraits, setOwnTraits] = useState([])


    const [selWarrior, setSelWarrior] = useState(null)

    const fetchData = async () => {

        try {

     
            if (activeAddress) {

                const response = await fetch('/api/getDcAssets', {
                    method: "POST",
                    body: JSON.stringify({
                    address: activeAddress,
                    }),
                    headers: {
                    "Content-Type": "application/json",
                    }
                    
                });
                
                const session = await response.json()

                console.log(session)

                let account = []

                session.forEach((asset) => {
                    account.push(asset.asset.index)
                })

                console.log(account)

                const accountSet = new Set(account.map(Number))
                let traits = CHAMPION_ASSET_TRAITS.map((trait) => ({
                    ...trait,
                    owned: accountSet.has(Number(trait.assetId)),
                }))
                let ownedTraits = traits.filter((trait) => trait.owned)

                setWarriors([])
                setTraits([])
                setOwnTraits([])

                console.log(props.wallet)

                console.log(traits)
                console.log(ownedTraits)

                setTraits(traits)
                setOwnTraits(ownedTraits)


             


                props.setMessage("")
            }
        }
        catch(error) {
            props.sendDiscordMessage(error, "Fetch Warriors", activeAddress)
            props.setMessage(error)
          }

    }



    React.useEffect(() => {

        
        fetchData();
        

    }, [activeAddress])

        
        

        if (selWarrior) {
            return (
                <Swapper refetchData={() => fetchData()} nftId={selWarrior.asset.index} traits={traits} ownTraits={ownTraits} contracts={props.contracts} zoom={true} setSelWarrior={setSelWarrior} setMessage={props.setMessage} setProgress={props.setProgress} sendErrorMessage={props.sendErrorMessage}/>
            )
        }
        else {
            return (
                <div >
                    <br />
                                                    
                    <Grid container spacing={3}>
        
                        {props.wallet.length > 0 ? props.wallet.map((warrior, index) => {
                            if (warrior.asset.params && warrior.asset.params.creator == "L6VIKAHGH4D7XNH3CYCWKWWOHYPS3WYQM6HMIPNBVSYZWPNQ6OTS5VERQY") {
                                return (
                                    <Grid key={index} item xs={6} sm={4} md={3} lg={2} >
                                        <Button onClick={() => setSelWarrior(warrior)}>
                                            <Swapper nftId={warrior.asset.index} traits={traits} zoom={false} contracts={props.contracts} sendErrorMessage={props.sendErrorMessage}/>
                                        </Button>
                                    </Grid>
                                )
                            }
                            
                        })
                        :
                        null
                        }
        
 
                    </Grid>
        
                    <br />
                    
                </div>
            )
        }
    
}
