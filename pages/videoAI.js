import React from "react"

import algosdk from "algosdk"




import { Grid, Typography, Button, Modal } from "@mui/material"

export default class Index extends React.Component { 

    constructor(props) {
        super(props);
        this.state = {
            newPictures: [],
            viewPicture: null
        };
        this.handlePicture = this.handlePicture.bind(this)
        this.deletePicture = this.deletePicture.bind(this)
    }

    async componentDidMount() {

    }

    deletePicture(pictureId) {

        const imgs = this.state.newPictures
        let index = 0
        let delIndex

        imgs.forEach(img => {
            if (img.id == pictureId) {
                delIndex = index
            }
            index++
        })
    
        imgs.splice(delIndex, 1)
    
        this.setState({
          pictures: imgs,
          [pictureId]: ""
        })

    
      }

    handlePicture = (e) => {
        for (let i = 0; i < e.target.files.length; i++) {
          const newPicture = e.target.files[i];
          newPicture["id"] = Math.random().toString(20);
          console.log(newPicture)
          this.setState(prevState => ({newPictures: [...prevState.newPictures, newPicture], "newPicture.id": ""}));
        }
        e.target.value = null
      };

    render() {

        console.log(this.state)

        return (
            <div>
              <Button variant="contained" component="label" color="secondary" style={{backgroundColor: "#242424", width: 100, padding: 10, display: "flex", margin: "auto"}}>
                <Typography variant="subtitle2" style={{color: "#FFFFFF"}}>  Add Photos </Typography>

            
                <input type="file" multiple onChange={this.handlePicture} style={{width: 0, opacity: 0}}/>

            </Button>
                  
            <Grid container>
            {this.state.newPictures.length > 0 ? this.state.newPictures.map((picture, index) => {
                console.log(picture)
                return (
                    <Grid item key={index} xs={12} sm={6} style={{display: "grid", border: "1px solid white", borderRadius: 15}}>
                        <Button onClick={() => this.setState({viewPicture: URL.createObjectURL(picture)})}> 
                    <img src={URL.createObjectURL(picture)} alt="img" style={{height: 100, width: 100, borderRadius: 15}}/>
                    </Button>
                    
                    
                    <Button variant="contained" color="primary" style={{margin: 10, padding: 10, backgroundColor: "#242424"}} onClick={() => this.deletePicture(picture.id)}>
                        Del
                    </Button>   
                    </Grid>
                )
                })  
                :
                null
                }
                
            </Grid>

            {this.state.viewPicture ?
                <Modal 
                open={true} 
                onClose={() => this.setState({viewPicture: null})}
                onClick={() => this.setState({viewPicture: null})}
                style={{
                    overflowY: "auto",
                    overflowX: "hidden"
                }}>
                <img src={this.state.viewPicture} alt="" variant="square" style={{ width: "100%", height: "auto" }} />
                </Modal>
                
                :
                null
            }
            
            </div>
        )
    }
    
}