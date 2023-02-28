import React from "react"

import MyAlgo from '@randlabs/myalgo-connect';

//43EVULWFT4RU2H7EZH377SAVQJSJO5NZP37N3Y5DZ7PGUXOETKW7VWDIOA

import { PeraWalletConnect } from "@perawallet/connect";

const peraWallet = new PeraWalletConnect();

import algosdk from "algosdk"

import { Grid, Typography, Button, TextField, Modal, Card, FormControl, InputLabel, Select, MenuItem } from "@mui/material"



export default class Create extends React.Component { 

    constructor(props) {
        super(props);
        this.state = {
            descript: "",
            name: "",

            des: null,
            img: null,
           
            imgSelect: null,
            charSelect: null,

            message: "",
            confirm: ""



            
        };
        this.handleChange = this.handleChange.bind(this)
        this.generate = this.generate.bind(this)
        this.pin = this.pin.bind(this)
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

          let address = await algosdk.getApplicationAddress(970700116)

        console.log(address)
 


    }


      handleChange(event) {
        const target = event.target;
        let value = target.type === 'checkbox' ? target.checked : target.value;
        const name = target.name;

        this.setState({
            [name]: value
            });

        
    
        
      }

      async generate() {

        const client = new algosdk.Algodv2("", "https://node.algoexplorerapi.io/", "")

        let params = await client.getTransactionParams().do();

        let ftxn1 = algosdk.makeAssetTransferTxnWithSuggestedParams(
          this.props.activeAddress, 
          "5W64M4ZT4ERRI4AW77HMSO63YHYZVJTRGM6WC7RQIM3YJOLOPYPTXHMU6I", 
          undefined,
          undefined,
          5000, 
          undefined,
          601894079,
          params
        );

        let ftxn2 = algosdk.makeAssetTransferTxnWithSuggestedParams(
          this.props.activeAddress, 
          "VWYCYQ3H3PPNIGON4H363DIH7BP33TTZWUUUNMTDXCIHRCDPFOMU7VJ5HM", 
          undefined,
          undefined,
          5000, 
          undefined,
          601894079,
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

              let txId = await client.sendRawTransaction(signedTxn).do();

              this.setState({
                message: "Sending Transaction..."
              })

              let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);

              this.setState({
                message: "Generating character..."
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
                
      
                this.setState({
                  img: generatedImage,
                  message: ""
                })
              
            }
  
            catch (error) {
              this.setState({
                message: "Transaction Denied"
              })
              console.log(error)
            }
            
  
          }
  
          else if (this.props.wallet == "myalgo") {

            try {

            multipleTxnGroups = [
              ftxn1.toByte(),
              ftxn2.toByte()
            ];

            const myAlgoWallet = new MyAlgo()

            const signedTxn = await myAlgoWallet.signTransaction(multipleTxnGroups);

            let txId = await client.sendRawTransaction([signedTxn[0].blob, signedTxn[1].blob]).do();

            this.setState({
              message: "Sending Transaction..."
            })

            let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);
            
            this.setState({
              message: "Generating character..."
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
              
    
              this.setState({
                img: generatedImage,
                message: ""
              })

          }

          catch (error) {
            this.setState({
              message: "Transaction Denied"
            })
            console.log(error)
          }
  
          
        }


        

      }

      async pin() {

        this.setState({
          confirm: "Pinning..."
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

        console.log(session)

        this.setState({
          confirm: "Pinned"
        })

        let ipfs = session.result.IpfsHash

        const client = new algosdk.Algodv2("", "https://node.algoexplorerapi.io/", "")

        let params = await client.getTransactionParams().do();

        console.log(this.state)

        const creator = this.props.activeAddress;
        const defaultFrozen = false;    
        const unitName = "DCCHAR"; 
        const assetName = this.state.name;
        const url = "https://gateway.pinata.cloud/ipfs/" + ipfs;
        const managerAddr = undefined; 
        const reserveAddr = undefined;  
        const freezeAddr = undefined;
        const clawbackAddr = undefined;
        const total = 1;                // NFTs have totalIssuance of exactly 1
        const decimals = 0;             // NFTs have decimals of exactly 0
        const note = new Uint8Array(Buffer.from("Description: " + this.state.descript + " Moves: " + this.state.des))
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

        if (this.props.wallet == "pera") {
  
          try {

            const singleTxnGroups = [{txn: mtxn, signers: [this.props.activeAddress]}];
           
            const signedTxn = await peraWallet.signTransaction([singleTxnGroups]) 

            let txId = await client.sendRawTransaction(signedTxn).do();

            this.setState({
              confirm: "Sending Transaction..."
            })

            let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);


            this.setState({
              message: "Transaction Confirmed, Character Successfully Minted.",
              name: "",
              descript: "",
              des: null,
              img: null
            })
  
            
          }

          catch (error) {
            console.log(error)
          }
          

        }

        else if (this.props.wallet == "myalgo") {

          try {

          const myAlgoWallet = new MyAlgo()

          const signedTxn = await myAlgoWallet.signTransaction(mtxn.toByte());

          let txId = await client.sendRawTransaction(signedTxn.blob).do();

          this.setState({
            confirm: "Sending Transaction..."
          })

          let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);        

          this.setState({
            message: "Transaction Confirmed, Character Successfully Minted.",
            name: "",
            descript: "",
            des: null,
            img: null
          })

        }

        catch (error) {
          console.log(error)
        }

        
      }


      }


      
      

    render() {


        return (
            <div>
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
                        
                      <Button 
                      variant="contained"
                      color="secondary"
                      style={{
                        display: "flex",
                        margin: "auto"
                      }}
                      onClick={() => this.pin() 
                        }>
                      <Typography  variant="h6"> Mint </Typography>
                      </Button>
                      <br />
                      <Typography align="center" color="secondary" variant="h6"> {this.state.confirm} </Typography>

                    </div>
                    :
                    <img src="CharBack.png" style={{display: "flex", margin: "auto", width: "70%", maxWidth: 500}} />

                   
                    }
                
            </div>
        )
    }
    
}