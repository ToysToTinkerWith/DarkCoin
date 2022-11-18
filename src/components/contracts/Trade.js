import React from "react"

import Head from "next/head"

import MyAlgo from '@randlabs/myalgo-connect';


import { PeraWalletConnect } from "@perawallet/connect";

const peraWallet = new PeraWalletConnect();

import algosdk from "algosdk"


import { Typography, Button, Grid } from "@mui/material"

import styles from "../../index.module.css"

import muisty from "../../muistyles.module.css"

export default class Trade extends React.Component { 

    constructor(props) {
        super(props);
        this.state = {
            optedIn: false,
            available2: [],
            trade5: []
        };
        this.Optin = this.Optin.bind(this)
        this.Closeout = this.Closeout.bind(this)
        this.NoOp = this.NoOp.bind(this)
        this.handleChange = this.handleChange.bind(this)
        this.assetTransaction = this.assetTransaction.bind(this)
    }

    componentDidMount() {
        
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
          let address = this.props.activeAddress;
          let response = await indexerClient.lookupAccountAppLocalStates(address).do();
          response["apps-local-states"].forEach((app) => {                
              if (app.id == 861419580) {
                  this.setState({optedIn: true})
              }
          })

          let contract = "FU6ROUCD4M77UBHJCUFPQR4FPLT35NZKDABAKJP2X6W7WS4EWWUYLBKVRQ";
          let assets = await indexerClient.lookupAccountAssets(contract).do();

          assets.assets.forEach(async (asset) => {
            if(asset["asset-id"] >= 846867259 && asset.amount == 1) {
              this.setState(prevState => ({
                available2: [...prevState.available2, asset["asset-id"]]
              }))
            }
            
          })

          let assetsLen = assets.assets.length
          let assetsNext = assets["next-token"]

          while (assetsLen == 1000) {

            assets = await indexerClient.lookupAccountAssets(contract).nextToken(assetsNext).do();

            assets.assets.forEach(async (asset) => {
              if(asset["asset-id"] >= 846867259 && asset.amount == 1) {
                this.setState(prevState => ({
                  available2: [...prevState.available2, asset["asset-id"]]
                }))
              }
              
            })

            assetsLen = assets.assets.length
            assetsNext = assets["next-token"]


          }

        })().catch(e => {
            console.error(e);
            console.trace();
        })

      }
     

      async Optin (sender, index) {
        try{

        let client = new algosdk.Algodv2("", "https://node.algoexplorerapi.io/", "")
        
          let params = await client.getTransactionParams().do()
          params.fee = 1000;
          params.flatFee = true;
          
          
          let txn = algosdk.makeApplicationOptInTxn(sender, params, index);
          const singleTxnGroups = [{txn: txn, signers: [this.props.activeAddress]}]

          if (this.props.wallet == "pera") {
            const signedTxn = await peraWallet.signTransaction([singleTxnGroups])

            let txId = await client.sendRawTransaction(signedTxn).do();

            this.setState({optedIn: true})
          }
          else if (this.props.wallet == "myalgo") {
            const myAlgoWallet = new MyAlgo()

            const signedTxn = await myAlgoWallet.signTransaction(txn.toByte());

            let txId = await client.sendRawTransaction(signedTxn.blob).do();

            this.setState({optedIn: true})
          }
         
        }catch(err){
          console.log(err)
        }
      }

      async Closeout (sender, index) {
        try{

        let client = new algosdk.Algodv2("", "https://node.algoexplorerapi.io/", "")
        
          let params = await client.getTransactionParams().do()
          params.fee = 1000;
          params.flatFee = true;      
          
          let txn = algosdk.makeApplicationCloseOutTxn(sender, params, index);
          const singleTxnGroups = [{txn: txn, signers: [this.props.activeAddress]}]

          if (this.props.wallet == "pera") {
            const signedTxn = await peraWallet.signTransaction([singleTxnGroups])

            let txId = await client.sendRawTransaction(signedTxn).do();

            this.setState({optedIn: false})
          }
          else if (this.props.wallet == "myalgo") {
            const myAlgoWallet = new MyAlgo()

            const signedTxn = await myAlgoWallet.signTransaction(txn.toByte());

            let txId = await client.sendRawTransaction(signedTxn.blob).do();

            this.setState({optedIn: false, localProposal: ""})
          }
 

        
          
         
        }catch(err){
          console.log(err)
        }
      }

      async NoOp (sender, index) {
        try{

        let client = new algosdk.Algodv2("", "https://node.algoexplorerapi.io/", "")
        
          let params = await client.getTransactionParams().do()
          params.fee = 1000;
          params.flatFee = true;  
          
          const appArgs = []
         

          const accounts = []
          const foreignApps = undefined
            
          const foreignAssets = [this.props.activeNft[0]]
          
          let txn = algosdk.makeApplicationNoOpTxn(sender, params, index, appArgs, accounts, foreignApps, foreignAssets);
          const singleTxnGroups = [{txn: txn, signers: [this.props.activeAddress]}]

          if (this.props.wallet == "pera") {
            const signedTxn = await peraWallet.signTransaction([singleTxnGroups])

            let txId = await client.sendRawTransaction(signedTxn).do();

            this.setState({localProposal: [this.state.proposal1, this.state.proposal2, this.state.proposal3]})
          }
          else if (this.props.wallet == "myalgo") {
            const myAlgoWallet = new MyAlgo()

            const signedTxn = await myAlgoWallet.signTransaction(txn.toByte());

            let txId = await client.sendRawTransaction(signedTxn.blob).do();

            this.setState({localProposal: [this.state.proposal1, this.state.proposal2, this.state.proposal3]})
          }
          
         
        }catch(err){
          console.log(err)
        }
      }

      handleChange(event) {
        const target = event.target;
        let value = target.type === 'checkbox' ? target.checked : target.value;
        const name = target.name;

        if (value < 0) {
          value = 0
        }
    
        this.setState({
        [name]: value
    
        });
      }

      async assetTransaction() {

        let client = new algosdk.Algodv2("", "https://node.algoexplorerapi.io/", "")

        const indexerClient = new algosdk.Indexer('', 'https://algoindexer.algoexplorerapi.io', '');

        let params = await client.getTransactionParams().do();

        let optedin2 = false

        let opted2 = await indexerClient.lookupAssetBalances(this.state.available2[0]).do();
        opted2.balances.forEach((account) => {
          console.log(account)
          if(account.address == this.props.activeAddress) {
            optedin2 = true
          }
        })

        if (optedin2) {

          let txn1 = algosdk.makeAssetTransferTxnWithSuggestedParams(
            this.props.activeAddress, 
            "FU6ROUCD4M77UBHJCUFPQR4FPLT35NZKDABAKJP2X6W7WS4EWWUYLBKVRQ", 
            undefined, 
            undefined,
            1,  
            undefined, 
            this.state.trade5[0], 
            params
          );

          let txn2 = algosdk.makeAssetTransferTxnWithSuggestedParams(
            this.props.activeAddress, 
            "FU6ROUCD4M77UBHJCUFPQR4FPLT35NZKDABAKJP2X6W7WS4EWWUYLBKVRQ", 
            undefined, 
            undefined,
            1,  
            undefined, 
            this.state.trade5[1], 
            params
          );

          let txn3 = algosdk.makeAssetTransferTxnWithSuggestedParams(
            this.props.activeAddress, 
            "FU6ROUCD4M77UBHJCUFPQR4FPLT35NZKDABAKJP2X6W7WS4EWWUYLBKVRQ", 
            undefined, 
            undefined,
            1,  
            undefined, 
            this.state.trade5[2], 
            params
          );

          let txn4 = algosdk.makeAssetTransferTxnWithSuggestedParams(
            this.props.activeAddress, 
            "FU6ROUCD4M77UBHJCUFPQR4FPLT35NZKDABAKJP2X6W7WS4EWWUYLBKVRQ", 
            undefined, 
            undefined,
            1,  
            undefined, 
            this.state.trade5[3], 
            params
          );

          let txn5 = algosdk.makeAssetTransferTxnWithSuggestedParams(
            this.props.activeAddress, 
            "FU6ROUCD4M77UBHJCUFPQR4FPLT35NZKDABAKJP2X6W7WS4EWWUYLBKVRQ", 
            undefined, 
            undefined,
            1,  
            undefined, 
            this.state.trade5[4], 
            params
          );

          const appArgs = []
          appArgs.push(
            new Uint8Array(Buffer.from("trade"))
          )

          const accounts = []
          const foreignApps = undefined
            
          const foreignAssets = [this.state.trade5[0], this.state.trade5[1], this.state.trade5[2], this.state.trade5[3], this.state.trade5[4], this.state.available2[0]]
          
          let atxn = algosdk.makeApplicationNoOpTxn(this.props.activeAddress, params, 861419580, appArgs, accounts, foreignApps, foreignAssets);
          
          let txns = [txn1, txn2, txn3, txn4, txn5, atxn]

          let txgroup = algosdk.assignGroupID(txns)

          let multipleTxnGroups

          if (this.props.wallet == "pera") {

            multipleTxnGroups = [
              {txn: txn1, signers: [this.props.activeAddress]},
              {txn: txn2, signers: [this.props.activeAddress]},
              {txn: txn3, signers: [this.props.activeAddress]},
              {txn: txn4, signers: [this.props.activeAddress]},
              {txn: txn5, signers: [this.props.activeAddress]},
              {txn: atxn, signers: [this.props.activeAddress]},
            ];

            const signedTxn = await peraWallet.signTransaction([multipleTxnGroups])

            let txId = await client.sendRawTransaction(signedTxn).do();

          }
          else if (this.props.wallet == "myalgo") {

            multipleTxnGroups = [
              txn1.toByte(),
              txn2.toByte(),
              txn3.toByte(),
              txn4.toByte(),
              txn5.toByte(),
              atxn.toByte(),
            ];

            const myAlgoWallet = new MyAlgo()

            const signedTxn = await myAlgoWallet.signTransaction(multipleTxnGroups);

            let txId = await client.sendRawTransaction([signedTxn[0].blob, signedTxn[1].blob, signedTxn[2].blob, signedTxn[3].blob, signedTxn[4].blob, signedTxn[5].blob]).do();

          }

        }

        else {

          let txn = algosdk.makeAssetTransferTxnWithSuggestedParams(
            this.props.activeAddress, 
            this.props.activeAddress, 
            undefined, 
            undefined,
            0,  
            undefined, 
            this.state.available2[0], 
            params
          );

          const singleTxnGroups = [{txn: txn, signers: [this.props.activeAddress]}]

          if (this.props.wallet == "pera") {
            const signedTxn = await peraWallet.signTransaction([singleTxnGroups])

            let txId = await client.sendRawTransaction(signedTxn).do();

          }
          else if (this.props.wallet == "myalgo") {
            const myAlgoWallet = new MyAlgo()

            const signedTxn = await myAlgoWallet.signTransaction(txn.toByte());

            let txId = await client.sendRawTransaction(signedTxn.blob).do();

          }

        }

      
      }

    render() {

      let contract = 861419580  

      console.log(this.state)

        return (
            <div className={styles.trade}>
              
              <Typography className={muisty.h6} variant="h6" align="center"> 5 Tier 1 Warriors = 1 Tier 2 Warrior </Typography>
                <br />
                <Typography className={muisty.h6} variant="h6" align="center"> Select 5 Tier 1 Warriors </Typography>
                <br />
                <Grid container>
                {this.props.ownedNfts.length > 0 ?
                  this.props.ownedNfts.map((nft, index) => {
                    if (nft["asset-id"] >= 818167963 && nft["asset-id"] < 846867259) {
                      return (
                        <Grid key={index} item xs={12} sm={6}>
                        <Button className={muisty.tradebtn}                     
                        onClick={() => 
                          this.state.trade5.includes(nft["asset-id"]) ? 
                          this.setState({trade5: this.state.trade5.filter(value => value != nft["asset-id"])})
                          :
                          this.setState(prevState => ({trade5: [...prevState.trade5, nft["asset-id"]]}))
                        }
                        >
                          <Typography className={muisty.tradebtnt}
                            style={{                              
                              color: this.state.trade5.includes(nft["asset-id"]) ? "#000000" : "#FFFFFF", 
                              backgroundColor: this.state.trade5.includes(nft["asset-id"]) ? "#FFFFFF" : "#000000", 
                              fontFamily: "Consolas"
                            }}
                          > 
                          {nft["asset-id"]} 
                          </Typography>
                        </Button>
                        </Grid>
                        )
                    }
                    
                  })
                :
                  null
                }
                </Grid>
                <br />

                
                <br />
                {this.state.optedIn == false ? 
                <Button className={muisty.contractbtn} onClick={() => this.Optin(this.props.activeAddress, contract)}>
                     <Typography className={muisty.contractbtnt} variant="h6"> Opt in </Typography>
                </Button>

                :
                <>
                  {this.state.trade5.length == 5 ?
                  <>
                    <Typography className={muisty.h6} variant="h6" align="center"> Note: The first transaction will opt you into the next available Tier 2 Warrior </Typography>
                    <br />
                    <Button className={muisty.contractbtn} onClick={() => this.assetTransaction()}>
                      <Typography className={muisty.contractbtnt} variant="h6"> Trade </Typography>
                    </Button>
                  </>
                    :
                    null
                  }
                  
                  <Button className={muisty.contractbtn} onClick={() => this.Closeout(this.props.activeAddress, contract)}>
                      <Typography className={muisty.contractbtnt} variant="h6"> Opt out </Typography>
                  </Button>
                </>
                }
                <br />

              <Button className={muisty.contractbtn} onClick={() => window.open("https://algoexplorer.io/application/" + contract)}>
                  <Typography className={muisty.contractbtnt} variant="h6"> View Contract </Typography>
              </Button>
                
                
            </div>
        )
    }
    
}