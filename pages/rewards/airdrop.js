import React from "react"

import algosdk from "algosdk"

import { CSVLink, CSVDownload } from "react-csv";

import { BarChart, XAxis, YAxis, Bar, Tooltip, ResponsiveContainer} from "recharts"

import Load from "../../components/contracts/Rewards/Load"


import { Grid, Typography, Button, TextField, Select, MenuItem, Link, Checkbox } from "@mui/material"

export default class Airdrop extends React.Component { 

    constructor(props) {
        super(props);
        this.state = {
            loadAmount: "",
            loadAsset: "",
            basedAsset: "",
            flat: false,
            sendAmount: "",
            sendAsset: "",
            freq: "once",
            darkList: [],
            startFrom: "",
            note: "",
            notify: false,
            accounts: [],
            quote: [],
            assetBasedInfo: null,
            assetSendInfo: null,
            update: ""


            
        };
        this.handleChange = this.handleChange.bind(this)
        this.generateAccounts = this.generateAccounts.bind(this)
        this.generateQuote = this.generateQuote.bind(this)


    }

    async componentDidMount() {

     

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

    async generateAccounts() {

      try {

      this.setState({accounts: []})

      const token = {
        'X-API-Key': process.env.indexerKey
      }
  
      const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)

      const assetInfo = await indexerClient.lookupAssetByID(this.state.basedAsset).do();

      this.setState({
        assetBasedInfo: assetInfo.asset
      })

      let decimals = assetInfo.asset.params.decimals
      let div = 10**decimals

      let assetHoldings = await indexerClient.lookupAssetBalances(this.state.basedAsset)
      .limit(1000).do();

      assetHoldings.balances.forEach((account) => {

        if (account.amount > 0) {
     
        this.setState(prevState => ({
          accounts: [...prevState.accounts, {address: account.address, amount: account.amount, amountAtomic: (account.amount / div).toFixed(decimals)}]
        }))

        }
      })

      let assetsLen = assetHoldings.balances.length
      let assetsNext = assetHoldings["next-token"]
  
      while (assetsLen == 1000) {

        assetHoldings = await indexerClient.lookupAssetBalances(this.state.basedAsset).nextToken(assetsNext)
        .limit(1000).do();
  
        assetHoldings.balances.forEach((account) => {

          if (account.amount > 0) {

            this.setState(prevState => ({
              accounts: [...prevState.accounts, {address: account.address, amount: account.amount, amountAtomic: (account.amount / div)}]
            }))

          }
       
          
        })
  
        assetsLen = assetHoldings.balances.length
        assetsNext = assetHoldings["next-token"]
      }
    }
    catch(error) {
      props.sendDiscordMessage(error, "Gen Accounts")
    }
  }

