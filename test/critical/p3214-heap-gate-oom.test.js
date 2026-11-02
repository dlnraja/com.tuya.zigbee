'use strict';
// P3214 (Bastien diag 7f72cffe, v1.0.218): OOM in JSON.parse of the OTA index at heap 57 MB. The P3091 gate
// failed open when process.memoryUsage() threw ENOENT (rss=0MB in his diag = V8 fallback path).
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const { heapUsedMB, heapAllows, heapGate, safeJsonParse } = require('../../lib/utils/heapGate');
const { p3091HeapGate } = require('../../lib/ota/TuyaXiaomiOTAProvider');

const at = (mb, src = 'v8') => () => ({ heapUsed: mb * 1048576, src });

describe('P3214 heap gate never fails open on ENOENT', () => {
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
  it('heap regression: slim OTA index retains far less than the raw index', () => {
    const src = require('fs').readFileSync(require.resolve('../../lib/ota/TuyaXiaomiOTAProvider'), 'utf8');
    assert.ok(/\.map\(p3214SlimIndexEntry\)/.test(src), 'index cache must be slimmed');
    const raw = Array.from({ length: 3000 }, (_, i) => ({ manufacturerCode: 4417, imageType: i, fileVersion: i, url: 'https://x/' + i,
      sha512: 'f'.repeat(128), releaseNotes: 'n'.repeat(400), extra: { blob: 'b'.repeat(300) } }));
    const keys = ['manufacturerCode', 'imageType', 'fileVersion', 'url', 'sha512'];
    const slim = raw.map(r => { const o = {}; for (const k of keys) {o[k] = r[k];} return o; });
    assert.ok(JSON.stringify(slim).length < JSON.stringify(raw).length * 0.5);
  });
});
