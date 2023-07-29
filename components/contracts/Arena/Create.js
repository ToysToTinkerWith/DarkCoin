import React from "react"

//43EVULWFT4RU2H7EZH377SAVQJSJO5NZP37N3Y5DZ7PGUXOETKW7VWDIOA

import { PeraWalletConnect } from "@perawallet/connect";

const peraWallet = new PeraWalletConnect();

import algosdk from "algosdk"

import DisplayChar from "./DisplayChar";

import { Grid, Typography, Button, TextField, Modal, Card, FormControl, InputLabel, Select, MenuItem } from "@mui/material"



export default class Create extends React.Component { 

    constructor(props) {
        super(props);
        this.state = {
            descript: "",
            name: "",

            des: null,
            img: null,
           
            minted: [],

            charSelect: null,

            message: "",
            confirm: ""            
        };
        this.handleChange = this.handleChange.bind(this)
        this.generate = this.generate.bind(this)
        this.pin = this.pin.bind(this)
        this.sendDiscordMessage = this.sendDiscordMessage.bind(this)
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

          const token = {
            'X-API-Key': process.env.indexerKey
        }
      
        const indexerClient = new algosdk.Indexer(token, 'https://mainnet-algorand.api.purestake.io/idx2', '');

          let ownedAssets = []

          let accountAssets = await indexerClient.lookupAccountAssets(this.props.activeAddress).do();

        
            accountAssets.assets.forEach((asset) => {
                if (asset.amount == 1) {
                    ownedAssets.push(asset["asset-id"])
                }
            })


            let numAccAssets = accountAssets.assets.length
            let nextAccToken = accountAssets["next-token"]

            while (numAccAssets == 1000) {

                accountAssets = await indexerClient.lookupAccountAssets(this.props.activeAddress).nextToken(nextAccToken).do();

                accountAssets.assets.forEach((asset) => {
                  if (asset.amount == 1) {
                    ownedAssets.push(asset["asset-id"])
                  }
                })

                numAccAssets = accountAssets.assets.length
                nextAccToken = accountAssets["next-token"]

            }

            let contract = []

            let contractAssets = await indexerClient.lookupAccountAssets("YRVK422KP65SU4TBAHY34R7YT3OYFOL4DUSFR4UADQEQHS2HMXKORIC6TE").do();

        
            contractAssets.assets.forEach((asset) => {
                if (asset.amount == 1) {
                  contract.push(asset["asset-id"])
                }
            })


            let conAccAssets = accountAssets.assets.length
            let conAccToken = accountAssets["next-token"]

            while (numAccAssets == 1000) {

              contractAssets = await indexerClient.lookupAccountAssets("YRVK422KP65SU4TBAHY34R7YT3OYFOL4DUSFR4UADQEQHS2HMXKORIC6TE").nextToken(nextAccToken).do();

              contractAssets.assets.forEach((asset) => {
                  if (asset.amount == 1) {
                    contract.push(asset["asset-id"])
                  }
                })

                conAccAssets = accountAssets.assets.length
                conAccToken = accountAssets["next-token"]

            }


          let accountCreatedAssets = await indexerClient.lookupAccountCreatedAssets("YRVK422KP65SU4TBAHY34R7YT3OYFOL4DUSFR4UADQEQHS2HMXKORIC6TE").do();

          accountCreatedAssets.assets.forEach((asset) => {
            if (asset.params.reserve == this.props.activeAddress && !ownedAssets.includes(asset.index) && contract.includes(asset.index)) {
              this.setState(prevState => ({
                minted: [...prevState.minted, asset.index]
              }))
            }

          })

          let numAssets = accountCreatedAssets.assets.length
          let nextToken = accountCreatedAssets["next-token"]

            while (numAssets == 1000) {

              accountCreatedAssets = await indexerClient.lookupAccountCreatedAssets("YRVK422KP65SU4TBAHY34R7YT3OYFOL4DUSFR4UADQEQHS2HMXKORIC6TE").do();

              accountCreatedAssets.assets.forEach((asset) => {
                if (asset.params.reserve == this.props.activeAddress && !ownedAssets.includes(asset.index)) {
                  this.setState(prevState => ({
                    minted: [...prevState.minted, asset.index]
                  }))
                }
    
              })

                numAssets = accountCreatedAssets.assets.length
                nextToken = accountCreatedAssets["next-token"]

            }

    }


      handleChange(event) {
        const target = event.target;
        let value = target.type === 'checkbox' ? target.checked : target.value;
        const name = target.name;

        if (String(event.nativeEvent.data) != ">") {
          this.setState({
            [name]: value
            });
        }
        
      }

