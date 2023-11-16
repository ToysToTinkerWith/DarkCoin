import React, { useState } from 'react'
import { useWallet } from '@txnlab/use-wallet'

import { Button, Typography, Grid, Popover } from '@mui/material';

import ContentCopyIcon from '@mui/icons-material/ContentCopy';

export default function Connect(props) {
  const { providers, activeAccount } = useWallet()

  const [open, setOpen] = useState(false)
  const [DCAssets, setDCAssets] = useState([])
  const [addrAssets, setAddrAssets] = useState([])



  React.useEffect(() => {

    const fetchData = async () => {

      if (activeAccount) {

        let wallet = []

      const response = await fetch('/api/getDCAssets', {
        method: "POST",
        body: JSON.stringify({
        }),
        headers: {
          "Content-Type": "application/json",
        }
          
      });
    
      const session = await response.json()


      setDCAssets(session)

      const response2 = await fetch('/api/getAddrAssets', {
        method: "POST",
        body: JSON.stringify({
          activeAccount: activeAccount.address,
        }),
        headers: {
          "Content-Type": "application/json",
        }
          
      });
    
      const session2 = await response2.json()


      setAddrAssets(session2)


      session.forEach((asset => {
        let index = session2.indexOf(asset.index)
        if (index > -1) {
          wallet.push(asset)
        }
      }))


      props.setWallet(wallet)

      } 

    }
    try {
    fetchData();
    }
    catch(error) {
       props.sendDiscordMessage(error, "Fetch Connect", activeAccount.address)
     }

        

    }, [activeAccount])

    let dc = 0
    let daos = 0
    let warrior1 = 0
    let warrior2 = 0

    addrAssets

  

  return (
    <div style={{position: "fixed", right: 20, top: 20, zIndex: 50, border: "1px solid white", backgroundColor: "black", borderRadius: 15}}>

      {activeAccount ?
      <Button
      variant="text"
      style={{
        
        padding: 20
      }}
      onClick={() => setOpen(!open)} 
      >
        <Typography color="secondary" > Connected </Typography>
    </Button>
      :
      <Button
        variant="text"
        style={{
          padding: 20
        }}
        onClick={() => setOpen(!open)}
        >
          <Typography color="secondary" > Connect Wallet </Typography>
      </Button>
      }
      
  {open ? 
  <div style={{backgroundColor: "black"}}>
  {activeAccount ? 
  <div style={{padding: 10}}>
    <Button onClick={() => navigator.clipboard.writeText(activeAccount.address)}>
    <ContentCopyIcon color="secondary" />
    </Button>
  <Typography color="secondary" variant="caption">
    {activeAccount.address.substring(0,10)}
  </Typography>
  </div>
  :
  null
  }
  {providers?.map((provider) => (
    <div key={'provider-' + provider.metadata.id} style={{margin: 30, marginTop: 0}}>
      <Typography color="secondary">
        <img width={30} height={30} style={{margin: 10, color: "#FAFAFA", borderRadius: 15}} alt="" src={provider.metadata.icon} />
        {provider.metadata.name} {provider.isActive && '[active]'}
      </Typography>
      <div>
        <hr />
        {!provider.isConnected ? 
        <Button color="secondary" variant="outlined" style={{borderRadius: 15, display: "flex", margin: "auto"}} onClick={provider.connect} >
        Connect
        </Button>
        :
        null
        }
        {provider.isConnected ? 
        <Button color="secondary" variant="outlined" style={{borderRadius: 15, display: "flex", margin: "auto"}} onClick={provider.disconnect}>
        Disconnect
        </Button>
        :
        null
        }
        {provider.isConnected && !provider.isActive ? 
        <Button
        color="secondary" 
        variant="outlined"
        style={{borderRadius: 15, display: "flex", margin: "auto"}}
          onClick={provider.setActiveProvider}
          
        >
          Set Active
        </Button>
        :
        null
        }
        
        
        <div>
          
       
        </div>
      </div>
    </div>
  ))}
</div>
  : 
  null
  }
  
   
      
          
    </div>
  )
}