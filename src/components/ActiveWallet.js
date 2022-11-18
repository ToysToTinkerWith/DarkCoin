import React from "react"

import algosdk from "algosdk"

import DisplayNft from "./DisplayNft"
import Trade from "./contracts/Trade.js"
import Mixer from "./contracts/Mixer.js"
import Market from "./contracts/Market.js"

import DAO2 from "./contracts/DAO2"




import { Grid, Card, Modal, Typography, Button } from "@mui/material"

import styles from "../index.module.css"

import muisty from "../muistyles.module.css"

export default class ActiveWallet extends React.Component { 

    constructor(props) {
        super(props);
        this.state = {
            ownedNfts: [],
            darkCoin: 0,
            page: "NFTs",
            activeNft: null
            
        };
        
    }

    componentDidMount() {
        
        const token = {
            'X-API-Key': process.env.indexerKey
        }
    
        const indexerClient = new algosdk.Indexer(token, 'https://mainnet-algorand.api.purestake.io/idx2', '');


      (async () => {
        let acct = this.props.activeAddress;

        let numAssets = 0
        let nextToken = 0

        let accountInfo = await indexerClient.lookupAccountAssets(acct).do();

        numAssets = accountInfo.assets.length
        nextToken = accountInfo["next-token"]

        accountInfo.assets.forEach(async (asset) => {
          if (asset["asset-id"] == 601894079) {
            this.setState({
                darkCoin: asset.amount
            })
          }
          if (asset.amount == 1) {
            this.setState(prevState => ({
                ownedNfts: [...prevState.ownedNfts, asset]
              }))
          }
    
        })

        while (numAssets == 1000) {

            accountInfo = await indexerClient.lookupAccountAssets(acct).nextToken(nextToken).do();

            accountInfo.assets.forEach(async (asset) => {
                if (asset["asset-id"] == 601894079) {
                  this.setState({
                      darkCoin: asset.amount
                  })
                }
                if (asset.amount == 1) {
                  this.setState(prevState => ({
                      ownedNfts: [...prevState.ownedNfts, asset]
                    }))
                }
          
              })

            numAssets = accountInfo.assets.length
            nextToken = accountInfo["next-token"]
        }
  
        
        
    })().catch(e => {
        console.log(e);
        console.trace();
    });
    
    
    }

   

