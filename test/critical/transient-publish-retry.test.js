'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { decide } = require('../../.github/scripts/transient-publish-retry');
const B = (state, stateMeta) => [{ version: '9.0.1', state, stateMeta }];
test('retries once on socket hang up', () => assert.strictEqual(decide({ version: '9.0.1', builds: B('processing_failed', 'socket hang up') }).retry, true));
test('retries once on S3 key does not exist', () => assert.strictEqual(decide({ version: '9.0.1', builds: B('processing_failed', 'The specified key does not exist.') }).retry, true));
// WHY(2026-10-11 user): AggregateError alternates on near-identical content -> exactly ONE retry, never from a retry run.
test('retries AggregateError once', () => assert.strictEqual(decide({ version: '9.0.1', builds: B('processing_failed', 'AggregateError') }).retry, true));
test('never retries AggregateError from a retry run', () => assert.strictEqual(decide({ version: '9.0.1', builds: B('processing_failed', 'AggregateError'), alreadyRetried: true }).retry, false));
test('never retries a retry run', () => assert.strictEqual(decide({ version: '9.0.1', builds: B('processing_failed', 'socket hang up'), alreadyRetried: true }).retry, false));
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
