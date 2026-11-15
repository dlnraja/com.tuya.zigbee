'use strict';
// P2924 -> P3036 (25/10/2026): socket hang up and other transient errors get exactly ONE retry,
// AggregateError and unknown never retry; policy stays identical on the 3 branches.
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const P = require(path.join(__dirname, '..', '..', '.github', 'scripts', 'athom-retry-policy.js'));

test('P3311 budgets: hang-up 2, transient 2, invalid_state 1, AggregateError 0, unknown 0', () => {
  assert.strictEqual(P.budget(P.classify('processing_failed | stateMeta=socket hang up')), 2);
  assert.strictEqual(P.budget(P.classify('ECONNRESET')), 2);
  assert.strictEqual(P.budget('invalid_state'), 1);
  assert.strictEqual(P.budget(P.classify('AggregateError')), 0);
  assert.strictEqual(P.budget(P.classify('something new')), 0);
});

test('shouldRetry stops after the second hang-up retry (3 attempts, P3311)', () => {
  assert.ok(P.shouldRetry('socket hang up', 0));
  assert.ok(P.shouldRetry('socket hang up', 1));
  assert.ok(!P.shouldRetry('socket hang up', 2));
  assert.ok(!P.shouldRetry('AggregateError', 0));
});

test('backoff stays bounded for retries 3 and 4', () => {
  assert.ok(P.backoffSeconds(4, () => 0.99) <= P.POLICY.backoffCapS + P.POLICY.jitterS);
});

const TPR = path.join(__dirname, '..', '..', '.github', 'scripts', 'transient-publish-retry.js');
test('decide(): hang-up retries twice, AggregateError never retries and asks for a bisect', { skip: !require('fs').existsSync(TPR) && 'master-only script' }, () => {
  const { decide } = require(path.join(__dirname, '..', '..', '.github', 'scripts', 'transient-publish-retry.js'));
  const hang = [{ version: '9.0.1', state: 'processing_failed', stateMeta: 'socket hang up' }];
  const d = decide({ version: '9.0.1', builds: hang, retryCount: 0, reachTest: true });
  assert.ok(d.retry); assert.strictEqual(d.next, 1);
  const d2 = decide({ version: '9.0.1', builds: hang, retryCount: 1, reachTest: true });
  assert.ok(d2.retry); assert.strictEqual(d2.next, 2);
  assert.ok(!decide({ version: '9.0.1', builds: hang, retryCount: 2, reachTest: true }).retry);
  const agg = [{ version: '9.0.1', state: 'processing_failed', stateMeta: 'AggregateError' }];
  const a0 = decide({ version: '9.0.1', builds: agg, retryCount: 0, reachTest: true });
  assert.ok(!a0.retry && a0.bisect);
  const tr = [{ version: '9.0.1', state: 'processing_failed', stateMeta: 'ECONNRESET' }];
  assert.ok(decide({ version: '9.0.1', builds: tr, retryCount: 1, reachTest: true }).retry);
  assert.ok(!decide({ version: '9.0.1', builds: tr, retryCount: 2, reachTest: true }).retry);
});
