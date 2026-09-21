# Arena playground

`/arena/playground` is an eight-player, server-authoritative practice arena.
See [combat and deployment details](arena-balance-v1.md).

## Champion inspection and entry

Click a champion card to open the 3D inspection dialog. Reading the roster or
opening the preview does not join a room. The dialog loads the actual equipped
head, skin, armour, weapon, magic and extras. The main 3D view shows the original
idle pose on its display stand. A separate live 3D view beneath the weapon name
in Overview shows the same equipped champion looping its attack at 0.65x speed,
including equipped haste. Pale red capsules follow the authoritative active
hitboxes; ranged attacks show a projectile and its collider. Each view has its
own orbit, pan, zoom and camera presets. Pause/Play affects only the attack view.
Reduced-motion preferences start the attack paused. Both views release their renderers and model resources
when closed. Mobile layouts stack the model above the statistics with a fixed
entry footer; gameplay remains designed for a keyboard and mouse.

Overview shows the key permanent stats, weapon damage dice/reach/cycle and magic
range, projectile width, cast time and cooldown. All stats exposes all 25 stats,
each with a custom SVG glyph, labelled meter, base notch, cap and explanation.
Resistance is a rating, not a percent. Trait abilities lists every equipped
trait's passive, conditional and triggered effects separately. Background traits
contribute stats even though they do not change the circular arena environment.
All values come from `arenaBalanceV1`, the same rules used by the server.

The dialog follows the main Arena's black-and-silver frames, serif headings,
seal and arena artwork. Escape/close restore focus; the background is inert and
focus is trapped while inspecting. Loading/failed metadata or models cannot
enter the arena; failures can be retried. Wallet changes clear the preview.

Enter playground sends only the connected address and NFT ID. The server
rechecks current holdings/equipment and returns a private, short-lived session.
**No transaction or signature is requested.** Public holdings checks do not prove
wallet control: a caller could supply somebody else's address. This is deliberate
for signature-free practice and must not be used for rewards or authenticated
account operations. Combat remains authoritative and session-protected.

## Controls and assets

WASD moves, Shift runs, mouse aims, right click draws/stows, left click attacks,
and E casts equipped magic. Escape pauses controls, not the multiplayer match.
A defeated champion leaves the room and can be explicitly selected again.

The runtime uses accepted V57 heads, V54 armour, V53 weapons/animations, V58
magic, V59 extras and V60 skins. All skins share the fitted body rig; tailed skins
retain their extra tail bones. Swapper boxes override ARC-69 metadata for equipped
traits. `loadCharacter` is shared by the preview and arena. No fixtures or QA
wallet overrides are shipped in the application route.

## Validation

- `node scripts/test-champion-preview.cjs`: real WebGL models with a fixture wallet,
  all 25 stats, abilities, rotation, mobile, focus/close, retries, empty slots,
  wallet changes, and explicit signature-free admission. QA screenshots live in
  `output/playground` and are clearly fixture champions.
- `node --test tests/arena-preview.test.cjs tests/playground.test.cjs tests/arena-combat.test.cjs`
- `node scripts/test-arena-firebase.cjs`: isolated live Firebase joins, session
  security, concurrent writes, combat and cleanup; no public-room impersonation.
- `node scripts/test-arena-browser.cjs`: two WebGL multiplayer clients.
- `node scripts/test-arena-page-live.cjs` and `node scripts/test-arena-deployed.cjs`:
  deployed roster, routing and assets.


## Baseline spells and item breakdown (September 17, 2026)

The preview shows each permanent item contribution directly under its stat bar.
Conditional perks and temporary buffs are not included in those permanent totals.
Caps still apply; if summed bonuses exceed a cap, the stat explains that limit.
Trait ability headers use 144px thumbnails of the original token artwork, cached
locally (104 traits) so inspecting a champion does not trigger token metadata or
Firebase Storage lookups. Regenerate with `node scripts/build-trait-thumbnails.cjs`.

Every champion can select one baseline spell in Overview. Selection is immutable
for that arena entry. **Q** uses the selected baseline spell; **E** still uses the
equipped Magic NFT spell. No Magic NFT is required for Q. Defaults to Renewing Light.
The two slots have separate cooldowns but share the weapon/casting action lock.
Only a catalog ID is sent with admission; the API validates it and includes it in
the signed server ticket. Clients cannot supply spell damage, buffs or ranges.

| Spell | Base roll | Cast / cooldown | Effect |
|---|---|---|---|
| Renewing Light | 3d6+15 healing | 0.90s / 15s | Self heal; +6% movement for 4s |
| Ironbloom | 2d8+12 healing | 1.05s / 17s | Self heal; +10 blunt, slashing and piercing resistance for 5s |
| Arcane Dart | 3d6+10 arcane | 0.70s / 9s | 9m range, 0.28m width, 12m/s |
| Frost Spark | 2d8+8 frost | 0.85s / 11s | 8m range, 0.40m width, 10m/s; 65% Chill at 0.75 potency |
| Ember Burst | 3d6+8 fire | 1.10s / 13s | Circle 3m ahead, 1.5m radius; 35% Burn at 0.75 potency per enemy |

All values live in `components/contracts/Arena/baselineSpells.js`. Baseline direct
damage and healing use ability power and the champion's critical chance/multiplier
(base 10% and 2x). Healing is capped at missing health. Buffs refresh without stacking
and obey the shared stat caps. Cast speed and cooldown reduction apply to both slots.
Cooldowns begin when casting finishes or is interrupted, including interruptions
before release. Cast-related cooldown-refund perks credit the correct slot/cast.
Spell release is at 60% of the cast. Both heals lift an arm and show rising rings,
particles, green healing numbers and a timed buff aura / HUD icon. Damage gestures
extend the arm forward. Projectiles use server-sized swept spheres. Ember Burst
locks its visible ground marker at 20% of the cast and hits each overlapping enemy
once at release; it does not follow subsequent turns. Each target gets independent
dice, critical and status-proc rolls. Its burn can stack under the existing rules.

The preview's spell animation runs the real simulation in a local isolated room;
it does not join multiplayer, modify ownership, or transfer funds. Idle and weapon
preview remain separate. The baseline choice adds survivability/control at the
cost of a shared action window: raw non-critical average healing is 25.5 or 21 HP,
and base average direct spell damage is 20.5 / 17 / 18.5. These are conservative
starting values; PvP balance still needs real playtesting.
