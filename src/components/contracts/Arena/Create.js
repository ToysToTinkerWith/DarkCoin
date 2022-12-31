import React from "react"

import MyAlgo from '@randlabs/myalgo-connect';

//43EVULWFT4RU2H7EZH377SAVQJSJO5NZP37N3Y5DZ7PGUXOETKW7VWDIOA

import { PeraWalletConnect } from "@perawallet/connect";

const peraWallet = new PeraWalletConnect();

import algosdk from "algosdk"

import { Grid, Typography, Button, TextField, Modal, Card, FormControl, InputLabel, Select, MenuItem } from "@mui/material"

import muisty from "../../../muistyles.module.css"

import races from "./races"
import classes from "./classes"

export default class Create extends React.Component { 

    constructor(props) {
        super(props);
        this.state = {
            race: "",
            class: "",
            health: 0,
            energy: 0,
            melee: 0,
            ranged: 0,
            magic: 0,
            fire: 0,
            water: 0,
            nature: 0,
            electric: 0,
            poison: 0,
            light: 0,
            dark: 0,

            img1: null,
            img2: null,
            img3: null,
            img4: null,
            imgSelect: "",

            message: ""



            
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

      async generate(race, clas) {

        this.setState({
          message: "Generating images..."
        })

        let response = await fetch('/api/generateImage', {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
                race: race,
                clas: clas
            }),
            
              
          });

          const session = await response.json()

          let generatedImage1 = session.image1
          let generatedImage2 = session.image2
          let generatedImage3 = session.image3
          let generatedImage4 = session.image4

          this.setState({
            img1: generatedImage1,
            img2: generatedImage2,
            img3: generatedImage3,
            img4: generatedImage4,
            message: "Choose an Avatar"
          })



      }

