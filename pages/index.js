import React from "react"

import Head from "next/head"

import { Grid, Typography, Button } from "@mui/material"

import { motion } from "framer-motion"

import { useRef } from "react";

export default function Index(props) { 


        const arenaRef = useRef(null);
        const councilRef = useRef(null);

        const marketRef = useRef(null);

        const mailboxRef = useRef(null);

        const discordRef = useRef(null);
        const paperRef = useRef(null);
        const githubRef = useRef(null);

        
        
        
        
          const handleMouseEnterArena = () => {
            arenaRef.current.play();
          };
        
          const handleMouseLeaveArena = () => {
            arenaRef.current.pause();
            arenaRef.current.currentTime = 0;
          };
        
          const handleMouseEnterCouncil = () => {
            councilRef.current.play();
          };
        
          const handleMouseLeaveCouncil = () => {
            councilRef.current.pause();
            councilRef.current.currentTime = 0;
          };

          const handleMouseEnterMarket = () => {
            marketRef.current.play();
          };
        
          const handleMouseLeaveMarket = () => {
            marketRef.current.pause();
            marketRef.current.currentTime = 0;
          };
        
          const handleMouseEnterMailbox = () => {
            mailboxRef.current.play();
          };
        
          const handleMouseLeaveMailbox = () => {
            mailboxRef.current.pause();
            mailboxRef.current.currentTime = 0;
          };

          const handleMouseEnterDiscord = () => {
            discordRef.current.play();
          };
        
          const handleMouseLeaveDiscord = () => {
            discordRef.current.pause();
            discordRef.current.currentTime = 0;
          };

          const handleMouseEnterPaper = () => {
            paperRef.current.play();
          };
        
          const handleMouseLeavePaper = () => {
            paperRef.current.pause();
            paperRef.current.currentTime = 0;
          };

          const handleMouseEnterGithub = () => {
            githubRef.current.play();
          };
        
          const handleMouseLeaveGithub = () => {
            githubRef.current.pause();
            githubRef.current.currentTime = 0;
          };


        return (
            <div>
                <Head>
                <title>Dark Coin</title>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <meta name="description" content="Dark Coin is an innovative community-driven project within the Algorand ecosystem, focused on expanding the possibilities of Algorand Standard Assets (ASAs) in the decentralized finance (DeFi) space. It operates as a decentralized autonomous organization (DAO), giving collective ownership and democratic management power to its members through blockchain-enforced rules." />
                <meta name="keywords" content="Dark Coin, Algorand, Algorand Standard Assets, ASAs, decentralized finance, decentralized autonomous organization, DAO, blockchain" />

                
                </Head>

                <div> 

                    <Grid container style={{marginTop: 150}}>

                    
                    <Grid item xs={12} sm={6} md={6}>
                        <Button component={motion.div} animate={{opacity: [0,0,0,0,0,1]}} transition={{duration: 10}} style={{postion: "relative", display: "grid", margin: "auto"}} 
                        onClick={() => window.location.href = "/arena"}
                        >

                        
                            <Typography color="primary" align="center" variant="h6" style={{position: "absolute", borderRadius: 15, backgroundColor: "#000000", left: 20, bottom: 20, fontFamily: "UncialAntiqua", color: "#FFFFFF", padding: 10}}> Arena </Typography>
                            
                        
                            <video  
                                ref={arenaRef}
                                muted
                                loop
                                playsInline
                                preload="metadata"
                                onMouseEnter={handleMouseEnterArena}
                                onMouseLeave={handleMouseLeaveArena} 
                                style={{width: "100%", border: "3px solid white"}}>
                                <source src={"home/arena.mp4"} type='video/mp4'  />
                            </video>      
                            

                        </Button>

                    </Grid>

                    <Grid item xs={12} sm={6} md={6} >


                        <Button component={motion.div} animate={{opacity: [0,0,0,0,0,1]}} transition={{duration: 10}} style={{postion: "relative", display: "grid", margin: "auto"}} 
                        onClick={() => window.location.href = "/council"}
                        >

                        
                            <Typography color="primary" align="center" variant="h6" style={{position: "absolute", borderRadius: 15, backgroundColor: "#000000", left: 20, bottom: 20, fontFamily: "UncialAntiqua", color: "#FFFFFF", padding: 10}}> Council </Typography>
                            
                            <video  
                                ref={councilRef}
                                muted
                                loop
                                playsInline
                                preload="metadata"
                                onMouseEnter={handleMouseEnterCouncil}
                                onMouseLeave={handleMouseLeaveCouncil} 
                                style={{width: "100%", border: "3px solid white", display: "flex", margin: "auto"}}>
                                <source src={"home/council.mp4"} type='video/mp4'  />
                            </video>      
                        

                        </Button>

                    </Grid>

                    <Grid item xs={6} sm={4} md={4} >


                        <Button component={motion.div} animate={{opacity: [0,0,0,0,0,1]}} transition={{duration: 10}} style={{postion: "relative", display: "grid", margin: "auto"}} 
                        onClick={() => window.location.href = "/market"}
                        >

                        
                            <Typography color="primary" align="center" variant="h6" style={{position: "absolute", borderRadius: 15, backgroundColor: "#000000", left: 20, bottom: 20, fontFamily: "UncialAntiqua", color: "#FFFFFF", padding: 10}}> Market </Typography>
                            
                            <video  
                                ref={marketRef}
                                muted
                                loop
                                playsInline
                                preload="metadata"
                                onMouseEnter={handleMouseEnterMarket}
                                onMouseLeave={handleMouseLeaveMarket} 
                                style={{width: "100%", border: "3px solid white", display: "flex", margin: "auto"}}>
                                <source src={"home/market.mp4"} type='video/mp4'  />
                            </video>      
                        

                        </Button>

                    </Grid>

                    <Grid item xs={6} sm={4} md={4} >


                        <Button component={motion.div} animate={{opacity: [0,0,0,0,0,1]}} transition={{duration: 10}} style={{postion: "relative", display: "grid", margin: "auto"}} 
                        onClick={() => window.location.href = "/tools/mailbox"}
                        >

                        
                            <Typography color="primary" align="center" variant="h6" style={{position: "absolute", borderRadius: 15, backgroundColor: "#000000", left: 20, bottom: 20, fontFamily: "UncialAntiqua", color: "#FFFFFF", padding: 10}}> Mailbox </Typography>
                            
                            <video  
                                ref={mailboxRef}
                                muted
                                loop
                                playsInline
                                preload="metadata"
                                onMouseEnter={handleMouseEnterMailbox}
                                onMouseLeave={handleMouseLeaveMailbox} 
                                style={{width: "100%", border: "3px solid white", display: "flex", margin: "auto"}}>
                                <source src={"home/mailbox.mp4"} type='video/mp4'  />
                            </video>      
                        

                        </Button>

                    </Grid>

                    </Grid>

                    <Grid container>
                      <Grid item xs={4} sm={4} md={4} >


                        <Button component={motion.div} animate={{opacity: [0,0,0,0,0,1]}} transition={{duration: 10}} style={{postion: "relative", display: "grid", margin: "auto"}} 
                        onClick={() => window.location.href = "https://discord.gg/tBz68v5Q"}
                        >

                        
                            <Typography color="primary" align="center" variant="h6" style={{position: "absolute", borderRadius: 15, backgroundColor: "#000000", left: 20, bottom: 20, fontFamily: "UncialAntiqua", color: "#FFFFFF", padding: 10}}> Discord </Typography>
                            
                            <video  
                                ref={discordRef}
                                muted
                                loop
                                playsInline
                                preload="metadata"
                                onMouseEnter={handleMouseEnterDiscord}
                                onMouseLeave={handleMouseLeaveDiscord} 
                                style={{width: "100%", border: "3px solid white", display: "flex", margin: "auto"}}>
                                <source src={"home/discord.mp4"} type='video/mp4'  />
                            </video>      
                        

                        </Button>

                      </Grid>
                      <Grid item xs={4} sm={4} md={4} >


                        <Button component={motion.div} animate={{opacity: [0,0,0,0,0,1]}} transition={{duration: 10}} style={{postion: "relative", display: "grid", margin: "auto"}} 
                        onClick={() => window.location.href = "https://dark-coin.io"}
                        >

                        
                            <Typography color="primary" align="center" variant="h6" style={{position: "absolute", borderRadius: 15, backgroundColor: "#000000", left: 20, bottom: 20, fontFamily: "UncialAntiqua", color: "#FFFFFF", padding: 10}}> Dark Paper </Typography>
                            
                            <video  
                                ref={paperRef}
                                muted
                                loop
                                playsInline
                                preload="metadata"
                                onMouseEnter={handleMouseEnterPaper}
                                onMouseLeave={handleMouseLeavePaper} 
                                style={{width: "100%", border: "3px solid white", display: "flex", margin: "auto"}}>
                                <source src={"home/darkpaper.mp4"} type='video/mp4'  />
                            </video>      
                        

                        </Button>

                      </Grid>
                      <Grid item xs={4} sm={4} md={4} >


                        <Button component={motion.div} animate={{opacity: [0,0,0,0,0,1]}} transition={{duration: 10}} style={{postion: "relative", display: "grid", margin: "auto"}} 
                        onClick={() => window.location.href = "https://github.com/ToysToTinkerWith/DarkCoin"}
                        >
                            <Typography color="primary" align="center" variant="h6" style={{position: "absolute", borderRadius: 15, backgroundColor: "#000000", left: 20, bottom: 20, fontFamily: "UncialAntiqua", color: "#FFFFFF", padding: 10}}> Github </Typography>
                            
                            <video  
                                ref={githubRef}
                                muted
                                loop
                                playsInline
                                preload="metadata"
                                onMouseEnter={handleMouseEnterGithub}
                                onMouseLeave={handleMouseLeaveGithub} 
                                style={{width: "100%", border: "3px solid white", display: "flex", margin: "auto"}}>
                                <source src={"home/github.mp4"} type='video/mp4'  />
                            </video>      
                        

                        </Button>

                      </Grid>
                    </Grid>



                </div>
                    

                

            </div>
        )
    
    
}