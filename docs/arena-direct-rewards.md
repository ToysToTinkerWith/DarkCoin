# Direct arena rewards (treasury v3)

## Live behavior

New monster drops are rolled and reserved in Firebase, not published into encounter or reward-budget boxes. Eligibility and personal pickup remain server-authoritative. The treasury sends the asset directly only after pickup. A missing or frozen wallet holding saves the reward in Firebase with its reservation intact. The wallet popup prepares only the necessary ASA opt-in for direct rewards, then queues delivery to the immutable recorded recipient. Already opted-in recipients need no claim signature. Legacy v2 claims continue to use their original boxes and proofs.

Allocation and delivery share a treasury-wide Firestore lease. Inventory availability is the current holding minus legacy on-chain reservations minus new Firebase reservations. Draws and claims are committed atomically with their reservations; no successful payment frees its reservation until confirmation is reconciled. Unpicked drops remain reserved, matching the previous policy.

## Duplicate prevention and recovery

A durable outbox in `arenaPrivate/loot-direct-ledger-<appId>` stores one operation, its unsigned transaction bytes, validity window, transaction ID and expected sequence before broadcast. The contract stores one monotonic counter, packed above the pause bit in the existing `paused` global integer. It accepts a direct payout or refill only for the current sequence and advances it atomically. Retries resend the same transaction while valid, or rebuild using the same sequence after expiry. A confirmed sequence advance settles the corresponding Firebase operation atomically. Other sequence changes fail closed for operator review. Admin pause/unpause preserves the counter.

The counter is reused: it creates no per-reward storage. Do not reset it or roll back to a program that treats the packed pause value as an ordinary boolean. Do not remove or restore an old Firebase ledger while transactions may still settle. Lost ledger history requires operator reconciliation against chain transactions, not rerolling rewards.

## Funding

- Below **1,000,000 microALGO (1 ALGO)** spendable (`amount - minBalance`), refill by exactly **10,000,000 microALGO (10 ALGO)**.
- At or above the threshold, send no funding transaction, including no zero-value payment.
- The refill is a creator/oracle payment plus a sequence-checked app call. The contract enforces the low-balance check and exact amount.
- The treasury pays the inner asset-transfer fee. The oracle pays the outer app-call fee. At normal minimum fees this is 0.001 ALGO each per direct reward; a refill group costs 0.002 ALGO in caller fees.
- Existing minimum balance remains locked for existing holdings/registry and legacy claims. This update does not delete old records or move protected legacy rewards.
- The asset loader supports v3 deposits without a funding transaction when funded; if low, its manually approved deposit group funds exactly 10 ALGO.

## Upgrade and deployment

1. Compile `python contracts/ArenaTreasury.py`.
2. Run the direct reward/legacy/loader/deployment tests and `node scripts/check-arena-direct.cjs`. The latter compiles and runs **unsigned simulation only** on the public ledger; it never submits.
3. Build and deploy the compatible server, wallet UI, arenaRewards and arenaLootEvents before activation. They use the v2 path while the contract reports version 2.
4. `node contracts/deployment.js` updates app 3658640544 and activates v3 atomically. The update is simulated before signing. Address, asset holdings, schema, legacy claims and pause setting stay intact. Subsequent v3 updates do not reset the counter.
5. Verify version, pause bit, the live web build and reward function revisions. The new contract is 1,883 approval bytes and fits the original zero-extra-page allocation.

The pre-upgrade public program/state backup is `output/arena-treasury-pre-direct-backup.json`. Do not blindly deploy that v2 backup after v3 payouts have started. Pause direct payouts first and reconcile all outbox operations; normal repair should be a forward-compatible v3 update.

## Validation

Unit checks cover concurrent workers, ambiguity after acceptance, expired retries, unchanged reservations until confirmation, missing/frozen opt-in, pickup gating, reservation-aware inventory, threshold boundaries, and legacy compatibility. The browser wallet test covers cancelled opt-in, direct rewards with/without opt-in, and existing claims. The AVM simulation verifies exact direct transfer and treasury fee, duplicate/skipped sequences, wrong sender/rekey rejection, low-balance refill, retired publication and legacy claims. No synthetic player or real reward is created for testing.

## Activation record

Treasury app 3658640544 was upgraded and activated in atomic group starting at transaction `SGSHD4GWCUDTK6OD34YFSFVCK6523ZXDRC66O2WBOEOYBZTQNPRQ`. Verified version 3, unpaused, counter zero, unchanged address/schema and 1,883-byte approval program. Spendable balance was 9.8951 ALGO, so no refill was sent. Reward functions and website were deployed before activation. Private Eventarc invocation permission was verified; no stuck reward jobs or error logs were observed after activation.

The authorized loader wallet is rekeyed. Its unsigned deposit simulation now uses Algorand's `fixSigners` simulation option so it evaluates against the ledger's current auth address; actual wallet transactions still require the proper signature. Live-contract simulations confirmed a two-transaction deposit with zero ALGO funding, and rejected wrong-loader, redirected, zero-value and clawback deposits. No test deposit or reward was broadcast.
Final live website build: 2ZVKza22GKrCKv3xFX4Ah. Verified the public loader reports version 3 and successfully prepares/simulates two deposit transactions with zero ALGO funding for the rekeyed loader. Verification saved in output/arena-direct-final.json. No deposit was submitted.
