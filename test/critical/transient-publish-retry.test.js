'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { decide, parseRetryCount } = require('../../.github/scripts/transient-publish-retry');
const B = (state, stateMeta) => [{ version: '9.0.1', state, stateMeta }];
test('retries once on socket hang up', () => assert.strictEqual(decide({ version: '9.0.1', builds: B('processing_failed', 'socket hang up') }).retry, true));
// WHY(P2831): tip #3581–#3584 — hang + healthy Test must NOT auto-republish.
test('refuses hang retry when healthy Test exists (legacy P2831 mode, ATHOM_REACH_TEST=0)', () => {
  const d = decide({
    version: '9.0.1',
    builds: [
      { version: '9.0.1', state: 'processing_failed', stateMeta: 'socket hang up' },
      { version: '9.0.0', state: 'test', id: 99 },
    ],
    reachTest: false,
  });
  assert.strictEqual(d.retry, false);
  assert.match(String(d.reason), /P2831|healthy Test/i);
});
// P2830e: default policy = reach Test; a healthy older Test does not block the bumped retry. P3036: one per chain.
test('P2830e retries hang even with healthy older Test, max 1 per chain (P3036)', () => {
  const builds = [
    { version: '9.0.1', state: 'processing_failed', stateMeta: 'socket hang up' },
    { version: '9.0.0', state: 'test', id: 99 },
  ];
  const first = decide({ version: '9.0.1', builds });
  assert.strictEqual(first.retry, true); assert.strictEqual(first.next, 1);
  assert.strictEqual(decide({ version: '9.0.1', builds, retryCount: 1 }).retry, false);
  assert.strictEqual(decide({ version: '9.0.1', builds, retryCount: 0, retryUsed: true }).retry, false, 'in-run fallback used the retry');
});
test('P2830e AggregateError after the retry budget requests a bisect, never a retry', () => {
  const d = decide({ version: '9.0.1', builds: B('processing_failed', 'AggregateError'), retryCount: 2 });
  assert.strictEqual(d.retry, false); assert.strictEqual(d.bisect, true);
  assert.strictEqual(decide({ version: '9.0.1', builds: B('processing_failed', 'socket hang up'), retryCount: 4 }).bisect || false, false);
});
test('P3036 backoff is >= 5 min with jitter', () => {
  const { backoffSeconds } = require('../../.github/scripts/transient-publish-retry');
  assert.strictEqual(backoffSeconds(1, () => 0), 300); assert.strictEqual(backoffSeconds(2, () => 0), 300);
  assert.strictEqual(backoffSeconds(9, () => 0.999), 360);
});
test('retries once on S3 key does not exist', () => assert.strictEqual(decide({ version: '9.0.1', builds: B('processing_failed', 'The specified key does not exist.') }).retry, true));
// P3036 (25/10/2026): AggregateError is a real failure (bisect P3034 cleared the content) -> never retried.
test('never retries AggregateError (P3036, was 2 flake retries)', () => {
  const d = decide({ version: '9.0.1', builds: B('processing_failed', 'AggregateError') });
  assert.strictEqual(d.retry, false); assert.strictEqual(d.tripBreaker, true); assert.strictEqual(d.bisect, true);
});
test('never retries AggregateError after two retries', () => assert.strictEqual(decide({ version: '9.0.1', builds: B('processing_failed', 'AggregateError'), retryCount: 2 }).retry, false));
test('retry count parsing (legacy true = 1)', () => {
  assert.strictEqual(parseRetryCount('true'), 1); assert.strictEqual(parseRetryCount('false'), 0);
  assert.strictEqual(parseRetryCount('2'), 2); assert.strictEqual(parseRetryCount(undefined), 0);
});
test('a retry run never retries again (P3036 single retry)', () => {
  assert.strictEqual(decide({ version: '9.0.1', builds: B('processing_failed', 'socket hang up'), alreadyRetried: true }).retry, false);
  assert.strictEqual(decide({ version: '9.0.1', builds: B('processing_failed', 'socket hang up'), retryCount: 4 }).retry, false);
});
test('no retry when in Test', () => assert.strictEqual(decide({ version: '9.0.1', builds: B('test', {}) }).retry, false));

// WHY(2026-10-11): invalid_state retried once only after the pre-upload Athom idle wait.
test('retries invalid_state only after idle wait', () => {
  assert.strictEqual(decide({ version: '9.0.1', builds: B('processing_failed', 'invalid_state'), idleWaited: true }).retry, true);
  assert.strictEqual(decide({ version: '9.0.1', builds: B('processing_failed', 'invalid_state') }).retry, false);
  assert.strictEqual(decide({ version: '9.0.1', builds: B('processing_failed', 'invalid_state'), idleWaited: true, alreadyRetried: true }).retry, false);
});
test('athom idle gate treats processing as busy', () => {
  const { decide: idle, FINAL } = require('../../.github/scripts/wait-athom-idle.js');
  assert.strictEqual(FINAL.test('processing'), false);
  assert.strictEqual(FINAL.test('test'), true);
  assert.strictEqual(idle([]), true);
  assert.strictEqual(idle(null), false);
});
// WHY(2026-10-11): no false green — the final gate fails unless this version reached test/live.
test('athom final gate verdicts', () => {
  const { verdict } = require('../../.github/scripts/assert-athom-final.js');
  assert.strictEqual(verdict([{ id: 1, version: '9.0.1', state: 'processing_failed' }], '9.0.1').ok, false);
  assert.strictEqual(verdict([{ id: 1, version: '9.0.1', state: 'processing_failed' }], '9.0.1').done, true);
  assert.strictEqual(verdict([{ id: 2, version: '9.0.1', state: 'test' }], '9.0.1').ok, true);
  assert.strictEqual(verdict([{ id: 2, version: '9.0.1', state: 'processing' }], '9.0.1').done, false);
  assert.strictEqual(verdict([], '9.0.1').done, false);
});

// WHY(2026-10-11): waiting_for_files older than 5 min is stuck (final) for idle wait and final gate.
test('stuck waiting_for_files counts as final', () => {
  const old = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const fresh = new Date().toISOString();
  const { isStuck } = require('../../.github/scripts/wait-athom-idle.js');
  assert.strictEqual(isStuck({ state: 'waiting_for_files', stateChangedAt: old }), true);
  assert.strictEqual(isStuck({ state: 'waiting_for_files', stateChangedAt: fresh }), false);
  assert.strictEqual(isStuck({ state: 'waiting_for_files', at: old }), true); // homey-build-status.js field
  const { verdict } = require('../../.github/scripts/assert-athom-final.js');
  const v = verdict([{ id: 1, version: '9.0.1', state: 'waiting_for_files', stateChangedAt: old }], '9.0.1');
  assert.strictEqual(v.done && !v.ok, true);
});
test('direct publish never re-sends an uploaded version', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '../../scripts/direct-api-publish.js'), 'utf8');
  const guard = src.indexOf('SAME-VERSION GUARD');
  assert.ok(guard > 0 && guard < src.indexOf('api.createBuild('));
});
