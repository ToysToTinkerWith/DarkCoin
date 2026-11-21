# Market release

Shuffle files and contract methods are preserved. The market overview and navigation hide shuffle, and `next.config.js` temporarily redirects `/market/shuffle` to `/market`. Remove that redirect and restore the navigation entry when releasing shuffle.

Listings use `/market/listing/<creation-transaction-id>`. The server follows confirmed `listAsset`, `buyAsset`, and `removeListing` calls to retain the same URL after partial purchases and show sold/removed listings. Stalls use `/market/stall/<seller-address>` and are public without connecting a wallet. Purchases check the current box with algod before signing; the indexer can take a few seconds to reflect a new listing.

## Discord configuration

These server-only variables are configured in the ignored root `.env` for local Next.js and `functions/.env` for Firebase:

- `MARKET_LISTINGS_WEBHOOK`
- `MARKET_SALES_WEBHOOK`
- `MARKET_ANNOUNCEMENTS_START_TIME` (ISO timestamp; events before this are not posted)

Never add these webhook values to `next.config.js`'s `env` object or a `NEXT_PUBLIC_` variable. Announcement links use `https://dark-coin.com`.

`/api/market/announce` accepts only a transaction ID and verifies it against the market's confirmed on-chain history. Artwork and prices come from Algorand asset metadata. New listings and sales post to their respective channels. Removals do not post. Firestore `marketAnnouncements` tracks delivery, concurrent-send leases, and retry times. No webhook secrets are stored in Firestore or returned to browsers.

The Firebase `marketAnnouncements` scheduled function runs every minute. It resumes from a Firestore cursor, catches events missed when the browser closes, and retries Discord errors and rate limits. Set the start timestamp to the desired release time before the first deployment if historical development events should be excluded. The scheduler and Firestore are required for durable retries. As with any external webhook without an idempotency key, a process crash after Discord accepts a post but before Firestore records it can result in a duplicate on retry.

### Announcement presentation

Listing announcements omit total listed value. The icon-enabled embed author row shows the payment currency beside `Price: <amount> <unit>` for a single whole display unit, or `Price per unit: <amount> <unit>` otherwise. For sales this label uses the quantity listed before the purchase, not merely the quantity purchased; sale totals remain visible. The main image still shows the listed asset, and the description identifies new listings or confirmed sales.

ALGO uses Tinyman's PNG icon and Dark Coin uses the site's PNG logo. Other payment assets use their public artwork, falling back to the Tinyman asset-icon URL when metadata is missing or points to an unsupported format. Third-party artwork availability is not guaranteed. The price uses the [embed author icon](https://docs.discord.com/developers/resources/message#embed-object) because ordinary embed fields cannot display an arbitrary inline image. No Discord emoji IDs or bot permissions are needed. These template changes apply to future announcements after deployment; previously posted messages are not edited.

## Release checks

Run `node --test tests/market.test.cjs` and `npm run build`. Deploy through the existing `npm run deploy` flow so the updated Next.js pages, API routes, environment, and scheduled function are released together. No contract update is required for these changes.

The current contract prices each atomic asset unit. The sell form accepts a price per whole display unit and requires that price to divide exactly across the asset's atomic units. Unsupported precision is rejected before signing.

Discord payloads follow the official [webhook execution API](https://docs.discord.com/developers/resources/webhook#execute-webhook) and [embed format](https://docs.discord.com/developers/resources/message#embed-object), including `wait=true`, non-interactive link buttons, and disabled mentions. The retry worker follows Firebase's [scheduled functions API](https://firebase.google.com/docs/functions/schedule-functions).
