import React, {useState, useEffect} from "react"

import algosdk from "algosdk"

import { Typography, Button, Grid } from "@mui/material"

import { CID } from 'multiformats/cid'


import * as mfsha2 from 'multiformats/hashes/sha2'
import * as digest from 'multiformats/hashes/digest'

import { useWallet } from '@txnlab/use-wallet'

import multihash from "multihashes"

import cid from 'cids'

export default function Swapper(props) { 

  const { activeAccount, signTransactions, sendTransactions } = useWallet()


  const [ nft, setNft ] = useState(null)
  const [ nftUrl, setNftUrl ] = useState(null)
  const [ zoomNft, setZoomNft ] = useState(null)
  const [ confirm, setConfirm ] = useState("")

  const [ char, setChar ] = useState(null)

  const [ Background, setBackground ] = useState("None")
  const [ Skin, setSkin ] = useState("None")
  const [ Weapon, setWeapon ] = useState("None")
  const [ Magic, setMagic ] = useState("None")
  const [ Head, setHead ] = useState("None")
  const [ Armour, setArmour ] = useState("None")
  const [ Extra, setExtra ] = useState("None")

  const [ BackgroundChange, setBackgroundChange ] = useState("None")
  const [ WeaponChange, setWeaponChange ] = useState("None")
  const [ MagicChange, setMagicChange ] = useState("None")
  const [ HeadChange, setHeadChange ] = useState("None")
  const [ ArmourChange, setArmourChange ] = useState("None")
  const [ ExtraChange, setExtraChange ] = useState("None")

  const [ BackgroundId, setBackgroundId ] = useState("None")
  const [ WeaponId, setWeaponId ] = useState("None")
  const [ MagicId, setMagicId ] = useState("None")
  const [ HeadId, setHeadId ] = useState("None")
  const [ ArmourId, setArmourId ] = useState("None")
  const [ ExtraId, setExtraId ] = useState("None")

  const [ cat, setCat ] = useState(null)

  const [ newImage, setNewImage ] = useState(null)

    useEffect(() => {

      const fetchData = async () => {

        console.log(props.ownTraits)


          let response = await fetch('/api/getNft', {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                nftId: props.nftId
              }),
            
                
            });
        
        let session = await response.json()


          const addr = algosdk.decodeAddress(session.nft.assets[0].params.reserve)

          const mhdigest = digest.create(mfsha2.sha256.code, addr.publicKey)

          const ocid = CID.create(0, 0x70, mhdigest)

        setNft(session.nft.assets[0].params)
        setNftUrl("https://ipfs.dark-coin.io/ipfs/" + ocid.toString())

        if (props.zoom) {

          const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)

          let BackgroundId = 0
          let SkinId = 0
          let WeaponId = 0
          let MagicId = 0
          let HeadId = 0
          let ArmourId = 0
          let ExtraId = 0

          let BackgroundBox = await client.getApplicationBoxByName(props.contracts.swapper, new Uint8Array([...longToByteArray(props.nftId), new Uint8Array(Buffer.from("B"))])).do();
          BackgroundId = byteArrayToLong(BackgroundBox.value)

          let WeaponBox = await client.getApplicationBoxByName(props.contracts.swapper, new Uint8Array([...longToByteArray(props.nftId), new Uint8Array(Buffer.from("W"))])).do();
          WeaponId = byteArrayToLong(WeaponBox.value)
          
          let MagicBox = await client.getApplicationBoxByName(props.contracts.swapper, new Uint8Array([...longToByteArray(props.nftId), new Uint8Array(Buffer.from("M"))])).do();
          MagicId = byteArrayToLong(MagicBox.value)

          let HeadBox = await client.getApplicationBoxByName(props.contracts.swapper, new Uint8Array([...longToByteArray(props.nftId), new Uint8Array(Buffer.from("H"))])).do();
          HeadId = byteArrayToLong(HeadBox.value)
          console.log(HeadId)

          let ArmourBox = await client.getApplicationBoxByName(props.contracts.swapper, new Uint8Array([...longToByteArray(props.nftId), new Uint8Array(Buffer.from("A"))])).do();
          ArmourId = byteArrayToLong(ArmourBox.value)
          console.log(ArmourId)

          let ExtraBox = await client.getApplicationBoxByName(props.contracts.swapper, new Uint8Array([...longToByteArray(props.nftId), new Uint8Array(Buffer.from("E"))])).do();
          ExtraId = byteArrayToLong(ExtraBox.value)

          let Background = "None"
          let Skin = "None"
          let Weapon = "None"
          let Magic = "None"
          let Head = "None"
          let Armour = "None"
          let Extra = "None"

          props.traits.forEach((trait) => {
            if (trait.assetId == BackgroundId) {
              Background = trait.name.slice(0, trait.name.length - 11)
            }
            else if (trait.assetId == SkinId) {
              Skin = trait.name
            }
            else if (trait.assetId == WeaponId) {
              Weapon = trait.name
            }
            else if (trait.assetId == MagicId) {
              Magic = trait.name
            }
            else if (trait.assetId == HeadId) {
              Head = trait.name
            }
            else if (trait.assetId == ArmourId) {
              Armour = trait.name
            }
            else if (trait.assetId == ExtraId) {
              Extra = trait.name
            }
          })


          let char = JSON.parse(session.charStats)
          setChar(char)

          setBackground(Background)
          setSkin(char.properties.Skin)
          setWeapon(Weapon)
          setMagic(Magic)
          setHead(Head)
          setArmour(Armour)
          setExtra(Extra)

          setBackgroundChange(Background)
          setWeaponChange(Weapon)
          setMagicChange(Magic)
          setHeadChange(Head)
          setArmourChange(Armour)
          setExtraChange(Extra)

          setBackgroundId(BackgroundId)
          setWeaponId(WeaponId)
          setMagicId(MagicId)
          setHeadId(HeadId)
          setArmourId(ArmourId)
          setExtraId(ExtraId)
        }

             
        

          }
          fetchData();
        
          
        }, [])

        const longToByteArray = (long) => {
          // we want to represent the input as a 8-bytes array
          var byteArray = [0, 0, 0, 0, 0, 0, 0, 0];
      
          for ( var index = byteArray.length - 1; index > 0; index -- ) {
              var byte = long & 0xff;
              byteArray [ index ] = byte;
              long = (long - byte) / 256 ;
          }
      
          return byteArray;
        };

        const byteArrayToLong = (byteArray) => {
          var value = 0;
          for ( var i = 0; i < byteArray.length; i++) {
              value = (value * 256) + byteArray[i];
          }
      
          return value;
      };

        const changeImg = async (B,W,M,H,A,E) => {

          if (BackgroundChange != B || WeaponChange != W || MagicChange != M || HeadChange != H || ArmourChange != A ||  ExtraChange != E) {
            props.setMessage("Updating image...")

            let response = await fetch('/api/changeImg', {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  Background: B,
                  Skin: Skin,
                  Weapon: W,
                  Magic: M,
                  Head: H,
                  Armour: A,
                  Extra: E
                }),
                
                  
              });
      
              let session = await response.json()

              console.log(session)

              props.setMessage("")
      
              setNewImage(session.image)
          }
          
        }

        const mint = async () => {

        props.setMessage("Initializing transaction...")

          let newMetadata = char

          const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)

          const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)

          let params = await client.getTransactionParams().do();

          const accountAssets = await indexerClient.lookupAccountAssets(activeAccount.address).do();

          let found
          let otxn
          let stxn

          newMetadata.properties = 
          {
            Armour: "None",
            Background: "None",
            Extra: "None",
            Head: "None",
            Magic: "None",
            Skin: char.properties.Skin,
            Weapon: "None"
          }

          let newBackgroundId = 0
          let newWeaponId = 0
          let newMagicId = 0
          let newHeadId = 0
          let newArmourId = 0
          let newExtraId = 0

          let txns = []
          let signingIndex = []

          let appArgs = []
          let accounts = []
          let foreignApps = []
          let foreignAssets = []
          let boxes = []

          let intBox
          let Box


          props.traits.forEach((trait) => {
            if (trait.name == BackgroundChange + " Background") {
              newMetadata.properties.Background = BackgroundChange
              newBackgroundId = trait.assetId
            }
            else if (trait.name == WeaponChange) {
              newMetadata.properties.Weapon = WeaponChange
              newWeaponId = trait.assetId 
            }
            else if (trait.name == MagicChange) {
              newMetadata.properties.Magic = MagicChange
              newMagicId = trait.assetId 
            }
            else if (trait.name == HeadChange) {
              newMetadata.properties.Head = HeadChange
              newHeadId = trait.assetId 
            }
            else if (trait.name == ArmourChange) {
              newMetadata.properties.Armour = ArmourChange
              newArmourId = trait.assetId 
            }
            else if (trait.name == ExtraChange) {
              newMetadata.properties.Extra = ExtraChange
              newExtraId = trait.assetId 
            }
          })

          if (newBackgroundId != BackgroundId) {

            if (BackgroundId != 0) {

              found = false

              accountAssets.assets.forEach((asset) => {
                if (asset["asset-id"] == BackgroundId) {
                  found = true
                }
              })

              if (!found) {
                otxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
                  activeAccount.address, 
                  activeAccount.address, 
                  undefined, 
                  undefined,
                  0,  
                  undefined, 
                  Number(BackgroundId), 
                  params
                );

                txns.push(otxn)
                signingIndex.push(signingIndex.length)
                
              }

              

              appArgs = []
              appArgs.push(
                new Uint8Array(Buffer.from("unequip")),
                new Uint8Array(Buffer.from("B"))

              )

              accounts = [activeAccount.address]
              foreignApps = []
                  
              foreignAssets = [BackgroundId, props.nftId]

              intBox = longToByteArray(props.nftId)
          
              Box = new Uint8Array([...intBox, new Uint8Array(Buffer.from("B"))])

              boxes = [{appIndex: 0, name: Box}]
                
              let btxn = algosdk.makeApplicationNoOpTxn(activeAccount.address, params, props.contracts.swapper, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
              txns.push(btxn)
              signingIndex.push(signingIndex.length)

            }

            if (newBackgroundId != 0) {

              stxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
                activeAccount.address, 
                "BL6V7XEKWJ3WJDPXNTTD2D5HBFF4GUNXXDVPIUSMK662LYZQQBN5BDEXGQ", 
                undefined, 
                undefined,
                1,  
                undefined, 
                Number(newBackgroundId), 
                params
              );
  
              txns.push(stxn)
              signingIndex.push(signingIndex.length)
  
              appArgs = []
                appArgs.push(
                  new Uint8Array(Buffer.from("equip")),
                  new Uint8Array(Buffer.from("B"))
  
                )
  
                accounts = []
                foreignApps = []
                    
                foreignAssets = [newWeaponId, props.nftId]
  
                intBox = longToByteArray(props.nftId)
            
                Box = new Uint8Array([...intBox, new Uint8Array(Buffer.from("B"))])
    
                boxes = [{appIndex: 0, name: Box}]
                  
                let betxn = algosdk.makeApplicationNoOpTxn(activeAccount.address, params, props.contracts.swapper, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
                txns.push(betxn)
                signingIndex.push(signingIndex.length)

            }

            
          }

          if (newWeaponId != WeaponId) {

            if (WeaponId != 0) {

              found = false

              accountAssets.assets.forEach((asset) => {
                if (asset["asset-id"] == WeaponId) {
                  found = true
                }
              })

              if (!found) {
                otxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
                  activeAccount.address, 
                  activeAccount.address, 
                  undefined, 
                  undefined,
                  0,  
                  undefined, 
                  Number(WeaponId), 
                  params
                );

                txns.push(otxn)
                signingIndex.push(signingIndex.length)
                
              }

              

              appArgs = []
              appArgs.push(
                new Uint8Array(Buffer.from("unequip")),
                new Uint8Array(Buffer.from("W"))

              )

              accounts = [activeAccount.address]
              foreignApps = []
                  
              foreignAssets = [WeaponId, props.nftId]

              intBox = longToByteArray(props.nftId)
          
              Box = new Uint8Array([...intBox, new Uint8Array(Buffer.from("W"))])

              boxes = [{appIndex: 0, name: Box}]
                
              let wtxn = algosdk.makeApplicationNoOpTxn(activeAccount.address, params, props.contracts.swapper, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
              txns.push(wtxn)
              signingIndex.push(signingIndex.length)

            }

            if (newWeaponId != 0) {

              stxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
                activeAccount.address, 
                "BL6V7XEKWJ3WJDPXNTTD2D5HBFF4GUNXXDVPIUSMK662LYZQQBN5BDEXGQ", 
                undefined, 
                undefined,
                1,  
                undefined, 
                Number(newWeaponId), 
                params
              );
  
              txns.push(stxn)
              signingIndex.push(signingIndex.length)
  
              appArgs = []
                appArgs.push(
                  new Uint8Array(Buffer.from("equip")),
                  new Uint8Array(Buffer.from("W"))
  
                )
  
                accounts = []
                foreignApps = []
                    
                foreignAssets = [newWeaponId, props.nftId]
  
                intBox = longToByteArray(props.nftId)
            
                Box = new Uint8Array([...intBox, new Uint8Array(Buffer.from("W"))])
    
                boxes = [{appIndex: 0, name: Box}]
                  
                let wetxn = algosdk.makeApplicationNoOpTxn(activeAccount.address, params, props.contracts.swapper, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
                txns.push(wetxn)
                signingIndex.push(signingIndex.length)

            }

            
          }

          if (newMagicId != MagicId) {

            if (MagicId != 0) {

              found = false

              accountAssets.assets.forEach((asset) => {
                if (asset["asset-id"] == MagicId) {
                  found = true
                }
              })

              if (!found) {
                otxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
                  activeAccount.address, 
                  activeAccount.address, 
                  undefined, 
                  undefined,
                  0,  
                  undefined, 
                  Number(MagicId), 
                  params
                );

                txns.push(otxn)
                signingIndex.push(signingIndex.length)
                
              }

              

              appArgs = []
              appArgs.push(
                new Uint8Array(Buffer.from("unequip")),
                new Uint8Array(Buffer.from("M"))

              )

              accounts = [activeAccount.address]
              foreignApps = []
                  
              foreignAssets = [MagicId, props.nftId]

              intBox = longToByteArray(props.nftId)
          
              Box = new Uint8Array([...intBox, new Uint8Array(Buffer.from("M"))])

              boxes = [{appIndex: 0, name: Box}]
                
              let mtxn = algosdk.makeApplicationNoOpTxn(activeAccount.address, params, props.contracts.swapper, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
              txns.push(mtxn)
              signingIndex.push(signingIndex.length)

            }

            if (newMagicId != 0) {

              stxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
                activeAccount.address, 
                "BL6V7XEKWJ3WJDPXNTTD2D5HBFF4GUNXXDVPIUSMK662LYZQQBN5BDEXGQ", 
                undefined, 
                undefined,
                1,  
                undefined, 
                Number(newMagicId), 
                params
              );
  
              txns.push(stxn)
              signingIndex.push(signingIndex.length)
  
              appArgs = []
                appArgs.push(
                  new Uint8Array(Buffer.from("equip")),
                  new Uint8Array(Buffer.from("M"))
  
                )
  
                accounts = []
                foreignApps = []
                    
                foreignAssets = [newMagicId, props.nftId]
  
                intBox = longToByteArray(props.nftId)
            
                Box = new Uint8Array([...intBox, new Uint8Array(Buffer.from("M"))])
    
                boxes = [{appIndex: 0, name: Box}]
                  
                let metxn = algosdk.makeApplicationNoOpTxn(activeAccount.address, params, props.contracts.swapper, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
                txns.push(metxn)
                signingIndex.push(signingIndex.length)

            }

            
          }

          if (newHeadId != HeadId) {

            if (HeadId != 0) {

              found = false

              accountAssets.assets.forEach((asset) => {
                if (asset["asset-id"] == HeadId) {
                  found = true
                }
              })

              if (!found) {
                otxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
                  activeAccount.address, 
                  activeAccount.address, 
                  undefined, 
                  undefined,
                  0,  
                  undefined, 
                  Number(HeadId), 
                  params
                );

                txns.push(otxn)
                signingIndex.push(signingIndex.length)
                
              }

              

              appArgs = []
              appArgs.push(
                new Uint8Array(Buffer.from("unequip")),
                new Uint8Array(Buffer.from("H"))

              )

              accounts = [activeAccount.address]
              foreignApps = []
                  
              foreignAssets = [HeadId, props.nftId]

              intBox = longToByteArray(props.nftId)
          
              Box = new Uint8Array([...intBox, new Uint8Array(Buffer.from("H"))])

              boxes = [{appIndex: 0, name: Box}]
                
              let htxn = algosdk.makeApplicationNoOpTxn(activeAccount.address, params, props.contracts.swapper, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
              txns.push(htxn)
              signingIndex.push(signingIndex.length)

            }

            if (newHeadId != 0) {

              stxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
                activeAccount.address, 
                "BL6V7XEKWJ3WJDPXNTTD2D5HBFF4GUNXXDVPIUSMK662LYZQQBN5BDEXGQ", 
                undefined, 
                undefined,
                1,  
                undefined, 
                Number(newHeadId), 
                params
              );
  
              txns.push(stxn)
              signingIndex.push(signingIndex.length)
  
              appArgs = []
                appArgs.push(
                  new Uint8Array(Buffer.from("equip")),
                  new Uint8Array(Buffer.from("H"))
  
                )
  
                accounts = []
                foreignApps = []
                    
                foreignAssets = [newHeadId, props.nftId]
  
                intBox = longToByteArray(props.nftId)
            
                Box = new Uint8Array([...intBox, new Uint8Array(Buffer.from("H"))])
    
                boxes = [{appIndex: 0, name: Box}]
                  
                let hetxn = algosdk.makeApplicationNoOpTxn(activeAccount.address, params, props.contracts.swapper, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
                txns.push(hetxn)
                signingIndex.push(signingIndex.length)

            }

            
          }

          if (newArmourId != ArmourId) {

            if (ArmourId != 0) {

              found = false

              accountAssets.assets.forEach((asset) => {
                if (asset["asset-id"] == ArmourId) {
                  found = true
                }
              })

              if (!found) {
                otxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
                  activeAccount.address, 
                  activeAccount.address, 
                  undefined, 
                  undefined,
                  0,  
                  undefined, 
                  Number(ArmourId), 
                  params
                );

                txns.push(otxn)
                signingIndex.push(signingIndex.length)
                
              }

              

              appArgs = []
              appArgs.push(
                new Uint8Array(Buffer.from("unequip")),
                new Uint8Array(Buffer.from("A"))

              )

              accounts = [activeAccount.address]
              foreignApps = []
                  
              foreignAssets = [ArmourId, props.nftId]

              intBox = longToByteArray(props.nftId)
          
              Box = new Uint8Array([...intBox, new Uint8Array(Buffer.from("A"))])

              boxes = [{appIndex: 0, name: Box}]
                
              let atxn = algosdk.makeApplicationNoOpTxn(activeAccount.address, params, props.contracts.swapper, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
              txns.push(atxn)
              signingIndex.push(signingIndex.length)

            }

            if (newArmourId != 0) {

              stxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
                activeAccount.address, 
                "BL6V7XEKWJ3WJDPXNTTD2D5HBFF4GUNXXDVPIUSMK662LYZQQBN5BDEXGQ", 
                undefined, 
                undefined,
                1,  
                undefined, 
                Number(newArmourId), 
                params
              );
  
              txns.push(stxn)
              signingIndex.push(signingIndex.length)
  
              appArgs = []
                appArgs.push(
                  new Uint8Array(Buffer.from("equip")),
                  new Uint8Array(Buffer.from("A"))
  
                )
  
                accounts = []
                foreignApps = []
                    
                foreignAssets = [newArmourId, props.nftId]
  
                intBox = longToByteArray(props.nftId)
            
                Box = new Uint8Array([...intBox, new Uint8Array(Buffer.from("A"))])
    
                boxes = [{appIndex: 0, name: Box}]
                  
                let aetxn = algosdk.makeApplicationNoOpTxn(activeAccount.address, params, props.contracts.swapper, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
                txns.push(aetxn)
                signingIndex.push(signingIndex.length)

            }

            
          }

          if (newExtraId != ExtraId) {

            if (ExtraId != 0) {

              found = false

              accountAssets.assets.forEach((asset) => {
                if (asset["asset-id"] == ExtraId) {
                  found = true
                }
              })

              if (!found) {
                otxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
                  activeAccount.address, 
                  activeAccount.address, 
                  undefined, 
                  undefined,
                  0,  
                  undefined, 
                  Number(ExtraId), 
                  params
                );

                txns.push(otxn)
                signingIndex.push(signingIndex.length)
                
              }

              

              appArgs = []
              appArgs.push(
                new Uint8Array(Buffer.from("unequip")),
                new Uint8Array(Buffer.from("E"))

              )

              accounts = [activeAccount.address]
              foreignApps = []
                  
              foreignAssets = [ExtraId, props.nftId]

              intBox = longToByteArray(props.nftId)
          
              Box = new Uint8Array([...intBox, new Uint8Array(Buffer.from("E"))])

              boxes = [{appIndex: 0, name: Box}]
                
              let etxn = algosdk.makeApplicationNoOpTxn(activeAccount.address, params, props.contracts.swapper, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
              txns.push(etxn)
              signingIndex.push(signingIndex.length)

            }

            if (newExtraId != 0) {

              stxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
                activeAccount.address, 
                "BL6V7XEKWJ3WJDPXNTTD2D5HBFF4GUNXXDVPIUSMK662LYZQQBN5BDEXGQ", 
                undefined, 
                undefined,
                1,  
                undefined, 
                Number(newExtraId), 
                params
              );
  
              txns.push(stxn)
              signingIndex.push(signingIndex.length)
  
              appArgs = []
                appArgs.push(
                  new Uint8Array(Buffer.from("equip")),
                  new Uint8Array(Buffer.from("E"))
  
                )
  
                accounts = []
                foreignApps = []
                    
                foreignAssets = [newExtraId, props.nftId]
  
                intBox = longToByteArray(props.nftId)
            
                Box = new Uint8Array([...intBox, new Uint8Array(Buffer.from("E"))])
    
                boxes = [{appIndex: 0, name: Box}]
                  
                let eetxn = algosdk.makeApplicationNoOpTxn(activeAccount.address, params, props.contracts.swapper, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
                txns.push(eetxn)
                signingIndex.push(signingIndex.length)

            }

            
          }

          let response1 = await fetch('/api/getHash', {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
                name: nft.name,
                Background: BackgroundChange,
                Skin: Skin,
                Weapon: WeaponChange,
                Magic: MagicChange,
                Head: HeadChange,
                Armour: ArmourChange,
                Extra: ExtraChange
            }),
            
              
          });
  
          let session1 = await response1.json()
  
          let reserve = algosdk.encodeAddress(
            multihash.decode(
                new cid(session1.hash.toString()).multihash
            ).digest
          );

          let utxn = algosdk.makeAssetConfigTxnWithSuggestedParams(
            "L6VIKAHGH4D7XNH3CYCWKWWOHYPS3WYQM6HMIPNBVSYZWPNQ6OTS5VERQY", 
            new Uint8Array(Buffer.from(JSON.stringify(newMetadata))), 
            props.nftId,
            "L6VIKAHGH4D7XNH3CYCWKWWOHYPS3WYQM6HMIPNBVSYZWPNQ6OTS5VERQY",
            reserve, 
            undefined, 
            undefined, 
            params, 
            false
            );

          txns.push(utxn)

          if (txns.length > 1) {
            let txgroup = algosdk.assignGroupID(txns)
          }

         
          let encodedTxns= []

          txns.forEach((txn) => {
            let encoded = algosdk.encodeUnsignedTransaction(txn)
            encodedTxns.push(encoded)
    
          })

          props.setMessage("Sign transaction...")
    
          const signedTransactions = await signTransactions(encodedTxns, signingIndex)

          const txnBytes = algosdk.encodeUnsignedTransaction(utxn);
          const txnB64 = Buffer.from(txnBytes).toString('base64');

          let response = await fetch('/api/mintNft', {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
                txn: txnB64
            }),
            
              
          });
  
          let session = await response.json()
  
          const restoredSignedTxn = Buffer.from(session.signedTxn, 'base64')

          signedTransactions[signedTransactions.length - 1] = restoredSignedTxn

          props.setMessage("Sending transaction...")

          const { id } = await sendTransactions(signedTransactions)

          let confirmedTxn = await algosdk.waitForConfirmation(client, id, 4);

          props.setMessage("NFT updated")
            

          
        }


        if (props.zoom) {
          return (
            <div>
              <Grid container align="center">
              
                <Grid item xs={12} sm={12} md={6}>
                  {newImage && (BackgroundChange != Background || WeaponChange != Weapon || MagicChange != Magic || HeadChange != Head || ArmourChange != Armour ||  ExtraChange != Extra) ? 
                  <div>
                    <Button onClick={() => props.setSelWarrior(null)}>
                      <img style={{width: "100%", maxWidth: 500, border: "3px solid black", borderRadius: 15}} src={newImage} />
                    </Button>
                    <Button style={{backgroundColor: "white"}} onClick={() => mint()}>
                      <Typography variant="h6" > Update </Typography>
                    </Button>
                  </div>
                :
                  <Button onClick={() => props.setSelWarrior(null)}>
                      <img style={{width: "100%", maxWidth: 500, border: "3px solid black", borderRadius: 15}} src={nftUrl} />
                  </Button>
                }
                </Grid>
                {cat ? 
                  cat == "Background" ?
                  <>
                  <Grid item xs={12} sm={6} md={2}>
                    <Button onClick={() => [setBackgroundChange(Background), setCat(null), changeImg(Background, WeaponChange, MagicChange, HeadChange, ArmourChange, ExtraChange)]}>
                      <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={"/warriors/Background/" + Background + ".png"} />
                    </Button>
                    {props.ownTraits.length > 0 ? props.ownTraits.map((trait, index) => {
                      if (trait.type == "Background" && trait.name != Background) {
                        return (
                          <Button key={index} onClick={() => [setBackgroundChange(trait.name), setCat(null), changeImg(trait.name, WeaponChange, MagicChange, HeadChange, ArmourChange, ExtraChange)]}>
                          <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={"/warriors/Background/" + trait.name + ".png"} />
                          </Button>
                        )
                      }
                    })
                    :
                    null
                    }
                  </Grid>
                  
                  </>
                  :
                  cat == "Weapon" ?
                  <>
                  <Grid item xs={12} sm={6} md={2}>
                    <Button onClick={() => [setWeaponChange("None"), setCat(null), changeImg(BackgroundChange, "None", MagicChange, HeadChange, ArmourChange, ExtraChange)]}>
                      <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={"/warriors/weapon.svg"} />
                    </Button>
                    {Weapon != "None" ?
                    <Button onClick={() => [setWeaponChange(Weapon), setCat(null), changeImg(BackgroundChange, Weapon, MagicChange, HeadChange, ArmourChange, ExtraChange)]}>
                    <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={"/warriors/Weapon/" + Weapon + ".png"} />
                    </Button>
                    :
                    null
                    }
                    {props.ownTraits.length > 0 ? props.ownTraits.map((trait, index) => {
                      console.log(trait)
                      if (trait.type == "Weapon" && trait.name != Weapon) {
                        return (
                          <Button key={index} onClick={() => [setWeaponChange(trait.name), setCat(null), changeImg(BackgroundChange, trait.name, MagicChange, HeadChange, ArmourChange, ExtraChange)]}>
                          <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={"/warriors/Weapon/" + trait.name + ".png"} />
                          </Button>
                        )
                      }
                    })
                    :
                    null
                    }
                    
                  </Grid>
                  
                  </>
                  :
                  cat == "Magic" ?
                  <>
                  <Grid item xs={12} sm={6} md={2}>
                    <Button onClick={() => [setMagicChange("None"), setCat(null), changeImg(BackgroundChange, WeaponChange, "None", HeadChange, ArmourChange, ExtraChange)]}>
                      <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={"/warriors/magic.svg"} />
                    </Button>
                    
                    {Magic != "None" ?
                    <Button onClick={() => [setMagicChange(Magic), setCat(null), changeImg(BackgroundChange, WeaponChange, Magic, HeadChange, ArmourChange, ExtraChange)]}>
                    <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={"/warriors/Magic/" + Magic + ".png"} />
                    </Button>
                    :
                    null
                    }
                    {props.ownTraits.length > 0 ? props.ownTraits.map((trait, index) => {
                      if (trait.type == "Magic" && trait.name != Magic) {
                        return (
                          <Button key={index} onClick={() => [setMagicChange(trait.name), setCat(null), changeImg(BackgroundChange, WeaponChange, trait.name, HeadChange, ArmourChange, ExtraChange)]}>
                          <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={"/warriors/Magic/" + trait.name + ".png"} />
                          </Button>
                        )
                      }
                    })
                    :
                    null
                    }
                  </Grid>
                  
                  </>
                  :
                  cat == "Head" ?
                  <>
                  <Grid item xs={12} sm={6} md={2}>
                    
                    {Head != "None" ?
                    <Button onClick={() => [setHeadChange(Head), setCat(null), changeImg(BackgroundChange, WeaponChange, MagicChange, Head, ArmourChange, ExtraChange)]}>
                    <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={"/warriors/Head/" + Head + ".png"} />
                    </Button>
                    :
                    null
                    }
                    {props.ownTraits.length > 0 ? props.ownTraits.map((trait, index) => {
                      if (trait.type == "Head" && trait.name != Head) {
                        return (
                          <Button key={index} onClick={() => [setHeadChange(trait.name), setCat(null), changeImg(BackgroundChange, WeaponChange, MagicChange, trait.name, ArmourChange, ExtraChange)]}>
                          <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={"/warriors/Head/" + trait.name + ".png"} />
                          </Button>
                        )
                      }
                    })
                    :
                    null
                    }
                  </Grid>
                  
                  </>
                  :
                  cat == "Armour" ?
                  <>
                  <Grid item xs={12} sm={6} md={2}>
                    <Button onClick={() => [setArmourChange("None"), setCat(null), changeImg(BackgroundChange, WeaponChange, MagicChange, HeadChange, "None", ExtraChange)]}>
                      <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={"/warriors/armour.svg"} />
                    </Button>
                    
                    {Armour != "None" ?
                    <Button onClick={() => [setArmourChange(Armour), setCat(null), changeImg(BackgroundChange, WeaponChange, MagicChange, HeadChange, Armour, ExtraChange)]}>
                    <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={"/warriors/Armour/" + Armour + ".png"} />
                    </Button>
                    :
                    null
                    }
                    {props.ownTraits.length > 0 ? props.ownTraits.map((trait, index) => {
                      if (trait.type == "Armour" && trait.name != Armour) {
                        return (
                          <Button key={index} onClick={() => [setArmourChange(trait.name), setCat(null), changeImg(BackgroundChange, WeaponChange, MagicChange, HeadChange, trait.name, ExtraChange)]}>
                          <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={"/warriors/Armour/" + trait.name + ".png"} />
                          </Button>
                        )
                      }
                    })
                    :
                    null
                    }
                  </Grid>
                  
                  </>
                  :
                  cat == "Extra" ?
                  <>
                  <Grid item xs={12} sm={6} md={2}>
                    <Button onClick={() => [setExtraChange("None"), setCat(null), changeImg(BackgroundChange, WeaponChange, MagicChange, HeadChange, ArmourChange, "None")]}>
                      <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={"/warriors/extra.svg"} />
                    </Button>
                  </Grid>
                  {Extra != "None" ?
                    <Button onClick={() => [setExtraChange(Extra), setCat(null), changeImg(BackgroundChange, WeaponChange, MagicChange, HeadChange, ArmourChange, Extra)]}>
                    <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={"/warriors/Extra/" + Extra + ".png"} />
                  </Button>
                    :
                    null
                    }
                    {props.ownTraits.length > 0 ? props.ownTraits.map((trait, index) => {
                      if (trait.type == "Extra" && trait.name != Extra) {
                        return (
                          <Button key={index} onClick={() => [setExtraChange(trait.name), setCat(null), changeImg(BackgroundChange, WeaponChange, MagicChange, HeadChange, ArmourChange, trait.name)]}>
                          <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={"/warriors/Extra/" + trait.name + ".png"} />
                          </Button>
                        )
                      }
                    })
                    :
                    null
                    }
                  
                  </>
                  :
                  null
                  :
                  <>
                  <Grid item xs={12} sm={6} md={2}>
                  <Button onClick={() => setCat("Background")}>
                  {BackgroundChange == "None" ?
                    <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={"/warriors/background.svg"} />
                    :
                    <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={"/warriors/Background/" + BackgroundChange + ".png"} />
                  }
                  </Button>
                  <Button onClick={() => setCat("Head")}>
                    {HeadChange == "None" ?
                    <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={"/warriors/head.svg"} />
                    :
                    <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={"/warriors/Head/" + HeadChange + ".png"} />
                    }
                  </Button>
                  <Button onClick={() => setCat("Weapon")}>
                    {WeaponChange == "None" ?
                    <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={"/warriors/weapon.svg"} />
                    :
                    <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={"/warriors/Weapon/" + WeaponChange + ".png"} />
                    }
                  </Button>
                  <Button onClick={() => setCat("Extra")}>
                    {ExtraChange == "None" ?
                    <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={"/warriors/extra.svg"} />
                    :
                    <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={"/warriors/Extra/" + ExtraChange + ".png"} />
                    }
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                
                  <Button>
                    {Skin == "None" ?
                    <img style={{width: 150, height: 150, border: "2px solid white", borderRadius: 15, padding: 10}} src={"/warriors/skin.svg"} />
                    :
                    <img style={{width: 150, height: 150, border: "2px solid white", borderRadius: 15, padding: 10}} src={"/warriors/Skin/" + Skin + ".png"} />
                    }
                  </Button>
                  <Button onClick={() => setCat("Armour")}>
                    {ArmourChange == "None" ?
                      <img style={{width: 150, height: 150, border: "2px solid white", borderRadius: 15, padding: 10}} src={"/warriors/armour.svg"} />
                      :
                      <img style={{width: 150, height: 150, border: "2px solid white", borderRadius: 15, padding: 10}} src={"/warriors/Armour/" + ArmourChange + ".png"} />
                    }
                  </Button>
                  <Button onClick={() => setCat("Magic")}>
                    {MagicChange == "None" ?
                    <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={"/warriors/magic.svg"} />
                    :
                    <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={"/warriors/Magic/" + MagicChange + ".png"} />
                    }
                  </Button>
                </Grid>
                </>
                
                }
                

              </Grid>
            </div>
          )
        }
        else {
          return (
            <img style={{width: "100%", maxWidth: 500, border: "3px solid black", borderRadius: 15}} src={nftUrl} />
          )
        }

        
       


            
            
  
    
}