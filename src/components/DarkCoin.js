import React from "react"

import Head from "next/head"

import algosdk from "algosdk"

import { BarChart, XAxis, YAxis, Bar, Tooltip, ResponsiveContainer} from "recharts"




import { Grid, Card, Modal, Typography, Button } from "@mui/material"

import styles from "../index.module.css"

import muisty from "../muistyles.module.css"

export default class DarkCoin extends React.Component { 

    constructor(props) {
        super(props);
        this.state = {
            holders: []
            
        };
        
    }

    componentDidMount() {
        const token = {
            'X-API-Key': process.env.indexerKey
        }
    
        const indexerClient = new algosdk.Indexer(token, 'https://mainnet-algorand.api.purestake.io/idx2', '');
        
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

      renderTooltip = (props) => {
        const { active, payload } = props;

        if (active && payload && payload.length) {
        const data = payload[0] && payload[0].payload;
        return (
            <div className={styles.DarkCoinJS}>
            
            {(data.amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
            </div>
        );
        }

        return null;
    };

   

    render() {

        let sortedHolders = this.state.holders.sort((a, b) => (a.amount < b.amount) ? 1 : -1)
       
        return (
            <div className={styles.chart}>
                <Typography className={muisty.h5holders} align="center" variant="h5"> Dark Coin Holders </Typography>
                <ResponsiveContainer width="100%" height={115} >
                <BarChart data={sortedHolders}>
                <XAxis 
                hide={true}
                />
                <YAxis 
                dataKey="amount" 
                hide="true"
       
                />
                <Tooltip content={this.renderTooltip} />
                <Bar dataKey="address" fill="#000000"/>
                <Bar dataKey="amount" fill="#000000" stroke="#FFFFFF"/>
                </BarChart>
                </ResponsiveContainer>
                <Typography className={muisty.holder1} color="secondary"> 1 </Typography>
                <Typography className={muisty.holdermax} color="secondary"> {sortedHolders.length} </Typography>
            </div>
        )
    }
    
}