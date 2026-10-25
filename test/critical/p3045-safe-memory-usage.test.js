'use strict';
// P3045: process.memoryUsage() may throw ENOENT (uv_resident_set_memory) on Homey (Universal Tuya 9.0.1506).
// The heap gates must neither crash nor go blind (heap = 0 forever): they now fall back to V8 heap figures.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '../..');
const { safeMemoryUsage } = require('../../lib/utils/safeMemoryUsage');

function enoent() { const e = new Error('ENOENT: no such file or directory, uv_resident_set_memory'); e.code = 'ENOENT'; throw e; }
function withThrowingMemoryUsage(fn) {
  const orig = process.memoryUsage;
  process.memoryUsage = enoent;
  try { return fn(); } finally { process.memoryUsage = orig; }
}

test('safeMemoryUsage: normal path reports process figures', () => {
  const m = safeMemoryUsage({ proc: { memoryUsage: () => ({ heapUsed: 10, heapTotal: 20, rss: 30, external: 1 }) } });
  assert.deepStrictEqual(m, { heapUsed: 10, heapTotal: 20, rss: 30, external: 1, src: 'process' });
});

test('safeMemoryUsage: ENOENT falls back to v8 heap, rss unknown (0), never throws', () => {
  const v8mod = { getHeapStatistics: () => ({ used_heap_size: 50 * 1048576, total_heap_size: 60 * 1048576, external_memory: 0 }) };
  const m = safeMemoryUsage({ proc: { memoryUsage: enoent }, v8mod });
  assert.strictEqual(m.src, 'v8');
  assert.strictEqual(m.heapUsed, 50 * 1048576);
  assert.strictEqual(m.rss, 0);
});

test('safeMemoryUsage: both sources broken -> zeros, src none', () => {
  const m = safeMemoryUsage({ proc: { memoryUsage: enoent }, v8mod: { getHeapStatistics: enoent } });
  assert.deepStrictEqual(m, { heapUsed: 0, heapTotal: 0, rss: 0, external: 0, src: 'none' });
});

test('safeMemoryUsage: real process with throwing memoryUsage still sees a non-zero heap', () => {
  const m = withThrowingMemoryUsage(() => safeMemoryUsage());
  assert.strictEqual(m.src, 'v8');
  assert.ok(m.heapUsed > 0);
});

test('BootBudget / MemoryLeakDetector / NetworkResilience survive ENOENT and keep a heap reading', () => {
  const BootBudget = require('../../lib/performance/BootBudget');
  const MLD = require('../../lib/performance/MemoryLeakDetector');
  const C = MLD.MemoryLeakDetector || MLD.default || MLD;
  const NR = require('../../lib/utils/NetworkResilience');
  withThrowingMemoryUsage(() => {
    const heap = typeof BootBudget.heapUsedBytes === 'function' ? BootBudget.heapUsedBytes() : null;
    if (heap !== null) { assert.ok(heap > 0, 'BootBudget heap reading must not be 0 under ENOENT'); }
    if (typeof C === 'function' && C.prototype._getHeapUsed) { assert.ok(C.prototype._getHeapUsed.call({}) > 0); }
    assert.doesNotThrow(() => NR.isMemoryPressure({ heapLimit: 1 }));
    assert.strictEqual(NR.isMemoryPressure({ heapLimit: 1, rssLimit: Number.MAX_SAFE_INTEGER }), true, 'tiny heap limit must trip under ENOENT');
  });
});

test('HeapSentinel (when present) still sees the heap and trims under ENOENT', () => {
  const p = path.join(ROOT, 'lib/utils/HeapSentinel.js');
  if (!fs.existsSync(p)) { return; }
  const { HeapSentinel } = require(p);
  let cleaned = 0;
  const guard = { handle() { cleaned += 1; } };
  const s = new HeapSentinel({ guard, config: { warnHeapBytes: 1, criticalHeapBytes: 2 } });
  const r = withThrowingMemoryUsage(() => { s.tick(); return s; });
  assert.notStrictEqual(r.level, 'ok', 'sentinel must not be blind when memoryUsage throws');
  assert.strictEqual(cleaned, 1);
});

test('no runtime call of process.memoryUsage() outside a try block (lib/, drivers/, app.js)', () => {
  const walk = (d) => (fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }) : []).flatMap((e) => (e.isDirectory() ? (e.name === 'node_modules' ? [] : walk(path.join(d, e.name))) : e.name.endsWith('.js') ? [path.join(d, e.name)] : []));
  const files = [...walk(path.join(ROOT, 'lib')), ...walk(path.join(ROOT, 'drivers')), path.join(ROOT, 'app.js')];
  const bad = [];
  for (const f of files) {
    const L = fs.readFileSync(f, 'utf8').split('\n');
    L.forEach((l, i) => {
      if (!/process\.memoryUsage(\?\.)?\(/.test(l) || /^\s*(\/\/|\*)/.test(l)) { return; }
      const ctx = L.slice(Math.max(0, i - 4), i + 1).join('\n');
      if (!/\btry\b/.test(ctx)) { bad.push(`${path.relative(ROOT, f)}:${i + 1}`); }
    });
  }
  assert.deepStrictEqual(bad, []);
});