      async generate() {

        const token = {
            'X-API-Key': process.env.indexerKey
        }

      
        const indexerClient = new algosdk.Indexer(token, 'https://mainnet-algorand.api.purestake.io/idx2', '');
        
        const accountAssets = await indexerClient.lookupAccountAssets(this.props.activeAddress).assetId(1088771340).do();

        let accountDC = accountAssets.assets[0].amount

        if (accountDC >= 10000) {

       
          

        const client = new algosdk.Algodv2(token, 'https://mainnet-algorand.api.purestake.io/ps2', '')

        let params = await client.getTransactionParams().do();

        let ftxn1 = algosdk.makeAssetTransferTxnWithSuggestedParams(
          this.props.activeAddress, 
          "5W64M4ZT4ERRI4AW77HMSO63YHYZVJTRGM6WC7RQIM3YJOLOPYPTXHMU6I", 
          undefined,
          undefined,
          5000000000, 
          undefined,
          1088771340,
          params
        );

        let ftxn2 = algosdk.makeAssetTransferTxnWithSuggestedParams(
          this.props.activeAddress, 
          "VWYCYQ3H3PPNIGON4H363DIH7BP33TTZWUUUNMTDXCIHRCDPFOMU7VJ5HM", 
          undefined,
          undefined,
          5000000000, 
          undefined,
          1088771340,
          params
        );

        let txns = [ftxn1, ftxn2]

          let txgroup = algosdk.assignGroupID(txns)

          let multipleTxnGroups

         
  
          if (this.props.wallet == "pera") {
  
            try {
              multipleTxnGroups = [
                {txn: ftxn1, signers: [this.props.activeAddress]},
                {txn: ftxn2, signers: [this.props.activeAddress]}
              ];
  
              const signedTxn = await peraWallet.signTransaction([multipleTxnGroups])

              this.setState({
                message: "Generating Image..."
              })

              let response = await fetch('/api/generateImage', {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  description: this.state.descript
                }),
                
                  
              });
    
              const session = await response.json()
    
              let generatedImage = session.image

              if (generatedImage) {

                this.setState({
                  message: "Sending Transaction..."
                })
                
  
                let txId = await client.sendRawTransaction(signedTxn).do();

  
                let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);

                this.setState({
                  img: generatedImage,
                  message: "Generating Move Set..."
                })
  
                let res = await fetch('/api/generateChar', {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                      descript: this.state.descript,
                      name: this.state.name
                  }),
                  
                    
                });
        
                const sess = await res.json()
        
                let des = sess.response.text
                
                this.setState({
                  des: des,
                  message: "Minting Asset..."
                })
  
