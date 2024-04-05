import React, { useState } from "react"

//43EVULWFT4RU2H7EZH377SAVQJSJO5NZP37N3Y5DZ7PGUXOETKW7VWDIOA

import { useWallet } from '@txnlab/use-wallet'

import algosdk from "algosdk"

import { Typography, Button, TextField} from "@mui/material"

export default function Propose(props) { 

  const { activeAccount, signTransactions, sendTransactions } = useWallet()

  const [ proposal, setProposal ] = useState("")
  const [ currRound, setCurrRound ] = useState(0)

  React.useEffect(() => {

    const fetchData = async () => {


      const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)
    
      let status = await client.status().do();

      setCurrRound(status["last-round"])

    }
    fetchData();
    
    

        

    }, [activeAccount])



  const handleChange = (event) => {

      
    const target = event.target;
    let value = target.type === 'checkbox' ? target.checked : target.value;
    const name = target.name;

    if (name == "proposal") {
      setProposal(value)
    }
    

  }

  

      const propose = async () => {

        if (proposal.length < 50) {
          props.setMessage("Proposal must be greater than 50 characters")
        }

        else if (proposal.length > 2000) {
          props.setMessage("Proposal must be less than 2000 characters")
        }

        else {

          try {

            const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)

            let params = await client.getTransactionParams().do();

            let ftxn = algosdk.makePaymentTxnWithSuggestedParams(
              activeAccount.address, 
              "ZATKR4UKC6II7CGXVV4GOSEQLMVY72DBSEY5X4MMKQRT5SOPN3JZA6RWPA", 
              20000000, 
              undefined,
              undefined,
              params
            );

            let txns = [ftxn]

            let encodedTxns= []

            txns.forEach((txn) => {
              let encoded = algosdk.encodeUnsignedTransaction(txn)
              encodedTxns.push(encoded)
      
            })

            props.setProgress(0)

            props.setMessage("Sign fee transaction...")

            let signedTransactions = await signTransactions(encodedTxns)

            props.setProgress(20)

            props.setMessage("Sending fee transaction...")

            let { id } = await sendTransactions(signedTransactions)

            let confirmedTxn = await algosdk.waitForConfirmation(client, id, 4);

            

            props.setMessage("Sanitizing proposal...")

            props.setProgress(30)

            const responseProposal = await fetch('/api/council/sanitizeProposal', {
              method: "POST",
              body: JSON.stringify({
                proposal: proposal
              }),
              headers: {
                "Content-Type": "application/json",
              }
                
            });
          
            const sessionProposal = await responseProposal.json()
    
            props.setMessage("Creating proposal slogan...")

            props.setProgress(40)

            const responseSlogan = await fetch('/api/council/getSlogan', {
              method: "POST",
              body: JSON.stringify({
                proposal: sessionProposal,
              }),
              headers: {
                "Content-Type": "application/json",
              }
                
            });
          
            const sessionSlogan = await responseSlogan.json()
    
            props.setMessage("Creating proposal contract...")

            props.setProgress(50)

           

           

            const response = await fetch('/api/council/createProposal', {
              method: "POST",
              body: JSON.stringify({
                activeAccount: activeAccount.address,
                contract: props.contracts.council,
                sessionSlogan: sessionSlogan,
                sessionProposal: sessionProposal
              }),
              headers: {
                "Content-Type": "application/json",
              }
                
            });
          
            const session = await response.json()
      

            updateDiscord(sessionProposal, sessionSlogan, session.appId)

            props.setMessage("Proposal Creation Complete")
            props.setProgress(100)


          }
          catch(error) {
            props.setMessage(String(error))
            props.setProgress(0)
            await props.sendDiscordMessage(error, "Propose", activeAccount.address)
           }
      }


    }

    const updateDiscord = async (proposal, slogan, appId) => {

      

      let embeds = []

      embeds.push({
          "title": "A new proposal has been made!",
          "color": 0
      })
      

      embeds.push({
          "title": slogan,
          "description": proposal,
          "url": "https://dark-coin.com/council/proposals/" + String(appId),
          "color": 16777215
      })


      const response = await fetch(process.env.discordCouncilWebhook, {
          method: "POST",
          body: JSON.stringify({
              username: "Council Propose",
              embeds: embeds
          }),
          headers: {
            "Content-Type": "application/json",
          },
        });



      
  }

        return (
            <div>
              <br />
              <Typography color="secondary" variant="h6" align="center"> Propose new feature(s) </Typography>
              <br />
                 
                <TextField                
                    onChange={handleChange}
                    value={proposal}
                    multiline
                    type="text"
                    label=""
                    name="proposal"
                    autoComplete="false"
                    InputProps={{ style: { color: "black" } }}
                   
                    style={{
                    color: "black",
                    background: "white",
                    borderRadius: 15,
                    display: "flex",
                    margin: "auto",
                    width: "80%"
                   
                    }}
                  />
                <br />
                <Typography align="center" color="secondary" variant="subtitle1"> Amending, Amendment Voting, Proposal Voting </Typography>
                <br />
                <Typography align="center" color="secondary" variant="subtitle1"> If no amendments skip to Proposal Voting </Typography>
                <br />
                <Typography align="center" color="secondary" variant="subtitle1"> Each phase 183,000 rounds (1 week)</Typography>
                <br />

                <Button variant="contained" color="secondary" style={{display: "flex", margin: "auto"}} onClick={() => propose()}>
                  <Typography  variant="h6"> Propose 20 </Typography>
                  <img src="/AlgoBlack.svg" style={{display: "flex", margin: "auto", width: 40, padding: 10}} />
                </Button>

    
                <br />

              

                
            </div>
        )
    
    
}
