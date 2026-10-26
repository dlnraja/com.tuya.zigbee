#!/usr/bin/env node
'use strict';
/**
 * P3073 §1 — learn from our own CI runs (no AI, no network, Node built-ins only).
 *
 * Reads the journal that `ci-failure.cjs collect` already fills (data/progress/automation-journal.jsonl:
 * fail / transient / recovered lines) and keeps a small ledger of failure signatures in
 * data/learning/ci-signatures.json (max 300, least-recently-seen evicted first).
 * Output is proposals only: it never edits a gate, a ratchet baseline or failure-patterns.json
 * (ci-failure.cjs learn() keeps owning transient-pattern learning).
 *
 * CLI: node scripts/learning/ci-signatures.cjs [--journal=F] [--ledger=F] [--dry] [--report]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const JOURNAL = path.join(ROOT, 'data', 'progress', 'automation-journal.jsonl');
const LEDGER = path.join(ROOT, 'data', 'learning', 'ci-signatures.json');
const MAX_SIGS = 300;
const MAX_BRANCHES = 4;
const MAX_SAMPLE = 160;
const MAX_SEEN_KEYS = 600;
const FLAKY_DAYS = 14;

// Order matters: the first match wins.
const CATEGORIES = [
  ['cancelled', /\bcancel(l)?ed\b|operation was canceled|higher priority waiting request/i],
  ['athom-api', /socket hang up|AggregateError|invalid_state|processing_failed|apps-api|athom/i],
  ['timeout-flaky', /timeout of \d+ms exceeded|timed? ?out|ETIMEDOUT|exceeded the maximum execution time/i],
  ['network', /ECONNRESET|ECONNREFUSED|EAI_AGAIN|getaddrinfo|fetch failed|\b(429|5\d\d)\b|rate limit|Bad Gateway|Service Unavailable/i],
  ['size', /payload|too large|headroom|size gate|MB \/|KB \//i],
  ['i18n-gap', /\bi18n\b|translation|missing (fr|de|nl|en)\b|locale/i],
  ['lint', /eslint|lint|prettier/i],
  ['validate', /homey app validate|validation (error|failed)|failed to validate|schema|invalid_flow_card/i],
  ['gate', /\bgates?\b|ratchet|baseline/i],
  ['test', /AssertionError|\d+ failing|not ok \d+|test(s)? failed|expected .* to|code-or-test|\bsuite\b|mocha|\btests?\b/i],
];

function category(msg, step = '', job = '') {
  const t = `${msg || ''} ${step || ''} ${job || ''}`;
  for (const [name, re] of CATEGORIES) if (re.test(t)) return name;
  return 'other';
}

/** mocha `  3) suite title` or node:test `not ok 4 - title` → short test title, else ''. */
function testTitle(msg) {
  const s = String(msg || '');
  const m = s.match(/not ok \d+ - (.+)$/m) || s.match(/^\s*\d+\) (.+)$/m);
  return m ? m[1].trim().slice(0, 80) : '';
}

function readJournal(file = JOURNAL) {
  if (!fs.existsSync(file)) return [];
  const out = [];
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { const e = JSON.parse(line); if (e && e.workflow === 'ci-collect' && e.data) out.push(e); } catch (_) { /* skip broken line */ }
  }
  return out;
}

function emptyLedger() { return { schema: 1, updatedAt: null, cap: MAX_SIGS, seenKeys: [], signatures: {} }; }

function loadLedger(file = LEDGER) {
  try { const l = JSON.parse(fs.readFileSync(file, 'utf8')); if (l && l.signatures) return Object.assign(emptyLedger(), l); } catch (_) { /* new */ }
  return emptyLedger();
}

