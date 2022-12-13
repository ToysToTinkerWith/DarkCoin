# Dark Coin

Dark Coin is a community built upon the Algorand Blockchain.

For questions about Dark Coin, please visit our Discord Channel to learn about the past, present, and future of the project.

https://discord.com/invite/xdZ6V5ybmq

# Dark Paper

https://github.com/elborracho420/Dark-Coin-ASA-601894079/blob/main/darkpaper.md

# Dark DApp

https://dark-coin.com

# src

Folder containing # all the web components used to process and render the application. 

Developed under the Next.js framework, the logic of the appication can be understood through the sequential rendering of the components contained in this folder. A user can see what APIs/SDKs are being used, and how the data from the Algorand Blockchain is processed to create the Dark Coin Application. The goal for this project is to be as open as possible, in ensuring trust, and creating transparency within the community.

# Council.py (Coming soon!)

The Council is a place where users can propose changes to the Dark Coin Project, and amend existing proposals that are voted on by the Dark Coin DAO.
To use the Council, one must click the Council Button located in the Dark Coin DApp.

The user is presented with 3 options:

## Propose

A connected wallet may propose a change or addition to the Dark Coin Project. The user is allowed to type 2000 characters into the textfield provided, to persuade the DAO of their idea. This transaction will cost the wallet x Dark Coin per character. Once the proposer is ready, they may sign their proposal to the Council Smart Contract to be written on chain.

Dark Coin uses the box feature of Algorand Smart Contracts to store proposals sent to the contract. This enables on-chain storage of up to 32k bytes for each proposal.

*Propose Pyteal code snippit*

## Vote

Anyone with a Dark Coin DAO NFT may use it to vote on proposals made to the Council Smart Contract. Memebers of the DAO may choose to either "accept", or "reject" the proposal. After x rounds, the votes are finalized and a transaction to accept the proposal is pushed to the chain. The Dark Coin Team will now take action into implementing the new proposal.

*Vote Pyteal code snippit*

## Amend

Proposals that have been accepted by the Dark Coin DAO, will have the option to be amended. A user may type up to 1000 characters as an amendment to the accepted proposal, and the trasnaction will cost x Dark Coin per character. Signing the transaction will send the amendment to the Council Smart Contract to  be voted on by the DAO. Amendments that get accepted by the DAO will have its contents pushed to the chain in the same box as the original proposal.

*Amend Pyteal code snippit*

# DAO.py

https://algoexplorer.io/application/826032354

Smart contract written in Pyteal. Appears for connected wallets who own at least one the Dark Coin DAO series NFTs.

Wallets can click on their DAO NFT to get the option to opt in. Once an account has opted in, they can send a proposal to the smart contract. The contract takes as input a proposal and an NFT. After the wallet signs the transaction, the contract makes sure the wallet has the specified NFT by checking the asset holding balance of the sender for that asset. The contract then stores the proposal as a key-value pair in the local state of that wallet, with the NFT ID being the key, and the proposal being the value. In formulating the results for governance, The Dark Coin Application excludes all NFTs that don't match any of the Dark Coin DAO NFT IDs, and only keeps the latest proposal made for each DAO NFT.

Algorand imposes a contract limit of 16 key-value pairs for a wallets local state, which limits the number of votes a wallet can make to 16. Wallets can make a separate vote with each DAO NFT they own, up to 16.

The process of governance uses a combination of checks within both the contract and the application, so that the final result shown is truly a consensus from the community of DAO NFT holders. Dark Coin is commited to offering a governance users can trust, and is open to discussing any possible treats to the legitimacy of the process. 
