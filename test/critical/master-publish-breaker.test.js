'use strict';
const assert = require('assert'); const fs = require('fs'); const path = require('path');
const B = require('../../.github/scripts/master-publish-breaker');
const R = require('../../.github/scripts/transient-publish-retry');
const W = (f) => fs.readFileSync(path.join(__dirname, '../../.github/workflows', f), 'utf8');
const pf = (id) => ({ id, version: `9.0.${id}`, state: 'processing_failed', stateMeta: 'AggregateError' });
describe('P-KB4 master Athom publish breaker', () => {
  it('opens after N processing_failed builds on push', () => {
    assert.strictEqual(B.decide({ builds: [pf(3), pf(2), pf(1)], event: 'push' }).skip, true);
  });
  it('stays closed when one of the last N reached test', () => {
    assert.strictEqual(B.decide({ builds: [pf(3), { id: 2, state: 'test' }, pf(1)], event: 'push' }).skip, false);
  });
  it('manual dispatch may try once; automatic retry dispatch may not', () => {
    assert.strictEqual(B.decide({ builds: [pf(3), pf(2), pf(1)], event: 'workflow_dispatch', transientRetry: 'false' }).skip, false);
    assert.strictEqual(B.decide({ builds: [pf(3), pf(2), pf(1)], event: 'workflow_dispatch', transientRetry: '1' }).skip, true);
  });
  it('no snapshot -> closed (never blocks on missing data)', () => { assert.strictEqual(B.decide({ builds: [], event: 'push' }).skip, false); });
  it('hang-up-only policy: no retry for AggregateError, one for socket hang up', () => {
    assert.strictEqual(R.decide({ version: '9.0.5', builds: [pf(5)], retryCount: 0, hangupOnly: true }).retry, false);
    assert.strictEqual(R.decide({ version: '9.0.5', builds: [{ id: 5, version: '9.0.5', state: 'processing_failed' }], retryCount: 0, hangupOnly: true }).retry, false);
    const h = { id: 5, version: '9.0.5', state: 'processing_failed', stateMeta: 'socket hang up' };
    assert.strictEqual(R.decide({ version: '9.0.5', builds: [h], retryCount: 0, hangupOnly: true }).retry, true);
    assert.strictEqual(R.decide({ version: '9.0.5', builds: [h], retryCount: 1, hangupOnly: true }).retry, false);
  });
  it('shared policy unchanged without the flag (stable/bastien)', () => {
    assert.strictEqual(R.decide({ version: '9.0.5', builds: [pf(5)], retryCount: 0, hangupOnly: false }).retry, true);
  });
  it('workflows are wired: breaker job gates publish, hang-up-only env set, auto-fix step master only', () => {
    const a = W('auto-publish-on-push.yml');
    assert.match(a, /needs: breaker/); assert.match(a, /needs\.breaker\.outputs\.skip != 'true'/); assert.match(a, /ATHOM_RETRY_HANGUP_ONLY: '1'/);
    const f = W('auto-fix-and-publish.yml');
    assert.match(f, /Master Athom publish breaker\n\s+if: github\.ref_name == 'master'/);
    for (const x of ['publish-stable.yml', 'bastien-publish.yml']) if (fs.existsSync(path.join(__dirname, '../../.github/workflows', x))) assert.doesNotMatch(W(x), /master-publish-breaker|ATHOM_RETRY_HANGUP_ONLY/);
  });
});
