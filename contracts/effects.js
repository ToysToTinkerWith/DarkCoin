// Sorted to match your oldPoints mapping order, and tagged with effectType.
// First 8 = negative, last 8 = positive.

let effects = [
  // NEGATIVE (0..700)
  {
    name: "poison",
    effectType: "negative",
    effects: {
      effects: [],
      attackerStatAdjustments: {
        strengthAdj: "0",
        dexterityAdj: "0",
        intelligenceAdj: "0",
        accuracyAdj: "0",
        resistAdj: "0",
      },
      ongoingHpPerTurn: "-1.0 per stack",
      defenderStatAdjustments: { resistAdj: "0" },
    },
  },
  {
    name: "bleed",
    effectType: "negative",
    effects: {
      effects: [],
      attackerStatAdjustments: {
        strengthAdj: "-0.1 per stack",
        dexterityAdj: "0",
        intelligenceAdj: "0",
        accuracyAdj: "0",
        resistAdj: "0",
      },
      ongoingHpPerTurn: "-0.7 per stack",
      defenderStatAdjustments: { resistAdj: "0" },
    },
  },
  {
    name: "burn",
    effectType: "negative",
    effects: {
      effects: [],
      attackerStatAdjustments: {
        strengthAdj: "+0.1 per stack",
        dexterityAdj: "0",
        intelligenceAdj: "-0.1 per stack",
        accuracyAdj: "0",
        resistAdj: "0",
      },
      ongoingHpPerTurn: "-0.5 per stack",
      defenderStatAdjustments: { resistAdj: "0" },
    },
  },
  {
    name: "freeze",
    effectType: "negative",
    effects: {
      effects: [],
      attackerStatAdjustments: {
        strengthAdj: "0",
        dexterityAdj: "-0.2 per stack",
        intelligenceAdj: "0",
        accuracyAdj: "0",
        resistAdj: "0",
      },
      ongoingHpPerTurn: "0",
      defenderStatAdjustments: { resistAdj: "0" },
    },
  },
  {
    name: "slow",
    effectType: "negative",
    effects: {
      effects: [],
      attackerStatAdjustments: {
        strengthAdj: "0",
        dexterityAdj: "-0.1 per stack",
        intelligenceAdj: "0",
        accuracyAdj: "0",
        resistAdj: "0",
      },
      ongoingHpPerTurn: "0",
      defenderStatAdjustments: { resistAdj: "0" },
    },
  },
  {
    name: "drown",
    effectType: "negative",
    effects: {
      effects: [],
      attackerStatAdjustments: {
        strengthAdj: "0",
        dexterityAdj: "-0.3 per stack",
        intelligenceAdj: "0",
        accuracyAdj: "-0.1 per stack",
        resistAdj: "0",
      },
      ongoingHpPerTurn: "0",
      defenderStatAdjustments: { resistAdj: "0" },
    },
  },
  {
    name: "paralyze",
    effectType: "negative",
    effects: {
      effects: [],
      attackerStatAdjustments: {
        strengthAdj: "0",
        dexterityAdj: "0",
        intelligenceAdj: "0",
        accuracyAdj: "-0.2 per stack",
        resistAdj: "0",
      },
      ongoingHpPerTurn: "0",
      defenderStatAdjustments: { resistAdj: "0" },
    },
  },
  {
    name: "doom",
    effectType: "negative",
    effects: {
      effects: [],
      attackerStatAdjustments: {
        strengthAdj: "0",
        dexterityAdj: "0",
        intelligenceAdj: "-0.2 per stack",
        accuracyAdj: "0",
        resistAdj: "0",
      },
      ongoingHpPerTurn: "-0.3 per stack",
      defenderStatAdjustments: { resistAdj: "-0.2 per stack" },
    },
  },

  // POSITIVE (800..1500)
  {
    name: "shield",
    effectType: "positive",
    effects: {
      effects: ["Blocks 0.5 damage from melee and ranged attacks"],
      attackerStatAdjustments: {
        strengthAdj: "0",
        dexterityAdj: "0",
        intelligenceAdj: "0",
        accuracyAdj: "0",
        resistAdj: "0",
      },
      ongoingHpPerTurn: "0",
      defenderStatAdjustments: { resistAdj: "0" },
    },
  },
  {
    name: "strengthen",
    effectType: "positive",
    effects: {
      effects: [],
      attackerStatAdjustments: {
        strengthAdj: "+0.3 per stack",
        dexterityAdj: "0",
        intelligenceAdj: "0",
        accuracyAdj: "0",
        resistAdj: "0",
      },
      ongoingHpPerTurn: "0",
      defenderStatAdjustments: { resistAdj: "0" },
    },
  },
  {
    name: "focus",
    effectType: "positive",
    effects: {
      effects: [],
      attackerStatAdjustments: {
        strengthAdj: "0",
        dexterityAdj: "0",
        intelligenceAdj: "0",
        accuracyAdj: "+0.3 per stack",
        resistAdj: "0",
      },
      ongoingHpPerTurn: "0",
      defenderStatAdjustments: { resistAdj: "0" },
    },
  },
  {
    name: "empower",
    effectType: "positive",
    effects: {
      effects: [],
      attackerStatAdjustments: {
        strengthAdj: "0",
        dexterityAdj: "0",
        intelligenceAdj: "+0.3 per stack",
        accuracyAdj: "0",
        resistAdj: "0",
      },
      ongoingHpPerTurn: "0",
      defenderStatAdjustments: { resistAdj: "0" },
    },
  },
  {
    name: "nurture",
    effectType: "positive",
    effects: {
      effects: [],
      attackerStatAdjustments: {
        strengthAdj: "0",
        dexterityAdj: "0",
        intelligenceAdj: "0",
        accuracyAdj: "0",
        resistAdj: "0",
      },
      ongoingHpPerTurn: "+0.5 per stack",
      defenderStatAdjustments: { resistAdj: "0" },
    },
  },
  {
    name: "bless",
    effectType: "positive",
    effects: {
      effects: [],
      attackerStatAdjustments: {
        strengthAdj: "+0.2 per stack",
        dexterityAdj: "0",
        intelligenceAdj: "+0.2 per stack",
        accuracyAdj: "0",
        resistAdj: "0",
      },
      ongoingHpPerTurn: "0",
      defenderStatAdjustments: { resistAdj: "+0.1 per stack" },
    },
  },
  {
    name: "hasten",
    effectType: "positive",
    effects: {
      effects: [],
      attackerStatAdjustments: {
        strengthAdj: "0",
        dexterityAdj: "+0.3 per stack",
        intelligenceAdj: "0",
        accuracyAdj: "0",
        resistAdj: "0",
      },
      ongoingHpPerTurn: "0",
      defenderStatAdjustments: { resistAdj: "0" },
    },
  },
  {
    name: "cleanse",
    effectType: "positive",
    effects: {
      effects: ["Prevents or cleanses 1 negative status effect"],
      attackerStatAdjustments: {
        strengthAdj: "0",
        dexterityAdj: "0",
        intelligenceAdj: "0",
        accuracyAdj: "0",
        resistAdj: "0",
      },
      ongoingHpPerTurn: "0",
      defenderStatAdjustments: { resistAdj: "0" },
    },
  },
]
