import React, { useEffect, useState } from "react"

import algosdk from "algosdk"

import { Typography, Button, TextField, Card, Grid, LinearProgress, linearProgressClasses, styled } from "@mui/material"

import { useWallet } from '@txnlab/use-wallet'


import { CID } from 'multiformats/cid'


import * as mfsha2 from 'multiformats/hashes/sha2'
import * as digest from 'multiformats/hashes/digest'

function formatNumber(num) {
  if (num >= 1e15) return (num / 1e15).toFixed(2).replace(/\.00$/, '') + 'Q';
  if (num >= 1e12) return (num / 1e12).toFixed(2).replace(/\.00$/, '') + 'T';
  if (num >= 1e9)  return (num / 1e9).toFixed(2).replace(/\.00$/, '') + 'B';
  if (num >= 1e6)  return (num / 1e6).toFixed(2).replace(/\.00$/, '') + 'M';
  return num.toLocaleString(); // adds commas for thousands
}

export default function DisplayAsset(props) {

    const { activeAccount, signTransactions, sendTransactions } = useWallet()

    const [ nft, setNft ] = useState(null)
    const [ nftUrl, setNftUrl ] = useState(null)

    const [ listAmount, setListAmount ] = useState(null)

    const [ costId, setCostId ] = useState(null)
    const [ costAmount, setCostAmount ] = useState(null)

    const [ costNft, setCostNft ] = useState(null)
    const [ costNftUrl, setCostNftUrl ] = useState(null)

    const [ listingAddress, setListingAddress ] = useState(null)

    const [ buyAmount, setBuyAmount ] = useState(null)

    const [ display, setDisplay ] = useState(false)
  

    const fetchData = async () => {

        try {


            const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)
            console.log(props.listingAddress)
            if (props.listingAddress) {
                const stringAddress = algosdk.encodeAddress(props.listingAddress);
                setListingAddress(stringAddress)
            }

           console.log(props.costId)
            if (props.costId == 0) {

                setCostNft({name: "ALGO", decimals: 6})
                setCostNftUrl("/AlgoWhite.svg")

            }
            else if (props.costId > 0) {

                let costNft = await indexerClient.searchForAssets().index(props.costId).do();

                console.log(costNft)

                setCostNft({name: costNft.assets[0].params.name, decimals: costNft.assets[0].params.decimals})

                fetch('https://asa-list.tinyman.org/assets.json')
                .then(response => {
                    if (!response.ok) {
                    throw new Error('Network response was not ok');
                    }
                    return response.json(); // or response.text() for plain text
                })
                .then(data => {
                    if (data[costNft.assets[0].index]) {
                        setCostNftUrl("https://asa-list.tinyman.org/assets/" + String(costNft.assets[0].index) + "/icon.png")
                    }
                    else if (costNft.assets[0].params.url.substring(0,7) == "ipfs://") {
                        setCostNftUrl("https://ipfs-pera.algonode.dev/ipfs/" + costNft.assets[0].params.url.slice(7))
                    }
                    else if (costNft.assets[0].params.url.substring(0,21) == "https://ipfs.io/ipfs/") {
                        setCostNftUrl("https://ipfs-pera.algonode.dev/ipfs/" + costNft.assets[0].params.url.slice(21))
                    }
                    else if (costNft.assets[0].params.url.substring(0,29) == "https://gateway.ipfs.io/ipfs/") {
                        setCostNftUrl("https://ipfs-pera.algonode.dev/ipfs/" + costNft.assets[0].params.url.slice(29))
                    }
                    else if (costNft.assets[0].params.url == "template-ipfs://{ipfscid:0:dag-pb:reserve:sha2-256}") {
                        const addr = algosdk.decodeAddress(costNft.assets[0].params.reserve)
            
                        const mhdigest = digest.create(mfsha2.sha256.code, addr.publicKey)
            
                        const ocid = CID.create(0, 0x70, mhdigest)
            
                        setCostNftUrl("https://ipfs-pera.algonode.dev/ipfs/" + ocid.toString())
                        
                    }
                                
                })

            }
            
            let nft = await indexerClient.searchForAssets().index(props.nftId).do();

            console.log(nft)

            setNft(nft)

            fetch('https://asa-list.tinyman.org/assets.json')
            .then(response => {
                if (!response.ok) {
                throw new Error('Network response was not ok');
                }
                return response.json(); // or response.text() for plain text
            })
            .then(data => {
                if (data[nft.assets[0].index]) {
                    console.log(data[nft.assets[0].index])
                    setNftUrl("https://asa-list.tinyman.org/assets/" + String(nft.assets[0].index) + "/icon.png")
                }
                else if (nft.assets[0].params.url.substring(0,7) == "ipfs://") {
                    setNftUrl("https://ipfs-pera.algonode.dev/ipfs/" + nft.assets[0].params.url.slice(7))
                }
                else if (nft.assets[0].params.url.substring(0,21) == "https://ipfs.io/ipfs/") {
                    setNftUrl("https://ipfs-pera.algonode.dev/ipfs/" + nft.assets[0].params.url.slice(21))
                }
                else if (nft.assets[0].params.url.substring(0,29) == "https://gateway.ipfs.io/ipfs/") {
                    setNftUrl("https://ipfs-pera.algonode.dev/ipfs/" + nft.assets[0].params.url.slice(29))
                }
                else if (nft.assets[0].params.url == "template-ipfs://{ipfscid:0:dag-pb:reserve:sha2-256}") {
                    const addr = algosdk.decodeAddress(nft.assets[0].params.reserve)
        
                    const mhdigest = digest.create(mfsha2.sha256.code, addr.publicKey)
        
                    const ocid = CID.create(0, 0x70, mhdigest)
        
                    setNftUrl("https://ipfs-pera.algonode.dev/ipfs/" + ocid.toString())
                    
                }
                // else if (nft.assets[0].params.url == "template-ipfs://{ipfscid:1:raw:reserve:sha2-256}#arc3") {
                //     const addr = algosdk.decodeAddress(nft.assets[0].params.reserve)
                    
                //     const mhdigest = digest.create(mfsha2.sha256.code, addr.publicKey)
        
                //     const ocid = CID.create(1, 0x55, mhdigest)
                    
                //     console.log(ocid.toString())
                    
                //     setNftUrl("https://ipfs-pera.algonode.dev/ipfs/" + ocid.toString())
                // }

                setDisplay(true)
                
            })
            .catch(error => {
                console.error('Fetch error:', error);
            });

            
            
            

        }
        
        catch(error) {
            console.log(error)
        }

        }
    

    useEffect(() => {

        fetchData();

    }, [])

    const handleChange = (event) => {
        
        const target = event.target;
        let value = target.type === 'checkbox' ? target.checked : target.value;
        const name = target.name;
        if (name == "listAmount") {
            setListAmount(value)
        }
        if (name == "costId") {
            setCostId(value)
        }
        if (name == "costAmount") {
            if (value == "" || value >= 0) {
                setCostAmount(value)
            }
            
        }
        if (name == "buyAmount") {
            if (value == "" || value <= props.amount && value >= 0) {
                setBuyAmount(value)
            }
        }

    }

    function matchesSearch(query, target) {
        return target.toLowerCase().includes(query.toLowerCase());
    }

    

        if (display) {
            console.log(listingAddress)

            let amount = props.amount / (10 ** nft.assets[0].params.decimals)
            console.log(amount)
            if (props.remove) {
                return (
                    <div>
                        <Button style={{position: "relative", textTransform: "none", display: "flex", margin: "auto"}} onClick={() => props.setListAsset(null)}>
                            <Typography color="secondary" variant="h4" style={{position: "absolute", top: 40, right: 40, background: "#000000", border: "1px solid white", borderRadius: 15, padding: 10}}> {amount.toLocaleString()}</Typography>
                            {nftUrl ?
                            <img src={nftUrl} style={{width: "97vw", maxWidth: 500}}/>
                            :
                            
                            <img src={"/market/empty.png"} style={{width: "97vw", maxWidth: 500}}/>

                            }
                            <Typography color="secondary" variant="h4" style={{position: "absolute", bottom: 40, left: 40, background: "#000000", border: "1px solid white", borderRadius: 15, padding: 10}} > {nft.assets[0].params.name}</Typography>
                            
                            

                        </Button>
                        <br />
                      
                   
                       
                        
                        <Button style={{display: "flex", margin: "auto"}} onClick={() => props.removeListing(props.nftId, props.amount, props.costId, props.costAmount, props.listingAddress)}>
                            <Typography variant="h6" color="primary" align="center" style={{backgroundColor: "#FFFFFF", padding: 10, borderRadius: 15}}> Remove </Typography>
                        </Button>
                    <br />
                    <br />

                    </div>
                )
            }
            if (props.buy) {
                return (
                    <div>
                        <Button style={{position: "relative", textTransform: "none", display: "flex", margin: "auto"}} onClick={() => props.setListAsset(null)}>
                            <Typography color="secondary" variant="h4" style={{position: "absolute", top: 40, right: 40, background: "#000000", border: "1px solid white", borderRadius: 15, padding: 10}}> {amount.toLocaleString()}</Typography>
                            {nftUrl ?
                            <img src={nftUrl} style={{width: "97vw", maxWidth: 500}}/>
                            :
                            
                            <img src={"/market/empty.png"} style={{width: "97vw", maxWidth: 500}}/>

                            }
                            <Typography color="secondary" variant="h4" style={{position: "absolute", bottom: 40, left: 40, background: "#000000", border: "1px solid white", borderRadius: 15, padding: 10}} > {nft.assets[0].params.name}</Typography>
                            <Typography color="secondary" variant="h4" style={{position: "absolute", top: 40, left: 40, background: "#000000", border: "1px solid white", borderRadius: 15, padding: 10}} > {(props.costAmount / (10 ** costNft.decimals)).toLocaleString()} {costNft.name} </Typography>

                            

                        </Button>
                        <br />
                        <Grid container>
                            <Grid item xs={12}>
                                <Button style={{display: "flex", margin: "auto"}} onClick={() => window.open("https://explorer.perawallet.app/asset/" + props.nftId)}>
                                    <Typography variant="h5" color="primary" style={{background: "#FFFFFF", borderRadius: 15, padding: 10, margin: 20}}>  List ID </Typography>
                                </Button>
                            </Grid>
                            {props.costId > 0 ?
                            <Grid item xs={12}>
                                <Button style={{display: "flex", margin: "auto"}} onClick={() => window.open("https://explorer.perawallet.app/asset/" + props.costId)}>
                                    <Typography variant="h5" color="primary" style={{background: "#FFFFFF", borderRadius: 15, padding: 10, margin: 20}}> Cost ID </Typography>
                                </Button>
                            </Grid>
                            :
                            null
                            }
                            
                        </Grid>
                        
                        <Typography variant="h2" color="secondary" align="center"> Buy </Typography>
                        <br />
                    <TextField
                        color="primary"
                        variant="outlined"
                        value={buyAmount}
                        type="number"
                        label={"Amount"}
                        name="buyAmount"
                        onChange={handleChange}
                        sx={{
                            width: '50%',
                            display: 'flex',
                            margin: 'auto',
                            input: { color: 'white' },                    
                            label: { 
                            color: 'white',                            
                            '&.Mui-focused': {
                                color: 'white'                            
                            }
                            },
                            '.MuiOutlinedInput-root': {
                            '& fieldset': {
                                borderColor: 'white',
                            },
                            '&:hover fieldset': {
                                borderColor: 'white',
                            },
                            '&.Mui-focused fieldset': {
                                borderColor: 'white',
                            },
                            }
                        }}
                    />

                    <br />
                       
                        
                        <Button style={{display: "flex", margin: "auto"}} onClick={() => props.buyAsset(Number(buyAmount), props.nftId, props.amount, props.costId, props.costAmount, props.listingAddress)}>
                            {costNft ?
                                <Typography color="primary" style={{ background: "#FFFFFF", border: "1px solid white", borderRadius: 15, padding: 10}}> {(buyAmount * (props.costAmount / (10 ** costNft.decimals))).toLocaleString()} {costNft.name}</Typography>
                            :
                            null
                            }
                        </Button>
                    

                    </div>
                )
            }

            else if (props.listAsset) {
            return (
                <div>
                    <Button style={{position: "relative", textTransform: "none", display: "flex", margin: "auto"}} onClick={() => props.setListAsset(null)}>
                        <Typography color="secondary" variant="h4" style={{position: "absolute", top: 40, right: 40, background: "#000000", border: "1px solid white", borderRadius: 15, padding: 10}}> {amount.toLocaleString()}</Typography>
                        {nftUrl ?
                        <img src={nftUrl} style={{width: "97vw", maxWidth: 500}}/>
                        :
                        
                        <img src={"/market/empty.png"} style={{width: "97vw", maxWidth: 500}}/>

                        }
                        <Typography color="secondary" variant="h4" style={{position: "absolute", bottom: 40, left: 40, background: "#000000", border: "1px solid white", borderRadius: 15, padding: 10}} > {nft.assets[0].params.name}</Typography>
                        
                        

                    </Button>
                    <br />
                    <br />
                    <Typography variant="h2" color="secondary" align="center"> List</Typography>
                    <br />
                    <TextField
                        color="primary"
                        variant="outlined"
                        value={listAmount}
                        type="number"
                        label={"Amount"}
                        name="listAmount"
                        onChange={handleChange}
                        sx={{
                            width: '50%',
                            display: 'flex',
                            margin: 'auto',
                            input: { color: 'white' },                    
                            label: { 
                            color: 'white',                            
                            '&.Mui-focused': {
                                color: 'white'                            
                            }
                            },
                            '.MuiOutlinedInput-root': {
                            '& fieldset': {
                                borderColor: 'white',
                            },
                            '&:hover fieldset': {
                                borderColor: 'white',
                            },
                            '&.Mui-focused fieldset': {
                                borderColor: 'white',
                            },
                            }
                        }}
                    />

                    <br />
                    <Typography variant="h2" color="secondary" align="center"> Cost per </Typography>

                    <br />
                    <Grid container>
                        <Grid item xs={6}>
                            <TextField
                                color="primary"
                                variant="outlined"
                                value={costId}
                                type="number"
                                label={"Asset ID (0  =  ALGO)"}
                                name="costId"
                                onChange={handleChange}
                                sx={{
                                    width: '90%',
                                    display: 'flex',
                                    margin: 'auto',
                                    input: { color: 'white' },                    
                                    label: { 
                                    color: 'white',                              
                                    '&.Mui-focused': {
                                        color: 'white'                          
                                    }
                                    },
                                    '.MuiOutlinedInput-root': {
                                    '& fieldset': {
                                        borderColor: 'white',
                                    },
                                    '&:hover fieldset': {
                                        borderColor: 'white',
                                    },
                                    '&.Mui-focused fieldset': {
                                        borderColor: 'white',
                                    },
                                    }
                                }}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                color="primary"
                                variant="outlined"
                                value={costAmount}
                                type="number"
                                label={"Amount"}
                                name="costAmount"
                                onChange={handleChange}
                                sx={{
                                    width: '90%',
                                    display: 'flex',
                                    margin: 'auto',
                                    input: { color: 'white' },                     
                                    label: { 
                                    color: 'white',                              
                                    '&.Mui-focused': {
                                        color: 'white'                             
                                    }
                                    },
                                    '.MuiOutlinedInput-root': {
                                    '& fieldset': {
                                        borderColor: 'white',
                                    },
                                    '&:hover fieldset': {
                                        borderColor: 'white',
                                    },
                                    '&.Mui-focused fieldset': {
                                        borderColor: 'white',
                                    },
                                    }
                                }}
                            />
                        </Grid>
                        
                        
                    </Grid>
                    
                    <Button style={{display: "flex", margin: "auto"}} onClick={() => props.list(props.nftId, Number(listAmount), Number(costId), Number(costAmount))}>
                        <Typography variant="h5" color="primary" style={{background: "#FFFFFF", borderRadius: 15, padding: 10, margin: 20}}> List </Typography>
                    </Button>
                   

                </div>
            )

            }
            else if (props.search == "" || matchesSearch(props.search, nft.assets[0].params.name)) {

                return (
                    <Button style={{position: "relative", textTransform: "none", width: "100%", height: "100%"}} onClick={() => props.setListAsset({id: props.nftId, amount: props.amount, costId: props.costId, costAmount: props.costAmount, listingAddress: props.listingAddress})}>
                        <Typography color="secondary" style={{position: "absolute", top: 10, right: 10, background: "#000000", border: "1px solid white", borderRadius: 15, padding: 10}}> {formatNumber(amount)}</Typography>
                        {nftUrl ?
                        <img src={nftUrl} style={{width: "100%"}}/>
                        :
                        
                        <img src={"/market/empty.png"} style={{width: "100%"}}/>
                        }
                        {costNft ?
                            <div style={{position: "absolute", top: 10, left: 10}}>
                                <Typography color="secondary" style={{ background: "#000000", border: "1px solid white", borderRadius: 15, padding: 10}}> {(props.costAmount / (10 ** costNft.decimals)).toLocaleString()} {costNft.name}</Typography>
                            </div>
                            :
                            null
                        }
                        <Typography color="secondary" style={{position: "absolute", bottom: 10, left: 10, background: "#000000", border: "1px solid white", borderRadius: 15, padding: 10}} > {nft.assets[0].params.name}</Typography>


                    </Button>
                )

            }
            
        }
        
        else {
            return (
                <div>

                </div>
            )
        }
       
        
    
    
}