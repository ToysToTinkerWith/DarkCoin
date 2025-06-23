import React, {useState, useEffect} from "react"

import algosdk from "algosdk"

import { Typography, Button, Grid } from "@mui/material"

import { CID } from 'multiformats/cid'

import { db } from "../../../Firebase/FirebaseInit"
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";


import { storage } from "../../../Firebase/FirebaseInit"
import { getDownloadURL, ref } from "firebase/storage";

import * as mfsha2 from 'multiformats/hashes/sha2'
import * as digest from 'multiformats/hashes/digest'

import { useWallet } from '@txnlab/use-wallet'

import multihash from "multihashes"

import cid from 'cids'
import Character from "./Character"

export default function Swapper(props) { 

  const { activeAccount, signTransactions, sendTransactions } = useWallet()


  const [ nft, setNft ] = useState(null)
  const [ nftUrl, setNftUrl ] = useState(null)
  const [ zoomNft, setZoomNft ] = useState(null)
  const [ confirm, setConfirm ] = useState("")

  const [ char, setChar ] = useState(null)
  const [ charObject, setCharObject ] = useState(null)


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

  const [ ownedBackgrounds, setOwnedBackgrounds ] = useState([])
  const [ ownedWeapons, setOwnedWeapons ] = useState([])
  const [ ownedMagics, setOwnedMagics ] = useState([])
  const [ ownedHeads, setOwnedHeads ] = useState([])
  const [ ownedArmours, setOwnedArmours ] = useState([])
  const [ ownedExtras, setOwnedExtras ] = useState([])

  const [ cat, setCat ] = useState(null)

  const [ newImage, setNewImage ] = useState(null)

  const [ displayRoll, setDisplayRoll ] = useState("")


  const fetchData = async () => {

    setCharObject(null)


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

  if (session.charObject != "none") {
    setCharObject(session.charObject)
  }

  

  if (props.zoom) {

    const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)


    let assetBox = algosdk.encodeUint64(props.nftId)
    
    try {
      console.log("here")

        let accountBoxCurrent = await client.getApplicationBoxByName(props.contracts.dragonshorde, new Uint8Array([...assetBox, ...new Uint8Array(Buffer.from("current"))])).do();
        
        console.log(accountBoxCurrent)


        setDisplayRoll("Character already in horde")
        
    }
    catch(err) {
      setDisplayRoll(true)
    }

    let char = JSON.parse(session.charStats)
    setChar(char)


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

    let ArmourBox = await client.getApplicationBoxByName(props.contracts.swapper, new Uint8Array([...longToByteArray(props.nftId), new Uint8Array(Buffer.from("A"))])).do();
    ArmourId = byteArrayToLong(ArmourBox.value)

    let ExtraBox = await client.getApplicationBoxByName(props.contracts.swapper, new Uint8Array([...longToByteArray(props.nftId), new Uint8Array(Buffer.from("E"))])).do();
    ExtraId = byteArrayToLong(ExtraBox.value)

    let Background = "None"
    let Skin = char.properties.Skin
    let Weapon = "None"
    let Magic = "None"
    let Head = "None"
    let Armour = "None"
    let Extra = "None"

    props.traits.forEach((trait) => {
      if (trait.assetId == BackgroundId) {
        Background = trait.name
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


    let extraRef
    let armourRef
    let magicRef
    let weaponRef
    let headRef
    let skinRef
    let backgroundRef

    if (Extra != "None") {
      extraRef = ref(storage, "warriors/Extra/" + Extra + ".png");
    }
    if (Armour != "None") {
        armourRef = ref(storage, "warriors/Armour/" + Armour + ".png");
    }
    if (Magic != "None") {
        magicRef = ref(storage, "warriors/Magic/" + Magic + ".png");
    }
    if (Weapon != "None") {
        weaponRef = ref(storage, "warriors/Weapon/" + Weapon + ".png");
    }
    headRef = ref(storage, "warriors/Head/" + Head + ".png");
    skinRef = ref(storage, "warriors/Skin/" + Skin + ".png");
    backgroundRef = ref(storage, "warriors/Background/" + Background.slice(0, Background.length - 11) + ".png");

    let extraUrl = "None"
    let armourUrl = "None"
    let magicUrl = "None"
    let weaponUrl = "None"
    let headUrl = "None"
    let skinUrl = "None"
    let backgroundUrl = "None"
    
    if (Extra != "None") {
        await getDownloadURL(extraRef)
        .then((url) => {
            extraUrl = url
        })
    }
    if (Armour != "None") {
        await getDownloadURL(armourRef)
        .then((url) => {
            armourUrl = url
        })
    }
    if (Magic != "None") {
        await getDownloadURL(magicRef)
        .then((url) => {
            magicUrl = url
        })
    }
    if (Weapon != "None") {
        await getDownloadURL(weaponRef)
        .then((url) => {
            weaponUrl = url
        })
    }
    await getDownloadURL(headRef)
    .then((url) => {
        headUrl = url
    })
    await getDownloadURL(skinRef)
    .then((url) => {
        skinUrl = url
    })
    await getDownloadURL(backgroundRef)
    .then((url) => {
        backgroundUrl = url
    })


    setBackground(backgroundUrl)
    setSkin(skinUrl)
    setWeapon(weaponUrl)
    setMagic(magicUrl)
    setHead(headUrl)
    setArmour(armourUrl)
    setExtra(extraUrl)

    setBackgroundChange("None")
    setWeaponChange("None")
    setMagicChange("None")
    setHeadChange("None")
    setArmourChange("None")
    setExtraChange("None")

    setBackgroundId(BackgroundId)
    setWeaponId(WeaponId)
    setMagicId(MagicId)
    setHeadId(HeadId)
    setArmourId(ArmourId)
    setExtraId(ExtraId)

    let backgrounds = []
    let weapons = []
    let magics = []
    let heads = []
    let armours = []
    let extras = []

    props.ownTraits.forEach(async (trait) => {
      if (trait.type == "Background") {
        await getDownloadURL(ref(storage, "warriors/Background/" + trait.name.slice(0, trait.name.length - 11) + ".png")).then((url) => {
          if (!ownedBackgrounds.includes({assetId: trait.assetId, name: trait.name, type: trait.type, url: url}) && url != backgroundUrl) {
            backgrounds.push({assetId: trait.assetId, name: trait.name, type: trait.type, url: url})
          }
        })
      }
      if (trait.type == "Weapon") {
        await getDownloadURL(ref(storage, "warriors/Weapon/" + trait.name + ".png")).then((url) => {
          if (!ownedWeapons.includes({assetId: trait.assetId, name: trait.name, type: trait.type, url: url}) && url != weaponUrl) {
            weapons.push({assetId: trait.assetId, name: trait.name, type: trait.type, url: url})

          }
        })
      }
      if (trait.type == "Magic") {
        await getDownloadURL(ref(storage, "warriors/Magic/" + trait.name + ".png")).then((url) => {
          if (!ownedMagics.includes({assetId: trait.assetId, name: trait.name, type: trait.type, url: url}) && url != magicUrl) {
            magics.push({assetId: trait.assetId, name: trait.name, type: trait.type, url: url})
          }
        })
      }
      if (trait.type == "Head") {
        await getDownloadURL(ref(storage, "warriors/Head/" + trait.name + ".png")).then((url) => {
          if (!ownedHeads.includes({assetId: trait.assetId, name: trait.name, type: trait.type, url: url}) && url != headUrl) {
            heads.push({assetId: trait.assetId, name: trait.name, type: trait.type, url: url})
          }
        })
      }
      if (trait.type == "Armour") {
        await getDownloadURL(ref(storage, "warriors/Armour/" + trait.name + ".png")).then((url) => {
          if (!ownedArmours.includes({assetId: trait.assetId, name: trait.name, type: trait.type, url: url}) && url != armourUrl) {
            armours.push({assetId: trait.assetId, name: trait.name, type: trait.type, url: url})
          }
        })
      }
      if (trait.type == "Extra") {
        await getDownloadURL(ref(storage, "warriors/Extra/" + trait.name + ".png")).then((url) => {
          if (!ownedExtras.includes({assetId: trait.assetId, name: trait.name, type: trait.type, url: url}) && url != extraUrl) {
            extras.push({assetId: trait.assetId, name: trait.name, type: trait.type, url: url})
          }
        })
      }
    })

    setOwnedBackgrounds(backgrounds)
    setOwnedWeapons(weapons)
    setOwnedMagics(magics)
    setOwnedHeads(heads)
    setOwnedArmours(armours)
    setOwnedExtras(extras)



  }

       
  

    }


    useEffect(() => {

      
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

        const changeImg = async (action, type) => {

          
            props.setMessage("Updating image...")

            

            let B = BackgroundChange != "None" ? BackgroundChange.url : Background
            let W = WeaponChange != "None" ? WeaponChange.url : Weapon
            let M = MagicChange != "None" ? MagicChange.url : Magic
            let H = HeadChange != "None" ? HeadChange.url : Head
            let A = ArmourChange != "None" ? ArmourChange.url : Armour
            let E = ExtraChange != "None" ? ExtraChange.url : Extra

            if (WeaponChange == "Remove") {
              W = "None"
            }
            if (MagicChange == "Remove") {
              M = "None"
            }
            if (ArmourChange == "Remove") {
              A = "None"
            }
            if (ExtraChange == "Remove") {
              E = "None"
            }

            if (action == "Remove") {
              if (type == "Weapon") {
                W = "None"
              }
              if (type == "Magic") {
                M = "None"
              }
              if (type == "Armour") {
                A = "None"
              }
              if (type == "Extra") {
                E = "None"
              }
            }

            else if (action == "None") {
              if (type == "Background") {
                B = "None"
              }
              if (type == "Weapon") {
                W = "None"
              }
              if (type == "Magic") {
                M = "None"
              }
              if (type == "Head") {
                H = "None"
              }
              if (type == "Armour") {
                A = "None"
              }
              if (type == "Extra") {
                E = "None"
              }
            }
            else {
              if (type == "Background") {
                B = action.url
              }
              if (type == "Weapon") {
                W = action.url
              }
              if (type == "Magic") {
                M = action.url
              }
              if (type == "Head") {
                H = action.url
              }
              if (type == "Armour") {
                A = action.url
              }
              if (type == "Extra") {
                E = action.url
              }
            }

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


              props.setMessage("")

      
              setNewImage(session.image)
          
        
        }

        const mint = async () => {

          try {

          props.setMessage("Initializing transaction...")
          props.setProgress(0)

          let newMetadata = Object.assign({}, char)


          const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)

          const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)

          let params = await client.getTransactionParams().do();

          const accountAssets = await indexerClient.lookupAccountAssets(activeAccount.address).do();

          let found
          let otxn
          let stxn


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

          if (BackgroundChange != "None" && BackgroundChange != "Remove") {
              newMetadata.properties.Background = BackgroundChange.name
              newBackgroundId = BackgroundChange.assetId
          }
          if (WeaponChange != "None" && WeaponChange != "Remove") {
            newMetadata.properties.Weapon = WeaponChange.name
            newWeaponId = WeaponChange.assetId
          }
          else if (WeaponChange == "Remove"){
            newMetadata.properties.Weapon = "None"
          }
          if (MagicChange != "None" && MagicChange != "Remove") {
            newMetadata.properties.Magic = MagicChange.name
            newMagicId = MagicChange.assetId
          }
          else if (MagicChange == "Remove") {
            newMetadata.properties.Magic = "None"
          }
          if (HeadChange != "None" && HeadChange != "Remove") {
            newMetadata.properties.Head = HeadChange.name
            newHeadId = HeadChange.assetId
          }
          if (ArmourChange != "None" && ArmourChange != "Remove") {
            newMetadata.properties.Armour = ArmourChange.name
            newArmourId = ArmourChange.assetId
          }
          else if (ArmourChange == "Remove"){
            newMetadata.properties.Armour = "None"
          }
          if (ExtraChange != "None" && ExtraChange != "Remove") {
            newMetadata.properties.Extra = ExtraChange.name
            newExtraId = ExtraChange.assetId
          }
          else if (ExtraChange == "Remove"){
            newMetadata.properties.Extra = "None"
          }


       

          let ftxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
            activeAccount.address, 
            "ZATKR4UKC6II7CGXVV4GOSEQLMVY72DBSEY5X4MMKQRT5SOPN3JZA6RWPA", 
            undefined, 
            undefined,
            10000000000,  
            undefined, 
            1088771340, 
            params
          );

          txns.push(ftxn)
          signingIndex.push(signingIndex.length)

          if (newBackgroundId != 0) {

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
                    
                foreignAssets = [newBackgroundId, props.nftId]
  
                intBox = longToByteArray(props.nftId)
            
                Box = new Uint8Array([...intBox, new Uint8Array(Buffer.from("B"))])
    
                boxes = [{appIndex: 0, name: Box}]

                let betxn = algosdk.makeApplicationNoOpTxn(activeAccount.address, params, props.contracts.swapper, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
                txns.push(betxn)
                signingIndex.push(signingIndex.length)

            }

            
          }

          if (newWeaponId != 0 || WeaponChange == "Remove") {

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

          if (newMagicId != 0 || MagicChange == "Remove") {

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

          if (newHeadId != 0) {

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

          if (newArmourId != 0  || ArmourChange == "Remove") {

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

          if (newExtraId != 0  || ExtraChange == "Remove") {

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
      

          let B = BackgroundChange != "None" ? BackgroundChange.url : Background
          let W = WeaponChange != "None" ? WeaponChange.url : Weapon
          let M = MagicChange != "None" ? MagicChange.url : Magic
          let H = HeadChange != "None" ? HeadChange.url : Head
          let A = ArmourChange != "None" ? ArmourChange.url : Armour
          let E = ExtraChange != "None" ? ExtraChange.url : Extra

          if (WeaponChange == "Remove") {
            W = "None"
          }
          if (MagicChange == "Remove") {
            M = "None"
          }
          if (ArmourChange == "Remove") {
            A = "None"
          }
          if (ExtraChange == "Remove") {
            E = "None"
          }

          let response1 = await fetch('/api/getHash', {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
                properties: newMetadata.properties,
                name: nft.name,
                Background: B,
                Skin: Skin,
                Weapon: W,
                Magic: M,
                Head: H,
                Armour: A,
                Extra: E,
                charId: props.nftId

            }),
            
              
          });
  
          let session1 = await response1.json()

          props.setMessage("Generating character...")
          props.setProgress(20)

          let responseChar = await fetch('/api/arena/generateChar', {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
                charId: props.nftId,
                url: session1.url
            }),
            
              
          });

          props.setMessage("Generating moves...")
          props.setProgress(30)


          let sessionChar = await responseChar.json()

          let responseMove1 = await fetch('/api/arena/generateMove', {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
                charId: props.nftId,
                url: session1.url,
                charMove: 0
            
            }),
            
              
          });

          let sessionMove1 = await responseMove1.json()

          props.setProgress(50)

          let responseMove2 = await fetch('/api/arena/generateMove', {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
                charId: props.nftId,
                url: session1.url,
                charMove: 1
            
            }),
            
              
          });

          let sessionMove2 = await responseMove2.json()

          props.setProgress(70)

          let responseMove3 = await fetch('/api/arena/generateMove', {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
                charId: props.nftId,
                url: session1.url,
                charMove: 2
            
            }),
            
              
          });

          let sessionMove3 = await responseMove3.json()

          props.setProgress(90)

          let responseMove4 = await fetch('/api/arena/generateMove', {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
                charId: props.nftId,
                url: session1.url,
                charMove: 3
            
            }),
            
              
          });

          let sessionMove4 = await responseMove4.json()

          let charObj

          const docRef = doc(db, "chars", props.nftId + String("object"));
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            charObj = docSnap.data().charObj
          } else {
          // docSnap.data() will be undefined in this case
          //console.log("No such document!");
          }

          charObj.moves[0] = charObj.moves[0].name
          charObj.moves[1] = charObj.moves[1].name
          charObj.moves[2] = charObj.moves[2].name
          charObj.moves[3] = charObj.moves[3].name


          let charString = JSON.stringify(charObj)

          appArgs = []
          appArgs.push(
            new Uint8Array(Buffer.from("updateCharacter")),
            new Uint8Array(Buffer.from(charString))

          )

          accounts = []
          foreignApps = []
              
          foreignAssets = [props.nftId]

          intBox = longToByteArray(props.nftId)
      
          Box = new Uint8Array([...intBox])

          boxes = [{appIndex: 0, name: Box}, {appIndex: 0, name: Box}, {appIndex: 0, name: Box}]

          let ctxn = algosdk.makeApplicationNoOpTxn(activeAccount.address, params, props.contracts.dragonshorde, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
          txns.push(ctxn)
          signingIndex.push(signingIndex.length)


          
  
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

          props.setProgress(100)

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

          props.setProgress(0)
          props.setMessage("Sending transaction...")

          const { id } = await sendTransactions(signedTransactions)

          let confirmedTxn = await algosdk.waitForConfirmation(client, id, 4);

          props.setMessage("NFT updated")

          await props.refetchData()
          await fetchData()

        }

        catch (error) {
          console.log(error)
          props.setMessage(String(error))
        }
            

          
        }

        if (props.zoom) {

          return (
            <div>
              <br />
              <br />
              <Grid container align="center">
              
                <Grid item xs={12} sm={12} md={6}>
                  {newImage && (BackgroundChange != Background || WeaponChange != Weapon || MagicChange != Magic || HeadChange != Head || ArmourChange != Armour ||  ExtraChange != Extra) ? 
                  <div>
                    <Button onClick={() => props.setSelWarrior(null)}>
                      <img style={{width: "100%", maxWidth: 500, border: "3px solid black", borderRadius: 15}} src={newImage} />
                    </Button>
                    
                  </div>
                :
                  <Button onClick={() => props.setSelWarrior(null)}>
                      <img style={{width: "100%", maxWidth: 500, border: "3px solid black", borderRadius: 15}} src={nftUrl} />
                  </Button>
                }
                {displayRoll == true ? 
                <Button style={{backgroundColor: "white", fontFamily: "Jacques", padding: 10}} onClick={() => mint()}>
                  <Typography variant="h6" > Roll 10,000 </Typography>
                  <img src="/invDC.svg" style={{display: "flex", margin: "auto", width: 50, padding: 10}} />

                </Button>
                :
                <Typography variant="h6" color="secondary" > {displayRoll} </Typography>

                }
                
                </Grid>
                {cat ? 
                  cat == "Background" ?
                  <>
                  <Grid item xs={12} sm={6} md={2}>
                    <Button onClick={() => [setBackgroundChange("None"), setCat(null), changeImg("None", "Background")]}>
                      <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={Background} />
                    </Button>
                    {ownedBackgrounds.length > 0 ? ownedBackgrounds.map((trait, index) => {
                      return (
                        <Button key={index} onClick={() => [setBackgroundChange(trait), setCat(null), changeImg(trait, "Background")]}>
                        <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={trait.url} />
                        </Button>
                      )
                      
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
                    <Button onClick={() => [setWeaponChange("Remove"), setWeapon("None"), setCat(null), changeImg("Remove", "Weapon")]}>
                      <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={"/warriors/weapon.svg"} />
                    </Button>
                    {Weapon != "None" ?
                    <Button onClick={() => [setWeaponChange("None"), setCat(null), changeImg("None", "Weapon")]}>
                    <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={Weapon} />
                    </Button>
                    :
                    null
                    }
                    {ownedWeapons.length > 0 ? ownedWeapons.map((trait, index) => {
                        return (
                          <Button key={index} onClick={() => [setWeaponChange(trait), setWeapon(trait), setCat(null), changeImg(trait, "Weapon")]}>
                          <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={trait.url} />
                          </Button>
                        )
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
                    <Button onClick={() => [setMagicChange("Remove"), setMagic("None"), setCat(null), changeImg("Remove", "Magic")]}>
                      <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={"/warriors/magic.svg"} />
                    </Button>
                    
                    {Magic != "None" ?
                    <Button onClick={() => [setMagicChange("None"), setCat(null), changeImg("None", "Magic")]}>
                    <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={Magic} />
                    </Button>
                    :
                    null
                    }
                    {ownedMagics.length > 0 ? ownedMagics.map((trait, index) => {
                        return (
                          <Button key={index} onClick={() => [setMagicChange(trait), setMagic(trait), setCat(null), changeImg(trait, "Magic")]}>
                          <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={trait.url} />
                          </Button>
                        )
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
                    <Button onClick={() => [setHeadChange("None"), setCat(null), changeImg("None", "Head")]}>
                    <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={Head} />
                    </Button>
                    :
                    null
                    }
                    {ownedHeads.length > 0 ? ownedHeads.map((trait, index) => {
                        return (
                          <Button key={index} onClick={() => [setHeadChange(trait), setCat(null), changeImg(trait, "Head")]}>
                          <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={trait.url} />
                          </Button>
                        )
                      
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
                    <Button onClick={() => [setArmourChange("Remove"), setArmour("None"), setCat(null), changeImg("Remove", "Armour")]}>
                      <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={"/warriors/armour.svg"} />
                    </Button>
                    
                    {Armour != "None" ?
                    <Button onClick={() => [setArmourChange("None"), setCat(null), changeImg("None", "Armour")]}>
                    <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={Armour} />
                    </Button>
                    :
                    null
                    }
                    {ownedArmours.length > 0 ? ownedArmours.map((trait, index) => {
                        return (
                          <Button key={index} onClick={() => [setArmourChange(trait), setArmour(trait), setCat(null), changeImg(trait, "Armour")]}>
                          <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={trait.url} />
                          </Button>
                        )
                      
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
                    <Button onClick={() => [setExtraChange("Remove"), setExtra("None"), setCat(null), changeImg("Remove", "Extra")]}>
                      <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={"/warriors/extra.svg"} />
                    </Button>
                  </Grid>
                  {Extra != "None" ?
                    <Button onClick={() => [setExtraChange("None"), setCat(null), changeImg("None", "Extra")]}>
                    <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={Extra} />
                  </Button>
                    :
                    null
                    }
                    {ownedExtras.length > 0 ? ownedExtras.map((trait, index) => {
                        return (
                          <Button key={index} onClick={() => [setExtraChange(trait), setExtra(trait), setCat(null), changeImg(trait, "Extra")]}>
                          <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={trait.url} />
                          </Button>
                        )
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
                  {Background == "None" ?
                    <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={"/warriors/background.svg"} />
                    :
                    BackgroundChange == "None" ?
                    <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={Background} />
                    :
                    <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={BackgroundChange.url} />

                  }
                  </Button>
                  <Button onClick={() => setCat("Head")}>
                    {Head == "None" ?
                    <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={"/warriors/head.svg"} />
                    :
                    HeadChange == "None" ?
                    <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={Head} />
                    :
                    <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={HeadChange.url} />
                    }
                  </Button>
                  <Button onClick={() => setCat("Weapon")}>
                    {Weapon == "None" || WeaponChange == "Remove" ?
                    <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={"/warriors/weapon.svg"} />
                    :
                    WeaponChange == "None" ?
                    <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={Weapon} />
                    :
                    <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={WeaponChange.url} />

                    }
                  </Button>
                  <Button onClick={() => setCat("Extra")}>
                    {Extra == "None" || ExtraChange == "Remove" ?
                    <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={"/warriors/extra.svg"} />
                    :
                    ExtraChange == "None" ?
                    <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={Extra} />
                    :
                    <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={ExtraChange.url} />

                    }
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                
                  <Button>
                    {Skin == "None" ?
                    <img style={{width: 150, height: 150, border: "2px solid white", borderRadius: 15, padding: 10}} src={"/warriors/skin.svg"} />
                    :
                    <img style={{width: 150, height: 150, border: "2px solid white", borderRadius: 15, padding: 10}} src={Skin} />
                    }
                  </Button>
                  <Button onClick={() => setCat("Armour")}>
                    {Armour == "None" || ArmourChange == "Remove" ?
                      <img style={{width: 150, height: 150, border: "2px solid white", borderRadius: 15, padding: 10}} src={"/warriors/armour.svg"} />
                      :
                      ArmourChange == "None" ?
                    <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={Armour} />
                    :
                    <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={ArmourChange.url} />

                    }
                  </Button>
                  <Button onClick={() => setCat("Magic")}>
                    {Magic == "None" || MagicChange == "Remove" ?
                    <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={"/warriors/magic.svg"} />
                    :
                    MagicChange == "None" ?
                    <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={Magic} />
                    :
                    <img style={{width: 100, height: 100, border: "2px solid white", borderRadius: 15, padding: 10}} src={MagicChange.url} />

                    }
                  </Button>
                </Grid>

                {charObject ? 
                  <Character nftId={props.nftId} contracts={props.contracts} setMessage={props.setMessage} />
                  :
                  null
                }
                </>
                
                }

                
                

              </Grid>
            </div>
          )
        }
        else {
          return (
            <div>
              {charObject ? 
                <Typography color="secondary" variant="caption" style={{position: "absolute", top: 20, left: "25%"}}> {charObject.name} </Typography>
                :
                null
              }
              <img style={{width: "100%", maxWidth: 500, border: "3px solid black", borderRadius: 15, border: charObject ? "3px solid white" : null}} src={nftUrl} />
            </div>
          )
        }

        
       


            
            
  
    
}