'use strict';
/* eslint-env mocha */
/**
 * P2915 — simulated load (150 devices x 100 events), then delete all: heap and timers must come back.
 * Before: +13.6 MB per 100 events (diagnostic log ring 2000/device, cons strings) and 150 intervals left
 * after delete (telemetry estimator attached via record(), duplicate DynamicCapabilityManager).
 */
const assert = require('assert');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');

describe('P2915 heap under simulated load', function () {
  this.timeout(120000);

  it('diagnostic log entries are bounded and flat', () => {
    const DLC = require('../lib/diagnostics/DiagnosticLogsCollector');
    class B { log() {} error() {} }
    const D = DLC(B);
    const d = new D();
    const big = { a: 'x'.repeat(100000), nested: { deep: new Array(1000).fill(1) }, list: new Array(5000).fill(2) };
    for (let i = 0; i < 5000; i++) d.addToDiagnosticBuffer('log', ['event', i, big, Buffer.alloc(500)]);
    assert.ok(d.diagnosticLogsBuffer.length <= 200, `ring ${d.diagnosticLogsBuffer.length}`);
    for (const e of d.diagnosticLogsBuffer) assert.ok(e.message.length <= 300, 'message capped');
  });

  it('150 devices x 100 events: bounded growth, nothing left after delete', () => {
    const out = execFileSync(process.execPath, ['--expose-gc', path.join(root, 'scripts/ci/load-heap-sim.js'), root, '150', '100'],
      { cwd: root, encoding: 'utf8', env: { ...process.env, SNAP: '' } });
    const r = JSON.parse(out.trim().split('\n').pop());
    const events = r.heap.afterEvents - r.heap.afterInit;
    const kept = r.heap.afterDelete - r.heap.loaded;
    assert.ok(events < 8, `events grew heap by ${events.toFixed(1)} MB (was ~13.6 MB)`);
    assert.strictEqual(r.timersLeft, 0, `intervals left after delete: ${JSON.stringify(r.timerSrc)}`);
    assert.ok(kept < 10, `heap kept after deleting all devices: ${kept.toFixed(1)} MB (was ~24 MB)`);
  });
});
