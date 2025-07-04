import React from "react"

import { motion } from "framer-motion"

import { useRef } from "react";

import { Grid, Typography, Button } from "@mui/material"


export default function Arena(props) { 

    const dragonRef = useRef(null);

    const handleMouseEnterDragon = () => {
        dragonRef.current.play();
    };

    const handleMouseLeaveDragon = () => {
        dragonRef.current.pause();
        dragonRef.current.currentTime = 0;
    };

    const armouryRef = useRef(null);

    const handleMouseEnterArmoury = () => {
        armouryRef.current.play();
    };

    const handleMouseLeaveArmoury = () => {
        armouryRef.current.pause();
        armouryRef.current.currentTime = 0;
    };

    const fightRef = useRef(null);

    const handleMouseEnterFight = () => {
        fightRef.current.play();
    };

    const handleMouseLeaveFight = () => {
        fightRef.current.pause();
        fightRef.current.currentTime = 0;
    };

    const battleRef = useRef(null);

    const handleMouseEnterBattle = () => {
        battleRef.current.play();
    };

    const handleMouseLeaveBattle = () => {
        battleRef.current.pause();
        battleRef.current.currentTime = 0;
    };


    return (
        <div>

            <div>

                <Grid container style={{marginTop: 150}}>

                
                    <Grid item xs={12} >
                        <Button component={motion.div} animate={{opacity: [0,1,1,1,1,1]}} transition={{duration: 10}} style={{postion: "relative", display: "grid", margin: "auto"}} 
                        onClick={() => window.location.href = "/arena/dragonshorde"}
                        >

                        
                            <Typography color="primary" align="center" variant="h6" style={{position: "absolute", borderRadius: 15, backgroundColor: "#000000", left: "50vw", bottom: 20, fontFamily: "UncialAntiqua", color: "#FFFFFF", padding: 10}}> Dragon's Horde </Typography>
                            
                        
                            <video  
                                ref={dragonRef}
                                muted
                                loop
                                playsInline
                                preload="metadata"
                                onMouseEnter={handleMouseEnterDragon}
                                onMouseLeave={handleMouseLeaveDragon} 
                                style={{width: "100%", border: "3px solid white", maxWidth: 1000}}>
                                <source src={"dragonshorde/dragonshorde.mp4"} type='video/mp4'  />
                            </video>      
                            

                        </Button>

                    </Grid>

                    <Grid item xs={4} >
                        <Button component={motion.div} animate={{opacity: [0,1,1,1,1,1]}} transition={{duration: 10}} style={{postion: "relative", display: "grid", margin: "auto"}} 
                        onClick={() => window.location.href = "/arena/armory"}
                        >

                        
                            <Typography color="primary" align="center" variant="h6" style={{position: "absolute", borderRadius: 15, backgroundColor: "#000000", left: "10vw", bottom: 20, fontFamily: "UncialAntiqua", color: "#FFFFFF", padding: 10}}> Armory </Typography>
                            
                        
                            <video  
                                ref={armouryRef}
                                muted
                                loop
                                playsInline
                                preload="metadata"
                                onMouseEnter={handleMouseEnterArmoury}
                                onMouseLeave={handleMouseLeaveArmoury} 
                                style={{width: "100%", border: "3px solid white", maxWidth: 1000}}>
                                <source src={"dragonshorde/armoury.mp4"} type='video/mp4'  />
                            </video>      
                            

                        </Button>

                    </Grid>

                    <Grid item xs={4} >
                        <Button component={motion.div} animate={{opacity: [0,1,1,1,1,1]}} transition={{duration: 10}} style={{postion: "relative", display: "grid", margin: "auto"}} 
                        onClick={() => window.location.href = "/arena/fight"}
                        >

                        
                            <Typography color="primary" align="center" variant="h6" style={{position: "absolute", borderRadius: 15, backgroundColor: "#000000", left: "10vw", bottom: 20, fontFamily: "UncialAntiqua", color: "#FFFFFF", padding: 10}}> Fight </Typography>
                            
                        
                            <video  
                                ref={fightRef}
                                muted
                                loop
                                playsInline
                                preload="metadata"
                                onMouseEnter={handleMouseEnterFight}
                                onMouseLeave={handleMouseLeaveFight} 
                                style={{width: "100%", border: "3px solid white", maxWidth: 1000}}>
                                <source src={"arena/fight.mp4"} type='video/mp4'  />
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