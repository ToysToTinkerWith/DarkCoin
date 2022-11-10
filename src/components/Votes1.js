import React from "react"

import Head from "next/head"

import algosdk from "algosdk"

import { PieChart, Pie, LabelList, Tooltip, ResponsiveContainer, ScatterChart, XAxis, YAxis, ZAxis, Scatter } from 'recharts';


import { Grid, Card, Modal, Typography, Button } from "@mui/material"

export default class Votes1 extends React.Component { 

    constructor(props) {
        super(props);
        this.state = {
            measure: ""
        };
        
    }

    async componentDidMount() {

        let response = await fetch('/api/getAllVotes1', {
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
            
            response = await fetch('/api/getAllVotes1', {
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
            <div
            style={{
                backgroundColor: '#fff',
                border: '1px solid #999',
                margin: 0,
                padding: 10,
            }}
            >
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
            if (value[1] > 0 && value[1] < 1001) {
                parsedValues1.push({value: Number(value[1])})
            }
       })

       parsedValues1 = parsedValues1.sort((a,b) => a.value > b.value ? 1 : -1)

       let values1Median
       let median1
       let median2

       if (parsedValues1.length > 0) {
        if (parsedValues1.length % 2 == 0) {
            median1 = Math.floor((parsedValues1.length - 1) / 2)
            median2 = Math.ceil((parsedValues1.length - 1) / 2)
            values1Median = (parsedValues1[median1].value + parsedValues1[median2].value) / 2
    
        }
        else {
        values1Median = parsedValues1[Math.floor(parsedValues1.length / 2)].value
        }
       }

       

      

       let parsedValues2 = []

       values.forEach((value) => {
            if (value[2] > 0 && value[2] < 1001) {
                parsedValues2.push({value: Number(value[2])})
            }
       })

       parsedValues2 = parsedValues2.sort((a,b) => a.value > b.value ? 1 : -1)

       let values2Median

       if (parsedValues1.length > 0) {

        if (parsedValues2.length % 2 == 0) {
            median1 = Math.floor((parsedValues2.length - 1) / 2)
            median2 = Math.ceil((parsedValues2.length - 1) / 2)
            values2Median = (parsedValues2[median1].value + parsedValues2[median2].value) / 2
        }
        else {
        values2Median = parsedValues2[Math.floor(parsedValues2.length / 2)].value
        }

        }

        
       

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
            <div style={{padding: 40}}>

                <br />

                <Button onClick={() => this.setState({measure: "2"})} style={{textTransform: "none", display: "flex", margin: "auto", border: "1px solid white", borderRadius: 15}}>
                    <Typography variant="h4" style={{fontFamily: "jacques", color: "#FFFFFF", padding: 10}}> Measure 2 </Typography>
                </Button>
                <br />

                <br />
                <Button onClick={() => this.setState({measure: "1"})} style={{textTransform: "none", display: "flex", margin: "auto", border: "1px solid white", borderRadius: 15}}>
                    <Typography variant="h4" style={{fontFamily: "jacques", color: "#FFFFFF", padding: 10}}> Measure 1 </Typography>
                </Button>
                <br />

                
               

                {this.state.measure == "1" ? 
                <Modal 
                open={true} 
                onClose={() => this.setState({measure: ""})}
                onClick={() => this.setState({measure: ""})}
                style={{
                    overflowY: "auto",
                    overflowX: "hidden"
                }}>
                    <Card style={{backgroundColor: "#000000"}}>
                    <Typography align="center" variant="h4" style={{color: "#FFFFFF", fontFamily: "Jacques", padding: 30}}>
                    Measure 1 <hr /> LP Rewards
                    </Typography>
                        <br />
                    <Grid container >
                        <Grid item xs={12} sm={12} md={6}>
                            
                      <Typography align="center" variant="h6" style={{fontFamily: "Jacques", border: "1px solid white", borderRadius: 15, color: "#FFFFFF", margin: 20, padding: 20}}> 
                      Option A
                      <hr />
                      Move LP rewards from AlgoStake to AlgoFaucet.
                      <hr />
                      Proposal to move LP rewards 15% APY program from AlgoStake to AlgoFaucet.
                      <hr />
                      PROS: Reduces expenses to the development team, more out of pocket funds can be reallocated to liquidity & buybacks, LP token holders do not have to take any action to receive daily rewards.
                      <hr />
                      CONS: Potential loss of visibility generated from being on AlgoStake platform, adjusting payout amount based on price fluctuations won't take effect instantly. </Typography>
                    <br />
                        </Grid>
                        <Grid item xs={12} sm={12} md={6}>
                            <Typography variant="h6" align="center" style={{fontFamily: "Jacques", color: "#FFFFFF", border: "1px solid white", borderRadius: 15, margin: 20, padding: 20}}> 
                            Option B
                            <hr />
                            Keep LP rewards on AlgoStake platform.
                            <hr />
                            Proposal to continue using the AlgoStake platform the the LP rewards 15% APY program.
                            <hr />
                            PROS: Potential increase of visibility generated from being on AlgoStake platform, adjusting payout amount based on price fluctuations DO take effect instantly.
                            <hr />
                            CONS: Continued expenses to the development team, less out of pocket funds, LP token holders DO have to access the AlgoStake website daily to claim rewards (or pay for membership to auto-claim). </Typography>
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

                      <Typography variant="h4" align="center" style={{fontFamily: "jacques", color: "#FFFFFF", padding: 20}}> Result = A </Typography>
                        <br/>
                    </Card>

                
                </Modal>
                
                    :
                    null
                }

            {this.state.measure == "2" ? 
                <Modal 
                open={true} 
                onClose={() => this.setState({measure: ""})}
                onClick={() => this.setState({measure: ""})}
                style={{
                    overflowY: "auto",
                    overflowX: "hidden"
                }}>
                    <Card style={{backgroundColor: "#000000"}}>
                    <Typography align="center" variant="h4" style={{color: "#FFFFFF", fontFamily: "Jacques", padding: 30}}>
                        Measure 2 <hr /> DAO NFT Shuffle
                      </Typography>
                      <br />
                    <Grid container >
                        <Grid item xs={12} sm={12} md={6}>
                            
                      <Typography align="center" variant="h6" style={{fontFamily: "Jacques", border: "1px solid white", borderRadius: 15, color: "#FFFFFF", margin: 20, padding: 20}}> 
                      DAO NFT Release Amount
                      <hr />
                      How many DAO NFTs will be released in the next batch.
                      <hr />
                      Accepts values from 1 to 1000 DAO NFTs.
                      <hr />
                      HIGHER NUMBERS: More potential for new wallets to join the project and start making votes. Opens up the DAO to more users.
                      <hr />
                      LOWER NUMBERS: Constrain the process of obtaining a DAO NFT. Lets the current DAO holders more easily sell their NFTs at their own price.  </Typography>
                        <br />
                        </Grid>
                        <Grid item xs={12} sm={12} md={6}>
                            <Typography variant="h6" align="center" style={{fontFamily: "Jacques", color: "#FFFFFF", border: "1px solid white", borderRadius: 15, margin: 20, padding: 20}}> 
                            DAO NFT Release Price
                            <hr />
                            What will the released DAO NFTs be priced at.
                            <hr />
                            Accepts values from 1 to 1000 Algo.
                            <hr />
                            HIGHER NUMBERS: More value to be gained from the selling of the DAO NFTs. Harder for wallets to gain increased voting power from mass purchase of DAO NFTs.
                            <hr />
                            LOWER NUMBERS: Easier for wallets to get in on the voting process.   </Typography>
                            <br />
                        </Grid>
                      </Grid>

                      

                      <ResponsiveContainer width="100%" height={50}>
                        <ScatterChart

                        >
                            <XAxis
                                hide={true}
                                />
                            <YAxis
                                dataKey="value"
                                tick={false}
                                axisLine={false}
                                hide={true}
                            />
                            <Tooltip content={this.renderTooltip} />
                            <ZAxis name="value" type="number" dataKey="value" domain={[0, 0]} range={[0, 100]} />
                            <Scatter data={parsedValues1} fill="#FFFFFF" />
                        </ScatterChart>
                    </ResponsiveContainer>

                      <Typography variant="h6" align="center" style={{fontFamily: "jacques", color: "#FFFFFF", padding: 20}}> DAO NFT Release Amount </Typography>
                      <Typography variant="h6" align="center" style={{fontFamily: "jacques", color: "#FFFFFF", padding: 20}}> Median = {values1Median} </Typography>
                      <Typography variant="h6" align="center" style={{fontFamily: "jacques", color: "#FFFFFF", padding: 20}}> Result = 500 </Typography>

                      <ResponsiveContainer width="100%" height={50}>
                    <ScatterChart

                    >
                        <XAxis
                        hide={true}
                            />
                        <YAxis
                            dataKey="value"
                            tick={false}
                            axisLine={false}
                            hide={true}
                        />
                        <Tooltip content={this.renderTooltip} />
                        <ZAxis name="value" type="number" dataKey="value" domain={[0, 0]} range={[0, 100]} />
                        <Scatter data={parsedValues2} fill="#FFFFFF" />
                    </ScatterChart>
                </ResponsiveContainer>

                      
                      <Typography variant="h6" align="center" style={{fontFamily: "jacques", color: "#FFFFFF", padding: 20}}> DAO NFT Release Price </Typography>
                      <Typography variant="h6" align="center" style={{fontFamily: "jacques", color: "#FFFFFF", padding: 20}}> Median = {values2Median} </Typography>

                      <Typography variant="h6" align="center" style={{fontFamily: "jacques", color: "#FFFFFF", padding: 20}}> Result = 35 </Typography>

                    </Card>
                
                </Modal>
                
                    :
                    null
                }
            </div>
        )
    }
    
}