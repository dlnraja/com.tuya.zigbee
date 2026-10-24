#!/usr/bin/env node
'use strict';
/**
 * P2908 — ledger intake for the Gmail diagnostics and forum-poll workflows.
 * Writes structured findings into data/progress/ledger.json (via scripts/lib/ledger.js) so the
 * daily resume can read them with `node scripts/progress/ledger-cli.js next diag|forum-post`.
 *
 * Rules kept here:
 *  - additive: an entry a human or another tool closed (done / blocked / manual / fixed) is never
 *    touched, and nothing is ever deleted;
 *  - idempotent: an entry is rewritten only when its findings hash changes (re-runs are no-ops);
 *  - bounded: at most `max` records per run, short arrays, no free text from mails or posts
 *    (identities, counts, ids, links and author handles only).
 *
 *   node scripts/progress/ledger-intake.js diag [report.json] [--queue=file] [--max=100] [--dry]
 */
const fs = require('fs');
const path = require('path');
const ledgerLib = require('../lib/ledger');

const ROOT = path.join(__dirname, '../..');
const CLOSED = new Set(['done', 'blocked', 'fixed', 'skipped-not-applicable']);
const MAX_LIST = 8;
const QUEUE_KEEP = 300;
const FIELD_KEYS = ['kind', 'mailDate', 'appVersion', 'logIdShort', 'couples', 'unsupported', 'conflicts', 'drivers', 'kb',
  'errors', 'topic', 'post', 'author', 'link', 'mfrs', 'pids', 'missing', 'images', 'counts', 'lastChangeRun'];

const uniq = (a) => [...new Set((a || []).filter(Boolean).map(String))];
// Identity-like tokens only: no spaces, no mail addresses, bounded length.
const safeTok = (s) => typeof s === 'string' && s.length <= 64 && !/[\s@<>]/.test(s);
const list = (a) => uniq(a).filter(safeTok).slice(0, MAX_LIST);

/** Never overwrite something a person or another tool already closed or pinned. */
function isProtected(e, by) {
  if (!e) {return false;}
  if (e.manual) {return true;}
  if (CLOSED.has(e.status) && e.by !== by) {return true;}
  return false;
}

/** Write one finding; returns 'new' | 'changed' | 'same' | 'protected'. */
function upsert(L, key, { status, note, fields, by }) {
  const prev = L.items[key];
  if (isProtected(prev, by)) {return 'protected';}
  const contentHash = ledgerLib.hash({ status, ...fields });
  if (prev && prev.hash === contentHash) {return 'same';}
  ledgerLib.record(L, key, { status, contentHash, note, by });
  // Drop finding fields of the previous version that are gone now, then write the new ones.
  for (const k of FIELD_KEYS) {if (!(k in fields)) {delete L.items[key][k];}}
  Object.assign(L.items[key], fields);
  return prev ? 'changed' : 'new';
}

// ── Gmail diagnostics ─────────────────────────────────────────────────────
function diagFinding(entry) {
  const xref = Array.isArray(entry.xref) ? entry.xref : [];
  const couples = list((entry.couples || []).map((c) => c && c.mfr && c.pid ? `${c.mfr}|${c.pid}` : null));
  const unsupported = list(xref.filter((x) => x && !x.supported).map((x) => x.fingerprint));
  const conflicts = list(xref.filter((x) => x && x.conflict).map((x) => x.fingerprint));
  const errors = Array.isArray(entry.errs) ? entry.errs.length : 0;
  const crash = entry.type === 'crash_report' || entry.type === 'bug_report';
  const fields = {
    kind: String(entry.type || 'unknown').slice(0, 32),
    mailDate: typeof entry.date === 'string' ? entry.date.slice(0, 40) : undefined,
    appVersion: safeTok(entry.appVersion) ? entry.appVersion : undefined,
    logIdShort: safeTok(entry.logIdShort) ? entry.logIdShort : undefined,
    couples: couples.length ? couples : undefined,
    unsupported: unsupported.length ? unsupported : undefined,
    conflicts: conflicts.length ? conflicts : undefined,
    drivers: list(entry.driversInLog).length ? list(entry.driversInLog) : undefined,
    kb: entry.kbMatch && safeTok(entry.kbMatch.id) ? entry.kbMatch.id : undefined,
    errors: errors || undefined,
  };
  for (const k of Object.keys(fields)) {if (fields[k] === undefined) {delete fields[k];}}
  const actionable = unsupported.length || conflicts.length || errors || crash;
  const parts = [`${fields.kind} mail`];
  if (couples.length) {parts.push(`${couples.length} couple(s)`);}
  if (unsupported.length) {parts.push(`${unsupported.length} identity(ies) not in any driver`);}
  if (conflicts.length) {parts.push(`${conflicts.length} in several drivers`);}
  if (errors) {parts.push(`${errors} error line(s)`);}
  if (!actionable) {parts.push('nothing new to act on');}
  return { status: actionable ? 'pending' : 'done', note: parts.join('; '), fields };
}

