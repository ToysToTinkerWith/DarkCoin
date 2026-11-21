// Compile first: python ArenaTreasury.py
// Then choose ONE action in main() below and run: node deployment.js
// This file is CommonJS; the implementation is loaded as ESM without warnings.
const actions = () => import('./deployment-actions.mjs');
exports.createApp = async (...args) => (await actions()).createApp(...args);
exports.updateApp = async (...args) => (await actions()).updateApp(...args);

async function main() {
 const {createApp, updateApp} = await actions();
 // The creator wallet is also the reward oracle; no separate address is needed.
 // await createApp();
 await updateApp(3658640544);
}
exports.main = main;
if (require.main === module) {
 main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
