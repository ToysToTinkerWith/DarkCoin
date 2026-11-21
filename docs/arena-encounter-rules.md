# Arena encounters and multiplayer loot

## Participation

A living, connected champion must damage the current monster or complete a healing spell during its fight. A completed heal counts even at full health because its buff still applies. Cancelled casts, misses, idle presence, dummy damage, passive item healing, and PvP damage do not qualify. Eligibility is bound to wallet and champion, retained on reconnect, reset for the next encounter, and frozen at defeat. One roll per eligible wallet. Champions still collect their own drops before payout; saved claims and asset opt-in rules are unchanged.

Entry closes when the monster spawns and stays closed through its retreat. The champion roster and preview display an entry-closed notice during active and returning encounters, while inspection remains available. The lobby checks status every 15 seconds while visible, refreshes on focus and inspection, and rechecks immediately before submitting admission. The preview entry button automatically unlocks after defeat or completed retreat. Only existing sessions can reconnect during a fight. A new wallet or replacement champion cannot join to collect last-minute loot.

## Multiple champions from one wallet

One wallet can join with different owned champion NFTs from separate tabs or windows. Each tab has its own player session, controls, and reconnect token. The server serializes admission and permits each champion asset ID only once, regardless of wallet or tab. Disconnect grace reserves that champion for its existing session; leaving frees it. The eight-champion room limit and active-boss entry lock still apply. Participant records use wallet-plus-champion keys. Loot remains one eligible roll per wallet per encounter, and a personal drop is bound to the selected qualifying champion; another champion from the same wallet cannot collect it.

## Population scaling

At spawn, count living connected champions (minimum one). Maximum health is base health × (1 + 0.60 × additional champions). Outgoing damage is multiplied by (1 + 0.08 × additional champions). No speed, size, resistance, or animation changes. At each increase in the encounter's peak concurrent population, add the extra maximum health to current health, preserving damage already dealt. No difficulty reduction on departure and no extra healing on a reconnect or replacement that does not exceed that population peak.

Graveclaw: 320 health solo, 512 with two, 896 with four, 1,664 with eight. Damage multipliers: 1.00, 1.08, 1.24, 1.56 respectively.

## Schedule and persistence

Graveclaw remains the active playtest monster. An occupied arena gets two minutes of preparation before a fresh encounter. A champion victory starts a 3,600-second cooldown at monster death. A party wipe (including all champions leaving or timing out) makes Graveclaw walk to the central crypt and burrow over four seconds; the 3,600-second cooldown begins when he disappears. No loot is created for his victory. Entry reopens after defeat or completed retreat.

If champions are already waiting during cooldown, preparation and its Discord announcement start at 58 minutes, with spawn at 60 minutes. If the arena is empty, it never spawns. The first new arrival gets a full two minutes, so joining at minute 59 means spawn at minute 61. Additional arrivals do not extend preparation. A temporary disconnect preserves the countdown and schedule occupancy during the existing 12-second reconnect grace. Resuming that session or admitting another champion during the grace cannot extend preparation. If the last champion explicitly leaves or its reconnect grace expires before spawn, preparation is cancelled and any pending warning expires. The next arrival gets a fresh two minutes; an existing one-hour post-fight cooldown still applies. Leaving during an active encounter instead follows the existing retreat rules. The in-arena top-center bar counts down the server deadline and switches to the monster's current/scaled maximum health during the fight. A fight has no time limit, and joining cannot reset an active boss. Existing authenticated sessions have the normal disconnect grace to resume; new admissions are rejected both by the room and the Firestore admission transaction.

The strike dummy remains during preparation, disappears at spawn, and returns after defeat or completed retreat. Graveclaw emerges from a stone crypt in the center over six seconds before attacking. Entry is already locked during this entrance. The worker keeps running while an empty party's boss returns; recovery of an expired worker resolves abandoned encounters without loot rather than leaving the lobby permanently locked.

Live occupancy is included in the existing five-second worker lease renewal; chat and movement do not add database writes. The worker polls the inactive schedule every 15 seconds, or once per second when due; the minute scheduler also checks it. Transactions fence worker ownership and prevent duplicate spawns. A two-minute Discord warning is queued when the occupied arena reaches the warning window, including an immediate preparation notice for an overdue first arrival. Notices are deduplicated by deadline. Previously earned rewards are preserved when a future spawn is delayed.

Schedule: `arenaPrivate/monster-schedule-{appId}-{roomId}`. Encounter identifiers now use spawn epoch seconds rather than UTC-hour buckets; existing numeric IDs and loot claims remain valid. Keep the legacy `hour` field name in reward rows/contract arguments for compatibility; it is an encounter identifier, not a clock-hour requirement.

