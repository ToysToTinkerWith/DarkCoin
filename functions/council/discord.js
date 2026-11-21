const crypto = require('node:crypto');
const sdk = require('algosdk');
const { configuration, readCouncil } = require('./chain');
const { loadManifest } = require('./content');
const { formatUnits, KINDS, STATES } = require('./model');

const API = 'https://discord.com/api/v10';
const TXID = /^[A-Z2-7]{52}$/;
const SNOWFLAKE = /^\d{16,22}$/;
const ACTIVATION_ROUND = 67113001;
const METHODS = new Set(['propose', 'vote', 'finalize', 'execute', 'claim']);
const PERMISSIONS = { MANAGE_CHANNELS: 1n << 4n, VIEW_CHANNEL: 1n << 10n, SEND_MESSAGES: 1n << 11n, EMBED_LINKS: 1n << 14n, ATTACH_FILES: 1n << 15n,
  READ_MESSAGE_HISTORY: 1n << 16n, CREATE_PUBLIC_THREADS: 1n << 35n, SEND_MESSAGES_IN_THREADS: 1n << 38n, PIN_MESSAGES: 1n << 51n };
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const scopeOf = config => `${config.network}-${config.appId}`;
const proposalKey = (config, id) => `${scopeOf(config)}-${id}`;
const short = value => `${String(value).slice(0, 8)}…${String(value).slice(-6)}`;
const amount = value => `${formatUnits(value || '0', 6)} ALGO`;
const json = value => JSON.parse(JSON.stringify(value, (_, item) => typeof item === 'bigint' ? String(item) : item));

function discordConfiguration(env = process.env) {
  const chain = configuration();
  const site = new URL(env.COUNCIL_SITE || 'https://dark-coin.com');
  if (site.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(site.hostname)) throw Error('Use an HTTPS Council site.');
  const guildId = env.COUNCIL_DISCORD_GUILD_ID || '', categoryId = env.COUNCIL_DISCORD_CATEGORY_ID || '', parentChannelId = env.COUNCIL_DISCORD_PARENT_CHANNEL_ID || '';
  if (guildId && !SNOWFLAKE.test(guildId)) throw Error('Invalid Council Discord server ID.');
  if (categoryId && !SNOWFLAKE.test(categoryId)) throw Error('Invalid Council Discord category ID.');
  if (parentChannelId && !SNOWFLAKE.test(parentChannelId)) throw Error('Invalid Council Discord parent channel ID.');
  const mode = env.COUNCIL_DISCORD_DISCUSSION_MODE || (parentChannelId ? 'thread' : 'channel');
  if (!['thread', 'channel'].includes(mode)) throw Error('Choose thread or channel for Council Discord discussions.');
  return { ...chain, site: site.origin, guildId, categoryId, parentChannelId, mode, enabled: env.COUNCIL_DISCORD_ENABLED === 'true', pinDetails: env.COUNCIL_DISCORD_PIN_DETAILS !== 'false',
    startRound: Number(env.COUNCIL_DISCORD_START_ROUND || (chain.network === 'mainnet' ? ACTIVATION_ROUND : 1)) };
}

class DiscordError extends Error {
  constructor(status, code, retryAfterMs = 0) {
    super(status === 429 ? 'Discord rate limit; delivery will retry.' : `Discord request failed (${status}${code ? `, code ${code}` : ''}).`);
    this.status = status; this.discordCode = code; this.retryAfterMs = retryAfterMs;
  }
}

function discordClient({ token = process.env.COUNCIL_DISCORD_BOT_TOKEN, fetchImpl = fetch } = {}) {
  if (!token || /\s/.test(token)) throw Error('Council Discord bot authentication is not configured.');
  const request = async (method, route, body) => {
    if (!route.startsWith('/') || route.includes('://')) throw Error('Invalid Discord API route.');
    let response;
    try { response = await fetchImpl(API + route, { method, headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'DarkCoinCouncil (https://dark-coin.com, 1.0)' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(20000) }); }
    catch { throw new DiscordError(0, 'network'); }
    let value = null;
    try { if (response.status !== 204) value = await response.json(); } catch { /* Error text may contain untrusted details; never echo it. */ }
    if (!response.ok) throw new DiscordError(response.status, value?.code, response.status === 429 ? Math.max(1000, Math.ceil(Number(value?.retry_after || response.headers?.get?.('retry-after') || 60) * 1000)) : 0);
    return value;
  };
  let botIdentity;
  return { request, botId: async () => { if (!botIdentity) botIdentity = (await request('GET', '/users/@me')).id; return botIdentity; } };
}

