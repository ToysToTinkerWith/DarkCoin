# Playground realtime operations

Implemented September 16, 2026. Public reopening was explicitly authorized with
"Make public entry open." The production build and admission runtime now use
`NEXT_PUBLIC_ARENA_ENABLED=true`; the Arena navigation follows that flag.
Public URL: https://dark-coin.com/arena/playground.

## Development testing deployment

The development site is https://dark-coin-arena-dev.web.app/arena/playground.
Connect your usual wallet, click a champion, inspect its 3D model, stats and abilities,
then click **Enter playground**. No signature or transaction is required. It reads
current mainnet NFT ownership/equipment; practice does not change NFTs or award rewards.

Controls: WASD move, Shift run, mouse aim, right mouse draw/stow, left mouse attack,
Space jump, E equipped magic, Q selected baseline spell, Escape pauses your controls (the shared match stays live). Share the same URL with another tester using a
different champion/wallet; the room holds up to eight champions. If a champion dies,
select it again to re-enter. A server redeploy restarts the practice round.

Development has its own Hosting site, `arenaDevWeb` Function (`arena-dev` codebase),
`arena-realtime-dev` worker, `ARENA_DEV_TICKET_SECRET`, worker service account and
`playground-dev-v1` room documents. These share the existing Firebase project/billing,
not a separate project. The worker defaults to zero instances and is capped at one;
the web Function is capped at two. Dev analytics are disabled. The dev web endpoint
allows only practice admission and read-only NFT APIs; other application APIs are blocked.
Dev deployment does not change production admission or production navigation.

`npm run deploy:arena-dev` rebuilds/deploys only these dev services. It creates a
`.next-arena-dev` build and packages it under `functions-arena-dev/.next`, leaving
production `.next` and `functions/.next` alone. It drains only the dev room before a
worker redeploy. `firebase.arena-dev.json` targets only the dev Hosting site/codebase.
Never use the default Firebase deployment command to publish a dev build.

Verification: `npm run test:arena-dev-entry` exercises deployed entry with a public
NFT ownership fixture and substituted browser wallet adapter; actual wallet pairing
needs a tester. `npm run test:arena-dev-cloud` exercises eight private fixture clients,
combat actions and reconnect through the real dev worker. Run private fixture tests
only when the development room is empty.

For dev room controls in PowerShell, set `$env:ARENA_ROOM_ID='playground-dev-v1'`
before `node scripts/arena-control.cjs status` or `drain`; remove the environment
variable afterwards. Do not run the production control defaults by mistake.

Deployment verified September 16, 2026: worker `arena-realtime-dev-00001-fpw`,
web build `sbKgYPQLNQVJNLHbUC632`. Thirty automated tests passed. Live checks verified
the normal wallet selector, NFT roster/equipment, 3D stats preview, signed admission,
movement/attacks, eight clients, reconnect and a checkpoint interval. Reports are
`output/playground/dev-entry-validation.json` and
`output/playground/realtime-dev-cloud-validation.json`. Actual wallet pairing was
not performed by automation; its adapter used the existing public NFT fixture.

Remaining human steps: test actual wallet pairing, fight with other testers, report
weapon/animation/performance issues. Public reopening has been authorized.
No Firebase setup or additional deployment commands are needed just to start testing.
Before larger public use, review real-device/network performance and billing, and
add explicit multi-room routing if more than eight simultaneous players are needed.

## Services and authority

- Website/assets: existing Firebase Hosting and `nextServer`.
- Entry: `arenaCombat` verifies NFT ownership and equipment, then issues a signed
  60-second admission ticket. No wallet signature or transaction is added.
- Gameplay: `arena-realtime` Cloud Run, `us-central1`, one vCPU, 512 MiB,
  instance billing, minimum zero, maximum one, concurrency 32, one eight-player
  room. WebSockets connect directly to `/socket`, bypassing Hosting rewrites.
- Storage: server-only `arenaPrivate` Firestore documents; existing rules deny
  client reads/writes. No new Realtime Database, SQL, Redis or paid lobby service.
  The existing `deleteAt` TTL policy is active for expiring tickets/results.
- Credentials: `ARENA_TICKET_SECRET` in Secret Manager, bound only to the worker
  and admission-capable Functions. The worker uses a dedicated service account.
  Never add this secret to Next's public `env` configuration or frontend code.

Only verified entry data is signed. The browser cannot select HP, equipment,
damage, crits, proc outcomes, RNG, final positions or server time. Signature-free
practice still verifies publicly visible NFT holdings, not cryptographic control
of the wallet. There are no rewards or ownership transactions.

## Transport

The simulation runs at 30 fixed steps/second in memory. Inputs are bounded axes,
facing, run state and actions, with increasing sequence IDs. Movement transitions
send immediately; facing is coalesced to 20 Hz and sustained movement refreshes
every 200 ms. Idle connections ping every three seconds. Inputs still expire
after 650 ms. Disconnected champions expire after 12 seconds.

