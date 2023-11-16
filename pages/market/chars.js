import React from "react"

import algosdk from "algosdk"

import { Grid, Typography, Button } from "@mui/material"

import BuyNft from "../../components/contracts/Market/BuyNft"


export default class Daos extends React.Component { 

    constructor(props) {
        super(props);
        this.state = {
            chars: [],
            zoomNft: null
        };
    }

    async componentDidMount() {

        try {
        
        const response = await fetch('/api/market/getChars', {
            method: "POST",
            body: JSON.stringify({
            }),
            headers: {
              "Content-Type": "application/json",
            }
              
          });
        
          const session = await response.json()

          console.log(session)
    
          this.setState({
            chars: session
          })
    
        
        }
        catch(error) {
            this.props.sendDiscordMessage(error, "Char Fetch")
          }

      }

    render() {

    
        return (
            <div >
             

                    <Grid container spacing={3} >


                    {this.state.zoomNft ? 
                    <Grid item xs={12} sm={12} md={12} lg={12} >
                        <BuyNft contract={1035432580} nftId={this.state.zoomNft.assetId} price={this.state.zoomNft.assetPrice} setMessage={this.props.setMessage} setNft={(nftId) => this.setState({zoomNft: nftId})} zoom={true} cat={"chars"} sendDiscordMessage={this.props.sendDiscordMessage} />
                    </Grid>
                    :

                    this.state.chars.map((nft, index) => {
                        return (
                            <Grid key={index} item xs={6} sm={4} md={3} lg={2} style={{position: "relative"}} >
                                <BuyNft style={{position: "absolute"}} contract={1035432580} nftId={nft.assetId} nftFull={nft} price={nft.assetPrice} setNft={(nft) => this.setState({zoomNft: nft})} cat={"chars"} sendDiscordMessage={this.props.sendDiscordMessage} />
                                
                            </Grid>
                        )
                    })
                    }

                    </Grid>

                
                
            </div>
        )
    }
    
}