function effectivePermissions(guild, member, channel) {
  let value = BigInt(guild.roles.find(role => role.id === guild.id)?.permissions || 0);
  for (const role of guild.roles) if ((member.roles || []).includes(role.id)) value |= BigInt(role.permissions || 0);
  if ((value & 8n) !== 0n || guild.owner_id === member.user?.id) return (1n << 63n) - 1n;
  const overwrites = channel?.permission_overwrites || [];
  const everyone = overwrites.find(item => item.id === guild.id && Number(item.type) === 0);
  if (everyone) value = (value & ~BigInt(everyone.deny || 0)) | BigInt(everyone.allow || 0);
  let allow = 0n, deny = 0n;
  for (const item of overwrites) if (Number(item.type) === 0 && (member.roles || []).includes(item.id)) { allow |= BigInt(item.allow || 0); deny |= BigInt(item.deny || 0); }
  value = (value & ~deny) | allow;
  const own = overwrites.find(item => Number(item.type) === 1 && item.id === member.user?.id);
  return own ? (value & ~BigInt(own.deny || 0)) | BigInt(own.allow || 0) : value;
}

async function inspectDiscord({ discord, config = discordConfiguration() }) {
  const bot = await discord.request('GET', '/users/@me');
  if (!bot.bot) throw Error('Council Discord authentication must belong to a bot.');
  if (!config.guildId) {
    const guilds = await discord.request('GET', '/users/@me/guilds');
    return { ready: false, bot: { id: bot.id, username: bot.username }, guilds: guilds.map(g => ({ id: g.id, name: g.name })), missing: ['COUNCIL_DISCORD_GUILD_ID'] };
  }
  const [guild, member, category, parent] = await Promise.all([discord.request('GET', `/guilds/${config.guildId}`), discord.request('GET', `/guilds/${config.guildId}/members/${bot.id}`),
    config.categoryId ? discord.request('GET', `/channels/${config.categoryId}`) : null,
    config.parentChannelId ? discord.request('GET', `/channels/${config.parentChannelId}`) : null]);
  if (category && (category.guild_id !== config.guildId || Number(category.type) !== 4)) throw Error('Council Discord category does not belong to the configured server.');
  if (parent && (parent.guild_id !== config.guildId || ![0, 5, 15].includes(Number(parent.type)))) throw Error('Choose an existing text, announcement or forum channel in the configured server.');
  const permissions = effectivePermissions(guild, member, config.mode === 'thread' ? parent : category);
  const required = ['VIEW_CHANNEL', 'SEND_MESSAGES', 'EMBED_LINKS', 'READ_MESSAGE_HISTORY',
    ...(config.mode === 'thread' ? ['SEND_MESSAGES_IN_THREADS', ...(Number(parent?.type) === 15 ? [] : ['CREATE_PUBLIC_THREADS'])] : ['MANAGE_CHANNELS'])];
  const missing = required.filter(name => (permissions & PERMISSIONS[name]) === 0n);
  if (config.mode === 'thread' && !parent) missing.push('COUNCIL_DISCORD_PARENT_CHANNEL_ID');
  return { ready: missing.length === 0, bot: { id: bot.id, username: bot.username }, guild: { id: guild.id, name: guild.name },
    mode: config.mode, parent: parent ? { id: parent.id, name: parent.name, type: parent.type } : null,
    category: category ? { id: category.id, name: category.name } : null, missing, canPin: (permissions & PERMISSIONS.PIN_MESSAGES) !== 0n,
    categories: (await discord.request('GET', `/guilds/${config.guildId}/channels`)).filter(c => Number(c.type) === 4).map(c => ({ id: c.id, name: c.name })) };
}

function textChunks(text, length = 1750) {
  const result = []; let chunk = '';
  for (const symbol of String(text)) { if (chunk.length + symbol.length > length) { result.push(chunk); chunk = ''; } chunk += symbol; }
  if (chunk) result.push(chunk);
  return result;
}
function markerFor(config, p) { return `DarkCoin Council | ${scopeOf(config)} | proposal ${p.id} | ${p.digest}`; }
function channelName(p) {
  const slug = String(p.title).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `proposal-${p.id}-${slug || 'discussion'}`.slice(0, 100).replace(/-$/, '');
}
function receiptMarker(key) { return `Council receipt ${sha(key).slice(0, 32)}`; }
function decorateMessage(body, key) {
  const marker = receiptMarker(key), result = { ...body, allowed_mentions: { parse: [], users: [], roles: [], replied_user: false }, nonce: `dcc${sha(key).slice(0, 20)}`, enforce_nonce: true };
  if (result.embeds?.length) result.embeds = result.embeds.map((embed, i) => i === 0 ? { ...embed, footer: { text: marker } } : embed);
  else result.content = `${body.content || ''}\n\n-# ${marker}`;
  return result;
}
function hasMarker(message, key) {
  const marker = receiptMarker(key);
  return String(message.content || '').endsWith(`-# ${marker}`) || (message.embeds || []).some(embed => embed.footer?.text === marker);
}

