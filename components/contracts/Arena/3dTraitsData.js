

export const CHAMPION_TRAITS = {
  Background: [
    { assetId: 1631153255, trait: "Aqua Background", type: "Background", total: 132, effects: ["Increases Drown."] },
    { assetId: 1631164569, trait: "Blood Background", type: "Background", total: 144, effects: ["Increases Bleed."] },
    { assetId: 1631166128, trait: "Cosmos Background", type: "Background", total: 53, effects: ["Increases Intelligence", "Increases Resist."] },
    { assetId: 1631168001, trait: "Dungeon Background", type: "Background", total: 38, effects: ["Increases Doom."] },
    { assetId: 1631169006, trait: "Forest Background", type: "Background", total: 83, effects: ["Increases Health.", "Gain Nurture at start of battle."] },
    { assetId: 1631170742, trait: "Golden Background", type: "Background", total: 108, effects: ["Gain Bless at start of battle."] },
    { assetId: 1631172134, trait: "Midnight Background", type: "Background", total: 105, effects: ["Gain Focus at the start of battle."] },
    { assetId: 1631173209, trait: "Noir Background", type: "Background", total: 118, effects: ["Resistance to Doom."] },
    { assetId: 1631173804, trait: "Red Moon Background", type: "Background", total: 19, effects: ["Apply Doom at the start of battle."] },
    { assetId: 1631175041, trait: "Sunset Background", type: "Background", total: 81, effects: ["Gain Cleanse at the start of battle."] },
    { assetId: 1631178480, trait: "Toxic Background", type: "Background", total: 119, effects: ["Increases Poison."] },
    { assetId: 1792634314, trait: "Valley Background", type: "Background", total: 40, effects: ["Increases Speed."] },
    { assetId: 3586495527, trait: "Golden Moon", type: "Background", total: 15, effects: ["Increases Bless.", "Gain Focus at the start of battle."] },
    { assetId: 2311097594, trait: "Waves Background", type: "Background", total: 65, effects: ["Apply Drown at the start of the battle."] },
    { assetId: 3668457144, trait: "Dawn Background", type: "Background", total: 35, effects: ["Increases Resist."] },
  ],
  Weapon: [
    // speedFactor: 1.0 is standard; higher values attack faster and lower values attack slower.
    { assetId: 1631181322, trait: "Dragon Long Sword", type: "Weapon", total: 63, damageRoll: "2d10", damageType: "fire", speedFactor: 0.85, effects: ["Apply Burn on melee hit."] },
    { assetId: 1631198641, trait: "Dragon Staff", type: "Weapon", total: 38, damageRoll: "2d8", damageType: "fire", speedFactor: 0.9, effects: ["Apply Burn at the start of battle."] },
    { assetId: 1631201003, trait: "Dual Katana", type: "Weapon", total: 79, damageRoll: "3d6", damageType: "slashing", speedFactor: 1.3, effects: ["Increases Speed."] },
    { assetId: 1631202303, trait: "Executioner Axe", type: "Weapon", total: 99, damageRoll: "1d12", damageType: "slashing", speedFactor: 0.7, effects: ["Increases Strength.", "Increases Health."] },
    { assetId: 1631204400, trait: "Scythe", type: "Weapon", total: 74, damageRoll: "2d6", damageType: "slashing", speedFactor: 0.85, effects: ["Apply Bleed on melee hit.", "Apply Doom on magic hit."] },
    { assetId: 1631205295, trait: "Shield", type: "Weapon", total: 89, damageRoll: "1d6", damageType: "blunt", speedFactor: 0.75, effects: ["Gain Shield at thzzzzzzzzzzzzzzzze start of battle."] },
    { assetId: 1631205996, trait: "Sickle", type: "Weapon", total: 78, damageRoll: "1d8", damageType: "slashing", speedFactor: 1.2, effects: ["Increases Nurture.", "Apply Bleed on melee hit."] },
    { assetId: 1631207056, trait: "Spear", type: "Weapon", total: 95, damageRoll: "1d10", damageType: "piercing", speedFactor: 1.0, effects: ["Increases Health.", "Apply Bleed on melee hit."] },
    { assetId: 1631207955, trait: "Trident", type: "Weapon", total: 112, damageRoll: "2d6", damageType: "water", speedFactor: 0.9, effects: ["Apply Drown on melee hit."] },
    { assetId: 1792635942, trait: "Dark Sword", type: "Weapon", total: 40, damageRoll: "2d8", damageType: "shadow", speedFactor: 0.95, effects: ["Apply Doom on melee hit."] },
    { assetId: 1792636565, trait: "Elf Bow", type: "Weapon", total: 40, damageRoll: "1d10", damageType: "piercing", speedFactor: 1.15, effects: ["Gain Nurture on ranged hit."] },
    { assetId: 3586495825, trait: "Wooden Club", type: "Weapon", total: 45, damageRoll: "1d10", damageType: "blunt", speedFactor: 0.8, effects: ["Increases Strength.", "Apply Paralyze on melee hit."] },
    { assetId: 3586495819, trait: "Snake Wings", type: "Weapon", total: 45, damageRoll: "2d6", damageType: "poison", speedFactor: 1.25, effects: ["Increases Speed.", "Increases Poison."] },
    { assetId: 3586495808, trait: "Ske'tonian Sword", type: "Weapon", total: 5, damageRoll: "2d8", damageType: "slashing", speedFactor: 1.0, effects: ["Apply Bleed on melee hit.", "Increases Resist."] },
    { assetId: 3586495146, trait: "Fire Wings", type: "Weapon", total: 45, damageRoll: "2d6", damageType: "fire", speedFactor: 1.2, effects: ["Increases Speed.", "Apply Burn on melee hit."] },
    { assetId: 3586495133, trait: "Elder Wings", type: "Weapon", total: 45, damageRoll: "2d6", damageType: "arcane", speedFactor: 1.05, effects: ["Increases Intelligence.", "Resistance to Freeze."] },
    { assetId: 3586495110, trait: "Chameleon Wings", type: "Weapon", total: 30, damageRoll: "2d6", damageType: "poison", speedFactor: 1.3, effects: ["Increases Speed.", "Resistance to Poison."] },
    { assetId: 3586495084, trait: "Arctic Dual Katana", type: "Weapon", total: 30, damageRoll: "3d6", damageType: "frost", speedFactor: 1.25, effects: ["Apply Freeze on melee hit.", "Increases Speed."] },
    { assetId: 3668457164, trait: "Rusty Sword", type: "Weapon", total: 35, damageRoll: "1d8", damageType: "slashing", speedFactor: 1.05, effects: ["Increases Speed.", "Decreases Strength."] },
    { assetId: 3668457154, trait: "Lightning Staff", type: "Weapon", total: 35, damageRoll: "2d8", damageType: "lightning", speedFactor: 1.1, effects: ["Apply Paralyze on magic hit."] },
    { assetId: 3668457152, trait: "Hedge-Knight Sword", type: "Weapon", total: 35, damageRoll: "2d8", damageType: "slashing", speedFactor: 1.1, effects: ["Gain Hasten on melee hit."] },
  ],
  Magic: [
    { assetId: 1631208827, trait: "Dark Magic", type: "Magic", total: 10, effects: ["Increases Doom."] },
    { assetId: 1631209424, trait: "Fire Magic", type: "Magic", total: 30, effects: ["Apply Burn on magic hit."] },
    { assetId: 1631213913, trait: "Lightning Magic", type: "Magic", total: 15, effects: ["Apply Paralyze on magic hit."] },
    { assetId: 1631217677, trait: "Water Magic", type: "Magic", total: 32, effects: ["Increases Drown."] },
    { assetId: 1631233542, trait: "Ice Daggers", type: "Magic", total: 25, effects: ["Apply Freeze on ranged hit."] },
    { assetId: 3586495574, trait: "Poison Cloud", type: "Magic", total: 15, effects: ["Apply Poison at the start of battle."] },
    { assetId: 3668457136, trait: "Blood-Shards", type: "Magic", total: 35, effects: ["Apply Bleed at start of battle."] },
  ],
  Head: [
    { assetId: 1631224831, trait: "Crown of Horns", type: "Head", total: 18, effects: ["Gain Doom at the start of battle.", "Gain Strengthen at the start of battle."] },
    { assetId: 1631236045, trait: "All Knowing", type: "Head", total: 61, effects: ["Increases Intelligence."] },
    { assetId: 1631236727, trait: "Bone", type: "Head", total: 62, effects: ["Gain Cleanse at the start of battle."] },
    { assetId: 1631238772, trait: "Dark Knight Helm", type: "Head", total: 71, effects: ["Increases Doom."] },
    { assetId: 1631240661, trait: "Dragon Knight Helm", type: "Head", total: 30, effects: ["Increases Health.", "Increases Burn."] },
    { assetId: 1631243569, trait: "Dragon", type: "Head", total: 129, effects: ["Gain Burn at start of battle.", "Increases Speed."] },
    { assetId: 1631245454, trait: "Elder", type: "Head", total: 103, effects: ["Increases Intelligence.", "Apply Freeze at the start of battle."] },
    { assetId: 1631263106, trait: "Gladiator Helm", type: "Head", total: 55, effects: ["Increases Health.", "Increases Strength."] },
    { assetId: 1631266132, trait: "Purity", type: "Head", total: 111, effects: ["Gain Bless at start of battle."] },
    { assetId: 1631268297, trait: "Scarred", type: "Head", total: 81, effects: ["Increases Health.", "Increases Resist."] },
    { assetId: 1631271286, trait: "Snake", type: "Head", total: 108, effects: ["Apply Poison at start of battle."] },
    { assetId: 1631273225, trait: "Undead", type: "Head", total: 67, effects: ["Gain Nurture at start of battle.", "Gain Doom at start of battle."] },
    { assetId: 1631275042, trait: "Uni Horn", type: "Head", total: 104, effects: ["Gain Bless at start of battle.", "Increases Doom."] },
    { assetId: 1792637776, trait: "Farmer", type: "Head", total: 40, effects: ["Gain Nurture at start of battle."] },
    { assetId: 1792640216, trait: "Samurai", type: "Head", total: 40, effects: ["Gain Focus on melee hit."] },
    { assetId: 1935442966, trait: "Barbarian", type: "Head", total: 1, effects: ["Increases Strength.", "Decreases Accuracy."] },
    { assetId: 2311097574, trait: "Gold Hermes Helm", type: "Head", total: 10, effects: ["Gain Empower every melee hit."] },
    { assetId: 2311097577, trait: "Silver Hermes Helm", type: "Head", total: 75, effects: ["Gain Shield at start of battle."] },
    { assetId: 2311097585, trait: "Pirate Bandana", type: "Head", total: 65, effects: ["Increases Speed.", "Increases Drown."] },
    { assetId: 3586495600, trait: "Skel'tonian Mask", type: "Head", total: 5, effects: ["Gain Cleanse at start of battle.", "Increases Resist."] },
    { assetId: 3586495515, trait: "Frost", type: "Head", total: 30, effects: ["Apply Freeze at the start of battle.", "Resistance to Burn."] },
    { assetId: 3586495125, trait: "Cyclops", type: "Head", total: 45, effects: ["Increases Strength.", "Gain Strengthen upon suffering a magic hit."] },
    { assetId: 3668457190, trait: "Slayer", type: "Head", total: 35, effects: ["Resistance to Doom."] },
    { assetId: 3668457162, trait: "Ram", type: "Head", total: 35, effects: ["Gain Nurture on melee hit."] },
    { assetId: 3668457138, trait: "Cannibal", type: "Head", total: 35, effects: ["Heal when Bleed stacks are applied."] },
  ],
  Armour: [
    { assetId: 1631281879, trait: "Dark Knight Armour", type: "Armour", total: 39, effects: ["Gain Shield at the start of battle.", "Increases Doom."] },
    { assetId: 1631282734, trait: "Dragon Hunter Armour", type: "Armour", total: 63, effects: ["Increases Dexterity.", "Increases Burn."] },
    { assetId: 1631284233, trait: "Dragon Knight Armour", type: "Armour", total: 29, effects: ["Gain Shield at the start of battle.", "Increases Burn."] },
    { assetId: 1631286848, trait: "Gladiator Armour", type: "Armour", total: 47, effects: ["Increases Health.", "Increases Strength."] },
    { assetId: 1631293139, trait: "Hidden One", type: "Armour", total: 118, effects: ["Increases Intelligence."] },
    { assetId: 1631296742, trait: "Magicians Robe", type: "Armour", total: 84, effects: ["Increases speed of magic type moves."] },
    { assetId: 1631298825, trait: "Pharaoh", type: "Armour", total: 68, effects: ["Gain Empower at the start of battle."] },
    { assetId: 1631299446, trait: "Rags", type: "Armour", total: 157, effects: ["Increases Dexterity."] },
    { assetId: 1631302191, trait: "Shinobi", type: "Armour", total: 78, effects: ["Increases Speed."] },
    { assetId: 1631305105, trait: "Unchained", type: "Armour", total: 96, effects: ["Increases Doom."] },
    { assetId: 1642179694, trait: "Emperor Armour", type: "Armour", total: 15, effects: ["Increases Health.", "Gain Bless at the start of battle."] },
    { assetId: 1792645489, trait: "Elf Robe", type: "Armour", total: 40, effects: ["Increases Speed.", "Increases speed of ranged type moves."] },
    { assetId: 1792660153, trait: "Leather Garb", type: "Armour", total: 40, effects: ["Increases Health."] },
    { assetId: 1806077922, trait: "Executioner Robe", type: "Armour", total: 40, effects: ["Increases Bleed."] },
    { assetId: 2311097589, trait: "Pirate Coat", type: "Armour", total: 65, effects: ["Increases Speed.", "Increases Bleed."] },
    { assetId: 3586495594, trait: "Rogue", type: "Armour", total: 45, effects: ["Increases Speed.", "Increases Dexterity."] },
    { assetId: 3586495090, trait: "Arctic Shinobi", type: "Armour", total: 30, effects: ["Increases Speed.", "Resistance to Freeze."] },
    { assetId: 3668457150, trait: "Earth-Faction", type: "Armour", total: 35, effects: ["Resistance to Poison.", "Increases Nurture."] },
    { assetId: 3668457146, trait: "Dragon-Guard", type: "Armour", total: 35, effects: ["Resistance to Burn.", "Increases Shield."] },
  ],
  Extra: [
    { assetId: 1631307699, trait: "Crescent Moon Earring", type: "Extra", total: 50, effects: ["Increases Resist."] },
    { assetId: 1631308577, trait: "Dragon Fangs Earring", type: "Extra", total: 47, effects: ["Increases Burn."] },
    { assetId: 1631309418, trait: "Fusion Pearl Earring", type: "Extra", total: 49, effects: ["Increases Bless."] },
    { assetId: 2156520477, trait: "Tentacle Earring", type: "Extra", total: 45, effects: ["Increases Drown."] },
    { assetId: 2311097583, trait: "Hoop Earring", type: "Extra", total: 65, effects: ["Increases Health."] },
    { assetId: 3586495521, trait: "Golden Feathers", type: "Extra", total: 45, effects: ["Increases Speed.", "Increases Bless."] },
    { assetId: 3586495102, trait: "Battle Wound", type: "Extra", total: 45, effects: ["Increases Strength.", "Gain Bleed at the start of battle."] },
    { assetId: 3668457140, trait: "Crescent-Birthmark", type: "Extra", total: 35, effects: ["Resistance to Doom."] },
  ],
  Skin: [
    { trait: "Dark Skin", type: "Skin", champions: 195, effects: ["Increases Health.", "Increases Strength."] },
    { trait: "Tribal Dark Skin", type: "Skin", champions: 139, effects: ["Increases Health.", "Increases Poison."] },
    { trait: "Tribal Light Skin", type: "Skin", champions: 162, effects: ["Increases Dexterity.", "Increases Poison."] },
    { trait: "Fire Dragon", type: "Skin", champions: 43, effects: ["Apply Burn at the start of battle."] },
    { trait: "Undead", type: "Skin", champions: 86, effects: ["Gain Doom at the start of battle.", "Increases Strength."] },
    { trait: "Chameleon", type: "Skin", champions: 30, effects: ["Resistance to Poison."] },
    { trait: "Light Skin", type: "Skin", champions: 221, effects: ["Increases Intelligence."] },
    { trait: "Elder Dragon", type: "Skin", champions: 56, effects: ["Resistance to Burn."] },
    { trait: "Snake", type: "Skin", champions: 68, effects: ["Gain Cleanse at the start of battle."] },
  ],
}

