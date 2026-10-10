#!/usr/bin/env node
'use strict';
/**
 * P2810: second pass over needs-info / pending sweep items (no network, no AI).
 * Cross-checks each Johan item against the other free sources already in the repo:
 *   - data/leads/image-ocr.json (OCR of screenshots in the same thread),
 *   - data/leads/johan-canonical-index.json (identities parsed from maintainer + batch comments,
 *     canonical link → inherit identities of the canonical thread),
 * then re-classifies with the shared helper. Items stay pending when a couple is still missing;
 * nothing is ever written to drivers here. Updates data/leads/sweep-checkpoint.json in place.
 *   node scripts/progress/sweep-crosscheck.js [--dry]
 */
const fs = require('fs');
const path = require('path');
const { classify } = require('./lib/sweep-identity');

const ROOT = path.join(__dirname, '../..');
const CP = path.join(ROOT, 'data/leads/sweep-checkpoint.json');
const load = (p, d) => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8')); } catch { return d; } };
const DRY = process.argv.includes('--dry');

const cp = JSON.parse(fs.readFileSync(CP, 'utf8'));
const ocr = load('data/leads/image-ocr.json', { entries: [] }).entries || [];
const idx = load('data/leads/johan-canonical-index.json', { issues: {} }).issues || {};
const ocrBy = new Map();
for (const e of ocr) {
  if (e.repo !== 'JohanBendz/com.tuya.zigbee') continue;
  const k = Number(e.issue);
  if (!ocrBy.has(k)) ocrBy.set(k, { mfrs: new Set(), pids: new Set() });
  (e.mfrs || []).forEach((m) => ocrBy.get(k).mfrs.add(m));
  (e.pids || []).forEach((p) => ocrBy.get(k).pids.add(p));
}

let changed = 0; const moves = {};
for (const it of cp.items) {
  const m = /^johan-issue:(\d+)$/.exec(it.id);
  if (!m || it.manual || !['needs-info', 'pending'].includes(it.status)) continue;
  const n = Number(m[1]);
  const mfrs = new Set(it.mfrs || []); const pids = new Set(it.pids || []);
  const add = (src) => { (src.mfrs || []).forEach((x) => mfrs.add(x)); (src.pids || []).forEach((x) => pids.add(x)); };
  const used = [];
  if (ocrBy.has(n)) { add({ mfrs: [...ocrBy.get(n).mfrs], pids: [...ocrBy.get(n).pids] }); used.push('image-ocr'); }
  const e = idx[n];
  const fromIdx = (x) => { for (const [mf, pd] of (x && x.identities) || []) { mfrs.add(mf); pids.add(pd); } };
  if (e && (e.identities || []).length) { fromIdx(e); used.push('maintainer-index'); }
  if (e && e.canonical && idx[e.canonical]) { fromIdx(idx[e.canonical]); used.push(`canonical#${e.canonical}`); }
  if (!used.length && it.status === 'pending' && (it.mfrs || []).length) used.push('recheck');
  if (!used.length) continue;
  const c = classify({ mfrs: [...mfrs], pids: [...pids], request: true });
  const before = it.status;
  if (c.status === before && c.status !== 'pending') continue;
  const missing = c.cov.missing.map((x) => `${x.mfr}|${x.pid || '?'}`);
  Object.assign(it, {
    status: c.status === 'no-action' ? before : c.status,
    mfrs: [...mfrs].slice(0, 12), pids: [...pids].slice(0, 8),
    missing: missing.length ? missing : undefined,
    crosscheck: { at: new Date().toISOString().slice(0, 10), via: used, from: before },
  });
  if (it.status !== before) { changed++; moves[`${before}->${it.status}`] = (moves[`${before}->${it.status}`] || 0) + 1; }
}
cp.stats = cp.items.reduce((a, it) => { a[it.status] = (a[it.status] || 0) + 1; return a; }, {});
if (!DRY) fs.writeFileSync(CP, `${JSON.stringify(cp, null, 2)}\n`);
console.log(JSON.stringify({ changed, moves, stats: cp.stats }));
