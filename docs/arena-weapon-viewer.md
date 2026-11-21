# Weapon animation viewer

Public page: `/arena/weapons`, with optional `?weapon=dragon_longsword` (any current weapon ID, or `unarmed`). It requires no wallet connection or arena entry. A link is also available in the armoury's expanded character preview.

The viewer uses the playground character renderer and `ChampionAttackPlayback`. First attack, second attack, and full combo are playback filters only; they do not modify combat timing, rigging, balance, or the authoritative server. Second-only playback begins at the authored follow-up pose. Isolated sequences suppress the other attack's hitboxes and projectile. Existing champion previews retain their default full combo playback.

Damage cards read `WEAPONS`, `WEAPON_FOLLOWUPS`, and `weaponCombo` directly. Effects use `potentStatus`, showing each weapon's actual per-hit chance and potency-scaled magnitude/duration. Damage ranges are raw dice totals, before gear, skills, criticals, and target resistance. Conditional/passive weapon perks appear separately from on-hit statuses.

Controls: select weapon, previous/next, first/second/combo, pause/play, replay, and 0.35×/0.65×/1× speed. Drag to orbit and right-drag to pan; wheel zoom remains disabled. Reduced-motion preference starts playback paused.

Verification:

- `node --test tests/champion-attack-playback.test.cjs tests/arena-weapon-combos.test.cjs`
- Build/start the site on port 8850, then `node scripts/test-weapon-viewer.cjs`. The browser test exercises every weapon and fists, both attacks, hitboxes, damage/effects, pause/replay, orbit, and mobile layout.
- Set `WEAPON_VIEWER_URL` to a deployed origin and `WEAPON_VIEWER_SMOKE=1` for a smaller production browser check. These tests do not connect a wallet, sign transactions, or enter the game.
