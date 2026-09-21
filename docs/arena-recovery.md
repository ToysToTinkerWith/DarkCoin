# Arena Image and Replay Recovery

## Diagnosis (2026-09-06)

- The retired `ipfs.dark-coin.io` gateway returned HTTP 401 for champion 1559365777's image. Algonode Pera, Pinata's public gateway, and `ipfs.algonode.xyz` returned HTTP 200 for the same CID.
- The affected encounter-5 battle stored monster move `1-Doom Haze` in its initial catalog. Run compaction/resuming changed its ID to `Doom Haze`. The replay verifier correctly rejected an unknown ID, preventing the battle result from advancing the run.
- A read-only diagnostic of battle `LjNnrDviQE1tnNYpjIHj` validated all 48 saved actions with the patched move matcher and replay-chain validator. Thirteen actions used the legacy aliases. No production data, results, rewards, or ownership were changed. The diagnostic did not load the production integrity secret.

## Fix

- Armory and shared champion cards resolve reserve-address/ARC-19 images through working gateways, with bounded retries and a local placeholder after all candidates fail. Missing optional display metadata no longer prevents artwork from loading.
- Armory surfaces load errors with a retry button instead of an unhandled rejected promise.
- New run snapshots preserve the battle engine's generated move IDs. Resumed fighters restore IDs from the battle's initial catalog, including in-flight animations.
- Existing replays accept only unique bare-name aliases of generated IDs in that actor's saved catalog. Unknown and ambiguous IDs, invalid targets, broken chains, and integrity mismatches still fail validation. Existing server integrity hashes are not rewritten.

## Verification and Release

Run `node --test tests/arena-recovery.test.cjs tests/market.test.cjs` and `npm run build`.
`scripts/check-arena-recovery.cjs` checks a local production server with a dummy wallet; it never signs transactions or updates runs. It deliberately blocks the primary image gateway to exercise the fallback.

Deploy both the Next.js frontend and its API for this fix to reach users. No contract redeployment or database migration is required. After deployment, the affected player should refresh and resume the existing run, not abandon it or pay for a new entry to address this error.
