# Council Discord proposal discussions

## One thread per proposal in the existing channel

The configured production mode creates a public thread for each **confirmed v3
proposal**, inside the existing Council Discord channel. The parent receives one
linked starter message per proposal; its thread holds the original text,
attachment links, exact proposed actions, voting deadline, thresholds and the
proposal link. A forum parent creates a proposal forum post instead. A separate
guild-channel mode remains available when explicitly configured.

Confirmed votes, ballot changes, accepted/rejected
results, treasury execution, deposit returns and operator implementation reports
are delivered to that proposal's thread. The bot reopens archived unlocked
threads for verified updates. Moderator-locked threads remain queued; the bot
does not override a moderator's lock.

Configuration is server-side:

```text
COUNCIL_DISCORD_ENABLED=true
COUNCIL_DISCORD_GUILD_ID=<server ID>
COUNCIL_DISCORD_DISCUSSION_MODE=thread
COUNCIL_DISCORD_PARENT_CHANNEL_ID=<existing proposals channel ID>
COUNCIL_DISCORD_PIN_DETAILS=true
COUNCIL_DISCORD_START_ROUND=67113001
```

`COUNCIL_DISCORD_BOT_TOKEN` belongs in Secret Manager. Only the Discord worker
functions bind it; it never belongs in a `NEXT_PUBLIC_*` setting or Next.js
public configuration. The web server only verifies confirmed receipts and queues
them; it has no Discord bot credential.

For threads, the bot needs **View Channel, Send Messages, Create Public Threads,
Send Messages in Threads, Embed Links, and Read Message History** in the parent.
The installation URL also includes Attach Files. **Pin Messages** is optional
but needed to pin the proposal summary. The bot does not need Manage Channels,
Administrator, message-content intent, member-list intent, or permission to
mention everyone. Public threads inherit visibility from their parent; the
integration does not make a private channel public.

Production is configured for **Dark Coin** (`950116008855744533`),
**DARK COIN WEB** (`1147983499022831686`) → **#proposals**
(`1573150373198299266`). Bot application ID: `1573154000189005865`.
Optional pinning is disabled. The live transport check created a labelled test
thread, delivered an update, reopened it after archival, and archived it again;
it created no governance proposal, vote or payment.

For separate text channels, set `COUNCIL_DISCORD_DISCUSSION_MODE=channel` and
optionally `COUNCIL_DISCORD_CATEGORY_ID`. That mode needs **Manage Channels**;
new channels inherit the selected category's permissions.

The current Discord API has a separate `PIN_MESSAGES` permission at bit 51 and
uses `/channels/{channel}/messages/pins/{message}` for pins. Without that
permission, details still post and a diagnostic flag records the missing pin
permission.

```text
node scripts/council-discord.cjs status
node scripts/council-discord.cjs invite BOT_APPLICATION_ID
node scripts/council-discord.cjs sync
node scripts/council-discord.cjs queue-tx CONFIRMED_TRANSACTION_ID
```

`status` only reads bot/server permissions. `invite` only prints the installation
URL. `sync` and `backfill` process confirmed on-chain history and post to Discord;
run them only for the configured server. The scheduled function repeats this
every minute. The website's `/api/council/notify` call accelerates processing
after confirmation. Notification errors never reverse a transaction or require
the user to vote/pay again.

The worker reads the Algorand indexer's confirmed transactions from the v3
activation round, maintains a durable round cursor, and ignores budget calls and
legacy proposals. A caller cannot provide arbitrary channel text or claim that
an unconfirmed proposal passed. Proposal content is reverified against the
deployed program, membership registry and on-chain hashes before delivery.

State is under `councilDiscordState`, `councilDiscordOutbox`,
`councilDiscordReceipts`, and `councilDiscordProposals`. Deny all direct client
access to these collections. The DAO API exposes only a validated discussion
URL, not the private worker state. Public implementation reports remain under
`councilProgress`; their update trigger queues a matching discussion update after
live approval verification.

Retries are durable. A message-created public thread shares its starter's ID,
so the recorded starter message prevents duplicate threads after a crashed
creation. Forum posts are reconciled through their bot-authored starter receipt;
separate channels use a deterministic topic with proposal/content identities.
Message identity is recorded
before HTTP posting. Discord nonce enforcement handles near-term repeats;
uncertain older posts are reconciled against the bot's receipt markers in
channel history before retrying. If that history cannot be fully reconciled,
delivery waits for operator review instead of blindly duplicating a message.
Rate limits and temporary failures leave pending outbox entries for retry.
Deploy `firestore:indexes` with the functions and rules; the due-event queue uses
the `events` composite index on `status` and `nextAttemptAt`.

Official API references: [channel creation](https://docs.discord.com/developers/resources/guild#create-guild-channel),
[message nonce/pins](https://docs.discord.com/developers/resources/message),
and [permission flags](https://docs.discord.com/developers/topics/permissions).