    render() {

        let ownedNfts = []

        for(var i = 0; i < this.state.ownedNfts.length; i++) {
            if (this.props.dcNfts.includes(this.state.ownedNfts[i]["asset-id"])) {
                ownedNfts.push(this.state.ownedNfts[i])
            }
        }

        return (
            <div>
                <Grid container alignItems="center" >
                    <Grid item xs={12} sm={12} md={12}>
                        <Typography className={muisty.darkcoinh6} align="center" variant="h6"> Dark Coin </Typography>
                        <img className={styles.bodylogo} src="./DarkCoinLogo.svg"/>
                        <Typography className={muisty.dcbalance} align="center" variant="h6"> {(this.state.darkCoin).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</Typography>
                    </Grid>

                    <Grid container align="center" >
                      <Grid item xs={12} sm={4} md={4} lg={4} >
                          <Button className={muisty.bodytab} style={{backgroundColor: this.state.page == "NFTs" ? "#FFFFFF" : "#000000", border: "1px solid white"}} onClick={() => this.state.page == "NFTs" ? this.setState({page: ""}) : this.setState({page: "NFTs"})}>
                            <Typography className={muisty.bodytabt} variant="h6" style={{color: this.state.page == "NFTs" ? "#000000" : "#FFFFFF"}}> NFTs </Typography>
                          </Button>
                          
                      </Grid>
                      <Grid item xs={12} sm={4} md={4} lg={4} >
                          <Button className={muisty.bodytab} style={{backgroundColor: this.state.page == "Market" ? "#FFFFFF" : "#000000", border: "1px solid white"}} onClick={() => this.state.page == "Market" ? this.setState({page: ""}) : this.setState({page: "Market"})}>
                            <Typography className={muisty.bodytabt} variant="h6" style={{color: this.state.page == "Market" ? "#000000" : "#FFFFFF"}}> Market </Typography>
                          </Button>
                          
                      </Grid>
                      <Grid item xs={12} sm={4} md={4} lg={4} >
                          <Button className={muisty.bodytab} style={{backgroundColor: this.state.page == "Mixer" ? "#FFFFFF" : "#000000", border: "1px solid white"}} onClick={() => this.state.page == "Mixer" ? this.setState({page: ""}) : this.setState({page: "Mixer"})}>
                            <Typography className={muisty.bodytabt} variant="h6" style={{color: this.state.page == "Mixer" ? "#000000" : "#FFFFFF"}}> Mixer </Typography>
                          </Button>
                          
                      </Grid>
                      
                    </Grid>

                    {this.state.page == "Market" ?
                        <Grid item xs={12} sm={12} md={12}>
                            <Market activeAddress={this.props.activeAddress} wallet={this.props.wallet} />
                        </Grid>
                        :
                        null
                    }

                    {this.state.page == "NFTs" ? 
                    <>
                    
                    <Grid container align="center">
                        <Grid item xs={12} sm={12} md={12}>
                            <br />
                            <Button className={muisty.buytab} style={{backgroundColor: this.state.page == "NFTs" ? "#FFFFFF" : "#000000", border: "1px solid white"}} onClick={() => window.open("https://algoxnft.com/collection/dark-coin-dao?tab=buy_now")}>
                                <Typography className={muisty.buytabt} variant="h6" style={{color: this.state.page == "NFTs" ? "#000000" : "#FFFFFF"}}> Buy NFTs </Typography>
                            </Button>
                            
                        </Grid>
                       
                    {this.state.activeNft ?
                    <Grid item xs={12} sm={12} md={12}>
                        <Button className={muisty.activenft} onClick={() => this.setState({activeNft: null})} >
                            <Typography className={muisty.activenftname} align="center" variant="h6"> {this.state.activeNft[1].name} </Typography>
                            <img className={styles.activenftzoom} src={"https://ipfs.dark-coin.io/ipfs/" + this.state.activeNft[1].url.slice(7)} />
                        </Button>
                        <br />
                    </Grid>
                    :
                    ownedNfts.length > 0 ?
            
                    ownedNfts.map((nft, index) => {
                        return (
                            <Grid className={muisty.activenftgrid} item xs={6} sm={6} md={4} lg={3} key={index}>
                                <DisplayNft nftId={nft["asset-id"]} setActiveNft={(nft) => this.setState({activeNft: nft})} />
                            </Grid>
                        )
                    })
                    :
                    null
                    
                    }

                    </Grid>

                    {this.state.activeNft ?
                        this.state.activeNft[1]["unit-name"].slice(0, 4) == "DCGV" ?
                        <DAO2 activeNft={this.state.activeNft} activeAddress={this.props.activeAddress} wallet={this.props.wallet} />
                        :
                        this.state.activeNft[1].name.slice(0, 18) == "Dark Coin Warriors" && this.state.activeNft[1].name.slice(0, 22) != "Dark Coin Warriors 2.0" ?
                        <Trade ownedNfts={ownedNfts} activeNft={this.state.activeNft} activeAddress={this.props.activeAddress} wallet={this.props.wallet} />
                        :
                        null
                        :
                        null
                    }

                    

                    </>
                    :
                    null
                    }

                    {this.state.page == "Mixer" ?
                        <Grid item xs={12} sm={12} md={12}>
                            <Mixer activeAddress={this.props.activeAddress} wallet={this.props.wallet} />
                        </Grid>
                        :
                        null
                    }

                </Grid>

               <br />

            </div>

        )
    }
    
}