const sdk = require('algosdk');
const { Buffer } = require('buffer');
const protocol = require('./protocol.json');
const { parseUnits, formatUnits } = require('../market/model');
const ZERO = sdk.encodeAddress(new Uint8Array(32));
const STATES = ['Voting', 'Passed', 'Declined'];
const KINDS = ['Payment', 'Asset opt-in', 'Tinyman swap', 'Council rule', 'Council address'];
function layout(fields) { let size = 0; const offsets = {}; for (const [k, width] of Object.entries(fields)) { offsets[k] = size; size += width; } return { size, offsets }; }
const P = layout(protocol.proposalFields), C = layout(protocol.configFields), A = layout(protocol.actionFields);
// Firebase holds the manifest and action bytes. Only immutable commitments and
// the voting/accounting header consume application storage.
const ACTION_SIZE = A.size, PROPOSAL_SIZE = P.size;
const mbr = (key, size) => 2500 + 400 * (key + size);
const PROPOSAL_MBR = mbr(11, PROPOSAL_SIZE), VOTE_MBR = mbr(19, protocol.voteSize), CONFIG_MBR = mbr(3, C.size);
const u64 = (n) => sdk.encodeUint64(BigInt(n));
const key = (prefix, ...ids) => new Uint8Array(Buffer.concat([Buffer.from(prefix), ...ids.map((n) => Buffer.from(u64(n)))]));
const configKey = () => key('C3C'), proposalKey = (id) => key('C3P', id), voteKey = (id, nft) => key('C3V', id, nft);
function decode(fields, bytes, offset = 0) {
  const b = Buffer.from(bytes), out = {}; let pos = offset;
  for (const [name, width] of Object.entries(fields)) {
    out[name] = width === 8 ? b.readBigUInt64BE(pos).toString() : ['digest','actionsHash','root'].includes(name) ? b.subarray(pos, pos + width).toString('hex') : sdk.encodeAddress(b.subarray(pos, pos + width)); pos += width;
  } return out;
}
function encode(fields, values) {
  return Buffer.concat(Object.entries(fields).map(([name,width]) => width === 8 ? Buffer.from(u64(values[name] || 0)) : ['digest','actionsHash','root'].includes(name) ? Buffer.from(values[name], 'hex') : Buffer.from(sdk.decodeAddress(values[name] || ZERO).publicKey)));
}
function decodeConfig(bytes) { if (bytes.length !== C.size) throw Error('Invalid Council configuration.'); return decode(protocol.configFields, bytes); }
function decodeProposal(bytes, id) {
  if (bytes.length !== PROPOSAL_SIZE) throw Error('Invalid Council proposal.');
  const p = { id: String(id), ...decode(protocol.proposalFields, bytes) };
  for (const k of ['state','created','deadline','actionCount']) p[k] = Number(p[k]);
  if (p.actionCount > protocol.maxActions) throw Error('Invalid Council action count.');
  p.actions = []; return p;
}
function wordCount(text) { return String(text || '').trim().split(/\s+/u).filter(Boolean).length; }
function quoteProposal(input, policy = protocol.defaults) {
  const words = wordCount(`${input.title || ''} ${input.body || ''} ${(input.images||[]).map(im=>im.caption||'').join(' ')}`), images = (input.images || []).length;
  if (words > protocol.maxWords || images > protocol.maxImages) throw Error('Maximum 10,000 words and five attachments per proposal.');
  const effectiveWords = words + images * protocol.imageWords;
  const days = effectiveWords <= Number(policy.shortMax) ? Number(policy.shortDays) : effectiveWords <= Number(policy.mediumMax) ? Number(policy.mediumDays) : Number(policy.longDays);
  const fee = BigInt(policy.baseFee) + BigInt(policy.wordFee) * BigInt(words) + BigInt(policy.imageFee) * BigInt(images);
  const host = fee * BigInt(policy.hostBps) / 10000n, voters = fee * BigInt(policy.rewardBps) / 10000n;
  return { words, images, effectiveWords, days, duration:days*86400, fee:fee.toString(), host:host.toString(), voters:voters.toString(), treasury:(fee-host-voters).toString() };
}
function normalizeAction(raw) {
  const kind = Number(raw.kind);
  if (!Number.isInteger(kind) || kind < 0 || kind > 4) throw Error('Invalid treasury action.');
  const number = (n) => { const s=String(n ?? '0'); if (!/^\d+$/.test(s)||BigInt(s)>18446744073709551615n) throw Error('Invalid action amount or identifier.'); return s; };
  const a = { kind:String(kind), asset:number(raw.asset), amount:number(raw.amount), outputAsset:number(raw.outputAsset), recipient:raw.recipient || ZERO, pool:raw.pool || ZERO, setting:number(raw.setting), value:number(raw.value) };
  if(BigInt(a.asset)>BigInt(Number.MAX_SAFE_INTEGER)||BigInt(a.outputAsset)>BigInt(Number.MAX_SAFE_INTEGER))throw Error('Asset identifier exceeds the supported safe integer range.');
  if (!sdk.isValidAddress(a.recipient)||!sdk.isValidAddress(a.pool)) throw Error('Use a valid Algorand address.');
  if (kind === 0 && (BigInt(a.amount)===0n || a.recipient===ZERO)) throw Error('A payment needs a recipient and positive atomic amount.');
  if (kind === 1 && BigInt(a.asset)===0n) throw Error('Choose an ASA to opt into.');
  if (kind === 2 && (BigInt(a.amount)===0n||a.asset===a.outputAsset||a.pool===ZERO)) throw Error('A swap needs distinct assets, a positive input and a Tinyman pool.');
  if (kind === 3 && Number(a.setting)>=protocol.settings.length) throw Error('Invalid Council setting.');
  if (kind === 4 && (Number(a.setting)>2||a.recipient===ZERO)) throw Error('Choose hosting, quote signer or executor address.');
  return a;
}
function normalizeProposal(input) {
  const title = String(input.title || '').trim(), body = String(input.body || '').trim();
  if (title.length < 8 || title.length > 100 || body.length < 20 || body.length > 100000) throw Error('Use a title of 8–100 characters and a prompt of 20–100,000 characters.');
  const images = (input.images || []).map((im) => {
    if (!/^[a-f0-9]{64}$/.test(im.hash || '')) throw Error('Invalid attachment digest.');
    const attachment={hash:im.hash,caption:String(im.caption||'').slice(0,500)};
    // Old image manifests retain their exact canonical representation. New
    // attachment metadata is supplied from verified Firebase records at quote.
    if(im.kind!==undefined||im.contentType!==undefined||im.size!==undefined||im.name!==undefined){
      const contentType=String(im.contentType||'image/jpeg').toLowerCase();
      const kind=String(im.kind||(contentType.startsWith('video/')?'video':'image'));
      const size=Number(im.size);
      if(!['image','video'].includes(kind)||!new RegExp('^'+kind+'\\/[a-z0-9][a-z0-9.+-]*$').test(contentType)||!Number.isSafeInteger(size)||size<1||size>5*1024**4)throw Error('Invalid attachment metadata.');
      Object.assign(attachment,{kind,contentType,size,name:String(im.name||'Attachment').normalize('NFC').replace(/[\u0000-\u001f\u007f]/g,'').replace(/[\\/]/g,'_').slice(0,255)});
    }
    return attachment;
  });
  const actions = (input.actions || []).map(normalizeAction);
  if (actions.length > protocol.maxActions) throw Error('At most eight treasury or governance actions per proposal.');
  const p = { v:3, title, body, images, actions }; quoteProposal(p); return p;
}
function encodeActions(actions) { return Buffer.concat(actions.map((a) => encode(protocol.actionFields, normalizeAction(a)))); }
function validatePolicyActions(actions,config){
  const state={...config};
  for(const [index,raw] of actions.entries()){const a=normalizeAction(raw);
    if(Number(a.kind)===4&&Number(a.setting)===2&&index!==actions.length-1)throw Error('Executor rotation must be the last action.');
    if(Number(a.kind)!==3)continue;state[protocol.settings[Number(a.setting)]]=a.value;
    const n=k=>BigInt(state[k]);
    if(n('baseFee')>1000000000000n||n('wordFee')>1000000000n||n('imageFee')>1000000000000n||n('minVotes')<1n||n('minVotes')>BigInt(config.members)||n('approvalBps')<1n||n('approvalBps')>10000n||n('hostBps')+n('rewardBps')>10000n||n('shortMax')<1n||n('mediumMax')<n('shortMax')||n('slippageBps')>1000n||['shortDays','mediumDays','longDays'].some(k=>n(k)<1n||n(k)>90n))throw Error('Council rule action exceeds the contract bounds or conflicts with another current rule.');
  }return state;
}
function signedQuoteBytes({digest, actionsHash, sender, fee, words, images, expires, revision, appId}) {
  return Buffer.concat([Buffer.from('DCCOUNCIL3'),Buffer.from(u64(appId)),Buffer.from(digest,'hex'),Buffer.from(actionsHash,'hex'),Buffer.from(sdk.decodeAddress(sender).publicKey),... [fee,words,images,expires,revision].map((v)=>Buffer.from(u64(v)))]);
}
function tally(p, now = Math.floor(Date.now()/1000)) {
  const yes=BigInt(p.yes||0), no=BigInt(p.no||0), abstain=BigInt(p.abstain||0), turnout=yes+no+abstain;
  const rewardPool=BigInt(p.rewardPool||0), members=BigInt(p.eligibleMembers||0);
  const reward=BigInt(p.rewardPerVote||0), paid=BigInt(p.rewardPaid||0);
  return {yes:Number(yes),no:Number(no),abstain:Number(abstain),turnout:Number(turnout),support:yes+no ? Number(yes*10000n/(yes+no))/100:0,
    passes:turnout>=BigInt(p.minVotes||50)&&yes+no>0n&&yes*10000n>=(yes+no)*BigInt(p.approvalBps||6000),
    ended:now>=Number(p.deadline),reward:reward.toString(),
    dust:(rewardPool-reward*members).toString(),
    rewardRemaining:(reward*members-paid).toString()};
}
module.exports={protocol,ZERO,STATES,KINDS,P,C,A,ACTION_SIZE,PROPOSAL_SIZE,PROPOSAL_MBR,VOTE_MBR,CONFIG_MBR,u64,configKey,proposalKey,voteKey,decodeConfig,decodeProposal,encode,encodeActions,normalizeAction,normalizeProposal,quoteProposal,validatePolicyActions,signedQuoteBytes,tally,wordCount,parseUnits,formatUnits};
