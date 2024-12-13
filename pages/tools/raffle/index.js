import React, {useState} from "react"

import algosdk from "algosdk"

import { Grid, Typography, Button, Slider, TextField } from "@mui/material"

import { useWallet } from '@txnlab/use-wallet'

import { BarChart, XAxis, YAxis, Bar, Tooltip, ResponsiveContainer} from "recharts"


export default function Raffle(props) {

    const { activeAccount, signTransactions, sendTransactions } = useWallet()

    const [assetId1, setAssetId1] = useState("assetId1")
    const [assetId2, setAssetId2] = useState("assetId2")
    const [assetId3, setAssetId3] = useState("assetId3")
    const [assetId4, setAssetId4] = useState("assetId4")

    const [assetAmount1, setAssetAmount1] = useState("assetAmount1")
    const [assetAmount2, setAssetAmount2] = useState("assetAmount2")
    const [assetAmount3, setAssetAmount3] = useState("assetAmount3")
    const [assetAmount4, setAssetAmount4] = useState("assetAmount4")

    const [ticketAssetId, setTicketAssetId] = useState("ticketAssetId")
    const [ticketAssetAmount, setTicketAssetAmount] = useState("ticketAssetAmount")

    const [raffleLength, setRaffleLength] = useState("raffleLength")

    const [currentRound, setCurrentRound] = useState(null)
    const [blockTime, setBlockTime] = useState(null)

    const [raffles, setRaffles] = useState([])

    const [tickets, setTickets] = useState([])

    const handleChange = (value) => {
        if (value.target.name == "assetId1") {
            setAssetId1(value.target.value);
        }
        if (value.target.name == "assetId2") {
            setAssetId2(value.target.value);
        }
        if (value.target.name == "assetId3") {
            setAssetId3(value.target.value);
        }
        if (value.target.name == "assetId4") {
            setAssetId4(value.target.value);
        }

        if (value.target.name == "assetAmount1") {
            setAssetAmount1(value.target.value);
        }
        if (value.target.name == "assetAmount2") {
            setAssetAmount2(value.target.value);
        }
        if (value.target.name == "assetAmount3") {
            setAssetAmount3(value.target.value);
        }
        if (value.target.name == "assetAmount4") {
            setAssetAmount4(value.target.value);
        }

        if (value.target.name == "ticketAssetId") {
            setTicketAssetId(value.target.value);
        }
        if (value.target.name == "ticketAssetAmount") {
            setTicketAssetAmount(value.target.value);
        }

        if (value.target.name == "raffleLength") {
            setRaffleLength(value.target.value);
        }
        
    }

      
    function base64ToDecimal(encodedString) {
        // Convert base 64 encoded string to text
        var text = atob(encodedString);
        var decimalArray = [];
        
        // Run a loop on all characters of the text and convert each character to decimal
        for (var i = 0; i < text.length; i++) {
            decimalArray.push(text.charAt(i).charCodeAt(0));
        }
    
        // Join all decimals to get the final decimal for the entire string
        return byteArrayToLong(decimalArray);
    }
      
    const byteArrayToLong = (byteArray) => {
        var value = 0;
        for ( var i = 0; i < byteArray.length; i++) {
            value = (value * 256) + byteArray[i];
        }
    
        return value;
    };

    React.useEffect(() => {

        const fetchData = async () => {

        const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)

        const status = await client.status().do();

        setCurrentRound(status["last-round"])

        const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)

        let targetBlock = status["last-round"] - 10;
        let blockInfo = await indexerClient.lookupBlock(targetBlock).do();
        let firstBlock = blockInfo.timestamp

        targetBlock = status["last-round"] - 110;
        blockInfo = await indexerClient.lookupBlock(targetBlock).do();
        let secondBlock = blockInfo.timestamp

        setBlockTime((firstBlock - secondBlock) / 100)

        // let tickets = []

        // const txns = await indexerClient.searchForTransactions().applicationID(props.contracts.raffle).do();
        // console.log(txns)

        // txns.transactions.forEach((txn) => {
        //     if(txn["tx-type"] == "appl") {

        //         if(txn["application-transaction"]["application-args"][0] == "Y3JlYXRlUmFmZmxl") {
        //             tickets[txn.sender] = 0
        //         }

                
        //         if(txn["application-transaction"]["application-args"][0] == "am9pblJhZmZsZQ==") {
        //             if (txn["application-transaction"]["application-args"][1]) {
        //                 console.log(txn)
        //                 tickets[txn.sender] = base64ToDecimal(txn["application-transaction"]["application-args"][1])
        //             }
        //             else {
        //                 tickets[txn.sender] += 1
        //             }
                    
        //         }

        //         if(txn["application-transaction"]["application-args"][0] == "cmV3YXJkUmFmZmxl") {
        //             tickets[txn["application-transaction"].accounts[1]] = 0
        //         }
                
        //     }
        // })

        // setTickets(tickets)

        // console.log(tickets)


        let global = await indexerClient.lookupApplications(props.contracts.raffle).do();

        let globalState = global.application.params["global-state"]
    
        let raffles = []

        if (global.application.params["global-state"]) {

        let numRaffles = global.application.params["global-state"].length
    
        globalState.forEach(async (keyVal) => {
                
            let addr = algosdk.encodeAddress(Buffer.from(keyVal.key, "base64"))
            let endRound = keyVal.value.uint

            const accountAppLocalStates = await indexerClient.lookupAccountAppLocalStates(addr).do();

            let rewards = []
            let ticketId
            let ticketPrice
            let ticketInfo

            accountAppLocalStates["apps-local-states"].forEach(async (localState) => {
                if(localState.id == props.contracts.raffle) {
                    localState["key-value"].forEach(async (keyVal) => {
                        if(Buffer.from(keyVal.key, "base64").length == 8) {
                            let assetId = byteArrayToLong(Buffer.from(keyVal.key, "base64"))
                            let assetInfo = await indexerClient.lookupAssetByID(assetId).do();
                           
                            rewards.push({assetUnit: assetInfo.asset.params["unit-name"], assetId: assetId, assetAmount: keyVal.value.uint / (10 ** assetInfo.asset.params.decimals)})


                        }
                        if(Buffer.from(keyVal.key, "base64").length == 9) {
                            ticketId = keyVal.value.uint
                            
                            


                        }
                        if(Buffer.from(keyVal.key, "base64").length == 12) {
                            ticketPrice = keyVal.value.uint
                        }
                    })
                }
            })

            ticketInfo = await indexerClient.lookupAssetByID(ticketId).do();

            raffles.push({addr: addr, endRound: endRound, rewards: rewards, ticketInfo: ticketInfo, ticketId: ticketId, ticketPrice: ticketPrice})

            if(raffles.length == numRaffles) {
                setRaffles(raffles)
            }
            
        })

        }

    }
    fetchData()

    }, [])

        const createRaffle = async () => {

        const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)

        const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)

        let params = await client.getTransactionParams().do();

        let txns = []

        


        const appArgs = []
        appArgs.push(
            new Uint8Array(Buffer.from("createRaffle")),        
        )

        const accounts = []
        const foreignApps = []
        
        let foreignAssets = []

        foreignAssets.push(Number(ticketAssetId))

        let rewards = []

        if(!isNaN(assetId1) && !isNaN(assetAmount1)) {
        
            foreignAssets.push(Number(assetId1))

            let assetInfo = await indexerClient.lookupAssetByID(Number(assetId1)).do();

            let decimals = assetInfo.asset.params.decimals
            let div = 10**decimals


            let ftxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
                activeAccount.address, 
                "6BWWPPYZM6NYFYGKP4Z2PPHECGK54MGGNGYQMHJX6WGTBBKAF3R4M5K4DQ", 
                undefined, 
                undefined,
                Number(assetAmount1) * div,  
                undefined, 
                Number(assetId1), 
                params
            );

            txns.push(ftxn)

            rewards.push({assetName: assetInfo.asset.params.name, assetUnit: assetInfo.asset.params["unit-name"], assetAmount: Number(assetAmount1), assetId: Number(assetId1)})
        }

        if(!isNaN(assetId2) && !isNaN(assetAmount2)) {
        
            foreignAssets.push(Number(assetId2))

            let assetInfo = await indexerClient.lookupAssetByID(Number(assetId2)).do();

            let decimals = assetInfo.asset.params.decimals
            let div = 10**decimals


            let ftxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
                activeAccount.address, 
                "6BWWPPYZM6NYFYGKP4Z2PPHECGK54MGGNGYQMHJX6WGTBBKAF3R4M5K4DQ", 
                undefined, 
                undefined,
                Number(assetAmount2) * div,  
                undefined, 
                Number(assetId2), 
                params
            );

            txns.push(ftxn)

            rewards.push({assetName: assetInfo.asset.params.name, assetUnit: assetInfo.asset.params["unit-name"], assetAmount: Number(assetAmount2), assetId: Number(assetId2)})

        }

        if(!isNaN(assetId3) && !isNaN(assetAmount3)) {
        
            foreignAssets.push(Number(assetId3))

            let assetInfo = await indexerClient.lookupAssetByID(Number(assetId3)).do();

            let decimals = assetInfo.asset.params.decimals
            let div = 10**decimals


            let ftxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
                activeAccount.address, 
                "6BWWPPYZM6NYFYGKP4Z2PPHECGK54MGGNGYQMHJX6WGTBBKAF3R4M5K4DQ", 
                undefined, 
                undefined,
                Number(assetAmount3) * div,  
                undefined, 
                Number(assetId3), 
                params
            );

            txns.push(ftxn)

            rewards.push({assetName: assetInfo.asset.params.name, assetUnit: assetInfo.asset.params["unit-name"], assetAmount: Number(assetAmount3), assetId: Number(assetId3)})

        }

        if(!isNaN(assetId4) && !isNaN(assetAmount4)) {
        
            foreignAssets.push(Number(assetId4))

            let assetInfo = await indexerClient.lookupAssetByID(Number(assetId4)).do();

            let decimals = assetInfo.asset.params.decimals
            let div = 10**decimals


            let ftxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
                activeAccount.address, 
                "6BWWPPYZM6NYFYGKP4Z2PPHECGK54MGGNGYQMHJX6WGTBBKAF3R4M5K4DQ", 
                undefined, 
                undefined,
                Number(assetAmount4) * div,  
                undefined, 
                Number(assetId4), 
                params
            );

            txns.push(ftxn)

            rewards.push({assetName: assetInfo.asset.params.name, assetUnit: assetInfo.asset.params["unit-name"], assetAmount: Number(assetAmount4), assetId: Number(assetId4)})

        }

        const boxes = []

        appArgs.push(algosdk.encodeUint64(Number(ticketAssetId)))
        appArgs.push(algosdk.encodeUint64(Number(ticketAssetAmount)))
        appArgs.push(algosdk.encodeUint64(Number(((raffleLength) / blockTime * 60 * 60 * 24).toFixed(0))))

        let assetInfo = await indexerClient.lookupAssetByID(Number(ticketAssetId)).do();

        let ticket = {assetName: assetInfo.asset.params.name, assetUnit: assetInfo.asset.params["unit-name"], assetAmount: Number(ticketAssetAmount), assetId: Number(ticketAssetId)}
        
        let atxn = algosdk.makeApplicationNoOpTxn(activeAccount.address, params, props.contracts.raffle, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
        
        txns.unshift(atxn)

        let accountAppLocalStates = await indexerClient.lookupAccountAppLocalStates(activeAccount.address).do();

        let opted = false        
    
        accountAppLocalStates["apps-local-states"].forEach((app) => {
        if (app.id == props.contracts.raffle) {
            opted = true
        }
        })
    
        let otxn = algosdk.makeApplicationOptInTxn(activeAccount.address, params, props.contracts.raffle)
    
        if (!opted) {
            txns.unshift(otxn)
        }

        let optedin = false

        let optedAsset = await indexerClient.lookupAssetBalances(Number(ticketAssetId)).do();

        optedAsset.balances.forEach((account) => {
            if(account.address == activeAccount.address) {
            optedin = true
            }
        })

        if (!optedin) {

            let txn = algosdk.makeAssetTransferTxnWithSuggestedParams(
                activeAccount.address, 
                activeAccount.address, 
                undefined, 
                undefined,
                0,  
                undefined, 
                Number(ticketAssetId), 
                params
            );

            txns.unshift(txn)
            
        }

        let txgroup = algosdk.assignGroupID(txns)

        let encodedTxns= []

        txns.forEach((txn) => {
        let encoded = algosdk.encodeUnsignedTransaction(txn)
        encodedTxns.push(encoded)

        })

        props.setMessage("Sign transaction...")

        const signedTransactions = await signTransactions(encodedTxns)

        props.setMessage("Sending transaction...")

        const { id } = await sendTransactions(signedTransactions)

        let confirmedTxn = await algosdk.waitForConfirmation(client, id, 4);

        props.setMessage("Raffle created.")
        props.setProgress(0)

        updateDiscord(rewards, ticket, raffleLength)

        
        }

        const updateDiscord = async (rewards, ticket, length) => {

            let embeds = []
      
            embeds.push({
                "title": "A new raffle has been made!",
                "url": "https://dark-coin.com/tools/raffle/" + String(activeAccount.address),
                "color": 0
            })

            embeds.push({
                "title": "Rewards",
                "color": 0
            })
            
            rewards.forEach((reward) => {
                embeds.push({
                    "description": reward.assetAmount + " " + reward.assetName + "\n" + "(" + reward.assetId + ")",
                    "color": 16777215
                })
            })
      
            embeds.push({
                "title": "Ticket Cost",
                "description": ticket.assetAmount + " " + ticket.assetName + "\n" + "(" + ticket.assetId + ")",
                "color": 0
            })

            embeds.push({
                "title": "Raffle Length",
                "description": length + " days",
                "color": 0
            })
      
      
            const response = await fetch(process.env.newRaffleWebhook, {
                method: "POST",
                body: JSON.stringify({
                    username: "Raffle Create",
                    embeds: embeds
                }),
                headers: {
                  "Content-Type": "application/json",
                },
              });
      
      
      
            
        }

       


    return (
        <div>
            <Typography color="secondary" align="center" variant="h6"> Rewards (Up to 4) </Typography>
            <br />
            <div style={{display: "flex"}}>
                <TextField                
                    onChange={handleChange}
                    value={assetId1}
                    type="text"
                    name="assetId1"
                    autoComplete="false"
                    InputProps={{ style: { color: "black" } }}
                    style={{
                    color: "black",
                    background: "white",
                    borderRadius: 15,
                    display: "flex",
                    margin: "auto",
                    width: "35%"
                    }}
                />
                <TextField                
                    onChange={handleChange}
                    value={assetAmount1}
                    type="text"
                    name="assetAmount1"
                    autoComplete="false"
                    InputProps={{ style: { color: "black" } }}
                    style={{
                    color: "black",
                    background: "white",
                    borderRadius: 15,
                    display: "flex",
                    margin: "auto",
                    width: "35%"
                    }}
                />
                <br />
            </div>
            <div style={{display: "flex"}}>
                <TextField                
                    onChange={handleChange}
                    value={assetId2}
                    type="text"
                    name="assetId2"
                    autoComplete="false"
                    InputProps={{ style: { color: "black" } }}
                    style={{
                    color: "black",
                    background: "white",
                    borderRadius: 15,
                    display: "flex",
                    margin: "auto",
                    width: "35%"
                    }}
                />
                <TextField                
                    onChange={handleChange}
                    value={assetAmount2}
                    type="text"
                    name="assetAmount2"
                    autoComplete="false"
                    InputProps={{ style: { color: "black" } }}
                    style={{
                    color: "black",
                    background: "white",
                    borderRadius: 15,
                    display: "flex",
                    margin: "auto",
                    width: "35%"
                    }}
                />
                <br />
            </div>
            <div style={{display: "flex"}}>
                <TextField                
                    onChange={handleChange}
                    value={assetId3}
                    type="text"
                    name="assetId3"
                    autoComplete="false"
                    InputProps={{ style: { color: "black" } }}
                    style={{
                    color: "black",
                    background: "white",
                    borderRadius: 15,
                    display: "flex",
                    margin: "auto",
                    width: "35%"
                    }}
                />
                <TextField                
                    onChange={handleChange}
                    value={assetAmount3}
                    type="text"
                    name="assetAmount3"
                    autoComplete="false"
                    InputProps={{ style: { color: "black" } }}
                    style={{
                    color: "black",
                    background: "white",
                    borderRadius: 15,
                    display: "flex",
                    margin: "auto",
                    width: "35%"
                    }}
                />
                <br />
            </div>
            <div style={{display: "flex"}}>
                <TextField                
                    onChange={handleChange}
                    value={assetId4}
                    type="text"
                    name="assetId4"
                    autoComplete="false"
                    InputProps={{ style: { color: "black" } }}
                    style={{
                    color: "black",
                    background: "white",
                    borderRadius: 15,
                    display: "flex",
                    margin: "auto",
                    width: "35%"
                    }}
                />
                <TextField                
                    onChange={handleChange}
                    value={assetAmount4}
                    type="text"
                    name="assetAmount4"
                    autoComplete="false"
                    InputProps={{ style: { color: "black" } }}
                    style={{
                    color: "black",
                    background: "white",
                    borderRadius: 15,
                    display: "flex",
                    margin: "auto",
                    width: "35%"
                    }}
                />
                <br />
            </div>
            <br />
            <Typography color="secondary" align="center" variant="h6" > Ticket Cost </Typography>
            <br />
            <div style={{display: "flex"}}>
                <TextField                
                    onChange={handleChange}
                    value={ticketAssetId}
                    type="text"
                    name="ticketAssetId"
                    autoComplete="false"
                    InputProps={{ style: { color: "black" } }}
                    style={{
                    color: "black",
                    background: "white",
                    borderRadius: 15,
                    display: "flex",
                    margin: "auto",
                    width: "35%"
                    }}
                />
                <TextField                
                    onChange={handleChange}
                    value={ticketAssetAmount}
                    type="text"
                    name="ticketAssetAmount"
                    autoComplete="false"
                    InputProps={{ style: { color: "black" } }}
                    style={{
                    color: "black",
                    background: "white",
                    borderRadius: 15,
                    display: "flex",
                    margin: "auto",
                    width: "35%"
                    }}
                />
                <br />
            </div>
            <br />
            <Typography color="secondary" align="center" variant="h6" > Length (days) </Typography>
            <br />
            <div >
                <TextField                
                    onChange={handleChange}
                    value={raffleLength}
                    type="text"
                    name="raffleLength"
                    autoComplete="false"
                    InputProps={{ style: { color: "black" } }}
                    style={{
                    color: "black",
                    background: "white",
                    borderRadius: 15,
                    display: "flex",
                    margin: "auto",
                    width: "35%"
                    }}
                />
                
                <br />
                {!isNaN(raffleLength) ? 
                <Typography color="secondary" align="center" variant="h6" > {((raffleLength) / blockTime * 60 * 60 * 24).toFixed(0)} rounds </Typography>
                :
                null
                }
            </div>
            
            <br />
            

            <Button variant="contained" color="secondary" style={{display: "flex", margin: "auto"}} onClick={() => createRaffle()}>
            <Typography variant="h6"> Create Raffle </Typography>

            <img src="/invDC.svg" style={{display: "flex", margin: "auto", width: 50, padding: 10}} />

            </Button>
            <br />
            <Typography align="center" color="secondary" variant="h6"> Raffles </Typography>
            <br />

            <Grid container >

            {raffles.length > 0 ? raffles.map((raffle, index) => {
                let addresses = []
                tickets.forEach((ticket) => {
                    if(ticket.seller == raffle.addr) {
                        addresses.push(ticket.buyer)
                    }
                })

                function countOccurrences(arr) {
                    return arr.reduce((acc, val) => {
                        console.log(acc, val)
                        acc[val] = (acc[val] || 0) + 1;
                        return acc;
                    }, {});
                }

                let sortedTickets = countOccurrences(addresses)

                let ticketGraph = []

                Object.entries(sortedTickets).forEach((ticket) => {
                    ticketGraph.push({address: ticket[0], amount: ticket[1]})
                })



             
                return (
                    <Grid item xs={12} sm={6} md={4} key={index} style={{display: "block", padding: 20, border: "1px solid white", borderRadius: 15, width: "100%"}}>
                        <Button style={{display: "block", textTransform: "none"}} href={"/tools/raffle/" + raffle.addr}>
                        <Typography align="center" color="secondary"> Proposer: {raffle.addr.substring(0,10)}...{raffle.addr.substring(48)} </Typography>
                        <br />
                        <div>
                        <Typography align="left" color="secondary"> Rewards: </Typography>
                        <br />
                        <Grid container>
                        {raffle.rewards.length > 0 ? raffle.rewards.map((reward, index) => {
                            return (
                                <Grid item xs={12} sm={6} key={index} style={{padding: 20, border: "1px solid white", borderRadius: 15}}>
                                    <Typography align="center" color="secondary"> {reward.assetUnit} {reward.assetId}</Typography>
                                    <br />
                                    <Typography align="center" color="secondary"> Amount: {reward.assetAmount.toLocaleString('en', {useGrouping:true})} </Typography>
                                </Grid>
                            )
                        })
                        :
                        null
                        }
                        </Grid>
                        <br />
                        <Typography align="left" color="secondary"> Ticket Price: </Typography>
                        <br />
                        <Grid item style={{padding: 20, border: "1px solid white", borderRadius: 15}}>
                        <Typography align="center" color="secondary"> {raffle.ticketInfo ? raffle.ticketInfo.asset.params["unit-name"] : null} {raffle.ticketId}</Typography>
                        <br />
                        <Typography align="center" color="secondary"> Amount: {raffle.ticketPrice.toLocaleString('en', {useGrouping:true})}</Typography>
                        </Grid>
                        </div>
                        <br />

                        {currentRound && raffle.endRound ? 
                        <Typography color="primary" align="center" variant="subtitle1" style={{color: "white"}}> Time left: {((raffle.endRound - currentRound) * blockTime / 60 / 60 / 24).toFixed(2)} more days </Typography>
                        :
                        null
                        }
                        <br />

                        {/* <Typography align="center" color="secondary"> Tickets Sold: {tickets[raffle.addr]} </Typography>
                        <br /> */}
                        </Button>

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