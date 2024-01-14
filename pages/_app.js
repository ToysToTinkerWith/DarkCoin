
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

  const [ wallet, setWallet ] = useState([])

  //council: 1225804311

  let contracts = {council: 1239236238, arena: 1053328572, market: 1100807585, airdrop: 1174019649, ASAblasters: 1397879621}


  const router = useRouter()

  useEffect(() => {

    
    const handleRouteChange = (url) => {
      gtag.pageview(url)
    }
    router.events.on('routeChangeComplete', handleRouteChange)
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange)
    }
  }, [router.events, activeAccount])

  useEffect(() => {
    const jssStyles = document.querySelector("#jss-server-side");
    if (jssStyles) {
      jssStyles.parentElement.removeChild(jssStyles);
    }
  }, []);

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


  return (
    
    
    <React.Fragment>

      {message ?
      <div style={{border: "1px solid white", position: "fixed", zIndex: 10, top: 15, left: 15, borderRadius: 5, backgroundColor: "#000000"}}>
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

      <ThemeProvider theme={theme}>
      <CssBaseline />
      {router.pathname.substring(0,11) != "/ASAblaster" ? 
        <Button 
        style={{marginLeft: "10vw"}}
        href="/">
          <img src="/invDC.svg" style={{display: "flex", margin: "auto", width: "30%", minWidth: 100, padding: 20}} />
        </Button>
        
        :
        null
        }
      
      <Grid container >
       
      
        <Grid item xs={10} sm={8}>
          <Connect setWallet={setWallet} />
        </Grid>
      {router.pathname.substring(0,8) == "/council" ? 
            <Grid xs={12}>
                <Button 
                style={{display: "grid", margin: "auto"}}
                href="/"
                >
                <img src="/council.png" style={{display: "flex", margin: "auto", height: 75}} />
                <Typography align="center" variant="h5" color="secondary">
                    Council
                </Typography>
                </Button>
                <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                    <Button style={{backgroundColor: router.pathname == "/council/propose" ? "#FFFFFF" : "#000000", border: "1px solid white", display: "flex", margin: "auto", borderRadius: 15, padding: 10}} href="/council/propose">
                        <Typography color="secondary" variant="h6" style={{color: router.pathname == "/council/propose" ? "#000000" : "#FFFFFF"}}> Propose </Typography>
                    </Button>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                    <Button style={{backgroundColor: router.pathname == "/council/proposals" ? "#FFFFFF" : "#000000", border: "1px solid white", display: "flex", margin: "auto", borderRadius: 15, padding: 10}} href="/council/proposals">
                        <Typography color="secondary" variant="h6" style={{color: router.pathname == "/council/proposals" ? "#000000" : "#FFFFFF"}}> Proposals </Typography>
                    </Button>
                    </Grid>
                  </Grid>
            </Grid>
            :
            null
        }
        {router.pathname.substring(0,7) == "/market" ? 
            <Grid xs={12}>
                <Button 
                style={{display: "grid", margin: "auto"}}
                href="/">
                <img src="/market.svg" style={{display: "flex", margin: "auto", height: 75}} />
                <Typography align="center" variant="h5" color="secondary">
                    Market
                </Typography>
                </Button>
                <br />
                <Grid container align="center" spacing={3} >
                  <Grid item xs={12} sm={3} md={3} lg={3} >
                      <Button style={{backgroundColor: router.pathname == "/market/daos" ? "#FFFFFF" : "#000000", border: "1px solid white", borderRadius: 15, padding: 10}} href="/market/daos">
                        <Typography  variant="h6" style={{color: router.pathname == "/market/daos" ? "#000000" : "#FFFFFF"}}> DAOs </Typography>
                      </Button>
                      
                  </Grid>
                  <Grid item xs={12} sm={3} md={3} lg={3} >
                      <Button style={{backgroundColor: router.pathname == "/market/warrior1" ? "#FFFFFF" : "#000000", border: "1px solid white", borderRadius: 15, padding: 10}} href="/market/warrior1">
                        <Typography  variant="h6" style={{color: router.pathname == "/market/warrior1" ? "#000000" : "#FFFFFF"}}> Warriors1 </Typography>
                      </Button>
                      
                  </Grid>
                  <Grid item xs={12} sm={3} md={3} lg={3} >
                      <Button style={{backgroundColor: router.pathname == "/market/warrior2" ? "#FFFFFF" : "#000000", border: "1px solid white", borderRadius: 15, padding: 10}} href="/market/warrior2">
                        <Typography  variant="h6" style={{color: router.pathname == "/market/warrior2" ? "#000000" : "#FFFFFF"}}> Warriors2 </Typography>
                      </Button>
                      
                  </Grid>
                  <Grid item xs={12} sm={3} md={3} lg={3} >
                      <Button style={{backgroundColor: router.pathname == "/market/chars" ? "#FFFFFF" : "#000000", border: "1px solid white", borderRadius: 15, padding: 10}} href="/market/chars">
                        <Typography  variant="h6" style={{color: router.pathname == "/market/chars" ? "#000000" : "#FFFFFF"}}> Characters </Typography>
                      </Button>
                      
                  </Grid>
                  
                </Grid>
            </Grid>
            :
            null
        }
        {router.pathname == "mixer" ? 
            <Grid xs={12}>
                <Button 
                style={{display: "grid", margin: "auto"}}
                onClick={() => this.setState({place: ""})}>
                <img src="mixer.svg" style={{display: "flex", margin: "auto", height: 75}} />
                <Typography align="center" variant="h5" color="secondary">
                    Mixer
                </Typography>
                </Button>
                <br />
            </Grid>
            :
            null
        }
        {router.pathname.substring(0,6) == "/arena" ? 
            <Grid xs={12}>
                <Button 
                style={{display: "grid", margin: "auto"}}
                href="/">
                <img src="/arena.svg" style={{display: "flex", margin: "auto", height: 75}} />
                <Typography align="center" variant="h5" color="secondary">
                    Arena
                </Typography>
                </Button>
                <br />
                <Grid container >
                    <Grid item xs={12} sm={3} style={{marginBottom: 50}}>
                    <Button style={{backgroundColor: router.pathname == "/arena/create" ? "#FFFFFF" : "#000000", border: "1px solid white", display: "flex", margin: "auto", padding: 10, borderRadius: 15}} href="/arena/create">
                        <Typography color="secondary" variant="h6" style={{color: router.pathname == "/arena/create" ? "#000000" : "#FFFFFF"}}> Create </Typography>
                    </Button>
                    </Grid>
                    <Grid item xs={12} sm={3} style={{marginBottom: 50}}>
                    <Button style={{backgroundColor: router.pathname == "/arena/select" ? "#FFFFFF" : "#000000", border: "1px solid white", display: "flex", margin: "auto", padding: 10, borderRadius: 15}} href="/arena/select">
                        <Typography color="secondary" variant="h6" style={{color: router.pathname == "/arena/select" ? "#000000" : "#FFFFFF"}}> Select </Typography>
                    </Button>
                    </Grid>
                    <Grid item xs={12} sm={3} style={{marginBottom: 50}}>
                    <Button style={{backgroundColor: router.pathname == "/arena/fight" ? "#FFFFFF" : "#000000", border: "1px solid white", display: "flex", margin: "auto", padding: 10, borderRadius: 15}} href="/arena/fight">
                        <Typography color="secondary" variant="h6" style={{color: router.pathname == "/arena/fight" ? "#000000" : "#FFFFFF"}}> Fight </Typography>
                    </Button>
                    </Grid>
                    <Grid item xs={12} sm={3} style={{marginBottom: 50}}>
                    <Button style={{backgroundColor: router.pathname == "/arena/history" ? "#FFFFFF" : "#000000", border: "1px solid white", display: "flex", margin: "auto", padding: 10, borderRadius: 15}} href="/arena/history">
                        <Typography color="secondary" variant="h6" style={{color: router.pathname == "/arena/history" ? "#000000" : "#FFFFFF"}}> History </Typography>
                    </Button>
                    </Grid>
                    <Grid item xs={12} sm={12} style={{marginBottom: 50}}>
                    <Button style={{backgroundColor: router.pathname == "/arena/leaderboard" ? "#FFFFFF" : "#000000", border: "1px solid white", display: "flex", margin: "auto", padding: 10, borderRadius: 15}} href="/arena/leaderboard">
                        <Typography color="secondary" variant="h6" style={{color: router.pathname == "/arena/leaderboard" ? "#000000" : "#FFFFFF"}}> Leaderboard </Typography>
                    </Button>
                    </Grid>
                  </Grid>
            </Grid>
            :
            null
        }
          {router.pathname.substring(0,8) == "/rewards" ? 
            <Grid xs={12}>
                <Button 
                style={{display: "grid", margin: "auto"}}
                href="/">
                <img src="/rewards.svg" style={{display: "flex", margin: "auto", height: 75}} />
                <Typography align="center" variant="h5" color="secondary">
                    Rewards
                </Typography>
                </Button>
                <br />
                <Grid container spacing={3}>
                    {/* <Grid item xs={12} sm={6} style={{marginBottom: 50}}>
                    <Button style={{backgroundColor: router.pathname == "/rewards/claim" ? "#FFFFFF" : "#000000", border: "1px solid white", display: "flex", margin: "auto", padding: 10, borderRadius: 15}} href="/rewards/claim">
                        <Typography color="secondary" variant="h6" style={{color: router.pathname == "/rewards/claim" ? "#000000" : "#FFFFFF"}}> Claim </Typography>
                    </Button>
                    </Grid> */}
                    <Grid item xs={12} sm={12} style={{marginBottom: 50}}>
                    <Button style={{backgroundColor: router.pathname == "/rewards/airdrop" ? "#FFFFFF" : "#000000", border: "1px solid white", display: "flex", margin: "auto", padding: 10, borderRadius: 15}} href="/rewards/airdrop">
                        <Typography color="secondary" variant="h6" style={{color: router.pathname == "/rewards/airdrop" ? "#000000" : "#FFFFFF"}}> Airdrop </Typography>
                    </Button>
                    </Grid>
                   
                  </Grid>
                <br />
            </Grid>
            :
            null
        }
      
        </Grid>
        <Component {...pageProps} setMessage={setMessage} setProgress={setProgress} contracts={contracts} sendDiscordMessage={sendDiscordMessage} wallet={wallet} />
      </ThemeProvider>
      </WalletProvider>
    </React.Fragment>
  );
}

MyApp.propTypes = {
  Component: PropTypes.elementType.isRequired,
  pageProps: PropTypes.object.isRequired,
};
