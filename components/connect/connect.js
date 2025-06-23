import React, { useState } from 'react'
import { useWallet } from '@txnlab/use-wallet'

import { Button, Typography, Grid, Popover } from '@mui/material';

import ContentCopyIcon from '@mui/icons-material/ContentCopy';

import { motion } from "framer-motion"

import { useRouter } from 'next/router'



export default function Connect(props) {

  const router = useRouter()
  
  const { providers, activeAccount } = useWallet()

  const [open, setOpen] = useState(false)
  const [DCAssets, setDCAssets] = useState([])
  const [addrAssets, setAddrAssets] = useState([])

  const [windowDimensions, setWindowDimensions] = useState({innerWidth: 0, innerHeight: 0});


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

    React.useEffect(() => {
      function getWindowDimensions() {
          const { innerWidth: width, innerHeight: height } = window;
          return {
            width,
            height
          };
        }
      function handleResize() {
      setWindowDimensions(getWindowDimensions());
      }
      handleResize()

      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);

    

    let dc = 0
    let daos = 0
    let warrior1 = 0
    let warrior2 = 0

    addrAssets.forEach((asset) => {
      if (asset["asset-id"] == 1088771340) {
        dc = Math.floor(asset.amount / 1000000)
      }
    })



  

  return (
    <div style={{position: "relative", zIndex: 50, backgroundColor: "black", borderRadius: 15}}>

      <Button onClick={() => setOpen(!open)} style={{}}>

            <div>
              <img src={"/home/rectangle.png"} style={{width: "100%", height: 160, position: "fixed", top: 0, left: 0}}/>
            </div>
      
            {router.pathname == "/" ?
            <div>
              <motion.video animate={{opacity: [0,1,1,0,0,0], scale: [1,2,0]}} transition={{duration: 7}} autoPlay muted style={{width: 700, position: "fixed", top: 50, left: ((windowDimensions.width / 2) - 350)}}>
                <source src={"/flip.mp4"} type='video/mp4'  />
              </motion.video>
      
      
              <motion.video animate={{opacity: [0,0,0,1,1,1,1,1], y: ["30vh","30vh","30vh","30vh","30vh","30vh","0vh","0vh"], scale: [1,1,1,1,1,1,.4,.4]}} transition={{duration: 10}} autoPlay loop muted style={{width: 700, position: "fixed", top: -120, left: ((windowDimensions.width / 2) - 350)}}>
                  <source src={"/spin.mp4"} type='video/mp4'  />
              </motion.video>

              {activeAccount ?
                <Typography component={motion.div} animate={{opacity: [0,0,0,0,0,1]}} transition={{duration: 10}} style={{color: "#FFFFFF", position: "fixed", fontFamily: "Jacques",  left: windowDimensions.width / 2 + 40, padding: 20}} > Connected </Typography>
              :
                <Typography component={motion.div} animate={{opacity: [0,0,0,0,0,1]}} transition={{duration: 10}} style={{color: "#FFFFFF", position: "fixed", fontFamily: "Jacques", left: windowDimensions.width / 2 + 40, padding: 20}} > Connect Wallet </Typography>
              }

              {addrAssets.length > 0 ?
                <Typography component={motion.div} animate={{opacity: [0,0,0,0,0,1]}} transition={{duration: 10}} style={{color: "#FFFFFF", position: "fixed", fontFamily: "Jacques", left: windowDimensions.width / 2 + 40, padding: 20, paddingTop: 50}} > {dc.toLocaleString()} DARKCOIN </Typography>
              :
              null              
              }

            </div>
            :
            <div>
              <video  autoPlay loop muted style={{width: 280, position: "fixed", top: -5, left: ((windowDimensions.width / 2) - 140)}}>
                  <source src={"/spin.mp4"} type='video/mp4'  />
              </video>
              {activeAccount ?
                <Typography style={{color: "#FFFFFF", position: "fixed", fontFamily: "Jacques",  left: windowDimensions.width / 2 + 40, padding: 20}} > Connected </Typography>
              :
                <Typography style={{color: "#FFFFFF", position: "fixed", fontFamily: "Jacques", left: windowDimensions.width / 2 + 40, padding: 20}} > Connect Wallet </Typography>
              }

              {addrAssets.length > 0 ?
                <Typography style={{color: "#FFFFFF", position: "fixed", fontFamily: "Jacques", left: windowDimensions.width / 2 + 40, padding: 20, paddingTop: 50}} > {dc.toLocaleString()} DARKCOIN </Typography>
              :
              null              
              }
            </div>
            }
        </Button>

      
      
  {open ? 
  <div style={{backgroundColor: "black", position: "fixed", border: "1px solid white"}}>
  {activeAccount ? 
  <div style={{padding: 10}}>
    <Button onClick={() => navigator.clipboard.writeText(activeAccount.address)}>
    <ContentCopyIcon style={{color: "#FFFFFF"}} />
    </Button>
  <Typography style={{color: "#FFFFFF"}} variant="caption">
    {activeAccount.address.substring(0,10)}
  </Typography>
  </div>
  :
  null
  }
  {providers?.map((provider) => (
    <div key={'provider-' + provider.metadata.id} style={{margin: 30, marginTop: 0}}>
      <Typography style={{color: "#FFFFFF"}}>
        <img width={30} height={30} style={{margin: 10, color: "#FAFAFA", borderRadius: 15}} alt="" src={provider.metadata.icon} />
        {provider.metadata.name} {provider.isActive && '[active]'}
      </Typography>
      <div>
        <hr />
        {!provider.isConnected ? 
        <Button variant="text" style={{borderRadius: 15, display: "flex", margin: "auto", color: "#FFFFFF", border: "1px solid white", padding: 10}} onClick={provider.connect} >
        Connect
        </Button>
        :
        null
        }
        {provider.isConnected ? 
        <Button variant="text" style={{borderRadius: 15, display: "flex", margin: "auto", color: "#FFFFFF", border: "1px solid white", padding: 10}} onClick={provider.disconnect}>
        Disconnect
        </Button>
        :
        null
        }
        {provider.isConnected && !provider.isActive ? 
        <Button
        variant="outlined"
        style={{borderRadius: 15, display: "flex", margin: "auto", color: "#FFFFFF"}}
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
  
   <br />
   <br />
   <br />
   <br />
   <br />
   <br />
   <br />
  
    </div>
  )
}