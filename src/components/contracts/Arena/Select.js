import React from "react"


//43EVULWFT4RU2H7EZH377SAVQJSJO5NZP37N3Y5DZ7PGUXOETKW7VWDIOA



import algosdk from "algosdk"

import { Grid, Typography, Button } from "@mui/material"


import DisplayChar from "./DisplayChar";

export default class Select extends React.Component { 

    constructor(props) {
        super(props);
        this.state = {
            accountAssets: [],
            dcChars: [],
            charSelect: null
        };
        this.handleChange = this.handleChange.bind(this)
    }

    async componentDidMount() {
        
        

          const indexerClient = new algosdk.Indexer('', 'https://algoindexer.algoexplorerapi.io', '');
 
          if (this.props.activeAddress) {
            let accountAssets = await indexerClient.lookupAccountAssets(this.props.activeAddress).do();

        
            accountAssets.assets.forEach((asset) => {
                if (asset.amount == 1) {
                    this.setState(prevState => ({
                        accountAssets: [...prevState.accountAssets, asset["asset-id"]]
                    }))
                }
            })


            let numAssets = accountAssets.assets.length
            let nextToken = accountAssets["next-token"]

            while (numAssets == 1000) {

                accountAssets = await indexerClient.lookupAccountAssets(this.props.activeAddress).nextToken(nextToken).do();

                accountAssets.assets.forEach((asset) => {
                    console.log(asset)
                    if (asset.amount == 1) {
                        this.setState(prevState => ({
                            accountAssets: [...prevState.accountAssets, asset["asset-id"]]
                        }))
                    }
                })

                numAssets = accountAssets.assets.length
                nextToken = accountAssets["next-token"]

            }

            let dcChars = await indexerClient.searchForAssets().unit("DCCHAR").do();
            console.log(dcChars)

            dcChars.assets.forEach((asset) => {
                console.log(asset)
                this.setState(prevState => ({
                    dcChars: [...prevState.dcChars, asset.index]
                }))
                
            })

            numAssets = accountAssets.assets.length
            nextToken = accountAssets["next-token"]

            while (numAssets == 1000) {

                let dcChars = await indexerClient.searchForAssets().unit("DCCHAR").do();
                console.log(dcChars)

                dcChars.assets.forEach((asset) => {
                    console.log(asset)
                    this.setState(prevState => ({
                        dcChars: [...prevState.dcChars, asset.index]
                    }))
                    
                })

                numAssets = accountAssets.assets.length
                nextToken = accountAssets["next-token"]

            }

          }

    }


      handleChange(event) {
        const target = event.target;
        let value = target.type === 'checkbox' ? target.checked : target.value;
        const name = target.name;

        this.setState({
            [name]: value
            });

        
    
        
      }

      


      
      

    render() {

        let ownedNfts = []

        for (var i = 0; i < this.state.accountAssets.length; i++) {
            if (this.state.dcChars.includes(this.state.accountAssets[i])) {
                ownedNfts.push(this.state.accountAssets[i])
            }
        }

        if (this.state.charSelect) {
            return (
                <div>
                    <DisplayChar activeAddress={this.props.activeAddress} contract={this.props.contract} nftId={this.state.charSelect} wallet={this.props.wallet} setNft={(nftId) => this.setState({charSelect: nftId})} zoom={true} />
                </div>
            )
        }

        else {
            return (
                <div>
                    <Grid container align="center">
                    {ownedNfts.length > 0 ? 
                    ownedNfts.map((nft, index) => {
                        console.log(nft)
                        return (
                            <Grid key={index} item xs={6} sm={4} md={3} lg={2} style={{position: "relative"}} >
                                <DisplayChar contract={this.state.contract} style={{position: "absolute"}} nftId={nft} activeAddress={this.props.activeAddress} wallet={this.props.wallet} setNft={(nftId) => this.setState({charSelect: nftId})}/>
                                
                            </Grid>
                        )
                    })
                    :
                    <Grid item sm={12}>
                        <Typography color="secondary" align="center" variant="h6"> Finding Characters... </Typography>
                    </Grid>
                    }
                    </Grid>
                </div>
            )
        }
    }
    
}