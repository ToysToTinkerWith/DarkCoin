import React from "react"

import { PeraWalletConnect } from "@perawallet/connect";

const peraWallet = new PeraWalletConnect();

import algosdk from "algosdk"

import { Grid, Typography, Button } from "@mui/material"

import BuyHoomen from "./BuyHoomen"
import RefundHoomen from "./RefundHoomen"



export default class HappyHoomens extends React.Component { 

    constructor(props) {
        super(props);
        this.state = {
            contract: 1035432580,
            allHoomens: [],
            conHoomens: [],
            ownedHoomens: [],
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

        let address = await algosdk.getApplicationAddress(this.state.contract)

        console.log(address)

          let assets = await indexerClient.lookupAccountAssets(address).do();

          let numHoomen = 0

          let numAssets
          let nextToken

          
          assets.assets.forEach(async (asset) => {
            if(asset.amount == 1) {
              if (numHoomen < 12) {
                this.setState(prevState => ({
                  conHoomens: [...prevState.conHoomens, {id: asset["asset-id"]}]
                }))
                numHoomen += 1
              }

              
            }
            
          })

          numAssets = assets.assets.length
          nextToken = assets["next-token"]

          while (numAssets == 1000) {

            assets = await indexerClient.lookupAccountAssets(address).nextToken(nextToken).do();

            assets.assets.forEach(async (asset) => {
                if(asset.amount == 1) {
                    if (asset["asset-id"] >= 1035280503 && asset["asset-id"] <= 1035284935) {
                      if (numHoomen < 12) {
                        this.setState(prevState => ({
                          conHoomens: [...prevState.conHoomens, {id: asset["asset-id"]}]
                        }))
                        numHoomen += 1
                      }
                        
                    }
                    
                      
                    } 
            })

            numAssets = assets.assets.length
            nextToken = assets["next-token"]

          }
            

            if (this.props.activeAddress) {

              let assetsHoomens = await indexerClient.lookupAccountCreatedAssets("BS5D5I56LGDFTAVW4ZR2VOZMUYVI4RHUICX2JB2U3373WKB2RZ2HD6K2G4")
            .limit(1000).do();
  
            assetsHoomens.assets.forEach(async (asset) => {
              if(asset.params["unit-name"].substring(0, 2) == "HH") {
                this.setState(prevState => ({
                  allHoomens: [...prevState.allHoomens, asset.index]
                }))
              }
              
            })
  
            let assetsLen = assetsHoomens.assets.length
            let assetsNext = assetsHoomens["next-token"]
  
            while (assetsLen == 1000) {
  
              assetsHoomens = await indexerClient.lookupAccountCreatedAssets("AL6F3TFPSZPF3BSVUFDNOLMEKUCJJAA7GZ5GF3DN3Q4IVJVNUFK76PQFNE").nextToken(assetsNext)
                .limit(1000).do();
  
                assetsHoomens.assets.forEach(async (asset) => {
                if(asset.params["unit-name"].substring(0, 4) == "HH") {
                    this.setState(prevState => ({
                      allHoomens: [...prevState.allHoomens, asset.index]
                    }))
                  }
                
              })
  
              assetsLen = assetsHoomens.assets.length
              assetsNext = assetsHoomens["next-token"]
  
            }

              let assetsWallet = await indexerClient.lookupAccountAssets(this.props.activeAddress)
              .limit(1000).do();

    
              assetsWallet.assets.forEach(async (asset) => {
                if(this.state.allHoomens.includes(asset["asset-id"]) && asset.amount == 1) {
                  this.setState(prevState => ({
                    ownedHoomens: [...prevState.ownedHoomens, asset["asset-id"]]
                  }))
                }
                
              })
    
              assetsLen = assetsWallet.assets.length
              assetsNext = assetsWallet["next-token"]
    
              while (assetsLen == 1000) {
    
                assetsWallet = await indexerClient.lookupAccountAssets(this.props.activeAddress).nextToken(assetsNext)
                  .limit(1000).do();
    
                  assetsWallet.assets.forEach(async (asset) => {
                  if(this.state.daoNFTs.includes(asset["asset-id"])) {
                      this.setState(prevState => ({
                        ownedHoomens: [...prevState.ownedHoomens, asset["asset-id"]]
                      }))
                    }
                  
                })
    
                assetsLen = assetsWallet.assets.length
                assetsNext = assetsWallet["next-token"]


              }

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
                      <Grid item xs={12} sm={12} md={12} lg={12} >
                          <Button style={{backgroundColor: this.state.cat == "Hoomens" ? "#FFFFFF" : "#000000", border: "1px solid white", borderRadius: 15, padding: 10}} onClick={() => this.state.cat == "Hoomens" ? this.setState({cat: "", zoomNft: null, confirm: ""}) : this.setState({cat: "Hoomens", zoomNft: null, confirm: ""})}>
                            <Typography  variant="h6" style={{color: this.state.cat == "Hoomens" ? "#000000" : "#FFFFFF"}}> Hoomens 1 </Typography>
                          </Button>
                          
                      </Grid>
                      {/* <Grid item xs={12} sm={12} md={12} lg={12} >
                          <Button style={{backgroundColor: this.state.cat == "Refunds" ? "#FFFFFF" : "#000000", border: "1px solid white", borderRadius: 15, padding: 10}} onClick={() => this.state.cat == "Refunds" ? this.setState({cat: "", zoomNft: null, confirm: ""}) : this.setState({cat: "Refunds", zoomNft: null, confirm: ""})}>
                            <Typography  variant="h6" style={{color: this.state.cat == "Refunds" ? "#000000" : "#FFFFFF"}}> Refunds </Typography>
                          </Button>
                          
                      </Grid> */}
                    </Grid>

                    {this.state.cat == "Hoomens" ? 
                      <>
                      <br />
                        <Typography color="secondary" align="center" variant="h6"> 
                        <img style={{width: 50, paddingRight: 20}} src="./invDC.svg"/>
                        {(175000).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")} 
                        <Typography align="center" color="secondary" variant="subtitle1"> or </Typography>
                        <img style={{width: 50, paddingRight: 20, marginLeft: 20}} src="./Treats.svg"/>
                        {(12000).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
 
                        </Typography>
                        <br />
                        

                      </>
                      :
                      null
                    }

                    {this.state.cat == "Refunds" ? 
                      <>
                      <br />
                        <Typography color="secondary" align="center" variant="h6"> 
                        <img style={{width: 50, paddingRight: 20, marginLeft: 20}} src="./Treats.svg"/>
                        {(8400).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
 
                        </Typography>
                        <br />
                        

                      </>
                      :
                      null
                    }
                    
                    

                    {this.state.confirm ? 
                      <>
                      <Typography color="secondary" align="center" variant="h6"> {this.state.confirm} </Typography>
                      </>
                      :
                      null
                    }

                    <Grid container spacing={3} >

                    {this.state.cat == "Hoomens" ?

                    this.state.zoomNft ? 
                    <Grid item xs={12} sm={12} md={12} lg={12} >
                        <BuyHoomen contract={this.state.contract} nftId={this.state.zoomNft} activeAddress={this.props.activeAddress} wallet={this.props.wallet} setNft={(nftId) => this.setState({zoomNft: nftId})} zoom={true} cat={this.state.cat} sendErrorMessage={this.sendErrorMessage} />
                    </Grid>
                    :

                    this.state.conHoomens.map((nft, index) => {
                        return (
                            <Grid key={index} item xs={6} sm={4} md={3} lg={2} style={{position: "relative"}} >
                                <BuyHoomen contract={this.state.contract} style={{position: "absolute"}} nftId={nft.id} activeAddress={this.props.activeAddress} wallet={this.props.wallet} setNft={(nftId) => this.setState({zoomNft: nftId})} sendErrorMessage={this.sendErrorMessage}/>
                                
                            </Grid>
                        )
                    })

                    :
                    null
                    }

                    {this.state.cat == "Refunds" ?

                    this.state.zoomNft ? 
                    <Grid item xs={12} sm={12} md={12} lg={12} >
                        <RefundHoomen contract={this.state.contract} nftId={this.state.zoomNft} activeAddress={this.props.activeAddress} wallet={this.props.wallet} setNft={(nftId) => this.setState({zoomNft: nftId})} zoom={true} cat={this.state.cat} sendErrorMessage={this.sendErrorMessage} />
                    </Grid>
                    :

                    this.state.ownedHoomens.map((nft, index) => {
                        return (
                            <Grid key={index} item xs={6} sm={4} md={3} lg={2} style={{position: "relative"}} >
                                <RefundHoomen contract={this.state.contract} style={{position: "absolute"}} nftId={nft} activeAddress={this.props.activeAddress} wallet={this.props.wallet} setNft={(nftId) => this.setState({zoomNft: nftId})} sendErrorMessage={this.sendErrorMessage}/>
                                
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