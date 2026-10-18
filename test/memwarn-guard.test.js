'use strict';
const assert = require('assert');
const { EventEmitter } = require('events');
const MemwarnGuard = require('../lib/utils/MemwarnGuard');
describe('MemwarnGuard', () => {
  it('runs cleaners on memwarn and records the event (async, one per tick)', async () => {
    const h = new EventEmitter(); let n = 0;
    const g = new MemwarnGuard().register('a', () => { n++; }).register('bad', () => { throw new Error('x'); });
    assert.strictEqual(g.attach(h), true);
    h.emit('memwarn', { count: 1, limit: 3 });
    await g._inflight;
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
  it('coalesces concurrent memwarns, awaits async cleaners with a timeout, flags repeats as high severity', async () => {
    let runs = 0;
    const g = new MemwarnGuard().register('slow', () => { runs++; return new Promise(() => {}); }).register('ok', () => { runs++; });
    const p1 = g.handleAsync({ count: 1, limit: 3 }, { cleanerTimeoutMs: 20 });
    const p2 = g.handleAsync({ count: 2, limit: 3 }, { cleanerTimeoutMs: 20 });
    assert.strictEqual(p1, p2);
    const ev = await p1;
    assert.strictEqual(runs, 2);
    assert.deepStrictEqual(ev.cleaners, ['slow', 'ok']);
    assert.strictEqual(ev.severity, 'normal');
    const ev2 = await g.handleAsync({ count: 3, limit: 3 }, { cleanerTimeoutMs: 20 });
    assert.strictEqual(ev2.severity, 'high');
    for (let i = 0; i < 40; i++) await g.handleAsync({}, { cleanerTimeoutMs: 5 });
    assert.ok(g.events.length <= 20);
  });
});
