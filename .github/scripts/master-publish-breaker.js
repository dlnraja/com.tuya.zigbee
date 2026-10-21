#!/usr/bin/env node
'use strict';
// WHY(P-KB4, 21/10/2026): master burned #3656..#3676 (9.0.1575..9.0.1593) on Athom processing_failed /
// AggregateError, including the byte-identical 1574 archive. Breaker: when the last N master builds are all
// processing_failed, a push (or an automatic retry dispatch) does NOT publish; only a MANUAL workflow_dispatch
// (no transient_retry input) may try. Master only: stable/bastien workflows never call this.
const fs = require('fs'); const path = require('path');
const DEFAULT_N = 3;
function decide({ builds, n = DEFAULT_N, event, transientRetry }) {
  const manual = event === 'workflow_dispatch' && !(transientRetry && transientRetry !== 'false' && transientRetry !== '0');
  const last = (builds || []).filter((b) => b && b.id != null).sort((a, b) => b.id - a.id).slice(0, n);
  const tripped = last.length >= n && last.every((b) => String(b.state) === 'processing_failed');
  if (!tripped) return { skip: false, tripped: false, reason: `last ${last.length} builds not all processing_failed` };
  if (manual) return { skip: false, tripped: true, reason: `breaker open (last ${n} failed) but manual dispatch -> one try allowed` };
  return { skip: true, tripped: true, reason: `breaker open: last ${n} master builds processing_failed (#${last.map((b) => b.id).join(',#')}); manual workflow_dispatch required` };
}
module.exports = { decide, DEFAULT_N };
if (require.main === module) {
  let builds = [];
  try { const appId = process.argv[2] || 'com.dlnraja.tuya.zigbee';
    builds = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'status', `homey-build-status-${appId}.json`), 'utf8')).builds || []; } catch { /* no snapshot -> breaker closed */ }
  const d = decide({ builds, n: parseInt(process.env.BREAKER_N || '', 10) || DEFAULT_N, event: process.env.GITHUB_EVENT_NAME, transientRetry: process.env.TRANSIENT_RETRY });
  console.log(`[breaker] ${d.skip ? 'SKIP' : 'go'}: ${d.reason}`);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `skip=${d.skip}\n`);
  if (d.skip && process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Master publish breaker open\n${d.reason}\n`);
}
