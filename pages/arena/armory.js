import React, {useState} from "react"

import algosdk from "algosdk"

import { Grid, Typography, Button } from "@mui/material"

import Swapper from "../../components/contracts/Arena/Swapper"

import { useWallet } from '@txnlab/use-wallet'


export default function Swap(props) {

    const { activeAccount, signTransactions, sendTransactions } = useWallet()

    const [warriors, setWarriors] = useState([])
    const [traits, setTraits] = useState([])
    const [ownTraits, setOwnTraits] = useState([])


    const [selWarrior, setSelWarrior] = useState(null)

    const fetchData = async () => {

        try {
     
            if (activeAccount) {

                let account = []
                let warriors = []
                let traits = []
                let ownedTraits = []

                setWarriors([])
                setTraits([])
                setOwnTraits([])

                const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)


                if (!selWarrior) {

                    props.setMessage("Finding Warriors...")

                    let accountAssets = await indexerClient.lookupAccountAssets(activeAccount.address).limit(1000).do();
                        
                    accountAssets.assets.forEach((asset) => {
                        if (asset.amount >= 1) {
                            account.push(asset["asset-id"])
                        }
                    })


                    let numMyAssets = accountAssets.assets.length
                    let nextMyToken = accountAssets["next-token"]


                    while (numMyAssets == 1000) {

                        accountAssets = await indexerClient.lookupAccountAssets(activeAccount.address).limit(1000).nextToken(nextMyToken).do();

                        accountAssets.assets.forEach((asset) => {
                            if (asset.amount >= 1) {
                                account.push(asset["asset-id"])
                            }
                        })

                        numMyAssets = accountAssets.assets.length
                        nextMyToken = accountAssets["next-token"]

                    }
                    

                    let assets = await indexerClient.lookupAccountAssets("L6VIKAHGH4D7XNH3CYCWKWWOHYPS3WYQM6HMIPNBVSYZWPNQ6OTS5VERQY").do();

                    let numAssets
                    let nextToken

                    
                    assets.assets.forEach(async (asset) => {
                        if (account.includes(asset["asset-id"]) && asset["asset-id"] != 31566704) {
                            warriors.push(asset["asset-id"])
                        }
                    })

                    numAssets = assets.assets.length
                    nextToken = assets["next-token"]

                    while (numAssets == 1000) {

                        assets = await indexerClient.lookupAccountAssets("L6VIKAHGH4D7XNH3CYCWKWWOHYPS3WYQM6HMIPNBVSYZWPNQ6OTS5VERQY").nextToken(nextToken).do();

                        assets.assets.forEach(async (asset) => {
                            if (account.includes(asset["asset-id"]) && asset["asset-id"] != 31566704) {
                                warriors.push(asset["asset-id"])
                            }
                        })

                        numAssets = assets.assets.length
                        nextToken = assets["next-token"]

                    }

                    setWarriors(warriors)

                    const traitAddress = "3SKDMKVJQD7RR62DMOIXVK3CQQWSFXAM2JXMIRDOPLIW4MWWPBWYV3NZ3Y";
                    const accountCreatedTraits = await indexerClient.lookupAccountCreatedAssets(traitAddress).limit(1000).do();


                    accountCreatedTraits.assets.forEach(async (asset) => {

                        traits.push({name: asset.params.name, assetId: asset.index})
                        if (account.includes(asset.index)) {
                            if (asset.index >= 1631153255 && asset.index <= 1631178480 || asset.index == 1792634314 || asset.index == 2311097594) {
                                ownedTraits.push({assetId: asset.index, name: asset.params.name, type: "Background"})
                            }
                            else if (asset.index >= 1631181322 && asset.index <= 1631207955 || asset.index == 1792635942 || asset.index == 1792636565) {
                                ownedTraits.push({assetId: asset.index, name: asset.params.name, type: "Weapon"})
                            }
                            else if (asset.index >= 1631208827 && asset.index <= 1631217677 || asset.index == 1631233542) {
                                ownedTraits.push({assetId: asset.index, name: asset.params.name, type: "Magic"})
                            }
                            else if (asset.index == 1631224831 || (asset.index >= 1631236045 && asset.index <= 1631275042) || asset.index == 1792637776 || asset.index == 1792640216 || asset.index == 1935442966 || asset.index == 2156520475 || asset.index == 2311097574 || asset.index == 2311097577 || asset.index == 2311097585) {
                                ownedTraits.push({assetId: asset.index, name: asset.params.name, type: "Head"})
                            }
                            else if ((asset.index >= 1631281879 && asset.index <= 1631305105) || asset.index == 1642179694 || asset.index == 1792660153 || asset.index == 1792645489 || asset.index == 1806077922 || asset.index == 2311097589) {
                                ownedTraits.push({assetId: asset.index, name: asset.params.name, type: "Armour"})
                            }
                            else if (asset.index >= 1631307699  && asset.index <= 1631309418 || asset.index == 2156520477 || asset.index == 2311097583) {
                                ownedTraits.push({assetId: asset.index, name: asset.params.name, type: "Extra"})
                            }
                            
                        }
                    })

                    setTraits(traits)
                    setOwnTraits(ownedTraits)

                    console.log(ownedTraits)
                    console.log(traits)

                }

                else {

                    let accountAssets = await indexerClient.lookupAccountAssets(activeAccount.address).limit(1000).do();
                        
                    accountAssets.assets.forEach((asset) => {
                        if (asset.amount >= 1) {
                            account.push(asset["asset-id"])
                        }
                    })


                    let numMyAssets = accountAssets.assets.length
                    let nextMyToken = accountAssets["next-token"]

                    while (numMyAssets == 1000) {

                        accountAssets = await indexerClient.lookupAccountAssets(activeAccount.address).limit(1000).nextToken(nextMyToken).do();

                        accountAssets.assets.forEach((asset) => {
                            if (asset.amount >= 1) {
                                account.push(asset["asset-id"])
                            }
                        })

                        numMyAssets = accountAssets.assets.length
                        nextMyToken = accountAssets["next-token"]

                    }
                    

                    let assets = await indexerClient.lookupAccountAssets("L6VIKAHGH4D7XNH3CYCWKWWOHYPS3WYQM6HMIPNBVSYZWPNQ6OTS5VERQY").do();

                    let numAssets
                    let nextToken

                    
                    assets.assets.forEach(async (asset) => {
                        if (account.includes(asset["asset-id"])) {
                            warriors.push(asset["asset-id"])
                        }
                    })

                    numAssets = assets.assets.length
                    nextToken = assets["next-token"]

                    while (numAssets == 1000) {

                        assets = await indexerClient.lookupAccountAssets("L6VIKAHGH4D7XNH3CYCWKWWOHYPS3WYQM6HMIPNBVSYZWPNQ6OTS5VERQY").nextToken(nextToken).do();

                        assets.assets.forEach(async (asset) => {
                            if (account.includes(asset["asset-id"])) {
                                warriors.push(asset["asset-id"])
                            }
                        })

                        numAssets = assets.assets.length
                        nextToken = assets["next-token"]

                    }

                    setWarriors(warriors)

                    const traitAddress = "3SKDMKVJQD7RR62DMOIXVK3CQQWSFXAM2JXMIRDOPLIW4MWWPBWYV3NZ3Y";
                    const accountCreatedTraits = await indexerClient.lookupAccountCreatedAssets(traitAddress).limit(1000).do();

                    accountCreatedTraits.assets.forEach(async (asset) => {

                        traits.push({name: asset.params.name, assetId: asset.index})
                        if (account.includes(asset.index)) {
                            if (asset.index >= 1631153255 && asset.index <= 1631178480 || asset.index == 1792634314 || asset.index == 2311097594) {
                                ownedTraits.push({assetId: asset.index, name: asset.params.name, type: "Background"})
                            }
                            else if (asset.index >= 1631181322 && asset.index <= 1631207955 || asset.index == 1792635942 || asset.index == 1792636565) {
                                ownedTraits.push({assetId: asset.index, name: asset.params.name, type: "Weapon"})
                            }
                            else if (asset.index >= 1631208827 && asset.index <= 1631217677 || asset.index == 1631233542) {
                                ownedTraits.push({assetId: asset.index, name: asset.params.name, type: "Magic"})
                            }
                            else if (asset.index == 1631224831 || (asset.index >= 1631236045 && asset.index <= 1631275042) || asset.index == 1792637776 || asset.index == 1792640216 || asset.index == 1935442966 || asset.index == 2156520475 || asset.index == 2311097574 || asset.index == 2311097577 || asset.index == 2311097585) {
                                ownedTraits.push({assetId: asset.index, name: asset.params.name, type: "Head"})
                            }
                            else if ((asset.index >= 1631281879 && asset.index <= 1631305105) || asset.index == 1642179694 || asset.index == 1792660153 || asset.index == 1792645489 || asset.index == 1806077922 || asset.index == 2311097589) {
                                ownedTraits.push({assetId: asset.index, name: asset.params.name, type: "Armour"})
                            }
                            else if (asset.index >= 1631307699  && asset.index <= 1631309418 || asset.index == 2156520477 || asset.index == 2311097583) {
                                ownedTraits.push({assetId: asset.index, name: asset.params.name, type: "Extra"})
                            }
                            
                        }
                    })

                    setTraits(traits)
                    setOwnTraits(ownedTraits)
                }


                props.setMessage("")
            }
        }
        catch(error) {
            props.sendDiscordMessage(error, "Fetch Warriors", activeAccount.address)
            props.setMessage(error)
          }

    }



    React.useEffect(() => {

        
        fetchData();
        

    }, [activeAccount])

        
        
        console.log(warriors)

        if (selWarrior) {
            return (
                <Swapper refetchData={() => fetchData()} nftId={selWarrior} traits={traits} ownTraits={ownTraits} contracts={props.contracts} zoom={true} setSelWarrior={setSelWarrior} setMessage={props.setMessage} setProgress={props.setProgress} sendErrorMessage={props.sendErrorMessage}/>
            )
        }
        else {
            return (
                <div >
                    <br />
                                                    
                    <Grid container spacing={3}>
        
                        {warriors.length > 0 ? warriors.map((warrior, index) => {
                            if (warrior != 31566704) {
                                return (
                                    <Grid key={index} item xs={6} sm={4} md={3} lg={2} >
                                        <Button onClick={() => setSelWarrior(warrior)}>
                                            <Swapper nftId={warrior} traits={traits} zoom={false} contracts={props.contracts} sendErrorMessage={props.sendErrorMessage}/>
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