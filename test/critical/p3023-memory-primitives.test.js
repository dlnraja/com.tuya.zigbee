'use strict';
/** P3023: bounded primitives + app-wide memory budget (levels, hooks, memwarn, fallbacks). */
const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert');
const { BoundedMap, brief, fnv1a } = require('../../lib/memory/BoundedMap');
const MB = require('../../lib/memory/MemoryBudget');

describe('P3023 BoundedMap', () => {
  it('caps size with LRU eviction and refreshes on get', () => {
    const m = new BoundedMap({ max: 3 });
    m.set('a', 1); m.set('b', 2); m.set('c', 3);
    m.get('a');
    m.set('d', 4);
    assert.deepStrictEqual([...m.keys()], ['c', 'a', 'd']);
    assert.strictEqual(m.size, 3);
    assert.strictEqual(m.evictions, 1);
    for (let i = 0; i < 1000; i++) { m.set(`k${i}`, i); }
    assert.strictEqual(m.size, 3);
  });
  it('expires by TTL and trims to half', () => {
    let now = 0;
    const m = new BoundedMap({ max: 10, ttlMs: 100, now: () => now });
    for (let i = 0; i < 10; i++) { m.set(i, i); }
    now = 50; assert.strictEqual(m.get(3), 3);
    now = 200; m.prune(now);
    assert.strictEqual(m.size, 0);
    for (let i = 0; i < 10; i++) { m.set(i, i); }
    m.trim();
    assert.strictEqual(m.size, 5);
  });
  it('brief() is bounded whatever the input, fnv1a is stable 32-bit', () => {
    assert.ok(brief(Buffer.alloc(5000)).length <= 80);
    assert.ok(brief({ a: 'x'.repeat(10000), b: [1, 2, 3], c: { deep: { deeper: 1 } } }, 64).length <= 64);
    assert.ok(brief(Array.from({ length: 5000 }, (_, i) => i)).length <= 64);
    assert.strictEqual(fnv1a('abc'), fnv1a('abc'));
    assert.ok(fnv1a('abc') >= 0 && fnv1a('abc') <= 0xffffffff);
  });
});

describe('P3023 MemoryBudget', () => {
  afterEach(() => MB._resetShared());
  const mk = (heap, now = () => 0) => new MB.MemoryBudget({ read: () => ({ heapUsed: heap.v, rss: heap.v * 2, src: 'test' }), now });

  it('grades heap into levels and runs hooks up to the current level only', () => {
    const heap = { v: 10 };
    const b = mk(heap);
    const ran = [];
    b.register('e', 'elevated', () => ran.push('e'));
    b.register('h', 'high', () => ran.push('h'));
    b.register('c', 'critical', () => ran.push('c'));
    assert.strictEqual(b.sample(), 'ok');
    heap.v = 62; assert.strictEqual(b.sample(), 'high');
    assert.deepStrictEqual(ran, ['e', 'h']);
    assert.strictEqual(b.reprobeFactor(), 2);
    assert.strictEqual(b.heuristicsPaused(), false);
    heap.v = 90; b.sample();
    assert.ok(ran.includes('c'));
    assert.strictEqual(b.heuristicsPaused(), true);
    assert.strictEqual(b.reprobeFactor(), 4);
  });
  it('memwarn forces critical for a while even with a small heap', () => {
    let now = 0;
    const b = mk({ v: 5 }, () => now);
    assert.strictEqual(b.onMemwarn(), 'critical');
    now = 11 * 60e3;
    assert.strictEqual(b.sample(), 'ok');
  });
  it('a throwing hook or reader never breaks sampling; hooks are capped', () => {
    const b = new MB.MemoryBudget({ read: () => { throw new Error('x'); } });
    assert.strictEqual(b.sample(), 'ok');
    const c = mk({ v: 80 });
    c.register('boom', 'elevated', () => { throw new Error('boom'); });
    assert.strictEqual(c.sample(), 'critical');
    assert.strictEqual(c.stats.hookErrors, 1);
    let ok = 0;
    for (let i = 0; i < 100; i++) { if (c.register(`h${i}`, 'high', () => {})) { ok++; } }
    assert.ok(ok <= 31, `hooks not capped: ${ok}`);
  });
  it('module helpers are safe before start, and readHeapMB has a value', () => {
    assert.strictEqual(MB.reprobeFactor(), 1);
    assert.strictEqual(MB.heuristicsPaused(), false);
    const r = MB.readHeapMB();
    assert.ok(r && r.heapUsed > 0);
  });
  it('budget-hooks install/uninstall wires the shared budget and clears its timer', () => {
    const timers = [];
    const homey = { setInterval: (fn, ms) => { const t = { fn, ms, unref() {} }; timers.push(t); return t; }, clearInterval: (t) => { t.cleared = true; }, settings: { get: () => null, set: () => {} } };
    const H = require('../../lib/memory/budget-hooks');
    const b = H.install(homey, { allDevices: () => [] });
    assert.strictEqual(timers.length, 1);
    assert.ok(b.snapshot().hooks.length >= 2 || b._hooks.length >= 2);
    H.uninstall();
    assert.strictEqual(timers[0].cleared, true);
  });
  it('memwarn cleaner p3023-budget is registered with the MemwarnGuard', () => {
    const names = [];
    const guard = { register: (n) => names.push(n) };
    require('../../lib/utils/memwarn-cleaners').registerAppCleaners(guard, { drivers: { getDrivers: () => ({}) } });
    assert.ok(names.includes('p3023-budget'));
  });
});