export const TRAIT_EFFECTS = Object.values(CHAMPION_TRAITS)
  .flat()
  .reduce((acc, traitDef) => {
    if (traitDef?.assetId) acc[Number(traitDef.assetId)] = traitDef.effects || []
    return acc
  }, {})

export const CHAMPION_ASSET_TRAITS = Object.entries(CHAMPION_TRAITS)
  .filter(([type]) => type !== "Skin")
  .flatMap(([type, traitDefs]) =>
    (Array.isArray(traitDefs) ? traitDefs : [])
      .filter((traitDef) => traitDef?.assetId)
      .map((traitDef) => ({
        assetId: Number(traitDef.assetId),
        name: traitDef.trait,
        type,
        total: traitDef.total ?? null,
        damageRoll: traitDef.damageRoll ?? null,
        damageType: traitDef.damageType ?? null,
        speedFactor: traitDef.speedFactor ?? null,
        effects: traitDef.effects || [],
      }))
  )

export const CHAMPION_SKIN_TRAITS = (CHAMPION_TRAITS.Skin || []).map((traitDef) => ({
  assetId: null,
  name: traitDef.trait,
  type: "Skin",
  champions: traitDef.champions ?? null,
  effects: traitDef.effects || [],
}))

export const SKIN_EFFECTS = (CHAMPION_TRAITS.Skin || []).reduce((acc, traitDef) => {
  if (traitDef?.trait) acc[traitDef.trait] = traitDef.effects || []
  return acc
}, {})

export const TRAIT_TYPE_BY_ASSET_ID = Object.entries(CHAMPION_TRAITS).reduce(
  (acc, [type, traitDefs]) => {
    if (type === "Skin") return acc

    ;(Array.isArray(traitDefs) ? traitDefs : []).forEach((traitDef) => {
      if (traitDef?.assetId) acc[Number(traitDef.assetId)] = type
    })

    return acc
  },
  {}
)

export function classifyTraitType(assetId) {
  return TRAIT_TYPE_BY_ASSET_ID[Number(assetId)] || null
}
