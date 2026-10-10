#!/usr/bin/env node
'use strict';
// WHY(2026-10-10 Paris): #3490/#3492/#3494 (socket hang up) and #3496 ("The specified key does not exist",
// S3 upload side) were Athom transport failures, not content failures. Decide ONE bumped retry for the
// version this run just published. AggregateError is never retried (real content failure -> bisect).
// Contre quoi: republish loops (P139) — callers pass TRANSIENT_RETRY=true on the retry run, which disables this.
const fs = require('fs');
const path = require('path');
const { TRANSIENT_RE } = require('./processing-failure-republish-check');

function decide({ version, builds, alreadyRetried }) {
  if (alreadyRetried) return { retry: false, reason: 'already a retry run' };
  const b = (builds || []).find((x) => String(x && x.version) === String(version));
  if (!b) return { retry: false, reason: `no Athom build for v${version}` };
  const state = String(b.state || '');
  // homey-build-status.js rows carry Athom error fields under err/reason/message/log/fail keys.
  const extra = Object.entries(b).filter(([k, v]) => v && /err|reason|message|log|fail|meta/i.test(k)).map(([, v]) => (typeof v === 'string' ? v : JSON.stringify(v))).join(' ');
  const meta = typeof b.stateMeta === 'string' ? b.stateMeta : JSON.stringify(b.stateMeta || b.failureDetail || '') + ' ' + extra;
  if (state !== 'processing_failed') return { retry: false, reason: `v${version} state ${state}` };
  if (/AggregateError/i.test(meta)) return { retry: false, reason: 'AggregateError = content failure, no retry' };
  if (!TRANSIENT_RE.test(meta)) return { retry: false, reason: `unknown failure: ${meta.slice(0, 120)}` };
  return { retry: true, reason: `transient (${meta.slice(0, 80)}) on v${version}` };
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
  if (!builds.length) try {
    const r = JSON.parse(fs.readFileSync(path.join(root, '.github/state/dashboard-monitor-report.json'), 'utf8'));
    builds = r.latestBuilds || (r.latestBuild ? [r.latestBuild] : []);
  } catch (_e) { /* no report */ }
  const d = decide({ version, builds, alreadyRetried: process.env.TRANSIENT_RETRY === 'true' });
  console.log(`[transient-retry] ${d.retry ? 'RETRY' : 'skip'}: ${d.reason}`);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `retry=${d.retry}\n`);
}

module.exports = { decide };