Changed state is broadcast at up to 10 Hz, with a one-second idle heartbeat.
Positions use centimetre precision and facing uses 0.001-radian precision.
Numeric entity IDs and indexed fields keep messages small. Champion loadouts and
maximum stats are sent once, then again only when a new baseline is required.
Rendering, skeleton animation, trails and asset loading stay in the browser.

Each delta identifies its **acknowledged** baseline. Both ends retain 32 bounded
baselines; missing baselines request a full state. Events retain their existing
unique IDs, five-second replay window and 160-event bound. Replayed events are
deduplicated. Long interruptions resync current state, not a complete historical
replay of every hit. Attack sequence deduplication prevents rerolling an action
after reconnect. The existing per-strike crit/proc tests remain unchanged.

The local champion predicts shared movement immediately and reconciles against
server snapshots, including speed/slow/guard/stamina modifiers. Remote champions
interpolate through a 100–180 ms adaptive buffer with at most 100 ms extrapolation.
Only server-confirmed attacks produce damage. Input queues, message sizes, rate
limits, socket send buffers, histories and authentication time are bounded.

Resume tokens live only in server memory and the browser's current connection,
never local storage, URLs or Firestore. Reconnect preserves the champion and
sequence state within the disconnect window. A new connection replaces the old
one for that session. Worker crash/replacement deliberately ends the practice
round; expired sessions must select their champion again.

## Persistence and deployment fencing

The worker renews a 20-second lease every five seconds and stops serving before
a conservative 15-second local monotonic deadline. Firestore transaction read
times determine persisted lease expiry. Epochs fence claim/checkpoint/result
writes. A non-owner refuses admission; it cannot start another copy of the room.
Maximum instance count and session affinity alone are not the safety mechanism.

Checkpoints run every 30 seconds while occupied, plus coalesced lifecycle changes.
Death/exit records use epoch + event IDs for idempotence. Ticket nonce redemption
is one persistent write per admission to prevent replay across worker restarts.
Movement, facing and attack inputs themselves perform **zero database operations**.
Periodic checkpoints are diagnostic/recovery records, not restoration of stale
combat: after a crash the practice round restarts cleanly.

An occupied steady-state room targets 720 lease writes + 120 checkpoint writes
per hour. Admission, departures, deaths, retries and TTL deletes are additional.
An empty room releases ownership; idle instances may remain billed briefly
before Cloud Run scales them down. Open sockets keep Cloud Run active.

## Deploy / reopen / rollback

1. Run the tests below and build the website with `npm run build`.
2. `pwsh -NoProfile -File scripts/deploy-arena-realtime.ps1` builds a minimal
   container (only its lockfile, package, compiled worker and Dockerfile upload).
   It provisions the dedicated identity/secret if missing, drains existing room
   ownership, deploys the new revision, and re-enables WebSocket room ownership.
   If any step fails, the drain remains in place rather than starting two rooms.
3. Set the returned `wss://…run.app/socket` endpoint using
   `node scripts/configure-arena-admission.cjs <endpoint>`. This changes only
   `ARENA_TRANSPORT` / `ARENA_WS_URL` in `functions/.env`, never the entry pause.
4. Run `npm run build:arena-server`, `npm run copy-next`, then deploy only
   `functions:arenaCombat,functions:nextServer,hosting` with Firebase CLI.
5. **When reopening is authorized**, set `NEXT_PUBLIC_ARENA_ENABLED=true` in the root
   `.env` and `functions/.env` (the navigation card follows that flag), rebuild and
   redeploy the same Functions/Hosting. Both UI and server must be rebuilt.

`node scripts/arena-control.cjs status` shows only ownership/control information.
`drain` stops admissions and waits for lease release/expiry; players receive a
restart message. Cloud Run SIGTERM also drains, bounded by its shutdown window.
Deployments involve a brief interruption, not seamless handoff.

Rollback is manual, never an automatic fallback that could split a room:
pause entry, run `arena-control.cjs drain`, then `arena-control.cjs rest`, set
`ARENA_TRANSPORT=rest`, rebuild/redeploy admission and site, then reopen only if
desired. The preserved REST authority uses its previous separate room document.
To restore WebSockets, drain/control-select `websocket`, update admission config,
deploy and reopen in the same order. Restoring REST restores its previous latency
and database costs as well.

This implementation intentionally supports one public room. Multiple independent
rooms need explicit ownership routing/forwarding before raising worker instances.

## Verification and metrics

Commands:

```text
npm run test:arena
npm run test:arena-realtime
npm run test:arena-network
node scripts/test-arena-realtime-store.cjs
npm run build
node scripts/test-arena-realtime-cloud.cjs --soak
```

The final command is operator-only private QA: it reads the signing secret into
process memory and creates synthetic test champions while public entry is paused.
It opens eight real Chromium WebSocket clients and one fully rendered arena scene
with all eight champions. Do not run it against an occupied public room.
`--soak` holds all clients for another 35 seconds to span a checkpoint interval.
The store check uses isolated temporary Firestore documents to verify concurrent
ownership, takeover epochs, rejected stale writes/releases and drain behavior,
then removes only those fixture documents.

