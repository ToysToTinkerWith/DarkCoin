import React, { useState, useEffect } from "react"

import MyAlgo from '@randlabs/myalgo-connect';

import { PeraWalletConnect } from "@perawallet/connect";

const peraWallet = new PeraWalletConnect();

import { Button, Typography } from "@mui/material"

export default function AlgoConnect(props) {

    useEffect(() => {
        // Reconnect to the session when the component is mounted
        peraWallet.reconnectSession().then((accounts) => {
          // Setup the disconnect event listener
          peraWallet.connector?.on("disconnect", disconnect);
    
          if (accounts.length) {
            props.setActiveAddress(accounts[0])
            props.setWalletType("pera")
          }
        });
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


      
        peraWallet
        .connect()
        .then((newAccounts) => {
            props.setActiveAddress(newAccounts[0]);
            props.setWalletType("pera")
        })
        .catch((error) => {
            // You MUST handle the reject because once the user closes the modal, peraWallet.connect() promise will be rejected.
            // For the async/await syntax you MUST use try/catch
            if (error?.data?.type !== "CONNECT_MODAL_CLOSED") {
                // log the necessary errors
            }
            });
       
        
      }

    const disconnect = () => {
        props.setActiveAddress(null)
    }

    return (
        <div >
            <br />
            {props.activeAddress ? 
            <>
            <Typography align="center" variant="h6" style={{fontFamily: "Jacques", color: "#FFFFFF"}}> {props.activeAddress.slice(0, 10)} </Typography>
            <br />
            <Button 
                style={{display: "flex", margin: "auto", padding: 10, borderRadius: 15, backgroundColor: "#FFFFFF"}}
                onClick={() => disconnect()}
            > 
            <Typography variant="h6" style={{fontFamily: "Jacques", color: "#000000"}}> Disconnect </Typography>
            </Button>
            </>
            :
            <>
            <Button 
                
                style={{display: "flex", margin: "auto", padding: 10, borderRadius: 15, backgroundColor: "#FFFFFF"}}
                onClick={() => handleConnectWalletClick()}
                > 
                <Typography variant="h6" style={{fontFamily: "Chango",  color: "#000000"}}> Pera </Typography>
            </Button>
            <br />
            <Button 
                
                style={{display: "flex", margin: "auto", borderRadius: 15, backgroundColor: "#FFFFFF"}}
                onClick={() => connectToMyAlgo()}
                > 
                <Typography variant="h6" style={{fontFamily: "Chango", color: "#000000", borderRadius: 15}}> MyAlgo </Typography>
            </Button>
            </>
            
            }
            <br />
        </div>
    )
}





