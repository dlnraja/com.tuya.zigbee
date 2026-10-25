#!/usr/bin/env node
'use strict';
// WHY(2026-10-10 Paris): #3490/#3492/#3494 (socket hang up) and #3496 ("The specified key does not exist",
// S3 upload side) were Athom transport failures, not content failures. Decide ONE bumped retry for the
// version this run just published. AggregateError is never retried (real content failure -> bisect).
// Contre quoi: republish loops (P139) — callers pass TRANSIENT_RETRY=true on the retry run, which disables this.
const fs = require('fs');
const path = require('path');

// WHY(2026-10-11 user): AggregateError flakes (1424 F / 1425 T and 1426 F / 1427 T on identical content), so it
// gets up to 2 bumped retries; transport failures keep 1. retryCount = retries already done in this chain.
const POLICY = require('./athom-retry-policy');
const MAX_AGG_RETRIES = POLICY.POLICY.maxAggregateRetries; // P2900: shared 3-app policy
// P2830e (user 2026-10-19: Test must be reached reliably): transport failures now get 2 bumped retries per chain
// (observed: identical archives flip between socket-hang-up and Test, ~45% failure rate on 35 MB payloads).
const MAX_TRANSIENT_RETRIES = POLICY.POLICY.maxTransientRetries;
// P2924: Athom-side hang-ups after a good upload get their own budget (see athom-retry-policy.js).
const MAX_HANGUP_RETRIES = POLICY.POLICY.maxHangupRetries || MAX_TRANSIENT_RETRIES;

// Exponential backoff with jitter before a retry dispatch (60s, 120s, 240s... capped at 240s, +0..30s).
const backoffSeconds = POLICY.backoffSeconds;

function parseRetryCount(v) {
  const s = String(v == null ? '' : v).trim().toLowerCase();
  if (s === 'true') return 1;
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

// P3036 (25/10/2026 Paris): one rule for every path, from athom-publish-policy.js. Transient (socket hang up,
// ECONNRESET, ETIMEDOUT, 5xx, timeouts, invalid_state after a completed idle wait) -> exactly ONE bumped retry,
// backoff >= 5 min, breaker untouched. Real (AggregateError, processing_failed without a transient cause,
// validation) -> no retry, breaker trips, diagnostic. ATHOM_RETRY_USED=1 (in-run fallback already re-uploaded)
// counts as the single retry. hangupOnly is accepted for old callers and no longer changes the rule (it is the rule now).
const P3036 = require('./athom-publish-policy');
function decide({ version, builds, alreadyRetried, retryCount, idleWaited = false, reachTest = process.env.ATHOM_REACH_TEST !== '0', retryUsed = process.env.ATHOM_RETRY_USED === '1' }) {
  const b = (builds || []).find((x) => String(x && x.version) === String(version));
  if (!b) return { retry: false, reason: `no Athom build for v${version}` };
  if (String(b.state || '') !== 'processing_failed') return { retry: false, reason: `v${version} state ${b.state}` };
  const c = P3036.classify(b);
  const done = Math.max(retryCount != null ? Number(retryCount) || 0 : (alreadyRetried ? 1 : 0), retryUsed ? 1 : 0);
  // WHY(P2831, legacy ATHOM_REACH_TEST=0): tip #3581-#3584 - never bump-republish a hang while a healthy Test exists.
  const healthyTest = (builds || []).find((x) => String(x && x.state) === 'test');
  if (!reachTest && healthyTest && c.cls === 'transient') {
    return { retry: false, kind: c.kind, cls: c.cls, reason: `P2831 healthy Test #${healthyTest.id} v${healthyTest.version} - refuse hang republish (tip mail)` };
  }
  const d = P3036.retryDecision({ kind: c.kind, cls: c.cls, retriesDone: done, idleWaited });
  const out = { retry: d.retry, kind: c.kind, cls: c.cls, tripBreaker: d.tripBreaker, diagnose: d.diagnose, reason: `${d.reason} (v${version})` };
  if (d.retry) out.next = done + 1;
  // AggregateError keeps the BISECT hint: it is the signal a content bisect may be needed (P3034 mechanism).
  if (c.kind === 'AggregateError') out.bisect = true;
  return out;
}

if (require.main === module) {
  const root = process.cwd();
  // P2830g: the uploaded version (bump step output) wins over app.json, which the metadata step may reset.
  const version = process.env.HOMEY_EXPECTED_VERSION || JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).version;
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
  if (d.retry) {
    console.log(`[transient-retry] NEXT=${d.next || 1}`);
    console.log(`[transient-retry] BACKOFF_S=${backoffSeconds(d.next || 1)}`); // P3036: >= 300 s
  }
  if (d.bisect) console.log('[transient-retry] BISECT: AggregateError is a real failure (P3036, no auto retry) - if rejections repeat, rerun the P3034 bisect; do not auto-retry');
  if (d.diagnose) console.log(`[transient-retry] DIAGNOSE: ${d.kind || 'unknown'} - see docs/knowledge/P3036_ATHOM_PUBLISH_POLICY.md`);
  // Flake-rate log: one JSON line per published version outcome (committed by the bot commit step).
  try {
    const b = builds.find((x) => String(x && x.version) === String(version)) || {};
    let appIdL = null; try { appIdL = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).id; } catch (_e) { /* none */ }
    // P3036: app + created let the spacing gate (slotDecision) use this ledger as a fallback.
    const line = { at: new Date().toISOString(), app_id: appIdL, created: b.created || null, version, buildId: b.id || null, state: b.state || null, kind: d.kind || null, retryRun: process.env.TRANSIENT_RETRY === 'true', retry: d.retry, bisect: d.bisect || false, run: process.env.GITHUB_RUN_ID || null };
    try { const fp = JSON.parse(fs.readFileSync(path.join(root, 'reports', 'footprint', 'latest.json'), 'utf8')).measured; line.payloadMB = Number(fp.payloadMB.toFixed(2)); line.payloadFiles = fp.payloadFiles; line.appJsonMB = Number(fp.appJsonMB.toFixed(2)); } catch (_e) { /* no footprint */ }
    const logf = path.join(root, 'docs', 'knowledge', 'athom-publish-outcomes.jsonl');
    fs.mkdirSync(path.dirname(logf), { recursive: true });
    fs.appendFileSync(logf, JSON.stringify(line) + '\n');
  } catch (_e) { /* logging never blocks */ }
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `retry=${d.retry}\n`);
}

module.exports = { decide, parseRetryCount, backoffSeconds, MAX_AGG_RETRIES, MAX_TRANSIENT_RETRIES, MAX_HANGUP_RETRIES };
