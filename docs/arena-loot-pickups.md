# Arena monster loot and pickups

The production treasury is Algorand mainnet application **3658640544**. Its creator is also the reward oracle. The `claim_for` update preserves the contract address, inventory, registered asset budgets, and existing claims.

## Player flow

1. Connect using the site's existing wallet button, select a champion, and click **Enter playground**. Entry requests no transaction or message signature. The server verifies the authentic NFT and its current holding, then issues a short-lived signed admission ticket with `ownershipChecked: true`. This checks the address's on-chain holdings, **not** proof that the visitor controls that address. A visitor who spoofs a public address can impersonate gameplay, but cannot redirect rewards: the ticket fixes the NFT owner's reward address and the contract binds every payout to that address.
2. At an hourly monster defeat, the authoritative room records every living, connected champion present. Each wallet/champion receives its own immutable loot roll using `lib/arena/loot-rules.json`.
3. The reward function reads spendable, registered treasury inventory, saves the draw, then publishes the Merkle allocation on chain. Only funded allocations become drops.
4. The player sees a personal gold marker near the defeated monster, with the asset image, name, exact quantity, and ASA ID. Moving within pickup distance collects it. Other players cannot collect it.
5. The oracle pays the transaction fees and delivers the assigned asset automatically if the wallet is opted in. The contract binds recipient, champion, encounter, asset, and amount, and prevents duplicate claims.
6. Missing opt-in or a frozen holding saves the reward. Open the fixed wallet popup: a badge counts unique claimable ASA IDs (not individual claims). The rewards section at the top combines amounts using integer arithmetic, includes all result pages, and lets the player review and claim up to four rewards per approval. Only this real claim requests a signature. The entire rewards section is hidden when there are no collected, claimable assets. Any required opt-in is included in the atomic claim group, with fees and the increased minimum balance shown first. Uncollected drops do not appear in the wallet and cannot be claimed. Pickup must be confirmed by the authoritative arena before a reward becomes a saved claim.

The current playtest spawns **only Graveclaw**, including the old dragon hour. One loot-bearing encounter per UTC hour remains a contract constraint; a completed encounter is not resurrected or rerolled. The optional hourly dragon schedule is retained for a future explicit reactivation.

NFT odds remain 1% for Graveclaw and 5% for Cindermaw. Existing weighted token tiers and minimum rewards are unchanged. The contract can only distribute assets it actually holds and has registered. An empty or insufficient inventory can produce no item; the game does not promise unfunded rewards.

## Services and configuration

- Cloud Run `arena-realtime`: simulates the room and validates pickup distance, current champion, wallet, life state, and room lease. It has **no treasury signer**. Loot polling occurs every 2.5 seconds after a defeat; unchanged data is not resent.
- Firebase `arenaLootEvents`: reacts to new jobs in the private `arenaPrivate/loot-jobs/jobs` subcollection, publishing drops or delivering pickups immediately. The room creates the job atomically with the defeat/pickup record. Ordinary simulation, lease and checkpoint updates do not invoke this function.
- Firebase `arenaRewards`: runs each minute to recover interrupted publication/delivery. A 90-second delivery lease, persisted transaction ID/validity window, and the on-chain claim bit prevent duplicate payouts after timeouts.
- `nextServer` and `arenaCombat`: signature-free admission with on-chain NFT ownership checks, public sanitized reward summaries, and unsigned claim preparation. The contract authorizes the actual signed claim; returning an unsigned group does not transfer funds.
- All four paths require `ARENA_LOOT_ENABLED=true` and `ARENA_TREASURY_APP_ID=3658640544`. Admission requires the WebSocket transport.
- Only reward functions bind Secret Manager `ARENA_REWARD_ORACLE_MNEMONIC`, using the dedicated `arena-rewards@dark-coin-dc4a3.iam.gserviceaccount.com` identity. This identity requires approved Firestore server access to process records. Never put this mnemonic into public environment settings, browser code, logs, or the realtime worker.

The creator/oracle wallet needs ALGO for publication storage and transaction fees. The treasury requires inventory, which the authorized loader can deposit through `/arena/load`.

## Operator commands

Compile and update using the existing workflow, with `updateApp(3658640544)` selected in `contracts/deployment.js`:

```powershell
cd contracts
python ArenaTreasury.py
node deployment.js
cd ..
```

The local operator helper reads `.env.deployment.local` privately and validates the signer against the deployed creator and oracle:

