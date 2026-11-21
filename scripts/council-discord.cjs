// Discord configuration/status and explicitly requested synchronization.
// Authentication stays in the local secret environment, never command arguments.
const fs = require('node:fs'), path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
for (const name of ['.env', '.env.deployment.local']) require('dotenv').config({ path: path.join(ROOT, name), quiet: true });
const { discordConfiguration, discordClient, inspectDiscord, syncCouncilDiscord, queueConfirmedReceipt, PERMISSIONS } = require('../functions/council/discord');

function botInvite(applicationId, guildId, mode = 'thread') {
  if (!/^\d{16,22}$/.test(applicationId || '')) throw Error('Provide the bot application ID.');
  const names = ['VIEW_CHANNEL', 'SEND_MESSAGES', 'EMBED_LINKS', 'ATTACH_FILES', 'READ_MESSAGE_HISTORY', 'PIN_MESSAGES',
    ...(mode === 'thread' ? ['CREATE_PUBLIC_THREADS', 'SEND_MESSAGES_IN_THREADS'] : ['MANAGE_CHANNELS'])];
  const permissions = names.reduce((sum, name) => sum | PERMISSIONS[name], 0n);
  const url = new URL('https://discord.com/oauth2/authorize');
  url.searchParams.set('client_id', applicationId); url.searchParams.set('scope', 'bot'); url.searchParams.set('permissions', permissions.toString());
  if (guildId) { url.searchParams.set('guild_id', guildId); url.searchParams.set('disable_guild_select', 'true'); }
  return url.toString();
}
async function main(args = process.argv.slice(2)) {
  const [command = 'status', value] = args, config = discordConfiguration();
  if (command === 'invite') { console.log(botInvite(value, config.guildId, config.mode)); return; }
  if (command === 'status') {
    if (!process.env.COUNCIL_DISCORD_BOT_TOKEN) {
      console.log(JSON.stringify({ enabled: config.enabled, ready: false, guildId: config.guildId, categoryId: config.categoryId, mode: config.mode, parentChannelId: config.parentChannelId,
        missing: ['COUNCIL_DISCORD_BOT_TOKEN'], note: 'Configure an installed Discord bot to create proposal discussions in the existing channel.' }, null, 2)); return;
    }
    console.log(JSON.stringify({ enabled: config.enabled, ...await inspectDiscord({ discord: discordClient(), config }) }, null, 2)); return;
  }
  if (!['sync', 'backfill', 'queue-tx'].includes(command)) throw Error('Usage: council-discord.cjs status | invite APPLICATION_ID | sync | backfill | queue-tx CONFIRMED_TXID');
  const admin = require('firebase-admin'), options = {};
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(path.join(ROOT, 'service.json'))) {
    const credentials = JSON.parse(fs.readFileSync(path.join(ROOT, 'service.json'))); options.credential = admin.credential.cert(credentials); options.projectId = credentials.project_id;
  } else options.credential = admin.credential.applicationDefault();
  const app = admin.initializeApp(options, `council-discord-${process.pid}`), db = app.firestore();
  try {
    if (command === 'queue-tx') console.log(JSON.stringify(await queueConfirmedReceipt({ db, txid: value, config }), null, 2));
    else {
      if (!config.enabled) throw Error('Set COUNCIL_DISCORD_ENABLED=true after bot permissions are verified.');
      const discord = discordClient(), status = await inspectDiscord({ discord, config });
      if (!status.ready) throw Error(`Discord bot permissions are missing: ${status.missing.join(', ')}`);
      console.log(JSON.stringify(await syncCouncilDiscord({ db, config, discord }), null, 2));
    }
  } finally { await app.delete(); }
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { botInvite, main };
