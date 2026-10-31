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
// P3036 (25/10/2026 Paris): run 40194918949 (automatic hang-up retry) was skipped by this breaker. Now the single
// automatic retry (transient_retry=1) of a TRANSIENT latest failure is never blocked, and the breaker also trips
// as soon as the latest build failed for a REAL reason (AggregateError, processing_failed, validation).
const P3036 = require('./athom-publish-policy');
// P3087 (27/10/2026 Paris): manual relaunch run 40486153255 (after the P3085 content fix) passed the breaker but
// the P3036 gate held it (spacing + superseded CI); its next-slot retry is a deferred_retry dispatch = automatic,
// so the open breaker would kill it, and a newer push run made the marker look "re-checked". Same loss as the
// 26/10 15:04 staged-send run 40336425074. Now a MANUAL run held by the gate carries its intent in the marker
// (deferred_manual=b<latest build id>.c<n>): the carried retry passes the open breaker only while Athom has no
// build newer than b<id> (= at most one upload per manual intent) and for at most MAX_CARRY slots.
const MAX_CARRY = 6;
function parseCarry(v) {
  const m = /^b(\d+)\.c(\d+)$/.exec(String(v || '').trim());
  return m ? { build: Number(m[1]), count: Number(m[2]) } : null;
}
function maxBuildId(builds) { return (builds || []).reduce((a, b) => (b && Number.isFinite(Number(b.id)) ? Math.max(a, Number(b.id)) : a), 0); }
// Value the gate marker carries forward: a manual run starts c1, a carried run increments; else ''.
function nextCarry({ builds, event, transientRetry, deferredRetry, deferredManual }) {
  const isRetry = transientRetry && transientRetry !== 'false' && transientRetry !== '0';
  if (event === 'workflow_dispatch' && !isRetry && deferredRetry !== 'true') return `b${maxBuildId(builds)}.c1`;
  const c = parseCarry(deferredManual);
  if (deferredRetry === 'true' && c && c.count < MAX_CARRY && maxBuildId(builds) <= c.build) return `b${c.build}.c${c.count + 1}`;
  return '';
}
function decide({ builds, n = DEFAULT_N, event, transientRetry, snapshotOk, deferredManual }) {
  const manual = event === 'workflow_dispatch' && !(transientRetry && transientRetry !== 'false' && transientRetry !== '0');
  const known = (builds || []).filter((b) => b && b.id != null);
  if (snapshotOk === false && known.length === 0) {
    if (manual) return { skip: false, tripped: false, unknown: true, reason: 'Athom build state unreadable but manual dispatch -> one try allowed' };
    return { skip: true, tripped: false, unknown: true, reason: 'Athom build state unreadable (0 builds): fail-closed on automatic event; manual workflow_dispatch required' };
  }
  const exempt = P3036.singleRetryExempt({ builds: known, transientRetry });
  if (exempt.exempt) return { skip: false, tripped: false, exempt: true, reason: `P3036 ${exempt.reason}: breaker does not block the single retry` };
  const last = known.slice().sort((a, b) => b.id - a.id).slice(0, n);
  const allFailed = last.length >= n && last.every((b) => String(b.state) === 'processing_failed');
  const real = P3036.breakerAssess({ builds: known, n });
  const tripped = allFailed || real.tripped;
  const why = allFailed ? `last ${n} master builds processing_failed (#${last.map((b) => b.id).join(',#')})` : real.reason;
  if (!tripped) return { skip: false, tripped: false, reason: `last ${last.length} builds not all processing_failed, latest not a real failure` };
  if (manual) return { skip: false, tripped: true, reason: `breaker open (${why}) but manual dispatch -> one try allowed` };
  const carry = parseCarry(deferredManual);
  if (carry && carry.count <= MAX_CARRY && maxBuildId(known) <= carry.build) {
    return { skip: false, tripped: true, carried: true, reason: `breaker open (${why}) but next-slot retry of a held MANUAL run (no Athom build after #${carry.build}, slot ${carry.count}/${MAX_CARRY}) -> that one try continues` };
  }
  return { skip: true, tripped: true, reason: `breaker open: ${why}; manual workflow_dispatch required` };
}
module.exports = { decide, DEFAULT_N, MAX_CARRY, parseCarry, nextCarry, maxBuildId };
function readSnapshot(appId) {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'status', `homey-build-status-${appId}.json`), 'utf8'));
    return { builds: Array.isArray(j.builds) ? j.builds : [], pat: j.pat, error: j.error };
  } catch { return { builds: [], pat: 'missing-snapshot' }; }
}
module.exports.readSnapshot = readSnapshot;
// P3068: re-read schedule, exponential backoff; total worst case ~5 min (breaker job has 55 min, the P3036 gate up to 40).
function rereadPlan(tries, base = { sleepS: 10, timeoutMs: 30000 }, capMs = 120000) {
  return Array.from({ length: Math.max(0, Math.min(5, tries | 0)) }, (_, i) => ({ sleepS: base.sleepS * 2 ** i, timeoutMs: Math.min(capMs, base.timeoutMs * 2 ** i) }));
}
module.exports.rereadPlan = rereadPlan;
if (require.main === module) {
  const appId = process.argv[2] || 'com.dlnraja.tuya.zigbee';
  let snap = readSnapshot(appId);
  // P2966: re-read Athom (read-only) up to 2 more times before concluding the state is unknown.
  // P3068: master's build list (3 680 builds) answers in >10 s, so every re-read at the SDK default 10 s timed out
  // (runs 40359765122 / 40362675998: "Timeout after 10000ms" x3). Re-reads now back off (sleep 10/20/40 s) and widen
  // HOMEY_API_TIMEOUT_MS (30/60/120 s). Still fail-closed: an empty snapshot after the last try = skip (decide()).
  const tries = Math.max(0, parseInt(process.env.BREAKER_READ_RETRIES || '3', 10) || 0);
  for (const [i, step] of rereadPlan(tries).entries()) {
    if (snap.builds.length > 0) break;
    console.log(`[breaker] snapshot empty (pat=${snap.pat || '?'}${snap.error ? `, ${String(snap.error).slice(0, 120)}` : ''}) -> re-read ${i + 1}/${tries} after ${step.sleepS}s, timeout ${step.timeoutMs}ms`);
    if (snap.pat === 'invalid' || snap.pat === 'missing') break; // P3068: a rejected/missing PAT will not heal by retrying
    require('child_process').spawnSync('sleep', [String(step.sleepS)]);
    require('child_process').spawnSync(process.execPath, [path.join(process.cwd(), 'scripts', 'ci', 'homey-build-status.js'), appId], { stdio: ['ignore', 'ignore', 'inherit'], env: { ...process.env, HOMEY_API_TIMEOUT_MS: String(step.timeoutMs) }, timeout: step.timeoutMs * 2 + 60000 });
    snap = readSnapshot(appId);
  }
  const d = decide({ builds: snap.builds, n: parseInt(process.env.BREAKER_N || '', 10) || DEFAULT_N, event: (process.env.DEFERRED_RETRY === 'true' ? 'schedule' : process.env.GITHUB_EVENT_NAME), /* P3036: a deferred next-slot dispatch is automatic */ transientRetry: process.env.TRANSIENT_RETRY, snapshotOk: snap.builds.length > 0, deferredManual: process.env.DEFERRED_MANUAL });
  // P3087: only a breaker that lets this run through hands a carry to the gate marker.
  const carry = d.skip || snap.builds.length === 0 ? '' : nextCarry({ builds: snap.builds, event: process.env.GITHUB_EVENT_NAME, transientRetry: process.env.TRANSIENT_RETRY, deferredRetry: process.env.DEFERRED_RETRY, deferredManual: process.env.DEFERRED_MANUAL });
  console.log(`[breaker] ${d.skip ? 'SKIP' : 'go'}: ${d.reason}`);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `skip=${d.skip}\ncarry=${carry}\n`);
  if (d.skip && process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Master publish breaker open\n${d.reason}\n`);
}
