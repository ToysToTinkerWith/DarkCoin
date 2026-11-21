function getDepthsMoveId(move = {}, index = 0) {
  return String(move?.id || move?.moveId || move?.cardId || move?.depthsCardId || `${index}-${move?.name || "move"}`);
}

function findDepthsReplayMove(moves = [], moveId = "") {
  const wanted = String(moveId || "");
  if (!wanted || !Array.isArray(moves)) return null;
  const exact = moves.filter((move) => String(move?.id || move?.name || "") === wanted);
  if (exact.length) return exact.length === 1 ? exact[0] : null;

  // Older run compaction replaced generated "index-name" IDs with bare names.
  // Only accept that alias when the server's own catalog identifies one move.
  const aliases = moves.filter((move, index) => {
    const name = String(move?.name || "");
    const id = String(move?.id || name);
    if (!name) return false;
    return (wanted === name && /^\d+-/.test(id) && id.slice(id.indexOf("-") + 1) === name) ||
      (id === name && wanted === `${index}-${name}`);
  });
  return aliases.length === 1 && moves.filter((move) => move?.name === aliases[0].name).length === 1 ? aliases[0] : null;
}

function restoreDepthsMoveIds(moves = [], catalog = []) {
  return moves.map((move) => {
    const saved = findDepthsReplayMove(catalog, move?.id || move?.name);
    return saved ? { ...move, id: saved.id || saved.name } : move;
  });
}

module.exports = { getDepthsMoveId, findDepthsReplayMove, restoreDepthsMoveIds };
