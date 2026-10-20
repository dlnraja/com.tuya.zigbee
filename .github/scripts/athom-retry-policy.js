#!/usr/bin/env node
'use strict';
// WHY(P2900, 20/10/2026 Paris): one Athom upload retry policy for the three apps (master, stable-v5,
// bastien-home). Before this, master retried in a new run (60s*2^n, cap 240s), stable re-uploaded in-run
// (30s*2^n) and Bastien never retried. This file is byte-identical on the three branches (test p2900).
// Rules kept: every retry uses a strictly higher version; AggregateError gets the flake budget then a bisect;
// invalid_state is retried only after a completed idle wait; unknown failures never retry.
const POLICY = Object.freeze({
  version: 1,
  maxTransientRetries: 2, // socket hang up, ECONNRESET, S3 "specified key", timeouts, 502/503/504 by code or text (P2911)
  maxAggregateRetries: 2, // AggregateError flake check, then bisect
  maxInvalidStateRetries: 1,
  backoffBaseS: 60,
  backoffCapS: 240,
  jitterS: 30,
  uploadTimeoutMs: 180000, // direct Apps API request timeout (keep-alive agent)
  buildPollTimeoutMs: 360000,
});

const TRANSIENT_RE = /socket hang up|ECONNRESET|ECONNABORTED|ETIMEDOUT|EPIPE|EAI_AGAIN|fetch failed|Timeout after \d+ms|specified key|NoSuchKey|too many requests|\b429\b|\b50[234]\b|Bad Gateway|Service Unavailable|Gateway Time-?out|ENOSPC|no space/i;

function classify(text) {
  const s = String(text || '');
  if (/invalid_state/i.test(s)) return 'invalid_state';
  if (/AggregateError/i.test(s)) return 'AggregateError';
  if (/socket hang up/i.test(s)) return 'socket hang up';
  if (TRANSIENT_RE.test(s)) return 'transient';
  return 'unknown';
}

function budget(kind) {
  if (kind === 'AggregateError') return POLICY.maxAggregateRetries;
  if (kind === 'invalid_state') return POLICY.maxInvalidStateRetries;
  if (kind === 'socket hang up' || kind === 'transient') return POLICY.maxTransientRetries;
  return 0;
}

// attempt = 1 for the first retry. 60, 120, 240, 240... + 0..29s jitter.
function backoffSeconds(attempt, rnd = Math.random) {
  const a = Math.max(1, Number(attempt) || 1);
  return Math.min(POLICY.backoffBaseS * (2 ** (a - 1)), POLICY.backoffCapS) + Math.floor(rnd() * POLICY.jitterS);
}

function shouldRetry(kind, retriesDone, { idleWaited = true } = {}) {
  if (kind === 'invalid_state' && !idleWaited) return false;
  return Number(retriesDone || 0) < budget(kind);
}

module.exports = { POLICY, TRANSIENT_RE, classify, budget, backoffSeconds, shouldRetry };

if (require.main === module) {
  const [cmd, a, b] = process.argv.slice(2);
  if (cmd === 'backoff') console.log(backoffSeconds(a));
  else if (cmd === 'classify') console.log(classify(a || require('fs').readFileSync(0, 'utf8')));
  else if (cmd === 'should-retry') { const k = classify(a); console.log(shouldRetry(k, b) ? `RETRY ${k}` : `STOP ${k}`); }
  else if (cmd === 'get') console.log(POLICY[a]);
  else console.log(JSON.stringify(POLICY));
}