      async pin(name, race, clas) {

        let response = await fetch('/api/pinUrl', {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
              url: this.state.imgSelect,
              name: name,
              race: race,
              clas: clas
              
          }),
          
            
        });

        const session = await response.json()

        let ipfs = session.result.IpfsHash

        console.log(ipfs)

        const client = new algosdk.Algodv2("", "https://node.algoexplorerapi.io/", "")

        let params = await client.getTransactionParams().do();

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
        const note = new Uint8Array(Buffer.from(`{
          "standard": "arc69",
          "description": "Dark Coin Character NFT",
          "media_url": ${url},
          "properties": {
            "Race": "Human",
            "Class": "Barb"
          }
        }`))
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
              confirm: "Transaction Confirmed, Proposal Successfully Sent"
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

          let txId = await client.sendRawTransaction(signedTxn[0].blob).do();

          this.setState({
            confirm: "Sending Transaction..."
          })

          let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);        

          this.setState({
            confirm: "Transaction Confirmed, Proposal Successfully Sent"
          })

        }

        catch (error) {
          console.log(error)
        }

        
      }


      }


      
      

    render() {

        console.log(this.state)

        let health = 0
        let energy = 0
        let melee = 0
        let ranged = 0
        let magic = 0
        let fire = 0
        let water = 0
        let nature = 0
        let electric = 0
        let poison = 0
        let light = 0
        let dark = 0

        races.forEach((race) => {
            if (race.name == this.state.race) {
                health = race.stats.health,
                energy = race.stats.energy,
                melee = race.stats.melee,
                ranged = race.stats.ranged,
                magic = race.stats.magic,
                fire = race.stats.fire,
                water = race.stats.water,
                nature = race.stats.nature,
                electric = race.stats.electric,
                poison = race.stats.poison,
                light = race.stats.light,
                dark = race.stats.dark
            }
        })

        classes.forEach((clas) => {
            if (clas.name == this.state.class) {
                    health = health + clas.stats.health,
                    energy = energy + clas.stats.energy,
                    melee = melee + clas.stats.melee,
                    ranged = ranged + clas.stats.ranged,
                    magic = magic + clas.stats.magic,
                    fire = fire + clas.stats.fire,
                    water = water + clas.stats.water,
                    nature = nature + clas.stats.nature,
                    electric = electric + clas.stats.electric,
                    poison = poison + clas.stats.poison,
                    light = light + clas.stats.light,
                    dark = dark + clas.stats.dark
            }
        })

        return (
            <div>
              <br />
              <Typography color="secondary" variant="h6" align="center"> Create a character: </Typography>
              <br />

              <Grid container>
                <Grid item xs={12} sm={6}>
                    <Typography color="secondary" variant="h6" align="center"> Race </Typography>

                    <FormControl fullWidth>
                    <Select
                        value={this.state.race}
                        name="race"
                        onChange={this.handleChange}
                        style={{
                            background: "white",
                            borderRadius: 5,
                            display: "flex",
                            margin: "auto",
                            width: 200,
                            marginBottom: 50
                        
                        }}
                    >
                        <MenuItem value={"Human"}> <Typography color="primary" variant="subtitle1" align="center"> Human </Typography> </MenuItem>
                        <MenuItem value={"Elf"}> <Typography color="primary" variant="subtitle1" align="center"> Elf </Typography> </MenuItem>
                        <MenuItem value={"Dwarf"}> <Typography color="primary" variant="subtitle1" align="center"> Dwarf </Typography> </MenuItem>
                        <MenuItem value={"Halfling"}> <Typography color="primary" variant="subtitle1" align="center"> Halfling </Typography> </MenuItem>
                        <MenuItem value={"Orc"}> <Typography color="primary" variant="subtitle1" align="center"> Orc </Typography> </MenuItem>
                        <MenuItem value={"Goblin"}> <Typography color="primary" variant="subtitle1" align="center"> Goblin </Typography> </MenuItem>
                        <MenuItem value={"Giant"}> <Typography color="primary" variant="subtitle1" align="center"> Giant </Typography> </MenuItem>
                        <MenuItem value={"Dragonborn"}> <Typography color="primary" variant="subtitle1" align="center"> Dragonborn </Typography> </MenuItem>
                        <MenuItem value={"Skeleton"}> <Typography color="primary" variant="subtitle1" align="center"> Skeleton </Typography> </MenuItem>
                        <MenuItem value={"Robot"}> <Typography color="primary" variant="subtitle1" align="center"> Robot </Typography> </MenuItem>
                        <MenuItem value={"Gnome"}> <Typography color="primary" variant="subtitle1" align="center"> Gnome </Typography> </MenuItem>
                        <MenuItem value={"Faerie"}> <Typography color="primary" variant="subtitle1" align="center"> Faerie </Typography> </MenuItem>
                        <MenuItem value={"Ratfolk"}> <Typography color="primary" variant="subtitle1" align="center"> Ratfolk </Typography> </MenuItem>
                        <MenuItem value={"Catfolk"}> <Typography color="primary" variant="subtitle1" align="center"> Catfolk </Typography> </MenuItem>
                        <MenuItem value={"Merfolk"}> <Typography color="primary" variant="subtitle1" align="center"> Merfolk </Typography> </MenuItem>
                        <MenuItem value={"Centaur"}> <Typography color="primary" variant="subtitle1" align="center"> Centaur </Typography> </MenuItem>
                        <MenuItem value={"Minotaur"}> <Typography color="primary" variant="subtitle1" align="center"> Minotaur </Typography> </MenuItem>
                        <MenuItem value={"Soltari"}> <Typography color="primary" variant="subtitle1" align="center"> Soltari </Typography> </MenuItem>
                        <MenuItem value={"Treefolk"}> <Typography color="primary" variant="subtitle1" align="center"> Treefolk </Typography> </MenuItem>
                        <MenuItem value={"Lizardfolk"}> <Typography color="primary" variant="subtitle1" align="center"> Lizardfolk </Typography> </MenuItem>

                    </Select>
                    </FormControl>

                </Grid>
                <Grid item xs={12} sm={6}>
                <Typography color="secondary" variant="h6" align="center"> Class </Typography>

                    <FormControl fullWidth>
                    <Select
                        value={this.state.class}
                        name="class"
                        onChange={this.handleChange}
                        style={{
                            background: "white",
                            borderRadius: 5,
                            display: "flex",
                            margin: "auto",
                            width: 200,
                            marginBottom: 50
                        
                        }}
                    >
                        <MenuItem value={"Barbarian"}> <Typography color="primary" variant="subtitle1" align="center"> Barbarian </Typography> </MenuItem>
                        <MenuItem value={"Bard"}> <Typography color="primary" variant="subtitle1" align="center"> Bard </Typography> </MenuItem>
                        <MenuItem value={"Cleric"}> <Typography color="primary" variant="subtitle1" align="center"> Cleric </Typography> </MenuItem>
                        <MenuItem value={"Druid"}> <Typography color="primary" variant="subtitle1" align="center"> Druid </Typography> </MenuItem>
                        <MenuItem value={"Knight"}> <Typography color="primary" variant="subtitle1" align="center"> Knight </Typography> </MenuItem>
                        <MenuItem value={"Monk"}> <Typography color="primary" variant="subtitle1" align="center"> Monk </Typography> </MenuItem>
                        <MenuItem value={"Paladin"}> <Typography color="primary" variant="subtitle1" align="center"> Paladin </Typography> </MenuItem>
                        <MenuItem value={"Ranger"}> <Typography color="primary" variant="subtitle1" align="center"> Ranger </Typography> </MenuItem>
                        <MenuItem value={"Rogue"}> <Typography color="primary" variant="subtitle1" align="center"> Rogue </Typography> </MenuItem>
                        <MenuItem value={"Sorcerer"}> <Typography color="primary" variant="subtitle1" align="center"> Sorcerer </Typography> </MenuItem>
                        <MenuItem value={"Warlock"}> <Typography color="primary" variant="subtitle1" align="center"> Warlock </Typography> </MenuItem>
                        <MenuItem value={"Battlemage"}> <Typography color="primary" variant="subtitle1" align="center"> Battlemage </Typography> </MenuItem>
                        <MenuItem value={"Alchemist"}> <Typography color="primary" variant="subtitle1" align="center"> Alchemist </Typography> </MenuItem>
                        <MenuItem value={"Stormcaller"}> <Typography color="primary" variant="subtitle1" align="center"> Stormcaller </Typography> </MenuItem>
                        <MenuItem value={"Pyromancer"}> <Typography color="primary" variant="subtitle1" align="center"> Pyromancer </Typography> </MenuItem>
                        <MenuItem value={"Hunter"}> <Typography color="primary" variant="subtitle1" align="center"> Hunter </Typography> </MenuItem>
                        <MenuItem value={"Researcher"}> <Typography color="primary" variant="subtitle1" align="center"> Researcher </Typography> </MenuItem>
                        <MenuItem value={"Geomancer"}> <Typography color="primary" variant="subtitle1" align="center"> Geomancer </Typography> </MenuItem>
                        <MenuItem value={"Aquamancer"}> <Typography color="primary" variant="subtitle1" align="center"> Aquamancer </Typography> </MenuItem>
                        <MenuItem value={"Witchdoctor"}> <Typography color="primary" variant="subtitle1" align="center"> Witchdoctor </Typography> </MenuItem>

                    </Select>
                    </FormControl>
                    
                </Grid>
              </Grid>

              <Typography color="secondary" variant="h6" align="center"> Stats </Typography>
                <br />
              <Grid container>
                <Grid item xs={6} sm={4} md={3}>
                    <Typography color="secondary" variant="h6" align="center"> Health: {health} </Typography>
                    <br />
                </Grid>
                <Grid item xs={6} sm={4} md={3}>
                    <Typography color="secondary" variant="h6" align="center"> Energy: {energy} </Typography>
                    <br />
                </Grid>
                <Grid item xs={6} sm={4} md={3}>
                    <Typography color="secondary" variant="h6" align="center"> Melee: {melee} </Typography>
                    <br />
                </Grid>
                <Grid item xs={6} sm={4} md={3}>
                    <Typography color="secondary" variant="h6" align="center"> Ranged: {ranged} </Typography>
                    <br />
                </Grid>
                <Grid item xs={6} sm={4} md={3}>
                    <Typography color="secondary" variant="h6" align="center"> Magic: {magic} </Typography>
                    <br />
                </Grid>
                <Grid item xs={6} sm={4} md={3}>
                    <Typography color="secondary" variant="h6" align="center"> Fire: {fire} </Typography>
                    <br />
                </Grid>
                <Grid item xs={6} sm={4} md={3}>
                    <Typography color="secondary" variant="h6" align="center"> Water: {water} </Typography>
                    <br />
                </Grid>
                <Grid item xs={6} sm={4} md={3}>
                    <Typography color="secondary" variant="h6" align="center"> Nature: {nature} </Typography>
                    <br />
                </Grid>
                <Grid item xs={6} sm={4} md={3}>
                    <Typography color="secondary" variant="h6" align="center"> Electric: {electric} </Typography>
                    <br />
                </Grid>
                <Grid item xs={6} sm={4} md={3}>
                    <Typography color="secondary" variant="h6" align="center"> Poison: {poison} </Typography>
                    <br />
                </Grid>
                <Grid item xs={6} sm={4} md={3}>
                    <Typography color="secondary" variant="h6" align="center"> Light: {light} </Typography>
                    <br />
                </Grid>
                <Grid item xs={6} sm={4} md={3}>
                    <Typography color="secondary" variant="h6" align="center"> Dark: {dark} </Typography>
                    <br />
                </Grid>

              </Grid>

              
                       <br />
                    
                {this.state.race && this.state.class ?
                  <>
                    <Typography align="center" color="secondary" variant="h6">Avatar </Typography>
                    <br />
                    {this.props.activeAddress ? 
                
                      <Button className={muisty.contractbtn} onClick={() => this.generate(this.state.race, this.state.class)}>
                      <Typography  variant="h6"> Generate 200 </Typography>
                      <img src="invDC.svg" style={{display: "flex", margin: "auto", width: 50, padding: 10}} />


                      </Button>
                        
                      
                      :
                      <Button className={muisty.contractbtn} onClick={() => window.scrollTo(0, 0)}>
                          <Typography  variant="h6"> Connect Wallet </Typography>
                      </Button>
                    }
                    <br />
                    <Typography align="center" color="secondary" variant="h6"> {this.state.message} </Typography>
                    <br />
                    <Grid container>
                      <Grid item xs={6} sm={3} md={3}>
                        <Button style={{display: "flex", margin: "auto", width: "100%", padding: 10}} onClick={() => this.setState({imgSelect: this.state.img1})}>
                          <img src={this.state.img1} style={{width: "100%", borderRadius: 15, border: this.state.imgSelect == this.state.img1 ? "3px solid white" : null}} />
                        </Button>
                      </Grid>
                      <Grid item xs={6} sm={3} md={3}>
                        <Button style={{display: "flex", margin: "auto", width: "100%", padding: 10}} onClick={() => this.setState({imgSelect: this.state.img2})}>
                          <img src={this.state.img2} style={{width: "100%", borderRadius: 15, border: this.state.imgSelect == this.state.img2 ? "3px solid white" : null}} />
                        </Button>                  
                      </Grid>
                      <Grid item xs={6} sm={3} md={3}>
                        <Button style={{display: "flex", margin: "auto", width: "100%", padding: 10}} onClick={() => this.setState({imgSelect: this.state.img3})}>
                          <img src={this.state.img3} style={{width: "100%", borderRadius: 15, border: this.state.imgSelect == this.state.img3 ? "3px solid white" : null}} />
                        </Button>                  
                      </Grid>
                      <Grid item xs={6} sm={3} md={3}>
                        <Button style={{display: "flex", margin: "auto", width: "100%", padding: 10}} onClick={() => this.setState({imgSelect: this.state.img4})}>
                          <img src={this.state.img4} style={{width: "100%", borderRadius: 15, border: this.state.imgSelect == this.state.img4 ? "3px solid white" : null}} />
                        </Button>                  
                      </Grid>
                    </Grid>
                    
                  </>
                :
                  null
                }
                <br />

                {this.state.imgSelect ? 
                <>
                  <Typography align="center" color="secondary" variant="h6"> Character Name </Typography>

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
                  width: 200
                
                  }}
                  />
                </>
                :
                  null
                }
                <br />

                {this.state.name ? 
                  <Button className={muisty.contractbtn} 
                  onClick={() => this.pin(
                    this.state.name, 
                    this.state.race, 
                    this.state.class, 
                    health,
                    energy,
                    melee,
                    ranged,
                    magic,
                    fire,
                    water,
                    nature,
                    electric,
                    poison,
                    light,
                    dark)}>
                   <Typography  variant="h6"> Create </Typography>
                  </Button>
                :
                null
                }
                
            </div>
        )
    }
    
}