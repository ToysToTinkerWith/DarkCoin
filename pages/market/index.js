import React from "react"

import { motion } from "framer-motion"

import { useRef } from "react";

import { Grid, Typography, Button } from "@mui/material"


export default function Market(props) { 

    const browseRef = useRef(null);

    const handleMouseEnterBrowse = () => {
        browseRef.current.play();
    };

    const handleMouseLeaveBrowse = () => {
        browseRef.current.pause();
        browseRef.current.currentTime = 0;
    };

    const listRef = useRef(null);

    const handleMouseEnterList = () => {
        listRef.current.play();
    };

    const handleMouseLeaveList = () => {
        listRef.current.pause();
        listRef.current.currentTime = 0;
    };

    const stallRef = useRef(null);

    const handleMouseEnterStall = () => {
        stallRef.current.play();
    };

    const handleMouseLeaveStall = () => {
        stallRef.current.pause();
        stallRef.current.currentTime = 0;
    };


    return (
        <div>

            <div>

                <Grid container style={{marginTop: 150}}>

                
                    <Grid item xs={6} md={4}>
                        <Button component={motion.div} animate={{opacity: [0,1,1,1,1,1]}} transition={{duration: 10}} style={{postion: "relative", display: "grid", margin: "auto"}} 
                        onClick={() => window.location.href = "/market/browse"}
                        >

                        
                            <Typography color="primary" align="center" variant="h6" style={{position: "absolute", borderRadius: 15, backgroundColor: "#000000", left: "10vw", bottom: 20, fontFamily: "UncialAntiqua", color: "#FFFFFF", padding: 10}}> Browse </Typography>
                            
                        
                            <video  
                                ref={browseRef}
                                muted
                                loop
                                playsInline
                                preload="metadata"
                                onMouseEnter={handleMouseEnterBrowse}
                                onMouseLeave={handleMouseLeaveBrowse} 
                                style={{width: "100%", border: "3px solid white", maxWidth: 1000}}>
                                <source src={"market/browse.mp4"} type='video/mp4'  />
                            </video>      
                            

                        </Button>

                    </Grid>

                    <Grid item xs={6} md={4}>
                        <Button component={motion.div} animate={{opacity: [0,1,1,1,1,1]}} transition={{duration: 10}} style={{postion: "relative", display: "grid", margin: "auto"}} 
                        onClick={() => window.location.href = "/market/list"}
                        >

                        
                            <Typography color="primary" align="center" variant="h6" style={{position: "absolute", borderRadius: 15, backgroundColor: "#000000", left: "10vw", bottom: 20, fontFamily: "UncialAntiqua", color: "#FFFFFF", padding: 10}}> List </Typography>
                            
                        
                            <video  
                                ref={listRef}
                                muted
                                loop
                                playsInline
                                preload="metadata"
                                onMouseEnter={handleMouseEnterList}
                                onMouseLeave={handleMouseLeaveList} 
                                style={{width: "100%", border: "3px solid white", maxWidth: 1000}}>
                                <source src={"market/list.mp4"} type='video/mp4'  />
                            </video>      
                            

                        </Button>

                    </Grid>

                    <Grid item xs={4} md={4}>
                        <Button component={motion.div} animate={{opacity: [0,1,1,1,1,1]}} transition={{duration: 10}} style={{postion: "relative", display: "grid", margin: "auto"}} 
                        onClick={() => window.location.href = "/market/stall"}
                        >

                        
                            <Typography color="primary" align="center" variant="h6" style={{position: "absolute", borderRadius: 15, backgroundColor: "#000000", left: "5vw", bottom: 20, fontFamily: "UncialAntiqua", color: "#FFFFFF", padding: 10}}> My Stall </Typography>
                            
                        
                            <video  
                                ref={stallRef}
                                muted
                                loop
                                playsInline
                                preload="metadata"
                                onMouseEnter={handleMouseEnterStall}
                                onMouseLeave={handleMouseLeaveStall} 
                                style={{width: "100%", border: "3px solid white", maxWidth: 1000}}>
                                <source src={"market/stall.mp4"} type='video/mp4'  />
                            </video>      
                            

                        </Button>

                    </Grid>

                    {/* <Grid item xs={4} >
                        <Button component={motion.div} animate={{opacity: [0,1,1,1,1,1]}} transition={{duration: 10}} style={{postion: "relative", display: "grid", margin: "auto"}} 
                        onClick={() => window.location.href = "/arena/battle"}
                        >

                        
                            <Typography color="primary" align="center" variant="h6" style={{position: "absolute", borderRadius: 15, backgroundColor: "#000000", left: "20vw", bottom: 20, fontFamily: "UncialAntiqua", color: "#FFFFFF", padding: 10}}> Battle </Typography>
                            
                        
                            <video  
                                ref={battleRef}
                                muted
                                loop
                                playsInline
                                preload="metadata"
                                onMouseEnter={handleMouseEnterBattle}
                                onMouseLeave={handleMouseLeaveBattle} 
                                style={{width: "100%", border: "3px solid white", maxWidth: 1000}}>
                                <source src={"arena/battle.mp4"} type='video/mp4'  />
                            </video>      
                            

                        </Button>

                    </Grid> */}

                
                </Grid>

            </div>
            
        
        </div>
    )
    
    
}