import React, { useState } from "react"

import { Card, Typography, Button, TextField } from "@mui/material"

import Typewriter from "./typewriter"

import SmartToyIcon from '@mui/icons-material/SmartToy';

export default function ChatBot(props) { 

    const [expand, setExpand] = useState(false)

    const [prompt, setPrompt] = useState("Hello")
    const [response, setResponse] = useState("Hello, how can I help you today?")


    React.useEffect(() => {

       

    }, [])

    const askModel = async () => {

        setResponse("")
       
        let response = await fetch('/api/customModel', {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
                prompt: prompt
                
            }),
            
              
          });
  
          let session = await response.json()

         
          setResponse(session.response)

    
    }

    const handlePromptChange = (event) => {

        const target = event.target;
        let value = target.type === 'checkbox' ? target.checked : target.value;
        const name = target.name;

        if (name == "prompt") {
            setPrompt(value.replace(/(\r\n|\n|\r)/gm,""))
        }
    
    }

    const onKeyPress = (e) => {
        if(e.keyCode == 13){
            askModel()
         }
    }


    if (expand) {
        return (
            <div>
                <Button style={{position: "fixed", right: 20, bottom: 20}} color="secondary" onClick={() => setExpand(!expand)}>
                    <SmartToyIcon />
                </Button>

                <Card style={{position: "fixed", bottom: 80, width: "100%", backgroundColor: "black", border: "1px solid white", padding: 20}}>
    
                    <br />
                     
                    <TextField                
                    onChange={handlePromptChange}
                    onKeyDown={onKeyPress}
                    value={prompt}
                    multiline
                    type="text"
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
                    <Button variant="contained" color="secondary" onClick={() => askModel()}>
                        Ask
                    </Button>
                    <Typewriter style={{margin: 10}} text={response} delay={20} />
                </Card>
    
            </div>
        )
    }
    else {
        return (
            <div>
                <Button style={{position: "fixed", right: 20, bottom: 20}} color="secondary" onClick={() => setExpand(!expand)}>
                    <SmartToyIcon />
                </Button>
            </div>
        )
    }
    
    
    
    
}