const diagKey = (entry) => {
  const id = entry && (entry.id || entry.logId || entry.logIdShort);
  return id ? `diag:${ledgerLib.hash(String(id))}` : null;
};

/**
 * Record the findings of one diagnostics report (plus an optional rolling queue of earlier
 * findings, so a refused commit does not lose them: re-applying is a no-op thanks to the hash).
 */
function recordDiagnostics(report, L, { max = 100, queue = [], by = 'gmail-diagnostics' } = {}) {
  const fresh = (report && Array.isArray(report.diagnostics) ? report.diagnostics : [])
    .map((e) => ({ key: diagKey(e), ...diagFinding(e) }))
    .filter((f) => f.key);
  const byKey = new Map();
  for (const f of [...Array.isArray(queue) ? queue : [], ...fresh]) {byKey.set(f.key, f);}
  const all = [...byKey.values()].slice(-QUEUE_KEEP);
  const stats = { new: 0, changed: 0, same: 0, protected: 0, capped: 0 };
  let written = 0;
  for (const f of all) {
    if (written >= max) { stats.capped++; continue; } // stays in the queue for the next run
    const r = upsert(L, f.key, { status: f.status, note: f.note, fields: f.fields, by });
    stats[r]++;
    if (r === 'new' || r === 'changed') {written++;}
  }
  return { stats, queue: all };
}

// ── Forum posts (forum-poll catch-up) ─────────────────────────────────────
/**
 * item: { topic, post, author, link, status: already-fixed|pending|needs-info, mfrs, pids,
 *         missing:[{mfr,pid}], images }
 * The history sweep keeps its own `forum:<topic>#<n>` entries; a post it already recorded is
 * skipped here so the same post is not tracked twice.
 */
function recordForumPosts(items, L, { max = 150, by = 'forum-poll' } = {}) {
  const stats = { new: 0, changed: 0, same: 0, protected: 0, sweep: 0, capped: 0 };
  let written = 0;
  for (const it of items || []) {
    if (!it || !it.topic || !it.post) {continue;}
    if (L.items[`forum:${it.topic}#${it.post}`]) { stats.sweep++; continue; }
    if (written >= max) { stats.capped++; continue; }
    const key = `forum-post:${it.topic}/${it.post}`;
    const missing = list((it.missing || []).map((m) => m && m.mfr ? `${m.mfr}|${m.pid || '?'}` : null));
    const fields = {
      topic: Number(it.topic), post: Number(it.post),
      author: safeTok(it.author) ? it.author : undefined,
      link: typeof it.link === 'string' && /^https:\/\/community\.homey\.app\//.test(it.link) ? it.link : undefined,
      mfrs: list(it.mfrs).length ? list(it.mfrs) : undefined,
      pids: list(it.pids).length ? list(it.pids) : undefined,
      missing: missing.length ? missing : undefined,
      images: Number(it.images) || undefined,
    };
    for (const k of Object.keys(fields)) {if (fields[k] === undefined) {delete fields[k];}}
    const status = it.status === 'already-fixed' ? 'done' : 'pending';
    const note = it.status === 'already-fixed' ? 'identities already in a driver'
      : it.status === 'pending' ? `identity not in a driver yet (${missing.slice(0, 3).join(', ') || 'see post'})`
        : `needs a closer look${fields.images ? ' (screenshots)' : ''}`;
    const r = upsert(L, key, { status, note, fields, by });
    stats[r]++;
    if (r === 'new' || r === 'changed') {written++;}
  }
  return stats;
}

// ── Workflow run summaries (P3021b) ───────────────────────────────────────
// Enrichment and diagnostics workflows that have no per-item findings still leave one bounded
// entry per workflow (`workflow-run:<id>`), so the daily resume sees what they last changed.
// Only numbers are kept (top level and one nested level), never free text from the summary.
const MAX_COUNTS = 16;
const RUN_ID = /^[a-z0-9][a-z0-9-]{1,63}$/;

function summaryCounts(summary) {
  const out = {};
  const put = (k, v) => {
    if (Object.keys(out).length >= MAX_COUNTS) {return;}
    if (typeof v === 'number' && Number.isFinite(v) && /^[A-Za-z0-9_.]{1,48}$/.test(k)) {out[k] = v;}
  };
  if (!summary || typeof summary !== 'object' || Array.isArray(summary)) {return out;}
  for (const [k, v] of Object.entries(summary)) {
    if (typeof v === 'number') {put(k, v);} else if (Array.isArray(v)) {put(`${k}.length`, v.length);} else if (v && typeof v === 'object') {
      for (const [k2, v2] of Object.entries(v)) {
        if (typeof v2 === 'number') {put(`${k}.${k2}`, v2);} else if (Array.isArray(v2)) {put(`${k}.${k2}.length`, v2.length);}
      }
    }
  }
  return out;
}

