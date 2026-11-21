# Arena networking: latency and cost review

Implementation status, September 16, 2026: the recommended WebSocket worker and
client are implemented and deployed with public admission still paused. See
[operations and validation](arena-realtime-operations.md). The review below
records the original comparison and sizing estimates.

Research date: September 15, 2026 (Pacific). Recommendation and local benchmark;
the live arena transport has not been migrated by this review.

## Recommendation

Keep Firebase for persistent application data, admission and assets. Move the
live arena simulation to a dedicated, authoritative Node WebSocket service on
Google Cloud Run, in the same Google Cloud project. Clients send input changes;
the server keeps positions, attacks, health and collision state in memory.
Database operations leave the movement/attack response path.

Realtime Database is the strongest **Firebase database** option for rapid simple
state synchronization. It is useful for lobby presence, but adding it between
players and an authoritative combat worker adds another network hop and another
copy of rapidly changing state. It is optional for this eight-player arena.
[Firebase database comparison](https://firebase.google.com/docs/database/rtdb-vs-firestore).

## What the existing code does

Inspected `arena-network.js`, `service.js`, `simulation.js`, `ArenaCanvas.js` and
the deployed database configuration. The existing database is Standard edition,
`nam5`, `PESSIMISTIC`; the combat function is in `us-central1`.

- The browser aims for five HTTP requests/second, even when idle. Each request
  waits for its response before the next one is sent. A 400 ms request therefore
  lowers the effective update rate to approximately 2.4 Hz, not 5 Hz.
- Each accepted input transaction reads the session and shared room, advances
  the simulation, serializes the entire authoritative room, writes it back, and
  returns a complete public snapshot. All players contend on that same room.
- Full snapshots repeatedly include champion identity, metadata, loadout,
  maximum stats, and the previous five seconds of events.
- Simulation catch-up uses small time steps, but there is no independently
  running 30 Hz server loop. It advances only when requests arrive.
- Local movement waits for server snapshots. Rendering extrapolates the last
  velocity for at most 300 ms and smooths toward it; it does not predict the
  player's new input immediately. Slow responses can also outlast the 650 ms
  input lease, causing stop/start motion.

For eight players at the intended 5 Hz, the baseline is **144,000 HTTP requests,
144,000 room document writes and at least 288,000 document reads per room-hour**.
This excludes joins, transaction retries, TTL deletes and function/egress costs.
Actual traffic drops when latency prevents the client reaching its target rate.

Firestore server transactions lock documents in pessimistic mode. Competing
writes wait; transactions can retry or fail under contention. Increasing the
function instance count does not remove the shared-document bottleneck.
[Transaction contention](https://firebase.google.com/docs/firestore/transaction-data-contention).

Firestore listeners would remove polling, but each changed document delivered
to a listener is a billable read. Merely putting eight listeners on a room that
is still rewritten 40 times/second would create about 1.15 million listener
reads/hour, before server reads. Partial `update` calls remain billable writes.
[Firestore billing](https://firebase.google.com/docs/firestore/pricing).

## Local sizing experiment

Run `node scripts/benchmark-arena-sync.cjs`. Results are saved to
`output/playground/arena-sync-research.json`.

The script uses the real simulation, eight fixture champions, mixed weapons and
magic, and 1,200 simulated ticks, discarding the first 300. It makes **no network
requests or Firebase writes**. Health is inflated to keep fixtures alive.

| Eight-player scenario | Simulation mean / p95 per tick | Current snapshot | Compact JSON sizing estimate |
| --- | --- | --- | --- |
| Stationary, facing updates | 0.045 / 0.066 ms | 5,698 bytes | 394 bytes |
| Moving and attacking | 0.074 / 0.146 ms | 10,299 bytes | 4,236 bytes |

The compact estimate sends static champion data only at admission and retains
dynamic health, stamina, status, barrier, cooldown and action information. It
still repeats event/projectile arrays; event cursors and deltas can reduce that
further. This is a sizing experiment, not a working alternative protocol.

These are local Windows Node results, **not cloud latency or browser FPS
measurements**. They suggest database/network waits should be removed before
buying more simulation CPU. They do not establish maximum room capacity or
worst-case clustered melee performance.

At the target polling rate, the combat fixture's full snapshot alone represents
about 1.48 GB/hour of response JSON across eight clients, before HTTP overhead
or compression. GLB model downloads are separate.

## Firebase product assessment

This covers the current Firebase Build and Run catalog, grouping products that
serve the same role. Suitability is an engineering assessment for this arena.

| Product | Appropriate role here | Live combat decision |
| --- | --- | --- |
| Realtime Database | Optional lobby occupancy, online/offline presence, simple transient state | Best database-only synchronization option; not required on the recommended gameplay path |
| Cloud Firestore | Profiles, verified equipment/session records, sparse checkpoints, room ownership, results | Keep, but remove per-input transactions |
| SQL Connect (formerly Data Connect) | Structured account/history queries if relational reporting becomes necessary | No benefit for per-frame positions; adds a PostgreSQL service |
| Cloud Functions | NFT ownership/loadout checks, short-lived entry tickets, results processing | Keep outside movement and attack loops; do not trigger one invocation for every position update |
| Firebase Hosting | Web app and cached GLB/texture/animation assets | Keep the site and assets here; connect gameplay directly to a WebSocket endpoint |
| App Hosting | Managed full-stack web deployment | Does not by itself provide shared in-memory game authority |
| Cloud Storage | Source models, textures, exported replays and large immutable files | Do not use object writes as game-state messages |
| Authentication | Anonymous/custom app sessions if needed, or existing account identities | Useful for admission; no need to authenticate every input through a database lookup |
| Phone Number Verification | Phone verification | Not needed for arena transport |
| App Check | Additional admission abuse protection | Complementary; does not validate physics, hits or NFT wallet control |
| Remote Config / A/B Testing | Rollout flags and occasional tuning | Optional control plane; never fetch on each frame; Remote Config now has usage-based paid tiers |
| Performance Monitoring | Sampled latency/loading instrumentation | Useful alongside custom WebSocket RTT, server tick and browser frame metrics |
| Analytics | Aggregate joins, session length, errors and combat engagement | Sample/aggregate; do not emit analytics on each movement tick |
| Cloud Messaging / In-App Messaging | Invitations, notifications and announcements | Not the game-state transport |
| Crashlytics | Supported native-client crash reporting | Not a browser synchronization solution |
| Test Lab / App Distribution | Device testing and native build distribution | Development support, not game hosting |
| Extensions | Specific background automation | No replacement for the authoritative simulation |
| Firebase AI Logic / Genkit / Firebase ML / Studio and Gemini tools | AI features, authoring and development | Not movement networking or authoritative combat |

Sources for product roles: [Build catalog](https://firebase.google.com/products-build),
[Run catalog](https://firebase.google.com/products-run),
[SQL Connect](https://firebase.google.com/docs/sql-connect),
[current pricing](https://firebase.google.com/pricing).

## Why not simply switch everything to Realtime Database?

RTDB's native persistent connection avoids the HTTP polling loop, and
`onDisconnect` supports presence cleanup. Its published typical database
response times are not a guarantee of browser-to-server round-trip latency.
[Presence](https://firebase.google.com/docs/database/web/offline-capabilities),
[database comparison](https://firebase.google.com/docs/database/rtdb-vs-firestore).

RTDB bills storage and outbound bandwidth rather than a fee per write. The
published paid rates are $5/GB-month stored and $1/GB downloaded after allowances;
connection/protocol/encryption overhead also matters. Broad listeners and
repeating full room state can still be expensive.
[RTDB billing](https://firebase.google.com/docs/database/usage/billing),
[pricing](https://firebase.google.com/pricing).

Example: a deliberately small 320-byte room update, sent 10 times/second to eight
players for an hour, is 92.16 MB of application payload. At $1/GB this is roughly
$0.09/hour beyond allowances, before protocol overhead and any authoritative
worker. This is an illustration, not a measured RTDB wire payload or total bill.

Client-written positions are attractive for a casual visual demo but allow a
modified client to teleport. Security rules are not the existing server's
collision, dice, crit, status and damage simulation. Keeping that authority
requires a worker even if inputs and outputs travel through RTDB. A worker
listening to inputs and publishing state is preferable to per-input Functions,
but direct WebSockets avoid the intermediary database entirely.

RTDB documents a sustained write-rate threshold around 1,000 writes/second per
database and a 64 MB/minute write-volume limit. Multiple arenas need deliberate
sharding if using this transport.
[RTDB limits](https://firebase.google.com/docs/database/usage/limits).

## Proposed protocol and execution

```text
Firebase Hosting ── loads web app + cached 3D assets ──> Browser
Browser ── join/ownership check ──> admission API ──> Firebase persistent data
Browser <════════ encrypted WebSocket ════════> authoritative Cloud Run worker
         input changes / small state deltas     30 Hz simulation in memory
                                                    │
                                   room lease + sparse checkpoint/results
                                                    │
                                                 Firestore
```

Initial tuning targets, to validate with a real deployment:

1. **Server simulation: 30 Hz**, independent of HTTP requests and database I/O.
   Continue using the existing combat rules, deterministic RNG and swept hit
   paths. Clients never choose HP, damage, proc outcomes or final positions.
2. **Input: immediate key/action transitions, coalesced facing changes up to
   20 Hz**. Send sequence number, movement axes/buttons, facing and action ID.
   Heartbeats refresh the existing input lease while moving, even if unchanged.
   Separate liveness from movement so an idle connection needs only a slow ping.
3. **State broadcast: begin at 10 Hz**, test 15/20 Hz if required. Send only
   changed entities/fields; quantize position to centimetres and facing to an
   appropriate small increment. Use numeric room-local IDs. Send cosmetics,
   trait definitions and animation files once or by cached version reference.
4. **Events:** send attack start/time/duration, spell release, hit, status and
   death transitions once with monotonic IDs, replay bounds and acknowledgments.
   Clients animate bones and trails locally; never stream meshes or joint poses.
   Resync keyframes cover missed deltas/reconnects. Delta baselines must be
   acknowledged; do not silently drop a delta that later packets depend on.
5. **Responsive controls:** predict the local champion's movement immediately,
   then reconcile against server acknowledgments. Interpolate remote players
   through a small adaptive buffer, initially 75–100 ms. Predict cosmetic
   windup if appropriate, but confirm hits/damage only from the server.
6. **Backpressure:** bound the action queue and message rate. Coalesce unsent
   transforms; resync a slow client instead of accumulating stale snapshots.
   WebSockets are reliable and ordered, so packet loss can still stall a stream;
   they do not remove physical network latency.
7. **Persistence:** write a checkpoint every 30 seconds while occupied, plus
   entry/exit/important results. For a no-reward practice room, restarting the
   round after a worker crash may be cleaner than restoring up to 30 seconds
   of stale combat. Do not promise lossless recovery from sparse checkpoints.

## Cloud Run operations that must be designed correctly

Cloud Run is a Google Cloud service, not a Firebase database. It supports
WebSockets, but connections remain subject to request timeouts (maximum
60 minutes). Reconnect/resume is required. Open sockets keep the instance active
and billable. Session affinity is best-effort, not room ownership.
[Cloud Run WebSockets](https://cloud.google.com/run/docs/triggering/websockets).

- Start with one public eight-player room and one active authority, not arbitrary
  independent Function instances with their own copies of the room. A maximum
  instance setting alone is not sufficient protection during revision overlap.
- Use a transactional room lease with an increasing ownership epoch. For
  example, renew a 20-second lease every five seconds. Stop accepting commands
  and publishing results before a locally conservative lease deadline if
  renewal fails. Check epoch when writing checkpoints/results.
- A non-owner process must reject/retry or route connections to the owner; it
  must not create a second room with the same identity. Initially use controlled
  draining: stop admissions, notify clients, checkpoint/reset and close old
  sockets, release ownership, then admit clients to the new revision. Document
  the brief interruption; do not claim seamless deploys.
- For multiple rooms/instances later, add explicit room routing and a mechanism
  to forward requests to the owning worker. Redis/Memorystore or a dedicated
  game-server fleet are later options with their own baseline costs. Autoscaling
  and sticky sessions alone do not ensure players land in the same room.
- Expose WSS directly on the Cloud Run endpoint or a suitable dedicated game
  domain/load balancer. Keep the regular website on Firebase Hosting. Hosting
  rewrites have a documented 60-second request timeout, so they should not be
  the gameplay stream path.
  [Hosting and Cloud Run](https://firebase.google.com/docs/hosting/cloud-run).
- Authenticate the socket once with a short-lived admission ticket. Use origin
  checks, input validation, rate limits and reconnect replay protection. Retain
  the current signature-free practice semantics; anonymous Firebase Auth or
  App Check would not by themselves prove NFT wallet control.
- Start with 1 vCPU / 512 MiB and measure. Use scale-to-zero for the lowest empty
  arena cost, or one warm instance if avoiding the first-join cold start is worth
  it. Close abandoned sockets; an empty but connected spectator can keep billing
  active. Choose a region using player RTT measurements.

## Writes and compute estimate

For one continuously occupied eight-player room, using the example above:

| Steady-state operation | Current design at target rate | Proposed design |
| --- | ---: | ---: |
| Room-state writes/hour | 144,000 | 120 checkpoints |
| Room-lease writes/hour | 0 | 720 small renewals |
| Total of those writes | 144,000 | 840 |
| Per-movement database reads/writes | 2 reads + 1 write | 0 |

That is **99.4% fewer steady-state database writes** before joins, results,
retries, deletes and recovery. Database billing is reduced, not replaced by a
claim of zero infrastructure cost. The main improvement is eliminating the
database round trip from player input.

Cloud Run's published `us-central1` instance-based rates are $0.000018 per
vCPU-second and $0.000002 per GiB-second. At 1 vCPU / 512 MiB, that is about
**$0.0684 per billed instance-hour**, or **$49.93 for 730 hours** before free-tier
credits. Four billed hours/day over 30 days would be about $8.21 in this compute
model. Egress, database operations, logs, builds/artifacts, idle shutdown delays
and taxes are additional; actual prices depend on region and billing settings.
This is a resource estimate, not a forecast of the account's bill or capacity.
[Cloud Run pricing](https://cloud.google.com/run/pricing).

Do not quote the pricing page's default Iowa Firestore rates as this project's
`nam5` price. The operation counts above are the reliable comparison; the actual
regional SKU and existing shared allowances should be used in a billing forecast.
[Firestore location pricing](https://cloud.google.com/firestore/pricing).

## Migration and acceptance checks

1. Introduce a transport interface behind `ArenaConnection`. Keep the existing
   REST transport as a controlled rollback option, not two simultaneous
   authorities for the same room.
2. Build the room worker around `simulation.js`; split input application from
   ticking while preserving the existing tests. Add lease expiry, connection
   admission, ordering, disconnect and controlled-deploy tests.
3. Add static loadout handshakes, compact delta state, event cursors, local
   movement prediction and server reconciliation. Assets continue loading from
   Firebase Hosting. Do not change the champion artwork or combat balance.
4. Test 1/4/8 real clients in staging. Include 50/100/200 ms added RTT, jitter,
   reconnect, slow clients, worker failure and overlapping revisions. Verify
   exactly one authority and no duplicated hits, crit rolls or item procs.
5. Measure input-to-local-motion, confirmed attack latency, WebSocket RTT/jitter,
   bytes per player-minute, server tick p95, event-loop stalls, checkpoint/lease
   write counts and billed instance time. Track browser FPS/draw calls separately:
   a faster server cannot fix GPU overload from eight detailed characters.
6. Target immediate local visual response, stable remote motion at 10 Hz, and
   no per-input database activity. Load-test before increasing room capacity;
   no fixed end-to-end latency guarantee follows from the database's marketing
   response-time figures.

The product choice is therefore **Cloud Run for active combat, Firestore for
infrequent durable data, Firebase Hosting for assets, and optional RTDB for
lobby presence**. A database-only RTDB prototype is simpler to start, but the
dedicated authority better preserves this arena's server-validated combat while
minimizing writes and repeated payloads.
