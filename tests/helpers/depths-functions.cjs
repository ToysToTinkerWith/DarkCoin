const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { parse } = require("@babel/parser");
const moves = require("../../lib/depthsMoves");

// Load the real pure functions without initializing Firebase or rendering the pages.
function loadFunctions(file, names, context = {}) {
  const source = fs.readFileSync(path.resolve(__dirname, "../..", file), "utf8");
  const ast = parse(source, { sourceType: "module", plugins: ["jsx"] });
  const declarations = ast.program.body.filter((node) => node.type === "FunctionDeclaration" && names.includes(node.id.name));
  if (declarations.length !== names.length) throw new Error(`Missing test functions in ${file}`);
  return vm.runInNewContext(`${declarations.map((node) => source.slice(node.start, node.end)).join("\n")}\n({${names.join(",")}})`, { ...moves, ...context });
}

function loadReplayFunctions() {
  return loadFunctions("pages/api/arena/depthsState.js", [
    "stableStringify", "createIntegrityHash", "safeNumber", "asArray", "normalizeAssetId",
    "normalizeVerificationNumberMap", "normalizeVerificationMove", "normalizeVerificationFighter",
    "reduceBattleSnapshotForVerification", "createReplaySnapshotHash", "getReplayFighter", "findReplayMove",
    "throwBattleReplayError", "validateReplayActionTarget", "validateBattleActionReplay", "getBattleSnapshotWinner",
    "buildBattleVerificationFields",
  ], { crypto: require("node:crypto"), getStateTokenSecret: () => "test-only-integrity-key", serverTimestamp: () => "test-timestamp" });
}

module.exports = { loadFunctions, loadReplayFunctions };
