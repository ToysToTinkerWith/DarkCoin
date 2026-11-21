# Armoury names and effect glossary

The armoury distinguishes disconnected, loading, failed-load and empty-champion states. Its connect button opens the existing wallet connector. The trait swap controls are below trait selectors; the 3D preview toggle follows them in document flow.

Champion display names are 2–48 Unicode characters, stored by NFT asset ID in server-only `arenaPrivate/champion-name-{id}` documents. Original asset names remain available as `originalName`; on-chain metadata and NFT image derivation retain that original name. The owner can rename the champion below its armoury image. Wallet rosters, shared NFT details, market asset cards, 3D inspection and server admission use the saved name. Arena participants receive the name on their next entry. Historical battle logs retain their recorded names.

A rename uses an expired, zero-fee self-payment as an off-chain signature proof. It is never broadcast. The signed note binds the exact NFT, new name and one-time nonce. The server checks current NFT ownership and the account’s authorized/rekeyed signer, then atomically consumes the proof while storing the name. Replays, different signatures and expired requests fail. Entry to the arena still does not ask for a signature. Names are application display labels; they do not alter the NFT’s immutable asset name.

`lib/effect-glossary.js` centralizes combat terminology. Main descriptions use keyboard-focusable terms; the app-wide highlighter covers dynamically rendered text using paint-only CSS Highlight ranges without modifying React text nodes. Tooltips support hover, focus, tap and Escape; inputs and name editors are excluded. Legacy turn-based-only effects are labeled as such. Browsers without the CSS Highlight API still support explicitly rendered terms in trait and attack descriptions.

CSS API reference: https://developer.mozilla.org/en-US/docs/Web/API/CSS_Custom_Highlight_API

Production verification: September 28, 2026 (Pacific), build p1g5ytpjcbtV3QImhEGt-. Deployed nextServer and hosting; arenaCombat was updated with the authoritative display-name lookup in the preceding release. Live verification passed for the build, preview assets, glossary markers, styles, and public name lookup. A read-only browser check confirmed the connect prompt opens the existing wallet selector, with no mobile overflow or JavaScript errors. No real wallet rename or blockchain transaction was performed during verification.
