'use strict';

/**
 * P3355 (port of master ec2c2b5908): the shared publish policy counts a retry chain per error class
 * ("<total>:t<transport>a<bare>"): transport up to 2 retries, bare AggregateError exactly 1, at most 3
 * per chain; a legacy plain number keeps the old strict reading.
 */

const assert = require('assert');
const { describe, it } = require('../_support/dual-runner');
const P = require('../../.github/scripts/athom-publish-policy.js');

const bare = (id) => ({ id, state: 'processing_failed', stateMeta: 'AggregateError' });
const hang = (id) => ({ id, state: 'processing_failed', stateMeta: 'socket hang up' });

describe('P3355 retry chain counted per error class (policy)', () => {
  it('parse / format', () => {
    assert.deepStrictEqual(P.parseRetryChain('2:t1a1'), { total: 2, transport: 1, bare: 1, typed: true });
    assert.strictEqual(P.formatRetryChain({ transport: 1, bare: 1 }), '2:t1a1');
    assert.strictEqual(P.retryCountOf('2:t1a1'), 2);
  });
  it('bare AggregateError after a transport retry keeps its single retry; a second one stops', () => {
    const a = P.retryDecision({ kind: 'AggregateError-bare', chain: '1:t1a0' });
    assert.strictEqual(a.retry, true); assert.strictEqual(a.next, '2:t1a1');
    const b = P.retryDecision({ kind: 'AggregateError-bare', chain: '2:t1a1' });
    assert.strictEqual(b.retry, false); assert.strictEqual(b.tripBreaker, true);
  });
  it('chain cap and breaker exemption', () => {
    assert.strictEqual(P.retryDecision({ kind: 'socket hang up', chain: '3:t1a2' }).retry, false);
    assert.strictEqual(P.singleRetryExempt({ builds: [bare(2)], transientRetry: '2:t1a1' }).exempt, true);
    assert.strictEqual(P.singleRetryExempt({ builds: [hang(3)], transientRetry: '4:t3a1' }).exempt, false);
    assert.strictEqual(P.singleRetryExempt({ builds: [bare(2)], transientRetry: '2' }).exempt, false);
  });
});
