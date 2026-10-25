#!/usr/bin/env node
'use strict';
/**
 * P3048 t539u — deterministic self-maintenance (no AI, no network except optional git history).
 *   (c) rotation: journal > 2000 lines -> monthly archive; bounded caches (OCR hash cache, learned patterns).
 *   (d) self-repair: corrupt journal lines dropped; corrupt pointer/cursor JSON restored from the last
 *       version of the file in git history that parses, else reset to an empty skeleton of the same type
 *       (the reader then rebuilds incrementally from scratch). Every repair is journalled.
 *   (e) self-improvement without AI: transient failure literals learned from the journal (a failure that
 *       a plain re-run fixed on >= 2 distinct runs in 30 days) are added to data/automation/failure-patterns.json.
 *       Additive only, never a "real" failure hint, never a device couple (couples stay with the sourced
 *       enrichment workflows).
 *
 *   node scripts/automation/self-maintain.cjs [--dry]
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const POINTERS = [
  'data/leads/forum-lastseen.json', 'data/leads/image-ocr-cursor.json', 'data/leads/issue557-cursor.json',
  'data/leads/deep-read-checkpoint.json', 'data/leads/resume-checkpoint.json', 'data/leads/sweep-checkpoint.json',
  'data/leads/ocr-hash-cache.json', 'data/sources/state.json', 'docs/automation/leads-other-apps-cursor.json',
  'docs/knowledge/athom-bisect-state.json', 'data/automation/failure-patterns.json',
];
const CAPS = { 'data/leads/ocr-hash-cache.json': 20000 };
const MAX_LEARNED = 200;

function gitRestore(rel, root = ROOT) {
  const log = spawnSync('git', ['log', '--format=%H', '-n', '20', '--', rel], { cwd: root, encoding: 'utf8' });
  if (log.status !== 0) return null;
  for (const sha of log.stdout.split('\n').filter(Boolean)) {
    const r = spawnSync('git', ['show', `${sha}:${rel}`], { cwd: root, encoding: 'utf8', maxBuffer: 64 << 20 });
    if (r.status !== 0) continue;
    try { JSON.parse(r.stdout); return { sha: sha.slice(0, 10), text: r.stdout }; } catch { /* older */ }
  }
  return null;
}

/** checkPointer(rel) -> { file, state: ok|missing|repaired|reset, from? } (writes unless dry). */
function checkPointer(rel, { root = ROOT, dry = false } = {}) {
  const f = path.join(root, rel);
  if (!fs.existsSync(f)) return { file: rel, state: 'missing' };
  const text = fs.readFileSync(f, 'utf8');
  try { JSON.parse(text); return { file: rel, state: 'ok' }; } catch { /* corrupt */ }
  const good = gitRestore(rel, root);
  if (good) { if (!dry) fs.writeFileSync(f, good.text); return { file: rel, state: 'repaired', from: good.sha }; }
  const skeleton = /^\s*\[/.test(text) ? '[]\n' : '{}\n';
  if (!dry) fs.writeFileSync(f, skeleton);
  return { file: rel, state: 'reset', from: 'skeleton' };
}

/** capObject(obj, max): keeps the newest `max` keys of a { key: { at|t } } map (insertion order fallback). */
function capObject(obj, max) {
  const keys = Object.keys(obj || {});
  if (keys.length <= max) return { obj, dropped: 0 };
  const t = (k) => { const v = obj[k] || {}; const x = Date.parse(v.at || v.t || v.seenAt || ''); return Number.isFinite(x) ? x : 0; };
  const keep = keys.map((k, i) => [k, t(k), i]).sort((a, b) => (b[1] - a[1]) || (b[2] - a[2])).slice(0, max).map((x) => x[0]);
  const out = {}; for (const k of keys) if (keep.includes(k)) out[k] = obj[k];
  return { obj: out, dropped: keys.length - max };
}

function capFile(rel, max, { root = ROOT, dry = false } = {}) {
  const f = path.join(root, rel);
  if (!fs.existsSync(f)) return { file: rel, dropped: 0 };
  let j; try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return { file: rel, dropped: 0 }; }
  let dropped = 0;
  for (const field of ['byUrl', 'byHash']) {
    if (j && j[field] && typeof j[field] === 'object') { const r = capObject(j[field], max); j[field] = r.obj; dropped += r.dropped; }
  }
  if (dropped && !dry) fs.writeFileSync(f, `${JSON.stringify(j, null, 1)}\n`);
  return { file: rel, dropped };
}

/** learnPatterns(): additive merge of ci-failure.learn() into failure-patterns.json. */
function learnPatterns({ root = ROOT, dry = false, entries } = {}) {
  const ci = require('./ci-failure.cjs');
  const journal = require('./journal.cjs');
  const file = path.join(root, 'data', 'automation', 'failure-patterns.json');
  let j; try { j = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { j = { transient: [] }; }
  if (!Array.isArray(j.transient)) j.transient = [];
  const fresh = ci.learn(entries || journal.readSince(24 * 30), j.transient);
  const room = Math.max(0, MAX_LEARNED - j.transient.length);
  const add = fresh.slice(0, room);
  if (add.length && !dry) { j.transient.push(...add); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, `${JSON.stringify(j, null, 2)}\n`); }
  return { learned: add.map((x) => x.literal), total: j.transient.length };
}

function run({ dry = false } = {}) {
  const journal = require('./journal.cjs');
  const rep = { repairJournal: dry ? { dropped: journal.parseLines(fs.existsSync(journal.DEFAULT_FILE) ? fs.readFileSync(journal.DEFAULT_FILE, 'utf8') : '').bad } : journal.repair(), rotate: dry ? null : journal.rotate(), pointers: [], caps: [], learn: null };
  for (const p of POINTERS) rep.pointers.push(checkPointer(p, { dry }));
  for (const [p, max] of Object.entries(CAPS)) rep.caps.push(capFile(p, max, { dry }));
  rep.learn = learnPatterns({ dry });
  const fixed = rep.pointers.filter((p) => p.state === 'repaired' || p.state === 'reset');
  const dropped = rep.caps.reduce((s, c) => s + c.dropped, 0);
  if (!dry) {
    journal.append({ workflow: 'self-maintain', status: fixed.length || rep.repairJournal.dropped ? 'warn' : 'ok',
      key: `self-maintain:${new Date().toISOString().slice(0, 10)}`,
      summary: `journal: ${rep.repairJournal.dropped} corrupt line(s) dropped, ${(rep.rotate || {}).moved || 0} archived; pointers: ${fixed.map((p) => `${p.file} ${p.state}${p.from ? ` from ${p.from}` : ''}`).join(', ') || 'all valid'}; caches trimmed: ${dropped}; learned transient literals: ${rep.learn.learned.length}`,
      data: { fixed, learned: rep.learn.learned } });
  }
  return rep;
}

module.exports = { POINTERS, checkPointer, capObject, capFile, learnPatterns, run };
if (require.main === module) {
  const rep = run({ dry: process.argv.includes('--dry') });
  const md = `### Self-maintenance (P3048, no AI)\n- journal: ${rep.repairJournal.dropped} corrupt line(s), ${(rep.rotate || {}).moved || 0} archived\n${rep.pointers.map((p) => `- ${p.file}: ${p.state}${p.from ? ` (${p.from})` : ''}`).join('\n')}\n- learned transient literals: ${rep.learn.learned.join(' | ') || 'none'} (total ${rep.learn.total})\n`;
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
  console.log(md);
}
