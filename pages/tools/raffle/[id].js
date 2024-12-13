import React, {useState} from "react"

import algosdk from "algosdk"

import { Grid, Typography, Button, Slider, TextField } from "@mui/material"

import { useWallet } from '@txnlab/use-wallet'

import { BarChart, XAxis, YAxis, Bar, Tooltip, ResponsiveContainer, PieChart, Pie} from "recharts"

import { useRouter } from 'next/router'
import { gridSortedRowEntriesSelector } from "@mui/x-data-grid"


export default function Raffle(props) {

    const { activeAccount, signTransactions, sendTransactions } = useWallet()

    const [currentRound, setCurrentRound] = useState(null)
    const [blockTime, setBlockTime] = useState(null)

    const [raffles, setRaffles] = useState([])

    const [tickets, setTickets] = useState([])

    const [ticketAmount, setTicketAmount] = useState(1)


    const router = useRouter()

    const handleChange = (value) => {
        if (value.target.name == "ticketAmount") {
            setTicketAmount(value.target.value);
        }
        
    }

    const renderTooltip = (props) => {
        const { active, payload } = props;
    
        if (active && payload && payload.length) {
        const data = payload[0] && payload[0].payload;
        return (
            <div style={{backgroundColor: "black"}}>
            
            <Typography color="secondary">{(data.account).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</Typography>
            <Typography color="secondary">{(data.amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</Typography>

    
            </div>
        );
        }
    
        return null;
      };

      const RADIAN = Math.PI / 180;
        const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, vote, amount, account }) => {
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        return (
            <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
            {account.substring(0,10)} = {`${(percent * 100).toFixed(2)}%`} ({amount})
            </text>
          
        );
      };

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

            if (router) {

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

        let tickets = []

        const txns = await indexerClient.searchForTransactions().applicationID(props.contracts.raffle).do();

        console.log(txns)

        txns.transactions.forEach((txn) => {
            if(txn["tx-type"] == "appl") {
                if (txn["application-transaction"].accounts[1] == router.query.id) {
                    tickets = []
                }
                if (txn["application-transaction"].accounts[0] == router.query.id) {
                    if(txn["application-transaction"]["application-args"][0] == "am9pblJhZmZsZQ==") {
                        if (txn["application-transaction"]["application-args"][1]) {
                            tickets.push({account: txn.sender, amount: base64ToDecimal(txn["application-transaction"]["application-args"][1])})

                        }
                        else {
                            tickets.push({account: txn.sender, amount: 1})
                        }
                        
                    }
                }
                
            }
        })

        setTickets(tickets)


        let global = await indexerClient.lookupApplications(props.contracts.raffle).do();

        let globalState = global.application.params["global-state"]
    
        let raffles = []
    
        globalState.forEach(async (keyVal) => {
                
            let addr = algosdk.encodeAddress(Buffer.from(keyVal.key, "base64"))
            let endRound = keyVal.value.uint

            if (addr == router.query.id) {

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

                setRaffles(raffles)


            }
            
            
        })
    }

    }
    fetchData()

    }, [router])

        const joinRaffle = async (addr, ticketPrice, ticketId, rewards) => {

            const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)

            const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)

            let params = await client.getTransactionParams().do();

            let txns = []

            rewards.forEach(async (reward) => {

                let optedin = false

                let opted = await indexerClient.lookupAssetBalances(reward.assetId).do();

                console.log(opted)

                opted.balances.forEach((account) => {
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
                        reward.assetId, 
                        params
                    );

                    txns.push(txn)
                    
                }

                
            })

            let assetInfo = await indexerClient.lookupAssetByID(ticketId).do();

            let decimals = assetInfo.asset.params.decimals
            let div = 10**decimals

            let ftxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
                activeAccount.address, 
                "6BWWPPYZM6NYFYGKP4Z2PPHECGK54MGGNGYQMHJX6WGTBBKAF3R4M5K4DQ", 
                undefined, 
                undefined,
                ticketPrice * div * ticketAmount,  
                undefined, 
                ticketId, 
                params
            );

            txns.push(ftxn)
    
            const appArgs = []
            appArgs.push(
                new Uint8Array(Buffer.from("joinRaffle")),
                algosdk.encodeUint64(Number(ticketAmount))
            )
    
            const accounts = [addr]
            const foreignApps = []
            
            const foreignAssets = [ticketId]
            const boxes = []
        
            let atxn = algosdk.makeApplicationNoOpTxn(activeAccount.address, params, props.contracts.raffle, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);

            txns.push(atxn)

            

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

            props.setMessage("Ticket Purchased.")

            let ticketAssetInfo = await indexerClient.lookupAssetByID(Number(ticketId)).do();

            let ticket = {assetName: ticketAssetInfo.asset.params.name, assetUnit: ticketAssetInfo.asset.params["unit-name"], assetAmount: Number(ticketPrice), assetId: Number(ticketId)}

            updateDiscordJoin(addr, ticket, ((raffles[0].endRound - currentRound) * blockTime / 60 / 60 / 24).toFixed(2))

            const ticketTxns = await indexerClient.searchForTransactions().applicationID(props.contracts.raffle).do();

            let tickets = []
            setTickets([])

            ticketTxns.transactions.forEach((txn) => {
                if(txn["tx-type"] == "appl") {
                    if (txn["application-transaction"].accounts[1] == router.query.id) {
                        tickets = []
                    }
                    if (txn["application-transaction"].accounts[0] == router.query.id) {
                        if(txn["application-transaction"]["application-args"][0] == "am9pblJhZmZsZQ==") {
                            if (txn["application-transaction"]["application-args"][1]) {
                                tickets.push({account: txn.sender, amount: base64ToDecimal(txn["application-transaction"]["application-args"][1])})
    
                            }
                            else {
                                tickets.push({account: txn.sender, amount: 1})
                            }
                            
                        }
                    }
                    
                }
            })

            setTickets(tickets)
    
    
        }

        const updateDiscordJoin = async (addr, ticket, length) => {

            let embeds = []
      
            embeds.push({
                "title": "Ticket purchased.",
                "url": "https://dark-coin.com/tools/raffle/" + addr,
                "color": 0
            })
      
            embeds.push({
                "title": ticketAmount + " Tickets",
                "description": "Ticket Cost: " + ticket.assetAmount + " " + ticket.assetName + "\n" + "(" + ticket.assetId + ")",
                "color": 0
            })

            embeds.push({
                "title": "Raffle Closes in " +  length + " days",
                "color": 0
            })
      
      
            const response = await fetch(process.env.newRaffleWebhook, {
                method: "POST",
                body: JSON.stringify({
                    username: "Ticket Buy",
                    embeds: embeds
                }),
                headers: {
                  "Content-Type": "application/json",
                },
              });
      
      
      
            
        }

        const rewardRaffle = async (entrys, addr, rewards, ticket) => {

            console.log(ticket)

            let pickArray = []

            entrys.forEach((entry) => {
                for(let i = 0; i < entry.amount; i++) {
                    pickArray.push(entry.account)
                }
            })

            let randomNum = Math.floor(Math.random() * pickArray.length)


            let winningAddr = pickArray[randomNum]

            const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)

            let params = await client.getTransactionParams().do();
    
            let txns = []
    
            let appArgs = []
            appArgs.push(
                new Uint8Array(Buffer.from("rewardRaffle")),
            )
    
            const accounts = [winningAddr, addr]
            const foreignApps = []
            
            let foreignAssets = []

            foreignAssets.push(ticket.ticketId)
            appArgs.push(algosdk.encodeUint64(pickArray.length))

            rewards.forEach((reward) => {
                foreignAssets.push(reward.assetId)
                appArgs.push(algosdk.encodeUint64(reward.assetAmount))
            })


            const boxes = []
        
            let atxn = algosdk.makeApplicationNoOpTxn(activeAccount.address, params, props.contracts.raffle, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);

            txns.push(atxn)

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

            props.setMessage("Raffle complete")

            updateDiscordReward(winningAddr, rewards, id)



        }

        const updateDiscordReward = async (winningAddr, rewards, txnId) => {

            let embeds = []
      
            embeds.push({
                "title": "Raffle completed. " + winningAddr + " has won:",
                "color": 0
            })
      
            rewards.forEach((reward) => {
                embeds.push({
                    "description": reward.assetAmount + " " + reward.assetUnit + "\n" + "(" + reward.assetId + ")",
                    "color": 16777215
                })
            })

            embeds.push({
                "title": "Reward Txn",
                "url": "https://allo.info/tx/" + txnId,
                "color": 0
            })
      
      
            const response = await fetch(process.env.raffleWinnersWebhook, {
                method: "POST",
                body: JSON.stringify({
                    username: "Raffle Reward",
                    embeds: embeds
                }),
                headers: {
                  "Content-Type": "application/json",
                },
              });
      
      
      
            
        }

    return (
        <div>
            {raffles.length == 1 ? raffles.map((raffle, index) => {
                
                let addresses = []

                let numTickets = 0

                tickets.forEach((ticket) => {
                    if(!addresses.includes(ticket.account)) {
                        addresses.push(ticket.account)
                    }
                    numTickets += ticket.amount
                })

                let entrys = []

                addresses.forEach((address) => {
                    let addressCount = 0
                    tickets.forEach((ticket) => {
                        if(ticket.account == address) {
                            addressCount += ticket.amount
                        }
                    })
                    entrys.push({account: address, amount: addressCount})
                })

                return (
                    <div key={index} style={{padding: 20, margin: 20, border: "1px solid white", borderRadius: 15}}>
                        <Typography align="center" color="secondary"> Proposer: {raffle.addr.substring(0,10)}...{raffle.addr.substring(48)} </Typography>
                        <br />
                        <Typography align="center" color="secondary"> Rewards: </Typography>
                        {raffle.rewards.length > 0 ? raffle.rewards.map((reward, index) => {
                            return (
                                <div key={index} style={{padding: 20, margin: 20, border: "1px solid white", borderRadius: 15}}>
                                    <Typography align="center" color="secondary"> {reward.assetUnit} {reward.assetId}</Typography>
                                    <br />
                                    <Typography align="center" color="secondary"> Amount: {reward.assetAmount.toLocaleString('en', {useGrouping:true})} </Typography>
                                </div>
                            )
                        })
                        :
                        null
                        }
                        <br />
                        <Typography align="center" color="secondary"> Ticket Price: </Typography>
                        <div style={{padding: 20, margin: 20, border: "1px solid white", borderRadius: 15}}>
                        <Typography align="center" color="secondary"> {raffle.ticketInfo ? raffle.ticketInfo.asset.params["unit-name"] : null} {raffle.ticketId}</Typography>
                        <br />
                        <Typography align="center" color="secondary"> Amount: {raffle.ticketPrice.toLocaleString('en', {useGrouping:true})}</Typography>
                        </div>

                        {currentRound && raffle.endRound ? 
                        <Typography color="primary" align="center" variant="subtitle1" style={{color: "white"}}> Time left: {((raffle.endRound - currentRound) * blockTime / 60 / 60 / 24).toFixed(2)} more days </Typography>
                        :
                        null
                        }
                        <br />

                        <Typography align="center" color="secondary"> Tickets Sold: {numTickets} </Typography>
                        <br />
                        <Typography align="center" color="secondary"> Addresses: {addresses.length} </Typography>
                        <br />
                        <Typography align="center" color="secondary"> Ticket History </Typography>

                        <ResponsiveContainer width="100%" height={115} >
                        <BarChart data={tickets}>
                        <XAxis 
                        hide={true}
                        />
                        <YAxis 
                        dataKey="amount" 
                        hide="true"
              
                        />
                        <Tooltip content={renderTooltip} />
                        <Bar dataKey="amount" fill="#FFFFFF" stroke="#FFFFFF"/>
                        </BarChart>
                        </ResponsiveContainer>

                        <br />
                        <Typography align="center" color="secondary"> Address Odds </Typography>

                        <ResponsiveContainer aspect={2} width="100%">
                        <PieChart >
                        <Pie
                            dataKey="amount"
                            data={entrys}
                            label={renderCustomizedLabel}
                            fill="#000000"
                        />

                        </PieChart>
                        </ResponsiveContainer>
                        

                        {activeAccount.address != raffle.addr ?
                        <div>
                        <br />

                        <TextField                
                            onChange={handleChange}
                            value={ticketAmount}
                            type="number"
                            name="ticketAmount"
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
                        <Button variant="contained" color="secondary" style={{display: "flex", margin: "auto"}} onClick={() => joinRaffle(raffle.addr, raffle.ticketPrice, raffle.ticketId, raffle.rewards)}>
                            <Typography variant="h6"> Buy Ticket </Typography>

                            <img src="/invDC.svg" style={{display: "flex", margin: "auto", width: 50, padding: 10}} />
                        </Button>
                        </div>
                        :
                        null
                        }

                        
                        <br />

                        {activeAccount.address == "VWYCYQ3H3PPNIGON4H363DIH7BP33TTZWUUUNMTDXCIHRCDPFOMU7VJ5HM" ? 
                        <Button variant="contained" color="secondary" style={{display: "flex", margin: "auto"}} onClick={() => rewardRaffle(entrys, raffle.addr, raffle.rewards, {ticketId: raffle.ticketId, ticketPrice: raffle.ticketPrice})}>
                            <Typography variant="h6"> Reward Raffle </Typography>

                            <img src="/invDC.svg" style={{display: "flex", margin: "auto", width: 50, padding: 10}} />
                        </Button>
                        :
                        null
                        }

                        

                    </div>
                )
            })
            :
            null
            }


                
            
        </div>
    )
        
    
}