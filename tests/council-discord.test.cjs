const test = require('node:test'), assert = require('node:assert/strict'), sdk = require('algosdk');
const d = require('../functions/council/discord');
const { botInvite } = require('../scripts/council-discord.cjs');
const config = { network: 'mainnet', appId: 1239236238, site: 'https://dark-coin.com', guildId: '950116008855744533', categoryId: '950116008855744534', enabled: true, pinDetails: false, startRound: 67113001 };
const sender = String(sdk.generateAccount().addr), txid = 'A'.repeat(52);
const proposal = { id: '1', digest: 'a'.repeat(64), title: 'A Council change @everyone', body: 'Original instructions and @everyone remain literal proposal data.',
  owner: sender, deadline: 1800000000, minVotes: 50, approvalBps: 6000, rewardPerVote: '7181', fee: '20000000', state: 0, yes: 1, no: 0, abstain: 0, images: [], actions: [] };

function fakeDb() {
  const rows = new Map(), faults = { create: null, set: null };
  const snapshot = key => ({ id: key.split('/').at(-1), exists: rows.has(key), data: () => rows.get(key), ref: ref(key) });
  const ref = key => ({ key, id: key.split('/').at(-1), get: async () => snapshot(key), collection: name => collection(`${key}/${name}`),
    create: async data => { if (faults.create?.(key, data)) throw Error('storage unavailable'); if (rows.has(key)) throw Object.assign(Error('Already exists'), { code: 6 }); rows.set(key, structuredClone(data)); },
    set: async (data, options) => { if (faults.set?.(key, data)) throw Error('storage unavailable'); rows.set(key, structuredClone(options?.merge ? { ...rows.get(key), ...data } : data)); } });
  const collection = prefix => ({ doc: id => ref(`${prefix}/${id}`), where: (field, op, value) => query(prefix, [{ field, op, value }], Infinity), limit: count => query(prefix, [], count), get: async () => query(prefix, [], Infinity).get() });
  const query = (prefix, filters, count, order) => ({
    where: (field, op, value) => query(prefix, [...filters, { field, op, value }], count, order),
    orderBy: field => query(prefix, filters, count, field), limit: size => query(prefix, filters, size, order),
    get: async () => ({ docs: [...rows.keys()].filter(key => key.startsWith(prefix + '/') && !key.slice(prefix.length + 1).includes('/') &&
      filters.every(({ field, op, value }) => op === '<=' ? rows.get(key)[field] <= value : rows.get(key)[field] === value))
      .sort((a, b) => order ? rows.get(a)[order] - rows.get(b)[order] || a.localeCompare(b) : a.localeCompare(b)).slice(0, count).map(snapshot) }) });
  const db = { collection, runTransaction: async fn => {
    const changes = [], result = await fn({ get: item => item.get(), set: (item, data, options) => changes.push([item, data, options]), update: (item, data) => changes.push([item, data, { merge: true }]) });
    for (const [item, data, options] of changes) await item.set(data, options); return result;
  } };
  return { db, rows, faults };
}