  async generateQuote() {

    try {

    this.setState({quote: []})


    const token = {
      'X-API-Key': process.env.indexerKey
    }

    const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)

    let senderOpted = []

      let assetHoldings = await indexerClient.lookupAssetBalances(this.state.sendAsset)
      .limit(1000).do();

      assetHoldings.balances.forEach((account) => {
     
        senderOpted.push(account.address)
      })

      let assetsLen = assetHoldings.balances.length
      let assetsNext = assetHoldings["next-token"]
  
      while (assetsLen == 1000) {

        assetHoldings = await indexerClient.lookupAssetBalances(this.state.sendAsset).nextToken(assetsNext)
        .limit(1000).do();
  
        assetHoldings.balances.forEach((account) => {
     
          senderOpted.push(account.address)
        })
  
        assetsLen = assetHoldings.balances.length
        assetsNext = assetHoldings["next-token"]
      }

    const assetInfo = await indexerClient.lookupAssetByID(this.state.sendAsset).do();

    this.setState({
      assetSendInfo: assetInfo.asset
    })

    let decimals = assetInfo.asset.params.decimals
    let div = 10**decimals

    let darkList = []

    if (this.state.darkList.length > 0) {
      darkList = this.state.darkList.replace(/\s/g, "").split(",")
    }

    
    let numRemoved = 0

    let found = true

    if (this.state.startFrom.length == 58) {
      found = false
    }

    this.state.accounts.forEach((account) => {
      if (senderOpted.includes(account.address) && !darkList.includes(account.address)) {
        if (found) {
          
          this.setState(prevState => ({
            quote: [...prevState.quote, {address: account.address, basedAmount: account.amount, basedAmountAtomic: account.amountAtomic, sendAmount: this.state.flat ? (div * Number(this.state.sendAmount)) : Math.floor(account.amountAtomic * div * Number(this.state.sendAmount)), sendAmountAtomic: this.state.flat ? Number(this.state.sendAmount) : (account.amountAtomic * Number(this.state.sendAmount)).toFixed(decimals)}]
          }))
        }
        else if (account.address == this.state.startFrom) {
          found = true
          
          this.setState(prevState => ({
            quote: [...prevState.quote, {address: account.address, basedAmount: account.amount, basedAmountAtomic: account.amountAtomic, sendAmount: this.state.flat ? (div * Number(this.state.sendAmount)) : Math.floor(account.amountAtomic * div * Number(this.state.sendAmount)), sendAmountAtomic: this.state.flat ? Number(this.state.sendAmount) : (account.amountAtomic * Number(this.state.sendAmount)).toFixed(decimals)}]
          }))
        }
        else {
          numRemoved += 1
        }
        
      }
      else {
        numRemoved += 1
      }
      
    })

    this.setState({
      numRemoved: numRemoved
    })

  }
  catch(error) {
    props.sendDiscordMessage(error, "Gen Quote")
  }

  }



  renderTooltip = (props) => {
    const { active, payload } = props;

    if (active && payload && payload.length) {
    const data = payload[0] && payload[0].payload;
    return (
        <div >
        
        <Typography color="secondary">{(data.address).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</Typography>

        </div>
    );
    }

    return null;
  };

  renderQuoteTooltip = (props) => {
    const { active, payload } = props;

    if (active && payload && payload.length) {
    const data = payload[0] && payload[0].payload;
    return (
        <div >
        
        <Typography color="secondary">{Number(data.sendAmountAtomic)}</Typography>

        </div>
    );
    }

    return null;
  };



    render() {

      console.log(this.state.quote)

      let accountHeaders = [
        { label: "address", key: "address" },
        { label: "amount", key: "amount" },
        { label: "amountAtomic", key: "amountAtomic" },
      ];

      let quoteHeaders = [
        { label: "address", key: "address" },
        { label: "basedAmount", key: "basedAmount" },
        { label: "basedAmountAtomic", key: "basedAmountAtomic" },
        { label: "sendAmount", key: "sendAmount" },
        { label: "sendAmountAtomic", key: "sendAmountAtomic" }

      ];

      let quoteTotal = 0

      this.state.quote.forEach((account) => {
        quoteTotal += Number(account.sendAmountAtomic)
      })

      let sortedAccounts = this.state.accounts.sort((a, b) => (a.amount < b.amount) ? 1 : -1)

      let sortedQuote = this.state.quote.sort((a, b) => (a.sendAmount < b.sendAmount) ? 1 : -1)



        return (
            <div >

              <Grid container spacing={3} align="center" style={{padding: 20, borderRadius: 15}}>
              <Grid item xs={12} sm={12} md={12} >
              <Link onClick={() => window.open("https://algoexplorer.io/address/66YD7UICVBBL6QG2THOIOPRONTNPYNJ7EUAFRBY4PCKTVV6MQIMMYTAHFE")} style={{color: "#FFFFFF"}}>View Contract</Link>

              </Grid>
               
               <Grid item xs={12} sm={12} md={12} >
               <Typography color="secondary" variant="h6" align="center"> I want to send assets based on:  </Typography>
                <br />
               <TextField                
                    onChange={this.handleChange}
                    value={this.state.basedAsset}
                    multiline
                    type="number"
                    label="Based Asset ID"
                    name="basedAsset"
                    autoComplete="false"
                    InputProps={{ style: { color: "white", borderBottom: "1px solid white", marginRight: 20 } }}
                    InputLabelProps={{ style: { color: "white" } }}
                   
                    style={{
                    color: "black",
                    background: "black",
                    borderRadius: 15,
                    margin: "auto",
                    width: "30%"
                   
                    }}
                  />
                  <br />
                  </Grid>
                  <Grid item xs={12} sm={12} md={12} >
                  {this.state.basedAsset ? 
                    <Button variant="contained" color="secondary" style={{display: "flex", margin: "auto"}} onClick={() => this.generateAccounts()}>
                      <Typography align="center" color="primary" variant="h6" > Get accounts </Typography>
                    </Button>
                    :
                    null
                  }
                  <br />
                  {this.state.accounts.length > 0 && this.state.assetBasedInfo ?
                  <div>
                    <Typography align="center" color="secondary" variant="h6" > Accounts found: {this.state.accounts.length}  </Typography>
                    <CSVLink data={this.state.accounts} headers={accountHeaders} enclosingCharacter={``} filename={"airdropAccounts.csv"}>Download CSV</CSVLink>
                    <Grid container spacing={3} align="center" style={{padding: 20, borderRadius: 15, marginTop: 20}}>
                      <Grid item xs={12} sm={12} md={12} >
                        <Typography align="center" variant="h5" color="secondary"> {this.state.assetBasedInfo.params["unit-name"]} Holders </Typography>
                        <ResponsiveContainer width="100%" height={115} >
                        <BarChart data={sortedAccounts}>
                        <XAxis 
                        hide={true}
                        />
                        <YAxis 
                        dataKey="amount" 
                        hide="true"
              
                        />
                        <Tooltip content={this.renderTooltip} />
                        <Bar dataKey="address" fill="#000000"/>
                        <Bar dataKey="amount" fill="#000000" stroke="#FFFFFF"/>
                        </BarChart>
                        </ResponsiveContainer>
                        <Typography color="secondary" style={{display: "flex", float: "left"}}> 1 </Typography>
                        <Typography color="secondary" style={{display: "flex", float: "right"}}> {sortedAccounts.length} </Typography>
                      </Grid>
                      <Grid item xs={12} sm={12} md={12} >
                      <Typography align="center" color="secondary" variant="subtitle1" > Flat Amount? </Typography>

                        <Checkbox
                          value={this.state.flat}
                          name="flat"
                          onChange={this.handleChange}
                          color="secondary"
                          sx={{
                            color: "white",
                            '&.Mui-checked': {
                            color: "white",
                            },
                          }}
                        />
                        <br />
                        {this.state.flat ?
                        <Typography color="secondary" variant="h6" align="center"> Based on this account data, I would like to send:  </Typography>

                        :
                        <Typography color="secondary" variant="h6" align="center"> Based on this account data, for every {this.state.assetBasedInfo.params.name} ({this.state.assetBasedInfo.params["unit-name"]}) an account has, I would like to send:  </Typography>
                        }

                    
                        
                        <br />
                      </Grid>
                    <Grid item xs={12} sm={12} md={12} style={{display: "flex"}}>
                    
                        <TextField                
                          onChange={this.handleChange}
                          value={this.state.sendAsset}
                          multiline
                          type="number"
                          label="Send Asset ID"
                          name="sendAsset"
                          autoComplete="false"
                          InputProps={{ style: { color: "white" } }}
                          InputLabelProps={{ style: { color: "white" } }}
                        
                          style={{
                          color: "black",
                          background: "black",
                          borderRadius: 15,
                          margin: "auto",
                          width: "30%"
                        
                          }}
                        />
                        <TextField                
                          onChange={this.handleChange}
                          value={this.state.sendAmount}
                          multiline
                          type="number"
                          label="Send Amount"
                          name="sendAmount"
                          autoComplete="false"
                          InputProps={{ style: { color: "white" } }}
                          InputLabelProps={{ style: { color: "white" } }}
                        
                          style={{
                          color: "black",
                          background: "black",
                          borderRadius: 15,
                          margin: "auto",
                          width: "30%"
                        
                          }}
                        />
                        </Grid>
                        <Grid item xs={12} sm={12} md={12} style={{display: "flex"}}>
                        <TextField                
                          onChange={this.handleChange}
                          value={this.state.freq}
                          multiline
                          type="number"
                          label={"Frequency"}
                          name="freq"
                          autoComplete="false"
                          InputProps={{ style: { color: "white" } }}
                          InputLabelProps={{ style: { color: "white" } }}
                        
                          style={{
                          color: "black",
                          background: "black",
                          borderRadius: 15,
                          margin: "auto",
                          width: "30%"
                        
                          }}
                        />
                        <br />
                        </Grid>
                        <Grid item xs={6} sm={3} md={3} >
                        {/* <Button variant="outlined" color="secondary" style={{display: "flex", margin: "auto"}} onClick={() => this.setState({freq: "once"})}>
                        <Typography align="center" color="secondary" variant="h6" > Once </Typography>
                        </Button>
                        </Grid>

                        <Grid item xs={6} sm={3} md={3} >

                        <Button variant="outlined" color="secondary" style={{display: "flex", margin: "auto"}} onClick={() => this.setState({freq: Math.round((1/3.5)*60*60*24)})}>
                        <Typography align="center" color="secondary" variant="h6" > Daily </Typography>
                        </Button>
                        </Grid>
                        <Grid item xs={6} sm={3} md={3} >
                        <Button variant="outlined" color="secondary" style={{display: "flex", margin: "auto"}} onClick={() => this.setState({freq: Math.round((1/3.5)*60*60*24*7)})}>
                          <Typography align="center" color="secondary" variant="h6" > Weekly </Typography>
                        </Button>
                        </Grid>

                        <Grid item xs={6} sm={3} md={3} >

                        <Button variant="outlined" color="secondary" style={{display: "flex", margin: "auto"}} onClick={() => this.setState({freq: Math.round((1/3.5)*60*60*24*7*30)})}>
                          <Typography align="center" color="secondary" variant="h6" > Monthly </Typography>
                        </Button> */}
                        </Grid>
                        <Grid item xs={12} sm={12} md={12} >

                        <TextField                
                          onChange={this.handleChange}
                          value={this.state.darkList}
                          multiline
                          color="secondary"
                          type="text"
                          label="DarkList (comma separated)"
                          name="darkList"
                          autoComplete="false"
                          InputProps={{ style: { color: "white" } }}
                          InputLabelProps={{ style: { color: "white" } }}
                        
                          style={{
                          
                          color: "white",
                          background: "black",
                          borderRadius: 15,
                          margin: "auto",
                          width: "50%"
                        
                          }}
                        />
                        <br />
                        </Grid>
                        <Grid item xs={12} sm={12} md={12} >

                        <TextField                
                          onChange={this.handleChange}
                          value={this.state.startFrom}
                          multiline
                          color="secondary"
                          type="text"
                          label="Start From (address)"
                          name="startFrom"
                          autoComplete="false"
                          InputProps={{ style: { color: "white" } }}
                          InputLabelProps={{ style: { color: "white" } }}
                        
                          style={{
                          
                          color: "white",
                          background: "black",
                          borderRadius: 15,
                          margin: "auto",
                          width: "50%"
                        
                          }}
                        />
                        <br />
                        </Grid>
                        <Grid item xs={12} sm={12} md={12} >

                        <TextField                
                          onChange={this.handleChange}
                          value={this.state.note}
                          multiline
                          color="secondary"
                          type="text"
                          label="Note"
                          name="note"
                          autoComplete="false"
                          InputProps={{ style: { color: "white" } }}
                          InputLabelProps={{ style: { color: "white" } }}
                        
                          style={{
                          
                          color: "white",
                          background: "black",
                          borderRadius: 15,
                          margin: "auto",
                          width: "50%"
                        
                          }}
                        />
                        <br />
                        </Grid>
                        {/* <Grid item xs={12} sm={12} md={12} >

                        <Typography align="center" color="secondary" variant="subtitle1" > Notify? </Typography>

                        <Checkbox
                          value={this.state.notify}
                          name="notify"
                          onChange={this.handleChange}
                          color="secondary"
                          sx={{
                            color: "white",
                            '&.Mui-checked': {
                            color: "white",
                             },
                           }}
                        />
                        </Grid> */}
                        <Grid item xs={12} sm={12} md={12} >

                        {this.state.sendAmount && this.state.sendAsset && this.state.freq ? 
                         <Button variant="contained" color="secondary" style={{display: "flex", margin: "auto"}} onClick={() => this.generateQuote()}>
                         <Typography align="center" color="primary" variant="h6" > Get quote </Typography>
                        </Button>
                        :
                        null
                        }
                        </Grid>
                        <Grid item xs={12} sm={12} md={12} >

                        {this.state.quote.length > 0 ? 
                        <div>
                          <Typography align="center" color="secondary" variant="h6" > Accounts removed: {this.state.numRemoved}  </Typography>
                          <Typography align="center" color="secondary" variant="h6" > Total accounts: {this.state.quote.length}  </Typography>

                          <CSVLink data={this.state.quote} headers={quoteHeaders} enclosingCharacter={``} filename={"airdropQuote.csv"}>Download Quote</CSVLink>
                          <br />
                          <Typography align="center" variant="h6" color="secondary"> Send amounts </Typography>
                          <ResponsiveContainer width="100%" height={115} >
                          <BarChart data={sortedQuote}>
                          <XAxis 
                          hide={true}
                          />
                          <YAxis 
                          dataKey="sendAmount" 
                          hide="true"
                
                          />
                          <Tooltip content={this.renderQuoteTooltip} />
                          <Bar dataKey="address" fill="#000000"/>
                          <Bar dataKey="sendAmount" fill="#000000" stroke="#FFFFFF"/>
                          </BarChart>
                          </ResponsiveContainer>
                          <Typography color="secondary" style={{display: "flex", float: "left"}}> 1 </Typography>
                          <Typography color="secondary" style={{display: "flex", float: "right"}}> {sortedQuote.length} </Typography>
                        </div>
                        :
                        null
                        }
                        </Grid>

                        
                        
                        <br />
                        
                                        
                    </Grid>
                        

                        
                          
                        </div>
                        :
                        null
                        }
                        <br />
                        </Grid>
                  
              </Grid>

              <Grid container spacing={3} align="center" style={{padding: 20, borderRadius: 15}}>
                <Grid item xs={12} sm={12} md={12} >
                  <Load contract={this.props.contracts.airdrop} sendDiscordMessage={this.props.sendDiscordMessage} sendAmount={this.state.sendAmount} sendAsset={this.state.sendAsset} basedAsset={this.state.basedAsset} freq={this.state.freq} quote={this.state.quote} quoteTotal={quoteTotal} notify={this.state.notify} note={this.state.note}  assetSendInfo={this.state.assetSendInfo} setMessage={this.props.setMessage}/>
                 
                  </Grid>
                  <Grid item xs={12} sm={12} md={12} >



                  


                  </Grid>


              </Grid>

            </div>
        )
    }
    
}