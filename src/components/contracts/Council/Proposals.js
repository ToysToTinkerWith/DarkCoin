import React from "react"

import MyAlgo from '@randlabs/myalgo-connect';

//43EVULWFT4RU2H7EZH377SAVQJSJO5NZP37N3Y5DZ7PGUXOETKW7VWDIOA

import { PeraWalletConnect } from "@perawallet/connect";

const peraWallet = new PeraWalletConnect();

import algosdk from "algosdk"

import { Typography, Button, TextField, Slider } from "@mui/material"

import { PieChart, Pie, Tooltip, ResponsiveContainer, ScatterChart, XAxis, YAxis, ZAxis, Scatter } from 'recharts';

export default class Proposals extends React.Component { 

    constructor(props) {
        super(props);
        this.state = {
            walletAssets: [],
            daoNFTs: [],
            proposals: [],
            applications: [],
            contracts: [],
            currRound: null,
            loading: "",
            confirm: "",
            message: ""
            
        };
        this.handleChange = this.handleChange.bind(this)
        this.renderTooltip = this.renderTooltip.bind(this)
        this.apply = this.apply.bind(this)
        this.vote = this.vote.bind(this)
        this.voteSat = this.voteSat.bind(this)
        this.satisfy = this.satisfy.bind(this)
        

    }

    async componentDidMount() {
        
        peraWallet.reconnectSession()
        .catch((error) => {
          // You MUST handle the reject because once the user closes the modal, peraWallet.connect() promise will be rejected.
          // For the async/await syntax you MUST use try/catch
          if (error?.data?.type !== "CONNECT_MODAL_CLOSED") {
              // log the necessary errors
              console.log(error)
          }
          });

          const indexerClient = new algosdk.Indexer('', 'https://algoindexer.algoexplorerapi.io', '');

          (async () => {

            this.setState({
              loading: "Loading DAO assets..."
            })
            

            if (this.props.activeAddress) {

              let assetsDC = await indexerClient.lookupAccountCreatedAssets("AL6F3TFPSZPF3BSVUFDNOLMEKUCJJAA7GZ5GF3DN3Q4IVJVNUFK76PQFNE")
            .limit(1000).do();
  
            assetsDC.assets.forEach(async (asset) => {
              if(asset.params["unit-name"].substring(0, 4) == "DCGV") {
                this.setState(prevState => ({
                  daoNFTs: [...prevState.daoNFTs, asset.index]
                }))
              }
              
            })
  
            let assetsLen = assetsDC.assets.length
            let assetsNext = assetsDC["next-token"]
  
            while (assetsLen == 1000) {
  
                assetsDC = await indexerClient.lookupAccountCreatedAssets("AL6F3TFPSZPF3BSVUFDNOLMEKUCJJAA7GZ5GF3DN3Q4IVJVNUFK76PQFNE").nextToken(assetsNext)
                .limit(1000).do();
  
              assetsDC.assets.forEach(async (asset) => {
                if(asset.params["unit-name"].substring(0, 4) == "DCGV") {
                    this.setState(prevState => ({
                      daoNFTs: [...prevState.daoNFTs, asset.index]
                    }))
                  }
                
              })
  
              assetsLen = assetsDC.assets.length
              assetsNext = assetsDC["next-token"]
  
            }

              let assetsWallet = await indexerClient.lookupAccountAssets(this.props.activeAddress)
              .limit(1000).do();

    
              assetsWallet.assets.forEach(async (asset) => {
                if(this.state.daoNFTs.includes(asset["asset-id"]) && asset.amount == 1) {
                  this.setState(prevState => ({
                    walletAssets: [...prevState.walletAssets, asset["asset-id"]]
                  }))
                }
                
              })
    
              assetsLen = assetsWallet.assets.length
              assetsNext = assetsWallet["next-token"]
    
              while (assetsLen == 1000) {
    
                assetsWallet = await indexerClient.lookupAccountAssets(this.props.activeAddress).nextToken(assetsNext)
                  .limit(1000).do();
    
                  assetsWallet.assets.forEach(async (asset) => {
                  if(this.state.daoNFTs.includes(asset["asset-id"])) {
                      this.setState(prevState => ({
                        walletAssets: [...prevState.walletAssets, asset["asset-id"]]
                      }))
                    }
                  
                })
    
                assetsLen = assetsWallet.assets.length
                assetsNext = assetsWallet["next-token"]


              }

            }

            const client = new algosdk.Algodv2("", "https://node.algoexplorerapi.io/", "")

            let status = await client.status().do();

            this.setState({
              currRound: status["last-round"],
              loading: "Fetching active proposals..."
            })

           
            let global = await indexerClient.lookupApplications(this.props.contract).do();

            let globalState = global.application.params["global-state"]

            let proposals = []
            let contracts = []

            globalState.forEach((keyVal) => {

              if (atob(keyVal.key) !== "proposalNum" && atob(keyVal.key) !== "Address" && atob(keyVal.key) !== "5A" && atob(keyVal.key) !== "Reject7" && atob(keyVal.key).length < 58) {
                proposals.push({key: atob(keyVal.key), value: keyVal.value.uint})
              }
              else if (atob(keyVal.key).length > 58) {
                contracts.push({address: atob(keyVal.key).substring(0, 58), appNum: atob(keyVal.key).substring(58, 59), proposalNum: atob(keyVal.key).substring(59)})
              }
              
            })

            this.setState({
              contracts: contracts
            })

            let applications = []

            const boxesResponse = await client.getApplicationBoxes(this.props.contract).do();
            boxesResponse.boxes.forEach((box) => {
              let boxName = new TextDecoder().decode(box.name)
              if (boxName[0] >= '0' && boxName[0] <= '9') {

                let costNum = Number(boxName[0])
                let cost = Number(boxName.substring(1, costNum + 1))
                let app = boxName[costNum + 1]
                let proposalCount = Number(boxName[costNum + 2])
                let proposalNum = Number(boxName.substring(costNum + 3, costNum + 3 + proposalCount))
                let round = Number(boxName.substring(costNum + 3 + proposalCount))
                applications.push({boxName: boxName, cost: cost, appNum: app, proposalNum: proposalNum, endRound: round})
              }
              
            })



            proposals.forEach(async (proposal) => {
              let responseProposal = await client.getApplicationBoxByName(this.props.contract, "Proposal" + proposal.key).do();
              let string = new TextDecoder().decode(responseProposal.value)
              let responseVotes = await client.getApplicationBoxByName(this.props.contract, "Votes" + proposal.key).do();
              let parsedVotes = []
              let numVotes = 0
              responseVotes.value.forEach((vote) => {
                let found = false
                let foundIndex
                if (vote != 0) {
                  numVotes++
                  if (vote == 64) {
                    parsedVotes.forEach((voted, index) => {
                      if (voted.vote == "Reject") {
                        found = true
                        foundIndex = index
                      }
                    })
                    if (found) {
                      parsedVotes[foundIndex].count = parsedVotes[foundIndex].count + 1
                    }
                    else {
                      parsedVotes.push({vote: "Reject", count: 1})
                    }
                  }
                  else {
                    parsedVotes.forEach((voted, index) => {
                      if (voted.vote == String.fromCharCode(vote)) {
                        found = true
                        foundIndex = index
                      }
                    })
                    if (found) {
                      parsedVotes[foundIndex].count = parsedVotes[foundIndex].count + 1
                    }
                    else {
                      parsedVotes.push({vote: String.fromCharCode(vote), count: 1})

                    }
                  }
                }
              })

              applications.forEach(async (app) => {
                if (app.proposalNum == proposal.key) {
                  let application = await client.getApplicationBoxByName(this.props.contract, app.boxName).do();
                  let appString = new TextDecoder().decode(application.value)
                  let appProposer = appString.substring(0, 58)
                  app.proposer = appProposer
                  let appText = appString.substring(58)
                  app.application = appText
                  this.setState(prevState => ({
                    applications: [...prevState.applications, app]
                  }))
                }
              })

              let proposalContracts = []
              let sat = []

              contracts.forEach(async (contract) => {
                if (contract.proposalNum == proposal.key) {
                  proposalContracts.push(contract)
                  let satisfaction = await client.getApplicationBoxByName(this.props.contract, "Sat" + contract.proposalNum).do();
                  satisfaction.value.forEach((vote) => {
                    if (vote != 0) {
                        sat.push({value: vote})
                    }
                  })
                  

                }
              })

              this.setState(prevState => ({
                proposals: [...prevState.proposals, {proposalNum: proposal.key, proposal: string, votes: parsedVotes, numVotes: numVotes, contracts: proposalContracts, sat: sat, endRound: proposal.value}]
              }))
            })

            this.setState({
              loading: ""
            })
              
              

  
          })().catch(e => {
              console.error(e);
              console.trace();
          })


    }

