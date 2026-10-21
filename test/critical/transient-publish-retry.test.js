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
// P2830e: default policy = reach Test; a healthy older Test no longer blocks the bumped retry (2 per chain).
test('P2830e retries hang even with healthy older Test, max 4 per chain (P2924)', () => {
  const builds = [
    { version: '9.0.1', state: 'processing_failed', stateMeta: 'socket hang up' },
    { version: '9.0.0', state: 'test', id: 99 },
  ];
  const first = decide({ version: '9.0.1', builds });
  assert.strictEqual(first.retry, true); assert.strictEqual(first.next, 1);
  const second = decide({ version: '9.0.1', builds, retryCount: 1 });
  assert.strictEqual(second.retry, true); assert.strictEqual(second.next, 2);
  assert.strictEqual(decide({ version: '9.0.1', builds, retryCount: 3 }).retry, true);
  assert.strictEqual(decide({ version: '9.0.1', builds, retryCount: 4 }).retry, false);
});
test('P2830e AggregateError after the retry budget requests a bisect, never a retry', () => {
  const d = decide({ version: '9.0.1', builds: B('processing_failed', 'AggregateError'), retryCount: 2 });
  assert.strictEqual(d.retry, false); assert.strictEqual(d.bisect, true);
  assert.strictEqual(decide({ version: '9.0.1', builds: B('processing_failed', 'socket hang up'), retryCount: 4 }).bisect || false, false);
});
test('P2830e backoff grows with jitter and is capped', () => {
  const { backoffSeconds } = require('../../.github/scripts/transient-publish-retry');
  assert.strictEqual(backoffSeconds(1, () => 0), 60); assert.strictEqual(backoffSeconds(2, () => 0), 120);
  assert.strictEqual(backoffSeconds(3, () => 0), 240); assert.strictEqual(backoffSeconds(9, () => 0.999), 269);
});
test('retries once on S3 key does not exist', () => assert.strictEqual(decide({ version: '9.0.1', builds: B('processing_failed', 'The specified key does not exist.') }).retry, true));
// WHY(2026-10-11 user): AggregateError flakes on identical content (1424F/1425T, 1426F/1427T) -> up to TWO bumped retries.
test('retries AggregateError once', () => assert.strictEqual(decide({ version: '9.0.1', builds: B('processing_failed', 'AggregateError') }).retry, true));
test('retries AggregateError a second time from the first retry run', () => {
  const d = decide({ version: '9.0.1', builds: B('processing_failed', 'AggregateError'), alreadyRetried: true });
  assert.strictEqual(d.retry, true); assert.strictEqual(d.next, 2);
});
test('never retries AggregateError after two retries', () => assert.strictEqual(decide({ version: '9.0.1', builds: B('processing_failed', 'AggregateError'), retryCount: 2 }).retry, false));
test('retry count parsing (legacy true = 1)', () => {
  assert.strictEqual(parseRetryCount('true'), 1); assert.strictEqual(parseRetryCount('false'), 0);
  assert.strictEqual(parseRetryCount('2'), 2); assert.strictEqual(parseRetryCount(undefined), 0);
});
test('a first retry run may retry once more (P2924 hang-up budget 4), never beyond', () => {
  assert.strictEqual(decide({ version: '9.0.1', builds: B('processing_failed', 'socket hang up'), alreadyRetried: true }).retry, true);
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
