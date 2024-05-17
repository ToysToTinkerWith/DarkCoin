# Dark Coin

Dark Coin is a community built upon the Algorand Blockchain.

For questions about Dark Coin, please visit our Discord Channel to learn about the past, present, and future of the project.

https://discord.com/invite/GWB89qusjQ

# Dark Paper

https://dark-coin.io/

# Dark DApp

https://dark-coin.com

# pages/components

Folder containing all the web components used to process and render the application. 

Developed under the Next.js framework, the logic of the appication can be understood through the sequential rendering of the components beggining with the pages/index file. A user can see what APIs/SDKs are being used, and how the data from the Algorand Blockchain is processed to create the Dark Coin Application. The goal for this project is to be as open as possible, in ensuring trust, and creating transparency within the community.

# Apps

## The Council System on Dark Coin

### Overview

The Council is an app integrated with Dark Coin, designed to let users vote on proposals using their DAO NFTs. It involves creating proposals, amending them, and voting to decide their fate.

### Step-by-Step Process

Creating a Proposal

Anyone can create a proposal by sending 20 Algo to the Council smart contract.
Once this is done, a separate contract is made for the specific proposal, which holds the 20 Algo.

#### Amending Phase

Duration: About a week (183,000 blockchain rounds).
During this phase, users can suggest modifications to enhance the original proposal.
If no amendments are proposed, the process moves directly to the proposal voting stage.

#### Voting on Amendments

Duration: About a week (183,000 blockchain rounds).
DAO NFT holders vote on any proposed amendments.
Amendments need more accept votes than reject votes to be included.

#### Voting on the Proposal

Duration: About a week (183,000 blockchain rounds).
DAO NFT holders vote on the proposal keeping in mind all accepted amendments.
Proposal needs more accept votes than reject votes to be drafted.

#### Drafting Accepted Proposals

Proposals that receive more accept votes than reject votes move to the drafting phase.
The accepted amendments are compiled into the original proposal.
Funds can be allocated to the proposal draft.
The larger Dark Coin community can contribute to completing the proposal using the assets in the proposal contract.

### Key Points to Remember

Initial Funding: 20 Algo is required to start a proposal.
Phases: Each stage (amending and voting) lasts about a week (183,000 blockchain rounds).
Voting: Both amendments and proposals need majority accept votes to proceed.
Community Involvement: The broader Dark Coin community can help implement accepted proposals.
This system ensures that all proposals are thoroughly reviewed, amended, and agreed upon by the DAO NFT holders before being executed, promoting community involvement and improving the quality of proposals.

## The Arena System on Dark Coin

### Overview

The Arena is a Dark Coin application where users can battle using their Dark Coin champion NFTs for fame, glory, and Dark Coin rewards.

### Step-by-Step Process

#### Champion NFTs and Trait Swapping

Dark Coin champion NFTs use Algorand's ARC-19 standard, allowing for swappable traits.
Visit the trait swapper inside the Arena to mix and match the look of your champion.
Equipped traits are sent to a contract for holding.
Unequipped traits are sent to the user's wallet.

#### Selecting a Champion for Battle

When ready for battle, go to the select tab inside the Arena.
Select the champion you wish to use in the battle.

#### Initializing or Joining a Battle

Initialize a Battle: Start a new battle.
Join a Battle: Join an already initialized battle.
Both parties must pay a 10,000 Dark Coin wager plus an additional 0.1 Algo fee.

#### Battle Process

When a champion joins an existing battle, the Arena contract determines the winner.
The winner receives the combined 20,000 Dark Coin wager.
Using AI, the app generates a battle story describing the victory.
The app also creates an image depicting the two champions in battle.
Battle results are displayed in a dedicated Discord channel.

#### Key Points to Remember

Trait Swapping: Customize your champion's appearance with swappable traits using the trait swapper.
Wager and Fee: Each battle requires a 10,000 Dark Coin wager per participant plus a 0.1 Algo fee.
Battle Results: Winners are decided by the Arena contract, with battle stories and images generated for each fight.
Community Interaction: Battle results are shared in a Discord channel for the community to see.
This system ensures that battles are fair, engaging, and visually represented, enhancing the overall experience for Dark Coin community members.




