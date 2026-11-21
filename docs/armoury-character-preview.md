# Armory character preview

On `/arena/armory`, select a champion and choose **Arena 3D** or **Chronicles 2D** below the trait swap controls. Both panels use the site's black-and-silver controls and serif headings through the scoped `armoury-build.css` stylesheet. Default swap behavior is unchanged; 3D rendering and trait effect cards are opt-in. Hiding the preview unmounts both renderers and disposes their graphics resources.

`Swapper.js` passes its current equipped objects and pending selections to `ArmouryCharacterPreview`. `armoury-preview-data.js` resolves these into the same model IDs used in the playground. A change value of `None` keeps the equipped trait; `Remove` clears the slot. NFT metadata must never overwrite this draft loadout.

The preview reuses the playground's idle renderer, attack/combo and hitbox playback, stat bars, contribution notes, attack cards, and trait abilities. Models can be dragged to orbit or panned; mouse-wheel zoom is disabled. The progression endpoint supplies only champion XP/level; locally saved arena skills are validated against that XP and included in the stats. Failure to load progression leaves equipment stats available with a notice.

The 3D preview does not generate legacy character objects, enter the arena, or save traits. The existing Trait Swap action is still required to update the NFT. The two panels are mutually exclusive, and each has its own champion name. Renaming uses a signed ownership proof for that game; it does not change the NFT name. Compact edit and playback buttons have accessible names and hover titles. Shared Arena components retain their original controls outside the Armory.

## Classic 2D generation

The 2D panel has a **Generate 2D character · 10,000 DARK** button. It sends the original three-move build, stat/effect points and chosen name. The server verifies champion ownership and requires selections to match equipped traits before preparing any payment, because the unchanged standalone listener reads the NFT's equipment and artwork. Apply pending Trait Swaps first. The skin comes from the champion NFT, and generation itself does not modify NFT equipment.

`/api/arena/legacy-generation` prepares a single 10,000 DARK payment bound to that immutable build. New prepared requests pin `generationQueue: queuedChars`. After confirmation, the API atomically records the payment, creates `queuedChars/{paymentTxnId}`, and initializes the character's progress record. This is the collection watched by the user's existing, unchanged standalone listener on a separate computer. No listener replacement or new process is required. Its existing progress writes to `chars/{champId}object` feed the Armory's progress display.

The worker envelope includes the verified champion ID, name (`randomName: false`), all seven trait properties and trait asset IDs, three fully specified moves, ten stat points, six effect points, and the confirmed payment ID, sender, receiver, asset, amount, round and note. Payment fields use chain data, never client-supplied hints. `assetConfigTxId` is intentionally null: this single-payment flow does not reconfigure the NFT. The existing listener supports direct queue pickup using `champId` / `configTargetAssetId`, `paymentTxnId`, and `generationBuild`; it looks up NFT metadata itself rather than consuming the supplied trait snapshot. Avoid changing equipped traits again while a paid generation is pending.

Compatibility: requests prepared before this queue change (without `generationQueue`) remain on `legacyGenerationJobs`, consumed by the existing Cloud Run worker. Already-queued retries return the existing receipt without enqueueing again, even after a listener deletes the completed queue item. No payment is sent to both consumers. Do not copy historical cloud jobs into `queuedChars`: they may already have completed or still be running.

The Armory follows `chars/{champId}object` for queued, processing, completed and failure states in both builder views. The generation button remains visible and disabled while queued or running, with the worker's stage and percentage beside it (stacked on narrow screens). The queue receipt immediately replaces any previous completion; a late receipt never resets an already-arrived live snapshot for the same job. Wallet/payment preparation uses an indeterminate bar, not a made-up percentage. A queued job waits until the standalone listener is online and available. Completion shows 100%, and the existing character remains visible during generation. A failure preserves the payment and displays a support warning; it is not a reason to charge again.

Rollout: leave the user's existing standalone listener running on its separate computer. Deploy only the updated Next server and hosting to route new Armory purchases to it. Keep `LEGACY_GENERATION_ENABLED=true` only when the listener is running. No listener, contract or Firestore-rule change is required. Keep the existing Cloud Run worker available for pre-rollout purchases; new purchases do not trigger it.

The website prevents duplicate dispatch for the same payment, but does not change the standalone listener's concurrency or retry behavior. Run only one copy of that listener; it has no cross-process claim lock. A listener failure needs investigation on its computer; never create another payment just to retry a paid build.

For a read-only worker check, execute the Cloud Run job with `GENERATION_HEALTHCHECK=1`. This verifies Firestore reads and real trait compositing without payment or AI calls. Do not leave this override on the job template. A failed paid build keeps its payment record; inspect the job and character error before retrying. Never ask the user to pay again merely because queueing or generation failed.

Verification:

- `node --test tests/armoury-preview.test.cjs`: draft overrides, removals/reversions, shared trait definitions.
- `node scripts/test-armoury-preview.cjs`: real local 3D rendering with mocked wallet/network, draft changes, effect cards, canvas pixel checks, playback/orbit controls, desktop/390px/320px layout, hide/dispose, no signing or mutation.
- `node scripts/test-armoury-swap.cjs`: existing transaction flow, cancellation, opt-ins, group limit, and metadata failure regression tests.
- `node scripts/verify-armoury-preview-production.cjs`: deployed build, feature chunks, renderer, and styles; no wallet connected.
- `node --test tests/legacy-generation.test.cjs tests/legacy-generation-status.test.cjs tests/champion-names.test.cjs`: exact payment validation, queue-route compatibility, idempotent dispatch, rejection of unsaved swaps before payment, progress, and separate game names.
- `node scripts/test-legacy-armoury-browser.cjs`: themed generation button, point controls, draft selections, wallet cancellation, paid-request retry, live job status, separate name editors and desktop/390px/320px button fit.