function fakeDiscord() {
  const bot = { id: '950116008855744535', username: 'Council', bot: true }, channels = [], messages = new Map(), requests = [], faults = { before: null, afterMessage: null };
  let sequence = 960000000000000000n;
  const request = async (method, route, body) => {
    requests.push({ method, route, body });
    const failure = faults.before?.(method, route, body); if (failure) throw failure;
    if (method === 'GET' && route === '/users/@me') return bot;
    if (method === 'GET' && route === `/guilds/${config.guildId}/channels`) return channels;
    if (method === 'GET' && route === `/guilds/${config.guildId}/threads/active`) return { threads: channels.filter(c => [10, 11].includes(c.type) && !c.thread_metadata?.archived) };
    if (method === 'POST' && route === `/guilds/${config.guildId}/channels`) { const channel = { ...body, id: String(++sequence), guild_id: config.guildId }; channels.push(channel); return channel; }
    const channel = route.match(/^\/channels\/(\d+)$/);
    if (channel && method === 'GET') { const found = channels.find(item => item.id === channel[1]); if (!found) throw new d.DiscordError(404, 10003); return found; }
    if (channel && method === 'PATCH') { const found = channels.find(item => item.id === channel[1]); found.thread_metadata = { ...found.thread_metadata, ...body }; return found; }
    const thread = route.match(/^\/channels\/(\d+)\/messages\/(\d+)\/threads$/);
    if (thread && method === 'POST') {
      if (channels.some(item => item.id === thread[2])) throw new d.DiscordError(400, 160004);
      const created = { ...body, id: thread[2], guild_id: config.guildId, parent_id: thread[1], type: 11, thread_metadata: { archived: false, locked: false } };
      channels.push(created); const error = faults.afterThread?.(created); if (error) throw error; return created;
    }
    const forum = route.match(/^\/channels\/(\d+)\/threads$/);
    if (forum && method === 'POST') {
      const created = { id: String(++sequence), name: body.name, parent_id: forum[1], guild_id: config.guildId, type: 11, thread_metadata: { archived: false, locked: false } };
      channels.push(created); messages.set(created.id, [{ ...body.message, id: created.id, author: bot, timestamp: new Date().toISOString() }]);
      const error = faults.afterThread?.(created); if (error) throw error; return created;
    }
    const archived = route.match(/^\/channels\/(\d+)\/threads\/archived\/public/);
    if (archived && method === 'GET') return { threads: channels.filter(c => c.parent_id === archived[1] && c.thread_metadata?.archived), has_more: false };
    const single = route.match(/^\/channels\/(\d+)\/messages\/(\d+)$/);
    if (single && method === 'GET') { const found = (messages.get(single[1]) || []).find(m => m.id === single[2]); if (!found) throw new d.DiscordError(404, 10008); return found; }
    const list = route.match(/^\/channels\/(\d+)\/messages(?:\?.*)?$/);
    if (list && method === 'GET') return [...(messages.get(list[1]) || [])].reverse();
    if (list && method === 'POST') {
      const items = messages.get(list[1]) || [];
      const existing = items.find(item => item.nonce === body.nonce); if (existing && body.enforce_nonce) return existing;
      const message = { ...body, id: String(++sequence), author: bot, timestamp: new Date().toISOString() }; items.push(message); messages.set(list[1], items);
      const error = faults.afterMessage?.(message); if (error) throw error;
      return message;
    }
    if (method === 'PUT' && /\/messages\/pins\//.test(route)) return null;
    throw Error(`Unexpected test request ${method} ${route}`);
  };
  return { request, botId: async () => bot.id, bot, channels, messages, requests, faults };
}

const transaction = (method = 'vote', options = {}) => ({ id: txid, confirmedRound: 67113020n, intraRoundOffset: 5n, roundTime: 1795120000n, sender,
  applicationTransaction: { applicationId: 1239236238n, applicationArgs: [Buffer.from(method), sdk.encodeUint64(1), ...(method === 'vote' ? [sdk.encodeUint64(810866012), sdk.encodeUint64(1), sdk.encodeUint64(0), new Uint8Array(352)] : [])] },
  innerTxns: [{ sender: String(sdk.getApplicationAddress(1239236238)), paymentTransaction: { receiver: sender, amount: 7181n } }], ...options });

test('only actual confirmed Council methods become notifications; budget, legacy and forged transactions do not', () => {
  const vote = d.transactionEvent(transaction(), config);
  assert.equal(vote.type, 'vote'); assert.equal(vote.proposalId, '1'); assert.equal(vote.nftId, '810866012'); assert.equal(vote.paidReward, '7181');
  for (const tx of [transaction('budget'), transaction('vote', { confirmedRound: 0n }), transaction('vote', { applicationTransaction: { applicationId: 999n, applicationArgs: [] } }),
    transaction('vote', { applicationTransaction: { applicationId: 1239236238n, applicationArgs: [Buffer.from('vote'), Buffer.from([1]), sdk.encodeUint64(1)] } })]) assert.equal(d.transactionEvent(tx, config), null);
});

test('real proposal channels reconcile after a crash and full original content remains mention-safe', async () => {
  const f = fakeDb(), discord = fakeDiscord(), p = { ...proposal, body: 'Original text @everyone <@123456789012345678>\n'.repeat(180),
    images: [{ hash: 'b'.repeat(64), kind: 'video', name: 'video.mp4', caption: 'Full original attachment' }], actions: [{ kind: '0', asset: '0', amount: '1000000', recipient: sender }] };
  let failed = false;
  f.faults.set = key => { if (!failed && key === `councilDiscordProposals/mainnet-1239236238-1`) { failed = true; return true; } return false; };
  await assert.rejects(d.ensureChannel({ ...f, discord, config, proposal: p }), /storage/);
  assert.equal(discord.channels.length, 1);
  f.faults.set = null;
  const first = await d.ensureChannel({ ...f, discord, config, proposal: p });
  const count = discord.messages.get(first.channelId).length;
  await d.ensureChannel({ ...f, discord, config, proposal: p });
  assert.equal(discord.channels.length, 1); assert.equal(discord.messages.get(first.channelId).length, count);
  const posts = discord.requests.filter(item => item.method === 'POST' && item.route.endsWith('/messages'));
  for (const post of posts) { assert.deepEqual(post.body.allowed_mentions.parse, []); assert.equal(post.body.enforce_nonce, true); assert((post.body.content || '').length <= 2000); assert(post.body.nonce.length <= 25); }
  const text = posts.filter(item => item.body.content).map(item => item.body.content.replace(/\n\n-# Council receipt [a-f0-9]+$/, '').replace(/^\*\*Original proposal\*\*\n\n/, '')).join('');
  assert(text.startsWith(p.body)); assert(text.includes('/api/council/image?hash=' + 'b'.repeat(64))); assert(text.includes('"amount":"1000000"'));
  const create = discord.requests.find(item => item.method === 'POST' && item.route.endsWith('/channels'));
  assert.equal(create.body.type, 0); assert.equal(create.body.parent_id, config.categoryId); assert.equal(create.body.permission_overwrites, undefined);
  assert.match(first.discussionUrl, /^https:\/\/discord\.com\/channels\/950116008855744533\//);
});

test('an uncertain sent message is found by its bot receipt before retry; a forged user marker is ignored', async () => {
  const f = fakeDb(), discord = fakeDiscord(), channelId = '950116008855744536', key = 'vote-receipt';
  let first = true; discord.faults.afterMessage = () => { if (first) { first = false; return new d.DiscordError(0, 'network'); } return null; };
  const args = { ...f, discord, config, proposalId: '1', channelId, key, body: { content: 'The actual vote.' } };
  await assert.rejects(d.deliverMessage(args), /Discord/);
  const sent = discord.messages.get(channelId)[0];
  discord.messages.get(channelId).push({ ...sent, id: '950116008855744599', author: { id: '950116008855744598', bot: false } });
  assert.equal(await d.deliverMessage(args), sent.id);
  assert.equal(discord.requests.filter(item => item.method === 'POST').length, 1);
});

test('confirmed receipt validation rejects unconfirmed and unrelated calls before creating any queue entry', async () => {
  const f = fakeDb(), vote = transaction(), indexer = { lookupTransactionByID: () => ({ do: async () => ({ transaction: vote }) }) };
  const result = await d.queueConfirmedReceipt({ ...f, txid, config, indexer, verify: async () => proposal });
  assert.equal(result.proposalId, '1'); assert.equal(result.queued, true);
  assert.equal((await d.queueConfirmedReceipt({ ...f, txid, config, indexer, verify: async () => proposal })).queued, false);
  const before = f.rows.size;
  for (const bad of [transaction('vote', { confirmedRound: 0n }), transaction('budget')]) {
    await assert.rejects(d.queueConfirmedReceipt({ ...f, txid, config, indexer: { lookupTransactionByID: () => ({ do: async () => ({ transaction: bad }) }) }, verify: async () => proposal }), /not confirmed|not a confirmed/);
  }
  assert.equal(f.rows.size, before);
});

test('rate-limited delivery leaves a durable pending event and releases the worker lease', async () => {
  const f = fakeDb(), discord = fakeDiscord(), event = { ...d.transactionEvent(transaction(), config), digest: proposal.digest };
  let clock = 1000000;
  await d.queueEvent(f.db, config, event, () => clock);
  discord.faults.before = (method, route) => method === 'POST' && route.endsWith('/messages') ? new d.DiscordError(429, 0, 90000) : null;
  const result = await d.syncCouncilDiscord({ ...f, discord, config, scan: false, verify: async () => proposal, now: () => clock });
  assert.equal(result.delivered, 0);
  const pending = [...f.rows.entries()].find(([key]) => key.startsWith('councilDiscordOutbox/'))[1];
  assert.equal(pending.status, 'pending'); assert.equal(pending.nextAttemptAt, clock + 90000);
  const state = f.rows.get('councilDiscordState/mainnet-1239236238'); assert.equal(state.leaseUntil, 0); assert.equal(state.retryAfter, clock + 90000);
  assert.equal((await d.syncCouncilDiscord({ ...f, discord, config, scan: false, verify: async () => proposal, now: () => clock })).busy, true);
  clock += 90001; discord.faults.before = null;
  assert.equal((await d.syncCouncilDiscord({ ...f, discord, config, scan: false, verify: async () => proposal, now: () => clock })).delivered, 1);
});

test('a scan cursor advances only after confirmed events are durably queued', async () => {
  const f = fakeDb(), discord = fakeDiscord(), pages = [{ transactions: [transaction()], nextToken: 'more' }, { transactions: [], nextToken: undefined }];
  let index = 0;
  const query = { do: async () => pages[index++] };
  for (const method of ['applicationID', 'txType', 'minRound', 'maxRound', 'limit', 'nextToken']) query[method] = () => query;
  const indexer = { makeHealthCheck: () => ({ do: async () => ({ round: 67113025n }) }), searchForTransactions: () => query };
  f.faults.set = key => key.startsWith('councilDiscordOutbox/');
  await assert.rejects(d.syncCouncilDiscord({ ...f, discord, config, indexer, verify: async () => proposal }), /storage/);
  assert.equal(f.rows.get('councilDiscordState/mainnet-1239236238').throughRound, undefined);
  f.faults.set = null; index = 0;
  const result = await d.syncCouncilDiscord({ ...f, discord, config, indexer, verify: async () => proposal });
  assert.equal(result.delivered, 1); assert.equal(f.rows.get('councilDiscordState/mainnet-1239236238').throughRound, 67113025);
});

test('result, execution, refund and progress notices reflect verified proposal state and never enable mentions', async () => {
  for (const [state, title] of [[1, 'accepted'], [2, 'rejected']]) assert.match(d.eventMessage({ type: 'finalize', txid }, { ...proposal, state }, config).embeds[0].title, new RegExp(title));
  const execution = d.eventMessage({ type: 'execute', actionIndex: 0, txid }, { ...proposal, state: 1, executed: '1', actions: [{ kind: '2' }] }, config);
  assert.match(execution.embeds[0].description, /Tinyman swap/);
  assert.match(d.eventMessage({ type: 'claim', sender, nftId: '1', returnedDeposit: '29300', txid }, { ...proposal, state: 2 }, config).embeds[0].description, /0\.0293 ALGO/);
  const f = fakeDb(), report = { proposalId: '1', appId: config.appId, network: config.network, digest: proposal.digest, revision: 2, updatedAt: 1000, status: 'complete', summary: 'Published the approved implementation.', release: 'https://dark-coin.com/arena' };
  await assert.rejects(d.queueProgressUpdate({ ...f, config, report, verify: async () => proposal }), /verified passed/);
  assert.equal(await d.queueProgressUpdate({ ...f, config, report, verify: async () => ({ ...proposal, state: 1 }) }), true);
  assert.equal(await d.queueProgressUpdate({ ...f, config, report, verify: async () => ({ ...proposal, state: 1 }) }), false);
});

test('bot permission checks honor category denies and install links request no administrator privilege', () => {
  const permissions = Object.values(d.PERMISSIONS).reduce((mask, bit) => mask | bit, 0n);
  const guild = { id: config.guildId, roles: [{ id: config.guildId, permissions: '0' }, { id: 'role', permissions: permissions.toString() }] }, member = { user: { id: 'bot' }, roles: ['role'] };
  assert.equal(d.effectivePermissions(guild, member), permissions);
  const category = { permission_overwrites: [{ id: config.guildId, type: 0, deny: d.PERMISSIONS.SEND_MESSAGES.toString(), allow: '0' }] };
  assert.equal(d.effectivePermissions(guild, member, category) & d.PERMISSIONS.SEND_MESSAGES, 0n);
  const invite = new URL(botInvite('950116008855744535', config.guildId));
  assert.equal(BigInt(invite.searchParams.get('permissions')) & 8n, 0n); assert.equal(invite.searchParams.get('scope'), 'bot');
  assert.equal(BigInt(invite.searchParams.get('permissions')) & d.PERMISSIONS.MANAGE_CHANNELS, 0n);
  assert.notEqual(BigInt(invite.searchParams.get('permissions')) & d.PERMISSIONS.CREATE_PUBLIC_THREADS, 0n);
});

test('bot HTTP errors expose only status/code and retain Discord retry-after without credential leakage', async () => {
  const secret = 'not-a-real-test-bot-token';
  const bot = d.discordClient({ token: secret, fetchImpl: async (url, init) => {
    assert.equal(init.headers.Authorization, 'Bot ' + secret);
    return { ok: false, status: 429, json: async () => ({ retry_after: 1.5, message: 'Echo ' + secret }), headers: { get: () => null } };
  } });
  await assert.rejects(bot.request('POST', '/channels/950116008855744536/messages', { content: 'test' }), error => { assert.equal(error.retryAfterMs, 1500); assert(!error.message.includes(secret)); return true; });
});

test('receipt and poll metadata differences cannot enqueue the same transaction twice', async () => {
  const f = fakeDb(), event = d.transactionEvent(transaction(), config);
  assert.equal(await d.queueEvent(f.db, config, { ...event, time: 0 }), true);
  assert.equal(await d.queueEvent(f.db, config, { ...event, time: 1795120000000, digest: proposal.digest }), false);
  assert.equal([...f.rows.keys()].filter(key => key.startsWith('councilDiscordOutbox/')).length, 1);
});

test('one public proposal thread is created inside the existing channel and reconciled after a create crash', async () => {
  const f = fakeDb(), discord = fakeDiscord(), threadConfig = { ...config, categoryId: '', mode: 'thread', parentChannelId: '950116008855744580' };
  discord.channels.push({ id: threadConfig.parentChannelId, name: 'proposals', guild_id: config.guildId, type: 0 });
  let once = true; discord.faults.afterThread = () => { if (once) { once = false; return new d.DiscordError(0, 'network'); } return null; };
  await assert.rejects(d.ensureChannel({ ...f, discord, config: threadConfig, proposal }), /Discord/);
  assert.equal(discord.channels.filter(c => c.type === 11).length, 1);
  const result = await d.ensureChannel({ ...f, discord, config: threadConfig, proposal });
  assert.equal(discord.messages.get(threadConfig.parentChannelId).length, 1);
  assert.equal(discord.channels.filter(c => c.type === 11).length, 1);
  assert.equal(discord.channels.find(c => c.id === result.channelId).parent_id, threadConfig.parentChannelId);
  assert.equal(discord.requests.filter(r => r.method === 'POST' && r.route.endsWith('/threads')).length, 1);
  assert.equal(discord.requests.filter(r => r.method === 'POST' && r.route.includes('/guilds/')).length, 0);
  const before = discord.messages.get(result.channelId).length;
  await d.ensureChannel({ ...f, discord, config: threadConfig, proposal });
  assert.equal(discord.messages.get(result.channelId).length, before);
});

test('archived unlocked proposal threads reopen for updates, while moderator locks are respected', async () => {
  const f = fakeDb(), discord = fakeDiscord(), threadConfig = { ...config, mode: 'thread', parentChannelId: '950116008855744580' };
  discord.channels.push({ id: threadConfig.parentChannelId, name: 'proposals', guild_id: config.guildId, type: 0 });
  const result = await d.ensureChannel({ ...f, discord, config: threadConfig, proposal }), thread = discord.channels.find(c => c.id === result.channelId);
  thread.thread_metadata.archived = true;
  await d.ensureChannel({ ...f, discord, config: threadConfig, proposal });
  assert.equal(thread.thread_metadata.archived, false);
  thread.thread_metadata.archived = true; thread.thread_metadata.locked = true;
  const calls = discord.requests.filter(r => r.method === 'PATCH').length;
  await assert.rejects(d.ensureChannel({ ...f, discord, config: threadConfig, proposal }), /Discord/);
  assert.equal(discord.requests.filter(r => r.method === 'PATCH').length, calls); assert.equal(thread.thread_metadata.locked, true);
});

test('forum proposal posts are reconciled by this bot’s immutable starter receipt instead of duplicating on retry', async () => {
  const f = fakeDb(), discord = fakeDiscord(), forumConfig = { ...config, categoryId: '', mode: 'thread', parentChannelId: '950116008855744581' };
  discord.channels.push({ id: forumConfig.parentChannelId, name: 'proposal-forum', guild_id: config.guildId, type: 15 });
  let once = true; discord.faults.afterThread = () => { if (once) { once = false; return new d.DiscordError(0, 'network'); } return null; };
  await assert.rejects(d.ensureChannel({ ...f, discord, config: forumConfig, proposal }), /Discord/);
  const result = await d.ensureChannel({ ...f, discord, config: forumConfig, proposal });
  assert.equal(discord.channels.filter(c => c.type === 11).length, 1);
  assert.equal(discord.requests.filter(r => r.method === 'POST' && r.route === `/channels/${forumConfig.parentChannelId}/threads`).length, 1);
  assert.equal(discord.channels.find(c => c.id === result.channelId).parent_id, forumConfig.parentChannelId);
});

test('a temporarily lagging live header cannot announce rejection or execution before authoritative state arrives', () => {
  assert.throws(() => d.eventMessage({ type: 'finalize', txid }, { ...proposal, state: 0 }, config), /not available yet/);
  assert.throws(() => d.eventMessage({ type: 'execute', actionIndex: 0, txid }, { ...proposal, state: 1, executed: '0', actions: [{ kind: '0' }] }, config), /not available yet/);
  assert.match(d.eventMessage({ type: 'finalize', txid }, { ...proposal, state: 1 }, config).embeds[0].title, /accepted/);
  assert.match(d.eventMessage({ type: 'execute', actionIndex: 0, txid }, { ...proposal, state: 1, executed: '1', actions: [{ kind: '0' }] }, config).embeds[0].title, /executed/);
});

test('delayed retry entries cannot fill the query window and starve fresh confirmed updates', async () => {
  const f = fakeDb(), discord = fakeDiscord(), clock = 2000000;
  for (let i = 0; i < 40; i++) {
    const old = { ...d.transactionEvent(transaction(), config), txid: String.fromCharCode(66 + i % 20).repeat(50) + String.fromCharCode(66 + Math.floor(i / 20)).repeat(2), time: i };
    await d.queueEvent(f.db, config, old, () => clock);
    await d.outboxRef(f.db, config, old).set({ nextAttemptAt: clock + 3600000 }, { merge: true });
  }
  const fresh = { ...d.transactionEvent(transaction(), config), time: clock };
  await d.queueEvent(f.db, config, fresh, () => clock);
  const result = await d.syncCouncilDiscord({ ...f, discord, config, scan: false, verify: async () => proposal, now: () => clock, maxEvents: 35 });
  assert.equal(result.delivered, 1);
  assert.equal(f.rows.get(d.outboxRef(f.db, config, fresh).key).status, 'sent');
  assert.equal([...f.rows.values()].filter(row => row.status === 'pending').length, 40);
});