async function reconcileMessage(discord, channelId, key, attemptedAt) {
  let before;
  const cutoff = Number(attemptedAt) - 60000;
  const authorId = discord.botId ? await discord.botId() : (await discord.request('GET', '/users/@me')).id;
  for (let page = 0; page < 100; page++) {
    const list = await discord.request('GET', `/channels/${channelId}/messages?limit=100${before ? `&before=${before}` : ''}`);
    const found = list.find(message => message.author?.id === authorId && message.author?.bot === true && hasMarker(message, key));
    if (found) return found;
    if (!list.length || list.some(message => Date.parse(message.timestamp) < cutoff)) return null;
    before = list.at(-1).id;
  }
  throw Error('Council message history reconciliation needs operator review; no duplicate was posted.');
}

async function deliverMessage({ db, discord, config, proposalId, channelId, key, body, now = Date.now }) {
  key = `${channelId}:${key}`;
  const ref = db.collection('councilDiscordProposals').doc(proposalKey(config, proposalId)).collection('messages').doc(sha(key));
  const previous = (await ref.get()).data();
  if (previous?.messageId) return previous.messageId;
  if (previous?.attemptedAt) {
    const existing = await reconcileMessage(discord, channelId, key, previous.attemptedAt);
    if (existing) { await ref.set({ channelId, messageId: existing.id, sentAt: now(), reconciled: true }); return existing.id; }
  }
  await ref.set({ channelId, status: 'sending', attemptedAt: previous?.attemptedAt || now(), keyHash: sha(key) });
  const message = await discord.request('POST', `/channels/${channelId}/messages`, decorateMessage(body, key));
  if (!SNOWFLAKE.test(String(message?.id))) throw Error('Discord did not return a message identity.');
  await ref.set({ channelId, messageId: message.id, sentAt: now(), status: 'sent' });
  return message.id;
}

function proposalMessages(config, p) {
  const url = `${config.site}/council/dao/${p.id}`;
  const first = { embeds: [{ title: `Proposal #${p.id}: ${p.title}`.slice(0, 256), url, color: 0xc9a765,
    description: `A proposal has been submitted to the Council. Discuss it here and vote on the website.\n\n[Read the proposal and vote](${url})`,
    fields: [{ name: 'Submitted by', value: String(p.owner), inline: false }, { name: 'Voting closes', value: `<t:${p.deadline}:F>`, inline: true },
      { name: 'Required participation', value: `${p.minVotes} NFTs`, inline: true }, { name: 'Approval', value: `${Number(p.approvalBps) / 100}% Yes among Yes + No`, inline: true },
      { name: 'First-vote reward', value: amount(p.rewardPerVote), inline: true }, { name: 'Proposal fee', value: amount(p.fee), inline: true }],
    thumbnail: { url: `${config.site}/home/councilLogo.png` } }] };
  const messages = [first];
  for (const [index, text] of textChunks(p.body).entries()) messages.push({ content: `${index === 0 ? '**Original proposal**\n\n' : ''}${text}` });
  for (const [index, media] of (p.images || []).entries()) {
    const kind = media.kind === 'video' || String(media.contentType || '').startsWith('video/') ? 'Video' : 'Image';
    messages.push({ content: `**${kind} ${index + 1}${media.name ? ` — ${String(media.name).slice(0, 180)}` : ''}**\n${String(media.caption || '').slice(0, 500)}\n${config.site}/api/council/image?hash=${media.hash}` });
  }
  if (p.actions?.length) {
    const actions = p.actions.map((action, index) => `Action ${index + 1} — ${KINDS[Number(action.kind)]}\n${JSON.stringify(action)}`).join('\n\n');
    for (const text of textChunks(actions)) messages.push({ content: `**Approved instructions to be voted on**\n\n${text}` });
  }
  return messages;
}

