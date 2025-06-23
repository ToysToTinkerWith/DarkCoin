
import React, { useEffect, useState } from "react";

import { useRouter } from 'next/router'


import PropTypes from "prop-types";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import theme from "../theme";

import "../style.css"

import { Button, Typography, Grid, CircularProgress } from "@mui/material"

import { WalletProvider, PROVIDER_ID, useInitializeProviders  } from '@txnlab/use-wallet'

import { PeraWalletConnect } from "@perawallet/connect";
import { DeflyWalletConnect } from "@blockshake/defly-connect";

import { useWallet } from '@txnlab/use-wallet'

import ChatBot from "../components/chatBot"

import Connect from "../components/connect/connect"

import CancelIcon from '@mui/icons-material/Cancel';




export default function MyApp(props) {

  const providers = useInitializeProviders({
    providers: [
      { id: PROVIDER_ID.PERA, clientStatic: PeraWalletConnect },
      { id: PROVIDER_ID.DEFLY, clientStatic: DeflyWalletConnect }
 
    ]
  })

  const { Component, pageProps } = props;

  const { activeAccount, signTransactions, sendTransactions } = useWallet()

  const [ message, setMessage ] = useState("")
  const [ progress, setProgress ] = useState(0)

  const [ display, setDisplay ] = useState(false)


  const [ wallet, setWallet ] = useState([])

  //council: 1225804311

  let contracts = {council: 1239236238, arena: 1053328572, market: 3069960875, airdrop: 1174019649, ASAblasters: 1434284594, swapper: 1632253886, dragonshorde: 1870514811, raffle: 2046845196, mailbox: 2638261330}


  const router = useRouter()

  const sendDiscordMessage = async (error, location, address) => {

    console.log(error)
       
    const response = await fetch(process.env.discordErrorWebhook, {
      method: "POST",
      body: JSON.stringify({ 
        embeds: [{
          title: String(address) + " " + String(location),
          description: String(error)
        }]
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

  }

  // useEffect(() => {
  //   if (progress === 0 || progress === 100) return; // don't start counting until initialized

  //   const interval = setInterval(() => {
  //     setProgress(prev => prev + 1);
  //   }, 1000);

  //   return () => clearInterval(interval);
  // }, [progress]);

  useEffect(() => {
    setDisplay(true)
  }, []);


  return (
    
    
    <React.Fragment >


      {message ?
      <div style={{border: "1px solid white", position: "fixed", zIndex: 100, top: 15, left: 15, borderRadius: 5, backgroundColor: "#000000"}}>
        <Button onClick={() => setMessage("")}>
        <CancelIcon style={{color: "white", marginRight: 20}} />
        </Button>
      <Typography style={{color: "#FFFFFF", padding: 20, paddingTop: 10}}> {message} </Typography>
      {progress ? 
      <div>
        <CircularProgress variant="determinate" value={progress} style={{display: "flex", margin: "auto", color: "white"}} />
        <br />
      </div>
      :
      null
      }
      </div>
      :
      null
      }
      
     
     <WalletProvider value={providers}>


      <ThemeProvider theme={theme} >
      <CssBaseline />

      {display ?
        <div>
          <Connect setWallet={setWallet} />
          <Component  {...pageProps} setMessage={setMessage} setProgress={setProgress} contracts={contracts} sendDiscordMessage={sendDiscordMessage} wallet={wallet} />
        </div>

      :
        null
      }
     
        <ChatBot />
      </ThemeProvider>
      </WalletProvider>
    </React.Fragment>
  );
}

MyApp.propTypes = {
  Component: PropTypes.elementType.isRequired,
  pageProps: PropTypes.object.isRequired,
};
