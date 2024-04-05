import React from "react"


//43EVULWFT4RU2H7EZH377SAVQJSJO5NZP37N3Y5DZ7PGUXOETKW7VWDIOA

import { PeraWalletConnect } from "@perawallet/connect";

const peraWallet = new PeraWalletConnect();

import algosdk from "algosdk"

import { Grid, Typography, Button, TextField } from "@mui/material"

import DisplayChar from "../../components/contracts/Arena/DisplayChar";
import DisplayBat from "../../components/contracts/Arena/DisplayBat";

export default class Leaderboard extends React.Component { 

    constructor(props) {
        super(props);
        this.state = {
            battles: [],
            battleNum: 0,
            currBattle: 0,
            sending: false,
            rewards: 0,
            message: ""
        };
       this.sendPayout = this.sendPayout.bind(this)
       this.sendUpdate = this.sendUpdate.bind(this)

    }

    async componentDidMount() {

      try {

      this.props.setMessage("Fetching Battles...")

      const response = await fetch('/api/arena/getLeaderboard', {
        method: "POST",
        body: JSON.stringify({
          contract: this.props.contracts.arena,
        }),
        headers: {
          "Content-Type": "application/json",
        }
          
      });
    
      const session = await response.json()


      this.setState({
        battles: session
      })

      this.props.setMessage("")
    }
    catch(error) {
      await this.props.sendDiscordMessage(error, "Fetch Leaderboard")
     }


    }

