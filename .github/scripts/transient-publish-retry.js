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
  const meta = typeof b.stateMeta === 'string' ? b.stateMeta : JSON.stringify(b.stateMeta || b.failureDetail || '');
  if (state !== 'processing_failed') return { retry: false, reason: `v${version} state ${state}` };
  if (/AggregateError/i.test(meta)) return { retry: false, reason: 'AggregateError = content failure, no retry' };
  if (!TRANSIENT_RE.test(meta)) return { retry: false, reason: `unknown failure: ${meta.slice(0, 120)}` };
  return { retry: true, reason: `transient (${meta.slice(0, 80)}) on v${version}` };
}

if (require.main === module) {
  const root = process.cwd();
  const version = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).version;
  let builds = [];
  try {
    const r = JSON.parse(fs.readFileSync(path.join(root, '.github/state/dashboard-monitor-report.json'), 'utf8'));
    builds = r.latestBuilds || (r.latestBuild ? [r.latestBuild] : []);
  } catch (_e) { /* no report */ }
  const d = decide({ version, builds, alreadyRetried: process.env.TRANSIENT_RETRY === 'true' });
  console.log(`[transient-retry] ${d.retry ? 'RETRY' : 'skip'}: ${d.reason}`);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `retry=${d.retry}\n`);
}

module.exports = { decide };
