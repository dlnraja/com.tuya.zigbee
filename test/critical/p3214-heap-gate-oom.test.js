'use strict';
// P3214 port to stable (Bastien diag 7f72cffe): OOM in JSON.parse of the OTA index at heap 57 MB. The P3091
// gate failed open when process.memoryUsage() threw ENOENT; it now reads the V8 heap through heapGate.
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const { heapUsedMB, heapAllows, heapGate, safeJsonParse } = require('../../lib/utils/heapGate');
const { p3091HeapGate } = require('../../lib/ota/TuyaXiaomiOTAProvider');

const at = (mb, src = 'v8') => () => ({ heapUsed: mb * 1048576, src });

describe('P3214 heap gate never fails open on ENOENT (stable)', () => {
  it('reads V8 heap when process.memoryUsage throws', () => {
    const orig = process.memoryUsage;
    const v8 = require('v8'); const origStats = v8.getHeapStatistics;
    try {
      process.memoryUsage = () => { throw new Error('ENOENT: uv_resident_set_memory'); };
      v8.getHeapStatistics = () => ({ used_heap_size: 57 * 1048576, total_heap_size: 60 * 1048576, external_memory: 0 });
      assert.throws(() => p3091HeapGate(), /OTA-HEAP/);
      v8.getHeapStatistics = () => ({ used_heap_size: 20 * 1048576, total_heap_size: 30 * 1048576, external_memory: 0 });
      assert.doesNotThrow(() => p3091HeapGate());
    } finally { process.memoryUsage = orig; v8.getHeapStatistics = origStats; }
  });
  it('heapGate / heapAllows thresholds with an injected reader', () => {
    assert.strictEqual(Math.round(heapUsedMB(at(57))), 57);
    assert.strictEqual(heapAllows(40, at(57)), false);
    assert.strictEqual(heapAllows(40, at(20)), true);
    assert.strictEqual(heapAllows(40, () => ({ heapUsed: 0, src: 'none' })), true);
    assert.throws(() => heapGate(40, 'T', at(57)), /\[T\] skipped/);
  });
  it('safeJsonParse refuses oversize text, high heap and invalid JSON without throwing', () => {
    assert.deepStrictEqual(safeJsonParse('{"a":1}', { read: at(10) }), { a: 1 });
    assert.strictEqual(safeJsonParse('x'.repeat(2000), { maxBytes: 1000, read: at(10) }), null);
    assert.strictEqual(safeJsonParse('{"a":1}', { limitMB: 40, read: at(57) }), null);
    assert.strictEqual(safeJsonParse('{bad', { read: at(10) }), null);
    assert.strictEqual(safeJsonParse(null), null);
  });
});
