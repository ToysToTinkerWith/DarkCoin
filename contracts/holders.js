const algosdk = require('algosdk');

const csvWriter = require('csv-writer').createObjectCsvWriter;

const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443)

const getHolders = async () => {

    const assetId = 1438913021;
  
    let assetTxns = await indexerClient.lookupAssetTransactions(assetId).limit(1000).do();
  
    let nextToken = assetTxns["next-token"]
    let numTxns = assetTxns.transactions.length
  
    let holderData = [{
      holder: '6JG62JUBUNWJYCSKXQHIKNGMZPFH7ZK2DO2COLY5FF3X3H26XRAJWNYUYQ',
      amount: 1000000000000
    }]
  
    assetTxns.transactions.forEach((txn) => {
      if (txn['tx-type'] == 'appl') {
        txn["inner-txns"].forEach((itxn) => {
          if (itxn['asset-transfer-transaction'] && itxn['asset-transfer-transaction']["asset-id"] == 1438913021 && itxn["confirmed-round"] < 44073639) {
            let txnObj = {
              sender: itxn.sender,
              receiver: itxn['asset-transfer-transaction'].receiver,
              amount: itxn['asset-transfer-transaction'].amount
            }
            let index = holderData.findIndex(x => x.holder === txnObj.receiver)
            if (index >= 0) {
              holderData[index].amount += txnObj.amount
            }
            else {
              holderData.push({
                holder: txnObj.receiver,
                amount: txnObj.amount
              })
            }
      
            let senderIndex = holderData.findIndex(x => x.holder === txnObj.sender)
            holderData[senderIndex].amount -= txnObj.amount
          }
         
        })
      }
      if (txn['tx-type'] == 'axfer' && txn["confirmed-round"] < 44073639) {
        let txnObj = {
          sender: txn.sender,
          receiver: txn['asset-transfer-transaction'].receiver,
          amount: txn['asset-transfer-transaction'].amount
        }
        let index = holderData.findIndex(x => x.holder === txnObj.receiver)
        if (index >= 0) {
          holderData[index].amount += txnObj.amount
        }
        else {
          holderData.push({
            holder: txnObj.receiver,
            amount: txnObj.amount
          })
        }
  
        let senderIndex = holderData.findIndex(x => x.holder === txnObj.sender)
        holderData[senderIndex].amount -= txnObj.amount
  
      }
    })
  
  
    while (numTxns > 500) {
  
      assetTxns = await indexerClient.lookupAssetTransactions(assetId).nextToken(nextToken).limit(1000).do();
      
      assetTxns.transactions.forEach((txn) => {
        if (txn['tx-type'] == 'appl') {
          txn["inner-txns"].forEach((itxn) => {
            if (itxn['asset-transfer-transaction'] && itxn['asset-transfer-transaction']["asset-id"] == 1438913021 && itxn["confirmed-round"] < 44073639) {
              let txnObj = {
                sender: itxn.sender,
                receiver: itxn['asset-transfer-transaction'].receiver,
                amount: itxn['asset-transfer-transaction'].amount
              }
              let index = holderData.findIndex(x => x.holder === txnObj.receiver)
              if (index >= 0) {
                holderData[index].amount += txnObj.amount
              }
              else {
                holderData.push({
                  holder: txnObj.receiver,
                  amount: txnObj.amount
                })
              }
        
              let senderIndex = holderData.findIndex(x => x.holder === txnObj.sender)
              holderData[senderIndex].amount -= txnObj.amount
            }
            
          })
        }
        if (txn['tx-type'] == 'axfer' && txn["confirmed-round"] < 44073639) {
          let txnObj = {
            sender: txn.sender,
            receiver: txn['asset-transfer-transaction'].receiver,
            amount: txn['asset-transfer-transaction'].amount
          }
          let index = holderData.findIndex(x => x.holder === txnObj.receiver)
          if (index >= 0) {
            holderData[index].amount += txnObj.amount
          }
          else {
            holderData.push({
              holder: txnObj.receiver,
              amount: txnObj.amount
            })
          }
    
          let senderIndex = holderData.findIndex(x => x.holder === txnObj.sender)
          holderData[senderIndex].amount -= txnObj.amount
        }
      })
  
      nextToken = assetTxns["next-token"]
      numTxns = assetTxns.transactions.length
  
      console.log(numTxns)
  
    }
  
    let holders = []
  
    holderData.forEach((holder) => {
      if (holder.amount != 0) {
        holders.push(holder)
      }
    })
  
    console.log(holders)
  
    let total = 0
  
    holders.forEach((holder) => {
      total += holder.amount
    })
  
    console.log(total)
  
    const writer = csvWriter({
      path: 'output.csv',
      header: [
        { id: 'holder', title: 'Holder' },
        { id: 'amount', title: 'Amount' }
      ]
    });
    
    writer.writeRecords(holders)
      .then(() => console.log('CSV file created successfully!'));
  
  
  
  }

  const main = async () => {

    getHolders()

  }

  main()