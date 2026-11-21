# Compile and deploy

From the `contracts` folder:

```powershell
python ArenaTreasury.py
node deployment.js
```

The Python file generates `approval.teal`, `clear_state.teal` and their schema/hash manifest. Node reads that exact pair and assembles it through algod. Edit the action at the bottom of `deployment.js` by commenting/uncommenting create or update. The implementation lives in `deployment-actions.mjs`; the short CommonJS entry file avoids the module-type warning without changing the rest of the app.

## Current selection: replace Depths in place

```javascript
// await createApp();
await updateApp(3658640544);
```

The creator wallet is also the reward oracle. Creation and the initial Depths migration automatically derive the oracle public address from the creator signing account. No `ARENA_REWARD_ORACLE_ADDRESS` setting is needed or read. The creator signing mnemonic remains in `DEPLOYMENT_CREATOR_MNEMONIC` / `CREATOR_MNEMONIC` in the ignored root `.env.deployment.local`. The reward publisher's `ARENA_REWARD_ORACLE_MNEMONIC` server secret must belong to this same wallet. This script does not configure that server secret. An explicit `oracleAddress` option remains available if the wallet choice changes later; never put a mnemonic in that option.

The verified old Depths contract has 64 integer global slots, zero byte slots, 16 local integer slots, and zero extra pages. Mainnet is running consensus v42, which supports resizing global state during an update. This migration changes global allocation to two integers and one byte slice, leaves the local allocation untouched, and preserves app ID **3658640544** and its account **6FZBCWO4PIIKJVK7UCNGYHFISERISBGXW5WIVFPXNDNVE6XDOERWONAIVM**.

The updater checks the creator, exact old approval-program hash, app ID, network version, unused old global state, and absence of old reward boxes. It then simulates and submits **one atomic group**:

1. Update the existing app code and global schema.
2. Initialize the oracle and version, register existing asset holdings, and start paused.

Both happen or neither happens. No app deletion, asset transfer, or rekey occurs. On-chain initialization also rejects any legacy boxes or omitted asset holdings, including changes that happen after the preflight read. Existing registry storage uses the app's ALGO balance; for its current one-asset holding it reserves another **0.0189 ALGO** of minimum balance. The group currently costs **0.002 ALGO** in transaction fees from the creator. Additional program pages, if ever needed, are computed from the compiled size.

On September 24, 2026, public inspection found one existing ASA holding (DARK, 1088771340), no reward boxes, and no global state. Final unsigned mainnet simulation passed and rejected malformed initialization attempts. The simulation used the creator's public address as a test oracle; that does **not** configure the actual reward oracle. No migration was signed or submitted by the assistant.

A successful run prints the confirmation transaction. The loader now targets 3658640544 and remains disabled until compatible code and initialization are present. Reward services must use `ARENA_TREASURY_APP_ID=3658640544`, and the reward publisher's signing key must match the configured oracle. Leave publication paused until those settings are verified; unpausing is a separate creator action. This migration does not automatically enable reward publication.

Later calls to `updateApp(3658640544)` use the normal treasury update path and do not reset the oracle, pause flag, or reward records. An uncertain submission should be checked on-chain before retrying. The mistaken app 3718607904 is not selected or modified.

## Verification without deploying

```powershell
# From the repository root; public address only. No signing/broadcasting.
node scripts/check-depths-migration.cjs PUBLIC_ORACLE_ADDRESS
node --test tests/contract-deployment.test.cjs tests/depths-migration.test.cjs tests/arena-loader.test.cjs tests/arena-economy.test.cjs
```

The simulation script sends the compiled source and unsigned transactions to Algonode. It is only for the pre-migration Depths state. Importing deployment.js does not run its main function.

Protocol references: [global-state resizing](https://dev.algorand.co/concepts/smart-contracts/storage/global/) and [consensus v42 identifier](https://github.com/algorand/go-algorand/blob/master/protocol/consensus.go).