async function ensureGuildChannel({ db, discord, config, proposal, now = Date.now }) {
  if (!config.guildId || !SNOWFLAKE.test(config.guildId)) throw Error('Council Discord server is not configured.');
  const p = proposal, ref = db.collection('councilDiscordProposals').doc(proposalKey(config, p.id)), previous = (await ref.get()).data();
  if (previous?.digest && previous.digest !== p.digest) throw Error('Discord proposal identity differs from the approved content.');
  const marker = markerFor(config, p);
  let channel;
  if (previous?.channelId) {
    try { channel = await discord.request('GET', `/channels/${previous.channelId}`); }
    catch (error) { if (error.status !== 404) throw error; }
    if (channel && (channel.guild_id !== config.guildId || Number(channel.type) !== 0 || !String(channel.topic || '').startsWith(marker))) throw Error('Recorded Discord channel no longer matches this proposal.');
  }
  if (!channel) {
    const channels = await discord.request('GET', `/guilds/${config.guildId}/channels`);
    channel = channels.find(item => Number(item.type) === 0 && String(item.topic || '').startsWith(marker) && (!config.categoryId || item.parent_id === config.categoryId));
    if (!channel) channel = await discord.request('POST', `/guilds/${config.guildId}/channels`, { name: channelName(p), type: 0,
      topic: `${marker}\n${config.site}/council/dao/${p.id}`, ...(config.categoryId ? { parent_id: config.categoryId } : {}), rate_limit_per_user: 5 });
  }
  if (!SNOWFLAKE.test(String(channel.id))) throw Error('Discord did not return a channel identity.');
  const discussionUrl = `https://discord.com/channels/${config.guildId}/${channel.id}`;
  await ref.set({ network: config.network, appId: config.appId, proposalId: p.id, digest: p.digest, guildId: config.guildId, channelId: channel.id,
    discussionUrl, url: discussionUrl, title: p.title, mode: 'channel', updatedAt: now(), createdAt: previous?.createdAt || now(), state: 'ready',
    ...(previous?.channelId === channel.id ? {} : { detailsPinned: false }) }, { merge: true });
  const parts = proposalMessages(config, p);
  for (let index = 0; index < parts.length; index++) {
    const messageId = await deliverMessage({ db, discord, config, proposalId: p.id, channelId: channel.id, key: `proposal-${p.digest}-${index}`, body: parts[index], now });
    if (index === 0 && config.pinDetails && !(previous?.channelId === channel.id && previous?.detailsPinned)) {
      try { await discord.request('PUT', `/channels/${channel.id}/messages/pins/${messageId}`); await ref.set({ detailsPinned: true }, { merge: true }); }
      catch (error) { if (error.status !== 403) throw error; await ref.set({ pinPermissionMissing: true }, { merge: true }); }
    }
  }
  return { channelId: channel.id, discussionUrl };
}

async function reopenThread(discord, thread) {
  if (thread.thread_metadata?.locked) throw new DiscordError(403, 'thread_locked');
  if (thread.thread_metadata?.archived) return discord.request('PATCH', `/channels/${thread.id}`, { archived: false });
  return thread;
}

async function forumDiscussion(discord, config, p, attemptedAt) {
  const identity = `forum-starter-${scopeOf(config)}-${p.digest}`, prefix = `proposal-${p.id}-`;
  const botId = discord.botId ? await discord.botId() : (await discord.request('GET', '/users/@me')).id;
  const inspect = async threads => {
    for (const thread of threads.filter(item => item.parent_id === config.parentChannelId && String(item.name).startsWith(prefix))) {
      const starter = await discord.request('GET', `/channels/${thread.id}/messages/${thread.id}`);
      if (starter.author?.id === botId && starter.author?.bot && hasMarker(starter, identity)) return thread;
    }
    return null;
  };
  const active = await discord.request('GET', `/guilds/${config.guildId}/threads/active`);
  let found = await inspect(active.threads || []); if (found || !attemptedAt) return found;
  let before;
  for (let page = 0; page < 100; page++) {
    const list = await discord.request('GET', `/channels/${config.parentChannelId}/threads/archived/public?limit=100${before ? `&before=${encodeURIComponent(before)}` : ''}`);
    found = await inspect(list.threads || []); if (found) return found;
    if (!list.has_more || !list.threads?.length) return null;
    const last = list.threads.at(-1).thread_metadata?.archive_timestamp;
    if (!last || Date.parse(last) < Number(attemptedAt) - 60000) return null;
    before = last;
  }
  throw Error('Forum proposal reconciliation needs operator review; no duplicate discussion was created.');
}