/** Record one workflow run summary; returns 'new' | 'changed' | 'same' | 'protected' | 'invalid'. */
function recordRunSummary(workflow, summary, L, { runId, missing = false } = {}) {
  if (!RUN_ID.test(String(workflow || ''))) {return 'invalid';}
  const counts = summaryCounts(summary);
  const failed = missing || (summary && summary.ok === false);
  const status = failed ? 'pending' : 'done';
  const note = missing ? 'run left no summary file'
    : failed ? 'run reported ok=false' : `run summary: ${Object.keys(counts).length} counter(s)`;
  const fields = { counts };
  if (runId && /^\d{1,20}$/.test(String(runId))) {fields.lastChangeRun = String(runId);}
  // The hash ignores the run id: an unchanged summary does not rewrite the ledger.
  const key = `workflow-run:${workflow}`;
  const prev = L.items[key];
  if (isProtected(prev, workflow)) {return 'protected';}
  const contentHash = ledgerLib.hash({ status, counts });
  if (prev && prev.hash === contentHash) {return 'same';}
  const r = upsert(L, key, { status, note, fields, by: workflow });
  L.items[key].hash = contentHash; // keep the run-id-free hash so the next identical run is 'same'
  return r;
}

function mainRun(argv, opt, dry) {
  const workflow = argv[1];
  const file = argv[2] && !argv[2].startsWith('--') ? argv[2] : null;
  if (!workflow || !RUN_ID.test(workflow)) { console.error('usage: ledger-intake.js run <workflow-id> [summary.json] [--dry]'); return 2; }
  let summary = null;
  let missing = !file;
  if (file) { try { summary = JSON.parse(fs.readFileSync(path.resolve(ROOT, file), 'utf8')); } catch { missing = true; } }
  const L = ledgerLib.load();
  const r = recordRunSummary(workflow, summary, L, { runId: opt('run-id', process.env.GITHUB_RUN_ID), missing });
  if (!dry && (r === 'new' || r === 'changed')) {ledgerLib.save(L);}
  const line = `ledger run intake ${workflow}: ${r}${dry ? ' [dry]' : ''}`;
  console.log(line);
  if (process.env.GITHUB_STEP_SUMMARY) { try { fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `- ${line}\n`); } catch { /* best effort */ } }
  return 0;
}

function main(argv = process.argv.slice(2)) {
  const opt = (k, d) => { const a = argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
  const dry = argv.includes('--dry');
  const cmd = argv[0];
  if (cmd === 'run') {return mainRun(argv, opt, dry);}
  if (cmd !== 'diag') { console.error('usage: ledger-intake.js diag [report.json] [--queue=file] [--max=100] [--by=workflow] [--dry] | run <workflow-id> [summary.json]'); return 2; }
  const by = opt('by', 'gmail-diagnostics');
  if (!RUN_ID.test(by)) { console.error('ledger-intake: --by must be a workflow id'); return 2; }
  const reportPath = argv[1] && !argv[1].startsWith('--') ? argv[1] : path.join(ROOT, '.github/state/diagnostics-report.json');
  const queuePath = opt('queue', path.join(ROOT, '.github/state/diag-ledger-queue.json'));
  let report = null;
  try { report = JSON.parse(fs.readFileSync(reportPath, 'utf8')); } catch { report = { diagnostics: [] }; }
  let queue = [];
  try { queue = JSON.parse(fs.readFileSync(queuePath, 'utf8')).items || []; } catch { queue = []; }
  const L = ledgerLib.load();
  const r = recordDiagnostics(report, L, { max: Math.max(1, Number(opt('max', '100')) || 100), queue, by });
  const changed = r.stats.new + r.stats.changed;
  if (!dry) {
    if (changed) {ledgerLib.save(L);}
    fs.mkdirSync(path.dirname(queuePath), { recursive: true });
    fs.writeFileSync(queuePath, `${JSON.stringify({ updated: new Date().toISOString(), items: r.queue }, null, 1)}\n`);
  }
  const line = `ledger diag intake (${by}): ${JSON.stringify(r.stats)} (queue ${r.queue.length})${dry ? ' [dry]' : ''}`;
  console.log(line);
  if (process.env.GITHUB_STEP_SUMMARY) { try { fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `- ${line}\n`); } catch { /* best effort */ } }
  return 0;
}

module.exports = { recordDiagnostics, recordForumPosts, diagFinding, diagKey, upsert, isProtected, recordRunSummary, summaryCounts, main };
if (require.main === module) {process.exitCode = main();}
