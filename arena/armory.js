import React, {useState} from "react"

import algosdk from "algosdk"

import { Grid, Button } from "@mui/material"

import Swapper from "../../components/contracts/Arena/Swapper"

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

                let traits = []
                let ownedTraits = []

                setWarriors([])
                setTraits([])
                setOwnTraits([])

                console.log(props.wallet)

                const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)

                const traitAddress = "3SKDMKVJQD7RR62DMOIXVK3CQQWSFXAM2JXMIRDOPLIW4MWWPBWYV3NZ3Y";
                const accountCreatedTraits = await indexerClient.lookupAccountCreatedAssets(traitAddress).limit(1000).do();


                accountCreatedTraits.assets.forEach(async (asset) => {

                    traits.push({name: asset.params.name, assetId: Number(asset.index)})
                    if (account.includes(Number(asset.index))) {
                        if (Number(asset.index) >= 1631153255 && Number(asset.index) <= 1631178480 || Number(asset.index) == 1792634314 || Number(asset.index) == 2311097594) {
                            ownedTraits.push({assetId: Number(asset.index), name: asset.params.name, type: "Background"})
                        }
                        else if (Number(asset.index) >= 1631181322 && Number(asset.index) <= 1631207955 || Number(asset.index) == 1792635942 || Number(asset.index) == 1792636565) {
                            ownedTraits.push({assetId: Number(asset.index), name: asset.params.name, type: "Weapon"})
                        }
                        else if (Number(asset.index) >= 1631208827 && Number(asset.index) <= 1631217677 || Number(asset.index) == 1631233542) {
                            ownedTraits.push({assetId: Number(asset.index), name: asset.params.name, type: "Magic"})
                        }
                        else if (Number(asset.index) == 1631224831 || (Number(asset.index) >= 1631236045 && Number(asset.index) <= 1631275042) || Number(asset.index) == 1792637776 || Number(asset.index) == 1792640216 || Number(asset.index) == 1935442966 || Number(asset.index) == 2156520475 || Number(asset.index) == 2311097574 || Number(asset.index) == 2311097577 || Number(asset.index) == 2311097585) {
                            ownedTraits.push({assetId: Number(asset.index), name: asset.params.name, type: "Head"})
                        }
                        else if ((Number(asset.index) >= 1631281879 && Number(asset.index) <= 1631305105) || Number(asset.index) == 1642179694 || Number(asset.index) == 1792660153 || Number(asset.index) == 1792645489 || Number(asset.index) == 1806077922 || Number(asset.index) == 2311097589) {
                            ownedTraits.push({assetId: Number(asset.index), name: asset.params.name, type: "Armour"})
                        }
                        else if (Number(asset.index) >= 1631307699  && Number(asset.index) <= 1631309418 || Number(asset.index) == 2156520477 || Number(asset.index) == 2311097583) {
                            ownedTraits.push({assetId: Number(asset.index), name: asset.params.name, type: "Extra"})
                        }
                        
                    }
                })

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