async function ensureThreadChannel({ db, discord, config, proposal: p, now = Date.now }) {
  if (!SNOWFLAKE.test(config.parentChannelId || '')) throw Error('Configure the existing Council discussion channel.');
  const parent = await discord.request('GET', `/channels/${config.parentChannelId}`);
  if (parent.guild_id !== config.guildId || ![0, 5, 15].includes(Number(parent.type))) throw Error('Council discussion parent must be a text, announcement or forum channel in this server.');
  const ref = db.collection('councilDiscordProposals').doc(proposalKey(config, p.id)), previous = (await ref.get()).data() || {};
  if (previous.digest && previous.digest !== p.digest) throw Error('Discord proposal identity differs from the approved content.');
  if (previous.channelId && previous.mode !== 'thread') throw Error('This proposal already has a channel discussion; do not create a second discussion.');
  const forum = Number(parent.type) === 15;
  let thread, starterMessageId = previous.starterMessageId;
  if (previous.channelId) {
    try { thread = await discord.request('GET', `/channels/${previous.channelId}`); }
    catch (error) { if (error.status !== 404) throw error; }
  }
  if (!thread && forum) {
    thread = await forumDiscussion(discord, config, p, previous.creationAttemptedAt);
    if (!thread) {
      await ref.set({ digest: p.digest, proposalId: p.id, mode: 'thread', creationAttemptedAt: previous.creationAttemptedAt || now() }, { merge: true });
      thread = await discord.request('POST', `/channels/${parent.id}/threads`, { name: channelName(p), auto_archive_duration: 1440, rate_limit_per_user: 5,
        message: decorateMessage(proposalMessages(config, p)[0], `forum-starter-${scopeOf(config)}-${p.digest}`) });
    }
    starterMessageId = thread.id;
  } else if (!thread) {
    // Discord assigns a message-created public thread the starter message's ID.
    // Persist/reconcile that message first: a crashed create cannot create a
    // second thread for the same immutable proposal starter.
    starterMessageId = await deliverMessage({ db, discord, config, proposalId: p.id, channelId: parent.id,
      key: `thread-starter-${p.digest}`, body: proposalMessages(config, p)[0], now });
    try { thread = await discord.request('GET', `/channels/${starterMessageId}`); }
    catch (error) { if (error.status !== 404) throw error; }
    if (!thread) {
      try { thread = await discord.request('POST', `/channels/${parent.id}/messages/${starterMessageId}/threads`, { name: channelName(p), auto_archive_duration: 1440, rate_limit_per_user: 5 }); }
      catch (error) {
        if (![400, 409].includes(error.status)) throw error;
        thread = await discord.request('GET', `/channels/${starterMessageId}`);
      }
    }
  }
  if (!SNOWFLAKE.test(String(thread?.id)) || thread.guild_id !== config.guildId || thread.parent_id !== parent.id || ![10, 11].includes(Number(thread.type))) throw Error('Discord thread does not belong to the configured proposal channel.');
  thread = await reopenThread(discord, thread);
  const discussionUrl = `https://discord.com/channels/${config.guildId}/${thread.id}`;
  await ref.set({ network: config.network, appId: config.appId, proposalId: p.id, digest: p.digest, guildId: config.guildId,
    channelId: thread.id, parentChannelId: parent.id, starterMessageId, mode: 'thread', discussionUrl, url: discussionUrl,
    title: p.title, updatedAt: now(), createdAt: previous.createdAt || now(), state: 'ready' }, { merge: true });
  const parts = proposalMessages(config, p);
  for (let index = forum ? 1 : 0; index < parts.length; index++) {
    const messageId = await deliverMessage({ db, discord, config, proposalId: p.id, channelId: thread.id, key: `proposal-${p.digest}-${index}`, body: parts[index], now });
    if (index === (forum ? 1 : 0) && config.pinDetails && !previous.detailsPinned) {
      try { await discord.request('PUT', `/channels/${thread.id}/messages/pins/${forum ? starterMessageId : messageId}`); await ref.set({ detailsPinned: true }, { merge: true }); }
      catch (error) { if (error.status !== 403) throw error; await ref.set({ pinPermissionMissing: true }, { merge: true }); }
    }
  }
  return { channelId: thread.id, discussionUrl };
}

async function ensureChannel(options) {
  return options.config.mode === 'thread' ? ensureThreadChannel(options) : ensureGuildChannel(options);
}

function uintArgument(value) { return value?.length === 8 ? Buffer.from(value).readBigUInt64BE().toString() : null; }
function transactionEvent(tx, config) {
  const app = tx.applicationTransaction, args = app?.applicationArgs || [], method = Buffer.from(args[0] || []).toString();
  if (!tx.id || !TXID.test(tx.id) || !tx.confirmedRound || Number(app?.applicationId) !== Number(config.appId) || !METHODS.has(method)) return null;
  const id = uintArgument(args[1]); if (!id || id === '0') return null;
  if (method === 'propose' && (args.length !== 9 || args[2]?.length !== 32)) return null;
  if (method === 'vote' && (args.length !== 6 || !uintArgument(args[2]) || !['1', '2', '3'].includes(uintArgument(args[3])))) return null;
  if (method === 'claim' && (args.length !== 3 || !uintArgument(args[2]))) return null;
  if (method === 'execute' && (args.length !== 4 || uintArgument(args[2]) === null)) return null;
  if (method === 'finalize' && args.length !== 2) return null;
  const sender = String(tx.sender), appAddress = String(sdk.getApplicationAddress(config.appId));
  const paid = (tx.innerTxns || []).filter(inner => String(inner.sender) === appAddress && String(inner.paymentTransaction?.receiver) === sender)
    .reduce((sum, inner) => sum + BigInt(inner.paymentTransaction.amount || 0), 0n).toString();
  return { type: method, proposalId: id, txid: tx.id, sender, network: config.network, appId: config.appId,
    round: Number(tx.confirmedRound), offset: Number(tx.intraRoundOffset || 0), time: Number(tx.roundTime || 0) * 1000,
    ...(method === 'propose' ? { digest: Buffer.from(args[2]).toString('hex') } : {}),
    ...(method === 'vote' ? { nftId: uintArgument(args[2]), choice: Number(uintArgument(args[3])), paidReward: paid } : {}),
    ...(method === 'execute' ? { actionIndex: Number(uintArgument(args[2])) } : {}),
    ...(method === 'claim' ? { nftId: uintArgument(args[2]), returnedDeposit: paid } : {}) };
}

