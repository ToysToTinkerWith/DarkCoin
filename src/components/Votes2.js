import React from "react"

import Head from "next/head"

import algosdk from "algosdk"

import { PieChart, Pie, LabelList, Tooltip, ResponsiveContainer, ScatterChart, XAxis, YAxis, ZAxis, Scatter } from 'recharts';


import { Grid, Card, Modal, Typography, Button } from "@mui/material"

import styles from "../index.module.css"

import muisty from "../muistyles.module.css"

export default class Votes1 extends React.Component { 

    constructor(props) {
        super(props);
        this.state = {
            measure: ""
        };
        
    }

    async componentDidMount() {

        let response = await fetch('/api/getAllVotes2', {
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
                    this.setState({[fKey]: value.split(",")})
                }
                
            }
            
        })


        while (numTrans == 1000) {
            
            response = await fetch('/api/getAllVotes2', {
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
                        this.setState({[fKey]: value.split(",")})
                    }
                    
                }
                
            })
            
        }
        

    
      }

      renderTooltip = (props) => {
        const { active, payload } = props;

        if (active && payload && payload.length) {
        const data = payload[0] && payload[0].payload;

        return (
            <div className={styles.votes} >
            {data.value}
            </div>
        );
        }

        return null;
    };


    render() {

       let values = Object.values(this.state)

       let parsedValues0 = []

       values.forEach((value) => {

        if (value[0] == "A" || value[0] == "B") {
            let found = false
            let foundIndex

            parsedValues0.forEach((pValue, index) => {
                
                if (value[0] == pValue.proposal0) {
                    found = true
                    foundIndex = index
                }
            })

            if (found) {
                parsedValues0[foundIndex].value0 += 1
            }
            else {
                parsedValues0.push({proposal0: value[0], value0: 1})
            }
        }

       })

       let parsedValues1 = []

       values.forEach((value) => {

        if (value[1] == "A" || value[1] == "B") {
            let found = false
            let foundIndex

            parsedValues1.forEach((pValue, index) => {
                
                if (value[1] == pValue.proposal0) {
                    found = true
                    foundIndex = index
                }
            })

            if (found) {
                parsedValues1[foundIndex].value0 += 1
            }
            else {
                parsedValues1.push({proposal0: value[1], value0: 1})
            }
        }

       })

        
       

        const RADIAN = Math.PI / 180;
        const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, proposal0 }) => {
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        return (
            <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
            {proposal0} = {`${(percent * 100).toFixed(2)}%`} 
            </text>
        );
        };

        
        
     

        return (
            <div className={styles.bottombody}>

                <br />

                <Button className={muisty.measurebtn} onClick={() => this.setState({measure: "4"})}>
                    <Typography className={muisty.measureh4} variant="h4"> Measure 4 </Typography>
                </Button>
                <br />

                <br />
                <Button className={muisty.measurebtn} onClick={() => this.setState({measure: "3"})}>
                    <Typography className={muisty.measureh4} variant="h4"> Measure 3 </Typography>
                </Button>
                <br />

                
               

                {this.state.measure == "3" ? 
                <Modal className={muisty.modal}
                open={true} 
                onClose={() => this.setState({measure: ""})}
                onClick={() => this.setState({measure: ""})}>
                    <Card className={muisty.card}>
                    <Typography className={muisty.measureth4} align="center" variant="h4">
                    Measure 3 <hr /> Puddin Mine
                </Typography>
                <Grid container align="center">
                        <Grid item xs={12} sm={12} md={6} >
                            
                      <Typography className={muisty.measurebody} variant="h6"> 
                      Option A
                      <hr />
                      Deposit Dark Coin to the puddin mine so puddin mine users can earn Dark Coin by mining (max deposit is 4,000,000 DC, rewards will last over a year per the devs).
                      <hr />
                      PROS: Exposure to more communities and users who theoretically may invest more if they are interested in the project.
                      <hr />
                      CONS: This theoretically could increase selling pressure and decrease buying pressure if puddin mine users are not buying in to Dark Coin and mining it just to sell it.  </Typography>
                  <br />
                        </Grid>
                        <Grid item xs={12} sm={12} md={6} >
                            <Typography className={muisty.measurebody} variant="h6"> 
                            Option B
                            <hr />
                            Do not deposit Dark Coin to the puddin mine.
                            <hr />
                            PROS: Theoretically would decrease selling pressure and increase buying pressure. 
                            <hr />
                            CONS: Dark Coin loses out on the added exposure. </Typography>
                        <br />
                        </Grid>
                      </Grid>

                      <ResponsiveContainer aspect={2} width="100%">
                            <PieChart >
                            <Pie
                                dataKey="value0"
                                
                                data={parsedValues0}
                                label={renderCustomizedLabel}
                                
                                fill="#000000"
                            />
                
                            </PieChart>
                        </ResponsiveContainer>

                     
                        <br/>
                    </Card>

                
                </Modal>
                
                    :
                    null
                }

            {this.state.measure == "4" ? 
                <Modal className={muisty.modal}
                open={true} 
                onClose={() => this.setState({measure: ""})}
                onClick={() => this.setState({measure: ""})}>
                    <Card className={muisty.card}>
                    <Typography className={muisty.measureth4} align="center" variant="h4">
                        Measure 4 <hr /> Source of funding for Puddin Mine
                      </Typography>

                      <Typography className={muisty.measurenoteh6} align="center" variant="h6">
                      (note that Measure 4 is dependent on the results of measure 3. If measure 3 Option B is passed, this measure loses practical relevance).
                      </Typography>


                      <Grid container align="center">
                        <Grid item xs={12} sm={12} md={6}>
                            
                      <Typography className={muisty.measurebody} variant="h6"> 
                      Option A
                      <hr />
                      Deposit Dark Coin to the puddin mine from the creator wallet reserves (max deposit is 4,000,000 for a years worth of reward payouts).
                      <hr />
                      PROS: This is the simplest way to source the funds, and with creator buy backs, 4,000,000 DC will be earned back by the creator wallet over time.
                      <hr />
                      CONS: Reduces the amount of Dark Coin immediately available in the creator wallet for adding liquidity and funding staking rewards.  </Typography>
                  <br />
                        </Grid>
                        <Grid item xs={12} sm={12} md={6}>
                            <Typography className={muisty.measurebody} variant="h6"> 
                            Option B
                            <hr />
                            Deposit half of the balance (2,000,000 Dark Coin) from the creator wallet reserves and accept up to 2,000,000 Dark Coin in community donations.
                            <hr />
                            PROS: More DC immediately available in the creator wallet for adding liquidity and funding staking rewards. Community has more control over the amount being deposited into the mine.
                            <hr />
                            CONS: Collecting donations is more complicated than just simply donating the entire amount from the creator wallet. </Typography>
                  
                        <br />
                        </Grid>
                      </Grid>
                      <br />

                      

                      <ResponsiveContainer aspect={2} width="100%">
                            <PieChart >
                            <Pie
                                dataKey="value0"
                                
                                data={parsedValues1}
                                label={renderCustomizedLabel}
                                
                                fill="#000000"
                            />
                
                            </PieChart>
                        </ResponsiveContainer>


                    </Card>
                
                </Modal>
                
                    :
                    null
                }
            </div>
        )
    }
    
}