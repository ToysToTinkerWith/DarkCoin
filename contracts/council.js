
import algosdk from "algosdk"

const main = async () => {

    const client = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)

    const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)

    let status = await client.status().do();

    let currRound = status["last-round"]

    const boxesResponse = await client.getApplicationBoxes(1239236238).do();

    let ignoredProps = [1378381576]

    boxesResponse.boxes.forEach(async (box) => {

        let propName = ""
        Object.values(box.name).forEach((int) => {
          let char = String.fromCharCode(int)
          if (char != "\"") {
            propName += char
          }
          
        })

        propName = propName.substring(0,8) + " " + propName.substring(8, propName.length)

        propName.replace(/["']/g, "")

        let responseContract= await client.getApplicationBoxByName(1239236238, box.name).do();
        let contractId = new TextDecoder().decode(responseContract.value)

        


        if (!ignoredProps.includes(Number(contractId))) {

          let address = await algosdk.getApplicationAddress(Number(contractId))

          const accountInfo = await indexerClient.lookupAccountByID(address).do();


          let assets = [{assetId: 0, amount: accountInfo.account.amount / 1000000, unitName: "ALGO"}]

          const accountAssetInfo = await indexerClient.lookupAccountAssets(address).do();


          if (accountAssetInfo.assets) {
            accountAssetInfo.assets.forEach(async (asset) => {
              let assetInfo = await indexerClient.lookupAssetByID(asset["asset-id"]).do();
              let unitName = assetInfo.asset.params["unit-name"]
              let decimals = assetInfo.asset.params.decimals
              let div = 10**decimals
              assets.push({assetId: asset["asset-id"], amount: asset.amount / div, unitName: unitName})
    
            })
          }

          let draft

          try {
              let responseDraft = await client.getApplicationBoxByName(Number(contractId), "Draft").do();
              draft = new TextDecoder().decode(responseDraft.value)
          }
          catch {

          }

          
          let responseProposal = await client.getApplicationBoxByName(Number(contractId), "Proposal").do();
          let proposal = new TextDecoder().decode(responseProposal.value)

          let votes = []

          let responseVotes = await client.getApplicationBoxByName(Number(contractId), "Votes").do();
            let accept = 0
            let reject = 0
            responseVotes.value.forEach((value) => {
              if (value == 49) {
                accept++
              }
              if (value == 50) {
                reject++
              }
            })
            if (accept > 0 || reject > 0) {
              votes = [{vote: "Accept", count: accept}, {vote: "Reject", count: reject}]
            }

            let global = await indexerClient.lookupApplications(Number(contractId)).do();

            let globalState = global.application.params["global-state"]

            let amendNumber
            let propRound

            globalState.forEach((keyVal) => {
              if (atob(keyVal.key) == "amendNum") {
                amendNumber = keyVal.value.uint
              }
              else if (atob(keyVal.key) == "round") {
                  propRound = keyVal.value.uint
              }
            })

            let amendments = []

            for (let i = 0; i < amendNumber; i++) {
              let responseAmend = await client.getApplicationBoxByName(Number(contractId), "Amend" + String(i)).do();
              let amend = new TextDecoder().decode(responseAmend.value)

              let responseAmendVotes = await client.getApplicationBoxByName(Number(contractId), "Votes" + String(i)).do();

              let thisAmend = String(i)

              let accept = 0
              let reject = 0
              let amendVotes
              responseAmendVotes.value.forEach((value) => {
                if (value == 49) {
                  accept++
                }
                if (value == 50) {
                  reject++
                }
              })
              if (accept > 0 || reject > 0) {
                  amendVotes = [{vote: "Accept", count: accept}, {vote: "Reject", count: reject}]
              }

              amendments.push({amendment: amend, votes: amendVotes, amendNum: thisAmend})
            }

            
            let extraFields = []

            if (draft) {
              extraFields.push({
                name: 'Draft',
                value: draft,
                inline: false,
              })
            }
            else {
              extraFields.push({
                name: 'Proposal',
                value: proposal,
                inline: false,
              })
            }



            if (draft) {
              extraFields.push({
                name: 'Status',
                value: 'Drafted',
                inline: false,
              })
            }
            else if (currRound - propRound < 183000) {
              extraFields.push({
                name: 'Status',
                value: 'Amending',
                inline: false,
              })
            }
            else if (amendments.length > 0) {
              if ((currRound - propRound > 183000) && (currRound - propRound < 366000)) {
                extraFields.push({
                  name: 'Status',
                  value: 'Amendment Voting',
                  inline: false,
                })
              }
              else if (currRound - propRound > 366000) {
                extraFields.push({
                  name: 'Status',
                  value: 'Proposal Voting',
                  inline: false,
                })
              }
            }
            else {
              extraFields.push({
                name: 'Status',
                value: 'Proposal Voting',
                inline: false,
              })
            }


            if (draft) {
              
              assets.forEach((asset) => {
                extraFields.push({
                  name: asset.unitName,
                  value: String(asset.amount),
                  inline: true,
                })
              })
              
            }
            else {
              if (votes.length > 0) {
                extraFields.push({
                  name: 'Votes',
                  value: 'Accept ' + votes[0].count + " Reject " + votes[1].count,
                  inline: false,
                })
              }
  
              amendments.forEach((amend, index) => {
                extraFields.push({
                  name: 'Amendment ' + String(index),
                  value: amend.amendment,
                  inline: false
                })
                extraFields.push({
                  name: 'Votes',
                  value: 'Accept ' + amend.votes[0].count + " Reject " + amend.votes[1].count,
                  inline: false
                })
              })
            }

            
            

            let embeds = []

            embeds.push({
              "title" : propName,
              "url": "https://dark-coin.com/council/proposals/" + contractId,
              "color": 2303786,
              fields: extraFields
            })

            const response = await fetch("https://discordapp.com/api/webhooks/1083854698739667004/PHRsIxQj1tJQboVbCz8N2qH192AfXYQ-OhB_ckDHiUB_YTI6EZ4y8mlS4sT90PPhIfky", {
            method: "POST",
            body: JSON.stringify({
                username: "Council",
                embeds: embeds
            }),
            headers: {
              "Content-Type": "application/json",
            },
          });
          
        }

        



        })

    
}

main()