function eventIdentity(event) { return event.type === 'progress' ? `progress-${event.proposalId}-${event.digest}-${event.revision}` : event.txid; }
function outboxRef(db, config, event) {
  const id = `${String(event.time || 0).padStart(16, '0')}-${String(event.round || 0).padStart(16, '0')}-${String(event.offset || 0).padStart(8, '0')}-${sha(eventIdentity(event)).slice(0, 32)}`;
  return db.collection('councilDiscordOutbox').doc(scopeOf(config)).collection('events').doc(id);
}
async function queueEvent(db, config, event, now = Date.now) {
  const ref = outboxRef(db, config, event);
  // A receipt lookup and a later indexer page may expose different optional
  // timestamps. Deduplicate by transaction identity, not that mutable metadata.
  const identity = db.collection('councilDiscordState').doc(scopeOf(config)).collection('eventIds').doc(sha(eventIdentity(event)));
  return db.runTransaction(async tx => {
    if ((await tx.get(identity)).exists) return false;
    tx.set(ref, { ...json(event), status: 'pending', createdAt: now(), attempts: 0, nextAttemptAt: now() });
    tx.set(identity, { proposalId: event.proposalId, createdAt: now(), outboxId: ref.id });
    return true;
  });
}
async function verifiedProposal(db, config, id, client, indexer) {
  const data = await readCouncil('', { proposalId: String(id), client, indexer, loadManifest: digest => loadManifest(db, digest) });
  const p = data.proposals.find(item => item.id === String(id));
  if (!data.config.ready || !p?.textVerified || Number(data.config.appId) !== Number(config.appId) || data.config.network !== config.network) throw Error('The live Council does not verify this proposal.');
  return { ...p, ...{ yes: Number(p.yes), no: Number(p.no), abstain: Number(p.abstain) } };
}

async function confirmedEvent(indexer, txid, config) {
  if (!TXID.test(String(txid || ''))) throw Error('Use a valid confirmed Algorand transaction ID.');
  const tx = (await indexer.lookupTransactionByID(txid).do()).transaction;
  if (!tx?.confirmedRound) throw Error('Council transaction is not confirmed.');
  let event = transactionEvent(tx, config);
  if (!event && Number(tx.applicationTransaction?.applicationId) === Number(config.appId) && tx.group?.length) {
    const page = await indexer.searchForTransactions().groupid(tx.group).limit(1000).do();
    event = (page.transactions || []).filter(item => item.group && Buffer.from(item.group).equals(Buffer.from(tx.group))).map(item => transactionEvent(item, config)).find(Boolean);
  }
  if (!event || event.round < config.startRound) throw Error('Transaction is not a confirmed Council proposal update.');
  return event;
}
async function queueConfirmedReceipt({ db, txid, config = discordConfiguration(), client, indexer, verify = verifiedProposal, now = Date.now }) {
  const idx = indexer || new sdk.Indexer('', config.indexerUrl, 443), event = await confirmedEvent(idx, txid, config);
  const p = await verify(db, config, event.proposalId, client, idx);
  if (event.digest && event.digest !== p.digest) throw Error('Submitted transaction content differs from the live proposal.');
  const queued = await queueEvent(db, config, { ...event, digest: p.digest }, now);
  const receipt = db.collection('councilDiscordReceipts').doc(`${scopeOf(config)}-${event.txid}`);
  try { await receipt.create({ txid: event.txid, proposalId: event.proposalId, network: config.network, appId: config.appId, createdAt: now() }); }
  catch (error) { if (Number(error.code) !== 6) throw error; }
  const mapping = (await db.collection('councilDiscordProposals').doc(proposalKey(config, event.proposalId)).get()).data();
  return { queued, proposalId: event.proposalId, txid: event.txid, ...(mapping?.discussionUrl ? { discussionUrl: mapping.discussionUrl } : {}) };
}

