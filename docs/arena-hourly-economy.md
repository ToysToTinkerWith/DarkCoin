# Free arena entry and inventory-based monster loot

This replaces the earlier subscription and fixed DARK pool design. **Entry is free. There is no pass purchase, expiry, subscription renewal or guaranteed DARK reward.** The previous paid contract was never deployed by this implementation.

Current operations and activation status: see [monster loot and pickups](arena-loot-pickups.md). The current playtest is Graveclaw-only.

## Gameplay rules

- Every living, connected champion present when the monster dies receives one loot roll, regardless of damage dealt. The server freezes this list at defeat. A champion who already died or left is not present; joining after defeat does not grant a roll.
- The room supports eight concurrent champions, one per wallet. A roll is bound to that wallet and champion NFT. Reconnecting after defeat cannot generate another roll. A player can select a different champion after leaving; there is no paid pass restriction.
- Entry uses the existing connected address without signing. The server checks NFT ownership, but a public address does not prove visitor control. Reward recipients are fixed to that on-chain owner. Saved claims still require the assigned wallet to sign their real claim transaction.
- The current playtest spawns Graveclaw every hour, including the previously featured dragon hour. One shared encounter per UTC hour per treasury. Monsters do not respawn ten seconds after defeat in this mode. The original practice mode remains available when loot is off.
- Defeat heals the surviving champions. Loot rolls are published immediately by the defeat trigger, with a scheduled retry each minute. Personal drops show the asset image, name, quantity and ASA ID near the monster. Walk over a drop for automatic delivery to an opted-in wallet; otherwise the collected reward is authorized and saved for later claiming in the wallet popup. Uncollected drops cannot be claimed from the wallet. See [pickup implementation and operations](arena-loot-pickups.md). If a monster survives until the next hour, that encounter gives no loot.

## Configurable defaults

Edit [`lib/arena/loot-rules.json`](../lib/arena/loot-rules.json), then rebuild/deploy the publisher:

| Setting | Default |
| --- | --- |
| NFT roll | Graveclaw **1%**; Cindermaw (dragon) **5%** |
| Token roll | Graveclaw **99%**; Cindermaw **95%** |
| Selection within each category | Equal weight per available registered asset; per-asset weights configurable |
| Token amount | Weighted percentage tiers below, based on spendable balance at the encounter inventory snapshot |
| Token total per defeated monster | Bounded by spendable inventory and any administrator cap; default cap is 100% so eight 10% rolls and minimum payouts can be funded |
| Minimum token payout | **One whole token**, configurable per ASA with `minTokens`; `minAtomic` is an additional atomic-unit floor |
| NFT amount | Exactly one NFT, allocated only once |

One basis point is 0.01%. Spendable balance means the contract's actual holding **minus already-reserved unclaimed rewards**. It is not the token's total circulating supply. Decimal amounts use integer arithmetic, including values larger than JavaScript's safe integer range.

| Graveclaw percentage | Dragon percentage | Chance, after this token is selected |
| --- | --- | --- |
| 0.025% | 0.1% | 60% |
| 0.125% | 0.5% | 25% |
| 0.25% | 1% | 10% |
| 1.25% | 5% | 4% |
| 2.5% | 10% | 1% |

These probabilities are conditional on the token being selected, separate from the NFT/category roll and asset-selection weights. The mean is 0.14625% for Graveclaw and 0.585% for the dragon per token roll before minimum/maximum adjustments. Every champion uses the same initial spendable-balance snapshot; previous allocations in this encounter reduce its remaining budget, not the percentage base. Eight maximum-tier rolls allocate 20% for Graveclaw or 80% for the dragon. A random recipient order prevents wallets earlier in alphabetical order from always getting scarce inventory first.

With 1,000,000 spendable tokens, Graveclaw's tiers pay 250 / 1,250 / 2,500 / 12,500 / 25,000 tokens, while the dragon's tiers pay 1,000 / 5,000 / 10,000 / 50,000 / 100,000. The publisher uses the monster kind saved in the authoritative defeat record, not client input or the hour when publication happens. Missing or unknown monster kinds reject new draws. Saved draws retain their existing amounts on retries.

