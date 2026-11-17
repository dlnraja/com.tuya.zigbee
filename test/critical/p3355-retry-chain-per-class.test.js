'use strict';

/**
 * P3355: run 44004265730 (17/11/2026 03:37 Paris) was the transport retry 1/2 after a socket hang up
 * (#3709). Its build #3710 failed with a bare AggregateError and the decision said "the single identical
 * retry is already used (2 attempts)": the one chain counter mixed both classes. The chain now carries a
 * count per class ("<total>:t<transport>a<bare>"; parseInt keeps the total for old readers):
 * transport kinds up to 2 retries, a bare AggregateError exactly 1, and at most 3 retries per chain.
 * A legacy plain number keeps the old, stricter reading (every prior retry counts for the current class).
 */

const assert = require('assert');
const { describe, it } = require('../_support/dual-runner');
const P = require('../../.github/scripts/athom-publish-policy.js');
const T = require('../../.github/scripts/transient-publish-retry.js');

const bare = (id, v) => ({ id, version: v, state: 'processing_failed', stateMeta: 'AggregateError' });
const hang = (id, v) => ({ id, version: v, state: 'processing_failed', stateMeta: 'socket hang up' });

describe('P3355 retry chain counted per error class', () => {
  it('parse / format the chain; legacy numbers stay readable', () => {
    assert.deepStrictEqual(P.parseRetryChain('2:t1a1'), { total: 2, transport: 1, bare: 1, typed: true });
    assert.deepStrictEqual(P.parseRetryChain('1'), { total: 1, transport: null, bare: null, typed: false });
    assert.deepStrictEqual(P.parseRetryChain('false'), { total: 0, transport: 0, bare: 0, typed: true });
    assert.strictEqual(P.formatRetryChain({ transport: 1, bare: 1 }), '2:t1a1');
    assert.strictEqual(P.retryCountOf('2:t1a1'), 2);
    assert.strictEqual(parseInt('2:t1a1', 10), 2);
  });

  it('a bare AggregateError after a transport retry still gets its single identical retry', () => {
    const d = T.decide({ version: '9.0.1629', builds: [bare(3710, '9.0.1629'), hang(3709, '9.0.1628')], retryChain: '1:t1a0', idleWaited: true });
    assert.strictEqual(d.retry, true, d.reason);
    assert.strictEqual(d.next, '2:t1a1');
  });

  it('a second bare AggregateError in the chain stops and trips the breaker', () => {
    const d = T.decide({ version: '9.0.1630', builds: [bare(3711, '9.0.1630')], retryChain: '2:t1a1', idleWaited: true });
    assert.strictEqual(d.retry, false);
    assert.strictEqual(d.tripBreaker, true);
    assert.strictEqual(d.bisect, true);
  });

  it('transport: up to 2 retries (3 attempts), then stop', () => {
    const a = T.decide({ version: 'v1', builds: [hang(1, 'v1')], retryChain: '', idleWaited: true });
    assert.strictEqual(a.next, '1:t1a0');
    const b = T.decide({ version: 'v2', builds: [hang(2, 'v2')], retryChain: '1:t1a0', idleWaited: true });
    assert.strictEqual(b.next, '2:t2a0');
    const c = T.decide({ version: 'v3', builds: [hang(3, 'v3')], retryChain: '2:t2a0', idleWaited: true });
    assert.strictEqual(c.retry, false);
  });

  it('a transport failure after the bare retry still has its own budget, capped at 3 retries per chain', () => {
    const a = T.decide({ version: 'v3', builds: [hang(3, 'v3')], retryChain: '2:t1a1', idleWaited: true });
    assert.strictEqual(a.next, '3:t2a1');
    const b = T.decide({ version: 'v4', builds: [hang(4, 'v4')], retryChain: '3:t2a1', idleWaited: true });
    assert.strictEqual(b.retry, false);
    const c = P.retryDecision({ kind: 'socket hang up', chain: '3:t1a2' });
    assert.strictEqual(c.retry, false, 'never more than 3 retries per chain');
  });

  it('legacy numeric chain keeps the old strict reading', () => {
    const d = T.decide({ version: 'v', builds: [bare(9, 'v')], retryCount: 1, idleWaited: true });
    assert.strictEqual(d.retry, false);
  });

  it('breaker exemption follows the class counts', () => {
    assert.strictEqual(P.singleRetryExempt({ builds: [bare(3710, 'x')], transientRetry: '2:t1a1' }).exempt, true);
    assert.strictEqual(P.singleRetryExempt({ builds: [bare(3711, 'x')], transientRetry: '3:t1a2' }).exempt, false);
    assert.strictEqual(P.singleRetryExempt({ builds: [hang(3709, 'x')], transientRetry: '3:t2a1' }).exempt, true);
    assert.strictEqual(P.singleRetryExempt({ builds: [hang(3709, 'x')], transientRetry: '4:t3a1' }).exempt, false);
    assert.strictEqual(P.singleRetryExempt({ builds: [bare(3710, 'x')], transientRetry: '2' }).exempt, false, 'legacy number: strict');
  });
});