    async sendPayout(topPlayers) {

      try {


      let assetAddress1
      let assetAddress2
      let assetAddress3

      const indexerClient = new algosdk.Indexer('', 'https://algoindexer.algoexplorerapi.io', '');

      const assetBalances1 = await indexerClient.lookupAssetBalances(topPlayers[0].assetId).do();

      assetBalances1.balances.forEach((account) => {
        if (account.amount == 1){
          assetAddress1 = account.address
        }
      })

      const assetBalances2 = await indexerClient.lookupAssetBalances(topPlayers[1].assetId).do();

      assetBalances2.balances.forEach((account) => {
        if (account.amount == 1){
          assetAddress2 = account.address
        }
      })

      const assetBalances3 = await indexerClient.lookupAssetBalances(topPlayers[2].assetId).do();

      assetBalances3.balances.forEach((account) => {
        if (account.amount == 1){
          assetAddress3 = account.address
        }
      })

      

      

    const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)
            
      let params = await client.getTransactionParams().do()

      let appArgs = []
      

      let accounts = []
      let foreignApps = []
          
      let foreignAssets = []

      let boxes = []

      appArgs.push(
        new Uint8Array(Buffer.from("reward"))
    
    )

    let txn = algosdk.makeApplicationNoOpTxn("YRVK422KP65SU4TBAHY34R7YT3OYFOL4DUSFR4UADQEQHS2HMXKORIC6TE", params, this.props.contract, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);

    appArgs = []
    appArgs.push(
      new Uint8Array(Buffer.from("addboxDC")),
      algosdk.encodeUint64(500000)
      
      
    )

    accounts = [assetAddress1]
    foreignApps = []
      
    foreignAssets = []

    
    let pk = algosdk.decodeAddress(assetAddress1);
    let addrArray = pk.publicKey

    let accountBox = new Uint8Array([...addrArray, ...Buffer.from("DC")])

    boxes = [{appIndex: 0, name: accountBox}]

    
    let rtxn1 = algosdk.makeApplicationNoOpTxn("YRVK422KP65SU4TBAHY34R7YT3OYFOL4DUSFR4UADQEQHS2HMXKORIC6TE", params, 1103370576, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);

    appArgs = []
    appArgs.push(
      new Uint8Array(Buffer.from("addboxDC")),
      algosdk.encodeUint64(200000)
      
      
    )

    accounts = [assetAddress2]
    foreignApps = []
      
    foreignAssets = []

    
    pk = algosdk.decodeAddress(assetAddress2);
    addrArray = pk.publicKey

    accountBox = new Uint8Array([...addrArray, ...Buffer.from("DC")])

    boxes = [{appIndex: 0, name: accountBox}]

    
    let rtxn2 = algosdk.makeApplicationNoOpTxn("YRVK422KP65SU4TBAHY34R7YT3OYFOL4DUSFR4UADQEQHS2HMXKORIC6TE", params, 1103370576, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);

    appArgs = []
    appArgs.push(
      new Uint8Array(Buffer.from("addboxDC")),
      algosdk.encodeUint64(100000)
      
      
    )

    accounts = [assetAddress3]
    foreignApps = []
      
    foreignAssets = []

    
    pk = algosdk.decodeAddress(assetAddress3);
    addrArray = pk.publicKey

    accountBox = new Uint8Array([...addrArray, ...Buffer.from("DC")])

    boxes = [{appIndex: 0, name: accountBox}]

    
    let rtxn3 = algosdk.makeApplicationNoOpTxn("YRVK422KP65SU4TBAHY34R7YT3OYFOL4DUSFR4UADQEQHS2HMXKORIC6TE", params, 1103370576, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);


    let txns = [txn, rtxn1, rtxn2, rtxn3]

      let txgroup = algosdk.assignGroupID(txns)


      

      let signedTxn1 = txn.signTxn(userAccout.sk);
      let signedTxn2 = rtxn1.signTxn(userAccout.sk);
      let signedTxn3 = rtxn2.signTxn(userAccout.sk);
      let signedTxn4 = rtxn3.signTxn(userAccout.sk);

        let signed = [signedTxn1, signedTxn2, signedTxn3, signedTxn4]

  
      // Submit the transaction
      const { txId } = await client.sendRawTransaction(signed).do()


      let confirmedTxn = await algosdk.waitForConfirmation(client, txId, 4);

      let embeds = []
        embeds.push({
          "title": "Leaderboard Payout! " + this.state.rewardBattle  +  " battles have been completed!",
          "color": 0
        })
        
       
          
          embeds.push({
            "title" : "1st place: " + topPlayers[0].characterName + " > Wins: " + topPlayers[0].numWins + " Earnings: " + topPlayers[0].earnings,
            "description": assetAddress1 + " has won " + "500,000 DARKCOIN",
            "color": 16711680
        })

        embeds.push({
          "title" : "2nd place: " + topPlayers[1].characterName + " > Wins: " + topPlayers[1].numWins + " Earnings: " + topPlayers[1].earnings,
          "description": assetAddress2 + " has won " + "200,000 DARKCOIN",
          "color": 16711680
      })

      embeds.push({
        "title" : "3rd place: " + topPlayers[2].characterName + " > Wins: " + topPlayers[2].numWins + " Earnings: " + topPlayers[2].earnings,
        "description": assetAddress3 + " has won " + "100,000 DARKCOIN",
        "color": 16711680
    })
  

        const response = await fetch(process.env.discordWebhook, {
          method: "POST",
          body: JSON.stringify({
              username: "Arena Leaderboard",
              embeds: embeds
          }),
          headers: {
            "Content-Type": "application/json",
          },
        });
      }
      catch(error) {
        await props.sendDiscordMessage(error, "Send Payout", activeAccount.address)
       }



      

    }

    async sendUpdate(topPlayers) {

      try {

    
      let assetInfo = []

      topPlayers.forEach((player) => {

      assetInfo.push({
        name: player.characterName,
        numWins: player.numWins,
        earnings: player.earnings
      })

    })

        let embeds = []
        embeds.push({
          "title": "Battle Update! " + (this.state.rewardBattle - this.state.currBattle) +  " more battles to go!",
          "color": 0
        })
        
        assetInfo.forEach((asset) => {
          
          embeds.push({
            "title" : asset.name + " > Wins: " + asset.numWins + " Earnings: " + asset.earnings,
            "color": 16711680
        })
        })


        const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)
        
        let params = await client.getTransactionParams().do()

        const appArgs = []
        

        const accounts = []
        const foreignApps = []
            
        const foreignAssets = []

        appArgs.push(
          new Uint8Array(Buffer.from("update"))
      
      )

      let txn = algosdk.makeApplicationNoOpTxn("YRVK422KP65SU4TBAHY34R7YT3OYFOL4DUSFR4UADQEQHS2HMXKORIC6TE", params, this.props.contract, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined);

    

      

      let signedTxn = txn.signTxn(userAccout.sk);
      

      let signed = [signedTxn]

  
      // Submit the transaction
      const { txId } = await client.sendRawTransaction(signed).do()

      


      let confirmedTxn = await algosdk.waitForConfirmation(client, txId, 4);

      const response = await fetch(process.env.discordWebhook, {
        method: "POST",
        body: JSON.stringify({
            username: "Arena Update",
            embeds: embeds
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });


      }
      catch(error) {
        await props.sendDiscordMessage(error, "Send Update", activeAccount.address)
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
                  if (a.earnings === b.earnings) {
                    return a.assetId > b.assetId ? 1 : -1
                  }
                  else {
                    return a.earnings < b.earnings ? 1 : -1
                  }
                    
                } else {
                    return a.numWins < b.numWins ? 1 : -1
                }
            })

        if (this.state.currBattle >= this.state.battleNum) {
          if (this.state.currBattle >= this.state.rewardBattle) {
           
            this.sendPayout(sortedPlayers.slice(0,3))

          }
          if (this.state.currBattle >= this.state.updateBattle) {
           
            this.sendUpdate(sortedPlayers.slice(0,10))
            
           

          }
          return (
            <div>
            <Typography color="secondary" align="center" variant="h6"> {this.state.message} </Typography>

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

      {sortedPlayers.slice(0, 10).map((player, index) => (
        
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
            src={"/gold.svg"} 
            alt="gold" 
            style={{
              position: 'absolute',
              top: '10px',
              left: '150px'
            }} 
          />
        )} {/* display gold crown icon above the first player */}
        {index === 1 && (
          <img 
            src={"/silver.svg"} 
            alt="silver" 
            style={{
              position: 'absolute',
              top: '10px',
              left: '150px'
            }} 
        />
        )} {/* display silver crown icon above the second player */}
        {index === 2 && (
          <img 
            src={"/bronze.svg"} 
            alt="bronze" 
            style={{
              position: 'absolute',
              top: '10px',
              left: '150px'
            }} 
          />
        )} {/* display bronze crown icon above the third player */}
          <div style={{ marginRight: '20px', fontSize: "35px" }}>{index + 1}{index === 0 ? 'st' : index === 1 ? 'nd' : index === 2 ? 'rd' : 'th'}</div> {/* display rank */}
          <DisplayChar contract={this.state.contract} leaderboard={true} style={{position: "absolute"}} nftId={player.assetId} activeAddress={this.props.activeAddress} wallet={this.props.wallet} setNft={(nftId) => this.setState({charSelect: player.assetId})} sendDiscordMessage={this.props.sendDiscordMessage}/>
          <div style={{ flex: '1', fontSize: '30px', marginLeft: 20 }}>
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
        else {
          return (
            <div>
              <Typography color="secondary" align="center" variant="h6"> Loading battle {this.state.currBattle} out of {this.state.battleNum - 1} </Typography>

            </div>
          )
        }


        
    }
    
    
}