Graveclaw divides percentage-based rewards by four using integer arithmetic before rounding; this also applies to per-asset percentage tier overrides. Flat minima, optional maxima and fixed-amount asset overrides are not divided. The one-whole-token default minimum is unchanged.

The percentage amount is rounded down to atomic units, then raised to the token's flat minimum if needed. For example, a token minimum of `"25"` raises a 3-token percentage result to 25 tokens. `minTokens` is a decimal string in whole-token units, interpreted using the ASA's decimals; use `"0"` to rely only on `minAtomic`. The greater of these two floors applies. A configured positive `maxAtomic` must not be below the effective minimum. No payout is reduced below that minimum.

If the exact rolled amount (after minimum/optional maximum) cannot fit the remaining event budget, the result is recorded as unavailable, with the selected ASA and percentage retained for audit. It is not clipped to a smaller tier or rerolled. Assets already below their minimum are excluded before selection. Setting smaller on-chain caps can therefore make large tiers unavailable. The default configuration leaves room for all eight 10% rolls; unusually high minimums can still exhaust inventory.

If the rolled category has no available stock, the other category is used. Therefore the displayed monster-specific NFT/token odds apply when both categories have eligible inventory. If both are empty or below minimum payout limits, the roll is recorded as **treasury empty**, with no false promise or debt. Refilling later does not reroll a completed empty result. Replenish and monitor inventory before advertising rewards.

Per-asset configuration example (replace the example ASA IDs):

```json
{
  "version": 3,
  "monsters": {
    "graveclaw": { "nftChanceBps": 100, "tokenPercentageDivisor": 4 },
    "cindermaw": { "nftChanceBps": 500, "tokenPercentageDivisor": 1 }
  },
  "tokenDefaults": {
    "weight": 1,
    "mode": "percentage",
    "tiers": [
      { "bps": 10, "chanceBps": 6000 },
      { "bps": 50, "chanceBps": 2500 },
      { "bps": 100, "chanceBps": 1000 },
      { "bps": 500, "chanceBps": 400 },
      { "bps": 1000, "chanceBps": 100 }
    ],
    "minTokens": "1",
    "minAtomic": "1",
    "maxAtomic": "0",
    "encounterCapBps": 10000
  },
  "assets": {
    "123456789": {
      "weight": 3,
      "mode": "fixed",
      "minTokens": "0",
      "minAtomic": "1000000",
      "maxAtomic": "5000000"
    },
    "987654321": { "minTokens": "25" },
    "987654322": { "weight": 0 }
  }
}
```

For a six-decimal token the fixed example awards 1–5 tokens, still bounded by its encounter budget. A weight of zero disables selection. `maxAtomic: "0"` means no extra absolute per-recipient maximum in percentage mode; fixed mode requires a positive maximum. All atomic amounts are decimal **strings**. Tier `chanceBps` values must total 10,000; tier `bps` values must be strictly ascending. Per-asset overrides may replace the entire `tiers` array.

The on-chain registration has an additional `capBps` and `capAtomic` per event; off-chain configuration cannot exceed those limits. Registration now permits 1–10,000 basis points and the unsigned helper defaults to 10,000 (100%). This is a budget ceiling, not a single-player payout percentage. Existing registered assets keep their old caps until the creator re-registers them with `existingRegistry: true` and the appropriate holding state. Existing saved draws keep their original rules and amounts; only new draws use rule version 3. The on-chain treasury format remains v2; these changes do not require new contract code.

The old fixed DARK reward is gone. A particular fungible token, including DARK, is only eligible if deliberately registered, funded in the treasury and enabled in the loot rules. No special DARK asset ID or guaranteed DARK amount remains.

## Randomness and server trust

