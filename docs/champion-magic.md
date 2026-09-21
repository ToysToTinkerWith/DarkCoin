# Champion magic — V58

All seven magic traits from https://dark-coin.com/arena/traits are included:
Dark Magic, Fire Magic, Lightning Magic, Water Magic, Ice Daggers, Poison Cloud
and Blood-Shards. The local interactive comparison is
`/arena/playground/magic-preview.html`.

The effects' centres are 0.28 metres above and 0.28 metres forward of their
shoulder sockets, with another 0.09 metres outward for clearance. Fire, water,
lightning and poison preserve the two-sided arrangement of their source art.
Dark Magic, Ice Daggers and Blood-Shards appear on the viewer's right shoulder.
The projectile groups retain four projectiles each. Their origin/bind pose uses
the C5 champion standard; every vertex follows the chest rigidly, independently
of weapon grips. An equipped NFT's Magic trait loads automatically in the arena.

The models have closed front, side and rear geometry. Fire, water, poison and
blood use the source silhouette and pigment with a rounded three-dimensional
signed-distance reconstruction. Thin tips taper in depth, and holes remain open.
The cloud ends cropped by the source artwork are completed with rounded billows.
Ice uses separately sculpted faceted shards. Dark Magic and lightning use solid
cores, orbit tubes and electrical branches. Rear shapes and colour continuation
are inferred from the single available illustration. These are static magic
accessories that follow movement, not new spell attack animations.

Editable Blender files and standalone/rigged GLBs are in
`output/champion-magic-v58/models`. Standalone means no armature; coordinates
still preserve champion placement. Portable GLBs use unlit vertex colours so
their illustrated palette does not depend on a game's lighting.

Rebuild:

1. `node scripts/fetch-magic-references.cjs` downloads the public original PNGs.
2. `python scripts/reconstruct-magic-volumes.py` reconstructs volumetric surfaces.
3. Blender: `--background --python-exit-code 1 --python scripts/build-magic-assets.py`.
4. `python scripts/publish-magic-assets.py` updates the local runtime assets.
5. `node scripts/bundle-magic-preview.cjs` bundles the comparison viewer.
6. `node scripts/test-magic-assets.cjs` validates 14 GLBs, weights, offsets and
   attachment stability through four gaits and weapon actions.
7. With the local app on port 3011, `node scripts/test-magic-browser.cjs` checks
   all seven choices, four viewing angles, isolation and mobile layout.

`scripts/render-magic-assets.py` additionally produces six native views per
trait. Scripts require the same Blender/Python/Three tooling as the champion
asset pipeline. All changes remain local until the website is deployed.
