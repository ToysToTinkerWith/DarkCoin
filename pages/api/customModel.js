import NextCors from 'nextjs-cors';

import fs from "fs";
import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.DALLE_KEY
});



async function customModel(req, res) {
   // Run the cors middleware
   // nextjs-cors uses the cors package, so we invite you to check the documentation https://github.com/expressjs/cors

   await NextCors(req, res, {
      // Options
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
      origin: '*',
      optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
   });

   try {


    const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {"role": "system", "content": "You are a Dark Coin assistant. Here to answer any questions about Dark Coin. Keep the answers simple and specific."},
          {"role": "system", "content": 
          `Dark Coin Technical Documentation
          Dark Coin (ASA-1088771340)
          Dark Coin is an innovative community-driven project within the Algorand ecosystem, focused on expanding the possibilities of Algorand Standard Assets (ASAs) in the decentralized finance (DeFi) space. It operates as a decentralized autonomous organization (DAO), giving collective ownership and democratic management power to its members through blockchain-enforced rules.
          
          Key Features:
          Decentralized Governance: Dark Coin enables users to actively participate in shaping the project's future. Through our dApp, users can cast votes and submit proposals using NFT-based voting tokens. This allows the community to influence decisions on project direction, governance, and asset management.
          Character NFT Assets and AI Arena: Unique character NFT assets that can be engaged in battles within the Dark Coin AI Arena, providing an engaging and interactive experience for users.
          Marketplace: The project's marketplace allows users to purchase utility assets, fostering a dynamic ecosystem for users to engage with the project's offerings.
          Governance and Control:
          The Dark Coin team is developing a user-friendly dApp accessible via (https://dark-coin.com), where members can participate in governance processes, propose changes, and vote on key decisions.
          Empowering the Community:
          Dark Coin is committed to empowering its community by providing the tools and mechanisms necessary for active participation, influence, and contribution. Through our DAO structure and decentralized governance, we strive to create a collaborative environment that benefits all members.
          
          Join us in shaping the future of decentralized finance on the Algorand network!`
        },
        {"role": "system", "content": 
            `
            Dark Coin Darkpaper
            Introduction
            Dark Coin is an experimental grassroots community project focused on expanding the Algorand DeFi ecosystem. Managed by a decentralized autonomous organization (DAO), Dark Coin's users collectively own and manage the project based on blockchain-enforced rules and smart contracts. The primary objective of the Dark Coin DAO is to develop privacy solutions for the Algorand Network.

            Disclaimer
            Investing in Dark Coin or any cryptocurrency involves risks. The project's creators and developers do not guarantee profits or specific price outcomes for the Dark Coin token. It's essential to conduct thorough research and consider seeking guidance from a financial advisor before investing. Never invest funds you cannot afford to lose.
            Website -
            https://dark-coin.io/

            DAPP -
            https://dark-coin.com/

            DAO NFT'S -
            https://algoxnft.com/collection/dark-coin-dao

            Champion NFT'S -
            https://algoxnft.com/collection/dark-coin-champs
            https://www.randgallery.com/collection/dark-coin-champions
            https://www.randgallery.com/collection/dark-coin-champions/

            Champion Trait NFT'S -
            https://algoxnft.com/collection/dark-coin-champs-traits
            https://www.randgallery.com/collection/dark-coin-champions-traits/

            Pera Explorer (Dark Coin ASA) -
            https://explorer.perawallet.app/asset/1088771340/

            Vestige Chart (Dark Coin ASA) -
            https://vestige.fi/asset/1088771340

            Tinyman swap (Algo to DARKCOIN) -
            https://app.tinyman.org/#/swap?asset_in=0&asset_out=1088771340

            Tinyman LP Pool (Dark Coin ASA) -
            https://app.tinyman.org/#/pool/56XJVRGFUY5LJMUTRK4EOWOOPMW6HJI73XJVRAIFQZG5774ILJRLSOXKFM

            Reddit link -
            https://www.reddit.com/r/DarkCoinASA

            Twitter link -
            https://twitter.com/DarkCoinASA 
            `
        },
        {"role": "system", "content": 
            `
            The Council System on Dark Coin
            Overview
            The Council is an app integrated with Dark Coin, designed to let users vote on proposals using their DAO NFTs. It involves creating proposals, amending them, and voting to decide their fate.

            Step-by-Step Process
            Creating a Proposal

            Anyone can create a proposal by sending 20 Algo to the Council smart contract. Once this is done, a separate contract is made for the specific proposal, which holds the 20 Algo.

            Amending Phase
            Duration: About a week (183,000 blockchain rounds). During this phase, users can suggest modifications to enhance the original proposal. If no amendments are proposed, the process moves directly to the proposal voting stage.

            Voting on Amendments
            Duration: About a week (183,000 blockchain rounds). DAO NFT holders vote on any proposed amendments. Amendments need more accept votes than reject votes to be included.

            Voting on the Proposal
            Duration: About a week (183,000 blockchain rounds). DAO NFT holders vote on the proposal keeping in mind all accepted amendments. Proposal needs more accept votes than reject votes to be drafted.

            Drafting Accepted Proposals
            Proposals that receive more accept votes than reject votes move to the drafting phase. The accepted amendments are compiled into the original proposal. Funds can be allocated to the proposal draft. The larger Dark Coin community can contribute to completing the proposal using the assets in the proposal contract.

            Key Points to Remember
            Initial Funding: 20 Algo is required to start a proposal. Phases: Each stage (amending and voting) lasts about a week (183,000 blockchain rounds). Voting: Both amendments and proposals need majority accept votes to proceed. Community Involvement: The broader Dark Coin community can help implement accepted proposals. This system ensures that all proposals are thoroughly reviewed, amended, and agreed upon by the DAO NFT holders before being executed, promoting community involvement and improving the quality of proposals.
            `
        },
        {"role": "system", "content": 
            `
            The Arena System on Dark Coin
            Overview
            The Arena is a Dark Coin application where users can battle using their Dark Coin champion NFTs for fame, glory, and Dark Coin rewards.

            Step-by-Step Process
            Champion NFTs and Trait Swapping
            Dark Coin champion NFTs use Algorand's ARC-19 standard, allowing for swappable traits. Visit the trait swapper inside the Arena to mix and match the look of your champion. Equipped traits are sent to a contract for holding. Unequipped traits are sent to the user's wallet.

            Selecting a Champion for Battle
            When ready for battle, go to the select tab inside the Arena. Select the champion you wish to use in the battle.

            Initializing or Joining a Battle
            Initialize a Battle: Start a new battle. Join a Battle: Join an already initialized battle. Both parties must pay a 10,000 Dark Coin wager plus an additional 0.1 Algo fee.

            Battle Process
            When a champion joins an existing battle, the Arena contract determines the winner. The winner receives the combined 20,000 Dark Coin wager. Using AI, the app generates a battle story describing the victory. The app also creates an image depicting the two champions in battle. Battle results are displayed in a dedicated Discord channel.

            Key Points to Remember
            Trait Swapping: Customize your champion's appearance with swappable traits using the trait swapper. Wager and Fee: Each battle requires a 10,000 Dark Coin wager per participant plus a 0.1 Algo fee. Battle Results: Winners are decided by the Arena contract, with battle stories and images generated for each fight. Community Interaction: Battle results are shared in a Discord channel for the community to see. This system ensures that battles are fair, engaging, and visually represented, enhancing the overall experience for Dark Coin community members.
            `
        },
        {"role": "user", "content": req.body.prompt},
        ]
      });

      console.log(completion.choices[0].message.content)
    
    
    res.json({response: completion.choices[0].message.content})
      

      

      

   }

   catch (error) {
    res.json({ result: String(error) });
  }
   
}

export default customModel