The authoritative server generates a cryptographic 256-bit random seed. HMAC-SHA256 with rejection sampling determines category, asset, token amount and recipient order. The seed, rule version, inventory snapshot and resulting allocations are saved before a transaction is submitted. A failed submission, timeout, scheduler retry or restart uses that **same saved draw**. It never rerolls to obtain a preferred result.

The game server/oracle remains trusted to report defeat, the recipients and honest randomness. The contract enforces asset budgets, reservations, recipient proofs and replay protection; it does **not** verify combat or independently prove the random selection. This is not described as a trustless lottery. Algorand warns against using a raw block seed as trustworthy randomness; a future independently verifiable version should commit inputs before querying its [randomness beacon](https://dev.algorand.co/concepts/protocol/randomness/). That beacon protocol is not implemented here.

## Treasury v2

`contracts/ArenaTreasury.py` compiles to AVM v9. Creation takes the oracle's public key and starts paused. There are no purchase, subscription or fixed-token methods. An old v1 treasury must **not** be reused; the client/publisher checks `version == 2`.

- Administrator registers each reward ASA, specifying NFT/token kind and payout caps. Registration funds the ASA opt-in and its registry box. NFTs must have total supply one and zero decimals. Tokens use their actual ASA decimals.
- Treasury discovery reads actual on-chain holdings and registry boxes. Frozen, unregistered, zero-balance and fully reserved holdings are excluded.
- The publisher locks allocation per treasury so parallel workers cannot draw against the same available stock. It processes the oldest pending encounter first; the gameplay worker does not hold or use the reward signing key.
- One atomic publication group records an immutable hour root and reserves each asset's budget. If any asset lacks sufficient availability or violates its on-chain cap, the entire group fails. No partial publication occurs.
- Each Merkle leaf binds app ID, encounter hour, slot, wallet, champion ASA, **reward ASA** and amount. A permanent claimed bitmap plus per-event/per-asset remaining balances prevent duplicate claims and asset substitution.
- Claims transfer the actual ASA from the contract to the champion owner's wallet. The claim builder adds a zero-amount self-transfer opt-in only when needed. The UI displays its minimum-balance requirement and fees before asking for a wallet signature.
- Published loot stays reserved until claimed; it is excluded from later draws. Claims remain available while publication is paused. There is no reward expiry, administrator withdrawal or delete method in this version.
- **Only the original application creator can replace approval/clear code** using an `UpdateApplication` transaction with no rekey. The oracle and other wallets cannot upgrade. Updates do not reset existing state, boxes, balances or claims. Updated code must preserve their layout and claim commitments. This is an administrator trust power: future creator-approved code can change the treasury's rules. See Algorand's [application lifecycle](https://dev.algorand.co/concepts/smart-contracts/apps/).

The game oracle can fabricate allocations if compromised, within the enforced contract limits. Protect it as a signing authority. Publication is restricted to the current/past 168 UTC hours. If an unresolved draw blocks the queue, investigate and fix it; do not delete it or reroll. Expired unpublished encounters need an explicit operator resolution/compensation plan before later pending encounters can be processed.

## Fees and storage

Joining has **no subscription fee**. Automatic pickup delivery costs approximately 0.003 ALGO paid by the oracle. Manual saved-reward claims incur network fees paid by the claiming wallet:

- Existing asset opt-in: approximately 0.003 ALGO (budget call, claim call and inner transfer).
- New asset opt-in: approximately 0.004 ALGO, plus a **0.1 ALGO increase in the wallet's required minimum balance**. That minimum balance is not a DARK payment or an arena subscription.
- Asset registration: 0.0189 ALGO for the registry box, plus 0.1 ALGO for a new treasury ASA opt-in. Admin pays fees separately.
- Event publication: 0.0221 ALGO for the root box plus 0.0125 ALGO per distinct rewarded ASA for its event budget box; oracle pays these and group fees.

Permanent boxes consume ALGO minimum balance. Fund the treasury account base minimum as well. AVM v9 [group resource sharing](https://dev.algorand.co/concepts/smart-contracts/avm/) supplies publication references and opcode budget; [box storage costs](https://dev.algorand.co/concepts/smart-contracts/storage/box/) determine funding. These must be verified against actual AVM execution before mainnet funding.

## Deployment and administration

### Loading tokens and NFTs at `/arena/load`

The loading page is configured in `lib/arena/treasury-load-config.json` for mainnet app **3658640544** and wallet **VWYCYQ3H3PPNIGON4H363DIH7BP33TTZWUUUNMTDXCIHRCDPFOMU7VJ5HM**. Connect that wallet, enter an ASA ID, look up its balance, enter the amount and review before signing. No private key or mnemonic is handled by the server.

The new `load` contract method requires exactly three transactions: the loader's ALGO payment, its application call, and its positive ASA transfer to the app. It validates matching asset/sender/receiver and prohibits rekey, clawback and asset closing. The application call opts the treasury into the ASA with an inner zero self-transfer when needed, before the group's deposit executes. Fees are pooled into the app call. All changes roll back together if any transaction fails.

Only the hardcoded loading wallet can invoke `load`. The older creator-only `register` method now also requires that loading wallet if it would create a new ASA opt-in; the creator can still adjust caps for an existing holding. Creator code-upgrade authority is unchanged. Once an ASA is opted in, Algorand permits ordinary transfers from other holders to the app address; the loader restriction controls who can initiate opt-ins, not who can make unsolicited ASA transfers.

New assets are registered automatically as NFT (supply 1, decimals 0) or token. New token records use a 100% encounter ceiling and no absolute cap; NFT records cap at one. Existing records, caps and reserved rewards are preserved. Funding covers only the ALGO shortfall for the app's base balance, the 0.1 ALGO ASA holding and the 0.0189 ALGO registry box. With no existing ALGO, first-time loading requires 0.2189 ALGO funding plus typically 0.004 ALGO fees. Fully funded existing holdings/records require no additional funding and typically 0.003 ALGO fees.

The API reads public chain state and simulates the complete unsigned group before returning it for review. The connected wallet signs and the browser submits; the API never signs or broadcasts. The page blocks incompatible app code and keeps uncertain submissions pending for status checks instead of automatically sending them again.

**Migration selected (September 24, 2026):** the owner chose to convert Depths app **3658640544** in place, retaining its address and asset holdings. App 3718607904 is no longer the loader target. Follow [the deployment instructions](../contracts/DEPLOYMENT.md): `python ArenaTreasury.py`, then `node deployment.js` with the update call selected; the creator wallet is automatically used as the oracle. The script uses consensus v42 global-schema resizing and an atomic update/initialize group, registers the existing holdings, starts paused, and simulates before signing. Unsigned mainnet simulation passed; no on-chain migration has been submitted by this implementation. The loader stays blocked until migration succeeds. Depths gameplay is being retired, including its reward APIs.

### Treasury deployment

1. Keep `ARENA_LOOT_ENABLED=false` until validation is complete. The old `ARENA_ECONOMY_ENABLED`, DARK asset, decimal and subscription settings are no longer used.
2. Run `python contracts/ArenaTreasury.py`, `npm run test:arena-economy`, `node scripts/build-arena-economy.cjs`, and the normal app/worker builds. PyTeal emits TEAL source; it is not an AVM execution test.
3. Compile both TEAL programs with an approved compiler. Validate on LocalNet/testnet: create, creator update, denied oracle/other-wallet/rekeyed updates, preservation of existing claims after update, denied delete, register tokens/NFTs, opt-ins, deposits, multi-asset publication, slot 0/7 claims, simultaneous/repeated claims, bad proofs, wrong reward asset/amount, insufficient inventory, caps, replayed hour, pause and expired publication. A funded testnet rollout and AVM execution are **not completed** by this local implementation.
4. Use `node scripts/prepare-arena-treasury.cjs input.json output.json` to prepare unsigned transactions. Create input: `operation: "create"`, public `sender`, public `oracle`, `approvalBase64`, `clearBase64`, and fresh `params` (`genesisID`, base64 `genesisHash`, `firstValid`, `lastValid`). Review/sign/send with the administrator wallet. The helper never signs, submits or uses a mnemonic.
5. Register assets with `operation: "register"`, `sender`, `appId`, `assetId`, `kind: "nft"` or `"token"`, `capBps`, `capAtomic`, `existingRegistry`, `alreadyOptedIn`, and `params`. The two booleans must reflect chain state. The contract independently verifies exact funding. For NFTs the helper forces an absolute cap of one.
6. Fund the registered assets into the app's address. Update `loot-rules.json` if needed. Keep the treasury and oracle funded with ALGO for their respective storage and fees.
7. Store the creator wallet mnemonic in Google Secret Manager as `ARENA_REWARD_ORACLE_MNEMONIC`; the owner has selected the same wallet for creator and oracle. Bind it only to **arenaRewards** and **arenaLootEvents**, not browsers or the gameplay worker. The reward functions require the secret to exist before deployment.
8. Set these public configuration values consistently on nextServer, arenaCombat, the Cloud Run arena worker and arenaRewards:

```dotenv
ARENA_LOOT_ENABLED=false
ARENA_TREASURY_APP_ID=YOUR_V2_APP_ID
ARENA_ALGOD_URL=https://mainnet-api.algonode.cloud
```

Use a testnet endpoint and test ASAs during testing. Existing champion discovery uses mainnet NFTs; an isolated testnet lobby needs a test catalog/indexer as well. `ARENA_ALGOD_TOKEN` is optional and server-only; browser claims need a browser-accessible algod endpoint.

9. Keep the existing WebSocket transport URL, room ID and ticket secret. Deploy the publisher, API, client and worker together, with loot off. Close entry/drain the room while changing authority modes. Set `ARENA_LOOT_ENABLED=true` consistently, sign an admin `unpause` operation, then reopen entry. Verify free entry, proof of ownership, monster defeat, all present recipients, saved rolls and actual wallet receipts.
10. Monitor `arena_loot_pending`, scheduler errors, `lootQueue: pending-APP_ID`, low treasury inventory and oracle ALGO. Preserve Firestore draw/claim records and backups; proofs are required for claims. To stop new allocations, pause the contract and scheduler; existing claims remain valid. Do not discard published rewards when disabling loot.

Other unsigned admin operations are `pause`, `unpause`, and `oracle` (new public oracle key).

### Creator code updates

Use the same offline helper with `operation: "update"`, the original creator's public `sender`, `appId`, newly compiled `approvalBase64` and `clearBase64`, `existingExtraPages` from the current application, and fresh `params`. The helper builds one unsigned UpdateApplication transaction. Sign with the creator wallet and submit only after reviewing and testing the new code. It does not sign, upload source, compile remotely or broadcast. This helper preserves the existing schema/program capacity; it rejects a larger program that would need application resizing.

Pause new publication and its scheduler while upgrading, preserve all existing boxes and the v2 claim format, then validate existing claims and resume. The current approved program must already allow updates: an earlier non-updatable deployment cannot be made updatable by submitting new code. This implementation has not deployed that earlier treasury, so the initial deployment can include creator upgrades directly.

## Durability and limitations

Networking still uses in-memory simulation and WebSocket deltas rather than writes for every movement. Critical checkpoint requests have a two-second minimum interval; routine checkpoints are every 30 seconds. A crash before the victory checkpoint can roll combat back, requiring the monster to be defeated again. A saved victory cannot be overwritten by an older active checkpoint. Rewards publish only after the victory and recipient set are durable.

One roll per wallet per victory discourages duplicate sessions but does not prove that different wallets are different people. Rewards depend on inventory being available; the system does not mint replacement assets or promise unfunded prizes. No production deployment or token transfer was performed by this change.
