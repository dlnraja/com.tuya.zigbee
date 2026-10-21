'use strict';
// P2924: socket hang up (Athom processing_failed after a good upload) gets a 4-retry budget,
// other transient errors keep 2, unknown never retries; policy stays identical on the 3 branches.
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const P = require(path.join(__dirname, '..', '..', '.github', 'scripts', 'athom-retry-policy.js'));

test('hang-up budget is 4, transient 2, AggregateError 2, unknown 0', () => {
  assert.strictEqual(P.budget(P.classify('processing_failed | stateMeta=socket hang up')), 4);
  assert.strictEqual(P.budget(P.classify('ECONNRESET')), 2);
  assert.strictEqual(P.budget(P.classify('AggregateError')), 2);
  assert.strictEqual(P.budget(P.classify('something new')), 0);
});

test('shouldRetry stops after the 4th hang-up retry', () => {
  for (let done = 0; done < 4; done++) {assert.ok(P.shouldRetry('socket hang up', done));}
  assert.ok(!P.shouldRetry('socket hang up', 4));
});

test('backoff stays bounded for retries 3 and 4', () => {
  assert.ok(P.backoffSeconds(4, () => 0.99) <= P.POLICY.backoffCapS + P.POLICY.jitterS);
});

const TPR = path.join(__dirname, '..', '..', '.github', 'scripts', 'transient-publish-retry.js');
test('decide(): hang-up chain retries up to 4, AggregateError still bisects at 2', { skip: !require('fs').existsSync(TPR) && 'master-only script' }, () => {
  const { decide } = require(path.join(__dirname, '..', '..', '.github', 'scripts', 'transient-publish-retry.js'));
  const hang = [{ version: '9.0.1', state: 'processing_failed', stateMeta: 'socket hang up' }];
  for (let done = 0; done < 4; done++) {
    const d = decide({ version: '9.0.1', builds: hang, retryCount: done, reachTest: true });
    assert.ok(d.retry, `hang retry at done=${done}`);
    assert.strictEqual(d.next, done + 1);
  }
  assert.ok(!decide({ version: '9.0.1', builds: hang, retryCount: 4, reachTest: true }).retry);
  const agg = [{ version: '9.0.1', state: 'processing_failed', stateMeta: 'AggregateError' }];
  const a2 = decide({ version: '9.0.1', builds: agg, retryCount: 2, reachTest: true });
  assert.ok(!a2.retry && a2.bisect);
  const tr = [{ version: '9.0.1', state: 'processing_failed', stateMeta: 'ECONNRESET' }];
  assert.ok(!decide({ version: '9.0.1', builds: tr, retryCount: 2, reachTest: true }).retry);
});