                await this.pin()

              
                this.setState({
                  message: "Character Creation Success."
                })

              }

              else {
                this.setState({
                  message: "Image not created, possible content policy violation."
                })
              }
              
            }
  
            catch (error) {
              this.setState({
                message: "Transaction Denied"
              })
              this.props.sendDiscordMessage("Arena/Create", props.activeAddress, error)
            }
            
  
          }

        }

        else {
          this.setState({
            message: "Transaction Denied, 10,000 Dark Coin required."
          })
        }

      }

      async pin() {

        this.setState({
          message: "Pinning..."
        })

        let response = await fetch('/api/pinUrl', {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
              url: this.state.img,
              des: this.state.des,
              name: this.state.name
          }),
          
            
        });

        const session = await response.json()

        let ipfs = session.result.IpfsHash

        

        const token = {
          'X-API-Key': process.env.indexerKey
      }

      const client = new algosdk.Algodv2(token, 'https://mainnet-algorand.api.purestake.io/ps2', '')
      
        let params = await client.getTransactionParams().do();

        const creator = "YRVK422KP65SU4TBAHY34R7YT3OYFOL4DUSFR4UADQEQHS2HMXKORIC6TE";
        const defaultFrozen = false;    
        const unitName = "DCCHAR"; 
        const assetName = this.state.name;
        const url = "https://gateway.pinata.cloud/ipfs/" + ipfs;
        const managerAddr = "YRVK422KP65SU4TBAHY34R7YT3OYFOL4DUSFR4UADQEQHS2HMXKORIC6TE";
        const reserveAddr = this.props.activeAddress;  
        const freezeAddr = undefined;
        const clawbackAddr = undefined;
        const total = 1;                // NFTs have totalIssuance of exactly 1
        const decimals = 0;             // NFTs have decimals of exactly 0
        const note = new Uint8Array(Buffer.from("Description: " + this.state.descript.substring(0, 500) + " Moves: " + this.state.des))
        const mtxn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
        from:creator,
        total,
        decimals,
        assetName,
        unitName,
        assetURL: url,
        assetMetadataHash: undefined,
        defaultFrozen,
        freeze: freezeAddr,
        manager: managerAddr,
        clawback: clawbackAddr,
        reserve: reserveAddr,
        note: note,
        suggestedParams: params});

        const userMnemonic = process.env.DCwallet
        const userAccout =  algosdk.mnemonicToSecretKey(userMnemonic)
        // Sign the transaction
        let signedTxn = mtxn.signTxn(userAccout.sk);

        this.setState({
          message: "Pinned. Minting Asset..."
        })

    
        // Submit the transaction
        const { txId } = await client.sendRawTransaction(signedTxn).do()

        let confirmedTxn = await algosdk.waitForConfirmation(client, txId, 4);

        this.setState(prevState => ({
          minted: [...prevState.minted, confirmedTxn["asset-index"]]
        }))

        await this.sendDiscordMessage(assetName, url)


      


      }


      async sendDiscordMessage(name, url) {
       
        const response = await fetch(process.env.discordWebhook, {
          method: "POST",
          body: JSON.stringify({ 
            username: "Arena Create",
            embeds: [{
              "title" : name + " has appeared!",
              "url": url,
              "image": {
                "url": String(url)
              }
            }]
          }),
          headers: {
            "Content-Type": "application/json",
          },
        });
      }
      
      

    render() {

      if (this.state.charSelect) {
        return(
          <DisplayChar contract={this.state.contract} create={true} style={{position: "absolute"}} nftId={this.state.charSelect} activeAddress={this.props.activeAddress} wallet={this.props.wallet} setNft={(nftId) => this.setState({charSelect: nftId})} sendErrorMessage={this.sendErrorMessage}/>
        )
      }

      else {
        return (
          <div>
            <Grid container align="center">
                  {this.state.minted.length > 0 ? 
                  
                  this.state.minted.map((asset, index) => {
                      return (
                          <Grid key={index} item xs={6} sm={4} md={3} lg={2} style={{position: "relative"}} >
                              <DisplayChar contract={this.state.contract} style={{position: "absolute"}} nftId={asset} activeAddress={this.props.activeAddress} wallet={this.props.wallet} setNft={(nftId) => this.setState({charSelect: nftId})} sendErrorMessage={this.sendErrorMessage}/>
                          </Grid>
                      )
                  })
                  :
                  null
                  }
                  </Grid>
            <br />
            <Typography color="secondary" variant="h6" align="center"> Describe your character: </Typography>
            <br />
            <TextField                
                  onChange={this.handleChange}
                  value={this.state.descript}
                  multiline
                  type="text"
                  rows={3}
                  label=""
                  name="descript"
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
              <Typography color="secondary" variant="h6" align="center"> Name your character: </Typography>
            <br />
              <TextField                
                  onChange={this.handleChange}
                  value={this.state.name}
                  
                  type="text"
                  label=""
                  name="name"
                  autoComplete="false"
                  InputProps={{ style: { color: "black" } }}
                 
                  style={{
                  color: "black",
                  background: "white",
                  borderRadius: 15,
                  display: "flex",
                  margin: "auto",
                  width: "30%"
                 
                  }}
                />
              
           

            
                     <br />
                     <Typography align="center" color="secondary" variant="h6"> {this.state.message} </Typography>
                  <br />
                  
                  {this.props.activeAddress ? 
              
                    <Button variant="contained" color="secondary" style={{display: "flex", margin: "auto"}} onClick={() => this.generate()} >
                    <Typography  variant="h6"> Generate 10,000 </Typography>
                    <img src="invDC.svg" style={{display: "flex", margin: "auto", width: 50, padding: 10}} />
                    </Button>
                    :
                    <Button onClick={() => window.scrollTo(0, 0)}>
                        <Typography  variant="h6"> Connect Wallet </Typography>
                    </Button>
                  }
                  <br />
                  
                  
             
              <br />
              {this.state.des && this.state.img ? 
                  <div style={{position: "relative"}}>
                    <img src={this.state.img} style={{display: "flex", margin: "auto", width: "70%", maxWidth: 500}} />
                    <br />
                    <Typography align="center" color="secondary" variant="h6" style={{padding: 10}}> {this.state.name} </Typography>
                    <br />
                    <Typography align="center" color="secondary" variant="subtitle1" style={{padding: 20}}> {this.state.des} </Typography>
                    <br />
                      
                    <Typography align="center" color="secondary" variant="h6"> {this.state.confirm} </Typography>

                  </div>
                  :
                  null
                 
                  }
              
          </div>
      )

      }

        
    }
    
}