async function scanConfirmedEvents({ db, config, indexer, fromRound, toRound, now = Date.now }) {
  let next, total = 0, queued = 0;
  do {
    let request = indexer.searchForTransactions().applicationID(config.appId).txType('appl').minRound(fromRound).maxRound(toRound).limit(1000);
    if (next) request = request.nextToken(next);
    const page = await request.do(); next = page.nextToken;
    for (const tx of page.transactions || []) { const event = transactionEvent(tx, config); if (event && event.round >= config.startRound) { if (await queueEvent(db, config, event, now)) queued++; } }
    total += (page.transactions || []).length;
    if (total > 100000) throw Error('Council notification index window is too large; cursor was not advanced.');
  } while (next);
  return queued;
}

function validateEventState(event, p) {
  if (event.proposalId !== undefined && String(event.proposalId) !== String(p.id)) throw Error('Notification belongs to another proposal.');
  if (event.type === 'finalize' && ![1, 2].includes(p.state)) throw Error('The live finalized result is not available yet; notification will retry.');
  if (event.type === 'execute') {
    if (p.state !== 1 || !Number.isSafeInteger(event.actionIndex) || event.actionIndex < 0 || !p.actions?.[event.actionIndex] ||
      (BigInt(p.executed || 0) & (1n << BigInt(event.actionIndex))) === 0n) throw Error('The live executed action is not available yet; notification will retry.');
  }
  if (event.type === 'claim' && ![1, 2].includes(p.state)) throw Error('The live deposit-return result is not available yet; notification will retry.');
  if (event.type === 'progress' && p.state !== 1) throw Error('Implementation progress requires the live passed proposal.');
}

function eventMessage(event, p, config) {
  validateEventState(event, p);
  const url = `${config.site}/council/dao/${p.id}`, receipt = event.txid ? `\n[Confirmed transaction](https://allo.info/tx/${event.txid})` : '';
  let title, description, color = 0xc9a765;
  if (event.type === 'propose') { title = 'Proposal submitted'; description = 'The confirmed proposal was submitted. Its full details are above.'; }
  else if (event.type === 'vote') {
    const choice = ['', 'Yes', 'No', 'Abstain'][event.choice], first = BigInt(event.paidReward || 0) > 0n;
    title = first ? `${choice} vote recorded` : `${choice} ballot recorded or revised`;
    description = `${short(event.sender)} voted **${choice}** with NFT **${event.nftId}**.${first ? `\nInstant reward paid: **${amount(event.paidReward)}**.` : '\nNo additional voting reward was paid.'}`;
  } else if (event.type === 'finalize') { const accepted = p.state === 1; title = accepted ? 'Proposal accepted' : 'Proposal rejected'; color = accepted ? 0x77b792 : 0xd98982;
    description = accepted ? 'The finalized on-chain vote passed. The approved proposal is ready for its AI implementation handoff and approved treasury actions.' : 'The finalized on-chain vote did not pass. Rewards already paid remain with voters.'; }
  else if (event.type === 'execute') { title = `Approved action ${event.actionIndex + 1} executed`; description = `${KINDS[Number(p.actions[event.actionIndex]?.kind)] || 'Treasury or governance action'} confirmed. The contract marked this action as executed.`; }
  else if (event.type === 'claim') { title = 'Ballot storage returned'; description = `${short(event.sender)} returned the storage deposit for NFT **${event.nftId}**: **${amount(event.returnedDeposit)}**. Its voting reward was already paid.`; }
  else if (event.type === 'progress') { title = { running: 'Implementation in progress', blocked: 'Implementation update: blocked', complete: 'Implementation completed' }[event.progress.status] || 'Implementation update'; description = event.progress.summary;
    if (event.progress.release) description += `\n[Published release](${event.progress.release})`; }
  else throw Error('Unsupported Council notification event.');
  return { embeds: [{ title: `${title} · #${p.id}`.slice(0, 256), url, color, description: `${description}${receipt}`.slice(0, 4000),
    fields: [{ name: 'Current tally', value: `Yes **${p.yes}** · No **${p.no}** · Abstain **${p.abstain}**`, inline: false },
      { name: 'Proposal status', value: STATES[p.state] || 'Unknown', inline: true }, { name: 'Vote on the website', value: `[Open proposal](${url})`, inline: true }] }] };
}