      handleChange(event) {
        const target = event.target;
        let value
        let name
        if (event.target) {
          value = target.type === 'checkbox' ? target.checked : target.value;
          name = target.name;
          if (value < 0) {
            value = 0
          }
          this.setState({
            [name]: value
        
            });
        }
        else {
          value = new Date(event)
          this.setState({
            date: value
        
            });
        }
        
        
      }


      async apply(proposalNum) {

        const client = new algosdk.Algodv2("", "https://node.algoexplorerapi.io/", "")

        let proposal = await client.getApplicationBoxByName(this.props.contract, "Proposal" + String(proposalNum)).do();

        let proposalValue = new TextDecoder().decode(proposal.value)

        let proposalAddress = proposalValue.substring(0, 58)

        let appBoxes = []

        this.state.applications.forEach((app) => {
          if (app.proposalNum == proposalNum) {
            appBoxes.push(app)
          }
        })

        let params = await client.getTransactionParams().do();

        let ftxn1 = algosdk.makePaymentTxnWithSuggestedParams(
          this.props.activeAddress, 
          "5W64M4ZT4ERRI4AW77HMSO63YHYZVJTRGM6WC7RQIM3YJOLOPYPTXHMU6I", 
          500000, 
          undefined,
          undefined,
          params
        );

        let ftxn2 = algosdk.makeAssetTransferTxnWithSuggestedParams(
          this.props.activeAddress, 
          proposalAddress, 
          undefined,
          undefined,
          String(this.state[proposalNum]).length * 50, 
          undefined,
          601894079,
          params
        );

        const appArgs = []
          appArgs.push(
            new Uint8Array(Buffer.from("apply")),
            new Uint8Array(Buffer.from(this.props.activeAddress + this.state[proposalNum])),
            new Uint8Array(Buffer.from(String(this.state["cost" + proposalNum]).length + String(this.state["cost" + proposalNum]) + String.fromCharCode(65 + appBoxes.length) + String(proposalNum).length + String(proposalNum) + String(this.state["round" + proposalNum])))
          )


          const accounts = [this.props.activeAddress]
          const foreignApps = []
            
          const foreignAssets = []

          let applyBox = new Uint8Array(Buffer.from(String(this.state["cost" + proposalNum]).length + String(this.state["cost" + proposalNum]) + String.fromCharCode(65 + appBoxes.length) + String(proposalNum).length + String(proposalNum) + String(this.state["round" + proposalNum])))

          const boxes = [{appIndex: 0, name: applyBox}, {appIndex: 0, name: applyBox}]
          
          let atxn = algosdk.makeApplicationNoOpTxn(this.props.activeAddress, params, this.props.contract, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
          

          let txns = [ftxn1, ftxn2, atxn]

          let txgroup = algosdk.assignGroupID(txns)

          

          let multipleTxnGroups

          if (false) {
            const userMnemonic = ""
            const userAccout =  algosdk.mnemonicToSecretKey(userMnemonic)
            // Sign the transaction
            let signedTxn1 = ftxn1.signTxn(userAccout.sk);
            let signedTxn2 = ftxn2.signTxn(userAccout.sk);
            let signedTxn3 = atxn.signTxn(userAccout.sk);

            let signed = []
            signed.push( signedTxn1 )
            signed.push( signedTxn2 )
            signed.push( signedTxn3 )
        
            // Submit the transaction
            await client.sendRawTransaction(signed).do()                           
                
        
          }
  
          else if (this.props.wallet == "pera") {
  
            try {
              multipleTxnGroups = [
                {txn: ftxn1, signers: [this.props.activeAddress]},
                {txn: ftxn2, signers: [this.props.activeAddress]},
                {txn: atxn, signers: [this.props.activeAddress]}
              ];
  
              const signedTxn = await peraWallet.signTransaction([multipleTxnGroups]) 

              let txId = await client.sendRawTransaction(signedTxn).do();

              this.setState({
                ["appmessage" + proposalNum]: "Sending Transaction..."
              })

              let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);


              this.setState({
                ["appmessage" + proposalNum]: "Transaction Confirmed, Application Successfully Sent"
              })
    
              
            }
  
            catch (error) {
              console.log(error)
            }
            
  
          }
  
          else if (this.props.wallet == "myalgo") {

            try {

            multipleTxnGroups = [
              ftxn1.toByte(),
              ftxn2.toByte(),
              atxn.toByte()
            ];

            const myAlgoWallet = new MyAlgo()


            const signedTxn = await myAlgoWallet.signTransaction(multipleTxnGroups);

            let txId = await client.sendRawTransaction([signedTxn[0].blob, signedTxn[1].blob, signedTxn[2].blob]).do();

            this.setState({
              ["appmessage" + proposalNum]: "Sending Transaction..."
            })

            let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);        

            this.setState({
              ["appmessage" + proposalNum]: "Transaction Confirmed, Application Successfully Sent"
            })

          }

          catch (error) {
            console.log(error)
          }
  
          
        }

        }

        async vote(proposalNum) {

          const client = new algosdk.Algodv2("", "https://node.algoexplorerapi.io/", "")
  
          let params = await client.getTransactionParams().do();

          let txns = []
          let multipleTxnGroups = []
          let txn


        for (let i = 0; i < this.state.walletAssets.length; i++) {

          if (i < 16) {
            const appArgs = []
            appArgs.push(
              new Uint8Array(Buffer.from("vote")),
              new Uint8Array(Buffer.from(this.state["vote" + proposalNum])),
              new Uint8Array(Buffer.from(proposalNum))
            )

            const accounts = []
            const foreignApps = []
                
            let foreignAssets = [601894079, this.state.walletAssets[i]]
            
            let voteBox = new Uint8Array(Buffer.from("Votes" + proposalNum))
            let proposalBox = new Uint8Array(Buffer.from("Proposal" + proposalNum))

            const boxes = [{appIndex: 0, name: voteBox}, {appIndex: 0, name: voteBox}, {appIndex: 0, name: proposalBox}, {appIndex: 0, name: proposalBox}]
            
            txn = algosdk.makeApplicationNoOpTxn(this.props.activeAddress, params, this.props.contract, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);          
            
            txns.push(txn)

            
          }
          
        }

        let txgroup = algosdk.assignGroupID(txns)

        for (let i = 0; i < txns.length; i++) {
          if (this.props.wallet == "pera") {
            multipleTxnGroups.push({txn: txns[i], signers: [this.props.activeAddress]})
          }

          else if (this.props.wallet == "myalgo") {
            multipleTxnGroups.push(txns[i].toByte())
          }
        }


    
            if (false) {
              const userMnemonic = ""
              const userAccout =  algosdk.mnemonicToSecretKey(userMnemonic)
              // Sign the transaction
              let signedTxn1 = ftxn1.signTxn(userAccout.sk);
              let signedTxn2 = ftxn2.signTxn(userAccout.sk);
              let signedTxn3 = atxn.signTxn(userAccout.sk);
  
              let signed = []
              signed.push( signedTxn1 )
              signed.push( signedTxn2 )
              signed.push( signedTxn3 )
          
              // Submit the transaction
              await client.sendRawTransaction(signed).do()                           
                  
          
            }
    
            else if (this.props.wallet == "pera") {
    
              try {
                
                const signedTxn = await peraWallet.signTransaction([multipleTxnGroups]) 
  
                let txId = await client.sendRawTransaction(signedTxn).do();
  
                this.setState({
                  ["votemessage" + proposalNum]: "Sending Transaction..."
                })
  
                let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);
  
  
                this.setState({
                  ["votemessage" + proposalNum]: "Transaction Confirmed, Vote Successfully Sent"
                })
      
                
              }
    
              catch (error) {
                console.log(error)
              }
              
    
            }
    
            else if (this.props.wallet == "myalgo") {
  
              try {
  
              const myAlgoWallet = new MyAlgo()
  
              const signedTxn = await myAlgoWallet.signTransaction(multipleTxnGroups);

              let trans = []

              signedTxn.forEach((tran) => {
                trans.push(tran.blob)
              })
                          

              let txId = await client.sendRawTransaction(trans).do()
    
              this.setState({
                ["votemessage" + proposalNum]: "Sending Transaction..."
              })
  
              let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);        
  
              this.setState({
                ["votemessage" + proposalNum]: "Transaction Confirmed, Vote Successfully Sent"
              })
  
            }
  
            catch (error) {
              console.log(error)
            }
    
            
          }
  
          }

          async certify(proposalNum, votes) {

            const client = new algosdk.Algodv2("", "https://node.algoexplorerapi.io/", "")
    
            let params = await client.getTransactionParams().do();

            let maxVotes = 0
            let maxChar = ""
          

            votes.forEach((vote) => {
              if (vote.count > maxVotes) {
                maxVotes = vote.count
                maxChar = vote.vote
              }
            })

            let approveChar
            let approveAddr = ""
            let approveCost = 0
            let approveRound = 0


            if (maxChar == "Reject") {
              approveChar = "Reject"
            }
            else {
              this.state.applications.forEach((app) => {
                if (app.appNum == maxChar && app.proposalNum == proposalNum) {
                  approveChar = app.appNum
                  approveCost = app.cost
                  approveRound = app.endRound
                  approveAddr = app.proposer
                }
              })
            }

            let satBox = new Uint8Array(Buffer.from("Sat" + proposalNum))

            const boxes = [{appIndex: 0, name: satBox}, {appIndex: 0, name: satBox}]
    
            const appArgs = []
              appArgs.push(
                new Uint8Array(Buffer.from("certify")),
                new Uint8Array(Buffer.from(proposalNum)),
                new Uint8Array(Buffer.from(approveChar)),
                new Uint8Array(Buffer.from(approveAddr)),
                algosdk.encodeUint64(approveRound),
                algosdk.encodeUint64(approveCost),
                
                

              )
    
    
              const accounts = []
              const foreignApps = []
                
              let foreignAssets = []
                
              let atxn = algosdk.makeApplicationNoOpTxn(this.props.activeAddress, params, this.props.contract, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
            
              let multipleTxnGroups
    
              if (false) {
                const userMnemonic = ""
                const userAccout =  algosdk.mnemonicToSecretKey(userMnemonic)
                // Sign the transaction
                let signedTxn1 = ftxn1.signTxn(userAccout.sk);
                let signedTxn2 = ftxn2.signTxn(userAccout.sk);
                let signedTxn3 = atxn.signTxn(userAccout.sk);
    
                let signed = []
                signed.push( signedTxn1 )
                signed.push( signedTxn2 )
                signed.push( signedTxn3 )
            
                // Submit the transaction
                await client.sendRawTransaction(signed).do()                           
                    
            
              }
      
              else if (this.props.wallet == "pera") {
      
                try {
                  multipleTxnGroups = [
                    {txn: atxn, signers: [this.props.activeAddress]}
                  ];
      
                  const signedTxn = await peraWallet.signTransaction([multipleTxnGroups]) 
    
                  let txId = await client.sendRawTransaction(signedTxn).do();
    
                  this.setState({
                    ["votemessage" + proposalNum]: "Sending Transaction..."
                  })
    
                  let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);
    
    
                  this.setState({
                    ["votemessage" + proposalNum]: "Transaction Confirmed, Propsal Successfully Certified"
                  })
        
                  
                }
      
                catch (error) {
                  console.log(error)
                }
                
      
              }
      
              else if (this.props.wallet == "myalgo") {
    
                try {
    
                multipleTxnGroups = [
                  atxn.toByte()
                ];
    
                const myAlgoWallet = new MyAlgo()
    
                
                const signedTxn = await myAlgoWallet.signTransaction(multipleTxnGroups);
    
                let txId = await client.sendRawTransaction([signedTxn[0].blob]).do();
    
                this.setState({
                  ["votemessage" + proposalNum]: "Sending Transaction..."
                })
    
                let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);        
    
                this.setState({
                  ["votemessage" + proposalNum]: "Transaction Confirmed, Propsal Successfully Certified"
                })
    
              }
    
              catch (error) {
                console.log(error)
              }
      
              
            }
    
            }

            async voteSat(proposalNum) {

              const client = new algosdk.Algodv2("", "https://node.algoexplorerapi.io/", "")
      
              let params = await client.getTransactionParams().do();

              let satValue = Number(this.state["sat" + proposalNum])

    
              let txns = []
              let multipleTxnGroups = []
              let txn
    
    
            for (let i = 0; i < this.state.walletAssets.length; i++) {
    
              if (i < 16) {
                const appArgs = []
                appArgs.push(
                  new Uint8Array(Buffer.from("voteSat")),
                  new Uint8Array(Buffer.from(proposalNum)),
                  algosdk.encodeUint64(satValue),
                )
    
                const accounts = []
                const foreignApps = []
                    
                let foreignAssets = [this.state.walletAssets[i], 601894079]
                
                let satBox = new Uint8Array(Buffer.from("Sat" + proposalNum))
                let proposalBox = new Uint8Array(Buffer.from("Proposal" + proposalNum))

      
                const boxes = [{appIndex: 0, name: satBox}, {appIndex: 0, name: satBox}, {appIndex: 0, name: proposalBox}, {appIndex: 0, name: proposalBox}]
                
                txn = algosdk.makeApplicationNoOpTxn(this.props.activeAddress, params, this.props.contract, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);          
                
                txns.push(txn)
    
                
              }
              
            }
    
            let txgroup = algosdk.assignGroupID(txns)
    
            for (let i = 0; i < txns.length; i++) {
              if (this.props.wallet == "pera") {
                multipleTxnGroups.push({txn: txns[i], signers: [this.props.activeAddress]})
              }
    
              else if (this.props.wallet == "myalgo") {
                multipleTxnGroups.push(txns[i].toByte())
              }
            }
    
    
        
                if (false) {
                  const userMnemonic = ""
                  const userAccout =  algosdk.mnemonicToSecretKey(userMnemonic)
                  // Sign the transaction
                  let signedTxn1 = ftxn1.signTxn(userAccout.sk);
                  let signedTxn2 = ftxn2.signTxn(userAccout.sk);
                  let signedTxn3 = atxn.signTxn(userAccout.sk);
      
                  let signed = []
                  signed.push( signedTxn1 )
                  signed.push( signedTxn2 )
                  signed.push( signedTxn3 )
              
                  // Submit the transaction
                  await client.sendRawTransaction(signed).do()                           
                      
              
                }
        
                else if (this.props.wallet == "pera") {
        
                  try {
                    
                    const signedTxn = await peraWallet.signTransaction([multipleTxnGroups]) 
      
                    let txId = await client.sendRawTransaction(signedTxn).do();
      
                    this.setState({
                      ["votemessage" + proposalNum]: "Sending Transaction..."
                    })
      
                    let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);
      
      
                    this.setState({
                      ["votemessage" + proposalNum]: "Transaction Confirmed, Satisfaction Vote Successfully Sent"
                    })
          
                    
                  }
        
                  catch (error) {
                    console.log(error)
                  }
                  
        
                }
        
                else if (this.props.wallet == "myalgo") {
      
                  try {
      
                  const myAlgoWallet = new MyAlgo()
      
                  const signedTxn = await myAlgoWallet.signTransaction(multipleTxnGroups);
    
                  let trans = []
    
                  signedTxn.forEach((tran) => {
                    trans.push(tran.blob)
                  })
                              
    
                  let txId = await client.sendRawTransaction(trans).do()
        
                  this.setState({
                    ["votemessage" + proposalNum]: "Sending Transaction..."
                  })
      
                  let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);        
      
                  this.setState({
                    ["votemessage" + proposalNum]: "Transaction Confirmed, Satisfaction Vote Successfully Sent"
                  })
      
                }
      
                catch (error) {
                  console.log(error)
                }
        
                
              }
      
              }

            

              async satisfy(proposalNum, median, appNum, proposer) {

                const client = new algosdk.Algodv2("", "https://node.algoexplorerapi.io/", "")
        
                let params = await client.getTransactionParams().do();
  
                let satValue = Number(this.state["sat" + proposalNum])
        
        
                const appArgs = []
                  appArgs.push(
                    new Uint8Array(Buffer.from("satisfy")),
                    new Uint8Array(Buffer.from(proposalNum)),
                    new Uint8Array(Buffer.from(proposer + appNum + proposalNum)),
                    algosdk.encodeUint64(median),
  
                  )

                  const accounts = [proposer]
                  const foreignApps = []
                    
                  let foreignAssets = [601894079]
                  
                  let atxn = algosdk.makeApplicationNoOpTxn(this.props.activeAddress, params, this.props.contract, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined);
                
        
                  let multipleTxnGroups
        
                  if (false) {
                    const userMnemonic = ""
                    const userAccout =  algosdk.mnemonicToSecretKey(userMnemonic)
                    // Sign the transaction
                    let signedTxn1 = ftxn1.signTxn(userAccout.sk);
                    let signedTxn2 = ftxn2.signTxn(userAccout.sk);
                    let signedTxn3 = atxn.signTxn(userAccout.sk);
        
                    let signed = []
                    signed.push( signedTxn1 )
                    signed.push( signedTxn2 )
                    signed.push( signedTxn3 )
                
                    // Submit the transaction
                    await client.sendRawTransaction(signed).do()                           
                        
                
                  }
          
                  else if (this.props.wallet == "pera") {
          
                    try {
                      multipleTxnGroups = [
                        {txn: atxn, signers: [this.props.activeAddress]}
                      ];
          
                      const signedTxn = await peraWallet.signTransaction([multipleTxnGroups]) 
        
                      let txId = await client.sendRawTransaction(signedTxn).do();
        
                      this.setState({
                        ["votemessage" + proposalNum]: "Sending Transaction..."
                      })
        
                      let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);
        
        
                      this.setState({
                        ["votemessage" + proposalNum]: "Transaction Confirmed, Vote Successfully Sent"
                      })
            
                      
                    }
          
                    catch (error) {
                      console.log(error)
                    }
                    
          
                  }
          
                  else if (this.props.wallet == "myalgo") {
        
                    try {
        
                    multipleTxnGroups = [
                      atxn.toByte()
                    ];
        
                    const myAlgoWallet = new MyAlgo()
        
        
                    const signedTxn = await myAlgoWallet.signTransaction(multipleTxnGroups);
        
                    let txId = await client.sendRawTransaction([signedTxn[0].blob]).do();
        
                    this.setState({
                      ["votemessage" + proposalNum]: "Sending Transaction..."
                    })
        
                    let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);        
        
                    this.setState({
                      ["votemessage" + proposalNum]: "Transaction Confirmed, Application Successfully Sent"
                    })
        
                  }
        
                  catch (error) {
                    console.log(error)
                  }
          
                  
                }
        
                } 

              renderTooltip = (props) => {
                const { active, payload } = props;
        
                if (active && payload && payload.length) {
                const data = payload[0] && payload[0].payload;
        
                return (
                    <div 
                    style={{
                    backgroundColor: "#fff",
                    border: "1px solid #999",
                    margin: "0px",
                    padding: "10px"
                    }}>
                    {data.value}
                    </div>
                );
                }
        
                return null;
            };
      

    render() {

      let date = new Date()

      const RADIAN = Math.PI / 180;
        const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, vote }) => {
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        return (
            <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
            {vote} = {`${(percent * 100).toFixed(2)}%`} 
            </text>
        );
      };


      let sortedProposals = this.state.proposals.sort((a, b) => a.endRound - b.endRound)

        return (
            <div>
              <br />
              <Typography color="secondary" variant="h6" align="center"> Your DAO = {this.state.walletAssets.length} </Typography>
              <br />
              <Typography color="secondary" variant="h6" align="center"> {this.state.loading}</Typography>
              <br />
              {sortedProposals.length > 0 ? 
                sortedProposals.map((proposal, index) => {
                  if (this.state.proposalSel == proposal.proposalNum) {
                    if (proposal.contracts.length > 0) {
                      let contractApp
                      this.state.applications.forEach((app) => {
                        if (String(app.proposalNum) == String(proposal.contracts[0].proposalNum) && String(app.appNum) == String(proposal.contracts[0].appNum)) {
                          contractApp = app
                        }
                      })
                      let satVotes = proposal.sat.sort((a,b) => a.value > b.value ? 1 : -1)

                      let median
                      let median1
                      let median2

                      if (satVotes.length > 0) {
                        if (satVotes.length % 2 == 0) {
                            median1 = Math.floor((satVotes.length - 1) / 2)
                            median2 = Math.ceil((satVotes.length - 1) / 2)
                            median = (satVotes[median1].value + satVotes[median2].value) / 2
                    
                        }
                        else {
                          median = satVotes[Math.floor(satVotes.length / 2)].value
                        }
                      }
                      return (
                        <div key={index} style={{borderTop: "1px solid white", padding: 20}}>
                          <Button variant="text" color="secondary" style={{display: "flex", margin: "auto"}} onClick={() => this.setState({proposalSel: null})}>
                            <Typography color="secondary" variant="h6" align="center"> Proposal {proposal.proposalNum} </Typography>
                          </Button>
                          <br />
                          <Typography color="secondary" variant="h6" align="center"> {proposal.proposal.substring(58)} </Typography>
                          <br />
                          <Typography color="secondary" variant="subtitle1" align="center"> Proposer </Typography>
                          <br />
                          <Button variant="contained" color="secondary" style={{display: "flex", margin: "auto"}} onClick={() => window.open("https://algoexplorer.io/address/" + proposal.proposal.substring(0, 58))}>
                            <Typography color="primary" variant="h6" align="center"> {proposal.proposal.substring(0, 10)} </Typography>
                          </Button>
                          <br />
                          <Typography color="secondary" variant="h6" align="center"> Contracted </Typography>
                          <br />
                          <Typography color="secondary" variant="h6" > Offer {proposal.contracts[0].appNum} </Typography>
                            <br />
                            <Typography color="secondary" variant="subtitle1" > {contractApp.application} </Typography>
                            <br />
                            <Typography color="secondary" variant="subtitle1" align="center"> Applicant </Typography>
                            <br />
                            <Button variant="contained" color="secondary" style={{display: "flex", margin: "auto"}} onClick={() => window.open("https://algoexplorer.io/address/" + app.proposer.substring(0, 58))}>
                              <Typography color="primary" variant="h6" align="center"> {contractApp.proposer.substring(0, 10)} </Typography>
                            </Button>
                          
                            <br />
                            <Typography color="secondary" variant="h6" align="center" >  {Number(contractApp.cost).toLocaleString("en-US")} <img src="DC.svg" style={{display: "inline", width: 30, paddingTop: 20}} /></Typography>
                            <br />
                            
                            
                           

                          {(proposal.endRound - this.state.currRound) < 0 ? 
                          <>
                            <Typography color="secondary" variant="subtitle1" align="center"> Ready for Satisfaction Vote </Typography>
                            <br />
                            <Slider name={"sat" + proposal.proposalNum} color="secondary" defaultValue={50} step={10} marks min={0} max={100} onChange={this.handleChange} />
                            <br />
                            <Typography color="secondary" variant="h6" align="center"> {this.state["sat" + proposal.proposalNum]}% </Typography>
                            <br />
                            {this.state["sat" + proposal.proposalNum] ? 
                            <>
                            <Button variant="contained" color="secondary" style={{display: "flex", margin: "auto"}} onClick={() => this.voteSat(proposal.proposalNum)}>
                              <Typography color="primary" variant="h6" align="center"> Vote </Typography>
                            </Button>
                            <br />
                        <Typography color="secondary" variant="h6" align="center"> {this.state["votemessage" + proposal.proposalNum]} </Typography>
                            </>
                            :
                            null
                            }

                            <br />
                            <Typography color="secondary" variant="subtitle1" align="center"> Current Satisfaction </Typography>
                            <br />


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
                                <Scatter data={proposal.sat} fill="#FFFFFF" />
                            </ScatterChart>
                        </ResponsiveContainer>
                        <Typography color="secondary" variant="subtitle1" align="center"> Median = {median} </Typography>
                        <br />
                        <Typography color="secondary" variant="h6" align="center" > This contract will recieve {Number(median / 100 * contractApp.cost).toLocaleString("en-US")} <img src="DC.svg" style={{display: "inline", width: 30, paddingTop: 20}} /></Typography>
                        <br />

                        {(proposal.endRound - this.state.currRound) < -1000 ?
                          proposal.sat.length > 0 ?
                          this.props.activeAddress == "AL6F3TFPSZPF3BSVUFDNOLMEKUCJJAA7GZ5GF3DN3Q4IVJVNUFK76PQFNE" ?
                          <Button variant="contained" color="secondary" style={{display: "flex", margin: "auto", borderRadius: 15, padding: 10}} onClick={() => this.satisfy(proposal.proposalNum, median, contractApp.appNum, contractApp.proposer)}>
                            <Typography color="primary" variant="h6" align="center"> Satisfy </Typography>
                          </Button>
                          :
                          null
                          :
                          <Typography color="secondary" variant="subtitle1" align="center"> Need at least one satisfaction vote </Typography>

                        :
                          <Typography color="secondary" variant="subtitle1" align="center"> {(proposal.endRound - this.state.currRound) + 1000} more rounds or about {(((proposal.endRound - this.state.currRound) + 1000) * 3.8 / 60 / 60 / 24).toFixed(2)} days </Typography>
                        }

                            
                          </>
                            :
                            <Typography color="secondary" variant="subtitle1" align="center"> {proposal.endRound - this.state.currRound} more rounds or about {((proposal.endRound - this.state.currRound) * 3.8 / 60 / 60 / 24).toFixed(2)} days </Typography>
                          }
                        <br />
                        </div>
                      )
                    }
                    else {
                    return (
                      <div key={index} style={{borderTop: "1px solid white", padding: 20}}>
                          <Button variant="text" color="secondary" style={{display: "flex", margin: "auto"}} onClick={() => this.setState({proposalSel: null})}>
                            <Typography color="secondary" variant="h6" align="center"> Proposal {proposal.proposalNum} </Typography>
                          </Button>
                          <br />
                          <Typography color="secondary" variant="h6" align="center"> {proposal.proposal.substring(58)} </Typography>
                          <br />
                          <Typography color="secondary" variant="subtitle1" align="center"> This proposal is contracted or rejected after round {proposal.endRound} </Typography>
                          <br />
                          <Typography color="secondary" variant="subtitle1" align="center"> Proposer </Typography>
                          <br />
                          <Button variant="contained" color="secondary" style={{display: "flex", margin: "auto"}} onClick={() => window.open("https://algoexplorer.io/address/" + proposal.proposal.substring(0, 58))}>
                            <Typography color="primary" variant="h6" align="center"> {proposal.proposal.substring(0, 10)} </Typography>
                          </Button>
                          <br />
                          {((proposal.endRound - this.state.currRound) * 3.8 / 60 / 60 / 24).toFixed(2) < 0 ? 
                            <Typography color="secondary" variant="subtitle1" align="center"> Ready to be certified </Typography>
                            :
                            <Typography color="secondary" variant="subtitle1" align="center"> {proposal.endRound - this.state.currRound} more rounds or about {((proposal.endRound - this.state.currRound) * 3.8 / 60 / 60 / 24).toFixed(2)} days </Typography>
                          }
                        <br />
                        {this.state["apply" + proposal.proposalNum] ?
                        <>
                        <div style={{border: "1px solid white", borderRadius: 15}}>
                        <br />
                        <Button variant="text" style={{display: "flex", margin: "auto"}} onClick={() => this.setState({["apply" + proposal.proposalNum]: false})}>
                        <Typography color="secondary" variant="h6" align="center"> Apply </Typography>
                        </Button>
                        <br />
                        <Typography color="secondary" variant="subtitle1" align="center"> How will you satisfy this proposal? </Typography>
                        <br />
                        <TextField                
                            onChange={this.handleChange}
                            value={this.state[proposal.proposalNum]}
                            multiline
                            type="text"
                            label=""
                            name={proposal.proposalNum}
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
                          <Typography color="secondary" variant="subtitle1" align="center"> Completed by round: </Typography>
                          <br />
                          
                          <TextField                
                            onChange={this.handleChange}
                            defaultValue={proposal.endRound}
                            multiline
                            type="number"
                            label=""
                            name={"round" + proposal.proposalNum}
                            autoComplete="false"
                            InputProps={{ style: { color: "black" } }}
                          
                            style={{
                            color: "black",
                            background: "white",
                            borderRadius: 15,
                            display: "flex",
                            margin: "auto",
                            width: "50%"
                          
                            }}
                          />
                          <br />
                          <Typography color="secondary" variant="subtitle1" align="center"> Expected reward: </Typography>
                          <br />
                          
                          <TextField                
                            onChange={this.handleChange}
                            value={this.state["cost" + proposal.proposalNum]}
                            multiline
                            type="number"
                            label=""
                            name={"cost" + proposal.proposalNum}
                            autoComplete="false"
                            InputProps={{ style: { color: "black" } }}
                          
                            style={{
                            color: "black",
                            background: "white",
                            borderRadius: 15,
                            display: "flex",
                            margin: "auto",
                            width: "50%"
                          
                            }}
                          />                 
                         
                          <br />
                          {String(this.state[proposal.proposalNum]).length > 50 ?
                          String(this.state[proposal.proposalNum]).length < 2000 ?
                          proposal.endRound && this.state["round" + proposal.proposalNum] && (this.state["round" + proposal.proposalNum] > proposal.endRound) ?
                          Number(this.state["cost" + proposal.proposalNum] > 0) ?
                          <>
                            <Typography color="secondary" variant="h6" align="center"> You will have {((this.state["round" + proposal.proposalNum] - proposal.endRound) * 3.8 / 60 / 60 / 24).toFixed(2)} days if you are contracted. Then a DAO satisfaction vote will occur. </Typography>
                            <br />
                            <Typography color="secondary" variant="h6" align="center"> You will recieve {Number(this.state["cost" + proposal.proposalNum]).toLocaleString("en-US")} Dark Coin based on satisfaction level. </Typography>
                            <br />
                            <Button variant="contained" color="secondary" style={{display: "flex", margin: "auto"}} onClick={() => this.apply(proposal.proposalNum)}>
                              <Typography color="primary" variant="h6" align="center"> Apply {String(this.state[proposal.proposalNum]).length * 50} </Typography>
                              <img src="invDC.svg" style={{display: "flex", margin: "auto", width: 50, padding: 10}} />
                              <Typography  variant="h6"> + 0.5</Typography>
                              <img src="AlgoBlack.svg" style={{display: "flex", margin: "auto", width: 40, padding: 10}} />
                            </Button>
                            <br />
                            <Typography color="secondary" variant="h6" align="center"> {this.state.confirm} </Typography>

                          </>
                          :
                          <Typography color="secondary" variant="h6" align="center"> Name your price </Typography>
                          :
                          <Typography color="secondary" variant="h6" align="center"> Select a round greater than the contract round </Typography>
                          :
                          <Typography color="secondary" variant="h6" align="center"> Application must be less than 2000 characters </Typography>
                          :
                          <Typography color="secondary" variant="h6" align="center"> Application must be greater than 50 characters </Typography>

                          }
                          
                          <br />
                          <Typography color="secondary" variant="h6" align="center"> {this.state["appmessage" + proposal.proposalNum]} </Typography>
                          <br />



                        </div>

                        <br />

                        </>
                        :
                        <>
                        <Button variant="outlined" color="secondary" style={{display: "flex", margin: "auto"}} onClick={() => this.setState({["apply" + proposal.proposalNum]: true})}>
                          <Typography color="secondary" variant="h6" align="center"> Apply </Typography>
                        </Button>
                        <br />
                        </>
                        }


                                                   
                          {this.state.applications.length > 0 ? 
                            this.state.applications.map((app, index) => {
                              if (app.proposalNum == proposal.proposalNum) {
                                return (
                                  <div key={index}>
                                      <Typography color="secondary" variant="h6" > Offer {app.appNum} </Typography>
                                      <br />
                                      <Typography color="secondary" variant="subtitle1" > {app.application} </Typography>
                                      <br />
                                      <Typography color="secondary" variant="subtitle1" align="center"> Applicant </Typography>
                                      <br />
                                      <Button variant="contained" color="secondary" style={{display: "flex", margin: "auto"}} onClick={() => window.open("https://algoexplorer.io/address/" + app.proposer.substring(0, 58))}>
                                        <Typography color="primary" variant="h6" align="center"> {app.proposer.substring(0, 10)} </Typography>
                                      </Button>
                                      <br />
                                      <Typography color="secondary" variant="h6" align="center" >  {((app.endRound - this.state.currRound) * 3.8 / 60 / 60 / 24).toFixed(2)} days</Typography>
                                      <br />
                                      <Typography color="secondary" variant="h6" align="center" >  {Number(app.cost).toLocaleString("en-US")} {this.state["vote" + (proposal.proposalNum)] == app.appNum ? <img src="invDC.svg" style={{display: "inline", width: 30, paddingTop: 20}} /> : <img src="DC.svg" style={{display: "inline", width: 30, paddingTop: 20}} />}</Typography>
                                      <br />
                                      <Button style={{backgroundColor: this.state["vote" + (proposal.proposalNum)] == app.appNum ? "#FFFFFF" : "#000000", border: "1px solid white", display: "grid", margin: "auto", borderRadius: 15, padding: 10}} onClick={() => this.state["vote" + (proposal.proposalNum)] == app.appNum ? this.setState({["vote" + (proposal.proposalNum)]: null}) : this.setState({["vote" + (proposal.proposalNum)]: app.appNum})}>
                                        <Typography color="secondary" variant="h6" style={{color: this.state["vote" + (proposal.proposalNum)] == app.appNum ? "#000000" : "#FFFFFF"}}> Accept {app.appNum} </Typography>
                                      </Button> 
                                  <br />
                                  </div>
                                  )
                              }
                            
                          })
                        :
                        null
                        }

                         <div style={{display: "flex", margin: "auto"}}>
                          <br />
                          <Button style={{backgroundColor: this.state["vote" + (proposal.proposalNum)] == "@" ? "#FFFFFF" : "#000000", border: "1px solid white", display: "flex", margin: "auto", borderRadius: 15, padding: 10}} onClick={() => this.state["vote" + (proposal.proposalNum)] == "@" ? this.setState({["vote" + (proposal.proposalNum)]: null}) : this.setState({["vote" + (proposal.proposalNum)]: "@"})}>
                              <Typography color="secondary" variant="h6" style={{color: this.state["vote" + (proposal.proposalNum)] == "@" ? "#000000" : "#FFFFFF"}}> Reject </Typography>
                          </Button> 

                        </div>

                        
                           

                        
                        <br />

                      {this.state.currRound >= proposal.endRound && proposal.votes.length && this.props.activeAddress == "AL6F3TFPSZPF3BSVUFDNOLMEKUCJJAA7GZ5GF3DN3Q4IVJVNUFK76PQFNE" ?
                        <Button  style={{backgroundColor: "#FFFFFF", border: "1px solid white", display: "flex", margin: "auto", borderRadius: 15, padding: 10}} onClick={() => this.certify(proposal.proposalNum, proposal.votes)}>
                          <Typography color="secondary" variant="h6" style={{color: "#000000"}}> Certify </Typography>
                        </Button> 
                      :
                      null
                      }

                      <br/>

                      {this.state["vote" + (proposal.proposalNum)] ?
                        this.state.walletAssets.length > 0 ?
                        <Button  style={{backgroundColor: "#FFFFFF", border: "1px solid white", display: "flex", margin: "auto"}} onClick={() => this.vote(proposal.proposalNum)}>
                          <Typography color="secondary" variant="h6" style={{color: "#000000"}}> Vote </Typography>
                        </Button> 
                        :
                        <Typography color="secondary" variant="h6" style={{color: "#000000"}}> Vote </Typography>
                        :
                        null
                      }
                      <br />
                        
                        <Typography color="secondary" variant="h6" align="center"> {this.state["votemessage" + proposal.proposalNum]} </Typography>

                       
                    {proposal.votes.length > 0 ? 
                    <ResponsiveContainer aspect={2} width="100%">
                    <PieChart >
                    <Pie
                        dataKey="count"
                        data={proposal.votes}
                        label={renderCustomizedLabel}
                        fill="#000000"
                    />
        
                    </PieChart>
                    </ResponsiveContainer>
                      :
                      null
                      }

                      <Typography color="secondary" variant="h6" align="center"> Votes = {proposal.numVotes} </Typography>


                          
                      </div>
                  )
                    }
                  
                  }
                

                  else {
                    if (proposal.contracts.length > 0) {
                      return (
                        <div key={index}>
                        <Button variant="outlined" color="secondary" style={{display: "grid", margin: "auto", width: "100%", padding: 20}} onClick={() => this.setState({proposalSel: proposal.proposalNum})}>
                          <Typography color="secondary" variant="h6" align="center"> Proposal {proposal.proposalNum} </Typography>
                          <br />
                          <Typography color="secondary" variant="h6" align="center"> Contracted </Typography>
                          <br />
                          {((proposal.endRound - this.state.currRound) * 3.8 / 60 / 60 / 24).toFixed(2) < 0 ? 
                            <Typography color="secondary" variant="subtitle1" align="center"> Ready for Satisfaction Vote </Typography>
                            :
                            <Typography color="secondary" variant="subtitle1" align="center"> {proposal.endRound - this.state.currRound} more rounds or about {((proposal.endRound - this.state.currRound) * 3.8 / 60 / 60 / 24).toFixed(2)} days </Typography>
                          }                      
                        </Button>
                        </div>
                      )
                    }
                    else {
                      return (
                        <div key={index}>
                        <Button variant="outlined" color="secondary" style={{display: "grid", margin: "auto", width: "100%", padding: 20}} onClick={() => this.setState({proposalSel: proposal.proposalNum})}>
                          <Typography color="secondary" variant="h6" align="center"> Proposal {proposal.proposalNum} </Typography>
                          <br />
                          {((proposal.endRound - this.state.currRound) * 3.8 / 60 / 60 / 24).toFixed(2) < 0 ? 
                            <Typography color="secondary" variant="subtitle1" align="center"> Ready to be certified </Typography>
                            :
                            <Typography color="secondary" variant="subtitle1" align="center"> {proposal.endRound - this.state.currRound} more rounds or about {((proposal.endRound - this.state.currRound) * 3.8 / 60 / 60 / 24).toFixed(2)} days </Typography>
                          }                      
                        </Button>
                        </div>
                      )
                    }
                    
                  }
                    
                })
                :
                null
            }
                 
                
              
            </div>
        )
    }
    
}