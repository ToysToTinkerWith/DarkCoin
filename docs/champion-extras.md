# Champion Extras — V59

Eight three-dimensional accessories were made from the Extra artwork on
https://dark-coin.com/arena/traits:

- Crescent Moon Earring: oval stud, interlocking gold chain and open crescent.
- Dragon Fangs Earring: two tapered curved fangs, gold settings and chain.
- Fusion Pearl Earring: open hoop, three links and a pale lavender pearl.
- Tentacle Earring: two curved grey tentacles with raised suction rims.
- Hoop Earring: a solid gold hoop with a piercing opening.
- Golden Feathers: an ear ornament following the source's long golden spine
  and pointed feather fringe.
- Battle Wound: a thin, contoured wound surface with the original red details.
- Crescent-Birthmark: a translucent crescent fitted directly onto the neck.

All left/right references are from the viewer facing the champion. Jewellery
attaches to the rear/lower lobes of both skin ears, mirrored at approximately
(±0.0947, 0.0116, 1.6262) metres in Blender coordinates (X right, Z up,
-Y forward). Golden Feathers follows both actual outer ear rims from tip to
lobe, with its feather fringe hanging below the rim. Jewellery uses
the shared C5 `head` joint and keeps its placement through movement/actions.

Both neck details are on the viewer's left, below the jaw. Each vertex was
projected onto the body surface; weights were interpolated from the skin's
triangle so the marking follows neck deformation. The maximum surface offset
is below 1 mm. The birthmark uses 30% opacity, matching the subtle source art
and allowing different skin colours to remain visible underneath.
The birthmark has been doubled again, to four times its original width and height, while
retaining its neck position and surface-following deformation.

The models have actual depth and back surfaces. Jewellery links are separate
solid geometry. Golden Feathers and the neck silhouettes use artwork-driven
volumetric reconstruction. These are static fitted accessories; chain physics
or new attacks are not included. All models use the established C5 proportions.

Local preview: `/arena/playground/extra-preview.html`. Choose a trait, orbit,
isolate it, hide the mask with Skin only, or test walking. The arena reads the
equipped Extra from the NFT metadata/Swapper E box and loads its matching model.
Changes are local until the site is deployed.

Deliverables under `output/champion-extras-v59`:

- `models`: eight editable Blender sources and standalone/rigged GLBs.
- `browser`: front, three-quarter, side, back, mask and isolated images.
- `extras-overview.png`: original artwork, 3D model and skin fitting comparison.
- `validation.json`: GLB and attachment checks for all eight traits.

Rebuild with `scripts/fetch-extra-references.cjs`,
`scripts/prepare-extra-surfaces.py`, and Blender running
`scripts/build-extra-assets.py`. Publish local assets with
`scripts/publish-extra-assets.py`, prepare the preview HTML with
`scripts/prepare-extra-preview.py`, and bundle with
`scripts/bundle-extra-preview.cjs`. Run `scripts/test-extra-assets.cjs` and
`scripts/test-extra-browser.cjs` for validation, then
`scripts/package-extra-assets.py` to produce the packages and contact sheet.
