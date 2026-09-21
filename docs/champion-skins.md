# Champion skins — V60

All nine Skin traits from https://dark-coin.com/arena/traits are available in
the local playground: Dark Skin, Tribal Dark Skin, Tribal Light Skin,
Fire Dragon, Undead, Chameleon, Light Skin, Elder Dragon and Snake.

Each model uses the accepted Undead C5 full-body sculpt, hands and ears.
The body vertex positions, original weights and equipment joints are unchanged.
All nine body meshes share the same SHA-256 geometry fingerprint. The existing
Undead appearance stays intact; its wounds are excluded from other skins.

The plain skins use reference-sampled skin tones and illustrated shading.
Tribal variants use green/red cheek dots, jaw hooks, neck stripes and shoulder
bands from the reference, with related markings extended across the back,
arms and legs. Reptiles have reference-coloured throat scutes, thin shoulder
plates, sparse curved scale details and a matching ventral/dorsal continuation.
Chameleon's green/yellow pattern uses a baked 4096-pixel texture atlas to avoid
vertex-sized jagged edges. Surface geometry sits at most 0.68 mm above the body.

Fire Dragon, Elder Dragon, Chameleon and Snake have closed, tapered 3D tails.
These emerge from the lower back and curve upward to the viewer's left,
following the source silhouette. Seven additional tail joints attach to the
pelvis; no existing skeleton joints are moved or renamed. The runtime gives
the tails a subtle travelling bend during idle and movement. This is animated
motion, not a physics or collision simulation.

The source images show the head, upper torso and part of each tail. The unseen
lower-body markings, underside and rear details are inferred extensions of the
same design. This preserves the shared equipment fit rather than changing
anatomy for individual skins. The head remains complete beneath head equipment.

`/arena/playground` automatically loads the selected champion's skin model.
`/arena/playground/skin-preview.html` provides all nine skins, source images,
front/quarter/side/back views, an upper-body closeup, equipment and movement.

Deliverables: `output/champion-skins-v60/models` contains editable Blender files
and rigged GLBs for all nine. Runtime files live in
`public/arena/playground/assets/skins`. Undead keeps using the existing base
asset in the arena to preserve its accepted appearance exactly.

Build with `scripts/fetch-skin-references.cjs`, Blender running
`scripts/build-skin-assets.py`, `scripts/publish-skin-assets.py`, and
`scripts/bundle-skin-preview.cjs`. Verify with `scripts/test-skin-assets.cjs`
and `scripts/test-skin-browser.cjs`. Package with `scripts/package-skin-assets.py`.
The asset checks validate GLBs, the identical body geometry fingerprint,
unchanged shared joint transforms, one body per character, added tail joints,
finite tail deformation, and head/armour/weapon/magic/extra loaded together.

These updates are local until the website is deployed.
