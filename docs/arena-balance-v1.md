# Arena combat v1.4

The source of truth is `components/contracts/Arena/arenaBalanceV1.js`, with
named trait perks in `arenaTraitPerksV1.js`. The playground simulation now uses
these values. The legacy NFT catalog supplies identities, not combat numbers.

The [complete trait reference](arena-trait-effects-v1.md) lists all 104 traits,
damage dice, statistics, reach, spell dimensions and abilities. Ninety-five
traits have one ability and nine have two. Rarity does not increase power.

## Individual hits, criticals and potency

- Every confirmed hit rolls its own damage dice, critical and each on-hit effect.
  Both katana cuts and both punches qualify independently. A first-hit success
  never prevents the second hit from succeeding.
- Base critical chance is 10%, for double direct damage. Traits can increase it
  to 25% and the multiplier to 2.5x. DOTs and poison fields cannot crit.
- There are no cooldowns on criticals, weapon effects or triggered trait perks.
  Each strike/target pair is deduplicated so repeated overlap frames cannot hit
  repeatedly. A separate strike or target gets its own rolls.
- Every status application specifies potency. One means its base magnitude;
  1.25 means 25% stronger. Each application is clamped to 0.25–2; accumulated potency is uncapped. It scales damage rate,
  slow strength, resistance reduction, weakening and push distance. Stagger
  potency scales interruption duration. Other durations do not multiply.
- Reapplication adds one stack and its potency, then resets the whole effect duration.
  Two equal applications are twice as strong. Icons show stack counts, not fractional
  potency or seconds. Expiry and cleanse clear the whole effect. Refresh does not
  inflict an immediate DOT tick. The latest attacker receives credit; accumulated
  DOT power preserves the potency-weighted power of earlier applications.
- Percentage slows and weakening stop at 100%; the strongest slow type applies.
  DOT and field damage is individually mitigated with no shared damage-rate cap.
  No stagger or knockback immunity timer suppresses a later application.
- Triggered healing works on every qualifying hit, capped by missing health.
  Different temporary bonuses add before stat caps; the same named bonus
  refreshes. Barriers share a 30 HP pool. Secondary effects cannot create
  recursive proc chains.

Magic impact effects use 1.25x potency. Heavy axe/club control is stronger;
rapid dual and wing effects use reduced potency. Exact values and proc chances
are generated in the reference from the same executable rules.

## Actions and controls

WASD moves, Shift runs, mouse aims, RMB draws/stows, LMB attacks and E casts the
equipped magic trait. An empty magic slot provides no spell. Empty head, armour
and extra slots grant no invisible equipment bonuses. An empty weapon uses
two unarmed punches.

Weapon cycle time includes windup, every strike, follow-through and recovery.
Haste shortens that complete cycle. There is no additional weapon cooldown.
The server preserves each weapon's authored strike and release phases.

Only magic spells have recast cooldowns. Casting starts at 0.65 seconds and
cast-speed bonuses can shorten it to a minimum of 0.55 seconds. Release happens
at 60%. The cooldown begins when casting finishes; interruption starts it
immediately and consumes the remaining action recovery. Cooldown reduction
affects the recast wait, not projectile speed. A maximum two-second refund per
cast cannot reduce that wait below four seconds.

Draw, stow, attack and spell casts share an action lock. Movement continues
during them; attacks move at 75% and casts at 70% speed. Walk is 1.65 m/s and
run is 3.2 m/s before equipment, direction, slows and stamina. Input magnitudes
are normalized by the server. Sprint drains stamina; attacks cost none.

## Server and shared arena

The playground is an eight-champion free-for-all in a circular arena. A champion
at zero HP is removed from room state and every connected client's scene.
Re-entry requires explicit selection and a fresh NFT ownership lookup. Leaving or losing
the connection removes the champion; there are no rewards or token transfers.

`lib/arena/simulation.js` owns movement, collisions, action timing, RNG, damage,
resistances, statuses, conditional/triggered perks, stamina, health and death.
It advances in steps no larger than 1/30 second. Inputs expire after 0.65 seconds;
sessions without heartbeats are removed after 12 seconds. Pausing controls does
not pause other champions or prevent incoming damage.

