import React from "react"

import { PeraWalletConnect } from "@perawallet/connect";

const peraWallet = new PeraWalletConnect();

import algosdk from "algosdk"

import { Grid, Typography, Button } from "@mui/material"

import BuyNft from "./BuyNft"

import DCchars from "./DCchars"


export default class DarkCoin extends React.Component { 

    constructor(props) {
        super(props);
        this.state = {
            contract: 1100807585,
            DAOs: [],
            Warriors1: [],
            displayWarriors1: [],
            Warriors2: [],
            displayWarriors2: [],
            cat: "",
            zoomNft: null,
            confirm: ""
        };
    }

    componentDidMount() {
        
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
      
        const indexerClient = new algosdk.Indexer(token, 'https://mainnet-algorand.api.purestake.io/idx2', '');
        
        (async () => {

          let assets = await indexerClient.lookupAccountAssets("A563R3UMXKXK5C6CSBM5OA4NQRKMQJACAG75TPX3RDVWGBCKJNHLXHECSU").do();

          let numDAO = 0
          let numWarrior1 = 0
          let numWarrior2 = 0

          let numAssets
          let nextToken

          
          assets.assets.forEach(async (asset) => {
            if(asset.amount == 1) {
            if (asset["asset-id"] >= 810866012 && asset["asset-id"] <= 811073864) {
              if (numDAO < 12) {
                this.setState(prevState => ({
                  DAOs: [...prevState.DAOs, {id: asset["asset-id"]}]
                }))
                numDAO += 1
              }
                
            }
            else if (asset["asset-id"] >= 818167963 && asset["asset-id"] <= 818219236) {
              if (numWarrior1 < 12) {
                this.setState(prevState => ({
                  Warriors1: [...prevState.Warriors1, {id: asset["asset-id"]}]
                }))
                numWarrior1 += 1
              }
                
            }
            else if (asset["asset-id"] >= 846867259 && asset["asset-id"] <= 846902086) {
              if (numWarrior2 < 12) {
                this.setState(prevState => ({
                  Warriors2: [...prevState.Warriors2, {id: asset["asset-id"]}]
                }))
                numWarrior2 += 1
              }
                
              
                
            }
              
            }
            
          })

          numAssets = assets.assets.length
          nextToken = assets["next-token"]

          while (numAssets == 1000) {

            assets = await indexerClient.lookupAccountAssets("A563R3UMXKXK5C6CSBM5OA4NQRKMQJACAG75TPX3RDVWGBCKJNHLXHECSU").nextToken(nextToken).do();

            assets.assets.forEach(async (asset) => {
              if(asset.amount == 1) {
              if (asset["asset-id"] >= 810866012 && asset["asset-id"] <= 811073864) {
                if (numDAO < 12) {
                  this.setState(prevState => ({
                    DAOs: [...prevState.DAOs, {id: asset["asset-id"]}]
                  }))
                  numDAO += 1
                }
                  
              }
              else if (asset["asset-id"] >= 818167963 && asset["asset-id"] <= 818219236) {
                if (numWarrior1 < 12) {
                  this.setState(prevState => ({
                    Warriors1: [...prevState.Warriors1, {id: asset["asset-id"]}]
                  }))
                  numWarrior1 += 1
                }
                  
              }
              else if (asset["asset-id"] >= 846867259 && asset["asset-id"] <= 846902086) {
                if (numWarrior2 < 12) {
                  this.setState(prevState => ({
                    Warriors2: [...prevState.Warriors2, {id: asset["asset-id"]}]
                  }))
                  numWarrior2 += 1
                }
                  
                
                  
              }
                
              }
              
            })

            numAssets = assets.assets.length
            nextToken = assets["next-token"]




          }


        })().catch(e => {
            console.error(e);
            console.trace();
        })

      }

