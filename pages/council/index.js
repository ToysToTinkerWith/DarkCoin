import React from "react"

import algosdk from "algosdk"


import { Grid, Typography, Button } from "@mui/material"

import { motion } from "framer-motion"

import { useRef } from "react";


export default function Council(props) { 

    const proposeRef = useRef(null);
    const proposalsRef = useRef(null);
    
    const handleMouseEnterPropose = () => {
        proposeRef.current.play();
      };
    
      const handleMouseLeavePropose = () => {
        proposeRef.current.pause();
        proposeRef.current.currentTime = 0;
      };
    
      const handleMouseEnterProposals = () => {
        proposalsRef.current.play();
      };
    
      const handleMouseLeaveProposals = () => {
        proposalsRef.current.pause();
        proposalsRef.current.currentTime = 0;
      };

    

        return (
            <div>
                <Grid container style={{marginTop: 100}}>

                
                    <Grid item xs={12} sm={6} >
                        <Button component={motion.div} animate={{opacity: [0,1,1,1,1,1]}} transition={{duration: 10}} style={{postion: "relative", display: "grid", margin: "auto"}} 
                        onClick={() => window.location.href = "/council/propose"}
                        >

                        
                            <Typography color="primary" align="center" variant="h6" style={{position: "absolute", borderRadius: 15, backgroundColor: "#000000", left: "20vw", bottom: 20, fontFamily: "UncialAntiqua", color: "#FFFFFF", padding: 10}}> Propose </Typography>
                            
                        
                            <video  
                                ref={proposeRef}
                                muted
                                loop
                                playsInline
                                preload="metadata"
                                onMouseEnter={handleMouseEnterPropose}
                                onMouseLeave={handleMouseLeavePropose} 
                                style={{width: "100%", border: "3px solid white", maxWidth: 1000}}>
                                <source src={"council/propose.mp4"} type='video/mp4'  />
                            </video>      
                            

                        </Button>

                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <Button component={motion.div} animate={{opacity: [0,1,1,1,1,1]}} transition={{duration: 10}} style={{postion: "relative", display: "grid", margin: "auto"}} 
                        onClick={() => window.location.href = "/council/proposals"}
                        >

                        
                            <Typography color="primary" align="center" variant="h6" style={{position: "absolute", borderRadius: 15, backgroundColor: "#000000", left: "20vw", bottom: 20, fontFamily: "UncialAntiqua", color: "#FFFFFF", padding: 10}}> Proposals </Typography>
                            
                        
                            <video  
                                ref={proposalsRef}
                                muted
                                loop
                                playsInline
                                preload="metadata"
                                onMouseEnter={handleMouseEnterProposals}
                                onMouseLeave={handleMouseLeaveProposals} 
                                style={{width: "100%", border: "3px solid white", maxWidth: 1000}}>
                                <source src={"council/proposals.mp4"} type='video/mp4'  />
                            </video>      
                            

                        </Button>

                    </Grid>


                    </Grid>
              
                  
            
            </div>
        )
    
}