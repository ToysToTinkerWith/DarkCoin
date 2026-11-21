# Arena skill tree

Champion previews have a separate **Skill tree** tab. The original XP is read
from mainnet application **1870514811**, using the 10-byte box key
`uint64 big-endian champion asset ID + ASCII xp`. Only a genuine missing box
means zero XP. Service failures and malformed boxes block loading rather than
resetting a champion's level. The code never writes the XP or legacy points box.

The old progression is preserved: level = `floor(sqrt(XP / 100)) + 1`.
Thresholds are 0, 100, 400, 900, 1600, 2500… XP. As in the old allocation UI,
the budget is one point per level, including the first point at level 1.
The uint64 XP value stays a decimal string and is evaluated with BigInt.

## Branches

Every skill has three ranks. Each rank costs one point. Tier two requires two
ranks in tier one; tier three requires two ranks in tier two. Refunds are free,
including automatic refunds of dependent skills when their prerequisite falls
below two ranks. Resetting the tree restores the full point budget.

| Branch | First skill, per rank | Second skill, per rank | Third skill, per rank |
| --- | --- | --- | --- |
| Warrior | Force: +3% weapon power | Tempo: +2% attack haste | Precision: +1 percentage point critical chance |
| Guardian | Vitality: +8 HP | Guard: +2 blunt/slashing/piercing resistance | Resolve: +3% tenacity |
| Ranger | Endurance: +6 stamina | Recovery: +3% stamina recovery | Footwork: +1% movement speed |
| Arcanist | Attunement: +3% magic power | Channeling: +2% casting speed | Clarity: +2% magic cooldown reduction |
| Duelist | Deadly Edge: +0.06x critical multiplier | Composure: +3% critical bonus protection | Blade Mastery: +2% weapon power |
| Spellbreaker | Elemental Ward: +3 fire/frost/lightning resistance | Mystic Ward: +3 water/poison/shadow/arcane resistance | Unbroken: +3% tenacity |
| Reaver | Ferocity: +2% universal power | Keen Instinct: +1 percentage point critical chance | Devastation: +0.04x critical multiplier |
| Pathfinder | Economy of Motion: +3% sprint efficiency | Second Wind: +2% stamina recovery | Deep Reserves: +4 maximum stamina |

The eight branches have 24 skills and 72 purchasable ranks. Existing saved builds remain valid; the save format is unchanged. Points beyond a fully ranked tree remain
unspent for future expansion. Gear, skills and temporary effects use the existing
stat caps; the combined power cap also remains in effect. No XP earning or
loot payout rules change. Stats and individual skill contributions appear in
Overview/All stats, and preview attack/cast timing uses the same bonuses.

## Persistence and authority

The current save scope is **this browser, per champion NFT**, not across devices.
`darkcoin:arena-skills:v1:<assetId>` stores ranks in localStorage on every change.
The UI explicitly labels this scope and reports storage failures. Clearing site
data clears builds, never XP. Broken or newly unaffordable saves show a notice
and use an empty tree until the player reallocates. Wallet entry remains unsigned.

The admission API freshly reads ownership, traits and XP, validates each rank,
prerequisite and total, and signs only the validated ranks in the existing
short-lived admission ticket. Client-supplied XP, levels or stat totals are not
accepted. The authoritative worker recomputes stats from that champion; its
profile cache distinguishes skills and XP as well as equipment. Builds are fixed
for a session: leave and re-enter to apply changes. Nothing is written to another
wallet's shared preferences via the unauthenticated connected-address flow.

## Verification and deployment

- `node --test tests/arena-skills.test.cjs tests/arena-connected-api.test.cjs tests/arena-combat.test.cjs tests/arena-realtime.test.cjs`
- PowerShell: `$env:ARENA_SKILLS_QA='true'`; then `node scripts/test-champion-preview.cjs`.
- Build both `scripts/build-arena-server.cjs` and `scripts/build-arena-realtime.cjs`.
- Deploy the updated realtime worker using the normal drain/restart/reactivate
  procedure, then deploy `arenaCombat`, `nextServer`, and hosting. Updating only
  the web preview would leave the authority on the old stat calculation.

No Algorand application update or wallet transaction is needed for this feature.

## Production verification — September 25, 2026 UTC

- Web build: `3o4moPp1C8-BCD3dpRoVL`; `nextServer`, `arenaCombat` and hosting deployed.
- Worker revision: `arena-realtime-00015-tzc`; normal room authority reactivated after the deployment drain.
- Real champion 1559026795 returned its original 239 XP, level 2 and two points through the production preview API.
- A request attempting three Vitality ranks with forged client XP was rejected before entry. No real player was joined and no Algorand transaction was sent for verification.
- 33 relevant server checks and the desktop/mobile skill-tree checks passed. The full existing preview regression passed, including 3D attacks/spells, stat bars, camera interaction, retry flows and unsigned entry.
