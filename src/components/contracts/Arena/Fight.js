import React from "react"

import MyAlgo from '@randlabs/myalgo-connect';

//43EVULWFT4RU2H7EZH377SAVQJSJO5NZP37N3Y5DZ7PGUXOETKW7VWDIOA

import { PeraWalletConnect } from "@perawallet/connect";

const peraWallet = new PeraWalletConnect();

import algosdk from "algosdk"

import { Grid, Typography, Button, TextField, Modal, Card} from "@mui/material"

import races from "./races"
import classes from "./classes"

import DisplayNft from "../../DisplayNft";

export default class Fight extends React.Component { 

    constructor(props) {
        super(props);
        this.state = {
            accountAssets: [],
            dcChars: []
        };
        this.handleChange = this.handleChange.bind(this)
        this.chooseCharacter = this.chooseCharacter.bind(this)
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

      async chooseCharacter(nftId) {

        


      }


      
      

    render() {

        console.log(this.state)

        let ownedNfts = []

        for(var i = 0; i < this.state.accountAssets.length; i++) {
            if (this.state.dcChars.includes(this.state.accountAssets[i])) {
                ownedNfts.push(this.state.accountAssets[i])
            }
        }

       console.log(ownedNfts)

        return (
            <div>
                <Typography color="secondary" align="center" variant="h6"> Choose Character: </Typography>
                <br />
                <Grid container align="center">
                {ownedNfts.length > 0 ? 
                ownedNfts.map((nft) => {
                    return (
                        <Grid item xs={12} sm={6} md={4} lg={2}>
                        <Button onClick={() => this.chooseCharacter(nft)}>
                        <DisplayNft nftId={nft} />
                        </Button>
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