## Discord

The production `ARENA_DISCORD_WEBHOOK` is stored in Google Secret Manager and bound to `arenaRewards` and `arenaNotifications`. The arena reward service account has access to that secret. Configuration was deployed and the webhook validated on September 27, 2026. To change the channel, update the secret and redeploy both functions. No fallback to marketplace or retired Depths channels; deployments without the secret do not post notifications.

Events: monster spawn (entry closed), two-minute warning, boss victory/return to grave, defeat with qualified-champion count and next-spawn time, confirmed wallet payout with amount, asset name/ID, abbreviated wallet, and transaction link. Reward messages are queued only after confirmed transfer, never at allocation or saved-claim creation. No mass mentions. Durable event IDs, delivery leases, acknowledgement and retry prevent normal duplicates. Discord has no transaction shared with Firestore: a crash after Discord accepts a message but before acknowledgement is persisted can still duplicate that message. Gameplay and payouts never wait for Discord. Stale spawn/defeat messages expire after ten minutes; warning messages expire at spawn time. Pending reward messages remain deliverable.

Graveclaw warning, spawn, defeat and boss-victory announcements each attach their own PNG
rendered from the actual game model. The four renders are bundled in
`lib/arena/graveclaw-announcement-art.json`, so delivery needs no external
image fetch. Reward receipts remain text-only with the compact TransactionId
link. All messages retain mention suppression and suppressed link embeds; the
image is a direct multipart attachment, using Discord's
[file upload format](https://discord.com/developers/docs/reference#uploading-files).
Other monsters never receive Graveclaw artwork.

Regenerate after a model change with `node scripts/render-graveclaw-announcement.cjs`,
then `node scripts/build-arena-economy.cjs`. Deploy **both** `arenaNotifications`
and `arenaRewards` (the retry scheduler), plus Hosting for the public render.
The notification tests round-trip the real multipart request, compare attachment
bytes, and check retries, duplicate suppression, and text-only reward messages.

Outbox: `arenaPrivate/notifications/events`; browser reads/writes denied by existing rules. Do not place webhook URLs in public code, logs, documentation, or browser environment variables. Implementation follows Discord's [webhook API](https://discord.com/developers/docs/resources/webhook).

## Verification

`tests/arena-encounter-rules.test.cjs`: participation, cancelled heals, scaling, reconnect/replacement, spawn population, PvP, stable recipients, one-hour timing, empty-room/restart schedule, migration, notification retries/formatting.

`scripts/test-arena-multiplayer-loot.cjs`: four actual local WebSocket clients, shared monster, three qualifying wallets, idle exclusion, three personal drops and pickups, PvP kill without reward. Uses fixture positions/health, mock Firestore and inventory; no blockchain funds move.

`scripts/test-arena-realtime-browser.cjs`: real Chromium clients in groups of 1/4/8 with 50/100/200 ms simulated RTT, movement, combos, peer replication, reconnect and bounded persistence. These tests establish local multiplayer correctness, not production load capacity or a live mainnet payout test.


## Arena chat

Press Enter to open the composer, Enter to send, Escape to cancel. Movement and attack inputs are suppressed while typing. Authenticated live WebSocket sessions broadcast messages with server-supplied champion identity. Text is rendered as text, never HTML. Each message is limited to 180 characters; three messages may burst, replenishing one message every two seconds. A speech bubble lasts seven seconds. The bottom-left history retains the latest 60 room messages and is restored on session reconnect. Chat is ephemeral and resets when the room shuts down; no chat content is written to Firestore, Discord, or the blockchain. It does not qualify a champion for loot. The legacy REST emergency fallback has no chat composer.

### Event-specific Discord artwork

Warning, spawn, defeat, and boss-victory notices each attach a different 1200 × 675 PNG rendered from the actual Graveclaw model and arena: a spectral warning over the sealed crypt, raised claws above the open crypt, the fallen monster beside the Dark Coin loot marker, and a rear view of the monster descending into his grave. Reward receipts remain text-only. The exact event selects the filename, accessibility description, and bundled image bytes; retries reuse the same asset. Link embeds and mentions stay suppressed.

Regenerate all four with `node scripts/render-graveclaw-announcement.cjs`; the scene source is `scripts/graveclaw-announcement-scene.js`. This updates the public PNGs and `lib/arena/graveclaw-announcement-art.json`. Rebuild `scripts/build-arena-economy.cjs`, deploy `arenaRewards` and `arenaNotifications`, and publish Hosting for the public artwork. Images are bundled with the sender, so Discord delivery does not depend on downloading them from Hosting.
