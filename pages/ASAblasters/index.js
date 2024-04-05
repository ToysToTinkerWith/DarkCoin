import React, { useState } from 'react';
import Canvas from '../../components/contracts/ASAblasters/Canvas.js';

import { useWallet } from '@txnlab/use-wallet'

import algosdk from "algosdk"

import { Typography, Button, TextField, Grid} from "@mui/material"

import firebase_app from '../../Firebase/FirebaseInit.js';

import { getAuth, signInAnonymously } from "firebase/auth";

const auth = getAuth();
signInAnonymously(auth)
  .then(() => {
    // Signed in..
  })
  .catch((error) => {
    const errorCode = error.code;
    const errorMessage = error.message;
    // ...
  });


export default function ASAblasters(props) {

  const { activeAccount, signTransactions, sendTransactions } = useWallet()

  const [ready, setReady] = useState(false)

  const [highScore, setHighScore] = useState(0)
  const [totalScore, setTotalScore] = useState(0)
  const [assetScores, setAssetScores] = useState({})
  const [assetDec, setAssetDec] = useState({})
  const [assetIds, setAssetIds] = useState({})



  const [AO, setAO] = useState(0);
  const [chip, setchip] = useState(0);

  const [DARKCOIN, setDARKCOIN] = useState(0);
  const [Gold, setGold] = useState(0);
  const [GoldDAO, setGoldDAO] = useState(0);
  const [META, setMETA] = useState(0);
  const [PRSMS, setPRSMS] = useState(0);
  const [Tacos, setTacos] = useState(0);
  const [THC, setTHC] = useState(0);

  const [TRTS, setTRTS] = useState(0);
  const [Vote, setVote] = useState(0);
  const [YARN, setYARN] = useState(0);


  const [assets, setAssets] = useState([])

  const [isHowToPlayVisible, setIsHowToPlayVisible] = useState(false);

  const toggleHowToPlay = () => {
    setIsHowToPlayVisible(!isHowToPlayVisible);
  };

  const byteArrayToLong = (byteArray) => {
    var value = 0;
    for ( var i = 0; i < byteArray.length; i++) {
        value = (value * 256) + byteArray[i];
    }

    return value;
};


  React.useEffect(() => {

    const fetchData = async () => {

      setAssets([])

      const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)

      let contractAccount = await algosdk.getApplicationAddress(props.contracts.ASAblasters)

      console.log(contractAccount)

      const accountTxns = await indexerClient.lookupAccountTransactions(contractAccount).do();

      console.log(accountTxns)

      accountTxns.transactions.slice(0, 10).forEach((txn) => {
        if (txn["asset-transfer-transaction"]) {
          console.log(txn)

        }
      })

      const accountInfo = await indexerClient.lookupAccountAssets(contractAccount).do();


      let accepted = [409604194, 388592191, 1088771340, 1241944285, 1241945177, 712012773, 753890862, 329110405, 1119722936, 1000870705, 452399768, 544217506]
      let acceptedImg = ["AO.svg", "chip.svg", "DARKCOIN.svg", "Gold.svg", "GoldDAO.svg", "META.svg", "PRSMS.svg", "Tacos.svg", "THC.svg", "TRTS.svg", "Vote.svg", "YARN.svg"]

      let scores = {}
      let decimals = {}
      let ids = {}

      if (accountInfo.assets) {
        accountInfo.assets.forEach( async (asset) => {
          let indexOf = accepted.indexOf(asset["asset-id"])
          if (indexOf >= 0) {
          let assetInfo = await indexerClient.lookupAssetByID(asset["asset-id"]).do();
          let unitName = assetInfo.asset.params["unit-name"]
          let decimal = assetInfo.asset.params.decimals
          let id = assetInfo.asset.index
          let div = 10**decimal
          let indexOf = accepted.indexOf(asset["asset-id"])
          if (asset.amount > 0) {
            let score = asset.amount / div / 10000
            scores[unitName] = score
            decimals[unitName] = decimal
            ids[unitName] = id
            setAssetScores(scores)
            setAssetDec(decimals)
            setAssetIds(ids)
            setAssets(assets => [...assets, {assetId: accepted[indexOf], amount: asset.amount / div, score: score, unitName: unitName, decimals: decimal, acceptedImg: acceptedImg[indexOf]}])
          }
          
            

          }
          })
      }

      



    if (activeAccount) {

      try{

      const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)

      let addressBox = algosdk.decodeAddress(activeAccount.address)

      let responseProposal = await client.getApplicationBoxByName(props.contracts.ASAblasters, addressBox.publicKey).do();

      setHighScore(byteArrayToLong(responseProposal.value))
      }
      catch {
        
      }

    }

    

    

    }
    fetchData();      

    }, [activeAccount])

  const startGame = async () => {

    const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)

    let params = await client.getTransactionParams().do();

    let ftxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
      activeAccount.address, 
      "WATGQ3SIXJHNW645M4TDQBQ7YQGEULB3Y4YHZS7MQE2PIOWA33O2NO57JA", 
      undefined,
      undefined,
      1000000000, 
      undefined,
      1088771340,
      params
    );

    let txns = [ftxn]

    const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)

    const accountAssets = await indexerClient.lookupAccountAssets(activeAccount.address).do();

    let otxn

    sortedAssets.forEach((sasset) => {
      let found = false
      accountAssets.assets.forEach((asset) => {
   
        if (asset["asset-id"] == sasset.assetId) {
          found = true
        }
      
      })
      if (!found) {
        otxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
          activeAccount.address, 
          activeAccount.address,
          undefined,
          undefined,
          0, 
          undefined,
          sasset.assetId,
          params
        );
        txns.push(otxn)
      }
    })

    if (txns.length > 1) {
      let txgroup = algosdk.assignGroupID(txns)
    }
    
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

    props.setMessage("")

    setReady(true)

  }

  const updateScore = (multiplier, assetId) => {

    if (assetId == 409604194) {
      setAO((prevState) => prevState + 1);
    }
    else if (assetId == 388592191) {
      setchip((prevState) => prevState + 1);
    }
    else if (assetId == 1088771340) {
      setDARKCOIN((prevState) => prevState + 1);
    }
    else if (assetId == 1241944285) {
      setGold((prevState) => prevState + 1);
    }
    else if (assetId == 1241945177) {
      setGoldDAO((prevState) => prevState + 1);
    }
    else if (assetId == 712012773) {
      setMETA((prevState) => prevState + 1);
    }
    else if (assetId == 753890862) {
      setPRSMS((prevState) => prevState + 1);
    }
    else if (assetId == 329110405) {
      setTacos((prevState) => prevState + 1);
    }
    else if (assetId == 1119722936) {
      setTHC((prevState) => prevState + 1);
    }
    else if (assetId == 1000870705) {
      setTRTS((prevState) => prevState + 1);
    }
    else if (assetId == 452399768) {
      setVote((prevState) => prevState + 1);
    }
    else if (assetId == 544217506) {
      setYARN((prevState) => prevState + 1);

    }

    setTotalScore((prevState) => prevState + multiplier)

      
  };

  const sendRewardTransaction = async (totalScore, AO, chip, DARKCOIN, Gold, GoldDAO, META, PRSMS, Tacos, THC, TRTS, Vote, YARN) => {

    setAssets([])
    setAO(0)
    setchip(0)
    setDARKCOIN(0)
    setGold(0)
    setGoldDAO(0)
    setMETA(0)
    setPRSMS(0)
    setTacos(0)
    setTHC(0)
    setTRTS(0)
    setVote(0)
    setYARN(0)
    setTotalScore(0)

    

    try {

      props.setMessage("Claiming...")

      console.log(assetIds)

      auth.currentUser.getIdToken(/* forceRefresh */ true).then(async function(idToken) {
        // Send token to your backend via HTTPS
        let response = await fetch('/api/ASAblasters/reward', {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + idToken
          },
          body: JSON.stringify({
              totalScore: totalScore,
              address: activeAccount.address,
              contract: props.contracts.ASAblasters,
              assetScores: assetScores,
              assetDec: assetDec,
              assetIds: assetIds,
              assetValues: {
                AO: AO, 
                chip: chip, 
                DARKCOIN: DARKCOIN, 
                Gold: Gold, 
                GoldDAO: GoldDAO, 
                META: META, 
                PRSMS: PRSMS, 
                Tacos: Tacos, 
                THC: THC, 
                TRTS: TRTS, 
                Vote: Vote, 
                YARN: YARN
              }
          }),
          
            
        });
  
        let session = await response.json()
  
        console.log(session.res)
  
        props.setMessage("Assets Claimed")
  
  
        setAssets([])
  
        const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)
  
        let contractAccount = await algosdk.getApplicationAddress(props.contracts.ASAblasters)
  
        const accountInfo = await indexerClient.lookupAccountAssets(contractAccount).do();
  
        let accepted = [409604194, 388592191, 1088771340, 1241944285, 712012773, 329110405, 1119722936, 1000870705, 452399768, 544217506]
        let acceptedImg = ["AO.svg", "chip.svg", "DARKCOIN.svg", "Gold.svg", "GoldDAO.svg", "PRSMS.svg", "Tacos.svg", "THC.svg", "TRTS.svg", "Vote.svg", "YARN.svg"]
  
        let scores = {}
        let decimals = {}
        let ids = {}
  
        if (accountInfo.assets) {
          accountInfo.assets.forEach( async (asset) => {
            let indexOf = accepted.indexOf(asset["asset-id"])
            if (indexOf >= 0) {
            let assetInfo = await indexerClient.lookupAssetByID(asset["asset-id"]).do();
            let unitName = assetInfo.asset.params["unit-name"]
            let decimal = assetInfo.asset.params.decimals
            let id = assetInfo.asset.index
            let div = 10**decimal
            let indexOf = accepted.indexOf(asset["asset-id"])
            if (asset.amount > 0) {
              let score = asset.amount / div / 10000
              scores[unitName] = score
              decimals[unitName] = decimal
              ids[unitName] = id
              setAssetScores(scores)
              setAssetDec(decimals)
              setAssetIds(ids)
              setAssets(assets => [...assets, {assetId: accepted[indexOf], amount: asset.amount / div, score: score, unitName: unitName, decimals: decimal, acceptedImg: acceptedImg[indexOf]}])
            }
            
              
  
            }
            })
        }
  
  
  
        if (activeAccount) {
  
        const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)
  
        let addressBox = algosdk.decodeAddress(activeAccount.address)
  
        let responseProposal = await client.getApplicationBoxByName(props.contracts.ASAblasters, addressBox.publicKey).do();
  
        setHighScore(byteArrayToLong(responseProposal.value))
  
        }
  
        await sendRewardMessage(totalScore, AO, chip, DARKCOIN, Gold, PRSMS, Tacos, THC, TRTS, Vote, YARN)
        // ...
      }).catch(function(error) {
        // Handle error
      });

      
  
    }
    catch(error) {
      await props.sendDiscordMessage(error, "Send Reward Txn", activeAccount.address)
      }

  }

  const sendRewardMessage = async (totalScore, AO, chip, DARKCOIN, Gold, PRSMS, Tacos, THC, TRTS, Vote, YARN) => {
       
    let embeds = []

      embeds.push({
          "title": activeAccount.address + " Scored: " + totalScore,
          "color": 0
      })
      

      embeds.push({
          "title": "Rewards",
          "description": "AO = " + (AO * assetScores.AO).toFixed(assetDec.AO) + "\n" + "chip = " + (chip * assetScores.chip).toFixed(assetDec.chip) + "\n" + "DARKCOIN = " + (DARKCOIN * assetScores.DARKCOIN).toFixed(assetDec.DARKCOIN) + "\n" + "Gold = " + (Gold * assetScores.Gold).toFixed(assetDec.Gold) + "\n" + "PRSMS = " + (PRSMS * assetScores.PRSMS).toFixed(assetDec.PRSMS) + "\n" + "Tacos = " + (Tacos * assetScores.Tacos).toFixed(assetDec.Tacos) + "\n"+ "THC = " + (THC * assetScores.THC).toFixed(assetDec.THC) + "\n" + "TRTS = " + (TRTS * assetScores.TRTS).toFixed(assetDec.TRTS) + "\n" + "Vote = " + (Vote * assetScores.Vote).toFixed(assetDec.Vote) + "\n" + "YARN = " + (YARN * assetScores.YARN).toFixed(assetDec.YARN) + "\n",
          "color": 16777215
      })


      const response = await fetch(process.env.rewardWebhook, {
          method: "POST",
          body: JSON.stringify({
              username: "ASAblasters Reward",
              embeds: embeds
          }),
          headers: {
            "Content-Type": "application/json",
          },
        });

  }


  let sortedAssets = []

  assets.forEach((asset) => {
    let found = false
    sortedAssets.forEach((sasset) => {
      if (asset.assetId == sasset.assetId) {
        found = true
      }
    })
    if (!found) {
      sortedAssets.push(asset)
    }
  })

  console.log(assetScores)
      console.log(assetDec)
      console.log(assetIds)


  return (
  <div>
    {Object.keys(assetScores).length > 0 ? 
    <div style={{
      position: 'absolute',
      display: "grid",
      color: 'red',
      padding: '8px',
      fontSize: '14px',
      userSelect: 'none'}}>
         Score: 
         <span id="scoreEl"> TOTAL {totalScore}  </span>
         {Object.keys(assetScores).map((asset, index) => {
          return (
            <span key={index} > {asset} {(eval(asset) * assetScores[asset]).toFixed(assetDec[asset])}  </span>
          )
         })}
       
      </div>
      : 
      null
      }
        
        {ready ? 
        <Canvas 
        highScore={highScore}
        totalScore={totalScore}
        AO={AO}
        chip={chip}
        DARKCOIN={DARKCOIN}
        Gold={Gold}
        GoldDAO={GoldDAO}
        META={META}
        PRSMS={PRSMS}
        Tacos={Tacos}
        THC={THC}
        TRTS={TRTS}
        Vote={Vote}
        YARN={YARN}
        setReady={setReady}
        updateScore={updateScore}
        sortedAssets={sortedAssets}
        sendRewardTransaction={sendRewardTransaction}/>
        :
        <div id="startModal" style={{
                position: 'absolute',
                backgroundColor: 'white',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                left: '50%',
                padding: '16px',
                maxWidth: '700px',
                height: '700px',
                width: '100%',
                textAlign: 'center',
                borderRadius: '15px', 
                backgroundImage: "url('/ASAblasters.png')", 
                backgroundSize: 'cover', 
                backgroundPosition: 'center'
            }}>
                 <h1 style={{ 
                  fontSize: '24px', 
                  width: 'fit-content', 
                  margin: 'auto', 
                  color: 'red', 
                  backgroundColor: 'black', 
                  borderRadius: '15px',
                  marginBottom: 0, 
                  marginTop: isHowToPlayVisible ? 0 : '20%',
                  display: isHowToPlayVisible ? 'none' : 'block',}}>
                    ASA Blasters 
                </h1>
                <h1 style={{ 
                  fontSize: '16px', 
                  width: 'fit-content', 
                  margin: 'auto', 
                  color: 'red', 
                  backgroundColor: 'black', 
                  borderRadius: '15px',
                  marginBottom: '0', 
                  marginTop: '8px',
                  display: isHowToPlayVisible ? 'none' : 'block', }}>
                    Highscore = {highScore} 
                </h1>

                <button id="howToButton" style={{
                    marginTop: '12px',
                    backgroundColor: 'blue',
                    border: 'none',
                    borderRadius: '15px',
                    color: 'white',
                    padding: '8px 16px',
                    cursor: 'pointer'
                }}
                onClick={toggleHowToPlay}>
                    {isHowToPlayVisible ? 'Hide How To Play' : 'Show How To Play'}
                </button>

                <div id="howToPlay" style={{ 
                  display: isHowToPlayVisible ? 'block' : 'none',
                  backgroundColor: 'black', 
                  margin: 'auto', 
                  width: '625px', 
                  height: '650px', 
                  borderRadius: '15px',
                  color: 'white',
                  fontSize: '12px',
                  textAlign: 'left'}}>
                    <h2>How To Play ASA Blasters:</h2>
                    <h3>Objective:</h3>
                    <p>Survive the onslaught! Stay in the center and shoot down incoming enemy ASAs. Aim carefully and prevent them from reaching you!</p>
                    <h3>Gameplay:</h3>
                    <p>Enemies spawn at the screen's edge every second and shrink with each shot until they're destroyed. Point and click with the mouse, or tap the screen to fire projectiles. Destroying enemies earns you points and ASAs from the smart contract. Watch out for randomly appearing upgrades that boost your firepower!</p>
                    <h3>Economy:</h3>
                    <p>Starting a round costs 1000 Dark Coin, but skilled players can quickly earn rewards to cover this and profit within 5-10 minutes of gameplay. To play the free demo, check out https://asa-blasters.vercel.app/ or click the button below to be redirected.</p>
                    <h3 style={{ textAlign: 'center' }}>Upgrade Items:</h3>
                    <div style={{ display: 'flex', flexDirection: 'column'}}>
                      <img style={{ width: '55px', marginLeft: '20%' }} src="/upgrades/rapidfire.png" alt="Rapid Fire"></img>
                      <span style={{ marginLeft: '20%' }}>RAPID FIRE: Release a continuous stream of bullets by clicking and holding!</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column'}}>
                      <img style={{ width: '55px', marginLeft: '20%' }} src="/upgrades/scattershot.png" alt="Scatter Shot"></img>
                      <span style={{ marginLeft: '20%' }}>SCATTER SHOT: Unleash a wide burst of rounds, making it easier to hit targets!</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column'}}>
                      <img style={{ width: '55px', marginLeft: '20%' }} src="/upgrades/shield.png" alt="Shield"></img>
                      <span style={{ marginLeft: '20%' }}>SHIELD GENERATOR: Generate a force field around the player for protection!</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column'}}>
                      <img style={{ width: '55px', marginLeft: '20%' }} src="/upgrades/bombshot.png" alt="Bombs"></img>
                      <span style={{ marginLeft: '20%' }}>BOMBSHOT: Shoot and detonate bombs to unleash a shockwave of destruction!</span>
                    </div>      
                </div>

                <button id="demoButton" style={{
                    backgroundColor: 'blue',
                    border: 'none',
                    borderRadius: '15px',
                    color: 'white',
                    padding: '8px 16px',
                    cursor: 'pointer',
                    display: 'block',
                    margin: 'auto',
                    marginTop: '12px',
                }}
                onClick={() => window.location.href = 'https://asa-blasters.vercel.app/'}>
                    FREE DEMO
                </button>
                <button id="startButton" style={{
                    marginTop: '12px',
                    backgroundColor: 'blue',
                    border: 'none',
                    borderRadius: '15px',
                    color: 'white',
                    padding: '8px 16px',
                    cursor: 'pointer'
                }}
                onClick={() => {
                    startGame()}}>
                    START 1000
                    <img src={"/enemies/DARKCOIN.svg"} style={{width: 25, display: "flex", margin: "auto"}}/>

                </button>

                <h1 style={{ 
                  fontSize: '16px', 
                  width: 'fit-content', 
                  margin: 'auto', 
                  color: 'red', 
                  backgroundColor: 'black', 
                  borderRadius: '15px', 
                  marginBottom: '0', 
                  marginTop: '8px' }}>
                    Contract contains:
                </h1>
              
              <Grid container style={{padding: 10}}>
                {sortedAssets.map((asset, index) => {
                    return(
                      <Grid 
                      key={index} 
                      item xs={12} 
                      sm={6} 
                      style={{border: "1px solid black", 
                      borderRadius: 15, 
                      padding: 10}}>
                        <h1 style={{ 
                          fontSize: '16px', 
                          color: 'red',
                          backgroundColor: 'black',
                          width: 'fit-content',
                          margin: 'auto'}}> {asset.amount} 
                        </h1>
                        <img 
                          src={"/enemies/" + asset.acceptedImg} 
                          style={{width: 50}}/>
                        <h1 
                          style={{ 
                            fontSize: '16px', 
                            color: 'red',
                            backgroundColor: 'black',
                            width: 'fit-content',
                            margin: 'auto'}}> 
                              {asset.unitName} 
                        </h1>

                        </Grid>
                    )
                })}
                </Grid>

               
        </div>
        }
        
    </div>
  )



}

