import React from "react"

import Head from "next/head"

import algosdk from "algosdk"

import { BarChart, XAxis, YAxis, Bar, Tooltip, ResponsiveContainer} from "recharts"




import { Grid, Card, Modal, Typography, Button } from "@mui/material"

export default class DarkCoin extends React.Component { 

    constructor(props) {
        super(props);
        this.state = {
            holders: []
            
        };
        
    }

    componentDidMount() {
        const indexerClient = new algosdk.Indexer('', 'https://algoindexer.algoexplorerapi.io', '');
        (async () => {

            let assetIndex = 601894079


            let assetInfo = await indexerClient.lookupAssetBalances(assetIndex).currencyGreaterThan(1).do();
            this.setState({
                holders: assetInfo.balances
            })
          
      })().catch(e => {
          console.log(e);
          console.trace();
      });

    
      }

   

    render() {

        let sortedHolders = this.state.holders.sort((a, b) => (a.amount < b.amount) ? 1 : -1)
       
        return (
            <div style={{margin: 30}}>
                <Typography align="center" variant="h5" style={{fontFamily: "jacques", color: "#FFFFFF"}}> Holders </Typography>
                <ResponsiveContainer width="100%" height={300} >
                <BarChart data={sortedHolders}>
                <XAxis 
                stroke="#FFFFFF"
                />
                <YAxis 
                dataKey="amount" 
                hide="true"
       
                />
                <Tooltip />
                <Bar dataKey="address" fill="#000000"/>
                <Bar dataKey="amount" fill="#000000" stroke="#FFFFFF"/>
                </BarChart>
                </ResponsiveContainer>
            </div>
        )
    }
    
}