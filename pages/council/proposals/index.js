import React, { useState } from "react"

import algosdk from "algosdk"

import { Typography, Button, Grid } from "@mui/material"

import { useWallet } from '@txnlab/use-wallet'



export default function Proposals(props) {

  const { activeAccount, signTransactions, sendTransactions } = useWallet()

  const [ proposals, setProposals ] = useState([])
  

    React.useEffect(() => {

      const fetchData = async () => {

        

          const response = await fetch('/api/council/getBoxes', {
            method: "POST",
            body: JSON.stringify({
              contract: props.contracts.council
            }),
            headers: {
              "Content-Type": "application/json",
            }
              
          });
        
          const session = await response.json()
  
          setProposals([])

          session.boxes.forEach((box) => {
            let temp = ""
            Object.values(box.name).forEach((int) => {
              let char = String.fromCharCode(int)
              temp += char
            })
            setProposals(proposals => [...proposals, temp])
          })

        

  
        
  
          }
          fetchData();

      }, [])

      const getProposal = async (boxName) => {
        
 

        const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)

      
        let responseProposal = await client.getApplicationBoxByName(props.contracts.council, boxName).do();
        let string = new TextDecoder().decode(responseProposal.value)

        window.location.href = "/council/proposals/" + string
        
      }

      let parsedProposals = []

      proposals.forEach((proposal) => {
        let split = proposal.split(" ")
        let proposalNum = Number(split[0].substring(8, split[0].length))
        let slogan = proposal.substring(split[0].length + 1)
        parsedProposals.push({box: proposal, proposalNum: proposalNum, slogan: slogan})
      })

      parsedProposals = parsedProposals.sort((a,b) => b.proposalNum - a.proposalNum)

      
        return (
            <div>
              <Grid container>
                {parsedProposals.map((proposal, index) => {
                  return(
                    <Grid item key={index} xs={12} sm={6} md={4} style={{padding: 20}}>
                      <Button style={{border: "1px solid white", borderRadius: 15, width: "100%", height: "100%", display: "grid", padding: 20}} onClick={() => getProposal(proposal.box)}>
                      <Typography variant="h6" style={{color: "white"}}>
                          Proposal {proposal.proposalNum}
                        </Typography>
                        <br />
                        <Typography variant="h6" style={{color: "white"}}>
                          {proposal.slogan}
                        </Typography>
                      </Button>
                    </Grid>
                  )
                })}
              </Grid>
              
                
              
            </div>
        )
    
    
}

