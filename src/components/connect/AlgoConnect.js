import React, { useState, useEffect } from "react"

import MyAlgo from '@randlabs/myalgo-connect';

import { PeraWalletConnect } from "@perawallet/connect";

const peraWallet = new PeraWalletConnect();

import { Button, Typography, Grid } from "@mui/material"

import ActiveDC from "./ActiveDC"

import muisty from "../../muistyles.module.css"

import styles from "../../index.module.css"

export default function AlgoConnect(props) {

    const [open, setOpen] = useState(false)

    useEffect(() => {

            peraWallet.reconnectSession().then((accounts) => {
                // Setup the disconnect event listener
                peraWallet.connector?.on("disconnect", disconnect);
          
                if (accounts.length) {
                  props.setActiveAddress(accounts[0])
                  props.setWalletType("pera")
                }
              })
              .catch((error) => {
                // You MUST handle the reject because once the user closes the modal, peraWallet.connect() promise will be rejected.
                // For the async/await syntax you MUST use try/catch
                if (error?.data?.type !== "CONNECT_MODAL_CLOSED") {
                    // log the necessary errors
                    console.log(error)
                }
                });
            
            
            
        // Reconnect to the session when the component is mounted
       
      }, []);

    const myAlgoWallet = new MyAlgo()

    const connectToMyAlgo = async() => {
        try {

        const accounts = await myAlgoWallet.connect();
    
        const addresses = accounts.map(account => account.address);

        props.setActiveAddress(addresses[0])
        props.setWalletType("myalgo")
        
        
        } catch (err) {
        console.error(err);
        }
    }


    function handleConnectWalletClick() {
        peraWallet.connect()
        .then((newAccounts) => {
            props.setActiveAddress(newAccounts[0]);
            props.setWalletType("pera")
        })
        .catch((error) => {
            // You MUST handle the reject because once the user closes the modal, peraWallet.connect() promise will be rejected.
            // For the async/await syntax you MUST use try/catch
            if (error?.data?.type !== "CONNECT_MODAL_CLOSED") {
                // log the necessary errors
                console.log(error)
            }
            });
       
        
      }

    const disconnect = () => {
        props.setActiveAddress(null)
    }

    

    return (
        <Grid className={muisty.algoConnect} container style={{maxWidth: open ? 350 : 200, float: "right"}}>
            {props.activeAddress ? 
            open ?
            <>
            <Grid item xs={12} sm={6} md={6}>
                <Button className={muisty.connectbtn}
                    onClick={() => setOpen(!open)}> 
                    <img className={styles.walletGreenSvg} src="walletGreen.svg" />
                    <Typography className={muisty.activeWallet} variant="h6"> {props.activeAddress.slice(0,3) + "..." + props.activeAddress.slice(55)} </Typography>
                </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={6}>
            <Button className={muisty.disconnectbtn} 
                onClick={() => disconnect()}> 
            <Typography className={muisty.disconnectbtnt} variant="subtitle2"> Disconnect </Typography>
            </Button>
            </Grid>
            <Grid item xs={12} sm={12} >
                <ActiveDC activeAddress={props.activeAddress} />
            </Grid>

            </>
            :
            <>
             <Grid item xs={12} sm={12} >
                <Button className={muisty.connectedNavBarBtn}
                    onClick={() => setOpen(!open)}> 
                    <img className={styles.walletGreenSvg} src="walletGreen.svg" />
                    <Typography className={muisty.activeWallet} variant="h6"> {props.activeAddress.slice(0,4) + "..." + props.activeAddress.slice(54)} </Typography>
                </Button>
            </Grid>
                
            </>
            :
            open ?
            <>
            <Grid item xs={6}>
                <Button className={muisty.connectedNavBarBtn}
                    onClick={() => setOpen(!open)}> 
                    <img className={styles.walletGreenSvg} src="wallet.svg" />
                    <Typography className={muisty.connectbtnt} variant="h6"> Connect </Typography>
                </Button>
            </Grid>
            <Grid className={muisty.walletTypeGrid} item xs={3}>
                <Button 
                    onClick={() => handleConnectWalletClick()}> 
                    <img src="Pera.svg"  />
                </Button>
            </Grid>
            <Grid className={muisty.walletTypeGrid} item xs={3}>
                <Button className={muisty.myAlgoBtn} 
                    onClick={() => connectToMyAlgo()}> 
                    <img src="myAlgo.svg" />
                </Button>
            </Grid>
            </>
            :
            <>
            <Grid item xs={12}>
                <Button className={muisty.connectedNavBarBtn}
                    onClick={() => setOpen(!open)}> 
                    <img className={muisty.walletGreenSvg} src="wallet.svg" />
                    <Typography className={muisty.connectbtnt} variant="h6"> Connect </Typography>
                </Button>
            </Grid>
            
            
            </>
            }
            
        </Grid>
    )
}





