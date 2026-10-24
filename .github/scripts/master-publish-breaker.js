#!/usr/bin/env node
'use strict';
// WHY(P-KB4, 21/10/2026): master burned #3656..#3676 (9.0.1575..9.0.1593) on Athom processing_failed /
// AggregateError, including the byte-identical 1574 archive. Breaker: when the last N master builds are all
// processing_failed, a push (or an automatic retry dispatch) does NOT publish; only a MANUAL workflow_dispatch
// (no transient_retry input) may try. Master only: stable/bastien workflows never call this.
const fs = require('fs'); const path = require('path');
const DEFAULT_N = 3;
// WHY(P2966, 24/10/2026): run 40064359243 read 0 builds (Athom read failed silently) and the breaker went
// fail-open -> 9.0.1594 (#3677) burned on processing_failed while the parallel auto-fix run read #3674..#3676
// and skipped. Now: when the snapshot is unreadable/empty (snapshotOk === false) an AUTOMATIC event skips
// (fail-closed); a manual dispatch may still try once. Callers that pass no snapshotOk keep the old behaviour.
function decide({ builds, n = DEFAULT_N, event, transientRetry, snapshotOk }) {
  const manual = event === 'workflow_dispatch' && !(transientRetry && transientRetry !== 'false' && transientRetry !== '0');
  const known = (builds || []).filter((b) => b && b.id != null);
  if (snapshotOk === false && known.length === 0) {
    if (manual) return { skip: false, tripped: false, unknown: true, reason: 'Athom build state unreadable but manual dispatch -> one try allowed' };
    return { skip: true, tripped: false, unknown: true, reason: 'Athom build state unreadable (0 builds): fail-closed on automatic event; manual workflow_dispatch required' };
  }
  const last = (builds || []).filter((b) => b && b.id != null).sort((a, b) => b.id - a.id).slice(0, n);
  const tripped = last.length >= n && last.every((b) => String(b.state) === 'processing_failed');
  if (!tripped) return { skip: false, tripped: false, reason: `last ${last.length} builds not all processing_failed` };
  if (manual) return { skip: false, tripped: true, reason: `breaker open (last ${n} failed) but manual dispatch -> one try allowed` };
  return { skip: true, tripped: true, reason: `breaker open: last ${n} master builds processing_failed (#${last.map((b) => b.id).join(',#')}); manual workflow_dispatch required` };
}
module.exports = { decide, DEFAULT_N };
function readSnapshot(appId) {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'status', `homey-build-status-${appId}.json`), 'utf8'));
    return { builds: Array.isArray(j.builds) ? j.builds : [], pat: j.pat, error: j.error };
  } catch { return { builds: [], pat: 'missing-snapshot' }; }
}
module.exports.readSnapshot = readSnapshot;
if (require.main === module) {
  const appId = process.argv[2] || 'com.dlnraja.tuya.zigbee';
  let snap = readSnapshot(appId);
  // P2966: re-read Athom (read-only) up to 2 more times before concluding the state is unknown.
  const tries = parseInt(process.env.BREAKER_READ_RETRIES || '2', 10) || 0;
  for (let i = 0; i < tries && snap.builds.length === 0; i++) {
    console.log(`[breaker] snapshot empty (pat=${snap.pat || '?'}${snap.error ? `, ${String(snap.error).slice(0, 120)}` : ''}) -> re-read ${i + 1}/${tries}`);
    require('child_process').spawnSync('sleep', ['10']);
    require('child_process').spawnSync(process.execPath, [path.join(process.cwd(), 'scripts', 'ci', 'homey-build-status.js'), appId], { stdio: ['ignore', 'ignore', 'inherit'], env: process.env, timeout: 120000 });
    snap = readSnapshot(appId);
  }
  const d = decide({ builds: snap.builds, n: parseInt(process.env.BREAKER_N || '', 10) || DEFAULT_N, event: process.env.GITHUB_EVENT_NAME, transientRetry: process.env.TRANSIENT_RETRY, snapshotOk: snap.builds.length > 0 });
  console.log(`[breaker] ${d.skip ? 'SKIP' : 'go'}: ${d.reason}`);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `skip=${d.skip}\n`);
  if (d.skip && process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Master publish breaker open\n${d.reason}\n`);
}
