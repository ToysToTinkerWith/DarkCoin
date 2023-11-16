import React, { useState } from "react"

import algosdk from "algosdk"

import { Typography, Button, Grid } from "@mui/material"

import { useWallet } from '@txnlab/use-wallet'



export default function Proposals(props) {

  const { activeAccount, signTransactions, sendTransactions } = useWallet()

  const [ contract, setContract ] = useState(1025341912)

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
  
          console.log(session)

          setProposals([])

          session.boxes.forEach((box) => {
            let temp = ""
            console.log(box)
            Object.values(box.name).forEach((int) => {
              console.log(int)
              let char = String.fromCharCode(int)
              temp += char
            })
            setProposals(proposals => [...proposals, temp])
          })

        

  
        
  
          }
          fetchData();

      }, [])

      const getProposal = async (boxName) => {
        
        const token = {
          'X-API-Key': process.env.indexerKey
        }

        const client = new algosdk.Algodv2(token, 'https://mainnet-algorand.api.purestake.io/ps2', '')

      
        let responseProposal = await client.getApplicationBoxByName(props.contracts.council, boxName).do();
        console.log(responseProposal)
        let string = new TextDecoder().decode(responseProposal.value)
        console.log(string)

        window.location.href = "/council/proposals/" + string
          
        
        
      }

      let parsedProposals = []

      proposals.forEach((proposal) => {
        let split = proposal.split(" ")
        let proposalNum = Number(split[0].substring(8, split[0].length))
        console.log(proposalNum)
        let slogan = proposal.substring(split[0].length + 1)
        console.log(slogan)
        parsedProposals.push({box: proposal, proposalNum: proposalNum, slogan: slogan})
      })

      parsedProposals = parsedProposals.sort((a,b) => b.proposalNum - a.proposalNum)

      
console.log(proposals)

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