    render() {


    
        return (
            <div >
              <br />
                <>
                  <Grid container align="center" spacing={3} >
                      <Grid item xs={12} sm={3} md={3} lg={3} >
                          <Button style={{backgroundColor: this.state.cat == "DAO" ? "#FFFFFF" : "#000000", border: "1px solid white", borderRadius: 15, padding: 10}} onClick={() => this.state.cat == "DAO" ? this.setState({cat: "", zoomNft: null, confirm: ""}) : this.setState({cat: "DAO", zoomNft: null, confirm: ""})}>
                            <Typography  variant="h6" style={{color: this.state.cat == "DAO" ? "#000000" : "#FFFFFF"}}> DAOs </Typography>
                          </Button>
                          
                      </Grid>
                      <Grid item xs={12} sm={3} md={3} lg={3} >
                          <Button style={{backgroundColor: this.state.cat == "Warrior1" ? "#FFFFFF" : "#000000", border: "1px solid white", borderRadius: 15, padding: 10}} onClick={() => this.state.cat == "Warrior1" ? this.setState({cat: "", zoomNft: null, confirm: ""}) : this.setState({cat: "Warrior1", zoomNft: null, confirm: ""})}>
                            <Typography  variant="h6" style={{color: this.state.cat == "Warrior1" ? "#000000" : "#FFFFFF"}}> Warriors1 </Typography>
                          </Button>
                          
                      </Grid>
                      <Grid item xs={12} sm={3} md={3} lg={3} >
                          <Button style={{backgroundColor: this.state.cat == "Warrior2" ? "#FFFFFF" : "#000000", border: "1px solid white", borderRadius: 15, padding: 10}} onClick={() => this.state.cat == "Warrior2" ? this.setState({cat: "", zoomNft: null, confirm: ""}) : this.setState({cat: "Warrior2", zoomNft: null, confirm: ""})}>
                            <Typography  variant="h6" style={{color: this.state.cat == "Warrior2" ? "#000000" : "#FFFFFF"}}> Warriors2 </Typography>
                          </Button>
                          
                      </Grid>
                      <Grid item xs={12} sm={3} md={3} lg={3} >
                          <Button style={{backgroundColor: this.state.cat == "Chars" ? "#FFFFFF" : "#000000", border: "1px solid white", borderRadius: 15, padding: 10}} onClick={() => this.state.cat == "Chars" ? this.setState({cat: "", zoomNft: null, confirm: ""}) : this.setState({cat: "Chars", zoomNft: null, confirm: ""})}>
                            <Typography  variant="h6" style={{color: this.state.cat == "Chars" ? "#000000" : "#FFFFFF"}}> Characters </Typography>
                          </Button>
                          
                      </Grid>
                      
                    </Grid>

                    {this.state.cat == "DAO" ? 
                      <>
                      <br />
                        <Typography color="secondary" align="center" variant="h6"> 
                        <img style={{width: 50, paddingRight: 20}} src="./invDC.svg"/>
                        {(100000).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
 
                        </Typography>
                        

                      </>
                      :
                      null
                    }
                    
                    {this.state.cat == "Warrior1" ? 
                      <>
                      <br />
                        <Typography color="secondary" align="center" variant="h6"> 
                        <img style={{width: 50, paddingRight: 20}} src="./invDC.svg"/>
                        {(250000).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
 
                        </Typography>
                        

                      </>
                      :
                      null
                    }

                    {this.state.cat == "Warrior2" ? 
                      <>
                      <br />
                        <Typography color="secondary" align="center" variant="h6"> 
                        <img style={{width: 50, paddingRight: 20}} src="./invDC.svg"/>
                        {(1250000).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
 
                        </Typography>
                        

                      </>
                      :
                      null
                    }

                    {this.state.cat == "Chars" ? 
                      <>
                      <br />
                        <DCchars activeAddress={this.props.activeAddress} wallet={this.props.wallet} sendErrorMessage={this.sendErrorMessage} />
                        

                      </>
                      :
                      null
                    }

                    <br />

                    {this.state.confirm ? 
                      <>
                      <Typography color="secondary" align="center" variant="h6"> {this.state.confirm} </Typography>
                      </>
                      :
                      null
                    }

                    <Grid container spacing={3} >

                    {this.state.cat == "DAO" ?

                    this.state.zoomNft ? 
                    <Grid item xs={12} sm={12} md={12} lg={12} >
                        <BuyNft contract={this.state.contract} nftId={this.state.zoomNft} activeAddress={this.props.activeAddress} wallet={this.props.wallet} setNft={(nftId) => this.setState({zoomNft: nftId})} zoom={true} cat={this.state.cat} sendErrorMessage={this.sendErrorMessage}/>
                    </Grid>
                    :

                    this.state.DAOs.map((nft, index) => {
                        return (
                            <Grid key={index} item xs={6} sm={4} md={3} lg={2} style={{position: "relative"}} >
                                <BuyNft style={{position: "absolute"}} contract={this.state.contract} nftId={nft.id} activeAddress={this.props.activeAddress} wallet={this.props.wallet} setNft={(nftId) => this.setState({zoomNft: nftId})} sendErrorMessage={this.sendErrorMessage}/>
                                
                            </Grid>
                        )
                    })

                    :
                    null
                    }

                    {this.state.cat == "Warrior1" ?

                    this.state.zoomNft ? 
                    <Grid item xs={12} sm={12} md={12} lg={12}>
                        <BuyNft contract={this.state.contract} nftId={this.state.zoomNft} activeAddress={this.props.activeAddress} wallet={this.props.wallet} setNft={(nftId) => this.setState({zoomNft: nftId})} zoom={true} cat={this.state.cat} sendErrorMessage={this.sendErrorMessage}/>
                    </Grid>
                    :
                    
                    this.state.Warriors1.map((nft, index) => {
                        return (
                            <Grid key={index} item xs={6} sm={4} md={3} lg={2} style={{position: "relative"}}>
                                <BuyNft style={{position: "absolute"}} contract={this.state.contract} nftId={nft.id} activeAddress={this.props.activeAddress} wallet={this.props.wallet} setNft={(nftId) => this.setState({zoomNft: nftId})} sendErrorMessage={this.sendErrorMessage}/>
                                
                            </Grid>
                        )
                    })
                   
                    :
                    null
                    }

                    {this.state.cat == "Warrior2" ?

                    this.state.zoomNft ? 
                    <Grid item xs={12} sm={12} md={12} lg={12}>
                        <BuyNft contract={this.state.contract} nftId={this.state.zoomNft} activeAddress={this.props.activeAddress} wallet={this.props.wallet} setNft={(nftId) => this.setState({zoomNft: nftId})} zoom={true} cat={this.state.cat} sendErrorMessage={this.sendErrorMessage}/>
                    </Grid>
                    :
                    this.state.Warriors2.map((nft, index) => {
                        return (
                            <Grid key={index} item xs={6} sm={4} md={3} lg={2} style={{position: "relative"}}>
                                <BuyNft contract={this.state.contract} style={{position: "absolute"}} nftId={nft.id} activeAddress={this.props.activeAddress} wallet={this.props.wallet} setNft={(nftId) => this.setState({zoomNft: nftId})} sendErrorMessage={this.sendErrorMessage}/>
                                
                            </Grid>
                        )
                    })
                   
                    :
                    null
                    }
                    
                    </Grid>

                    <br />

  

                  
                  
                  

                  

                </>
                

                

             
                
                
            </div>
        )
    }
    
}