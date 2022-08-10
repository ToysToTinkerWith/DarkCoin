import React from "react"

import Head from "next/head"

import algosdk from "algosdk"

import { PieChart, Pie, LabelList, Tooltip, ResponsiveContainer } from 'recharts';


import { Grid, Card, Modal, Typography, Button } from "@mui/material"

export default class Votes extends React.Component { 

    constructor(props) {
        super(props);
        this.state = {

        };
        
    }

    async componentDidMount() {

        let response = await fetch('/api/getAllVotes', {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            }
            
              
          });
        
        let session = await response.json()

        let numTrans = session.transactions.length
        let nextToken = session["next-token"]

        session.transactions.forEach((trans) => {
            if (trans["local-state-delta"]) {
                let key = trans["local-state-delta"][0].delta[0].key
                const buffer = Buffer.from(key, 'base64');
                const bufString = buffer.toString('hex');
                let fKey = parseInt(bufString, 16)
                if (this.props.govNfts.includes(fKey)) {
                    let value = atob(trans["local-state-delta"][0].delta[0].value.bytes)
                    this.setState({[fKey]: value})
                }
                
            }
            
        })


        while (numTrans == 1000) {
            
            response = await fetch('/api/getAllVotes', {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    nextToken: nextToken
                  }),
                  
              });
            
            session = await response.json()

            console.log(session)
    
            numTrans = session.transactions.length
            nextToken = session["next-token"]
    
            session.transactions.forEach((trans) => {
                if (trans["local-state-delta"]) {
                    let key = trans["local-state-delta"][0].delta[0].key
                    const buffer = Buffer.from(key, 'base64');
                    const bufString = buffer.toString('hex');
                    let fKey = parseInt(bufString, 16)
                    if (this.props.govNfts.includes(fKey)) {
                        let value = atob(trans["local-state-delta"][0].delta[0].value.bytes)
                        this.setState({[fKey]: value})
                    }
                    
                }
                
            })
            
        }
        

    
      }

   

    render() {

       let values = Object.values(this.state)

       let parsedValues = []

       values.forEach((value) => {

        let found = false
        let foundIndex

        parsedValues.forEach((pValue, index) => {
            
            if (value == pValue.proposal) {
                found = true
                foundIndex = index
            }
        })

        if (found) {
            parsedValues[foundIndex].value += 1
        }
        else {
            parsedValues.push({proposal: value, value: 1})
        }
        
       
        
       })

        const RADIAN = Math.PI / 180;
        const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, proposal }) => {
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        return (
            <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
            {proposal} = {`${(percent * 100).toFixed(2)}%`} 
            </text>
        );
        };
     

        return (
            <div style={{margin: 30}}>
                <Typography align="center" variant="h5" style={{fontFamily: "jacques", color: "#FFFFFF"}}> Governance </Typography>
                <ResponsiveContainer aspect={2} width="100%">
                        <PieChart >
                        <Pie
                            dataKey="value"
                            
                            data={parsedValues}
                            label={renderCustomizedLabel}
                            
                            fill="#000000"
                        />
            
                        </PieChart>
                        </ResponsiveContainer>
            </div>
        )
    }
    
}