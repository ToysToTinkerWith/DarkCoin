# Arena interface, stamina and loot responsiveness

## Interface

All champion preview modes (idle, weapon and spell) retain left-drag orbit and right/middle-drag pan. Zoom is disabled on their OrbitControls, including the wheel. Arena camera wheel zoom remains available. Stat bars retain their original bounds and base marker, but no visible cap label or cap number is shown.

The arena has Leave arena and Controls at top left. Controls opens a keyboard-accessible, scrollable guide; closing it restores game input focus. Health and gold stamina bars float above every champion. The bottom right contains only the chosen baseline spell and its cooldown bar. Renewing Light is the fallback even if an equipped trait spell is selected. Equipped trait magic remains available on E.

## Attack stamina

Costs are in WEAPON_STAMINA_COSTS in arenaBalanceV1.js, 10–26 per weapon action, 8 for unarmed. Dual hits pay once at attack commitment; duplicate packets, busy actions and insufficient stamina cannot charge twice or produce a free attack. Draw/stow and magic-trait spells do not gain new stamina costs. A committed attack delays regeneration until its animation ends plus the existing one-second recovery delay. Sprinting cannot shorten this delay. The preview attack card shows the cost.

## Loot latency diagnosis

The latest observed encounter waited about 50 seconds before allocation, then about 5 seconds for publication. Production Cloud Run logs showed arenaLootEvents repeatedly rejected with 403: its Eventarc identity lacked run.routes.invoke. Only arena-rewards@dark-coin-dc4a3.iam.gserviceaccount.com was granted roles/run.invoker on the arenalootevents service; public invocation was not enabled.

Once requests reached the handler, logs exposed a second issue: a named Firebase app existed, so the apps.length check skipped default initialization and admin.firestore() failed. Both reward functions now explicitly obtain or initialize the default app. Busy publisher events throw for Eventarc retry instead of acknowledging and falling back to the minute scheduler.

Defeats bypass the ordinary two-second checkpoint debounce once; retries remain throttled. While loot is outstanding, the worker watches that encounter's reward documents and sends changed private drops immediately. A 15-second fallback poll recovers missed updates, and reconnects request an immediate refresh. Watchers are released at hour changes/drain. Rewards still require confirmed on-chain publication and server-authorized pickup before delivery or saved claim access. No odds, allocation, amounts or recipient rules were altered.

## Creator/oracle transactions

The configured oracle is the creator wallet. publishTransactions creates a grouped ALGO payment of 22,100 + 12,500 × distinct rewarded assets microALGO to the treasury, plus application calls. The payment funds minimum balance for the 40-byte encounter box with a 9-byte name, and each 8-byte budget box with a 17-byte name. For one asset type this is 0.0346 ALGO, separate from transaction fees. It is storage collateral retained in the app, not DARK taken from a champion. After pickup, claim_for is signed by the oracle and the contract sends the reward asset internally to the assigned wallet. Non-opted-in wallets get a pickup authorization followed by a later opt-in/claim.

Algorand box formula: 2,500 + 400 × (name bytes + value bytes) microALGO. Reference: https://dev.algorand.co/concepts/smart-contracts/storage/overview/

## Operations

After deploying reward functions, preserve/verify the private trigger permission:

```powershell
gcloud run services add-iam-policy-binding arenalootevents --region=us-central1 --project=dark-coin-dc4a3 --member=serviceAccount:arena-rewards@dark-coin-dc4a3.iam.gserviceaccount.com --role=roles/run.invoker --quiet
```

A diagnostic job with kind diagnostic is a no-op for the handler: use that to verify delivery without creating loot or initiating a transaction, then delete the diagnostic document. The minute scheduler remains a recovery mechanism. Blockchain confirmation and cold starts can still add latency; instant on-chain settlement is not promised.

## Validation and rollout

- 59 relevant server checks passed: costs for every weapon, duplicate/rejected inputs, recovery after attack/sprint, private loot notifications, pickup authorization, publisher initialization/retry, combat, skills and statuses.
- Full champion-preview browser regression passed; real 3D HUD/controls/jump/fist/cooldown tests passed on desktop/mobile.
- Production build: `5xKM2_tVzalXQs88pUoWa`. Worker: `arena-realtime-00017-cl2`, image `sha256:ed898c16fd09c643e976eb8653b7aded271bd42ebff4dc1f93a11cf6c02813ea`.
- Confirmed latest recorded encounter publication payment through the public indexer: 34,600 microALGO plus its 1,000 microALGO transaction fee (other grouped application calls have their own fees).
- All four Firebase functions and hosting deployed. Repaired loot handler `arenalootevents-00003-qox` returned HTTP 200 for a no-op diagnostic event (request duration 1.61s); diagnostic documents were removed. This verifies event delivery, not end-to-end timing of a new real reward.

## In-arena character panel

The top-left Character button opens read-only Stats and Abilities tabs for the admitted champion. It reuses the preview's stat meters, equipment/skill contribution notes, trait artwork and ability cards; the panel does not create another WebGL view or change the equipped build. Live health/stamina update from the room snapshot. Permanent stats explicitly exclude temporary effects. Escape/Close restore canvas focus; keyboard focus stays inside the dialog while open. The arena remains live.

One encounter rewarding one distinct ASA requires 0.0221 ALGO for its encounter box plus 0.0125 ALGO for its asset budget, regardless of whether one or several champions receive that ASA. Publication is three 0.001 ALGO outer transaction fees (0.003 total); successful automatic delivery uses another 0.003 ALGO in pooled fees per claim. The 0.0346 ALGO payment is locked minimum balance, separate from those fees. The current contract retains these boxes and has no cleanup/refund mechanism, so storage collateral accumulates. No treasury behavior changed in this UI update.

Validation: local real-rig arena checks passed with the new panel's stat contributions, trait images, both spell cards, desktop/mobile layout and focus trap. Champion preview smoke checks and the production build passed. Website build: `FeFTpcJ06dF5zq4BGYR4l`.
Deployment completed for nextServer and hosting. Verified dark-coin.com/arena/playground returns build FeFTpcJ06dF5zq4BGYR4l and the live Character panel bundle returns HTTP 200. No worker or treasury deployment was needed.
