'use strict';
const { describe, it, before, after } = require('../_support/dual-runner'); // P3020: same file under node --test and mocha
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { BoundedJsonCache, shared, clearShared } = require('../../lib/utils/BoundedJsonCache');
const { registerAppCleaners } = require('../../lib/utils/memwarn-cleaners');
const MemwarnGuard = require('../../lib/utils/MemwarnGuard');

describe('P2863 BoundedJsonCache (lazy, bounded, droppable JSON data)', () => {
  let dir; const files = [];
  before(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bjc-'));
    for (let i = 0; i < 5; i++) { const f = path.join(dir, `f${i}.json`); fs.writeFileSync(f, JSON.stringify({ i, pad: 'x'.repeat(100) })); files.push(f); }
  });
  after(() => { fs.rmSync(dir, { recursive: true, force: true }); });

  it('is lazy, hits cache and evicts least-recently-used beyond maxEntries', () => {
    const c = new BoundedJsonCache({ maxEntries: 2 });
    assert.strictEqual(c.size(), 0);
    assert.strictEqual(c.getSync(files[0]).i, 0);
    assert.strictEqual(c.getSync(files[0]).i, 0);
    assert.strictEqual(c.stats.loads, 1); assert.strictEqual(c.stats.hits, 1);
    c.getSync(files[1]); c.getSync(files[0]); c.getSync(files[2]);
    assert.strictEqual(c.size(), 2);
    c.getSync(files[1]); // was evicted -> reload
    assert.strictEqual(c.stats.loads, 4);
  });
  it('byte budget: files over the whole budget are served but never retained', () => {
    const c = new BoundedJsonCache({ maxBytes: 50 });
    assert.strictEqual(c.getSync(files[0]).i, 0);
    assert.strictEqual(c.size(), 0); assert.strictEqual(c.bytes(), 0); assert.strictEqual(c.stats.bypass, 1);
  });
  it('async get dedupes concurrent loads; missing file gives fallback; clear() drops everything', async () => {
    const c = new BoundedJsonCache();
    const [a, b] = await Promise.all([c.get(files[3]), c.get(files[3])]);
    assert.strictEqual(a, b); assert.strictEqual(c.stats.loads, 1);
    assert.strictEqual(await c.get(path.join(dir, 'nope.json'), 'fb'), 'fb');
    assert.strictEqual(c.getSync(path.join(dir, 'nope.json'), 7), 7);
    assert.strictEqual(c.clear(), 1); assert.strictEqual(c.size(), 0);
  });
  it('MemwarnGuard cleaner drops the shared cache, data is re-read on next use', async () => {
    const reg = path.join(__dirname, '..', '..', 'data', 'dp_registry.json');
    assert.ok(shared().getSync(reg) && shared().size() >= 1);
    const g = new MemwarnGuard();
    assert.ok(registerAppCleaners(g, null).includes('json-cache'));
    await g.handleAsync({ count: 1, limit: 2 });
    assert.strictEqual(shared().size(), 0);
    assert.ok(shared().getSync(reg).byMfr || shared().getSync(reg));
    clearShared();
  });
  it('TuyaUniversalMapper / DeviceTelemetryEstimator no longer pin big JSON via require()', () => {
    const root = path.join(__dirname, '..', '..');
    for (const f of ['lib/tuya/TuyaUniversalMapper.js', 'lib/utils/DeviceTelemetryEstimator.js']) {
      const src = fs.readFileSync(path.join(root, f), 'utf8');
      assert.ok(!/require\(['"][^'"]*(dp_registry|energy-consumption-reference)\.json['"]\)/.test(src), f);
      assert.ok(src.includes('BoundedJsonCache'), f);
    }
  });
});
