import React, {useState} from "react"

import algosdk from "algosdk"

import { Grid, Typography, Button, Slider, TextField } from "@mui/material"

import { db } from "../../Firebase/FirebaseInit"
import { doc, setDoc, onSnapshot, serverTimestamp, increment, updateDoc } from "firebase/firestore"

import { motion } from "framer-motion"

import { useWallet } from '@txnlab/use-wallet'

import Resizer from "../../components/contracts/Tools/Resizer"

export default function ImageAi(props) {

    const { activeAccount, signTransactions, sendTransactions } = useWallet()

    const [value, setValue] = useState(30)

    const handleChange = (newValue) => {
      setValue(newValue.target.value);
    };    
    
    const [rotation, setRotation] = useState(0)

    const handleRotationChange = (newValue) => {
      setRotation(newValue.target.value);
    };

    const [scroll, setScroll] = useState(0)
    const [width, setWidth] = useState(0)




    const [preview, setPreview] = useState(false)
    const [mousePosition, setMousePosition] = useState({
        x: 0,
        y: 0
    })


    const [picture, setPicture] = useState(null)
    const [pictureOrg, setOrgPicture] = useState(null)
    const [newPicture, setNewPicture] = useState(null)


    const [prompt, setPrompt] = useState("")





    React.useEffect(() => {

        const mouseMove = (e) => {
            setMousePosition({
                x: e.clientX,
                y: e.clientY
            })
        }

        const scroll = (event) => {
            let scroll = window.scrollY;
            setScroll(scroll)
            let width = window.innerWidth
            setWidth(width)
        }

        window.addEventListener("mousemove", mouseMove)
        window.addEventListener("scroll", scroll)
        
        scroll()
        
        return () => {
            window.removeEventListener("mousemove", mouseMove)

        }

        }, [])

        const handlePromptChange = (event) => {

      
            const target = event.target;
            let value = target.type === 'checkbox' ? target.checked : target.value;
            const name = target.name;
        
            if (name == "prompt") {
              setPrompt(value)
            }
            
        
          }

        const resizeFile = (file) => new Promise(resolve => {

            try {
                Resizer.imageFileResizer(file, 512, 512, 'PNG', 100, 0,
                uri => {
                resolve(uri);
                }, 'base64');
            }
            catch {

            }
            
        });

        const onChange = async (event) => {
            const file = event.target.files[0];
            const image = await resizeFile(file);
            console.log(image.length)
            let response = await fetch('/api/rewards/jimpMask', {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    img: image,
                    x: 0,
                    y: 0,
                    value: 0,
                    rotation: 0
                }),
            
                
            });

            let session = await response.json()

            setOrgPicture(session.image)
            setPicture(session.image)
            
            
        }
        
        
        const onMouseClick = async (e) => {
            if (e.buttons == 1) {
               
                let response = await fetch('/api/rewards/jimpMask', {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        img: picture,
                        x: e.clientX / window.innerWidth,
                        y: (e.clientY - 300 + scroll) / window.innerWidth,
                        value: value,
                        rotation: rotation
                    }),
                    
                      
                  });
          
                  let session = await response.json()

                  setPicture(session.image)
            }
            
          }

          const onTouchStart = async (e) => {

            const { touches, changedTouches } = e.originalEvent ?? e;
            const touch = touches[0] ?? changedTouches[0];
               
            let response = await fetch('/api/rewards/jimpMask', {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    img: picture,
                    x: touch.pageX / window.innerWidth,
                    y: (touch.pageY - 330) / window.innerWidth,
                    value: value,
                    rotation: rotation
                }),
                
                    
                });
        
                let session = await response.json()

                setPicture(session.image)
            
            
          }

          const imageAI = async () => {

                const userRefOrg = doc(db, "Imager", activeAccount.address + "Org")
                const userRefMask = doc(db, "Imager", activeAccount.address + "Mask")

                await setDoc(userRefOrg, {
                    image: pictureOrg,
                  });

                await setDoc(userRefMask, {
                    image: picture,
                });

                const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)

                let params = await client.getTransactionParams().do();

                let ftxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
                    activeAccount.address, 
                    "VWYCYQ3H3PPNIGON4H363DIH7BP33TTZWUUUNMTDXCIHRCDPFOMU7VJ5HM", 
                    undefined, 
                    undefined,
                    500000000,  
                    undefined, 
                    1088771340, 
                    params
                  );

                let txns = [ftxn]

                let encodedTxns= []

                txns.forEach((txn) => {
                let encoded = algosdk.encodeUnsignedTransaction(txn)
                encodedTxns.push(encoded)
        
                })

                props.setProgress(0)

                props.setMessage("Sign fee transaction...")

                let signedTransactions = await signTransactions(encodedTxns)

                props.setProgress(40)

                props.setMessage("Generating image...")

                let { id } = await sendTransactions(signedTransactions)

                let confirmedTxn = await algosdk.waitForConfirmation(client, id, 4);

                console.log(confirmedTxn)

                console.log(id)
               
                let response = await fetch('/api/rewards/patchAi', {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        prompt: prompt,
                        txn: id
                    }),
                    
                      
                  });
          
                  let session = await response.json()

                  setOrgPicture(session.image)
                  setPicture(session.image)

                  props.setMessage("")
                  props.setProgress(0)

                  

            
            
          }

          const variants = {
            default: {
                x: mousePosition.x - (value / 2) * (width / 512),
                y: mousePosition.y - (value / 2) * (width / 512)
            }
          }


        return (
            <div>
                <div onMouseOver={() => setPreview(false)}>
                 <Button variant="contained" component="label" color="secondary" style={{backgroundColor: "#FFFFF", width: 100, padding: 10, display: "flex", margin: "auto"}}>
                    <Typography variant="subtitle2" style={{color: "#FFFFF"}}>  Add Photo </Typography>

                   
                    <input type="file" onChange={onChange} style={{width: 0, opacity: 0}}/>

                    </Button>
                    {picture ? 
                    <>
                    <br />
                    <Typography align="center" color="secondary"> Size </Typography>
                    <Slider style={{color: "white"}} value={value} onChange={handleChange} max={200} valueLabelDisplay="auto"/>
                    <br />
                    <Typography align="center" color="secondary"> Rotation </Typography>
                    <Slider style={{color: "white"}} value={rotation} onChange={handleRotationChange} max={90} valueLabelDisplay="auto"/>
                    </>
                    :
                    null
                    }
                    

                </div>

                    {preview ? 
                    <motion.div
                    style={{
                        backgroundColor: "#000000",
                        height: value * (width / 512),
                        width: value * (width / 512),
                        rotate: rotation,
                        position: "fixed",
                        top: 0,
                        left: 0,
                        pointerEvents: "none"
                    }}
                    variants={variants}
                    animate="default"
                    >


                    </motion.div>
                    :
                    null
                    }
                    
                    <div 
                        onMouseDown={onMouseClick}
                        onTouchStart={onTouchStart}
                        onMouseOver={() => setPreview(true)}
                    >
                        {picture ? 
                        <img draggable="false" src={picture} style={{width: "100%"}}/>
                        :
                        null
                        }
                    </div>

                    {picture ?
                    <div onMouseOver={() => setPreview(false)}>

                    <br />
                 
                    <TextField                
                        onChange={handlePromptChange}
                        value={prompt}
                        multiline
                        type="text"
                        label="prompt"
                        name="prompt"
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

                    <Button variant="contained" color="secondary" style={{display: "flex", margin: "auto"}} onClick={() => imageAI()}>
                    <Typography variant="h6"> Generate 500 </Typography>

                    <img src="/invDC.svg" style={{display: "flex", margin: "auto", width: 50, padding: 10}} />

                    </Button>
                    <br />

                    
                    </div>
                    :
                    null
                    }

                    
                
            </div>
        )
        
    
}