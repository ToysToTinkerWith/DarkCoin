import React, { useState } from 'react';
import Canvas from '../../components/contracts/ASAblasters/Canvas.js';

import { useWallet } from '@txnlab/use-wallet'

import algosdk from "algosdk"

import { Typography, Button, TextField, Grid} from "@mui/material"


export default function ASAblasters(props) {

  const { activeAccount, signTransactions, sendTransactions } = useWallet()

  const [ready, setReady] = useState(false)

  const [highScore, setHighScore] = useState(0)

  const [totalScore, setTotalScore] = useState(0)
  const [DARKCOIN, setDARKCOIN] = useState(0);
  const [TRTS, setTRTS] = useState(0);


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


      const accountInfo = await indexerClient.lookupAccountAssets(contractAccount).do();

      console.log(accountInfo)


      let accepted = [1088771340, 1000870705]
      let acceptedImg = ["DARKCOIN.svg", "TRTS.svg"]

      if (accountInfo.assets) {
        accountInfo.assets.forEach( async (asset) => {
          let assetInfo = await indexerClient.lookupAssetByID(asset["asset-id"]).do();
          let unitName = assetInfo.asset.params["unit-name"]
          let decimals = assetInfo.asset.params.decimals
          let div = 10**decimals
          let indexOf = accepted.indexOf(asset["asset-id"])
          console.log(indexOf)
          if (indexOf >= 0) {
            setAssets(assets => [...assets, {assetId: accepted[indexOf], amount: asset.amount / div, unitName: unitName, acceptedImg: acceptedImg[indexOf]}])
          }
          
            


          })
    }

    if (activeAccount) {

      const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)

      let addressBox = algosdk.decodeAddress(activeAccount.address)

      let responseProposal = await client.getApplicationBoxByName(props.contracts.ASAblasters, addressBox.publicKey).do();

      setHighScore(byteArrayToLong(responseProposal.value))

    }

    

    

    }
    fetchData();      

    }, [activeAccount])

  const startGame = async () => {

    const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)

    let params = await client.getTransactionParams().do();

    let ftxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
      activeAccount.address, 
      "CJE4GXRL5A2TNTPZC5M3UAUYI42E6WBS4L5PS3XNKWSRI5NPY3H65FDMEE", 
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
        console.log(sasset)
        console.log(asset)
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

  const updateScore = (multiplier, assetId, amount) => {

    console.log(assetId)

      if (assetId == 1088771340) {
        setDARKCOIN((prevState) => prevState + (amount * multiplier));
      }
      else if (assetId == 1000870705) {
        setTRTS((prevState) => prevState + (amount * multiplier));

      }

      setTotalScore((prevState) => prevState + multiplier)

      
  };

  const sendRewardTransaction = async (totalScore, DARKCOIN, TRTS) => {

    setAssets([])
    setDARKCOIN(0)
    setTRTS(0)
    setTotalScore(0)

    let txns = []

    try {

      const houseMnemonic = process.env.DCwallet
      const houseAccount =  algosdk.mnemonicToSecretKey(houseMnemonic)

      console.log(totalScore)
      console.log(DARKCOIN)
      console.log(TRTS)

    const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)
    
      let params = await client.getTransactionParams().do();
       
      let appArgs = []
      appArgs.push(
        new Uint8Array(Buffer.from("score")),
        algosdk.encodeUint64(Number(totalScore))

      )

      let accounts = [activeAccount.address]
      let foreignApps = []
        
      let foreignAssets = []

      let scoreBox = algosdk.decodeAddress(activeAccount.address)

      console.log(scoreBox)

      let boxes = [{appIndex: 0, name: scoreBox.publicKey}]

      let stxn = algosdk.makeApplicationNoOpTxn("YRVK422KP65SU4TBAHY34R7YT3OYFOL4DUSFR4UADQEQHS2HMXKORIC6TE", params, props.contracts.ASAblasters, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);

      txns.push(stxn)


      if (DARKCOIN > 0) {
        appArgs = [
          new Uint8Array(Buffer.from("reward")),
          algosdk.encodeUint64(Number(DARKCOIN))
        ]
        foreignAssets = [1088771340]
        boxes = []
        stxn = algosdk.makeApplicationNoOpTxn("YRVK422KP65SU4TBAHY34R7YT3OYFOL4DUSFR4UADQEQHS2HMXKORIC6TE", params, props.contracts.ASAblasters, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
        txns.push(stxn)

      }

      console.log("here")


      if (TRTS > 0) {
        appArgs = [
          new Uint8Array(Buffer.from("reward")),
          algosdk.encodeUint64(Number(Math.ceil(TRTS)))
        ]
        foreignAssets = [1000870705]
        boxes = []
        stxn = algosdk.makeApplicationNoOpTxn("YRVK422KP65SU4TBAHY34R7YT3OYFOL4DUSFR4UADQEQHS2HMXKORIC6TE", params, props.contracts.ASAblasters, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
        txns.push(stxn)
      }

      if (txns.length > 1) {
        let txgroup = algosdk.assignGroupID(txns)
      }

      let signed = []

      txns.forEach((txn) => {
        let signedTxn = txn.signTxn(houseAccount.sk);
        signed.push(signedTxn)
      })

      
      props.setMessage("Sending transation...")

      const { id } = await sendTransactions(signed)

      let confirmedTxn = await algosdk.waitForConfirmation(client, id, 4);

      props.setMessage("Rewards sent and score updated.")

      setAssets([])

      const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)

      let contractAccount = await algosdk.getApplicationAddress(props.contracts.ASAblasters)

      console.log(contractAccount)


      const accountInfo = await indexerClient.lookupAccountAssets(contractAccount).do();

      console.log(accountInfo)


      let accepted = [1088771340, 1000870705]
      let acceptedImg = ["DARKCOIN.svg", "TRTS.svg"]

      if (accountInfo.assets) {
        accountInfo.assets.forEach( async (asset) => {
          let assetInfo = await indexerClient.lookupAssetByID(asset["asset-id"]).do();
          let unitName = assetInfo.asset.params["unit-name"]
          let decimals = assetInfo.asset.params.decimals
          let div = 10**decimals
          let indexOf = accepted.indexOf(asset["asset-id"])
          console.log(indexOf)
          if (indexOf >= 0) {
            setAssets(assets => [...assets, {assetId: accepted[indexOf], amount: asset.amount / div, unitName: unitName, acceptedImg: acceptedImg[indexOf]}])
          }
          
            


          })
      }

      if (activeAccount) {
  
        let addressBox = algosdk.decodeAddress(activeAccount.address)
  
        let responseProposal = await client.getApplicationBoxByName(props.contracts.ASAblasters, addressBox.publicKey).do();
  
        setHighScore(byteArrayToLong(responseProposal.value))
  
      }
  
    }
    catch(error) {
      await props.sendDiscordMessage(error, "Send Reward Txn", activeAccount.address)
      }

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
  console.log(sortedAssets)
  return (
  <div>
        <div style={{
            position: 'absolute',
            display: "grid",
            color: 'red',
            padding: '8px',
            fontSize: '14px',
            userSelect: 'none'}}>
               Score: 
               <span id="scoreEl"> TOTAL {totalScore}  </span>
               
              <span id="scoreEl"> DARKCOIN {DARKCOIN}  </span>
              <span id="scoreE2"> TRTS {TRTS}  </span>
             
        </div>
        {ready ? 
        <Canvas 
        score={"TOTAL " +  totalScore + "\n" + "DARKCOIN " + DARKCOIN + "\n" + "TRTS " + TRTS}
        highScore={highScore}
        totalScore={totalScore}
        DARKCOIN={DARKCOIN}
        TRTS={TRTS}
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
                    console.log(asset)
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
        </div>
        }
        
    </div>
  )



}

