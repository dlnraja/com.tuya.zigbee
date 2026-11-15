'use strict';
// P3296 (MemwarnGuard backlog item): process.memoryUsage() throws ENOENT (uv_resident_set_memory) on some
// Homey firmwares. MemwarnGuard already falls back to V8; the autonomous heap check still returned
// silently, so its heap_warn / heap_critical findings (and the self-heal) never ran on those Homeys.
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const v8 = require('v8');
const { AutonomousVerificationEngine } = require('../../lib/autonomous/AutonomousVerificationEngine');

function withEnoent(stats, fn) {
  const orig = process.memoryUsage; const origStats = v8.getHeapStatistics;
  process.memoryUsage = () => { throw new Error('ENOENT: no such file or directory, uv_resident_set_memory'); };
  if (stats) { v8.getHeapStatistics = () => stats; }
  return Promise.resolve().then(fn).finally(() => { process.memoryUsage = orig; v8.getHeapStatistics = origStats; });
}

describe('P3296 autonomous heap check survives ENOENT with the V8 fallback', () => {
  it('records the heap check from V8 when process.memoryUsage throws', async () => {
    const report = { checks: [], findings: [], fixes: [] };
    await withEnoent({ used_heap_size: 50 * 1048576, total_heap_size: 100 * 1048576, external_memory: 0 },
      () => AutonomousVerificationEngine.prototype._checkHeap.call({ _selfHeal: false }, report));
    const c = report.checks.find((x) => x.name === 'heap');
    assert.ok(c, 'heap check recorded');
    assert.strictEqual(c.info.usedHeap, 50 * 1048576);
    assert.strictEqual(c.info.src, 'v8');
  });
  it('still raises heap_critical from the V8 figures', async () => {
    const report = { checks: [], findings: [], fixes: [] };
    await withEnoent({ used_heap_size: 99 * 1048576, total_heap_size: 100 * 1048576, external_memory: 0 },
      () => AutonomousVerificationEngine.prototype._checkHeap.call({ _selfHeal: false }, report));
    assert.ok(report.findings.some((f) => f.type === 'heap_critical'));
  });
  it('never throws when neither source can be read', async () => {
    const report = { checks: [], findings: [], fixes: [] };
    await withEnoent(null, async () => {
      const origStats = v8.getHeapStatistics;
      v8.getHeapStatistics = () => { throw new Error('no v8'); };
      try { await AutonomousVerificationEngine.prototype._checkHeap.call({ _selfHeal: false }, report); } finally { v8.getHeapStatistics = origStats; }
    });
    assert.strictEqual(report.findings.length, 0);
    assert.ok(report.checks.some((x) => x.name === 'heap' && x.info.unavailable === true));
  });
});
