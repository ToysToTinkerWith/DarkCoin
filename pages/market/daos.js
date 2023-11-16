import React from "react"

import algosdk from "algosdk"

import { Grid, Typography, Button } from "@mui/material"

import BuyNft from "../../components/contracts/Market/BuyNft"


export default class Daos extends React.Component { 

    constructor(props) {
        super(props);
        this.state = {
            DAOs: [],
            zoomNft: null
        };
    }

    async componentDidMount() {

        try {
        
        const response = await fetch('/api/market/getDaos', {
            method: "POST",
            body: JSON.stringify({
              contract: this.props.contracts.market,
            }),
            headers: {
              "Content-Type": "application/json",
            }
              
          });
        
          const session = await response.json()
    
          this.setState({
            DAOs: session
          })
    
        }
        catch(error) {
            props.sendDiscordMessage(error, "Dao Fetch", activeAccount.address)
          }


      }

    render() {


    
        return (
            <div >
             
                        <Typography color="secondary" align="center" variant="h6"> 
                        <img style={{width: 50, paddingRight: 20}} src="/invDC.svg"/>
                        {(100000).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
 
                        </Typography>
                        

                    
              

                    <Grid container spacing={3} >


                    {this.state.zoomNft ? 
                    <Grid item xs={12} sm={12} md={12} lg={12} >
                        <BuyNft contract={this.props.contracts.market} nftId={this.state.zoomNft} setMessage={this.props.setMessage} setNft={(nftId) => this.setState({zoomNft: nftId})} zoom={true} cat={"DAO"} sendDiscordMessage={this.props.sendDiscordMessage} />
                    </Grid>
                    :

                    this.state.DAOs.map((nft, index) => {
                        return (
                            <Grid key={index} item xs={6} sm={4} md={3} lg={2} style={{position: "relative"}} >
                                <BuyNft style={{position: "absolute"}} contract={this.props.contracts.market} nftId={nft.id} nftFull={nft} setNft={(nft) => this.setState({zoomNft: nft.id})} cat={"DAO"} sendDiscordMessage={this.props.sendDiscordMessage} />
                                
                            </Grid>
                        )
                    })
                    }

                    </Grid>

                
                
            </div>
        )
    }
    
}