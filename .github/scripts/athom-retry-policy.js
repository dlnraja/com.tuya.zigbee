#!/usr/bin/env node
'use strict';
// WHY(P2900, 20/10/2026 Paris): one Athom upload retry policy for the three apps (master, stable-v5,
// bastien-home). Before this, master retried in a new run (60s*2^n, cap 240s), stable re-uploaded in-run
// (30s*2^n) and Bastien never retried. This file is byte-identical on the three branches (test p2900).
// Rules kept: every retry uses a strictly higher version; AggregateError gets the flake budget then a bisect;
// invalid_state is retried only after a completed idle wait; unknown failures never retry.
// P3036 (25/10/2026 Paris): the P3034 bisect (9.0.1599 #3682 -> Test) pointed at red CI, uploads too close
// together and Athom-side hang-ups, not at the content. Budgets are now the shared P3036 rule
// (athom-publish-policy.js): a transient failure gets exactly ONE retry after >= 5 min, a real failure
// (AggregateError, processing_failed, validation) gets none. Older budgets (hang-up 4, AggregateError 2,
// backoff 60-240 s) are kept in docs/knowledge/P3036_ATHOM_PUBLISH_POLICY.md for history.
const P3036 = require('./athom-publish-policy');
const POLICY = Object.freeze({
  version: 3,
  maxHangupRetries: P3036.RETRY.maxRetries,
  maxTransientRetries: P3036.RETRY.maxRetries, // socket hang up, ECONNRESET, timeouts, 5xx (P2911 + P3036)
  maxAggregateRetries: 0, // P3036: AggregateError is a real failure -> breaker + diagnostic, no retry
  maxInvalidStateRetries: P3036.RETRY.maxRetries,
  backoffBaseS: P3036.RETRY.backoffMinS,
  backoffCapS: P3036.RETRY.backoffMinS,
  jitterS: P3036.RETRY.jitterS,
  uploadTimeoutMs: 180000, // direct Apps API request timeout (keep-alive agent)
  buildPollTimeoutMs: 360000,
});

const TRANSIENT_RE = P3036.TRANSIENT_RE;

// Kinds: invalid_state | AggregateError | validation | socket hang up | transient | processing_failed | unknown
// A bare processing_failed (no stateMeta) stays 'unknown' here (budget 0, same no-retry outcome) so the
// P3025 per-version fallback (athom-classify-failure.js: wait log, then empty-error -> transient) still runs.
function classify(text) {
  const k = P3036.classify(String(text || '')).kind;
  return k === 'processing_failed' ? 'unknown' : k;
}

function budget(kind) {
  if (kind === 'AggregateError') return POLICY.maxAggregateRetries;
  if (kind === 'invalid_state') return POLICY.maxInvalidStateRetries;
  if (kind === 'socket hang up') return POLICY.maxHangupRetries;
  if (kind === 'transient') return POLICY.maxTransientRetries;
  return 0;
}

// P3036: always >= 300 s (+0..60 s jitter), whatever the attempt number.
function backoffSeconds(attempt, rnd = Math.random) {
  return P3036.backoffSeconds(typeof rnd === 'function' ? rnd() : rnd);
}

function shouldRetry(kind, retriesDone, { idleWaited = true } = {}) {
  if (kind === 'invalid_state' && !idleWaited) return false;
  return Number(retriesDone || 0) < budget(kind);
}

// Loop bound for in-run re-upload loops (stable, Bastien): the largest budget; each pass still asks retry-kind.
function maxBudget() {
  return Math.max(POLICY.maxHangupRetries, POLICY.maxTransientRetries, POLICY.maxAggregateRetries, POLICY.maxInvalidStateRetries);
}

module.exports = { POLICY, TRANSIENT_RE, classify, budget, backoffSeconds, shouldRetry, maxBudget };

if (require.main === module) {
  const [cmd, a, b] = process.argv.slice(2);
  if (cmd === 'backoff') console.log(backoffSeconds(a));
  else if (cmd === 'classify') console.log(classify(a || require('fs').readFileSync(0, 'utf8')));
  else if (cmd === 'should-retry') { const k = classify(a); console.log(shouldRetry(k, b) ? `RETRY ${k}` : `STOP ${k}`); }
  else if (cmd === 'retry-kind') console.log(shouldRetry(a, b) ? `RETRY ${a}` : `STOP ${a}`);
  else if (cmd === 'max') console.log(maxBudget());
  else if (cmd === 'get') console.log(POLICY[a]);
  else console.log(JSON.stringify(POLICY));
}
