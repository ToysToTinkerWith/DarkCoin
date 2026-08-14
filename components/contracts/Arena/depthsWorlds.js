export const DEPTHS_MONSTER_WORLD_OPTIONS = [
  {
    key: "start",
    label: "Start",
    color: "#e1b864",
    description: "The opening dungeon arena used by encounter 1.",
  },
  {
    key: "purple",
    label: "Purple",
    color: "#b681ff",
    description: "The violet ruin world used by early Depths encounters.",
  },
  {
    key: "cyan",
    label: "Cyan",
    color: "#5fe9ff",
    description: "The blue-cyan cavern world used by middle Depths encounters.",
  },
  {
    key: "red",
    label: "Red",
    color: "#ff5b4e",
    description: "The infernal red world used by deeper Depths encounters.",
  },
];

export const DEPTHS_ENCOUNTER_WORLD_BREAKDOWN = [
  {
    encounters: "E1",
    rooms: "Encounter 1",
    worlds: ["start"],
    note: "Regular dungeon opening arena.",
  },
  {
    encounters: "E2-E5",
    rooms: "Encounters 2-5",
    worlds: ["purple"],
    note: "Purple ruin / violet cavern rooms.",
  },
  {
    encounters: "E6",
    rooms: "Encounter 6",
    worlds: ["purple", "cyan"],
    note: "Bridge room with both purple and cyan elements.",
  },
  {
    encounters: "E7-E9",
    rooms: "Encounters 7-9",
    worlds: ["cyan"],
    note: "Cyan/blue cavern and ruin rooms.",
  },
  {
    encounters: "E10",
    rooms: "Encounter 10",
    worlds: ["cyan", "red"],
    note: "Split cyan and red arena, so either world can appear.",
  },
  {
    encounters: "E11-E14",
    rooms: "Encounters 11-14",
    worlds: ["red"],
    note: "Red infernal rooms.",
  },
  {
    encounters: "E14+",
    rooms: "Encounters 15+",
    worlds: ["red"],
    note: "The battle background clamps to E14 after the fourteenth encounter.",
  },
];

const DEPTHS_WORLD_ALIASES = {
  blue: "cyan",
  teal: "cyan",
  aqua: "cyan",
  crimson: "red",
  infernal: "red",
  violet: "purple",
  opening: "start",
};

export function normalizeDepthsWorldKey(value) {
  const key = String(value || "").toLowerCase().trim();
  return DEPTHS_WORLD_ALIASES[key] || key;
}

export function normalizeDepthsMonsterWorlds(value) {
  const raw = Array.isArray(value) ? value : [];
  const allowed = new Set(DEPTHS_MONSTER_WORLD_OPTIONS.map((option) => option.key));
  return [
    ...new Set(
      raw
        .map(normalizeDepthsWorldKey)
        .filter((key) => allowed.has(key))
    ),
  ];
}

export function getDepthsEncounterWorldKeys(encounterNumber = 1) {
  const number = Number(encounterNumber);
  const encounter = Number.isFinite(number) ? Math.max(1, Math.floor(number)) : 1;

  if (encounter <= 1) return ["start"];
  if (encounter <= 5) return ["purple"];
  if (encounter === 6) return ["purple", "cyan"];
  if (encounter <= 9) return ["cyan"];
  if (encounter === 10) return ["cyan", "red"];
  return ["red"];
}

export function getDepthsMonsterWorlds(monster = {}) {
  return normalizeDepthsMonsterWorlds(
    monster.depthsWorlds ||
      monster.depthsEncounterWorlds ||
      monster.availableDepthsWorlds ||
      monster.monsterObj?.depthsWorlds ||
      monster.monsterObj?.depthsEncounterWorlds ||
      monster.monsterObj?.availableDepthsWorlds ||
      []
  );
}

export function isMonsterAvailableForDepthsWorld(monster = {}, worldKeys = []) {
  const worlds = getDepthsMonsterWorlds(monster);
  const keys = normalizeDepthsMonsterWorlds(worldKeys);
  if (!worlds.length || !keys.length) return false;
  return keys.some((key) => worlds.includes(key));
}
