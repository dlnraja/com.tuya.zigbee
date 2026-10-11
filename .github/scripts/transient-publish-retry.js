#!/usr/bin/env node
'use strict';
// WHY(2026-10-10 Paris): #3490/#3492/#3494 (socket hang up) and #3496 ("The specified key does not exist",
// S3 upload side) were Athom transport failures, not content failures. Decide ONE bumped retry for the
// version this run just published. AggregateError is never retried (real content failure -> bisect).
// Contre quoi: republish loops (P139) — callers pass TRANSIENT_RETRY=true on the retry run, which disables this.
const fs = require('fs');
const path = require('path');
const { TRANSIENT_RE } = require('./processing-failure-republish-check');

// WHY(2026-10-11 user): AggregateError flakes (1424 F / 1425 T and 1426 F / 1427 T on identical content), so it
// gets up to 2 bumped retries; transport failures keep 1. retryCount = retries already done in this chain.
const MAX_AGG_RETRIES = 2;
const MAX_TRANSIENT_RETRIES = 1;

function parseRetryCount(v) {
  const s = String(v == null ? '' : v).trim().toLowerCase();
  if (s === 'true') return 1;
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function decide({ version, builds, alreadyRetried, retryCount, idleWaited = false }) {
  const done = retryCount != null ? Number(retryCount) || 0 : (alreadyRetried ? 1 : 0);
  if (done >= MAX_AGG_RETRIES) return { retry: false, reason: `retry budget exhausted (${done})` };
  const b = (builds || []).find((x) => String(x && x.version) === String(version));
  if (!b) return { retry: false, reason: `no Athom build for v${version}` };
  const state = String(b.state || '');
  // homey-build-status.js rows carry Athom error fields under err/reason/message/log/fail keys.
  const extra = Object.entries(b).filter(([k, v]) => v && /err|reason|message|log|fail|meta/i.test(k)).map(([, v]) => (typeof v === 'string' ? v : JSON.stringify(v))).join(' ');
  const meta = typeof b.stateMeta === 'string' ? b.stateMeta : JSON.stringify(b.stateMeta || b.failureDetail || '') + ' ' + extra;
  if (state !== 'processing_failed') return { retry: false, reason: `v${version} state ${state}` };
  // WHY(2026-10-11 user): AggregateError alternates on near-identical content (1381F 1382F 1383T 1384F 1385T 1386F),
  // so it gets ONE retry with a strictly-higher version too; the retry run never retries again (alreadyRetried).
  // WHY(2026-10-11): invalid_state = another build of this app was still processing at upload time.
  // Retry once, but only when this run's pre-upload Athom idle wait actually completed (else it would repeat).
  if (/invalid_state/i.test(meta)) {
    return idleWaited
      ? (done >= MAX_TRANSIENT_RETRIES ? { retry: false, kind: 'invalid_state', reason: 'already a retry run' } : { retry: true, kind: 'invalid_state', reason: `invalid_state after idle wait on v${version}` })
      : { retry: false, kind: 'invalid_state', reason: 'invalid_state without completed idle wait, no retry' };
  }
  if (/AggregateError/i.test(meta)) return { retry: true, kind: 'AggregateError', next: done + 1, reason: `AggregateError (flake check, retry ${done + 1}/${MAX_AGG_RETRIES}) on v${version}` };
  if (!TRANSIENT_RE.test(meta)) return { retry: false, kind: 'unknown', reason: `unknown failure: ${meta.slice(0, 120)}` };
  if (done >= MAX_TRANSIENT_RETRIES) return { retry: false, reason: 'already a retry run' };
  const kind = /socket hang up/i.test(meta) ? 'socket hang up' : /specified key|nosuchkey/i.test(meta) ? 'specified key' : /enospc|no space/i.test(meta) ? 'ENOSPC' : 'transient';
  return { retry: true, kind, next: done + 1, reason: `transient (${meta.slice(0, 80)}) on v${version}` };
}

if (require.main === module) {
  const root = process.cwd();
  const version = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).version;
  let builds = [];
  // Prefer the fresh read-only Athom snapshot written by scripts/ci/homey-build-status.js in this run.
  try {
    const appId = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).id;
    const fresh = JSON.parse(fs.readFileSync(path.join(root, 'data', 'status', `homey-build-status-${appId}.json`), 'utf8'));
    if (Array.isArray(fresh.builds) && fresh.builds.length) builds = fresh.builds;
  } catch (_e) { /* fall back to dashboard report */ }
  // WHY(#3530): the fresh snapshot rows carry no stateMeta ("unknown failure") — merge the error
  // text from the dashboard report (same build id) so socket hang up etc. are still recognised.
  try {
    const r = JSON.parse(fs.readFileSync(path.join(root, '.github/state/dashboard-monitor-report.json'), 'utf8'));
    const dash = [...(r.latestBuilds || []), r.latestBuild, r.latestFailedBuild].filter(Boolean);
    if (!builds.length) builds = dash;
    else {
      const byId = new Map(dash.filter((x) => x && x.id != null).map((x) => [String(x.id), x]));
      builds = builds.map((b) => {
        const d2 = b && byId.get(String(b.id));
        return d2 && !b.stateMeta ? { ...d2, ...b, stateMeta: d2.stateMeta || d2.failureDetail || null } : b;
      });
    }
  } catch (_e) { /* no report */ }
  const d = decide({ version, builds, retryCount: parseRetryCount(process.env.TRANSIENT_RETRY), idleWaited: process.env.ATHOM_IDLE_WAITED === 'true' });
  console.log(`[transient-retry] ${d.retry ? 'RETRY' : 'skip'}: ${d.reason}`);
  if (d.retry) console.log(`[transient-retry] NEXT=${d.next || 1}`);
  // Flake-rate log: one JSON line per published version outcome (committed by the bot commit step).
  try {
    const b = builds.find((x) => String(x && x.version) === String(version)) || {};
    const line = { at: new Date().toISOString(), version, buildId: b.id || null, state: b.state || null, kind: d.kind || null, retryRun: process.env.TRANSIENT_RETRY === 'true', retry: d.retry, run: process.env.GITHUB_RUN_ID || null };
    const logf = path.join(root, 'docs', 'status', 'athom-publish-outcomes.jsonl');
    fs.mkdirSync(path.dirname(logf), { recursive: true });
    fs.appendFileSync(logf, JSON.stringify(line) + '\n');
  } catch (_e) { /* logging never blocks */ }
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `retry=${d.retry}\n`);
}

module.exports = { decide, parseRetryCount, MAX_AGG_RETRIES };