Reports:

- `output/playground/realtime-browser-validation.json`: 1/4/8 Chromium clients,
  50/100/200 ms injected RTT plus jitter, movement/actions, forced reconnect and
  state resync, controlled shutdown. Uses a transactional Firestore test double.
- `output/playground/realtime-cloud-validation.json`: actual Cloud Run, Firestore,
  eight browser connections and one rendered scene; sample FPS, RTT, draw calls,
  prediction correction, errors. Not an eight-device GPU capacity benchmark.
- `output/playground/realtime-cloud-arena.png`: private scene screenshot.

`arena_metrics` structured worker logs aggregate tick p95, player count, inputs,
bytes sent, persistence writes, resyncs and backpressure once a minute. Counters
for bytes/input are interval totals; database writes are process-cumulative.
The canvas exposes `data-fps`, `data-rtt`, `data-draw-calls`, and `data-correction`
for local diagnostics. No per-frame analytics/database telemetry is sent.

Track Cloud Run billed instance time, network egress and Firestore operations in
Cloud Monitoring/Billing. This change does not promise a fixed internet latency
or eliminate GPU costs from detailed models. The network and rendering metrics
are deliberately separate.


## Center strike dummy

The arena now includes a stationary strike dummy at (0, 0), with neutral damage
resistances and 1,000 HP. It is separate from champions and does not use a room
slot. All server melee sweeps, ranged projectiles and area damage can hit it.
Each weapon strike independently rolls damage, crits and eligible procs under
the existing combat rules. Applied statuses emit effect labels and show potency
and time remaining above the dummy. Damage numbers are colored by damage type;
critical hits are highlighted. The dummy cannot die or be displaced, refills on
lethal damage, and restores full health after six seconds without damage.
Dummy changes travel in acknowledged snapshot deltas; no per-hit database writes
were introduced. `node scripts/test-training-dummy-browser.cjs` checks visual
feedback with real simulation hits, while `node scripts/test-training-dummy-cloud.cjs`
uses an operator-only fixture against the production worker without opening
public admission. The automated suite includes dummy hits, misses, dual strikes,
crit/proc eligibility, ranged hits, periodic damage, expiry, resets and resync.

Production admission remains controlled independently by
`NEXT_PUBLIC_ARENA_ENABLED=true` in the website build and admission runtime.
Public reopening was explicitly authorized after the dummy deployment. To pause
again, set this flag to false in both environments and rebuild/redeploy the website
and admission Functions. Dev admission retains its separate flag.


## Fists, jumping, and spell recovery (September 18, 2026)

Left-click while a weapon is stowed performs the existing two-punch combination.
Both hits use the unarmed blunt damage rolls, independent crits, fist collision
paths, and the unarmed attack cycle. Stowed weapon procs and triggered weapon perks
are excluded; passive stats and other equipment perks still apply. Drawing the
weapon restores its own attack. The weapon remains attached to the back during punches.

Space (or the Jump button) initiates a server-authorized 0.84-second jump with a
0.8-metre apex. Thighs bend forward to 45 degrees and knees fold during airtime,
blending back into idle/walk/run on landing. Jumping can accompany another action,
but cannot restart in midair or while stunned. A single `jumpStart` timestamp is
replicated; the shared analytic trajectory drives render height, launch height,
and body collision height without extra per-frame position fields or database writes.
Ground area effects still apply. Jumping does not grant invulnerability.

Both E and Q display recovery bars rather than seconds. Each slot independently
replicates its cooldown start/end, including reductions/refunds. During casting,
the bar displays cast progress; after recovery it reads Ready. Casting overlays
are restored each frame so arm positions cannot accumulate or linger after a cast.

Verification: `tests/arena-jump-fists.test.cjs`,
`scripts/test-playground-jump-fists.cjs` (real rig, Space input, fist collision
agreement, weapon attachment, pose cleanup, desktop/mobile bars), and
`scripts/test-arena-realtime-browser.cjs` (jump/punch replication plus reconnect
at 1/4/8 clients and 50/100/200 ms simulated latency).


## Preview spell selection

The champion preview shows the currently selected spell's name, dice, timing,
and targeting details. Equipped NFT magic appears first and is selected by
default; otherwise Renewing Light is selected. Baseline choices update the same
card and optional 3D cast preview. Reopening a champion restores its default.

The equipped trait keeps its existing E binding. Selecting a baseline spell adds
that Q spell at admission; selecting the equipped trait sends no baseline spell.
Trait IDs are never submitted as baseline IDs, and the selector only includes
magic actually equipped by that champion. Admission and server combat rules are
unchanged. `scripts/test-champion-preview.cjs` covers both default paths, choice
changes, both kinds of 3D cast preview, entry payloads and reopening/reset behavior.
