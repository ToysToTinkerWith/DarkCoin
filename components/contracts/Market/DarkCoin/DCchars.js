import React from "react"

import { PeraWalletConnect } from "@perawallet/connect";

const peraWallet = new PeraWalletConnect();

import algosdk from "algosdk"

import { Grid, Typography, Button } from "@mui/material"

import DisplayChar from "../../Arena/DisplayChar"

export default class DCchars extends React.Component { 

    constructor(props) {
        super(props);
        this.state = {
            contract: 1035432580,
            chars: []
        };
    }

    async componentDidMount() {
        
        peraWallet.reconnectSession()
        .catch((error) => {
          // You MUST handle the reject because once the user closes the modal, peraWallet.connect() promise will be rejected.
          // For the async/await syntax you MUST use try/catch
          if (error?.data?.type !== "CONNECT_MODAL_CLOSED") {
              // log the necessary errors
              console.log(error)
          }
          });


          const token = {
            'X-API-Key': process.env.indexerKey
        }

        const client = new algosdk.Algodv2(token, 'https://mainnet-algorand.api.purestake.io/ps2', '')
        

       

            const boxes = await client
            .getApplicationBoxes(this.state.contract)
            .do();

            boxes.boxes.forEach((box) => {
                let boxName = new TextDecoder().decode(box.name);

                let array = boxName.split(">")

                let assetId = array[0]
                let assetPrice = array[1]

                this.setState(prevState => ({
                    chars: [...prevState.chars, {assetId: assetId, assetPrice: assetPrice}]
                }))

            })

            
            
          

      }

    render() {

        console.log(this.state.charSelect)

        if (this.state.charSelect) {
            return (
                <Grid container>
                    <Grid item sm={12} md={12} >
                        <DisplayChar contract={this.state.contract} style={{position: "absolute"}} buy={true} nftId={this.state.charSelect[0]} price={this.state.charSelect[1]} activeAddress={this.props.activeAddress}  wallet={this.props.wallet} setNft={(nftId) => this.setState({charSelect: null})} sendErrorMessage={this.sendErrorMessage}/>
                    </Grid>
                </Grid>
            )
        }
        else {
            return (
                <div >
                    <Grid container>
                 
                    {this.state.chars.map((char) => {
                        return (
                            <Grid item xs={6} sm={4} md={3} lg={2} >
    
                                <DisplayChar contract={this.state.contract} style={{position: "absolute"}} nftId={char.assetId} price={char.assetPrice} activeAddress={this.props.activeAddress} wallet={this.props.wallet} setNft={(nftId, price) => this.setState({charSelect: [nftId, price]})} sendErrorMessage={this.sendErrorMessage}/>
    
                            </Grid>
                        )
                    })}
                    
    
                    </Grid>
                    
    
                    
    
                 
                    
                    
                </div>
            )
        }
        
    }
    
}