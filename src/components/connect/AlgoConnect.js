import React, { useState, useEffect } from "react"

import MyAlgo from '@randlabs/myalgo-connect';

import { PeraWalletConnect } from "@perawallet/connect";

const peraWallet = new PeraWalletConnect();

import { Button, Typography, Grid } from "@mui/material"

import ActiveDC from "./ActiveDC"

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
        <Grid container style={{border: "1px solid white", borderRadius: 15, maxWidth: open ? 350 : 200, float: "right"}}>
            {props.activeAddress ? 
            open ?
            <>
            <Grid item xs={12} sm={6} md={6}>
                <Button 
                    onClick={() => setOpen(!open)}
                    style={{padding: 20}}> 
                    <img src="walletGreen.svg" style={{ paddingRight: 10}} />
                    <Typography variant="h6" style={{color: "#7CFC00"}}> {props.activeAddress.slice(0,3) + "..." + props.activeAddress.slice(55)} </Typography>
                </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={6}>
            <Button style={{backgroundColor: "white", borderRadius: 15, margin: 10, float: "right"}}
                onClick={() => disconnect()}> 
            <Typography variant="subtitle2"> Disconnect </Typography>
            </Button>
            </Grid>
            <Grid item xs={12} sm={12} >
                <ActiveDC activeAddress={props.activeAddress} />
            </Grid>

            </>
            :
            <>
             <Grid item xs={12} sm={12} >
                <Button 
                    onClick={() => setOpen(!open)}
                    style={{padding: 20, float: "left"}}> 
                    <img src="walletGreen.svg" style={{paddingRight: 10}} />
                    <Typography variant="h6" style={{color: "#7CFC00"}}> {props.activeAddress.slice(0,4) + "..." + props.activeAddress.slice(54)} </Typography>
                </Button>
            </Grid>
                
            </>
            :
            open ?
            <>
            <Grid item xs={6}>
                <Button 
                    onClick={() => setOpen(!open)}
                    style={{padding: 20, float: "left"}}> 
                    <img src="wallet.svg"  style={{paddingRight: 10}}/>
                    <Typography variant="h6" style={{color: "#FFFFFF"}}> Connect </Typography>
                </Button>
            </Grid>
            <Grid item xs={3} style={{marginTop: 10}}>
                <Button 
                    onClick={() => handleConnectWalletClick()}> 
                    <img src="Pera.svg"  />
                </Button>
            </Grid>
            <Grid item xs={3} style={{marginTop: 10}}>
                <Button style={{marginRight: 20}}
                    onClick={() => connectToMyAlgo()}> 
                    <img src="myAlgo.svg" />
                </Button>
            </Grid>
            </>
            :
            <>
            <Grid item xs={12}>
                <Button 
                    onClick={() => setOpen(!open)}
                    style={{padding: 20, float: "left"}}> 
                    <img src="wallet.svg" style={{paddingRight: 10}} />
                    <Typography variant="h6" style={{color: "#FFFFFF"}}> Connect </Typography>
                </Button>
            </Grid>
            
            
            </>
            }
            
        </Grid>
    )
}





