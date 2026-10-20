'use strict';
// P2911: Athom gateway errors (502/503/504, by code or by text) are transient and retried (Bastien run 39382266332 died on "Error: Bad Gateway").
const assert = require('assert');
const pol = require('../../.github/scripts/athom-retry-policy');
describe('P2911 gateway errors are transient', () => {
  for (const s of ['Error: Bad Gateway', '[direct-publish] Error: Bad Gateway', 'Service Unavailable', 'Gateway Timeout', 'Gateway Time-out', 'HTTP 502', 'status 503', '504']) {
    it(s, () => { assert.strictEqual(pol.classify(s), 'transient'); assert.ok(pol.shouldRetry(pol.classify(s), 0)); assert.ok(!pol.shouldRetry('transient', 2)); });
  }
  it('unknown errors still never retry', () => assert.strictEqual(pol.shouldRetry(pol.classify('Error: Bad Request'), 0), false));
  it('AggregateError keeps its own class', () => assert.strictEqual(pol.classify('AggregateError Bad Gateway'), 'AggregateError'));
});