/** Fold journal entries into the ledger (idempotent thanks to seenKeys). Returns { ledger, added }. */
function ingest(ledger, entries) {
  const seen = new Set(ledger.seenKeys || []);
  let added = 0;
  for (const e of entries) {
    const key = e.key || `${e.run}:${e.status}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const d = e.data || {};
    const sig = d.sig || 'unknown';
    const [job, step] = String((String(e.summary || '').match(/\(([^)]*)\)\s*$/) || [, ''])[1]).split(' / ');
    const s = ledger.signatures[sig] || (ledger.signatures[sig] = {
      category: category(d.message, step, job), workflow: d.name || d.wf || '', unit: [job, (step || '').split(':')[0]].filter(Boolean).join(' / ').slice(0, 80),
      test: testTitle(d.message), firstSeen: e.at, lastSeen: e.at, fails: 0, transient: 0, recovered: 0, branches: [], sample: '', events: [] });
    if (e.status === 'fail') s.fails++; else if (e.status === 'transient') s.transient++; else if (e.status === 'recovered') s.recovered++;
    if (!s.firstSeen || e.at < s.firstSeen) s.firstSeen = e.at;
    if (!s.lastSeen || e.at > s.lastSeen) s.lastSeen = e.at;
    if (d.branch && !s.branches.includes(d.branch)) { s.branches.push(d.branch); if (s.branches.length > MAX_BRANCHES) s.branches.shift(); }
    if (!s.sample && d.message) s.sample = String(d.message).slice(0, MAX_SAMPLE);
    s.events.push([e.at, e.status[0]]); if (s.events.length > 20) s.events.splice(0, s.events.length - 20);
    added++;
  }
  ledger.seenKeys = [...seen].slice(-MAX_SEEN_KEYS);
  // LRU cap
  const keys = Object.keys(ledger.signatures);
  if (keys.length > MAX_SIGS) {
    keys.sort((a, b) => String(ledger.signatures[a].lastSeen).localeCompare(String(ledger.signatures[b].lastSeen)));
    for (const k of keys.slice(0, keys.length - MAX_SIGS)) delete ledger.signatures[k];
  }
  return { ledger, added };
}

/** Share of failures in the last 14 days that later recovered on the same commit (0..1). */
function flakiness(sig, now = Date.now()) {
  const from = new Date(now - FLAKY_DAYS * 86400000).toISOString();
  const ev = (sig.events || []).filter(([at]) => at >= from);
  const bad = ev.filter(([, k]) => k === 'f' || k === 't').length;
  const rec = ev.filter(([, k]) => k === 'r').length;
  return bad ? Math.min(1, rec / bad) : 0;
}

const ADVICE = {
  'timeout-flaky': 'raise that test or step timeout, or split it',
  'athom-api': 'Athom side: wait and retry later; no code change',
  network: 'already handled by the transient re-run; nothing to change',
  cancelled: 'superseded run; check concurrency only if frequent',
  size: 'look at manifest headroom before the next feature',
  'i18n-gap': 'add the missing translation keys',
  lint: 'fix the lint finding at its source',
  validate: 'reproduce with homey app validate --level publish',
  gate: 'run that gate locally; fix the cause, never the baseline',
  test: 'reproduce the failing test locally',
  other: 'read the log once and add a category if it repeats',
};

/** Proposals only: top signatures by weight, each with a plain hint. */
function proposals(ledger, { now = Date.now(), limit = 12 } = {}) {
  return Object.entries(ledger.signatures)
    .map(([sig, s]) => ({ sig, s, n: s.fails + s.transient, flaky: flakiness(s, now) }))
    .filter((x) => x.n >= 2)
    .sort((a, b) => b.n - a.n || String(b.s.lastSeen).localeCompare(String(a.s.lastSeen)))
    .slice(0, limit)
    .map(({ sig, s, n, flaky }) => ({ sig, category: s.category, workflow: s.workflow, unit: s.test || s.unit, seen: n, recovered: s.recovered,
      flaky: Math.round(flaky * 100), hint: flaky >= 0.5 ? `flaky (${Math.round(flaky * 100)} % recover): ${ADVICE[s.category] || ADVICE.other}` : ADVICE[s.category] || ADVICE.other }));
}

function saveLedger(ledger, file = LEDGER) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  ledger.updatedAt = new Date().toISOString();
  fs.writeFileSync(file, JSON.stringify(ledger, null, 1) + '\n');
}

module.exports = { category, testTitle, readJournal, loadLedger, emptyLedger, ingest, flakiness, proposals, saveLedger, MAX_SIGS, MAX_SEEN_KEYS };

if (require.main === module) {
  const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
  try {
    const ledgerFile = arg('ledger', LEDGER);
    const { ledger, added } = ingest(loadLedger(ledgerFile), readJournal(arg('journal', JOURNAL)));
    if (!process.argv.includes('--dry')) saveLedger(ledger, ledgerFile);
    const props = proposals(ledger);
    console.log(`[ci-signatures] ${added} new event(s), ${Object.keys(ledger.signatures).length} signature(s), ${props.length} proposal(s)`);
    if (process.argv.includes('--report')) {
      const { createReport } = require('../lib/report-writer.js');
      const r = createReport({ title: 'CI signatures (P3073)', summary: `${Object.keys(ledger.signatures).length} known failure signatures, ${props.length} worth a look. Proposals only, nothing is changed automatically.` });
      if (props.length) r.table(['category', 'workflow', 'unit', 'seen', 'recovered', 'hint'], props.map((p) => [p.category, p.workflow, p.unit, p.seen, p.recovered, p.hint]));
      r.thanks('the ci-failure journal (P3048)').write();
    }
  } catch (e) { console.log(`::warning::ci-signatures: ${e.message}`); }
}
