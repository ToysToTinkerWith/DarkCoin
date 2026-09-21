# DarkCoin website and 3D asset recovery

This backup preserves the website source, the current playground runtime assets, and the editable 3D production files available on September 21, 2026. It is a public backup in `ToysToTinkerWith/DarkCoin`.

## What to save

Keep access to the GitHub account and the release **Website and playground recovery — 2026-09-21**. The `backup/website-and-playground-2026-09-21` branch contains the website snapshot. The corresponding release contains the large source-asset archives, `manifest.json`, and `backup-index.json`.

The website checkout includes `public/arena/playground`: models, textures, motion data, previews, and browser assets. The asset release additionally preserves Blender sources and backups, GLB exports, earlier modelling revisions, reference artwork, rig/animation data, and the scripts stored beside them. Identical files are stored once and restored to every recorded path.

Older ZIP bundles are inspected rather than stored again in full. Their member lists and hashes are recorded in `manifest.json` under `originalArchives`. Files found only in a ZIP are preserved under `recovered-archive-assets/`. This preserves unique work without uploading redundant bundles. Rebuilt ZIP containers need not have the same binary hash as the old ZIP.

## Restore the website

```sh
git clone --branch backup/website-and-playground-2026-09-21 https://github.com/ToysToTinkerWith/DarkCoin.git
cd DarkCoin
npm ci
```

Use Node.js 24, matching the production server runtime. Copy `.env.example` to `.env` and `functions/.env.example` to `functions/.env`, then fill the required configuration from your secure records. Some features also require Firebase Secret Manager secrets and access to the existing Firebase/Google Cloud project.

```sh
npm run dev
```

The site can use the checked-in runtime 3D assets immediately; Blender is not required to display them. To prepare a production build, use `npm run build` and `npm run copy-next`. Deployment is separate from restoration; review `docs/arena-realtime-operations.md` before changing live services.

## Restore the editable assets

Download `manifest.json` and `backup-index.json` from the recovery release. The index contains the download URLs and checksums for all archive parts. Python 3.11 or newer is sufficient; the restore tool uses only its standard library.

From the restored checkout, run:

```sh
python scripts/restore_playground_backup.py --manifest manifest.json --index backup-index.json --destination .
```

The tool downloads one archive at a time, checks its SHA-256, checks each restored file, and writes the original relative paths. It refuses to overwrite a different existing file. Use an empty destination for a full recovery, or point it at the fresh website checkout; matching files are accepted.

To verify downloaded content without retaining restored files:

```sh
python scripts/restore_playground_backup.py --manifest manifest.json --index backup-index.json --destination restore-check --verify-only
```

To restore only the latest head work, for example:

```sh
python scripts/restore_playground_backup.py --manifest manifest.json --index backup-index.json --destination . --include output/champion-heads-v57/
```

The current source sets include heads v57, armour v54, magic v58, extras v59, skins v60, and the shared body/weapon/animation sources referenced by `scripts/prepare-playground-assets.py`. Earlier versions are preserved too. Blender 5.2 was installed on the original machine. Open the `.blend` sources to edit models. Review individual asset READMEs and script imports before regenerating: some older scripts contain original Windows paths that must be adjusted. The exported GLB assets are directly usable without rebuilding.

Allow ample disk space for recovery: duplicate files expand back into their original version folders. The backup index reports the total restored size. Temporary space is also needed for one archive and its largest extracted object.

## Credentials and live data

Environment files, wallet recovery phrases, private keys, service-account credentials, local logs, installed dependencies, and build caches are excluded. Legacy scripts containing literal wallet mnemonics are sanitized in this snapshot to read environment variables. The original working files on the source computer are not changed. Store wallet recovery material separately in a secure offline backup; this public repository must never contain it.

This is a code and local-asset backup, not an export of Firestore, Firebase Storage, Cloud Run state, Secret Manager, or wallet keys. Existing cloud data remains in the existing project and requires continued account access. Other dynamically loaded NFT images may still rely on their original network locations. The locally created playground assets and original trait references included in the manifest are preserved in this release.

## Integrity and scope

`manifest.json` maps file paths to sizes and SHA-256 hashes. `backup-index.json` maps unique objects to downloadable archives and records each archive checksum. The restore tool validates both layers. The website snapshot has its own `backups/2026-09-21/website-manifest.json` for file verification. Keep the release tag intact and make another dated snapshot after future changes; this backup is not an automatic recurring service.
