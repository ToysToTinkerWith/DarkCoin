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

      const token = {
        'X-API-Key': process.env.indexerKey
      }

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

  const compileProgram = async (client, programSource) => {
    let encoder = new TextEncoder();
    let programBytes = encoder.encode(programSource);
    let compileResponse = await client.compile(programBytes).do();
    let compiledBytes = new Uint8Array(Buffer.from(compileResponse.result, "base64"));
    // console.log(compileResponse)
    return compiledBytes;
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

            const token = {
              'X-API-Key': process.env.indexerKey
            }

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

            props.setMessage("Sign fee transation...")

            let signedTransactions = await signTransactions(encodedTxns)

            props.setProgress(20)

            props.setMessage("Sending fee transation...")

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
    
            console.log(sessionProposal)

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
    
            console.log(sessionSlogan)

            props.setMessage("Creating proposal contract...")

            props.setProgress(50)

            let approval_program = `
            #pragma version 8
            txn ApplicationID
            int 0
            ==
            bnz main_l48
            txn OnCompletion
            int OptIn
            ==
            bnz main_l47
            txn OnCompletion
            int CloseOut
            ==
            bnz main_l46
            txn OnCompletion
            int UpdateApplication
            ==
            bnz main_l45
            txn OnCompletion
            int DeleteApplication
            ==
            bnz main_l44
            txna ApplicationArgs 0
            byte "optin"
            ==
            bnz main_l40
            txna ApplicationArgs 0
            byte "amend"
            ==
            bnz main_l39
            txna ApplicationArgs 0
            byte "propose"
            ==
            bnz main_l38
            txna ApplicationArgs 0
            byte "voteProp"
            ==
            bnz main_l29
            txna ApplicationArgs 0
            byte "voteAmend"
            ==
            bnz main_l23
            txna ApplicationArgs 0
            byte "draft"
            ==
            bnz main_l16
            txna ApplicationArgs 0
            byte "rewardAlgo"
            ==
            bnz main_l15
            txna ApplicationArgs 0
            byte "rewardAsset"
            ==
            bnz main_l14
            err
            main_l14:
            txn Sender
            addr AL6F3TFPSZPF3BSVUFDNOLMEKUCJJAA7GZ5GF3DN3Q4IVJVNUFK76PQFNE
            ==
            assert
            itxn_begin
            int axfer
            itxn_field TypeEnum
            txna Assets 0
            itxn_field XferAsset
            txna Accounts 1
            itxn_field AssetReceiver
            txna ApplicationArgs 1
            btoi
            itxn_field AssetAmount
            itxn_submit
            int 1
            return
            main_l15:
            txn Sender
            addr AL6F3TFPSZPF3BSVUFDNOLMEKUCJJAA7GZ5GF3DN3Q4IVJVNUFK76PQFNE
            ==
            assert
            itxn_begin
            int pay
            itxn_field TypeEnum
            txna Accounts 1
            itxn_field Receiver
            txna ApplicationArgs 1
            btoi
            itxn_field Amount
            itxn_submit
            int 1
            return
            main_l16:
            byte "Amend0"
            box_get
            store 16
            store 15
            load 16
            bnz main_l22
            txn FirstValid
            byte "round"
            app_global_get
            int 366000
            +
            >=
            assert
            main_l18:
            txn Sender
            addr YRVK422KP65SU4TBAHY34R7YT3OYFOL4DUSFR4UADQEQHS2HMXKORIC6TE
            ==
            assert
            txna ApplicationArgs 1
            byte "accept"
            ==
            bnz main_l21
            byte "round"
            txn FirstValid
            app_global_put
            main_l20:
            int 1
            return
            main_l21:
            byte "Draft"
            txna ApplicationArgs 1
            box_put
            b main_l20
            main_l22:
            txn FirstValid
            byte "round"
            app_global_get
            int 549000
            +
            >=
            assert
            b main_l18
            main_l23:
            txn FirstValid
            byte "round"
            app_global_get
            int 366000
            +
            <=
            assert
            txn FirstValid
            byte "round"
            app_global_get
            int 183000
            +
            >=
            assert
            int 0
            store 0
            main_l24:
            load 0
            txn NumAssets
            <
            bnz main_l26
            int 1
            return
            main_l26:
            txn Sender
            load 0
            txnas Assets
            asset_holding_get AssetBalance
            store 10
            store 9
            load 9
            int 1
            ==
            assert
            load 0
            txnas Assets
            asset_params_get AssetCreator
            store 12
            store 11
            load 11
            addr AL6F3TFPSZPF3BSVUFDNOLMEKUCJJAA7GZ5GF3DN3Q4IVJVNUFK76PQFNE
            ==
            assert
            load 0
            txnas Assets
            asset_params_get AssetUnitName
            store 14
            store 13
            load 13
            extract 0 4
            byte "DCGV"
            ==
            assert
            byte "Votes"
            txna ApplicationArgs 1
            concat
            load 13
            int 4
            load 13
            len
            substring3
            callsub atoi_2
            int 1
            box_extract
            btoi
            int 0
            ==
            bnz main_l28
            main_l27:
            byte "Votes"
            txna ApplicationArgs 1
            concat
            load 13
            int 4
            load 13
            len
            substring3
            callsub atoi_2
            txna ApplicationArgs 2
            box_replace
            load 0
            int 1
            +
            store 0
            b main_l24
            main_l28:
            itxn_begin
            int pay
            itxn_field TypeEnum
            txn Sender
            itxn_field Receiver
            int 10000000
            int 2000
            /
            itxn_field Amount
            itxn_submit
            b main_l27
            main_l29:
            byte "Amend0"
            box_get
            store 2
            store 1
            load 2
            bnz main_l37
            txn FirstValid
            byte "round"
            app_global_get
            int 366000
            +
            <=
            assert
            txn FirstValid
            byte "round"
            app_global_get
            int 183000
            +
            >=
            assert
            main_l31:
            int 0
            store 0
            main_l32:
            load 0
            txn NumAssets
            <
            bnz main_l34
            int 1
            return
            main_l34:
            txn Sender
            load 0
            txnas Assets
            asset_holding_get AssetBalance
            store 4
            store 3
            load 3
            int 1
            ==
            assert
            load 0
            txnas Assets
            asset_params_get AssetCreator
            store 6
            store 5
            load 5
            addr AL6F3TFPSZPF3BSVUFDNOLMEKUCJJAA7GZ5GF3DN3Q4IVJVNUFK76PQFNE
            ==
            assert
            load 0
            txnas Assets
            asset_params_get AssetUnitName
            store 8
            store 7
            load 7
            extract 0 4
            byte "DCGV"
            ==
            assert
            byte "Votes"
            load 7
            int 4
            load 7
            len
            substring3
            callsub atoi_2
            int 1
            box_extract
            btoi
            int 0
            ==
            bnz main_l36
            main_l35:
            byte "Votes"
            load 7
            int 4
            load 7
            len
            substring3
            callsub atoi_2
            txna ApplicationArgs 1
            box_replace
            load 0
            int 1
            +
            store 0
            b main_l32
            main_l36:
            itxn_begin
            int pay
            itxn_field TypeEnum
            txn Sender
            itxn_field Receiver
            int 20000000
            int 2000
            /
            itxn_field Amount
            itxn_submit
            b main_l35
            main_l37:
            txn FirstValid
            byte "round"
            app_global_get
            int 549000
            +
            <=
            assert
            txn FirstValid
            byte "round"
            app_global_get
            int 366000
            +
            >=
            assert
            b main_l31
            main_l38:
            txn Sender
            addr YRVK422KP65SU4TBAHY34R7YT3OYFOL4DUSFR4UADQEQHS2HMXKORIC6TE
            ==
            assert
            txna ApplicationArgs 1
            len
            int 50
            >=
            assert
            txna ApplicationArgs 1
            len
            int 2000
            <=
            assert
            byte "Proposal"
            txna ApplicationArgs 1
            box_put
            byte "Votes"
            int 2000
            box_create
            assert
            int 1
            return
            main_l39:
            txn FirstValid
            byte "round"
            app_global_get
            int 183000
            +
            <=
            assert
            txn Sender
            addr YRVK422KP65SU4TBAHY34R7YT3OYFOL4DUSFR4UADQEQHS2HMXKORIC6TE
            ==
            assert
            txna ApplicationArgs 1
            len
            int 25
            >=
            assert
            txna ApplicationArgs 1
            len
            int 1000
            <=
            assert
            byte "Amend"
            byte "amendNum"
            app_global_get
            callsub itoa_3
            concat
            txna ApplicationArgs 1
            box_put
            byte "Votes"
            byte "amendNum"
            app_global_get
            callsub itoa_3
            concat
            int 2000
            box_create
            assert
            byte "amendNum"
            byte "amendNum"
            app_global_get
            int 1
            +
            app_global_put
            int 1
            return
            main_l40:
            int 0
            store 0
            main_l41:
            load 0
            txn NumAssets
            <
            bnz main_l43
            int 1
            return
            main_l43:
            itxn_begin
            int axfer
            itxn_field TypeEnum
            load 0
            txnas Assets
            itxn_field XferAsset
            global CurrentApplicationAddress
            itxn_field AssetReceiver
            int 0
            itxn_field AssetAmount
            itxn_submit
            load 0
            int 1
            +
            store 0
            b main_l41
            main_l44:
            txn Sender
            global CreatorAddress
            ==
            return
            main_l45:
            txn Sender
            global CreatorAddress
            ==
            return
            main_l46:
            int 1
            return
            main_l47:
            int 1
            return
            main_l48:
            txn Sender
            addr YRVK422KP65SU4TBAHY34R7YT3OYFOL4DUSFR4UADQEQHS2HMXKORIC6TE
            ==
            assert
            byte "amendNum"
            int 0
            app_global_put
            byte "round"
            txn FirstValid
            app_global_put
            int 1
            return

            // ascii_to_int
            asciitoint_0:
            store 18
            load 18
            int 48
            >=
            assert
            load 18
            int 57
            <=
            assert
            load 18
            int 48
            -
            retsub

            // pow10
            pow10_1:
            store 19
            int 10
            load 19
            exp
            retsub

            // atoi
            atoi_2:
            store 17
            load 17
            len
            int 0
            >
            bnz atoi_2_l2
            int 0
            b atoi_2_l3
            atoi_2_l2:
            load 17
            int 0
            getbyte
            callsub asciitoint_0
            load 17
            len
            int 1
            -
            callsub pow10_1
            *
            load 17
            int 1
            load 17
            len
            substring3
            load 17
            swap
            callsub atoi_2
            swap
            store 17
            +
            atoi_2_l3:
            retsub

            // itoa
            itoa_3:
            store 20
            load 20
            int 0
            ==
            bnz itoa_3_l5
            load 20
            int 10
            /
            int 0
            >
            bnz itoa_3_l4
            byte ""
            itoa_3_l3:
            load 20
            int 10
            %
            callsub inttoascii_4
            concat
            b itoa_3_l6
            itoa_3_l4:
            load 20
            int 10
            /
            load 20
            swap
            callsub itoa_3
            swap
            store 20
            b itoa_3_l3
            itoa_3_l5:
            byte "0"
            itoa_3_l6:
            retsub

            // int_to_ascii
            inttoascii_4:
            store 21
            byte "0123456789"
            load 21
            int 1
            extract3
            retsub
            `

            let clear_state_program = `
            #pragma version 8
            int 1
            return
            `

            const approval_program_comp = await compileProgram(client, approval_program)
            const clear_program_comp = await compileProgram(client, clear_state_program )

            const onComplete = algosdk.OnApplicationComplete.NoOpOC;

            let localInts = 0
            let localBytes = 0
            let globalInts = 2
            let globalBytes = 0

            let app_args = []
          
            let ctxn = algosdk.makeApplicationCreateTxn("YRVK422KP65SU4TBAHY34R7YT3OYFOL4DUSFR4UADQEQHS2HMXKORIC6TE", params, onComplete, 
              approval_program_comp, clear_program_comp, 
              localInts, localBytes, globalInts, globalBytes, app_args);

            let txId = ctxn.txID().toString();
            // Sign the transaction

            const houseMnemonic = process.env.DCwallet
            const houseAccount =  algosdk.mnemonicToSecretKey(houseMnemonic)

            let signedTxn = ctxn.signTxn(houseAccount.sk);
            
            // Submit the transaction
            await client.sendRawTransaction(signedTxn).do()                           
            // Wait for transaction to be confirmed
            confirmedTxn = await algosdk.waitForConfirmation(client, txId, 4);
            
            let transactionResponse = await client.pendingTransactionInformation(txId).do()
            let appId = transactionResponse['application-index'];

            console.log("Created new app-id: ", appId);

            let address = await algosdk.getApplicationAddress(appId)

            props.setMessage("Indexing proposal...")

            props.setProgress(60)


            let appArgs = []
            appArgs.push(
              new Uint8Array(Buffer.from("propose")),
              new Uint8Array(Buffer.from(sessionSlogan))
              
            )

            let accounts = [address]
            let foreignApps = [appId]
              
            let foreignAssets = []

            //get global state

            const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)

              let global = await indexerClient.lookupApplications(props.contracts.council).do();

              let globalState = global.application.params["global-state"]

              let proposalNum

              globalState.forEach((keyVal) => {
                if (atob(keyVal.key) == "proposalNum") {
                  proposalNum = keyVal.value.uint
                }
              })

              console.log(proposalNum)

            let proposalNumBox = new Uint8Array(Buffer.from("Proposal" + String(proposalNum) + " " + String(sessionSlogan)))

            let boxes = [{appIndex: 0, name: proposalNumBox}]
            
            let itxn = algosdk.makeApplicationNoOpTxn("YRVK422KP65SU4TBAHY34R7YT3OYFOL4DUSFR4UADQEQHS2HMXKORIC6TE", params, props.contracts.council, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
            
            signedTxn = itxn.signTxn(houseAccount.sk);
          
            // Submit the transaction
            await client.sendRawTransaction(signedTxn).do()                           
            // Wait for transaction to be confirmed
            confirmedTxn = await algosdk.waitForConfirmation(client, txId, 4);

            props.setMessage("Writing Proposal...")

            props.setProgress(80)


            appArgs = []
            appArgs.push(
              new Uint8Array(Buffer.from("propose")),
              new Uint8Array(Buffer.from(sessionProposal)),
            )

            accounts = []
            foreignApps = []
              
            foreignAssets = []

            let proposalBox = new Uint8Array(Buffer.from("Proposal"))
            let votesBox = new Uint8Array(Buffer.from("Votes"))

            boxes = [{appIndex: 0, name: proposalBox}, {appIndex: 0, name: proposalBox}, {appIndex: 0, name: votesBox}, {appIndex: 0, name: votesBox}]
            
            let wtxn = algosdk.makeApplicationNoOpTxn("YRVK422KP65SU4TBAHY34R7YT3OYFOL4DUSFR4UADQEQHS2HMXKORIC6TE", params, appId, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
            
            signedTxn = wtxn.signTxn(houseAccount.sk);
          
            // Submit the transaction
            await client.sendRawTransaction(signedTxn).do()                           
            // Wait for transaction to be confirmed
            confirmedTxn = await algosdk.waitForConfirmation(client, txId, 4);
          
          

            updateDiscord(sessionProposal, sessionSlogan, appId)

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