# Classic Depths and the shared Arena Treasury

Depths entry deposits and rewards use `ARENA_TREASURY_APP_ID`, the same configuration as the 3D arena. The current app is **3658640544**. `ARENA_LOOT_ENABLED=true` is required. A separate Depths contract or contract upgrade is not required for the v3 treasury.

## Rewards

The original Depths roll table remains: 70% chance of 1% of available DARK, 20% chance of 2.5%, 8% chance of 5%, 1.8% chance of 10%, and 0.2% chance of 25%. The registered asset's percentage and absolute payout limits also apply. Odds shown on the page use those limits. No fixed 3D monster reward or subscription is added.

Available balance excludes legacy on-chain obligations and the shared Firebase ledger's pending rewards from **both games**. The existing treasury-wide lease serializes allocation and delivery. A pending, uncertain chain operation blocks a new allocation until the existing worker reconciles it.

`claimDepthsReward` validates the run write token, completed final node, server-verified winning battle and current champion ownership. Allocation then atomically saves the roll, increments the common reservation, links it to the run and creates an existing `pickup` delivery job. Classic completion counts as collection; there is no 3D ground pickup for Depths.

The `arenaLootEvents` worker uses the existing oracle, durable outbox and contract sequence to deliver once. If the wallet lacks its asset opt-in, the reward remains reserved and appears in the wallet claim menu. Only an opt-in needs the user's signature; the oracle sends the earned reward to its recorded recipient. Retrying or reloading a completed run cannot reroll it.

Depths reward identifiers use a ledger counter above 4,000,000,000,000,000, outside the 3D arena's epoch-second encounter identifiers. They retain the existing wallet API's numeric format. `source: depths` identifies them in public summaries; server proofs stay private.

Historical runs with an old reward allocation or transaction, but without the new `serverDepthsRewardId`, fail closed for manual reconciliation. Do not clear those fields to force a new roll. The old `grantDarkCoin` / `claimReward` contract methods are no longer used.

## Fees and deployment

Discord destinations are separate Secret Manager values: `ARENA_DISCORD_WEBHOOK` for 3D encounters and rewards, and `DEPTHS_DISCORD_WEBHOOK` for classic run results and rewards. The notification and retry workers bind both secrets; `nextServer` binds the Depths secret. Reward receipts carry the originating game, and older queued receipts can resolve it from their reward record. A missing Depths webhook never falls back to the arena channel.

The existing Depths entry pricing and **10,000 DARK classic character-generation fee** are unchanged. XP still uses the original Dragonshorde contract.

Build and deploy `nextServer` and Firebase Hosting together: the old Depths redirects and retirement middleware have been removed. The current arena reward workers already support the queued delivery format; no new signer or public wallet secret is introduced. Do not redeploy or recreate the treasury for this change.

Validation: `node --test tests/depths-treasury.test.cjs tests/arena-direct-rewards.test.cjs tests/arena-wallet-rewards.test.cjs`, `npm run build`, then `node scripts/test-depths-treasury-browser.cjs <base-url>`. The browser test only reads live odds and submits invalid claims to check rejection; it does not create a run, reward or blockchain transaction.
