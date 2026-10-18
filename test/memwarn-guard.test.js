'use strict';
const assert = require('assert');
const { EventEmitter } = require('events');
const MemwarnGuard = require('../lib/utils/MemwarnGuard');
describe('MemwarnGuard', () => {
  it('runs cleaners on memwarn and records the event', () => {
    const h = new EventEmitter(); let n = 0;
    const g = new MemwarnGuard().register('a', () => { n++; }).register('bad', () => { throw new Error('x'); });
    assert.strictEqual(g.attach(h), true);
    h.emit('memwarn', { count: 1, limit: 3 });
    assert.strictEqual(n, 1);
    assert.deepStrictEqual(g.events[0].cleaners, ['a']);
    assert.strictEqual(g.events[0].limit, 3);
  });
  it('tolerates missing homey / data', () => {
    const g = new MemwarnGuard();
    assert.strictEqual(g.attach(null), false);
    assert.strictEqual(g.handle().count, 0);
  });
  it('survives process.memoryUsage() throwing (ENOENT uv_resident_set_memory, build 3590)', () => {
    const orig = process.memoryUsage;
    process.memoryUsage = () => { const e = new Error('ENOENT: uv_resident_set_memory'); e.code = 'ENOENT'; throw e; };
    try {
      const g = new MemwarnGuard();
      const ev = g.handle({ count: 2, limit: 3 });
      assert.strictEqual(ev.count, 2);
      assert.ok(Number.isFinite(ev.heapMB));
    } finally { process.memoryUsage = orig; }
  });
});
