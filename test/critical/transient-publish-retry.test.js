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
