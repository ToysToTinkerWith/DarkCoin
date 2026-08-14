const QUEST_BG_BASE = "/arena/depths/quests";
const ARTIFACT_IMAGE_BASE = "/arena/depths/artifacts";

export const DEPTHS_CURSED_ARTIFACTS = [
  {
    id: "barbed-vow",
    name: "Barbed Vow",
    rarity: "Cursed",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/sepulcher-nail.png`,
    description: "Gain strength, but take more damage for the rest of the run.",
    statBonuses: { strength: 8 },
    artifactMeta: { damageTakenPct: 12 },
    rewardTags: ["weapon", "doom"],
  },
  {
    id: "weeping-lock",
    name: "Weeping Lock",
    rarity: "Cursed",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/sunken-locket-of-nine-tides.png`,
    description: "Gain health, but lose speed for the rest of the run.",
    statBonuses: { health: 18, speed: -7 },
    rewardTags: ["tide", "armor"],
  },
  {
    id: "rusted-halo",
    name: "Rusted Halo",
    rarity: "Cursed",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/thorn-halo.png`,
    description: "Start each room with bless, but lose resist.",
    statBonuses: { resist: -6 },
    battleOnly: [{ type: "gain_start_of_battle", effectKey: "bless", amount: 4 }],
    rewardTags: ["holy", "doom"],
  },
  {
    id: "salted-heart",
    name: "Salted Heart",
    rarity: "Cursed",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/drowned-kings-pearl.png`,
    description: "Gain nurture potency, but healing is weaker.",
    artifactMeta: { effectPotencyBonus: { nurture: 3 }, healingDonePct: -12 },
    rewardTags: ["growth", "tide"],
  },
  {
    id: "black-splinter",
    name: "Black Splinter",
    rarity: "Cursed",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/knife-that-remembers.png`,
    description: "Damage cards hit harder, but your champion loses max health.",
    statBonuses: { health: -14 },
    artifactMeta: { damageBonusFlat: 5 },
    rewardTags: ["weapon", "blood"],
  },
];

export const DEPTHS_QUESTS = [
  {
    id: "whispering-chain-market",
    world: "purple",
    title: "Whispering Chain Market",
    subtitle: "The stalls barter in promises and old scars.",
    backgroundSrc: `${QUEST_BG_BASE}/purple/whispering-chain-market.png`,
    options: [
      {
        id: "buy-from-the-last-stall",
        title: "Buy From The Last Stall",
        description: "Roll for a clean bargain. Success lets you choose an artifact. Failure binds a cursed relic.",
        check: { type: "roll", successChance: 68 },
        success: {
          title: "The bargain holds.",
          text: "The chain merchant leaves behind three relics and vanishes.",
          effects: [{ type: "artifactChoice" }],
        },
        failure: {
          title: "The price changes.",
          text: "The chain bites into your pack and leaves a cursed relic behind.",
          effects: [{ type: "cursedRelic" }],
        },
      },
      {
        id: "steal-the-hidden-tag",
        title: "Steal The Hidden Tag",
        description: "Draw a random card. Success if it is a ranged or melee card. Gain a new card, or take damage on failure.",
        check: { type: "card", label: "ranged or melee card", match: { ranges: ["ranged", "melee"] } },
        success: {
          title: "The tag comes loose.",
          text: "A stolen technique folds itself into your deck.",
          effects: [{ type: "cardChoice" }],
        },
        failure: {
          title: "The stall wakes up.",
          text: "Iron chains rake across your champion.",
          effects: [{ type: "damagePct", amount: 0.14 }],
        },
      },
      {
        id: "wear-the-market-brand",
        title: "Wear The Market Brand",
        description: "No roll. Gain speed and focus potency, but lose some resist.",
        success: {
          title: "The brand settles.",
          text: "Your champion moves quicker, though the mark thins their defenses.",
          effects: [
            {
              type: "questRelic",
              id: "market-brand",
              name: "Market Brand",
              description: "Gain speed and focus potency, but lose resist.",
              imageSrc: `${ARTIFACT_IMAGE_BASE}/nightjar-compass.png`,
              statBonuses: { speed: 5, resist: -3 },
              artifactMeta: { effectPotencyBonus: { focus: 2 } },
              rewardTags: ["speed", "crit"],
            },
          ],
        },
      },
    ],
  },
  {
    id: "violet-toll-bridge",
    world: "purple",
    title: "Violet Toll Bridge",
    subtitle: "A bridge keeper demands a memory before lowering the chains.",
    backgroundSrc: `${QUEST_BG_BASE}/purple/violet-toll-bridge.png`,
    options: [
      {
        id: "cross-without-paying",
        title: "Cross Without Paying",
        description: "Roll for a risky crossing. Success upgrades a card. Failure costs health.",
        check: { type: "roll", successChance: 56 },
        success: {
          title: "You cross cleanly.",
          text: "The bridge hums and sharpens one of your cards.",
          effects: [{ type: "cardUpgrade" }],
        },
        failure: {
          title: "The bridge twists.",
          text: "The stones buck underfoot and slam your champion into the rail.",
          effects: [{ type: "damagePct", amount: 0.18 }],
        },
      },
      {
        id: "pay-with-breath",
        title: "Pay With Breath",
        description: "No roll. Lose health now to choose a new card.",
        success: {
          title: "The toll is paid.",
          text: "The bridge exhales a card from below.",
          effects: [{ type: "damagePct", amount: 0.1 }, { type: "cardChoice" }],
        },
      },
      {
        id: "listen-to-the-gap",
        title: "Listen To The Gap",
        description: "Draw a random card. Success if it is magic. Gain intelligence, or lose speed on failure.",
        check: { type: "card", label: "magic card", match: { range: "magic" } },
        success: {
          title: "The gap speaks clearly.",
          text: "A lesson in angles settles into your champion.",
          effects: [
            {
              type: "questRelic",
              id: "gap-lesson",
              name: "Gap Lesson",
              description: "Gain intelligence.",
              imageSrc: `${ARTIFACT_IMAGE_BASE}/black-star-reliquary.png`,
              statBonuses: { intelligence: 6 },
              rewardTags: ["magic"],
            },
          ],
        },
        failure: {
          title: "The gap answers late.",
          text: "The voice steals momentum from your champion.",
          effects: [
            {
              type: "questRelic",
              id: "late-answer",
              name: "Late Answer",
              description: "Lose speed.",
              imageSrc: `${ARTIFACT_IMAGE_BASE}/widows-sundial.png`,
              statBonuses: { speed: -4 },
              rewardTags: ["slow"],
            },
          ],
        },
      },
    ],
  },
  {
    id: "glass-confessional",
    world: "purple",
    title: "Glass Confessional",
    subtitle: "Every mirror shows the card your champion fears drawing.",
    backgroundSrc: `${QUEST_BG_BASE}/purple/glass-confessional.png`,
    options: [
      {
        id: "confess-a-dead-card",
        title: "Confess A Dead Card",
        description: "Remove one card copy from your deck, including starting cards.",
        success: {
          title: "The mirror accepts the confession.",
          text: "One unwanted card can be cut from the run.",
          effects: [{ type: "removeCard" }],
        },
      },
      {
        id: "break-the-cleanest-mirror",
        title: "Break The Cleanest Mirror",
        description: "Roll for a violent blessing. Success grants bless and shield starts. Failure adds a cursed relic.",
        check: { type: "roll", successChance: 62 },
        success: {
          title: "The shards kneel.",
          text: "Mirror light guards your first steps in each room.",
          effects: [
            {
              type: "questRelic",
              id: "kneeling-shards",
              name: "Kneeling Shards",
              description: "Start each room with shield and bless.",
              imageSrc: `${ARTIFACT_IMAGE_BASE}/mirror-of-last-mercy.png`,
              battleOnly: [
                { type: "gain_start_of_battle", effectKey: "shield", amount: 5 },
                { type: "gain_start_of_battle", effectKey: "bless", amount: 3 },
              ],
              rewardTags: ["ward", "holy"],
            },
          ],
        },
        failure: {
          title: "The shards remember you.",
          text: "The mirror cuts a debt into your champion.",
          effects: [{ type: "cursedRelic" }],
        },
      },
      {
        id: "borrow-another-reflection",
        title: "Borrow Another Reflection",
        description: "Draw a random card. Success if it is a buff card. Gain healing power, or lose resist.",
        check: { type: "card", label: "buff card", match: { class: "buff" } },
        success: {
          title: "A kinder reflection follows.",
          text: "Your healing cards carry more warmth.",
          effects: [
            {
              type: "questRelic",
              id: "borrowed-reflection",
              name: "Borrowed Reflection",
              description: "Healing cards heal more.",
              imageSrc: `${ARTIFACT_IMAGE_BASE}/mercy-engine.png`,
              artifactMeta: { healingDonePct: 10 },
              rewardTags: ["holy", "growth"],
            },
          ],
        },
        failure: {
          title: "The wrong reflection answers.",
          text: "The borrowed face weakens your champion's guard.",
          effects: [
            {
              type: "questRelic",
              id: "wrong-reflection",
              name: "Wrong Reflection",
              description: "Lose resist.",
              imageSrc: `${ARTIFACT_IMAGE_BASE}/laughing-mask.png`,
              statBonuses: { resist: -5 },
              rewardTags: ["curse"],
            },
          ],
        },
      },
    ],
  },
  {
    id: "mushroom-reliquary",
    world: "purple",
    title: "Mushroom Reliquary",
    subtitle: "Purple spores pulse in time with your champion's heartbeat.",
    backgroundSrc: `${QUEST_BG_BASE}/purple/mushroom-reliquary.png`,
    options: [
      {
        id: "breathe-the-soft-spores",
        title: "Breathe The Soft Spores",
        description: "Roll for a restorative bloom. Success improves health and nurture. Failure applies a poison curse relic.",
        check: { type: "roll", successChance: 64 },
        success: {
          title: "The spores bloom clean.",
          text: "Roots stitch quietly beneath the skin.",
          effects: [
            {
              type: "questRelic",
              id: "soft-spore-bloom",
              name: "Soft Spore Bloom",
              description: "Gain health and nurture potency.",
              imageSrc: `${ARTIFACT_IMAGE_BASE}/pale-orchard-seed.png`,
              statBonuses: { health: 16 },
              artifactMeta: { effectPotencyBonus: { nurture: 3 } },
              rewardTags: ["growth"],
            },
          ],
        },
        failure: {
          title: "The spores turn black.",
          text: "The bloom grows barbs.",
          effects: [
            {
              type: "questRelic",
              id: "black-spore-bloom",
              name: "Black Spore Bloom",
              description: "Gain poison potency, but lose health.",
              imageSrc: `${ARTIFACT_IMAGE_BASE}/gravebloom.png`,
              statBonuses: { health: -10 },
              artifactMeta: { effectPotencyBonus: { poison: 3 } },
              rewardTags: ["venom"],
            },
          ],
        },
      },
      {
        id: "harvest-the-tall-cap",
        title: "Harvest The Tall Cap",
        description: "No roll. Take a random artifact tied to your build.",
        success: {
          title: "The cap opens.",
          text: "A relic rests under the mushroom's veil.",
          effects: [{ type: "randomArtifact" }],
        },
      },
      {
        id: "cut-the-root-knot",
        title: "Cut The Root Knot",
        description: "Draw a random card. Success if it applies poison or nurture. Upgrade a card, or take damage.",
        check: { type: "card", label: "poison or nurture card", match: { effects: ["poison", "nurture"] } },
        success: {
          title: "The knot opens.",
          text: "The root shows your champion how to deepen a technique.",
          effects: [{ type: "cardUpgrade" }],
        },
        failure: {
          title: "The knot snaps back.",
          text: "Roots lash around your champion's ribs.",
          effects: [{ type: "damagePct", amount: 0.16 }],
        },
      },
    ],
  },
  {
    id: "silent-duelist-statue",
    world: "purple",
    title: "Silent Duelist Statue",
    subtitle: "A stone duelist raises a cracked training blade.",
    backgroundSrc: `${QUEST_BG_BASE}/purple/silent-duelist-statue.png`,
    options: [
      {
        id: "spar-with-the-statue",
        title: "Spar With The Statue",
        description: "Draw a random card. Success if it is damage. Upgrade a card, or take damage.",
        check: { type: "card", label: "damage card", match: { class: "damage" } },
        success: {
          title: "The statue nods.",
          text: "A clean strike teaches your deck a sharper line.",
          effects: [{ type: "cardUpgrade" }],
        },
        failure: {
          title: "The statue lands first.",
          text: "Stone knuckles crack against your champion.",
          effects: [{ type: "damagePct", amount: 0.15 }],
        },
      },
      {
        id: "oil-the-training-blade",
        title: "Oil The Training Blade",
        description: "No roll. Gain strength and accuracy on melee cards.",
        success: {
          title: "The blade remembers weight.",
          text: "Your champion's close strikes feel steadier.",
          effects: [
            {
              type: "questRelic",
              id: "duelist-oil",
              name: "Duelist Oil",
              description: "Gain strength and melee accuracy.",
              imageSrc: `${ARTIFACT_IMAGE_BASE}/quiet-anvil.png`,
              statBonuses: { strength: 5 },
              moveAccuracy: { melee: 6 },
              rewardTags: ["melee", "weapon"],
            },
          ],
        },
      },
      {
        id: "take-the-cracked-shield",
        title: "Take The Cracked Shield",
        description: "Roll for a defensive relic. Success gains shield starts. Failure gains a cursed relic.",
        check: { type: "roll", successChance: 70 },
        success: {
          title: "The shield holds.",
          text: "A cracked guard still knows its job.",
          effects: [
            {
              type: "questRelic",
              id: "cracked-duelist-shield",
              name: "Cracked Duelist Shield",
              description: "Start each room with shield.",
              imageSrc: `${ARTIFACT_IMAGE_BASE}/old-banner.png`,
              battleOnly: [{ type: "gain_start_of_battle", effectKey: "shield", amount: 6 }],
              rewardTags: ["armor", "ward"],
            },
          ],
        },
        failure: {
          title: "The shield was bait.",
          text: "A brittle curse hooks into your pack.",
          effects: [{ type: "cursedRelic" }],
        },
      },
    ],
  },
  {
    id: "sealed-rune-door",
    world: "purple",
    title: "Sealed Rune Door",
    subtitle: "The door asks for the shape of a spell, not the word.",
    backgroundSrc: `${QUEST_BG_BASE}/purple/sealed-rune-door.png`,
    options: [
      {
        id: "trace-the-inner-rune",
        title: "Trace The Inner Rune",
        description: "Roll for a precise tracing. Success adds a card. Failure lowers accuracy.",
        check: { type: "roll", successChance: 66 },
        success: {
          title: "The rune opens sideways.",
          text: "A sealed card slips out from behind the stone.",
          effects: [{ type: "cardChoice" }],
        },
        failure: {
          title: "The rune misreads you.",
          text: "Your champion's aim wavers under the wrong sigil.",
          effects: [
            {
              type: "questRelic",
              id: "crooked-rune",
              name: "Crooked Rune",
              description: "Lose accuracy on magic and ranged cards.",
              imageSrc: `${ARTIFACT_IMAGE_BASE}/frostbitten-stylus.png`,
              moveAccuracy: { magic: -5, ranged: -5 },
              rewardTags: ["curse"],
            },
          ],
        },
      },
      {
        id: "force-the-lock",
        title: "Force The Lock",
        description: "No roll. Take damage and upgrade a card.",
        success: {
          title: "The lock breaks.",
          text: "The impact hurts, but the fragments teach a stronger pattern.",
          effects: [{ type: "damagePct", amount: 0.12 }, { type: "cardUpgrade" }],
        },
      },
      {
        id: "ask-the-door-to-wait",
        title: "Ask The Door To Wait",
        description: "No roll. Heal a small amount and return to the map.",
        success: {
          title: "The door waits.",
          text: "The silence gives your champion a moment to breathe.",
          effects: [{ type: "healPct", amount: 0.18 }],
        },
      },
    ],
  },

  {
    id: "drowned-scriptorium",
    world: "blue",
    title: "Drowned Scriptorium",
    subtitle: "Books float face-down in cold blue water.",
    backgroundSrc: `${QUEST_BG_BASE}/blue/drowned-scriptorium.png`,
    options: [
      {
        id: "read-the-wet-margin",
        title: "Read The Wet Margin",
        description: "Draw a random card. Success if it is magic or curse. Gain a card, or lose health.",
        check: { type: "card", label: "magic or curse card", match: { ranges: ["magic"], classes: ["curse"] } },
        success: {
          title: "The margin still speaks.",
          text: "A soaked diagram becomes a usable card.",
          effects: [{ type: "cardChoice" }],
        },
        failure: {
          title: "The ink turns to brine.",
          text: "Cold water fills your champion's lungs.",
          effects: [{ type: "damagePct", amount: 0.17 }],
        },
      },
      {
        id: "drink-the-blue-ink",
        title: "Drink The Blue Ink",
        description: "Roll for a strange lesson. Success gains intelligence and drown potency. Failure gains a cursed relic.",
        check: { type: "roll", successChance: 60 },
        success: {
          title: "The ink settles.",
          text: "Tide logic sharpens your champion's spells.",
          effects: [
            {
              type: "questRelic",
              id: "blue-ink-lesson",
              name: "Blue Ink Lesson",
              description: "Gain intelligence and drown potency.",
              imageSrc: `${ARTIFACT_IMAGE_BASE}/sunken-locket-of-nine-tides.png`,
              statBonuses: { intelligence: 5 },
              artifactMeta: { effectPotencyBonus: { drown: 3 } },
              rewardTags: ["magic", "tide"],
            },
          ],
        },
        failure: {
          title: "The ink drinks back.",
          text: "The scriptorium leaves a brined curse behind.",
          effects: [{ type: "cursedRelic" }],
        },
      },
      {
        id: "tear-out-a-blank-page",
        title: "Tear Out A Blank Page",
        description: "No roll. Remove one card copy from your deck, including starting cards.",
        success: {
          title: "The page accepts the burden.",
          text: "An unwanted card can be erased from the run.",
          effects: [{ type: "removeCard" }],
        },
      },
    ],
  },
  {
    id: "frost-bell-chapel",
    world: "blue",
    title: "Frost Bell Chapel",
    subtitle: "A frozen bell hangs above pews of blue stone.",
    backgroundSrc: `${QUEST_BG_BASE}/blue/frost-bell-chapel.png`,
    options: [
      {
        id: "ring-the-frost-bell",
        title: "Ring The Frost Bell",
        description: "Roll for a clean note. Success gains freeze potency. Failure loses speed.",
        check: { type: "roll", successChance: 63 },
        success: {
          title: "The note rings clear.",
          text: "Cold timing settles into your champion's cards.",
          effects: [
            {
              type: "questRelic",
              id: "clear-frost-note",
              name: "Clear Frost Note",
              description: "Gain freeze potency and magic accuracy.",
              imageSrc: `${ARTIFACT_IMAGE_BASE}/frostbitten-stylus.png`,
              artifactMeta: { effectPotencyBonus: { freeze: 3 } },
              moveAccuracy: { magic: 4 },
              rewardTags: ["frost", "magic"],
            },
          ],
        },
        failure: {
          title: "The bell cracks.",
          text: "Cold weight slows your champion's hands.",
          effects: [
            {
              type: "questRelic",
              id: "cracked-frost-note",
              name: "Cracked Frost Note",
              description: "Lose speed.",
              imageSrc: `${ARTIFACT_IMAGE_BASE}/widows-sundial.png`,
              statBonuses: { speed: -5 },
              rewardTags: ["frost", "slow"],
            },
          ],
        },
      },
      {
        id: "kneel-in-the-blue-pew",
        title: "Kneel In The Blue Pew",
        description: "No roll. Heal and gain a small bless start.",
        success: {
          title: "The pew warms.",
          text: "Blue chapel light seals a few wounds.",
          effects: [
            { type: "healPct", amount: 0.28 },
            {
              type: "questRelic",
              id: "blue-pew-vow",
              name: "Blue Pew Vow",
              description: "Start each room with bless.",
              imageSrc: `${ARTIFACT_IMAGE_BASE}/iron-saints-fingerbone.png`,
              battleOnly: [{ type: "gain_start_of_battle", effectKey: "bless", amount: 2 }],
              rewardTags: ["holy", "ward"],
            },
          ],
        },
      },
      {
        id: "steal-the-bell-clapper",
        title: "Steal The Bell Clapper",
        description: "Draw a random card. Success if it is melee. Upgrade a card, or gain a cursed relic.",
        check: { type: "card", label: "melee card", match: { range: "melee" } },
        success: {
          title: "The clapper stays quiet.",
          text: "The stolen weight teaches a stronger attack pattern.",
          effects: [{ type: "cardUpgrade" }],
        },
        failure: {
          title: "The chapel hears you.",
          text: "A curse rings once inside your pack.",
          effects: [{ type: "cursedRelic" }],
        },
      },
    ],
  },
  {
    id: "azure-engine-crossing",
    world: "blue",
    title: "Azure Engine Crossing",
    subtitle: "Blue gears turn a bridge that should not hold.",
    backgroundSrc: `${QUEST_BG_BASE}/blue/azure-engine-crossing.png`,
    options: [
      {
        id: "time-the-gears",
        title: "Time The Gears",
        description: "Roll for perfect timing. Success gains speed and cooldown momentum. Failure takes damage.",
        check: { type: "roll", successChance: 58 },
        success: {
          title: "The gears align.",
          text: "Your champion learns to move between beats.",
          effects: [
            {
              type: "questRelic",
              id: "gearstep",
              name: "Gearstep",
              description: "Gain speed. The first damage or curse card each room has no cooldown.",
              imageSrc: `${ARTIFACT_IMAGE_BASE}/briarclock.png`,
              statBonuses: { speed: 6 },
              artifactMeta: { firstDamageNoCooldown: true },
              rewardTags: ["speed", "weapon"],
            },
          ],
        },
        failure: {
          title: "The gears bite.",
          text: "The bridge catches an ankle and throws your champion forward.",
          effects: [{ type: "damagePct", amount: 0.2 }],
        },
      },
      {
        id: "jam-the-small-cog",
        title: "Jam The Small Cog",
        description: "No roll. Gain a random artifact, but take damage.",
        success: {
          title: "The engine coughs up a relic.",
          text: "A reward drops from the mechanism as it kicks back.",
          effects: [{ type: "randomArtifact" }, { type: "damagePct", amount: 0.08 }],
        },
      },
      {
        id: "follow-the-sparking-wire",
        title: "Follow The Sparking Wire",
        description: "Draw a random card. Success if it applies paralyze or focus. Add a card, or lose accuracy.",
        check: { type: "card", label: "paralyze or focus card", match: { effects: ["paralyze", "focus"] } },
        success: {
          title: "The wire leads to a cache.",
          text: "A precise card waits under the engine.",
          effects: [{ type: "cardChoice" }],
        },
        failure: {
          title: "The wire snaps.",
          text: "Static fuzzes your champion's aim.",
          effects: [
            {
              type: "questRelic",
              id: "static-afterimage",
              name: "Static Afterimage",
              description: "Lose ranged and magic accuracy.",
              imageSrc: `${ARTIFACT_IMAGE_BASE}/crown-of-borrowed-thunder.png`,
              moveAccuracy: { ranged: -4, magic: -4 },
              rewardTags: ["storm"],
            },
          ],
        },
      },
    ],
  },
  {
    id: "salt-oracle",
    world: "blue",
    title: "Salt Oracle",
    subtitle: "A tide pool shows possible rooms that have not happened yet.",
    backgroundSrc: `${QUEST_BG_BASE}/blue/salt-oracle.png`,
    options: [
      {
        id: "ask-for-strength",
        title: "Ask For Strength",
        description: "Roll for a useful omen. Success gains a build-matched card. Failure gains a cursed relic.",
        check: { type: "roll", successChance: 72 },
        success: {
          title: "The pool shows a weapon.",
          text: "The omen becomes a card you can carry.",
          effects: [{ type: "cardChoice" }],
        },
        failure: {
          title: "The pool shows teeth.",
          text: "The omen follows anyway.",
          effects: [{ type: "cursedRelic" }],
        },
      },
      {
        id: "offer-a-card-name",
        title: "Offer A Card Name",
        description: "Remove one card copy. Heal if you remove one.",
        success: {
          title: "The oracle forgets for you.",
          text: "One card can be taken from the run, and the silence closes wounds.",
          effects: [{ type: "removeCard" }, { type: "healPct", amount: 0.14 }],
        },
      },
      {
        id: "drink-the-tide-pool",
        title: "Drink The Tide Pool",
        description: "No roll. Gain drown and cleanse potency, but lose health.",
        success: {
          title: "Salt truth burns.",
          text: "The water leaves both clarity and pain.",
          effects: [
            { type: "damagePct", amount: 0.09 },
            {
              type: "questRelic",
              id: "salt-truth",
              name: "Salt Truth",
              description: "Gain drown and cleanse potency.",
              imageSrc: `${ARTIFACT_IMAGE_BASE}/cup-that-drinks-silence.png`,
              artifactMeta: { effectPotencyBonus: { drown: 2, cleanse: 2 } },
              rewardTags: ["tide", "holy"],
            },
          ],
        },
      },
    ],
  },
  {
    id: "lightning-ribcage",
    world: "blue",
    title: "Lightning Ribcage",
    subtitle: "A giant skeleton cages a storm between its ribs.",
    backgroundSrc: `${QUEST_BG_BASE}/blue/lightning-ribcage.png`,
    options: [
      {
        id: "pull-the-blue-rib",
        title: "Pull The Blue Rib",
        description: "Roll for the storm's favor. Success gains paralyze potency and speed. Failure takes damage.",
        check: { type: "roll", successChance: 55 },
        success: {
          title: "The storm chooses you.",
          text: "Blue current learns your champion's rhythm.",
          effects: [
            {
              type: "questRelic",
              id: "storm-rib",
              name: "Storm Rib",
              description: "Gain speed and paralyze potency.",
              imageSrc: `${ARTIFACT_IMAGE_BASE}/crown-of-borrowed-thunder.png`,
              statBonuses: { speed: 4 },
              artifactMeta: { effectPotencyBonus: { paralyze: 3 } },
              rewardTags: ["storm", "speed"],
            },
          ],
        },
        failure: {
          title: "The storm rejects you.",
          text: "Lightning exits through every old wound.",
          effects: [{ type: "damagePct", amount: 0.22 }],
        },
      },
      {
        id: "ground-the-sparks",
        title: "Ground The Sparks",
        description: "No roll. Gain resist and shield starts.",
        success: {
          title: "The sparks calm.",
          text: "Your champion learns to carry the storm safely.",
          effects: [
            {
              type: "questRelic",
              id: "grounded-sparks",
              name: "Grounded Sparks",
              description: "Gain resist and start each room with shield.",
              imageSrc: `${ARTIFACT_IMAGE_BASE}/blue-thorn-reliquary.png`,
              statBonuses: { resist: 5 },
              battleOnly: [{ type: "gain_start_of_battle", effectKey: "shield", amount: 4 }],
              rewardTags: ["armor", "storm"],
            },
          ],
        },
      },
      {
        id: "count-the-rib-shadows",
        title: "Count The Rib Shadows",
        description: "Draw a random card. Success if it is ranged. Upgrade a card, or lose speed.",
        check: { type: "card", label: "ranged card", match: { range: "ranged" } },
        success: {
          title: "The count lands.",
          text: "A ranged line sharpens into an upgrade.",
          effects: [{ type: "cardUpgrade" }],
        },
        failure: {
          title: "The shadows move.",
          text: "Your champion's footing stutters.",
          effects: [
            {
              type: "questRelic",
              id: "rib-shadow-stutter",
              name: "Rib Shadow Stutter",
              description: "Lose speed.",
              imageSrc: `${ARTIFACT_IMAGE_BASE}/briarclock.png`,
              statBonuses: { speed: -4 },
              rewardTags: ["slow"],
            },
          ],
        },
      },
    ],
  },
  {
    id: "moonlit-reliquary-bridge",
    world: "blue",
    title: "Moonlit Reliquary Bridge",
    subtitle: "A blue moon is trapped beneath the bridge stones.",
    backgroundSrc: `${QUEST_BG_BASE}/blue/moonlit-reliquary-bridge.png`,
    options: [
      {
        id: "open-the-moon-box",
        title: "Open The Moon Box",
        description: "Roll for a rare cache. Success gives a random artifact. Failure gives a cursed relic.",
        check: { type: "roll", successChance: 61 },
        success: {
          title: "Moonlight folds outward.",
          text: "A relic slides into your champion's hand.",
          effects: [{ type: "randomArtifact" }],
        },
        failure: {
          title: "Moonlight folds inward.",
          text: "The box shuts around a curse and keeps following you.",
          effects: [{ type: "cursedRelic" }],
        },
      },
      {
        id: "borrow-the-moon-edge",
        title: "Borrow The Moon Edge",
        description: "No roll. Gain crit chance and focus potency.",
        success: {
          title: "The edge glints.",
          text: "Your champion learns where a hit becomes decisive.",
          effects: [
            {
              type: "questRelic",
              id: "moon-edge",
              name: "Moon Edge",
              description: "Gain crit chance and focus potency.",
              imageSrc: `${ARTIFACT_IMAGE_BASE}/moonspike.png`,
              statBonuses: { critChance: 4 },
              artifactMeta: { effectPotencyBonus: { focus: 2 } },
              rewardTags: ["crit", "precision"],
            },
          ],
        },
      },
      {
        id: "drop-a-card-into-the-blue",
        title: "Drop A Card Into The Blue",
        description: "Remove one card copy. If none can be removed, heal instead.",
        success: {
          title: "The bridge remembers less.",
          text: "A card can fall away from the run.",
          effects: [{ type: "removeCard", fallback: [{ type: "healPct", amount: 0.2 }] }],
        },
      },
    ],
  },

  {
    id: "blood-furnace-contract",
    world: "red",
    title: "Blood Furnace Contract",
    subtitle: "The forge wants a signature written in heat.",
    backgroundSrc: `${QUEST_BG_BASE}/red/blood-furnace-contract.png`,
    options: [
      {
        id: "sign-with-a-burnt-thumb",
        title: "Sign With A Burnt Thumb",
        description: "Roll for a clean contract. Success gains burn and damage. Failure gains a cursed relic.",
        check: { type: "roll", successChance: 60 },
        success: {
          title: "The contract seals.",
          text: "Furnace heat follows your champion's attacks.",
          effects: [
            {
              type: "questRelic",
              id: "furnace-signature",
              name: "Furnace Signature",
              description: "Gain burn potency and flat damage.",
              imageSrc: `${ARTIFACT_IMAGE_BASE}/furnace-psalm.png`,
              artifactMeta: { effectPotencyBonus: { burn: 3 }, damageBonusFlat: 4 },
              rewardTags: ["flame", "weapon"],
            },
          ],
        },
        failure: {
          title: "The furnace signs back.",
          text: "The contract brands a curse into the run.",
          effects: [{ type: "cursedRelic" }],
        },
      },
      {
        id: "hammer-the-contract-flat",
        title: "Hammer The Contract Flat",
        description: "Draw a random card. Success if it is melee or burn. Upgrade a card, or take damage.",
        check: { type: "card", label: "melee or burn card", match: { ranges: ["melee"], effects: ["burn"] } },
        success: {
          title: "The contract becomes steel.",
          text: "The furnace beats one card into a harder shape.",
          effects: [{ type: "cardUpgrade" }],
        },
        failure: {
          title: "The hammer rebounds.",
          text: "Heat and iron punish the attempt.",
          effects: [{ type: "damagePct", amount: 0.2 }],
        },
      },
      {
        id: "take-the-cooling-ingot",
        title: "Take The Cooling Ingot",
        description: "No roll. Gain strength and health.",
        success: {
          title: "The ingot cools in your grip.",
          text: "Your champion carries furnace weight forward.",
          effects: [
            {
              type: "questRelic",
              id: "cooling-ingot",
              name: "Cooling Ingot",
              description: "Gain strength and health.",
              imageSrc: `${ARTIFACT_IMAGE_BASE}/quiet-anvil.png`,
              statBonuses: { strength: 6, health: 10 },
              rewardTags: ["strength", "armor"],
            },
          ],
        },
      },
    ],
  },
  {
    id: "infernal-trial-seat",
    world: "red",
    title: "Infernal Trial Seat",
    subtitle: "A stone judge points at your weakest card.",
    backgroundSrc: `${QUEST_BG_BASE}/red/infernal-trial-seat.png`,
    options: [
      {
        id: "accept-judgment",
        title: "Accept Judgment",
        description: "Remove one card copy, then gain resist.",
        success: {
          title: "The judgment is useful.",
          text: "A weakness can be sentenced and cut away.",
          effects: [
            { type: "removeCard" },
            {
              type: "questRelic",
              id: "trial-stone-guard",
              name: "Trial Stone Guard",
              description: "Gain resist.",
              imageSrc: `${ARTIFACT_IMAGE_BASE}/iron-saints-fingerbone.png`,
              statBonuses: { resist: 5 },
              rewardTags: ["armor", "ward"],
            },
          ],
        },
      },
      {
        id: "lie-to-the-seat",
        title: "Lie To The Seat",
        description: "Roll for deception. Success gives a rare-feeling upgrade. Failure gives a cursed relic.",
        check: { type: "roll", successChance: 48 },
        success: {
          title: "The judge believes you.",
          text: "The lie buys enough time to improve a card.",
          effects: [{ type: "cardUpgrade" }],
        },
        failure: {
          title: "The judge smiles.",
          text: "The lie is returned as a relic with teeth.",
          effects: [{ type: "cursedRelic" }],
        },
      },
      {
        id: "appeal-with-a-curse",
        title: "Appeal With A Curse",
        description: "Draw a random card. Success if it is curse. Gain doom potency, or take damage.",
        check: { type: "card", label: "curse card", match: { class: "curse" } },
        success: {
          title: "The appeal is sustained.",
          text: "Doom language sticks to your champion's curses.",
          effects: [
            {
              type: "questRelic",
              id: "sustained-doom",
              name: "Sustained Doom",
              description: "Gain doom potency.",
              imageSrc: `${ARTIFACT_IMAGE_BASE}/oath-of-the-hollow-king.png`,
              artifactMeta: { effectPotencyBonus: { doom: 4 } },
              rewardTags: ["doom", "curse"],
            },
          ],
        },
        failure: {
          title: "The appeal is denied.",
          text: "The seat punishes bad grammar.",
          effects: [{ type: "damagePct", amount: 0.18 }],
        },
      },
    ],
  },
  {
    id: "ash-orchard",
    world: "red",
    title: "Ash Orchard",
    subtitle: "Dead trees bear ember fruit that pulses like hearts.",
    backgroundSrc: `${QUEST_BG_BASE}/red/ash-orchard.png`,
    options: [
      {
        id: "eat-the-small-ember",
        title: "Eat The Small Ember",
        description: "No roll. Heal and gain burn potency.",
        success: {
          title: "The ember is sweet.",
          text: "Heat seals wounds instead of opening them.",
          effects: [
            { type: "healPct", amount: 0.24 },
            {
              type: "questRelic",
              id: "ember-fruit-seed",
              name: "Ember Fruit Seed",
              description: "Gain burn potency.",
              imageSrc: `${ARTIFACT_IMAGE_BASE}/thousandth-ember.png`,
              artifactMeta: { effectPotencyBonus: { burn: 2 } },
              rewardTags: ["flame", "growth"],
            },
          ],
        },
      },
      {
        id: "pick-the-black-fruit",
        title: "Pick The Black Fruit",
        description: "Roll for a dangerous harvest. Success gives a random artifact. Failure hurts and curses.",
        check: { type: "roll", successChance: 52 },
        success: {
          title: "The branch lets go.",
          text: "A relic drops from the ash canopy.",
          effects: [{ type: "randomArtifact" }],
        },
        failure: {
          title: "The branch cuts deep.",
          text: "The fruit bites back and leaves a curse in the wound.",
          effects: [{ type: "damagePct", amount: 0.14 }, { type: "cursedRelic" }],
        },
      },
      {
        id: "burn-away-an-old-card",
        title: "Burn Away An Old Card",
        description: "Remove one card copy. If one is removed, add a new card choice.",
        success: {
          title: "Ash makes room.",
          text: "One card can burn away so a new one can grow.",
          effects: [{ type: "removeCard" }, { type: "cardChoice" }],
        },
      },
    ],
  },
  {
    id: "doom-clock-engine",
    world: "red",
    title: "Doom Clock Engine",
    subtitle: "A red clock counts down to a fight that already happened.",
    backgroundSrc: `${QUEST_BG_BASE}/red/doom-clock-engine.png`,
    options: [
      {
        id: "turn-the-hour-hand-back",
        title: "Turn The Hour Hand Back",
        description: "Roll against the clock. Success heals and removes a card. Failure loses speed.",
        check: { type: "roll", successChance: 57 },
        success: {
          title: "Time gives a little.",
          text: "A wound and an unwanted card can both be undone.",
          effects: [{ type: "healPct", amount: 0.22 }, { type: "removeCard" }],
        },
        failure: {
          title: "Time takes payment.",
          text: "Your champion leaves a step behind.",
          effects: [
            {
              type: "questRelic",
              id: "missing-second",
              name: "Missing Second",
              description: "Lose speed.",
              imageSrc: `${ARTIFACT_IMAGE_BASE}/widows-sundial.png`,
              statBonuses: { speed: -5 },
              rewardTags: ["slow", "doom"],
            },
          ],
        },
      },
      {
        id: "feed-the-clock-a-curse",
        title: "Feed The Clock A Curse",
        description: "Draw a random card. Success if it applies doom, slow, or paralyze. Upgrade a card, or take damage.",
        check: { type: "card", label: "doom, slow, or paralyze card", match: { effects: ["doom", "slow", "paralyze"] } },
        success: {
          title: "The clock eats carefully.",
          text: "A precise tick improves one card.",
          effects: [{ type: "cardUpgrade" }],
        },
        failure: {
          title: "The clock bites early.",
          text: "The gears chew through your champion's guard.",
          effects: [{ type: "damagePct", amount: 0.21 }],
        },
      },
      {
        id: "steal-the-red-second",
        title: "Steal The Red Second",
        description: "No roll. Gain speed and first buff no cooldown, but take a cursed relic.",
        success: {
          title: "The second fits in your palm.",
          text: "The clock notices, but too late.",
          effects: [
            {
              type: "questRelic",
              id: "red-second",
              name: "Red Second",
              description: "Gain speed. The first buff card each room has no cooldown.",
              imageSrc: `${ARTIFACT_IMAGE_BASE}/briarclock.png`,
              statBonuses: { speed: 6 },
              artifactMeta: { firstBuffNoCooldown: true },
              rewardTags: ["speed", "ward"],
            },
            { type: "cursedRelic" },
          ],
        },
      },
    ],
  },
  {
    id: "gate-of-last-teeth",
    world: "red",
    title: "Gate Of Last Teeth",
    subtitle: "The gate opens only for champions willing to be bitten.",
    backgroundSrc: `${QUEST_BG_BASE}/red/gate-of-last-teeth.png`,
    options: [
      {
        id: "let-the-gate-bite",
        title: "Let The Gate Bite",
        description: "No roll. Take damage, then choose an artifact.",
        success: {
          title: "The gate accepts blood.",
          text: "The bite hurts, but the gate unlocks a relic chamber.",
          effects: [{ type: "damagePct", amount: 0.12 }, { type: "artifactChoice" }],
        },
      },
      {
        id: "count-the-last-teeth",
        title: "Count The Last Teeth",
        description: "Roll for a clean count. Success adds a card. Failure gets a cursed relic.",
        check: { type: "roll", successChance: 66 },
        success: {
          title: "The count is exact.",
          text: "The gate gives up a card from between its teeth.",
          effects: [{ type: "cardChoice" }],
        },
        failure: {
          title: "The count is one short.",
          text: "The missing tooth follows you as a curse.",
          effects: [{ type: "cursedRelic" }],
        },
      },
      {
        id: "jam-a-weapon-in-the-gate",
        title: "Jam A Weapon In The Gate",
        description: "Draw a random card. Success if it is damage. Gain strength and bleed potency, or lose health.",
        check: { type: "card", label: "damage card", match: { class: "damage" } },
        success: {
          title: "The gate cracks.",
          text: "The teeth teach your champion how to wound deeper.",
          effects: [
            {
              type: "questRelic",
              id: "tooth-gap",
              name: "Tooth Gap",
              description: "Gain strength and bleed potency.",
              imageSrc: `${ARTIFACT_IMAGE_BASE}/ash-eater-chalice.png`,
              statBonuses: { strength: 4 },
              artifactMeta: { effectPotencyBonus: { bleed: 3 } },
              rewardTags: ["bleed", "weapon"],
            },
          ],
        },
        failure: {
          title: "The gate eats the weapon.",
          text: "The loss leaves your champion exposed.",
          effects: [
            {
              type: "questRelic",
              id: "weapon-shaped-loss",
              name: "Weapon Shaped Loss",
              description: "Lose health.",
              imageSrc: `${ARTIFACT_IMAGE_BASE}/red-thread-of-no-return.png`,
              statBonuses: { health: -12 },
              rewardTags: ["doom"],
            },
          ],
        },
      },
    ],
  },
  {
    id: "crimson-reliquary-altar",
    world: "red",
    title: "Crimson Reliquary Altar",
    subtitle: "Three locked coffers breathe red smoke.",
    backgroundSrc: `${QUEST_BG_BASE}/red/crimson-reliquary-altar.png`,
    options: [
      {
        id: "open-the-left-coffer",
        title: "Open The Left Coffer",
        description: "Roll for a clean opening. Success gives a random artifact. Failure gives a cursed relic.",
        check: { type: "roll", successChance: 58 },
        success: {
          title: "The left lock snaps open.",
          text: "A relic waits inside the smoke.",
          effects: [{ type: "randomArtifact" }],
        },
        failure: {
          title: "The left lock laughs.",
          text: "The coffer gives you the wrong relic.",
          effects: [{ type: "cursedRelic" }],
        },
      },
      {
        id: "open-the-center-coffer",
        title: "Open The Center Coffer",
        description: "Draw a random card. Success if it matches any effect your build brought in. Gain a card, or take damage.",
        check: { type: "card", label: "card with one of your build effects", match: { buildEffect: true } },
        success: {
          title: "The center lock knows your build.",
          text: "It offers a card that belongs to the run.",
          effects: [{ type: "cardChoice" }],
        },
        failure: {
          title: "The center lock rejects you.",
          text: "Red smoke burns your champion's lungs.",
          effects: [{ type: "damagePct", amount: 0.18 }],
        },
      },
      {
        id: "open-the-right-coffer",
        title: "Open The Right Coffer",
        description: "No roll. Upgrade a card, then gain a cursed relic.",
        success: {
          title: "The right lock opens too easily.",
          text: "A lesson and a curse share the same hinge.",
          effects: [{ type: "cardUpgrade" }, { type: "cursedRelic" }],
        },
      },
    ],
  },
];

export function pickDepthsQuestForWorld(worldKey = "purple", usedQuestIds = []) {
  const used = new Set((usedQuestIds || []).filter(Boolean));
  const world = String(worldKey || "purple").toLowerCase();
  const worldQuests = DEPTHS_QUESTS.filter((quest) => quest.world === world);
  const available = worldQuests.filter((quest) => !used.has(quest.id));
  const pool = available.length ? available : worldQuests.length ? worldQuests : DEPTHS_QUESTS;
  return pool[Math.floor(Math.random() * pool.length)] || DEPTHS_QUESTS[0] || null;
}
