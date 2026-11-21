const algosdk = require('algosdk');
const { Buffer } = require('buffer');
const protocol = require('./protocol.json');
const { parseUnits, formatUnits } = require('../market/model');
const KINDS = ['Question', 'Feature / work', 'Work quote', 'Completion review'];
const STATES = ['Voting', 'Approved', 'Declined', 'Paid', 'Expired / superseded'];
let size = 0;
const OFFSETS = Object.fromEntries(Object.entries(protocol.proposalFields).map(([key, width]) => { const offset = size; size += width; return [key, offset]; }));
const PROPOSAL_SIZE = size;
const PROPOSAL_MBR = 2500 + 400 * (9 + size);
const VOTE_MBR = 2500 + 400 * (17 + protocol.voteSize);
const u64 = (n) => algosdk.encodeUint64(BigInt(n));
const proposalKey = (id) => new Uint8Array(Buffer.concat([Buffer.from('P'), Buffer.from(u64(id))]));
const voteKey = (id, nftId) => new Uint8Array(Buffer.concat([Buffer.from('V'), Buffer.from(u64(id)), Buffer.from(u64(nftId))]));
function decodeProposal(bytes, id) {
  const b = Buffer.from(bytes);
  if (b.length !== size) throw new Error('Invalid council proposal record.');
  const value = { id: String(id) };
  for (const [key, width] of Object.entries(protocol.proposalFields)) {
    const offset = OFFSETS[key];
    value[key] = width === 8 ? b.readBigUInt64BE(offset).toString() : key === 'digest' ? b.subarray(offset, offset + width).toString('hex') : algosdk.encodeAddress(b.subarray(offset, offset + width));
  }
  for (const key of ['kind', 'state', 'created', 'deadline', 'workDeadline']) value[key] = Number(value[key]);
  return value;
}
function tally(proposal, totalMembers, quorumBps, now = Math.floor(Date.now() / 1000)) {
  const yes = BigInt(proposal.yes), no = BigInt(proposal.no), abstain = BigInt(proposal.abstain);
  const turnout = yes + no + abstain, members = BigInt(totalMembers || 0);
  const basis = (n) => members ? Number(n * 10000n / members) / 100 : 0;
  const pool = BigInt(protocol.fee) + BigInt(proposal.offering);
  const reward = members ? pool / members : 0n;
  const earned = reward * turnout;
  return { yes: Number(yes), no: Number(no), abstain: Number(abstain), turnout: Number(turnout),
    support: basis(yes), participation: basis(turnout),
    quorum: members > 0n && turnout * 10000n >= members * BigInt(quorumBps),
    passes: members > 0n && turnout * 10000n >= members * BigInt(quorumBps) && yes > no,
    ended: now >= proposal.deadline, pool: pool.toString(), reward: reward.toString(), earned: earned.toString(),
    treasuryRemainder: members ? (pool - earned).toString() : '0' };
}
function parseOffering(value) {
  const text = String(value ?? '').trim() || '0';
  if (/^0+(?:\.0{1,6})?$/.test(text)) return 0n;
  return parseUnits(text, 6);
}
function proposalNote(input) {
  const title = String(input.title || '').trim(), body = String(input.body || '').trim();
  if (title.length < 8 || title.length > 100) throw new Error('Use a title between 8 and 100 characters.');
  if (body.length < 20 || body.length > 600) throw new Error('Use a question or work description between 20 and 600 characters.');
  const note = Buffer.from(JSON.stringify({ v: 1, title, body }));
  if (note.length > 1000) throw new Error('The proposal exceeds the on-chain text limit. Shorten the description.');
  return new Uint8Array(note);
}
function voteNote(reason = '') {
  const text = String(reason).trim();
  if (text.length > 280) throw new Error('Keep the voting reason to 280 characters.');
  const note = Buffer.from(JSON.stringify({ v: 1, reason: text }));
  if (note.length > 1000) throw new Error('The voting reason is too long.');
  return new Uint8Array(note);
}
module.exports = { protocol, KINDS, STATES, OFFSETS, PROPOSAL_SIZE, PROPOSAL_MBR, VOTE_MBR, u64, proposalKey, voteKey, decodeProposal, tally, proposalNote, voteNote, parseUnits, parseOffering, formatUnits };
