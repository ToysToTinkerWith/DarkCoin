# Council: Firebase proposals and instant NFT voting rewards

## Mainnet target and live status

Activated on **November 19, 2026**. The migration confirmed at round **67113001**
([transaction](https://allo.info/tx/HDSMZTJ3OG642QZRNU2SL6Y4HKOBFUQDARHWHH5MTT4KBRKN2B5Q));
submissions opened at round **67113042**
([transaction](https://allo.info/tx/J4R6ZY3MMN27FTKXJO2BMW62UAFR3355ZX5M245JHJLYGP7ZB75Q)).
The deployed approval SHA-256 is
`94d4d7ecebde00634a0563bfa39f38e2758a42d08ee7ed58dbdc0ca72fec85d6`.
The website is [dark-coin.com/council](https://dark-coin.com/council).
Live status remains authoritative if a later operator pauses or upgrades it.

The Council entry page links to Proposals, New proposal and Treasury. It shares
the Arena/Market landing layout in `components/navigation/SectionLanding.js`,
with Council artwork and wording. There is no Overview or Rewards section;
old `/council/rewards` links redirect to Proposals. Instant voting payments
remain part of the vote, and ballot-deposit returns remain on each finalized
proposal page.

The Treasury page shows the full receiving address beside an inline funding QR.
It encodes the ARC-0026 URI `algorand://ADDRESS`, with no prefilled amount, asset
or note. Users can copy the address, open a compatible wallet, or enlarge the
QR to scan it. The address comes from the verified application configuration;
it is the Council app account, not an operator's wallet. Funding is reviewed
and confirmed by the sender in their Algorand wallet.

Council uses existing Algorand mainnet application **1239236238**, retaining its
treasury address, assets and legacy proposal records. Run `npm run council:status`
for the authoritative live program digest, initialization, pause flag, public
service addresses, balances and legacy record inventory. A generated review
package is preparation, not proof that activation happened.

The legacy application's creator is
`NSPLIQLVYV7US34UDYGYPZD7QGSHWND7AWSWPD4FTLRGW5IF2P2R3IF3EQ`.
This is different from the NFT collection's creator. New configuration starts
**paused** until the matching website/backend and submission signing secret are
deployed. Pausing blocks submissions and treasury execution; existing voting,
finalization and ballot storage refunds remain available.

## Proposal storage

Firebase Firestore stores the complete canonical proposal manifest: title,
original prompt, image/video references and captions, and every treasury/governance
action. Original attachment bytes live in Firebase Storage under
`council/media/SHA256/UPLOAD_ID` (legacy originals use `council/images/SHA256`);
`councilImages` stores immutable file metadata.
Manifests live in `councilManifests`, also addressed by SHA-256. New uploads use
resumable 8 MiB transfers directly to Storage, without resizing, transcoding or
the old 6 MB application limit. The storage provider limits a single object to
5 TiB; browsers and local devices may impose practical limits. Up to five media
attachments are supported per proposal. The server verifies the full original
SHA-256 in bounded streaming ranges before marking an attachment ready. Both the
composer and quote API refuse submission until every attachment is ready.
Client writes to metadata/manifests are denied; signed server requests create
the content. Upload session capabilities and verification state are private.

The contract stores only compact verification and voting state: content and
action hashes, proposal owner, dates, counters, snapshotted voting/reward rules,
and executed-action bits. No prompt, image bytes or action array is stored in a
proposal box. During treasury execution the caller supplies the frozen action
bytes; the contract checks their hash before using the requested action.

Text, images and actions are immutable once submitted. Back up the Firestore
collections and original Storage objects: hashes prove content integrity but
cannot recover deleted content.
API image and manifest endpoints serve those exact stored objects.

Each confirmed proposal also receives a Discord discussion thread inside
**DARK COIN WEB → #proposals**. Full details, media links, votes, finalized
results, treasury execution and published implementation progress stay in that
thread. See [Discord operations](council-discord.md) for configuration and retry
behavior. Discussion delivery is independent of the financial transaction;
delivery failure never means the user should pay or vote again.

## Voting and instant rewards

- Anyone can submit a paid proposal with up to five image or video attachments.
- Initial fee: **10 ALGO + 0.02 per word + 2 per attachment**. Title, prompt and media
  captions count toward words. Storage and network fees are reviewed separately.
- Initial fee allocation: **40% hosting/AI**, **40% maximum voting rewards**,
  **20% treasury**. Hosting goes to
  `VWYCYQ3H3PPNIGON4H363DIH7BP33TTZWUUUNMTDXCIHRCDPFOMU7VJ5HM`.
- Each attachment adds 250 effective words for the voting window. Initial tiers are
  7 days through 250 effective words, 14 days through 1,000, and 30 days above.
- Each registered DAO NFT has one ballot per proposal. A wallet may vote with
  any number it currently owns. It may revise a ballot before closing.
- **The first vote pays its NFT reward in that same atomic transaction group.**
  The fixed amount is `floor(voterPool / eligibleNFTs)` microALGO, snapshotted
  when the proposal is submitted. This denominator is all registered eligible
  NFTs, not unknown eventual turnout. No claim or successful result is needed
  for the reward.
- Changing a vote never pays again. Transferring an NFT never creates a second
  ballot or reward. A new owner may revise the existing ballot; its original
  voting wallet retains the ballot storage refund entitlement.
- The fixed maximum reward liability is reserved so treasury spending cannot
  consume it. Unpaid voting ALGO always stays in the treasury. At finalization,
  its reservation is released and it becomes spendable by the Council.
  Integer rounding dust is not owed to a voter.
- A first ballot requires a refundable box deposit. After finalization, **Return
  ballot storage** deletes that ballot box and returns its deposit to the first
  voter. This is a storage refund only; its voting reward was already paid.
- Initially 50 distinct NFTs must participate and at least 60% of Yes + No must
  be Yes. Abstain counts toward participation; all-Abstain fails. Thus 1 Yes and
  49 Abstain passes. These are NFT counts, not unique-person or wallet counts.
- The committed registry currently contains 1,114 live supply-one,
  decimals-zero `DCGV` NFTs. New mints need an explicit reviewed registry upgrade.

For example, a proposal with 400 total words and one image costs 20 ALGO before
storage/network fees. Its initial voter pool is 8 ALGO. With 1,114 eligible NFTs,
each NFT's first vote pays 7,181 microALGO immediately. Rewards need not exceed
the voter's combined voting/refund network fees at high participation.

Current storage funding is 0.1061 ALGO for a proposal's 248-byte verification
record, 0.0293 ALGO for a refundable NFT ballot, and 0.1221 ALGO for initial
configuration. Proposal text, images and action arrays do not occupy those boxes.

Future passed rule actions can change fees, splits, durations, participation,
support thresholds and supported operational addresses. Existing proposals keep
their own deadline, reward amount and voting thresholds.

## Approved treasury actions and implementation

Passed proposals can transfer exact ALGO/ASA quantities to exact recipients, opt
the treasury into ASAs, swap through a specific funded Tinyman V2 pool, and change
supported Council settings or public service addresses. Action bytes are checked
against their immutable on-chain hash. Actions execute in their approved order;
completed bits prevent repeating one. An executor rotation must be last.

Treasury execution protects minimum balance and unpaid instant reward reserves.
Passed allocations are not pre-reserved against other passed proposals. An
unfunded action remains pending. Swaps calculate a minimum from execution-time
pool reserves and the current configured tolerance (initially 0.5%); this is not
a guaranteed price from the date voting started. Output ASA opt-in is automatic.

There is **no hosted autonomous AI worker**. After a finalized pass, choose
**Copy approved proposal for AI** and paste the brief into the AI session on the
computer with the dapp source. The brief contains original content, attachment
hashes, application/network/proposal identity and the exact local commands:

```text
node scripts/council-execute.cjs verify PROPOSAL_ID --digest APPROVED_SHA256
node scripts/council-execute.cjs execute PROPOSAL_ID ACTION_INDEX --digest APPROVED_SHA256
```

The copied text is not proof of approval. The tool verifies the live program,
registry, finalized vote, manifest, actions and attachment hashes. The AI then
implements, tests and deploys through the local release tools. Treasury actions
can instead be signed on the Council page with the authorized executor wallet.
No separate Council AI subscription/API key or worker host is needed.

Publish community-visible implementation progress using local Firebase Admin
credentials after verifying the exact passed proposal:

```text
node scripts/council-report.cjs PROPOSAL_ID running --digest APPROVED_SHA256 --summary "Implementing the approved change."
node scripts/council-report.cjs PROPOSAL_ID complete --digest APPROVED_SHA256 --summary "Implemented, validated and deployed the approved change." --release https://dark-coin.com/arena --tx EXECUTION_TXID
```

Statuses are `running`, `blocked` and `complete`. `--dry-run` verifies and prints
the public record without writing; `--summary-file FILE` accepts a deliberately
prepared public summary. `--runtime PUBLIC_CONFIG_JSON` loads the matching
network/app/program pin; the default optional file is
`.council-local/runtime.public.json`. Existing `.env`/deployment settings and
local service credentials are used without publishing their contents. Reports
are stored under `councilProgress` and displayed on the proposal page. Completion
is rejected while approved treasury actions remain unexecuted. Supplied monetary
transaction receipts must be confirmed executions of that same proposal; a
group's first budget-call receipt is resolved to its actual execution ID. Use
public release links and summaries, never credential dumps or private URLs.

Local execution persists a transaction identity **before** broadcasting under
`.council-local/`. Keep receipts after uncertain submissions and check the
recorded transaction ID before retrying. Confirm the process is gone and its
transaction state is resolved before removing a stale lock. On-chain monetary
execution is distinct from successful code publication; report release links,
checks and transaction IDs for the implemented proposal.

The creator retains upgrade/pause authority. Only the current executor can
execute a passed executor rotation. Losing that wallet requires creator-led
recovery. Delete is rejected by v3. Keep creator and executor recovery material
in the established private secret store.

The shared website also retains legacy Depths endpoints that use the existing
creator credential. The Council quote key is separate from that credential;
isolating creator authority from the older services requires a coordinated
Depths signing migration rather than removing a credential those routes use.

## Runtime configuration

Server runtime settings:

```text
COUNCIL_NETWORK=mainnet
COUNCIL_APP_ID=1239236238
COUNCIL_APPROVAL_SHA256=<digest of the final deployed approval bytecode>
COUNCIL_ENABLED=true
```

`COUNCIL_QUOTE_SEED` is a private 32-byte Ed25519 seed encoded as hex. Its derived
public address must equal the contract's quote signer. Firebase `nextServer`
binds that Secret Manager secret; do not place it in Next's public `env` mapping.
It signs proposal quotes and grants no treasury withdrawal permission. Firebase
Admin uses the attached production identity or local application-default
credentials (`GOOGLE_APPLICATION_CREDENTIALS` where appropriate).

`COUNCIL_IMAGE_BUCKET` names the Firebase Storage bucket for original attachment
objects; `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` is the fallback. The serving
identity needs bucket read/write access. Object generation preconditions prevent
overwriting an existing attachment; reads verify the content hash.

The local execution computer needs the same network/app/program digest and
registry. Optional `COUNCIL_EXECUTOR_MNEMONIC` enables local treasury signing;
wallet signing avoids storing it locally. Optional `COUNCIL_SITE` defaults to
`https://dark-coin.com`; `COUNCIL_LOCAL_STATE` selects the private receipt folder.
The local command also supports the established deployment creator credential,
and verifies that its derived address is the current executor before signing.

## Mainnet preparation and activation tools

Run from the repository root. `COUNCIL_QUOTE_ADDRESS` is the public address
derived from the server's secret seed. `COUNCIL_EXECUTOR_ADDRESS` defaults to the
existing creator wallet unless explicitly configured. No command below prints
private mnemonic or seed values.

```text
npm run council:prepare
node scripts/council-activation.cjs verify REVIEW_FILE
node scripts/council-activation.cjs refresh REVIEW_FILE
```

Preparation discovers the NFT collection, compiles current code and produces a
new package under `output/council`. It pins old/new program checksums, schema,
pages, creator, consensus, balances, legacy box hashes, exact registry, service
addresses, current source hashes and the unsigned update/fund/initialize group.
The exact group is simulated without signatures. `runtime.public.json` contains
the matching public runtime settings. A source change invalidates the review.
Expired transactions require a fresh preparation/refresh and new signatures.

The creator may sign through a wallet or use an existing local mnemonic variable
without putting it in command-line arguments. For the established local
deployment configuration:

```text
node scripts/council-activation.cjs sign REVIEW_FILE --out SIGNED_FILE --env-file .env.deployment.local --key-variable DEPLOYMENT_CREATOR_MNEMONIC
node scripts/council-activation.cjs submit REVIEW_FILE SIGNED_FILE
```

`sign` rechecks live legacy state, local source and compiled programs, verifies
the exact transaction group, simulates, signs locally and simulates the actual
signatures. It does not broadcast. `submit` repeats verification, stores a
durable receipt before broadcasting, waits for confirmation and checks the
activated programs, service addresses, registry and preserved legacy records.
Activation is atomic and starts paused.

Deploy the matching server settings, bound signing secret, Firestore rules and
website; verify backend readiness and quote signing before resuming:

```text
node scripts/council-activation.cjs resume REVIEW_FILE --env-file .env.deployment.local --key-variable DEPLOYMENT_CREATOR_MNEMONIC
```

Resume checks the deployed Council API reports the matching active configuration
before signing. Emergency pause uses the same local key options:

```text
node scripts/council-activation.cjs pause REVIEW_FILE --env-file .env.deployment.local --key-variable DEPLOYMENT_CREATOR_MNEMONIC
```

## Release verification

```text
npm run test:council
python contracts/CouncilDAO.py
python -m unittest discover -s tests -p council_avm.py -v
npm run build
node scripts/check-council-ui.cjs
node scripts/check-section-navigation.cjs
```

Real AVM execution requires a supported environment with AlgoJig, PyTeal,
PyNaCl and py-algorand-sdk. Missing AlgoJig is a failure, not a skipped gate.
An isolated Linux Cloud Build job can run these tests when this Windows host
cannot run the native package. Verify the exact tested program checksum before
activation. Mocked UI checks and a migration simulation do not replace funded
Tinyman integration validation. Browser checks block external writes.

Assign an operator for deadline finalization, manual AI handoffs, implementation
reports, key rotation, receipt recovery and Firestore backups. Remaining legacy
proposal records are preserved independently from new voting state.
