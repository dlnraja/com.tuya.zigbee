'use strict';
/**
 * Progress ledger (constitution: "Progress ledger" rule).
 * One machine-readable SSOT so no workflow or agent processes the same item twice.
 * Key = "<namespace>:<id>" (e.g. johan-issue:1298, dlnraja-issue:42, forum-post:140352/2114,
 * task:spec003-T1, diag:<hash>). An item is re-processed only when its content hash or
 * upstream updatedAt differs from what was recorded.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LEDGER = path.join(__dirname, '..', '..', 'data', 'progress', 'ledger.json');

function load(file = LEDGER) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return { version: 1, updated: null, checkpoints: {}, items: {} }; }
}

function save(l, file = LEDGER) {
  l.updated = new Date().toISOString();
  const items = {};
  for (const k of Object.keys(l.items).sort()) {items[k] = l.items[k];}
  l.items = items;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(l, null, 1)  }\n`);
}

const hash = (v) => crypto.createHash('sha1').update(typeof v === 'string' ? v : JSON.stringify(v)).digest('hex').slice(0, 16);

/** true when the item is new, not done, or changed since it was recorded. */
function shouldProcess(l, key, { contentHash, updatedAt } = {}) {
  const e = l.items[key];
  if (!e || e.status !== 'done') {return true;}
  if (contentHash && e.hash && contentHash !== e.hash) {return true;}
  if (updatedAt && e.updatedAt && String(updatedAt) > String(e.updatedAt)) {return true;}
  return false;
}

/** status: pending | in-progress | deferred | done | skipped-not-applicable */
function record(l, key, { status = 'done', commit, contentHash, updatedAt, note, by } = {}) {
  const prev = l.items[key] || {};
  l.items[key] = {
    ...prev, status, date: new Date().toISOString().slice(0, 10),
    ...commit ? { commit } : {}, ...contentHash ? { hash: contentHash } : {},
    ...updatedAt ? { updatedAt } : {}, ...note ? { note } : {}, ...by ? { by } : {},
  };
  return l.items[key];
}

module.exports = { LEDGER, load, save, hash, shouldProcess, record };
