const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onDocumentCreated, onDocumentWritten } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const { syncCouncilDiscord, queueProgressUpdate } = require('./council/discord');
const options = { region: 'us-central1', timeoutSeconds: 300, memory: '512MiB', maxInstances: 1,
  // Firebase discovers secret bindings before loading deployment .env values.
  // Keep this binding static; the handlers still respect the enabled flag.
  secrets: ['COUNCIL_DISCORD_BOT_TOKEN'] };
const database = () => admin.firestore(admin.apps.find(app => app.name === '[DEFAULT]') || admin.initializeApp());

exports.councilDiscordSync = onSchedule({ ...options, schedule: 'every 1 minutes' }, async () => {
  if (process.env.COUNCIL_DISCORD_ENABLED !== 'true') return;
  const result = await syncCouncilDiscord({ db: database() });
  console.log(JSON.stringify({ type: 'council_discord_sync', ...result }));
});

exports.councilDiscordReceipts = onDocumentCreated({ ...options, document: 'councilDiscordReceipts/{receipt}', retry: true }, async () => {
  if (process.env.COUNCIL_DISCORD_ENABLED !== 'true') return;
  await syncCouncilDiscord({ db: database(), scan: false });
});

exports.councilDiscordProgress = onDocumentWritten({ ...options, document: 'councilProgress/{proposal}', retry: true }, async event => {
  if (process.env.COUNCIL_DISCORD_ENABLED !== 'true' || !event.data?.after?.exists) return;
  const before = event.data.before?.data(), after = event.data.after.data();
  if (before?.revision === after.revision && before?.updatedAt === after.updatedAt) return;
  const db = database();
  await queueProgressUpdate({ db, report: after });
  await syncCouncilDiscord({ db, scan: false });
});
