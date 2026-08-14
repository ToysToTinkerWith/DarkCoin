import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SCRIPT_BY_NAME = {
  group: "darkGroupFight.js",
  darkGroupFight: "darkGroupFight.js",
  team: "darkTeamFight.js",
  darkTeamFight: "darkTeamFight.js",
  dark: "darkFight.js",
  darkFight: "darkFight.js",
};

const requestedScript = process.env.FIGHT_SCRIPT || process.argv[2] || "darkGroupFight";
const scriptFile = SCRIPT_BY_NAME[requestedScript] || requestedScript;
const runtimeScriptPath = path.resolve("runtime", scriptFile);

if (!fs.existsSync(runtimeScriptPath)) {
  throw new Error(
    `Fight script "${requestedScript}" was not found at ${runtimeScriptPath}. ` +
      "Make sure the script is copied into the Cloud Run job image."
  );
}

console.log(`Starting Cloud Run fight job: ${scriptFile}`);
await import(pathToFileURL(runtimeScriptPath).href);
console.log(`Cloud Run fight job finished: ${scriptFile}`);