```powershell
node scripts/setup-arena-loot.cjs status
# Initial Secret Manager setup only; refuses to replace an existing secret:
node scripts/setup-arena-loot.cjs secret
# Enable publication once services and inventory are ready:
node scripts/setup-arena-loot.cjs enable
# Stop new allocations without invalidating previously reserved claims:
node scripts/setup-arena-loot.cjs pause
```

Deployment:

```powershell
node scripts/build-arena-economy.cjs
node scripts/build-arena-server.cjs
npm run build
node scripts/copy-next-to-functions.js
pwsh -NoProfile -File scripts/deploy-arena-realtime.ps1 -EnableLoot
firebase deploy --only functions:nextServer,functions:arenaCombat,functions:arenaRewards,functions:arenaLootEvents,hosting --project dark-coin-dc4a3 --non-interactive --force
```

Pause publication first for an operational rollback. Keep the claim-capable contract and saved-claim API available so already allocated rewards remain recoverable. Do not delete encounter/reward documents or reroll failed allocations.

## Verification

```powershell
node --test tests/arena-loot-pickup.test.cjs tests/arena-economy.test.cjs tests/arena-realtime.test.cjs
node scripts/check-arena-pickup.cjs
node scripts/test-arena-loot-drops.cjs
node scripts/test-arena-loot-ui.cjs
```

The AVM check uses an unsigned simulated ledger to exercise the exact compiled sponsored-claim code. It does not broadcast a test reward. It checks exact payment and rejects a changed recipient, changed amount, duplicate claim, and non-oracle sender. Local integration tests cover defeat through publication, pickup, delivery/saved claims, concurrency, and timeout recovery. Browser tests render the real champion and arena assets at desktop and phone widths.

## Rollout status — September 24, 2026

- Sponsored-claim contract update confirmed: `FKBONNRPWRBCWNF7WSFAD3JL3YBJJJAFAT5MEDD33GXCK7KDOJZQ`.
- The website and WebSocket worker are deployed with app `3658640544` and free entry. Worker revision: `arena-realtime-00014-4kb` (Graveclaw-only, on-chain ownership checked admission without a sign-in signature).
- Both reward functions deployed successfully under the dedicated identity. The immediate trigger watches only private loot job creation. The shared website identity no longer has access to the new oracle secret.
- 42 automated tests cover the current server changes; the existing unsigned AVM claim simulation, signature-free entry browser test, desktop/mobile wallet reward checks and the production build passed. No artificial reward transfer was broadcast.
- **Loot activated September 24, 2026 (September 25 UTC):** following the user's activation request after disclosure of the permission scope, `roles/datastore.user` was granted to the dedicated reward identity. The treasury is unpaused and scheduled reward retries are enabled. The earlier automatic approval review blocker is resolved.
- Both reward functions are ACTIVE under the dedicated identity. `firebase-schedule-arenaRewards-us-central1` is ENABLED; its successful attempt at 2026-09-25 04:36 UTC followed initial IAM propagation errors. A pending real Graveclaw defeat was published and its Merkle root verified on-chain. No artificial victory or test payout was created. Pickup/delivery remains player-driven.

## Signature-free entry rollout verification

Production web build `5xn2dI89FXfKgyYgaoRXD` and `arenaCombat` deployed successfully. The rendered live page shows signature-free entry and omits the removed loot panels; the existing wallet selector opens. Public reward lookup without a Bearer token returns HTTP 200 for a fresh empty address. The live schedule contains Graveclaw in all 24 slots. Local browser tests exercise actual entry without wallet signing, the real wallet popup, unique-asset aggregation across pages, claim review, cancellation and simulated confirmation; no test funds were sent. Live loot publication is now enabled; see the activation verification below.

## Live activation verification — September 25, 2026 UTC

- Treasury unpause transaction: `MN6FHSEOLRVKC24VHBGYY6RPS2RU2VBBVQ5SND3SRF4GGP2B2B4A`, confirmed round `65370556`; final `paused=0`.
- Registered available inventory before the first publication: 242,710.930235 DARK (ASA 1088771340). No registered available NFT was found at that check.
- Real Graveclaw encounter `497308` published via `H4SO2O2WOUDS3MS6NLXQSPMNJJ4T7WGEGVJWXYYAO2EY2WI5AJSQ`. Its stored Merkle root matches the on-chain encounter box.
- Verification found zero pending defeats and one available personal reward drop. Auto-delivery is triggered by a real player pickup; saved rewards are claimable through the wallet popup.
- To pause future loot allocation, use the existing operator pause command; existing reserved claims remain recoverable.

