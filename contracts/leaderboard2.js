import algosdk from "algosdk"

import { CID } from 'multiformats/cid'


import * as mfsha2 from 'multiformats/hashes/sha2'
import * as digest from 'multiformats/hashes/digest'


const main = async () => {

    const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)

    

    let leaderboard = []

    let sortedPlayers = leaderboard.sort((a, b)=> {
            if (a.numWins === b.numWins){
                if (a.earnings === b.earnings) {
                return a.assetId > b.assetId ? 1 : -1
                }
                else {
                return a.earnings < b.earnings ? 1 : -1
                }
                
            } else {
                return a.numWins < b.numWins ? 1 : -1
            }
        })

    console.log(sortedPlayers[0].assetId)

    let nft1 = await indexerClient.searchForAssets().index(sortedPlayers[0].assetId).do();

    console.log(nft1.assets[0].params.url)

    let nameWinner1 = nft1.assets[0].params.name
    let urlWinner1

    if (nameWinner1.substring(0, 18) == "Dark Coin Champion") {
        let addr = algosdk.decodeAddress(nft1.assets[0].params.reserve)

        let mhdigest = digest.create(mfsha2.sha256.code, addr.publicKey)

        let ocid = CID.create(0, 0x70, mhdigest)

        urlWinner1 = "https://ipfs.dark-coin.io/ipfs/" + ocid.toString()


    }
    else {
        urlWinner1 = "https://gateway.pinata.cloud/ipfs/" + nft1.assets[0].params.url.slice(34)
    }

    let embeds = []
            
    embeds.push({
        "title" : nameWinner1,
        "description" : "1st place. Net Wins = " + sortedPlayers[0].numWins,
        "url": "https://explorer.perawallet.app/asset/" + sortedPlayers[0].assetId,
        "image": {
            "url": String(urlWinner1)
        },
        "color": 15844367
    })

    let nft2 = await indexerClient.searchForAssets().index(sortedPlayers[1].assetId).do();

    console.log(nft2.assets[0].params.url)

    let nameWinner2 = nft2.assets[0].params.name
    let urlWinner2

    if (nameWinner2.substring(0, 18) == "Dark Coin Champion") {
        let addr = algosdk.decodeAddress(nft2.assets[0].params.reserve)

        let mhdigest = digest.create(mfsha2.sha256.code, addr.publicKey)

        let ocid = CID.create(0, 0x70, mhdigest)

        urlWinner2 = "https://ipfs.dark-coin.io/ipfs/" + ocid.toString()


    }
    else {
        urlWinner2 = "https://gateway.pinata.cloud/ipfs/" + nft2.assets[0].params.url.slice(34)
    }
            
    embeds.push({
        "title" : nameWinner2,
        "description" : "2nd place. Net Wins = " + sortedPlayers[1].numWins,
        "url": "https://explorer.perawallet.app/asset/" + sortedPlayers[1].assetId,
        "image": {
            "url": String(urlWinner2)
        },
        "color": 12370112
    })

    let nft3 = await indexerClient.searchForAssets().index(sortedPlayers[2].assetId).do();

    console.log(nft3.assets[0].params.url)

    let nameWinner3 = nft3.assets[0].params.name
    let urlWinner3

    if (nameWinner3.substring(0, 18) == "Dark Coin Champion") {
        let addr = algosdk.decodeAddress(nft3.assets[0].params.reserve)

        let mhdigest = digest.create(mfsha2.sha256.code, addr.publicKey)

        let ocid = CID.create(0, 0x70, mhdigest)

        urlWinner3 = "https://ipfs.dark-coin.io/ipfs/" + ocid.toString()


    }
    else {
        urlWinner3 = "https://gateway.pinata.cloud/ipfs/" + nft3.assets[0].params.url.slice(34)
    }
            
    embeds.push({
        "title" : nameWinner3,
        "description" : "3rd place. Net Wins = " + sortedPlayers[2].numWins,
        "url": "https://explorer.perawallet.app/asset/" + sortedPlayers[2].assetId,
        "image": {
            "url": String(urlWinner3)
        },
        "color": 12745742
    })

    for (let i = 3; i < 10; i++) {
        if (sortedPlayers[i]) {
            embeds.push({
                "title" : sortedPlayers[i].characterName,
                "description" : i + ". Net Wins = " + sortedPlayers[i].numWins,
                "color": 2303786
            })
        }

    }


    const response = await fetch("https://discordapp.com/api/webhooks/1083854698739667004/PHRsIxQj1tJQboVbCz8N2qH192AfXYQ-OhB_ckDHiUB_YTI6EZ4y8mlS4sT90PPhIfky", {
        method: "POST",
        body: JSON.stringify({
            username: "Arena Fight",
            embeds: embeds
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });


}

main()