The production room uses the authoritative WebSocket worker described in
[arena-realtime-architecture.md](arena-realtime-architecture.md): 30 Hz simulation,
10 Hz acknowledged deltas, local prediction and remote interpolation. It writes
checkpoints and ownership leases rather than persisting every movement or hit.
The client never supplies trusted positions, damage, hits or health. Status stack
counts, summed potency and expiry travel in the same acknowledged snapshots.

Collision paths in `lib/arena/weapon-paths.json` are baked from actual animated
blade and fist sockets at 120 samples per cycle. The server interpolates and
sweeps those segments against identical body capsules, limited by weapon reach.
Projectile collision uses swept segments with the configured full width and
range. First impact stops the projectile. E spells originate at shoulder magic;
bow arrows and staff bolts originate at their weapon sockets. Colored trails
follow weapon sockets; projectile and field visuals follow authoritative state.

The older transaction transport remains a fallback using the same simulation.
Production deployment and rollback instructions are in
[arena-realtime-operations.md](arena-realtime-operations.md).

## Entry and security

Entry is signature-free practice admission: the connected address and champion ID
are sent only after the user inspects the 3D preview and presses Enter playground.
No wallet transaction, message signature or on-chain submission is requested.
The server independently reads NFT creator, public ownership, current metadata
and equipped Swapper boxes. Client-provided traits or stats are never trusted.

A supplied address does **not** prove wallet control: a custom client could use
another holder's public address. This mode must remain a no-rewards playground;
cryptographic wallet authentication is required before stakes, rewards, ranked
identity or protected account actions are added. Duplicate wallet/NFT entries,
server session tokens, admission throttling and authoritative combat still apply.

Sessions last one hour and use random bearer tokens kept only in client memory.
Only token hashes are stored. A wallet or champion can have one active entry.
Action sequence numbers prevent replayed requests from repeating hits. All
private room data, RNG state, admission throttles and sessions are in `arenaPrivate`,
which Firestore rules deny to every client (including signed-in site admins).
Admin SDK calls are the only writers. Public snapshots omit secrets and RNG.
The private `state` field is exempt from indexing. `deleteAt` is a Firestore TTL
timestamp: admission throttles expire after one minute, sessions after an hour and idle
rooms after a day. Authentication checks expiry immediately, independently of
asynchronous TTL cleanup. `firestore.indexes.json` configures only
these two fields; the existing project had no custom indexes. See the
[Firestore field configuration reference](https://firebase.google.com/docs/reference/firestore/indexes).

## Build, deploy and validation

The standalone `arenaCombat` Firebase HTTPS function is built with
`node scripts/build-arena-server.cjs`. Firebase Hosting routes
`/api/arena/combat` to it; the Next API route uses the same handler in local
development. Deployed servers use Application Default Credentials; local dev
can use the project's existing service account or the Firestore emulator.

After changing rules or motion:

1. `node scripts/bake-arena-collision.cjs` if weapon geometry/motion changed.
2. `node scripts/check-arena-balance.cjs`
3. `node scripts/write-arena-trait-reference.cjs`
4. `node --test tests/arena-combat.test.cjs tests/playground.test.cjs`
5. `node scripts/test-playground-equipped-traits.cjs`
6. `node scripts/test-arena-browser.cjs`
7. `node scripts/test-arena-firebase.cjs` for isolated real Firebase transactions
   and deployed-rule checks; it removes its QA records afterward.
8. `node scripts/build-arena-server.cjs`, `npm run build`, `npm run copy-next`.
9. Deploy Firestore rules before accepting entries, then the arena function,
   `nextServer`, and Hosting. Never deploy a stale server bundle after editing rules.

Automated tests cover independent multi-hit crits/procs, potency, per-hit healing,
action locks/replays, spell restrictions/timing, all seven projectile definitions,
blade misses, projectile impacts, movement limits, death, wallet proofs, two
browser clients, concurrent Firestore joins and private-state access denial.
Statistical checks cover all 104 traits and 79,800 passive loadout combinations.
These checks establish mechanical behavior, not equal matchup win rates; the
rules remain a balance playtest candidate.