## Pickup-only reward gate

- Contract update `P6TF7CBRLIH2HUVDXTZAEZXBRO7F3JYMOLSRI56CKLSGQJZTCL6A` preserves app 3658640544 and its inventory/boxes. Approval is 2044 bytes plus the existing 4-byte clear program, fitting its original zero-extra-page capacity.
- The existing encounter bitmap uses bits 0–7 for consumed claims and bits 8–15 for oracle-confirmed pickups. A manual `claim` must have its pickup bit set, even if the caller already knows the Merkle proof. Only the oracle can call `pickup`. `claim_for` remains oracle-only and the delivery service requires a server-recorded `pickedUpAt` before signing.
- For a collected drop needing opt-in or unfreezing, the reward service sends a 0.001 ALGO oracle-paid pickup authorization, then saves the claim. Authorization transaction IDs/validity windows are persisted before broadcast; retries reconcile the bitmap and avoid replacing a still-valid transaction.
- The wallet reward API independently requires the recorded pickup and its on-chain authorization. Uncollected drops are excluded from the list, badge, and unsigned claim preparation. Uncollected reservations remain in the treasury; this change does not release or reroll them.
- Existing collected/paid rewards are preserved. The rollout inventory check found one collected reward already paid and one uncollected drop; neither record was modified to fabricate a pickup.
- Validation: 45 server tests, desktop/mobile wallet UI checks, and unsigned AVM simulations covering funded publication, pre-pickup rejection, authorized manual claim, oracle restriction, idempotent authorization, exact recipient/amount and duplicate payment rejection.

Pickup-gate rollout confirmed: production build `IlIsj5DBT1oSdVtCu7xom`, `nextServer`, `arenaRewards`, and `arenaLootEvents` deployed successfully. A real uncollected drop was absent from the live wallet rewards response, and its direct claim request returned HTTP 400 requiring pickup. The deployed contract contains the 2044-byte updated approval. No previously collected reward needed migration at the final check.

## Dark Coin 3D loot marker

Personal loot drops use a ground-resting Dark Coin model instead of the floating octahedron. The original logo contours are extruded into a raised white crescent, circular border and horizon stripes over a dark beveled coin with a gold edge. The glow ring pulses; the coin remains on the floor.

- Runtime builder: `components/arena/playground/dark-coin-pickup.js`.
- Contour data: `dark-coin-logo.json`, derived from `public/WhiteCoinLogo.svg` and inverted to match `public/DarkCoinLogo.png`.
- Reusable standalone model: `public/arena/playground/models/loot/dark-coin.glb`.
- Regenerate the model and desktop/mobile screenshots with `node scripts/test-arena-loot-drops.cjs`.
- The coin marks any personal monster reward; the adjacent card still identifies the actual asset, amount and image. Existing server-authorized pickup and reward delivery remain unchanged.


## September 25, 2026: logo, feedback and loot latency

- The ground pickup now uses the white crescent/horizon design supplied in
  `public/arena/playground/dark-coin-reference.webp`. The matching vector contours
  are extruded into real relief on a beveled coin. The previous inverted outer
  contour was removed. The exported model is `models/loot/dark-coin.glb`.
- Periodic damage labels are 60% of the normal hit dimensions, retain their damage
  type color, and last 1.05 seconds. Direct critical hits retain their larger size.
- The authoritative simulation removes the central dummy while a monster lives,
  then restores it between encounters. Both collision targets and network snapshots
  use this state; the client does not merely hide a still-hittable target.
- Allocation resolves off-chain image metadata only for the selected reward assets.
  It reconciles a pending direct payout before reserving inventory but no longer
  checks/refills the ALGO balance just to create a ground drop. The same funding
  threshold is checked when an actual pickup needs a payout.
- Reward events retry treasury contention/pending confirmation up to 12 times,
  approximately 0.75–1 second apart, before falling back to durable event retries.
  The persisted draw, pickup gate, reservation accounting and transaction sequence
  protection remain in place. No payment is made just to display the coin.
- New room jobs record `createdAt`. The worker logs `arena_loot_latency` with job
  kind, elapsed milliseconds, attempts and result. This permits live measurement
  without logging wallet keys or reward contents. Network, cold-start and chain
  confirmation delays still apply; there is no guaranteed delivery duration.

Validation: combat, NPC lifecycle, periodic damage, replication, status stacking,
reward allocation, trigger retries and pickup regression suites; production build;
headless browser pickup/render test and GLB export. No real reward transfer is
initiated by these tests.