async function queueProgressUpdate({ db, report, config = discordConfiguration(), client, indexer, verify = verifiedProposal, now = Date.now }) {
  if (!report || report.network !== config.network || Number(report.appId) !== Number(config.appId) || !['running', 'blocked', 'complete'].includes(report.status)) return false;
  const p = await verify(db, config, report.proposalId, client, indexer);
  if (p.state !== 1 || p.digest !== report.digest) throw Error('Implementation progress is not bound to a verified passed proposal.');
  const summary = String(report.summary || '').trim(), release = String(report.release || '');
  if (!summary || summary.length > 4000 || (release && !/^https:\/\//.test(release))) throw Error('Invalid public implementation report.');
  return queueEvent(db, config, { type: 'progress', proposalId: p.id, network: config.network, appId: config.appId, digest: p.digest,
    revision: Number(report.revision || report.updatedAt), time: Number(report.updatedAt || now()), progress: { status: report.status, summary, release } }, now);
}

async function syncCouncilDiscord({ db, config = discordConfiguration(), discord, client, indexer, now = Date.now, verify = verifiedProposal, maxEvents = 35, scan = true } = {}) {
  if (!config.enabled) return { enabled: false, delivered: 0 };
  if (!config.guildId) throw Error('Configure the Council Discord server before enabling delivery.');
  const service = discord || discordClient(), idx = indexer || new sdk.Indexer('', config.indexerUrl, 443), stateRef = db.collection('councilDiscordState').doc(scopeOf(config));
  const lease = crypto.randomUUID(), time = now();
  const acquired = await db.runTransaction(async tx => { const previous = (await tx.get(stateRef)).data() || {};
    if (Number(previous.leaseUntil || 0) > time || Number(previous.retryAfter || 0) > time) return null;
    tx.set(stateRef, { ...previous, lease, leaseUntil: time + 330000, updatedAt: time }); return previous; });
  if (!acquired) return { busy: true, delivered: 0 };
  let delivered = 0, queued = 0;
  try {
    if (scan) {
      const health = await idx.makeHealthCheck().do(), indexedRound = Number(health.round || health.currentRound || 0);
      const fromRound = Math.max(config.startRound, Number(acquired.throughRound ?? config.startRound - 1) + 1), toRound = Math.min(indexedRound, fromRound + 4999);
      if (toRound >= fromRound) {
        queued = await scanConfirmedEvents({ db, config, indexer: idx, fromRound, toRound, now });
        await db.runTransaction(async tx => { const current = (await tx.get(stateRef)).data(); if (current?.lease !== lease) throw Error('Council Discord scan lease lost.'); tx.update(stateRef, { throughRound: toRound, updatedAt: now() }); });
      }
    }
    const events = await db.collection('councilDiscordOutbox').doc(scopeOf(config)).collection('events')
      .where('status', '==', 'pending').where('nextAttemptAt', '<=', now()).orderBy('nextAttemptAt', 'asc').limit(maxEvents).get();
    const proposals = new Map();
    for (const doc of events.docs) {
      const event = doc.data();
      if (Number(event.nextAttemptAt || 0) > now()) continue;
      try {
        if (event.network !== config.network || Number(event.appId) !== Number(config.appId)) throw Error('Notification belongs to another Council.');
        let p = proposals.get(event.proposalId);
        if (!p) { p = await verify(db, config, event.proposalId, client, idx); proposals.set(event.proposalId, p); }
        if (event.digest && event.digest !== p.digest) throw Error('Notification content differs from the proposal.');
        validateEventState(event, p);
        const channel = await ensureChannel({ db, discord: service, config, proposal: p, now });
        const messageId = await deliverMessage({ db, discord: service, config, proposalId: p.id, channelId: channel.channelId, key: `event-${eventIdentity(event)}`, body: eventMessage(event, p, config), now });
        await doc.ref.set({ status: 'sent', messageId, sentAt: now(), nextAttemptAt: 0 }, { merge: true }); delivered++;
      } catch (error) {
        const attempts = Number(event.attempts || 0) + 1, retry = error.retryAfterMs || Math.min(3600000, 30000 * 2 ** Math.min(attempts, 6));
        await doc.ref.set({ status: 'pending', attempts, nextAttemptAt: now() + retry, error: error.status ? `discord_${error.status}` : 'verification_or_delivery_failed', updatedAt: now() }, { merge: true });
        if (error.status === 429) { await stateRef.set({ retryAfter: now() + retry }, { merge: true }); break; }
      }
    }
    await stateRef.set({ lastSuccessAt: now(), deliveredLastRun: delivered, updatedAt: now() }, { merge: true });
    return { enabled: true, queued, delivered };
  } finally {
    await db.runTransaction(async tx => { const current = (await tx.get(stateRef)).data(); if (current?.lease === lease) tx.update(stateRef, { leaseUntil: 0, updatedAt: now() }); });
  }
}

module.exports = { ACTIVATION_ROUND, PERMISSIONS, TXID, discordConfiguration, DiscordError, discordClient, effectivePermissions, inspectDiscord, textChunks,
  markerFor, channelName, receiptMarker, decorateMessage, hasMarker, reconcileMessage, deliverMessage, proposalMessages, reopenThread, forumDiscussion, ensureGuildChannel, ensureThreadChannel, ensureChannel, transactionEvent,
  eventIdentity, queueEvent, outboxRef, verifiedProposal, confirmedEvent, queueConfirmedReceipt, scanConfirmedEvents, validateEventState, eventMessage, queueProgressUpdate, syncCouncilDiscord };
