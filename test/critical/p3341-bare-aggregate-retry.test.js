'use strict';
// P3341 (16/11/2026, owner go 03:03 Paris): Athom's bare "AggregateError" (empty message, stateMeta exactly
// "AggregateError") is the Node net multi-address connect failure (P3340), and identical content flips
// Test <-> AggregateError. It gets exactly ONE identical retry (P3311 backoff, bumped version, only when Athom
// already holds a final failed build for this version, so no duplicate). A second failure trips the breaker as
// before. An AggregateError WITH a message and every other real error stay blocking. Shared by the 3 branches.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const P = require(path.join(ROOT, '.github/scripts/athom-publish-policy.js'));
const R = require(path.join(ROOT, '.github/scripts/athom-retry-policy.js'));
const { classifyFailure } = require(path.join(ROOT, '.github/scripts/athom-classify-failure.js'));
const TPR = path.join(ROOT, '.github/scripts/transient-publish-retry.js');
const BARE = 'AggregateError-bare';
const pf = (id, meta) => ({ id, version: `9.0.${id}`, state: 'processing_failed', stateMeta: meta });

test('classify: stateMeta exactly "AggregateError" is bare; with a message it stays AggregateError (real)', () => {
  assert.strictEqual(P.classify(pf(1, 'AggregateError')).kind, BARE);
  assert.strictEqual(P.classify(pf(1, ' AggregateError ')).kind, BARE);
  assert.deepStrictEqual(P.classify(pf(1, 'AggregateError: All promises were rejected')), { kind: 'AggregateError', cls: 'real' });
  assert.strictEqual(P.classify(pf(1, 'AggregateError [ETIMEDOUT]')).kind, 'AggregateError');
  assert.strictEqual(P.classify({ state: 'processing_failed', stateMeta: 'AggregateError', error: 'socket hang up' }).kind, 'AggregateError');
});
test('classify text: only stateMeta-shaped bare tokens count as bare', () => {
  for (const t of ['AggregateError', 'failed #3707: v9.0.1626 | processing_failed | stateMeta=AggregateError',
    '{"id":3707,"version":"9.0.1626","state":"processing_failed","stateMeta":"AggregateError"}',
    'wait-draft: saw processing_failed #3707 (AggregateError) - keep polling']) assert.strictEqual(P.classify(t).kind, BARE, t);
  for (const t of ['AggregateError: x', 'AggregateError socket hang up', 'stateMeta=AggregateError: boom',
    'stateMeta=AggregateError\nAggregateError: second one', '"stateMeta":"AggregateError [ECONNREFUSED]"']) assert.strictEqual(P.classify(t).kind, 'AggregateError', t);
});
test('retryDecision: bare -> exactly one retry with the P3311 first backoff, then breaker trips', () => {
  const d0 = P.retryDecision({ kind: BARE, retriesDone: 0, rnd: 0 });
  assert.strictEqual(d0.retry, true); assert.strictEqual(d0.tripBreaker, false); assert.strictEqual(d0.backoffS, 300);
  const d1 = P.retryDecision({ kind: BARE, retriesDone: 1, rnd: 0 });
  assert.strictEqual(d1.retry, false); assert.strictEqual(d1.tripBreaker, true); assert.strictEqual(d1.diagnose, true);
  const m = P.retryDecision({ text: 'AggregateError: x', retriesDone: 0 });
  assert.strictEqual(m.retry, false); assert.strictEqual(m.tripBreaker, true);
  assert.strictEqual(P.RETRY.maxBareAggregateRetries, 1);
});
test('breaker: a bare latest failure still blocks normal runs; only retry 1 of the chain is exempt', () => {
  assert.strictEqual(P.breakerAssess({ builds: [pf(3, 'AggregateError'), { id: 2, state: 'test' }] }).tripped, true);
  assert.strictEqual(P.singleRetryExempt({ builds: [pf(3, 'AggregateError')], transientRetry: '1' }).exempt, true);
  assert.strictEqual(P.singleRetryExempt({ builds: [pf(3, 'AggregateError')], transientRetry: '2' }).exempt, false);
  assert.strictEqual(P.singleRetryExempt({ builds: [pf(3, 'AggregateError: x')], transientRetry: '1' }).exempt, false);
});
test('athom-retry-policy (stable/bastien loops): bare budget 1, AggregateError with message 0', () => {
  assert.strictEqual(R.classify('{"state":"processing_failed","stateMeta":"AggregateError"}'), BARE);
  assert.ok(R.shouldRetry(BARE, 0)); assert.ok(!R.shouldRetry(BARE, 1));
  assert.ok(!R.shouldRetry('AggregateError', 0));
  assert.strictEqual(R.budget(BARE), 1);
  assert.ok(R.maxBudget() >= 1);
});
test('athom-classify-failure: bare row -> bare kind', () => {
  const st = '{"id":428,"version":"5.12.560","state":"processing_failed","stateMeta":"AggregateError"}';
  assert.strictEqual(classifyFailure({ statusText: st, version: '5.12.560' }).kind, BARE);
});
test('master transient-publish-retry: one retry only for an existing final bare failure (no duplicate)', { skip: !fs.existsSync(TPR) && 'master-only script' }, () => {
  const { decide } = require(TPR);
  const B = [pf(1, 'AggregateError')];
  const d0 = decide({ version: '9.0.1', builds: B, retryCount: 0 });
  assert.strictEqual(d0.retry, true); assert.strictEqual(d0.next, 1); assert.ok(!d0.bisect);
  const d1 = decide({ version: '9.0.1', builds: B, retryCount: 1 });
  assert.strictEqual(d1.retry, false); assert.strictEqual(d1.tripBreaker, true); assert.strictEqual(d1.bisect, true);
  assert.strictEqual(decide({ version: '9.0.2', builds: B, retryCount: 0 }).retry, false, 'no Athom build for this version');
  assert.strictEqual(decide({ version: '9.0.1', builds: [{ ...B[0], state: 'processing' }], retryCount: 0 }).retry, false, 'not final');
  assert.strictEqual(decide({ version: '9.0.1', builds: [pf(1, 'AggregateError: x')], retryCount: 0 }).retry, false);
});
test('master workflow hands a bare refusal after the retry to the P3095 bisect as AggregateError', { skip: !fs.existsSync(path.join(ROOT, '.github/workflows/auto-publish-on-push.yml')) || !fs.existsSync(TPR) }, () => {
  const wf = fs.readFileSync(path.join(ROOT, '.github/workflows/auto-publish-on-push.yml'), 'utf8');
  assert.match(wf, /case "\$kind" in AggregateError\|AggregateError-bare\)/);
});
