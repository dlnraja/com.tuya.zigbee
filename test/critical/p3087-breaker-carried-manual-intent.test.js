'use strict';
// P3087: a manual relaunch held by the P3036 gate keeps its single try through the next-slot retry,
// bounded by "no Athom build newer than the one seen at hold time" and MAX_CARRY slots.
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert'); const fs = require('fs'); const path = require('path');
const B = require('../../.github/scripts/master-publish-breaker');
const D = require('../../.github/scripts/athom-deferred-dispatch');
const pf = (id) => ({ id, version: `9.0.${id}`, state: 'processing_failed', stateMeta: 'AggregateError' });
const open = [pf(3685), pf(3684), pf(3683)];
describe('P3087 breaker: carried manual intent', () => {
  it('plain deferred retry and push stay blocked while the breaker is open (run 40502095538)', () => {
    assert.strictEqual(B.decide({ builds: open, event: 'push', snapshotOk: true }).skip, true);
    assert.strictEqual(B.decide({ builds: open, event: 'schedule', snapshotOk: true }).skip, true);
  });
  it('a carried manual retry passes while Athom has no newer build, and stops after one', () => {
    const d = B.decide({ builds: open, event: 'schedule', snapshotOk: true, deferredManual: 'b3685.c1' });
    assert.strictEqual(d.skip, false); assert.strictEqual(d.carried, true);
    assert.strictEqual(B.decide({ builds: [pf(3686), ...open], event: 'schedule', snapshotOk: true, deferredManual: 'b3685.c1' }).skip, true);
  });
  it('carry is bounded to MAX_CARRY slots and rejects junk', () => {
    assert.strictEqual(B.decide({ builds: open, event: 'schedule', snapshotOk: true, deferredManual: `b3685.c${B.MAX_CARRY + 1}` }).skip, true);
    assert.strictEqual(B.decide({ builds: open, event: 'schedule', snapshotOk: true, deferredManual: 'true' }).skip, true);
    assert.strictEqual(B.parseCarry('b3685.c2').build, 3685);
  });
  it('nextCarry: manual starts c1, carried increments, others empty', () => {
    assert.strictEqual(B.nextCarry({ builds: open, event: 'workflow_dispatch', transientRetry: 'false' }), 'b3685.c1');
    assert.strictEqual(B.nextCarry({ builds: open, event: 'workflow_dispatch', deferredRetry: 'true', deferredManual: 'b3685.c1' }), 'b3685.c2');
    assert.strictEqual(B.nextCarry({ builds: open, event: 'workflow_dispatch', deferredRetry: 'true', deferredManual: `b3685.c${B.MAX_CARRY}` }), '');
    assert.strictEqual(B.nextCarry({ builds: [pf(3686), ...open], event: 'workflow_dispatch', deferredRetry: 'true', deferredManual: 'b3685.c1' }), '');
    assert.strictEqual(B.nextCarry({ builds: open, event: 'push' }), '');
    assert.strictEqual(B.nextCarry({ builds: open, event: 'workflow_dispatch', transientRetry: '1' }), '');
  });
  it('dispatcher: a manual marker ignores newer push runs and forwards deferred_manual', () => {
    const now = Date.parse('2026-10-27T13:00:00Z');
    const artifacts = [{ name: 'athom-deferred-master-m-b3685.c1-40486153255', created_at: '2026-10-27T10:09:00Z' }];
    const runs = [{ created_at: '2026-10-27T12:13:37Z', status: 'completed', event: 'push' }, { created_at: '2026-10-27T10:08:18Z', status: 'completed', event: 'workflow_dispatch' }];
    const d = D.deferredDecision({ key: 'master', artifacts, runs, now });
    assert.strictEqual(d.dispatch, true);
    assert.deepStrictEqual(d.inputs, { deferred_retry: 'true', deferred_manual: 'b3685.c1' });
    const plain = D.deferredDecision({ key: 'master', artifacts: [{ name: 'athom-deferred-master-40486153255', created_at: '2026-10-27T10:09:00Z' }], runs, now });
    assert.strictEqual(plain.dispatch, false);
    const later = D.deferredDecision({ key: 'master', artifacts, runs: [{ created_at: '2026-10-27T12:30:00Z', status: 'completed', event: 'workflow_dispatch' }, ...runs], now });
    assert.strictEqual(later.dispatch, false);
  });
  it('workflow wires DEFERRED_MANUAL into the breaker and the carry into the marker name', () => {
    const w = fs.readFileSync(path.join(__dirname, '../../.github/workflows/auto-publish-on-push.yml'), 'utf8');
    assert.match(w, /deferred_manual:\n\s+description:/);
    assert.match(w, /DEFERRED_MANUAL: \$\{\{ github\.event\.inputs\.deferred_manual \|\| '' \}\}/);
    assert.match(w, /athom-deferred-master-\$\{\{ steps\.b\.outputs\.carry != '' && format\('m-\{0\}-', steps\.b\.outputs\.carry\) \|\| '' \}\}\$\{\{ github\.run_id \}\}/);
  });
});
