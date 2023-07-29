import React from "react"

import algosdk, { seedFromMnemonic } from "algosdk"

import { Typography, Button, TextField } from "@mui/material"

import { PeraWalletConnect } from "@perawallet/connect";

const peraWallet = new PeraWalletConnect();


export default class DisplayChar extends React.Component { 

    constructor(props) {
        super(props);
        this.state = {
            nft: null,
            nftUrl: null,
            svg: null,
            price: "",
            message: ""
            
        };
        this.chooseCharacter = this.chooseCharacter.bind(this)
        this.claimNft = this.claimNft.bind(this)
        this.buyNft = this.buyNft.bind(this)
        this.handleChange = this.handleChange.bind(this)

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


        let response = await fetch('/api/getNft', {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                nftId: this.props.nftId
              }),
            
                
            });
        
        let session = await response.json()


        let charStats = null

            const token = {
                'X-API-Key': process.env.indexerKey
            }
          
            const indexerClient = new algosdk.Indexer(token, 'https://mainnet-algorand.api.purestake.io/idx2', '');
    
            let assetConfig = await indexerClient.lookupAssetTransactions(this.props.nftId)
            .txType("acfg")
            .do();

            

            charStats = atob(assetConfig.transactions[0].note)
        
        
        this.setState({
            nft: session.assets[0].params,
            nftUrl: "https://gateway.pinata.cloud/ipfs/" + session.assets[0].params.url.slice(34),
            charStats: charStats
        })
          
      }

      async chooseCharacter() {

        const token = {
            'X-API-Key': process.env.indexerKey
        }
      
        const indexerClient = new algosdk.Indexer(token, 'https://mainnet-algorand.api.purestake.io/idx2', '');

        let optedin = false

        let response = await indexerClient.lookupAccountAppLocalStates(this.props.activeAddress).do();
        response["apps-local-states"].forEach((localstate) => {
            if (localstate.id == this.props.contract) {
                optedin = true
            }
        })


        const client = new algosdk.Algodv2(token, 'https://mainnet-algorand.api.purestake.io/ps2', '')  
              
        let params = await client.getTransactionParams().do()

        const appArgs = []
        

        const accounts = []
        const foreignApps = []
            
        const foreignAssets = [this.props.nftId]

        const boxes = []

        if (optedin) {

            appArgs.push(
                new Uint8Array(Buffer.from("select")),
                new Uint8Array(Buffer.from(this.state.nft.name))
            )

            let txn = algosdk.makeApplicationNoOpTxn(this.props.activeAddress, params, this.props.contract, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
            const singleTxnGroups = [{txn: txn, signers: [this.props.activeAddress]}]

            if (this.props.wallet == "pera") {
                const signedTxn = await peraWallet.signTransaction([singleTxnGroups])
                this.setState({message: "Sending Transaction..."})


                let txId = await client.sendRawTransaction(signedTxn).do();

                let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);        


                this.setState({message: "Transaction Confirmed, Character Successfully Chosen."})

            }
            else if (this.props.wallet == "myalgo") {
                
                const myAlgoWallet = new MyAlgo()

                const signedTxn = await myAlgoWallet.signTransaction(txn.toByte());

                this.setState({message: "Sending Transaction..."})


                let txId = await client.sendRawTransaction(signedTxn.blob).do();

                let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);        


                this.setState({message: "Transaction Confirmed, Character Successfully Chosen."})
            }

        }

        else {

            appArgs.push(

                new Uint8Array(Buffer.from(this.state.nft.name))
            )

            let txn = algosdk.makeApplicationOptInTxn(this.props.activeAddress, params, this.props.contract, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
            const singleTxnGroups = [{txn: txn, signers: [this.props.activeAddress]}]

            if (this.props.wallet == "pera") {
                const signedTxn = await peraWallet.signTransaction([singleTxnGroups])
                this.setState({message: "Sending Transaction..."})


                let txId = await client.sendRawTransaction(signedTxn).do();

                let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);        


                this.setState({message: "Transaction Confirmed, Character Successfully Chosen."})

            }
            else if (this.props.wallet == "myalgo") {
                const myAlgoWallet = new MyAlgo()

                const signedTxn = await myAlgoWallet.signTransaction(txn.toByte());
                this.setState({message: "Sending Transaction..."})


                let txId = await client.sendRawTransaction(signedTxn.blob).do();

                let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);        


                this.setState({message: "Transaction Confirmed, Character Successfully Chosen."})
            }
        }
        



      }

      handleChange(event) {
        const target = event.target;
        let value = target.type === 'checkbox' ? target.checked : target.value;
        const name = target.name;

        if (String(value).length < 9) {
            this.setState({
                [name]: value
                });
        }

        

        
    
        
      }

      async sendToMarket() {

        const token = {
            'X-API-Key': process.env.indexerKey
        }

        const client = new algosdk.Algodv2(token, 'https://mainnet-algorand.api.purestake.io/ps2', '')

        let params = await client.getTransactionParams().do()

        let ftxn = algosdk.makePaymentTxnWithSuggestedParams(
            this.props.activeAddress, 
            "VI66S7AN2G4HKUD7DXJUSVEP54MDJ42NGDOUUD3LQJSCU7WT5UU2KAIHAU", 
            300000, 
            undefined,
            undefined,
            params
          );

          const singleTxnGroups = [{txn: ftxn, signers: [this.props.activeAddress]}]

          if (this.props.wallet == "pera") {
            const signedTxn = await peraWallet.signTransaction([singleTxnGroups])
            this.setState({message: "Sending Transaction..."})


            let txId = await client.sendRawTransaction(signedTxn).do();

            let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);        


        }
          let appArgs = []
        

          let accounts = []
          let foreignApps = []
              
          let foreignAssets = [this.props.nftId]
    
          let boxes = []
  
          appArgs.push(
              new Uint8Array(Buffer.from("optin"))
          )
  
          let otxn = algosdk.makeApplicationNoOpTxn("YRVK422KP65SU4TBAHY34R7YT3OYFOL4DUSFR4UADQEQHS2HMXKORIC6TE", params, 1035432580, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);

          let userMnemonic = process.env.DCwallet
        let userAccout =  algosdk.mnemonicToSecretKey(userMnemonic)
        // Sign the transaction
        let signedTxn = otxn.signTxn(userAccout.sk);

        this.setState({
        message: "Opting contract into asset..."
        })

    
        // Submit the transaction
        let { txId } = await client.sendRawTransaction(signedTxn).do()


        let confirmedTxn = await algosdk.waitForConfirmation(client, txId, 4);

        let stxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
            "YRVK422KP65SU4TBAHY34R7YT3OYFOL4DUSFR4UADQEQHS2HMXKORIC6TE", 
            "VI66S7AN2G4HKUD7DXJUSVEP54MDJ42NGDOUUD3LQJSCU7WT5UU2KAIHAU", 
            undefined,
            undefined,
            1, 
            undefined,
            this.props.nftId,
            params
          );

        appArgs = []
        

        accounts = []
        foreignApps = []
            
        foreignAssets = [this.props.nftId]

        let sellBox = new Uint8Array(Buffer.from(String(this.props.nftId) + ">" + String(this.state.price)))

        boxes = [{appIndex: 0, name: sellBox}]

        appArgs.push(
            new Uint8Array(Buffer.from("sell")),
            new Uint8Array(Buffer.from(String(this.props.nftId) + ">" + String(this.state.price))),
            new Uint8Array(Buffer.from(this.props.activeAddress)),
        )

        let atxn = algosdk.makeApplicationNoOpTxn("YRVK422KP65SU4TBAHY34R7YT3OYFOL4DUSFR4UADQEQHS2HMXKORIC6TE", params, 1035432580, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
        
        let txns = [stxn, atxn]

        let txGroup = algosdk.assignGroupID(txns);
        
        let signedTxn1 = stxn.signTxn(userAccout.sk);
        let signedTxn2 = atxn.signTxn(userAccout.sk);

        let signed = [signedTxn1, signedTxn2]


        this.setState({
          message: "Sending asset to contract.."
        })

    
        // Submit the transaction
        txId = await client.sendRawTransaction(signed).do()

        confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);

        this.setState({
            message: "Asset listed in marketplace."
          })
      }

      async claimNft() {

        const token = {
            'X-API-Key': process.env.indexerKey
        }

        const client = new algosdk.Algodv2(token, 'https://mainnet-algorand.api.purestake.io/ps2', '')

        let params = await client.getTransactionParams().do()

        let otxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
            this.props.activeAddress, 
            this.props.activeAddress, 
            undefined,
            undefined,
            0, 
            undefined,
            this.props.nftId,
            params
          );

          const singleTxnGroups = [{txn: otxn, signers: [this.props.activeAddress]}]

          if (this.props.wallet == "pera") {

            
              const signedTxn = await peraWallet.signTransaction([singleTxnGroups])
              this.setState({message: "Opting in..."})


              let txId = await client.sendRawTransaction(signedTxn).do();

              let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);        

          }
          
        

        let ttxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
            "YRVK422KP65SU4TBAHY34R7YT3OYFOL4DUSFR4UADQEQHS2HMXKORIC6TE", 
            this.props.activeAddress, 
            undefined,
            undefined,
            1, 
            undefined,
            this.props.nftId,
            params
          );

          const userMnemonic = process.env.DCwallet
          const userAccout =  algosdk.mnemonicToSecretKey(userMnemonic)
          // Sign the transaction
          let signedTxn = ttxn.signTxn(userAccout.sk);
  
          // Submit the transaction
          const { txId } = await client.sendRawTransaction(signedTxn).do()

          this.setState({
            message: "Transfering Asset..."
          })
  
  
          let confirmedTxn = await algosdk.waitForConfirmation(client, txId, 4);

          this.setState({
            message: "Asset Transfered."
          })

      }

      async buyNft() {

        const token = {
            'X-API-Key': process.env.indexerKey
        }
      
        const indexerClient = new algosdk.Indexer(token, 'https://mainnet-algorand.api.purestake.io/idx2', '');


        const assetBalances = await indexerClient.lookupAssetBalances(this.props.nftId).do();

        let accounts = []

        assetBalances.balances.forEach((account) => {
            accounts.push(account.address)
        })



        if (!accounts.includes(this.props.activeAddress)) {

            const token = {
                'X-API-Key': process.env.indexerKey
            }
    
            const client = new algosdk.Algodv2(token, 'https://mainnet-algorand.api.purestake.io/ps2', '')

            let params = await client.getTransactionParams().do()


            let otxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
                this.props.activeAddress, 
                this.props.activeAddress, 
                undefined,
                undefined,
                0, 
                undefined,
                Number(this.props.nftId),
                params
              );

              const singleTxnGroups = [{txn: otxn, signers: [this.props.activeAddress]}]

          if (this.props.wallet == "pera") {

            
              const signedTxn = await peraWallet.signTransaction([singleTxnGroups])
              this.setState({message: "Opting in..."})


              let txId = await client.sendRawTransaction(signedTxn).do();

              let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);
              
              this.setState({message: "Asset opted in."})

          }

        }
        else {

        const token = {
            'X-API-Key': process.env.indexerKey
        }

        const client = new algosdk.Algodv2(token, 'https://mainnet-algorand.api.purestake.io/ps2', '')        
            let params = await client.getTransactionParams().do()

            let nftBox = await client.getApplicationBoxByName(this.props.contract, this.props.nftId + ">" + this.props.price).do();

            let address = new TextDecoder().decode(nftBox.value)



            let stxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
                this.props.activeAddress, 
                address, 
                undefined,
                undefined,
                Number(this.props.price) * 1000000, 
                undefined,
                1088771340,
                params
              );
    
            let appArgs = []
            
    
            let accounts = [address]
            let foreignApps = []
                
            let foreignAssets = [Number(this.props.nftId)]
    
            let sellBox = new Uint8Array(Buffer.from(String(this.props.nftId) + ">" + String(this.props.price)))
    
            let boxes = [{appIndex: 0, name: sellBox}]
    
            appArgs.push(
                new Uint8Array(Buffer.from("buy")),
                new Uint8Array(Buffer.from(String(this.props.nftId))),
                new Uint8Array(Buffer.from(String(this.props.price))),
                new Uint8Array(Buffer.from(String(address))),

            )
    
            let atxn = algosdk.makeApplicationNoOpTxn(this.props.activeAddress, params, this.props.contract, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
            
            let txns = [stxn, atxn]
    
            let txGroup = algosdk.assignGroupID(txns);

            let multipleTxnGroups

            if (this.props.wallet == "pera") {
  
                try {
                  multipleTxnGroups = [
                    {txn: stxn, signers: [this.props.activeAddress]},
                    {txn: atxn, signers: [this.props.activeAddress]}
                  ];
      
                  const signedTxn = await peraWallet.signTransaction([multipleTxnGroups]) 
    
                  let txId = await client.sendRawTransaction(signedTxn).do();
    
                  this.setState({
                    message: "Sending Transaction..."
                  })
    
                  let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);
    
    
                  this.setState({
                    message: "Transaction Confirmed, Asset Successfully Purchased."
                  })
        
                  
                }
      
                catch (error) {
                  this.setState({
                    message: "Transaction Denied"
                  })
                  this.props.sendDiscordMessage("Arena/Character", props.activeAddress, error)
                }
                
      
              }



        }


      }


    render() {

    
        if (this.state.nft) {
            if (this.props.select) {
                return (
                    <div >
                        <Typography color="secondary" align="center" style={{margin: 20}} variant="h6"> {this.state.nft.name} </Typography>

                        <Button style={{display: "flex", margin: "auto"}} onClick={() => this.props.setNft(null)}>
                        <img src={this.state.nftUrl} style={{display: "flex", margin: "auto", width: "70%", maxWidth: 500, borderRadius: 5}} />


                        </Button>


                        <Typography color="secondary" align="center" style={{margin: 20}} variant="subtitle1"> {this.state.charStats} </Typography>
                        <br />
                        <Typography color="secondary" align="center" variant="h6"> {this.state.message} </Typography>

                        <br />


                        <Button variant="contained" color="secondary"  style={{display: "flex", margin: "auto"}} onClick={() => this.chooseCharacter()} >
                            
                        <Typography color="primary" align="center" variant="h6"> Select </Typography>
                    </Button>
                    <br />
                   


                    </div>
        
                )

            }
            else if (this.props.create) {
                return (
                    <div >
                        <Typography color="secondary" align="center" style={{margin: 20}} variant="h6"> {this.state.nft.name} </Typography>

                        <Button style={{display: "flex", margin: "auto"}} onClick={() => this.props.setNft(null)}>
                        <img src={this.state.nftUrl} style={{display: "flex", margin: "auto", width: "70%", maxWidth: 500, borderRadius: 5}} />


                        </Button>


                        <Typography color="secondary" align="center" style={{margin: 20, marginBottom: 0}} variant="subtitle1"> {this.state.charStats} </Typography>
                        <br />
                        <Typography color="secondary" align="center" variant="h6"> {this.state.message} </Typography>

                        <br />


                        <Button variant="contained" color="secondary"  style={{display: "flex", margin: "auto"}} onClick={() => this.claimNft()} >
                            
                        <Typography color="primary" align="center" variant="h6"> Claim </Typography>

                        
                    </Button>
                    <br />

                    <Typography color="secondary" align="center" variant="h6"> Or </Typography>

                    <br />

                    <TextField                
                    onChange={this.handleChange}
                    value={this.state.price}
                    type="number"
                    label=""
                    name="price"
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

                    <Button variant="contained" color="secondary"  style={{display: "flex", margin: "auto"}} onClick={() => this.sendToMarket()} >
                            
                    <Typography color="primary" variant="h6" align="center"> Sell for {Number(this.state.price).toLocaleString("en-US")} </Typography>
                        <img src="invDC.svg" style={{display: "flex", margin: "auto", width: 50, padding: 10}} />
                        <Typography  variant="h6"> Fee = 0.3 </Typography>
                        <img src="AlgoBlack.svg" style={{display: "flex", margin: "auto", width: 40, padding: 10}} />
                        
                    </Button>
                 
                

                <br />
                   


                    </div>
                )
            }
            else if (this.props.leaderboard) {
                return (
                <img style={{width: 200, borderRadius: 5}} src={this.state.nftUrl} />
                )

            }
            else if (this.props.buy) {
                return (
                    <div >
                        <Typography color="secondary" align="center" style={{margin: 20}} variant="h6"> {this.state.nft.name} </Typography>

                        <Button style={{display: "flex", margin: "auto"}} onClick={() => this.props.setNft(null)}>
                        <img src={this.state.nftUrl} style={{display: "flex", margin: "auto", width: "70%", maxWidth: 500, borderRadius: 5}} />


                        </Button>


                        <Typography color="secondary" align="center" style={{margin: 20}} variant="subtitle1"> {this.state.charStats} </Typography>
                        <br />
                        <Typography color="secondary" align="center" variant="h6"> {this.state.message} </Typography>

                        <br />


                        <Button variant="contained" color="secondary"  style={{display: "flex", margin: "auto", padding: 10}} onClick={() => this.buyNft()} >
                            
                        <Typography color="primary" align="center" variant="h6"> 
                        Buy 
                        <img style={{width: 50, paddingLeft: 10, paddingRight: 10}} src="./invDC.svg"/>
                        {(this.props.price).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
 
                        </Typography>
                    </Button>
                    <br />
                   


                    </div>
                )
            }
            
            else {
                return (
                    <Button style={{display: "block"}} onClick={() => this.props.setNft(this.props.nftId, this.props.price)} >
                        <Typography color="secondary" style={{position: "absolute", bottom: this.props.price ? 55 : 15, left: 15}} align="left" variant="caption"> {this.state.nft.name} </Typography>
                        <img style={{width: "100%", borderRadius: 5}} src={this.state.nftUrl} />
                        {this.props.price ? 
                        <Typography color="secondary" align="center" variant="h6"> 
                        <img style={{width: 50, paddingRight: 20}} src="./invDC.svg"/>
                        {(this.props.price).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
 
                        </Typography>
                        :
                        null
                        }
                       

                    </Button>
        
                )
            }
            
        }

        else {
            return (
                <div>                   
                </div>
    
            )
        }
       
        
    }
    
}