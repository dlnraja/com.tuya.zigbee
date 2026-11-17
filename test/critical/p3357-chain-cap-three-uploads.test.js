'use strict';

/**
 * P3357: user rule (2026-11-15): a publish chain makes at most 3 uploads in total (1 initial + 2 retries),
 * whatever the error mix, then stops and notifies. A bare AggregateError still gets at most its one identical
 * retry inside those 3; transport retries fill the rest. (P3355 allowed 3 retries = 4 uploads.)
 */

const assert = require('assert');
const { describe, it } = require('../_support/dual-runner');
const P = require('../../.github/scripts/athom-publish-policy.js');

const bare = (id) => ({ id, state: 'processing_failed', stateMeta: 'AggregateError' });
const hang = (id) => ({ id, state: 'processing_failed', stateMeta: 'socket hang up' });

describe('P3357 chain capped at 3 uploads', () => {
  it('cap constants: 2 retries, 3 uploads', () => {
    assert.strictEqual(P.RETRY.maxChainRetries, 2);
    assert.strictEqual(P.RETRY.maxChainUploads, 3);
  });

  it('AggregateError -> socket hang up -> socket hang up: no 4th upload (the #3711/#3712 chain)', () => {
    const d1 = P.retryDecision({ kind: 'AggregateError-bare', chain: '' });
    assert.strictEqual(d1.retry, true); assert.strictEqual(d1.next, '1:t0a1');
    const d2 = P.retryDecision({ kind: 'socket hang up', chain: '1:t0a1' });
    assert.strictEqual(d2.retry, true); assert.strictEqual(d2.next, '2:t1a1');
    const d3 = P.retryDecision({ kind: 'socket hang up', chain: '2:t1a1' });
    assert.strictEqual(d3.retry, false);
    assert.match(d3.reason, /3 uploads/);
  });

  it('any mix stops after 2 retries', () => {
    for (const [kind, chain] of [['socket hang up', '2:t2a0'], ['AggregateError-bare', '2:t2a0'], ['transient', '2:t1a1'], ['AggregateError-bare', '2:t1a1']]) {
      assert.strictEqual(P.retryDecision({ kind, chain }).retry, false, `${kind} ${chain}`);
    }
    assert.strictEqual(P.retryDecision({ kind: 'AggregateError-bare', chain: '1:t1a0' }).retry, true);
    assert.strictEqual(P.retryDecision({ kind: 'socket hang up', chain: '1:t1a0' }).retry, true);
  });

  it('the breaker never lets a 4th upload of a chain through', () => {
    assert.strictEqual(P.singleRetryExempt({ builds: [hang(3)], transientRetry: '3:t2a1' }).exempt, false);
    assert.strictEqual(P.singleRetryExempt({ builds: [bare(3)], transientRetry: '3:t2a1' }).exempt, false);
    assert.strictEqual(P.singleRetryExempt({ builds: [hang(3)], transientRetry: '3' }).exempt, false);
    assert.strictEqual(P.singleRetryExempt({ builds: [hang(2)], transientRetry: '2:t1a1' }).exempt, true);
  });
});
