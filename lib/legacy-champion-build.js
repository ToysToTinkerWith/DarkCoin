// Same allocations and validation as the original 2D champion generator.
const NEGATIVE_MOVE_EFFECTS=['poison','bleed','burn','freeze','slow','paralyze','drown','doom'];
const POSITIVE_MOVE_EFFECTS=['shield','strengthen','empower','hasten','nurture','bless','focus','cleanse'];
const USER_BUILD_MOVE_CLASSES=['damage','curse','buff'],USER_BUILD_MOVE_RANGES=['melee','ranged','magic'],USER_BUILD_STAT_KEYS=['strength','dexterity','intelligence'];
const normalizeMoveClass=v=>USER_BUILD_MOVE_CLASSES.includes(v)?v:null;
const normalizeMoveRange=v=>USER_BUILD_MOVE_RANGES.includes(v)?v:null;
const normalizeEffectKey=v=>[...NEGATIVE_MOVE_EFFECTS,...POSITIVE_MOVE_EFFECTS].includes(v)?v:null;
const countBy=values=>values.reduce((a,v)=>({...a,[v]:(a[v]||0)+1}),{});
export function normalizeAndValidateGenerationBuild(rawBuild) {
  if (!rawBuild || typeof rawBuild !== "object") {
    throw new Error("Missing generationBuild. User must complete the champion build before generation.");
  }

  const rawMoves = Array.isArray(rawBuild.moves) ? rawBuild.moves : [];
  if (rawMoves.length !== 3) {
    throw new Error("Invalid generationBuild: exactly 3 moves are required.");
  }

  const moves = rawMoves.map((move, index) => {
    const moveClass = normalizeMoveClass(move.class || String(move.type || "").split(" ")[1]);
    const moveRange = normalizeMoveRange(move.range || String(move.type || "").split(" ")[0]);
    const effect = normalizeEffectKey(move.effect);

    if (!moveClass || !moveRange || !effect) {
      throw new Error(`Invalid generationBuild: move ${index + 1} needs range, class, and effect.`);
    }

    if ((moveClass === "damage" || moveClass === "curse") && !NEGATIVE_MOVE_EFFECTS.includes(effect)) {
      throw new Error(`Invalid generationBuild: move ${index + 1} must use a negative effect.`);
    }

    if (moveClass === "buff" && !POSITIVE_MOVE_EFFECTS.includes(effect)) {
      throw new Error(`Invalid generationBuild: move ${index + 1} must use a positive effect.`);
    }

    return {
      slot: Number(move.slot || index + 1),
      range: moveRange,
      class: moveClass,
      type: `${moveRange} ${moveClass}`,
      effect,
      cooldown: 3,
    };
  });

  const classCounts = countBy(moves.map((move) => move.class));
  const rangeCounts = countBy(moves.map((move) => move.range));

  for (const moveClass of USER_BUILD_MOVE_CLASSES) {
    if (Number(classCounts[moveClass] || 0) > 2) {
      throw new Error(`Invalid generationBuild: only 2 ${moveClass} moves are allowed.`);
    }
  }

  for (const moveRange of USER_BUILD_MOVE_RANGES) {
    if (Number(rangeCounts[moveRange] || 0) > 2) {
      throw new Error(`Invalid generationBuild: only 2 ${moveRange} moves are allowed.`);
    }
  }

  const selectedEffects = moves.map((move) => move.effect);
  if (new Set(selectedEffects).size !== selectedEffects.length) {
    throw new Error("Invalid generationBuild: move effects must be unique.");
  }

  const rawStats = rawBuild.stats || {};
  const stats = USER_BUILD_STAT_KEYS.reduce((acc, key) => {
    acc[key] = Number(rawStats[key] || 0);
    return acc;
  }, {});

  for (const key of USER_BUILD_STAT_KEYS) {
    if (!Number.isInteger(stats[key]) || stats[key] < 0) {
      throw new Error(`Invalid generationBuild: ${key} points must be a non-negative integer.`);
    }
    if (stats[key] > 8) {
      throw new Error(`Invalid generationBuild: ${key} can only have 8 points max.`);
    }
  }

  const statTotal = USER_BUILD_STAT_KEYS.reduce((sum, key) => sum + stats[key], 0);
  if (statTotal !== 10) {
    throw new Error("Invalid generationBuild: exactly 10 stat points are required.");
  }

  const rawEffectPoints = rawBuild.effectPoints || {};
  const effectPoints = selectedEffects.reduce((acc, effectKey) => {
    acc[effectKey] = Number(rawEffectPoints[effectKey] || 0);
    return acc;
  }, {});

  for (const effectKey of selectedEffects) {
    if (!Number.isInteger(effectPoints[effectKey]) || effectPoints[effectKey] < 0) {
      throw new Error(`Invalid generationBuild: ${effectKey} points must be a non-negative integer.`);
    }
    if (effectPoints[effectKey] > 4) {
      throw new Error(`Invalid generationBuild: ${effectKey} can only have 4 effect points max.`);
    }
  }

  const effectTotal = selectedEffects.reduce((sum, effectKey) => sum + Number(effectPoints[effectKey] || 0), 0);
  if (effectTotal !== 6) {
    throw new Error("Invalid generationBuild: exactly 6 effect points are required.");
  }

  return {
    moves,
    stats,
    effectPoints,
    totals: {
      statPointsUsed: statTotal,
      effectPointsUsed: effectTotal,
    },
  };
}

