import React from "react"

import algosdk from "algosdk"


import { Grid, Typography, Button } from "@mui/material"

export default class Council extends React.Component { 

    constructor(props) {
        super(props);
        this.state = {
            contract: 1025341912,
            daoBal: "",
            place: ""
            
        };
    }

    async componentDidMount() {

        let address = await algosdk.getApplicationAddress(this.state.contract)

        console.log(address)

        const token = {
            'X-API-Key': process.env.indexerKey
        }
      
        const indexerClient = new algosdk.Indexer(token, 'https://mainnet-algorand.api.purestake.io/idx2', '');
                
        let accountInfo = await indexerClient.lookupAccountAssets(address).do();

        accountInfo.assets.forEach(async (asset) => {
          if (asset["asset-id"] == 1088771340) {
            this.setState({
                daoBal: asset.amount
            })
          }
        })


    }

    render() {

        return (
            <div>
              
                  
            
            </div>
        )
    }
    
}