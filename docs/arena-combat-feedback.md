# Arena combat feedback

Damage numbers, weapon trails, damaging spell effects and projectiles use the shared `DAMAGE_PALETTE` in `arenaBalanceV1.js`. Each number also names its damage type so recognition does not depend on color alone. Healing remains green and prefixed with +.

| Type | Color | Weapons / spells |
| --- | --- | --- |
| Blunt | Sand `#e6b777` | Shield, Wooden Club, unarmed |
| Slashing | Rose `#ff7898` | Dual Katana, Executioner Axe, Scythe, Sickle, Ske'tonian Sword, Rusty Sword, Hedge-Knight Sword, Blood-Shards |
| Piercing | Ivory `#e8eefb` | Spear, Elf Bow |
| Fire | Orange `#ff9248` | Dragon Longsword, Dragon Staff, Fire Wings, Fire Magic, Ember Burst |
| Frost | Cyan `#7eedff` | Arctic Dual Katana, Ice Daggers, Frost Spark |
| Lightning | Yellow `#f7e85b` | Lightning Staff, Lightning Magic |
| Water | Blue `#599eff` | Trident, Water Magic |
| Poison | Lime `#96e26f` | Snake Wings, Chameleon Wings, Poison Cloud |
| Shadow | Violet `#b28bff` | Dark Sword, Dark Magic |
| Arcane | Orchid `#f3a0ee` | Elder Wings, Arcane Dart |

Normal hits now use substantially larger outlined digits. Critical hits are another 30% larger, have a CRITICAL banner and persist slightly longer, while retaining the damage color. Hits on one target stagger across three lanes. They hold opacity before fading; resources are disposed on expiry and the label count is bounded.

Periodic damage is grouped independently by target and damage type, emitting a total roughly once per second and flushing any remainder when that type expires or the target dies. Mixing burn, bleed and poison never assigns the combined amount a single misleading color. This changes feedback only, not actual damage, proc or critical rules.

Applied effects use a dark icon-and-stack badge with a colored duration bar. A brief border highlight signals applications and refreshes. There is one persistent row per champion/monster/dummy, with up to three badges per row, facing the camera. Existing textures are repainted rather than recreated each frame. The player's HUD uses matching larger icons and counts. On joining mid-effect the duration bar begins from the remaining observed lifetime.

## Verification

- `node --test tests/arena-damage-feedback.test.cjs tests/arena-skills.test.cjs tests/arena-status-stacks.test.cjs tests/arena-combat.test.cjs tests/arena-connected-api.test.cjs tests/arena-realtime.test.cjs`
- `node scripts/test-combat-feedback.cjs` renders actual champion, Graveclaw and dummy assets, verifies all ten colors, critical sizing, status refresh/expiry, texture reuse and desktop/mobile rendering.
- `node scripts/test-status-icons-browser.cjs` verifies all nine icons and stack behavior.
- `$env:ARENA_SKILLS_QA='true'; node scripts/test-champion-preview.cjs` checks old and new branches, saved ranks, stats, refunds and entry payloads.

Deploy both the realtime worker and admission API with the website: new skills and periodic-event grouping are authoritative server changes. No contract update is required.

## Production rollout — September 25, 2026

- Worker revision: `arena-realtime-00016-z8n`, image digest `sha256:ef73e4a6dbb1a248aa8d619c2f701d0afda2498f821f8fe272610bbe4f5190cd`.
- Normal WebSocket authority reactivated after the deployment drain; a public WebSocket upgrade succeeded without joining a champion.
- 45 server checks passed, plus desktop/mobile skill-tree, combat-number and effect-badge browser checks.
- Web build `45DCs8xPz44E6uAjldJmM`, `nextServer`, `arenaCombat` and hosting deployed successfully. The live playground returned this build and its bundle contained all four new paths.
- A read-only production champion lookup preserved 239 XP, level 2 and two points. No champion was entered or transaction sent for this check.
