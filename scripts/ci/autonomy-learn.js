#!/usr/bin/env node
'use strict';
// P3097 (t643u): bounded learning ledger for self-repair workflows.
// - data only (config/autonomy-learned.json), capped, oldest rotated out; never touches workflows/gates/secrets
// - a signature becomes "auto" only after PROMOTE_AFTER successes and 0 failures in the recent window;
//   any failure demotes it at once
// - budgets: max attempts per signature / 24 h, max self-commits / day, global breaker, kill switch file
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const LEDGER = path.join(ROOT, 'config', 'autonomy-learned.json');
const KILL = path.join(ROOT, 'config', 'autonomy-paused');
const LIMITS = { maxEntries: 200, promoteAfter: 3, maxAttemptsPerSig24h: 3, maxCommitsPerDay: 6, breakerFailures24h: 5 };
const DAY = 24 * 3600 * 1000;

const FEATURES = ['enrich', 'autofix', 'publish', 'learn', 'watch', 'crash-triage'];
// global switch config/autonomy-paused, or per feature config/autonomy-paused.<feature>
function paused(root = ROOT, feature) {
  if (fs.existsSync(path.join(root, 'config', 'autonomy-paused'))) return true;
  return !!feature && FEATURES.includes(feature) && fs.existsSync(path.join(root, 'config', `autonomy-paused.${feature}`));
}
function load(file = LEDGER) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return { entries: {}, events: [] }; } }
function save(l, file = LEDGER) { fs.writeFileSync(file, JSON.stringify(l, null, 2) + '\n'); }

function record(l, sig, fix, ok, now = Date.now()) {
  const e = l.entries[sig] || { fix, successes: 0, failures: 0, auto: false, last: 0 };
  e.fix = fix; e.last = now;
  if (ok) { e.successes++; } else { e.failures++; e.auto = false; e.lastFailure = now; }
  const recentFail = e.lastFailure && now - e.lastFailure < 7 * DAY;
  if (ok && e.successes >= LIMITS.promoteAfter && !recentFail) e.auto = true;
  l.entries[sig] = e;
  l.events.push({ t: now, sig, ok });
  l.events = l.events.filter((x) => now - x.t < 7 * DAY).slice(-500);
  const keys = Object.keys(l.entries);
  if (keys.length > LIMITS.maxEntries) {
    keys.sort((a, b) => l.entries[a].last - l.entries[b].last).slice(0, keys.length - LIMITS.maxEntries).forEach((k) => delete l.entries[k]);
  }
  return e;
}

function mayAct(l, sig, { commits24h = 0, now = Date.now(), root = ROOT, feature = 'autofix' } = {}) {
  if (paused(root, feature)) return { ok: false, why: 'kill-switch config/autonomy-paused' };
  const recent = l.events.filter((x) => now - x.t < DAY);
  if (recent.filter((x) => !x.ok).length >= LIMITS.breakerFailures24h) return { ok: false, why: 'global breaker' };
  if (recent.filter((x) => x.sig === sig).length >= LIMITS.maxAttemptsPerSig24h) return { ok: false, why: 'max attempts per signature' };
  if (commits24h >= LIMITS.maxCommitsPerDay) return { ok: false, why: 'daily commit budget' };
  const e = l.entries[sig];
  return { ok: true, auto: !!(e && e.auto) };
}

if (require.main === module) {
  const [cmd, sig, fix, res] = process.argv.slice(2);
  const l = load();
  if (cmd === 'may') { const r = mayAct(l, sig, { commits24h: Number(process.env.COMMITS_24H || 0), feature: process.env.AUTONOMY_FEATURE || 'autofix' }); console.log(JSON.stringify(r)); process.exit(r.ok ? 0 : 3); }
  if (cmd === 'record') { console.log(JSON.stringify(record(l, sig, fix, res === 'ok'))); save(l); }
  if (cmd === 'paused') { const p = paused(ROOT, sig); console.log(p); process.exit(p ? 3 : 0); }
}
module.exports = { record, mayAct, paused, LIMITS, FEATURES };
